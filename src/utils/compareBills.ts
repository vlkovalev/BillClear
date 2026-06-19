import { SampleBill } from "../data/telusSampleBills";

export type BillDelta = {
  key: keyof Pick<
    SampleBill,
    "internet" | "telusTv" | "homeSecurity" | "gstHst" | "easyPayment" | "totalNewCharges" | "totalDue"
  >;
  label: string;
  previousAmount: number;
  currentAmount: number;
  delta: number;
};

const comparisonFields: Array<{ key: BillDelta["key"]; label: string }> = [
  { key: "internet", label: "Internet" },
  { key: "telusTv", label: "TELUS TV" },
  { key: "homeSecurity", label: "Home Security" },
  { key: "gstHst", label: "GST/HST" },
  { key: "easyPayment", label: "TELUS Easy Payment" },
  { key: "totalNewCharges", label: "Total new charges" },
  { key: "totalDue", label: "Total due" }
];

export function compareSampleBills(previous: SampleBill, current: SampleBill): BillDelta[] {
  return comparisonFields
    .map(({ key, label }) => {
      const previousAmount = previous[key] ?? 0;
      const currentAmount = current[key] ?? 0;

      return {
        key,
        label,
        previousAmount,
        currentAmount,
        delta: Number((currentAmount - previousAmount).toFixed(2))
      };
    })
    .filter((item) => item.delta !== 0);
}

export function getLargestIncrease(deltas: BillDelta[]): BillDelta | null {
  return deltas.reduce<BillDelta | null>((largest, item) => {
    if (item.delta <= 0) {
      return largest;
    }

    if (!largest || item.delta > largest.delta) {
      return item;
    }

    return largest;
  }, null);
}
