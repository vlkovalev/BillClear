export type Carrier = "Telus" | "Rogers" | "Bell" | "Fido" | "Virgin Plus" | "Koodo" | "Freedom" | "Unknown";

/**
 * Which kind of bill this is. Only "telecom" is implemented today (see
 * docs/adr/0001-energy-bills-architecture.md) — the field exists now so the
 * rest of the app (paywall, history/trend view, PDF export) never needs a
 * schema change when "energy" support lands. Treat a missing value as
 * "telecom" for back-compat with results produced before this field existed.
 */
export type BillCategory = "telecom" | "energy";

export type ChargeStatus = "expected" | "changed" | "new" | "questionable";

export type BillCharge = {
  id: string;
  name: string;
  amount: number;
  status: ChargeStatus;
  explanation: string;
  action?: string;
};

export type BillFinding = {
  id: string;
  severity: "info" | "watch" | "dispute";
  title: string;
  description: string;
};

export type BillHistoryPoint = {
  billingPeriod: string;
  totalDue: number;
};

export type BillAnalysis = {
  provider?: "local_parser" | "claude" | "openai" | "gemini" | "mock";
  /** Defaults to "telecom" when absent — see BillCategory. */
  category?: BillCategory;
  carrier: Carrier;
  billingPeriod: string;
  totalDue: number;
  previousTotal?: number;
  dueDate: string;
  confidence?: "low" | "medium" | "high";
  plainEnglishSummary: string;
  charges: BillCharge[];
  findings: BillFinding[];
  rightsNote: string;
  /** Total due across this bill and any previous bills supplied, oldest first. */
  history?: BillHistoryPoint[];
};

export type UploadedBill = {
  name: string;
  type: "pdf" | "image";
  uri: string;
  size?: number;
};

export type AnalyzeBillOptions = {
  allowCloudAi: boolean;
};
