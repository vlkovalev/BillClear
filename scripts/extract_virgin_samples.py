from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


SAMPLE_DIR = Path("samples/virgin_bills")


def first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None


def money_before(label: str, text: str) -> float | None:
    value = first_match(rf"\$?(-?[0-9,]+\.\d{{2}})\s*{re.escape(label)}", text)
    return float(value.replace(",", "")) if value else None


def money_after(label: str, text: str) -> float | None:
    value = first_match(rf"{re.escape(label)}\s*\$?(-?[0-9,]+\.\d{{2}})", text)
    return float(value.replace(",", "")) if value else None


def extract_bill(path: Path) -> dict[str, object]:
    reader = PdfReader(path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    total_amount_due = money_before("Total amount due", text)
    if total_amount_due is None:
        total_amount_due = money_before("Total amount to be charged to your credit card", text)

    return {
        "fileName": path.name,
        "billDate": first_match(r"([A-Za-z]+ \d{1,2}, \d{4})\s*Bill Date", text),
        "nextBillDate": first_match(r"Bill Date\s*([A-Za-z]+ \d{1,2}, \d{4})\s*Next Bill Date", text),
        "previousAmountDue": money_before("Previous amount due", text),
        "totalPayments": money_before("Total payments", text),
        "creditBalance": money_before("Credit balance", text),
        "monthlyCharges": money_before("Monthly charges", text),
        "usageAndLongDistance": money_before("Usage and long distance", text),
        "taxes": money_before("Total taxes on current charges", text),
        "totalCurrentCharges": money_after("Total current charges including taxes", text),
        "totalAmountDue": total_amount_due,
        "gstIncluded": money_before("Total GST included in this bill", text),
        "mobileCredits": money_after("Mobile credits", text),
        "pageCount": len(reader.pages),
    }


def main() -> None:
    bills = [extract_bill(path) for path in sorted(SAMPLE_DIR.glob("*.pdf"))]
    print(json.dumps(bills, indent=2))


if __name__ == "__main__":
    main()
