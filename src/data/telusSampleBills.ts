export type SampleBill = {
  fileName: string;
  billDate: string;
  balanceForward: number;
  internet: number;
  telusTv: number;
  homeSecurity: number | null;
  gstHst: number;
  easyPayment: number | null;
  totalNewCharges: number;
  totalDue: number;
  pageCount: number;
};

export const telusSampleBills: SampleBill[] = [
  {
    fileName: "TELUS-601844297-2026-01-17.pdf",
    billDate: "January 17, 2026",
    balanceForward: 0,
    internet: 185.72,
    telusTv: 53,
    homeSecurity: null,
    gstHst: 11.93,
    easyPayment: null,
    totalNewCharges: 250.65,
    totalDue: 250.65,
    pageCount: 4
  },
  {
    fileName: "TELUS-601844297-2026-02-17.pdf",
    billDate: "February 17, 2026",
    balanceForward: 0,
    internet: 198.52,
    telusTv: 53,
    homeSecurity: null,
    gstHst: 12.58,
    easyPayment: null,
    totalNewCharges: 264.1,
    totalDue: 264.1,
    pageCount: 4
  },
  {
    fileName: "TELUS-601844297-2026-03-17.pdf",
    billDate: "March 17, 2026",
    balanceForward: 264.1,
    internet: 210.7,
    telusTv: 53,
    homeSecurity: null,
    gstHst: 13.19,
    easyPayment: null,
    totalNewCharges: 283.66,
    totalDue: 547.76,
    pageCount: 4
  },
  {
    fileName: "TELUS-601844297-2026-04-17.pdf",
    billDate: "April 17, 2026",
    balanceForward: 0,
    internet: 105.54,
    telusTv: 16.13,
    homeSecurity: 19.36,
    gstHst: 16.06,
    easyPayment: 5,
    totalNewCharges: 162.09,
    totalDue: 162.09,
    pageCount: 6
  },
  {
    fileName: "TELUS-601844297-2026-05-17.pdf",
    billDate: "May 17, 2026",
    balanceForward: 157.5,
    internet: 134.28,
    telusTv: 33.95,
    homeSecurity: 1.33,
    gstHst: 8.49,
    easyPayment: 5,
    totalNewCharges: 183.05,
    totalDue: 25.55,
    pageCount: 4
  },
  {
    fileName: "TELUS-601844297-2026-06-17.pdf",
    billDate: "June 17, 2026",
    balanceForward: 0,
    internet: 134.28,
    telusTv: 33.95,
    homeSecurity: 5,
    gstHst: 8.67,
    easyPayment: 5,
    totalNewCharges: 186.9,
    totalDue: 186.9,
    pageCount: 4
  }
];
