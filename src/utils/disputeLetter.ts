import { BillAnalysis, BillCharge } from "../types";
import { formatCurrency } from "./currency";

export function createDisputeLetter(analysis: BillAnalysis, charge: BillCharge): string {
  return [
    `To: Customer Relations, ${analysis.carrier}`,
    `Re: Billing dispute - ${charge.name}`,
    "",
    `Please accept this message as a formal dispute of the charge labeled "${charge.name}" in the amount of ${formatCurrency(
      charge.amount
    )}, appearing on my bill for ${analysis.billingPeriod}.`,
    "",
    charge.action
      ? `BillClear flagged this item because: ${charge.action}`
      : "This charge appears unclear or inconsistent with the rest of my bill.",
    "",
    "Please explain the basis for this charge in plain language, identify where it appears in my agreement, and credit my account if it was applied incorrectly.",
    "",
    "If this cannot be resolved through your internal process, I may escalate the billing complaint through the CCTS."
  ].join("\n");
}
