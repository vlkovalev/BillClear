const { PDFParse } = require("pdf-parse");

async function analyzeLocally({ currentBill, previousBill }) {
  if (currentBill.fileType !== "pdf") {
    return null;
  }

  const currentText = await extractPdfText(currentBill);
  const previousText = previousBill?.fileType === "pdf" ? await extractPdfText(previousBill) : "";
  const currentSummary = parseKnownBill(currentText);

  if (!currentSummary) {
    return null;
  }

  const previousSummary = previousText ? parseKnownBill(previousText) : null;
  return buildAnalysis(currentSummary, previousSummary);
}

async function extractPdfText(bill) {
  try {
    const parser = new PDFParse({ data: Buffer.from(bill.fileBase64, "base64") });
    const parsed = await parser.getText();
    return parsed.text || "";
  } catch {
    return "";
  }
}

function parseKnownBill(text) {
  const normalized = text.replace(/\s+/g, " ");

  if (/Your TELUS bill/i.test(normalized)) {
    return parseTelus(normalized);
  }

  if (/Virgin Plus|virginplus\.ca/i.test(normalized)) {
    return parseVirgin(normalized);
  }

  return null;
}

function parseTelus(text) {
  return {
    carrier: "Telus",
    billingPeriod: matchText(/Your TELUS bill\s+([A-Za-z]+ \d{1,2}, \d{4})/i, text) || "Unknown period",
    dueDate: matchText(/charged to your credit card on ([A-Za-z]+ \d{1,2})/i, text) || "See bill",
    totalDue: moneyAfter("Total due", text) ?? moneyAfter("Total new charges", text) ?? 0,
    totalCurrentCharges: moneyAfter("Total new charges", text),
    charges: [
      charge("internet", "Internet", moneyAfter("Internet", text)),
      charge("telus-tv", "TELUS TV", moneyAfter("TELUS TV", text)),
      charge("home-security", "Home Security and Safety", moneyAfter("Home Security and Safety", text)),
      charge("gst-hst", "GST/HST", moneyAfter("GST / HST", text)),
      charge("easy-payment", "TELUS Easy Payment", moneyAfter("TELUS Easy Payment", text))
    ].filter(Boolean)
  };
}

function parseVirgin(text) {
  const billDate = matchText(/([A-Za-z]+ \d{1,2}, \d{4})\s*Bill Date/i, text) || "Unknown period";
  const amountDue = moneyBefore("Total amount due", text) ?? moneyBefore("Total amount to be charged to your credit card", text);

  return {
    carrier: "Virgin Plus",
    billingPeriod: billDate,
    dueDate: matchText(/Please Pay By\*?([A-Za-z]+ \d{1,2}, \d{4})/i, text) || "See bill",
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

function buildAnalysis(current, previous) {
  const previousTotal = previous?.totalCurrentCharges ?? previous?.totalDue;
  const currentComparisonTotal = current.totalCurrentCharges ?? current.totalDue;
  const delta = previousTotal == null ? null : roundMoney(currentComparisonTotal - previousTotal);
  const charges = current.charges.map((item) => {
    const previousCharge = previous?.charges.find((chargeItem) => chargeItem.id === item.id);
    const chargeDelta = previousCharge ? roundMoney(item.amount - previousCharge.amount) : null;
    const status = !previous
      ? "expected"
      : !previousCharge
        ? "new"
        : chargeDelta && chargeDelta !== 0
          ? "changed"
          : "expected";

    return {
      ...item,
      status,
      explanation:
        status === "changed"
          ? `${item.name} changed by ${formatDelta(chargeDelta)} compared with the previous bill.`
          : `${item.name} appears on the current ${current.carrier} bill.`,
      action:
        status === "changed" || status === "new"
          ? `Ask ${current.carrier} to explain why ${item.name} ${status === "new" ? "was added" : "changed"}.`
          : undefined
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

  return {
    provider: "local_parser",
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
      "This private scan is a starting point. Verify the carrier's original bill before sending a dispute or complaint."
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

function moneyAfter(label, text) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}[^$-]*\\$?(-?[0-9,]+\\.\\d{2})`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function moneyBefore(label, text) {
  const match = text.match(new RegExp(`\\$?(-?[0-9,]+\\.\\d{2})\\s*${escapeRegExp(label)}`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : null;
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

module.exports = { analyzeLocally };
