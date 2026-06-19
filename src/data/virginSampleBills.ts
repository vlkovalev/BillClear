export type VirginSampleBill = {
  fileName: string;
  billDate: string;
  nextBillDate: string;
  previousAmountDue: number;
  totalPayments: number | null;
  creditBalance: number | null;
  monthlyCharges: number;
  usageAndLongDistance: number;
  taxes: number;
  totalCurrentCharges: number;
  totalAmountDue: number | null;
  gstIncluded: number;
  mobileCredits: number;
  pageCount: number;
};

export const virginSampleBills: VirginSampleBill[] = [
  {
    fileName: "VirginPDF-0.pdf",
    billDate: "September 16, 2025",
    nextBillDate: "October 16, 2025",
    previousAmountDue: 118.5,
    totalPayments: -237,
    creditBalance: null,
    monthlyCharges: 112.85,
    usageAndLongDistance: 0,
    taxes: 5.65,
    totalCurrentCharges: 118.5,
    totalAmountDue: 0,
    gstIncluded: 5.65,
    mobileCredits: 10,
    pageCount: 30
  },
  {
    fileName: "VirginPDF-1.pdf",
    billDate: "October 16, 2025",
    nextBillDate: "November 16, 2025",
    previousAmountDue: 0,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 112.85,
    usageAndLongDistance: 0,
    taxes: 5.65,
    totalCurrentCharges: 118.5,
    totalAmountDue: 118.5,
    gstIncluded: 5.65,
    mobileCredits: 10,
    pageCount: 23
  },
  {
    fileName: "VirginPDF-2.pdf",
    billDate: "November 16, 2025",
    nextBillDate: "December 16, 2025",
    previousAmountDue: 118.5,
    totalPayments: 0,
    creditBalance: null,
    monthlyCharges: 112.85,
    usageAndLongDistance: 0,
    taxes: 5.65,
    totalCurrentCharges: 118.5,
    totalAmountDue: 237,
    gstIncluded: 5.65,
    mobileCredits: 10,
    pageCount: 38
  },
  {
    fileName: "VirginPDF-3.pdf",
    billDate: "December 16, 2025",
    nextBillDate: "January 16, 2026",
    previousAmountDue: 237,
    totalPayments: -474,
    creditBalance: -115.05,
    monthlyCharges: 112.85,
    usageAndLongDistance: 0,
    taxes: 5.65,
    totalCurrentCharges: 121.95,
    totalAmountDue: null,
    gstIncluded: 5.65,
    mobileCredits: 10,
    pageCount: 22
  },
  {
    fileName: "VirginPDF-4.pdf",
    billDate: "January 16, 2026",
    nextBillDate: "February 16, 2026",
    previousAmountDue: -115.05,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 112.85,
    usageAndLongDistance: 0,
    taxes: 5.65,
    totalCurrentCharges: 118.5,
    totalAmountDue: 3.45,
    gstIncluded: 5.65,
    mobileCredits: 10,
    pageCount: 17
  },
  {
    fileName: "VirginPDF-5.pdf",
    billDate: "February 16, 2026",
    nextBillDate: "March 16, 2026",
    previousAmountDue: 3.45,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 130.85,
    usageAndLongDistance: 0,
    taxes: 6.55,
    totalCurrentCharges: 137.4,
    totalAmountDue: 137.4,
    gstIncluded: 6.55,
    mobileCredits: 10,
    pageCount: 21
  },
  {
    fileName: "VirginPDF-6.pdf",
    billDate: "March 16, 2026",
    nextBillDate: "April 16, 2026",
    previousAmountDue: 137.4,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 130.85,
    usageAndLongDistance: 0,
    taxes: 6.55,
    totalCurrentCharges: 137.4,
    totalAmountDue: 137.4,
    gstIncluded: 6.55,
    mobileCredits: 10,
    pageCount: 21
  },
  {
    fileName: "VirginPDF-7.pdf",
    billDate: "April 16, 2026",
    nextBillDate: "May 16, 2026",
    previousAmountDue: 137.4,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 130.85,
    usageAndLongDistance: 0,
    taxes: 6.55,
    totalCurrentCharges: 137.4,
    totalAmountDue: 137.4,
    gstIncluded: 6.55,
    mobileCredits: 10,
    pageCount: 27
  },
  {
    fileName: "VirginPDF-8.pdf",
    billDate: "May 16, 2026",
    nextBillDate: "June 16, 2026",
    previousAmountDue: 137.4,
    totalPayments: null,
    creditBalance: null,
    monthlyCharges: 130.85,
    usageAndLongDistance: 0,
    taxes: 6.55,
    totalCurrentCharges: 137.4,
    totalAmountDue: 137.4,
    gstIncluded: 6.55,
    mobileCredits: 10,
    pageCount: 27
  }
];
