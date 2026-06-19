# BillClear Privacy Policy

> **Status: draft, pending lawyer review.** Do not treat as final or submit to App Store Connect / Google Play Console until reviewed. See `docs/BETA_CHECKLIST.md`.

**Effective Date:** June 19, 2026

BillClear is committed to protecting your privacy. This policy describes how we handle information when you use the BillClear mobile application and backend services.

## 1. Information We Collect
When you upload a bill (in PDF or image format), we collect:
*   The raw document or photo file data (processed entirely in memory).
*   Device information necessary to complete requests (e.g., standard HTTP headers).

We do **not** collect or store personal identifiers like your name, phone number, address, or account numbers from the uploaded bills.

## 2. How We Process Data (In-Memory Processing)
*   **Zero Retention:** Uploaded bills (PDFs, images) are processed **entirely in memory**. They are never saved to persistent storage (hard drives or databases) on our servers.
*   **Instant Deletion:** Once the AI analysis is returned to your device, the memory buffer containing your bill file is immediately freed and cleared.
*   **Optional Cloud AI Processing:** You can choose whether to use Cloud AI (via Anthropic's Claude API) or stick to local analysis. If Cloud AI is enabled, the base64 data is securely transmitted to Anthropic via encrypted HTTPS requests and is subject to their standard zero-data-retention APIs for commercial accounts.

## 3. Data Hardening & Logs Redaction
*   Our server logs are redacted. We use filters to automatically strip any traces of account IDs, phone numbers, postal codes, and email addresses.
*   All data in transit is encrypted using Secure Sockets Layer/Transport Layer Security (HTTPS).

## 4. Compliance & Canadian Protections
BillClear complies with Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA). Since we do not retain, store, or sell any personal data, your telecom billing details remain entirely your own.

## 5. Contact Us
If you have any questions about this Privacy Policy, please contact our support team at `support@billclear.ca` or visit `https://billclear.ca/support`.
