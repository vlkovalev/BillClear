export type Carrier = "Telus" | "Rogers" | "Bell" | "Fido" | "Virgin Plus" | "Koodo" | "Freedom" | "Unknown";

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

export type BillAnalysis = {
  provider?: "local_parser" | "claude" | "openai" | "gemini" | "mock";
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
