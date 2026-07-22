async function analyzeLocally({ currentBill, previousBills = [] }) {
  if (currentBill.fileType !== "pdf") {
    return null;
  }

  const currentText = await extractPdfText(currentBill);
  const currentSummary = parseKnownBill(currentText);

  if (!currentSummary) {
    return null;
  }

  const parsedPreviousSummaries = [];
  for (const previousBill of previousBills) {
    if (previousBill?.fileType !== "pdf") {
      continue;
    }
    const previousText = await extractPdfText(previousBill);
    const previousSummary = previousText ? parseKnownBill(previousText) : null;
    // Only keep previous bills BillClear could read and that match the
    // current bill's carrier — comparing across carriers isn't meaningful.
    if (previousSummary && previousSummary.carrier === currentSummary.carrier) {
      parsedPreviousSummaries.push(previousSummary);
    }
  }

  parsedPreviousSummaries.sort((a, b) => billDateSortKey(a.billingPeriod) - billDateSortKey(b.billingPeriod));

  // The most recent previous bill drives the detailed charge-by-charge diff,
  // same as the single-bill behaviour this is replacing.
  const mostRecentPrevious = parsedPreviousSummaries[parsedPreviousSummaries.length - 1] ?? null;

  const history =
    parsedPreviousSummaries.length > 0
      ? [...parsedPreviousSummaries, currentSummary].map((summary) => ({
          billingPeriod: summary.billingPeriod,
          totalDue: summary.totalCurrentCharges ?? summary.totalDue
        }))
      : undefined;

  return buildAnalysis(currentSummary, mostRecentPrevious, history);
}

// Bill periods read like "March 17, 2026", which Date can parse directly.
// Falls back to 0 (sorts first) if a date can't be parsed, rather than
// throwing the whole comparison off.
function billDateSortKey(billingPeriod) {
  const timestamp = Date.parse(billingPeriod);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function extractPdfText(bill) {
  try {
    const pdfParse = require("pdf-parse");
    const parsed = await pdfParse(Buffer.from(bill.fileBase64, "base64"));
    return parsed.text || "";
  } catch {
    return "";
  }
}

// Parser registry: add an entry here to support another carrier or bill
// category, without touching the dispatch logic below. The first matching
// `test` wins, so keep tests specific. `category` is forward-looking for
// non-telecom bills — see docs/adr/0001-energy-bills-architecture.md. No
// energy parser exists yet; both entries below are telecom.
const PARSERS = [
  {
    category: "telecom",
    test: (text) => /Your TELUS bill|New charges total|Monthly Internet plan/i.test(text),
    parse: parseTelus
  },
  { category: "telecom", test: (text) => /Virgin Plus|virginplus\.ca/i.test(text), parse: parseVirgin }
];

function parseKnownBill(text) {
  const normalized = text.replace(/\s+/g, " ");
  const matchedParser = PARSERS.find((parser) => parser.test(normalized));

  if (!matchedParser) {
    return null;
  }

  return { ...matchedParser.parse(normalized), category: matchedParser.category };
}

function parseTelus(text) {
  const balanceForward = moneyAfterSigned("Balance forward from your last bill", text);
  const otherChargesAndCredits = moneyAfterSigned("Other charges and credits", text);
  const detailedServiceCharges = parseTelusDetailedServiceCharges(text);
  const gstHst = moneyAfter("GST / HST", text) ?? moneyAfter("Taxes", text);
  const taxCharges =
    detailedServiceCharges.length > 0 && gstHst != null
      ? splitTelusTaxByServiceLocation(detailedServiceCharges, gstHst)
      : [charge("gst-hst", "GST/HST", gstHst)];
  const serviceCharges =
    detailedServiceCharges.length > 0
      ? detailedServiceCharges
      : [
          charge("internet", "Internet", moneyAfter("Internet", text)),
          charge("telus-tv", "TELUS TV", moneyAfter("TELUS TV", text)),
          charge("home-security", "Home Security and Safety", moneyAfter("Home Security and Safety", text))
        ];

  return {
    carrier: "Telus",
    billingPeriod:
      matchText(/Your TELUS bill\s+([A-Za-z]+ \d{1,2}, \d{4})/i, text) ||
      matchText(/Monthly Internet plan\s+([A-Za-z]+ \d{1,2} - [A-Za-z]+ \d{1,2})/i, text) ||
      "Unknown period",
    dueDate:
      matchText(/Due ([A-Za-z]+ \d{1,2}, \d{4})/i, text) ||
      matchText(/charged to your credit card on ([A-Za-z]+ \d{1,2})/i, text) ||
      "See bill",
    totalDue: moneyAfter("Your balance", text) ?? moneyAfter("Total due", text) ?? moneyAfter("New charges total", text) ?? moneyAfter("Total new charges", text) ?? 0,
    totalCurrentCharges: moneyAfter("New charges total", text) ?? moneyAfter("Total new charges", text),
    charges: [
      balanceForward
        ? {
            id: "balance-forward",
            name: "Balance forward from last bill",
            amount: balanceForward,
            status: "expected",
            explanation:
              balanceForward > 0
                ? "An unpaid amount from your previous bill was carried forward and added to this bill's total."
                : "A credit from your previous bill was carried forward and subtracted from this bill's total."
          }
        : null,
      ...serviceCharges,
      otherChargesAndCredits
        ? {
            id: "other-charges-credits",
            name: "Other charges and credits",
            amount: otherChargesAndCredits,
            status: "questionable",
            explanation:
              "TELUS listed this under \"Other charges and credits,\" which can include late payment fees, one-time adjustments, or credits. Check the detailed bill to see exactly what this is.",
            action: "Ask TELUS what specifically makes up this charge or credit."
          }
        : null,
      ...taxCharges,
      telusEasyPaymentCharge(text)
    ].filter(Boolean)
  };
}

function telusEasyPaymentCharge(text) {
  const amount = moneyAfter("TELUS Easy Payment", text);
  if (amount == null) {
    return null;
  }

  return {
    id: "easy-payment",
    name: "TELUS Easy Payment",
    amount,
    status: "questionable",
    explanation:
      "This is usually a device or equipment financing payment, not a regular service charge. It should have a remaining balance and an end date.",
    action:
      "Ask TELUS which device, equipment, or agreement this Easy Payment is attached to, the remaining balance, and the date the $5 monthly charge will stop. If there is no active balance, ask for removal and a credit."
  };
}

function parseTelusDetailedServiceCharges(text) {
  const rawSections = [];
  const sectionPattern =
    /\b(INTERNET|HOME SECURITY & SAFETY|TV)\b\s+(?=\d)(.+?)(?=\b(?:INTERNET|HOME SECURITY & SAFETY|TV)\b\s+(?=\d)|\b(?:Account-wide charges|Taxes|New charges total|Your total balance)\b|$)/g;

  let match;
  while ((match = sectionPattern.exec(text))) {
    rawSections.push({ serviceType: match[1].toUpperCase(), sectionText: match[2] });
  }

  const sectionCounts = rawSections.reduce((counts, section) => {
    counts[section.serviceType] = (counts[section.serviceType] ?? 0) + 1;
    return counts;
  }, {});

  const sections = [];
  const seenCounts = {};
  for (const rawSection of rawSections) {
    const { serviceType, sectionText } = rawSection;
    const amount = telusSectionAmount(serviceType, sectionText);

    if (amount == null) {
      continue;
    }

    seenCounts[serviceType] = (seenCounts[serviceType] ?? 0) + 1;
    const serviceIndex = seenCounts[serviceType];
    const label = telusSectionLabel(serviceType);
    const name =
      serviceType === "INTERNET" && sectionCounts[serviceType] > 1
        ? `${label} - Service location ${serviceIndex}`
        : label;

    sections.push({
      id: `${telusSectionId(serviceType)}-${serviceIndex}`,
      name,
      amount,
      groupId: telusServiceGroupId(serviceType, serviceIndex, sectionCounts),
      status: "expected",
      explanation:
        serviceType === "INTERNET" && sectionCounts[serviceType] > 1
          ? `${label} charges for service location ${serviceIndex}. BillClear hides the raw service address for privacy.`
          : `${label} appears as a detailed TELUS service section.`
    });
  }

  return sections;
}

function splitTelusTaxByServiceLocation(serviceCharges, taxAmount) {
  const groupedPretax = serviceCharges.reduce((groups, item) => {
    const groupId = item.groupId ?? item.id;
    const current = groups.get(groupId) ?? {
      id: groupId,
      name: telusTaxGroupName(groupId),
      amount: 0
    };
    current.amount = roundMoney(current.amount + item.amount);
    groups.set(groupId, current);
    return groups;
  }, new Map());

  const groups = [...groupedPretax.values()];
  const pretaxTotal = groups.reduce((sum, group) => sum + group.amount, 0);

  if (pretaxTotal <= 0) {
    return [charge("gst-hst", "GST/HST", taxAmount)];
  }

  const allocated = groups.map((group) => ({
    ...group,
    taxAmount: roundMoney((group.amount / pretaxTotal) * taxAmount)
  }));
  const allocatedTotal = allocated.reduce((sum, group) => roundMoney(sum + group.taxAmount), 0);
  const roundingDifference = roundMoney(taxAmount - allocatedTotal);

  if (roundingDifference !== 0 && allocated.length > 0) {
    allocated.sort((a, b) => b.amount - a.amount);
    allocated[0].taxAmount = roundMoney(allocated[0].taxAmount + roundingDifference);
  }

  return allocated
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((group) => ({
      id: `gst-hst-${group.id}`,
      name: `GST/HST - ${group.name}`,
      amount: group.taxAmount,
      status: "expected",
      explanation: `Estimated GST/HST allocated to ${group.name} based on its share of pre-tax service charges.`
    }));
}

function telusServiceGroupId(serviceType, serviceIndex, sectionCounts) {
  if (serviceType === "INTERNET") {
    return `service-location-${serviceIndex}`;
  }

  // In detailed TELUS bundle bills, TV is commonly attached to the first
  // service address shown and Home Security to the second. We keep addresses
  // hidden, but use that ordering to split account-wide tax.
  if (serviceType === "TV" && sectionCounts.INTERNET > 1) {
    return "service-location-1";
  }

  if (serviceType === "HOME SECURITY & SAFETY" && sectionCounts.INTERNET > 1) {
    return "service-location-2";
  }

  return telusSectionId(serviceType);
}

function telusTaxGroupName(groupId) {
  const serviceLocationMatch = groupId.match(/^service-location-(\d+)$/);
  if (serviceLocationMatch) {
    return `Service location ${serviceLocationMatch[1]}`;
  }

  return groupId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function telusSectionAmount(serviceType, sectionText) {
  if (serviceType === "INTERNET") {
    return moneyAfterGap("Monthly Internet plan", sectionText, 80);
  }

  if (serviceType === "HOME SECURITY & SAFETY") {
    return moneyAfterGap("Monthly Security plan", sectionText, 80);
  }

  if (serviceType === "TV") {
    return moneyAfterGap("Monthly TV plan", sectionText, 80);
  }

  return null;
}

function telusSectionLabel(serviceType) {
  if (serviceType === "HOME SECURITY & SAFETY") {
    return "Home Security and Safety";
  }

  if (serviceType === "TV") {
    return "TV";
  }

  return "Internet";
}

function telusSectionId(serviceType) {
  return telusSectionLabel(serviceType).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseVirgin(text) {
  const billDate = matchText(/Bill Date.{0,60}?([A-Za-z]+ \d{1,2}, \d{4})/i, text) || "Unknown period";
  // "Total Amount Due" and its figure can be far apart once the PDF's column
  // layout is flattened to text, so look ahead across a wider gap rather than
  // requiring them to be adjacent (moneyBefore/moneyAfter assume adjacency).
  const amountDue =
    moneyAfterGap("Total Amount Due", text, 100) ??
    moneyBefore("Total amount due", text) ??
    moneyBefore("Total amount to be charged to your credit card", text);

  return {
    carrier: "Virgin Plus",
    billingPeriod: billDate,
    dueDate: matchText(/Please Pay By\*?.{0,40}?([A-Za-z]+ \d{1,2}, \d{4})/i, text) || "See bill",
    totalDue: amountDue ?? moneyAfter("Total current charges including taxes", text) ?? 0,
    totalCurrentCharges: moneyAfter("Total current charges including taxes", text),
    charges: [
      charge("monthly-charges", "Monthly charges", moneyBefore("Monthly charges", text)),
      charge("usage-long-distance", "Usage and long distance", moneyBefore("Usage and long distance", text)),
      charge("taxes", "Total taxes on current charges", moneyBefore("Total taxes on current charges", text)),
      charge("mobile-credits", "Mobile credits", moneyAfter("Mobile credits", text))
    ].filter(Boolean)
  };
}

function buildAnalysis(current, previous, history) {
  const previousTotal = previous?.totalCurrentCharges ?? previous?.totalDue;
  const currentComparisonTotal = current.totalCurrentCharges ?? current.totalDue;
  const delta = previousTotal == null ? null : roundMoney(currentComparisonTotal - previousTotal);
  const charges = current.charges.map((item) => {
    const previousCharge = previous?.charges.find((chargeItem) => chargeItem.id === item.id);
    const chargeDelta = previousCharge ? roundMoney(item.amount - previousCharge.amount) : null;
    const status =
      item.status === "questionable"
        ? "questionable"
        : !previous
          ? (item.status ?? "expected")
          : !previousCharge
            ? "new"
            : chargeDelta && chargeDelta !== 0
              ? "changed"
              : (item.status ?? "expected");

    return {
      ...item,
      status,
      explanation:
        status === "changed"
          ? `${item.name} changed by ${formatDelta(chargeDelta)} compared with the previous bill.`
          : (item.explanation ?? `${item.name} appears on the current ${current.carrier} bill.`),
      action:
        item.action ??
        (status === "changed" || status === "new"
          ? `Ask ${current.carrier} to explain why ${item.name} ${status === "new" ? "was added" : "changed"}.`
          : undefined)
    };
  });

  const findings = [
    {
      id: "local-parser",
      severity: "info",
      title: "Private parser scan",
      description: "This result was produced with BillClear's local carrier parser. No cloud AI was needed."
    }
  ];

  if (delta != null && delta !== 0) {
    findings.unshift({
      id: "bill-change",
      severity: delta > 0 ? "watch" : "info",
      title: `Bill changed by ${formatDelta(delta)}`,
      description: `${current.carrier} current charges changed from ${formatMoney(previousTotal)} to ${formatMoney(
        currentComparisonTotal
      )}.`
    });
  }

  const nonServiceExtras = charges.filter(isNonServiceExtraCharge);
  if (nonServiceExtras.length > 0) {
    findings.unshift({
      id: "non-service-extra-charges",
      severity: "watch",
      title: `${nonServiceExtras.length} extra charge${nonServiceExtras.length === 1 ? "" : "s"} to verify`,
      description: `${nonServiceExtras
        .map((item) => `${item.name} (${formatMoney(item.amount)})`)
        .join(", ")} ${nonServiceExtras.length === 1 ? "is" : "are"} not a plain monthly service charge. Ask the carrier what agreement, equipment, or account condition each charge is tied to.`
    });
  }

  return {
    provider: "local_parser",
    category: current.category ?? "telecom",
    carrier: current.carrier,
    billingPeriod: current.billingPeriod,
    totalDue: current.totalDue,
    previousTotal,
    dueDate: current.dueDate,
    confidence: "high",
    plainEnglishSummary:
      delta == null
        ? `BillClear recognized this as a ${current.carrier} bill and extracted the main totals without using cloud AI.`
        : `BillClear compared this ${current.carrier} bill with the previous bill. Current charges changed by ${formatDelta(delta)}.`,
    charges,
    findings,
    rightsNote:
      "This private scan is a starting point. Verify the carrier's original bill before sending a dispute or complaint.",
    history
  };
}

function charge(id, name, amount) {
  if (amount == null) {
    return null;
  }

  return {
    id,
    name,
    amount,
    status: "expected",
    explanation: `${name} appears on this bill.`
  };
}

function isNonServiceExtraCharge(item) {
  if (item.amount <= 0) {
    return false;
  }

  if (item.id === "balance-forward") {
    return item.amount > 0;
  }

  if (item.status === "questionable") {
    return true;
  }

  return /easy payment|device|equipment|rental|activation|connection|admin|late|paper bill|other charges|processing fee|service fee/i.test(
    item.name
  );
}

function moneyAfter(label, text) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}[^$-]*\\$?(-?[0-9,]+\\.\\d{2})`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function moneyBefore(label, text) {
  const match = text.match(new RegExp(`\\$?(-?[0-9,]+\\.\\d{2})\\s*${escapeRegExp(label)}`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

// Like moneyAfter, but allows other text (e.g. an account number or date)
// to sit between the label and its figure, up to maxGap characters. Use this
// when a PDF's column layout puts a label and its value far apart once
// flattened to plain text.
function moneyAfterGap(label, text, maxGap) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}.{0,${maxGap}}?\\$?(-?[0-9,]+\\.\\d{2})`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

// Handles amounts where the minus sign can appear before or after the $
// (e.g. "-$157.50" for a credit), which moneyAfter does not handle.
function moneyAfterSigned(label, text) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}[^0-9]*?(-?)\\$?(-?)([0-9,]+\\.\\d{2})`, "i"));
  if (!match) {
    return null;
  }

  const value = Number(match[3].replace(/,/g, ""));
  const isNegative = match[1] === "-" || match[2] === "-";
  return isNegative ? -value : value;
}

function matchText(pattern, text) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function formatDelta(value) {
  if (value == null) {
    return "$0.00";
  }

  return `${value > 0 ? "+" : ""}${formatMoney(value)}`;
}

module.exports = { analyzeLocally, _test: { buildAnalysis, parseKnownBill } };
