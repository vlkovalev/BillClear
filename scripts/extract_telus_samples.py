from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


SAMPLE_DIR = Path("samples/telus_bills")


def first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None


def money_after(label: str, text: str) -> float | None:
    value = first_match(rf"{re.escape(label)}.*?\$([0-9,]+\.\d{{2}})", text)
    return float(value.replace(",", "")) if value else None


def extract_bill(path: Path) -> dict[str, object]:
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        page_count = len(pdf.pages)

    return {
        "fileName": path.name,
        "billDate": first_match(r"Your TELUS bill\s+([A-Za-z]+ \d{1,2}, \d{4})", text),
        "balanceForward": money_after("Balance forward from your last bill", text),
        "internet": money_after("Internet", text),
        "telusTv": money_after("TELUS TV", text),
        "homeSecurity": money_after("Home Security and Safety", text),
        "gstHst": money_after("GST / HST", text),
        "easyPayment": money_after("TELUS Easy Payment", text),
        "totalNewCharges": money_after("Total new charges", text),
        "totalDue": money_after("Total due", text),
        "pageCount": page_count,
    }


def main() -> None:
    bills = [extract_bill(path) for path in sorted(SAMPLE_DIR.glob("*.pdf"))]
    print(json.dumps(bills, indent=2))


if __name__ == "__main__":
    main()
