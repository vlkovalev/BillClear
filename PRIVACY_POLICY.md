# BillClear Privacy Policy

> **Status: draft, pending lawyer review.** Do not treat as final or submit to App Store Connect / Google Play Console until reviewed. See `docs/BETA_CHECKLIST.md`.

**Effective Date:** June 19, 2026

BillClear is committed to protecting your privacy. This policy describes how we handle information when you use the BillClear mobile application and backend services (together, the "Service").

## 1. Information We Collect

When you upload a bill (in PDF or image format), we collect:

*   The raw document or photo file data (processed entirely in memory, as described in Section 2).
*   Minimal technical data needed to handle the request, such as your IP address (used only for rate limiting and abuse prevention) and standard HTTP headers.

We do **not** require or collect an account, name, email address, or payment information to use the Service. We do **not** intentionally collect or store personal identifiers such as your name, phone number, address, or account numbers from the content of uploaded bills.

## 2. How We Process Data (In-Memory Processing)

*   **Zero Retention:** Uploaded bills (PDFs, images) are processed **entirely in memory**. They are never saved to persistent storage (hard drives or databases) on our servers.
*   **Instant Deletion:** Once the analysis is returned to your device, the memory buffer containing your bill file is freed and is not retained.
*   **Private Parser First:** By default, BillClear attempts to read your bill using a local, carrier-specific parser before any cloud AI is used.
*   **Optional Cloud AI Processing:** You can choose whether to allow Cloud AI (via Anthropic's Claude API) as a fallback when the private parser cannot read your bill. If Cloud AI is enabled, the base64-encoded file data is transmitted to Anthropic via encrypted HTTPS and is subject to Anthropic's standard data-handling terms for commercial API use. You can use BillClear without ever enabling Cloud AI.

## 3. International Data Transfers

When Cloud AI fallback is enabled for a scan (Section 2), your bill data is sent to Anthropic, a service provider based in the United States. This means that data may be processed on servers located outside Canada. If you prefer your data to stay within our private-parser pipeline, leave Cloud AI fallback turned off; BillClear is fully usable without it for supported carriers.

## 4. Data Hardening & Logs Redaction

*   Our server request logs are redacted: account numbers, phone numbers, postal codes, and email addresses are automatically stripped before any log line is written.
*   All data in transit is encrypted using HTTPS/TLS.
*   Requests are rate-limited per IP address to reduce the risk of abuse.
*   Redacted operational logs (success/failure state, carrier detected, timing) may be retained by our hosting provider for routine security and debugging purposes, then deleted according to that provider's standard retention schedule. Raw bill content is never included in these logs.

## 5. Your Choices and Controls

*   You decide whether to enable Cloud AI fallback; the private parser runs first by default.
*   You can clear or restart a scan at any time using the in-app reset action; nothing about a cancelled or completed scan is retained server-side.
*   You are not required to create an account, so there is no stored profile to request deletion of.

## 6. Children's Privacy

BillClear is not directed at children and is not intended for use by anyone under the age of 13. We do not knowingly collect personal information from children.

## 7. Your Rights Under PIPEDA

BillClear complies with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). Because we do not retain, store, or sell personal data from your bills, there is generally no stored data to access, correct, or delete. If you have questions about how a specific scan was processed, or want to withdraw consent to Cloud AI fallback for future scans, contact us using the information in Section 9.

## 8. Changes to This Policy

We may update this policy as the Service changes. Material changes will be reflected by updating the Effective Date above and, where appropriate, through an in-app notice.

## 9. Contact Us

If you have any questions about this Privacy Policy, please contact our support team at `support@billclear.ca` or visit `https://billclear.ca/support`.
