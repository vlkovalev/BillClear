function buildMockBillAnalysis(fileType) {
  const isImage = fileType === "image";

  return {
    provider: "mock",
    category: "telecom",
    carrier: "Telus",
    billingPeriod: "May 13 - June 12, 2026",
    totalDue: 96.42,
    previousTotal: 82.19,
    dueDate: "July 4, 2026",
    confidence: "medium",
    plainEnglishSummary: isImage
      ? "This photo looks like a Telus wireless bill. Your total is higher than last month mainly because of a new account service fee and a small plan-price increase."
      : "This PDF looks like a Telus wireless bill. Your total is higher than last month mainly because of a new account service fee and a small plan-price increase.",
    charges: [
      {
        id: "plan",
        name: "Unlimited 50 5G+ Plan",
        amount: 75,
        status: "changed",
        explanation: "Your base mobile plan appears to be $5 higher than the previous bill.",
        action: "Check whether the increase was announced in a bill notice or contract update."
      },
      {
        id: "service-fee",
        name: "Account service fee",
        amount: 7,
        status: "new",
        explanation: "This looks like a newly added administration-style charge, not usage.",
        action: "Ask the carrier to identify the contract term that allows this fee."
      },
      {
        id: "e911",
        name: "E911 levy",
        amount: 0.95,
        status: "expected",
        explanation: "This is a government-mandated emergency service charge in many provinces."
      },
      {
        id: "tax",
        name: "GST/HST",
        amount: 13.47,
        status: "expected",
        explanation: "Sales tax applied to the taxable parts of your bill."
      }
    ],
    findings: [
      {
        id: "total-jump",
        severity: "watch",
        title: "Your bill is up $14.23",
        description: "That is a 17.3% increase from the previous month. Most of the jump comes from the plan change and new fee."
      },
      {
        id: "new-fee",
        severity: "dispute",
        title: "New service fee detected",
        description: "New recurring fees are worth challenging if they were not clearly disclosed or do not match your agreement."
      },
      {
        id: "no-overage",
        severity: "info",
        title: "No obvious overage charge",
        description: "The bill does not show a large data, roaming, or long-distance overage in this sample analysis."
      }
    ],
    rightsNote:
      "Canadian telecom customers can ask for plain-language explanations of charges and escalate unresolved billing disputes through the carrier's complaint process and the CCTS."
  };
}

module.exports = { buildMockBillAnalysis };
