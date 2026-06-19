export const PRIVACY_POLICY_TEXT = `Effective Date: June 19, 2026

BillClear is committed to protecting your privacy. This policy describes how we handle information when you use the BillClear mobile application and backend services.

1. Information We Collect
When you upload a bill (in PDF or image format), we collect the raw document or photo file data (processed entirely in memory). We do not collect or store personal identifiers like your name, phone number, address, or account numbers from the uploaded bills.

2. How We Process Data (In-Memory Processing)
- Zero Retention: Uploaded bills (PDFs, images) are processed entirely in memory. They are never saved to persistent storage (hard drives or databases) on our servers.
- Instant Deletion: Once the AI analysis is returned to your device, the memory buffer containing your bill file is immediately freed and cleared.
- Optional Cloud AI Processing: You can choose whether to use Cloud AI (via Anthropic's Claude API) or stick to local analysis. If Cloud AI is enabled, the base64 data is securely transmitted to Anthropic via encrypted HTTPS requests and is subject to their standard zero-data-retention APIs for commercial accounts.

3. Data Hardening & Logs Redaction
- Our server logs are redacted. We use filters to automatically strip any traces of account IDs, phone numbers, postal codes, and email addresses.
- All data in transit is encrypted using Secure Sockets Layer/Transport Layer Security (HTTPS).

4. Compliance & Canadian Protections
BillClear complies with Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA). Since we do not retain, store, or sell any personal data, your telecom billing details remain entirely your own.`;

export const TERMS_TEXT = `Effective Date: June 19, 2026

Welcome to BillClear. By using our mobile application and backend services, you agree to these Terms of Service.

1. Description of Service
BillClear provides Canadian telecom bill scanning and plain-English analysis. We translate line items, identify new fees, and suggest potential points of dispute.

2. No Legal or Financial Advice
- The analysis, findings, and suggestions provided by BillClear are for informational and transparency purposes only.
- BillClear is not a law firm, financial advisor, or carrier representative.
- We do not guarantee that any dispute raised with a carrier will result in credits, refunds, or billing changes.

3. Customer Responsibility
- You are responsible for verifying the accuracy of all billing details (such as total due and due dates) before submitting disputes or payments.
- You agree not to upload bills containing credit card numbers or other high-sensitivity financial credentials.

4. Third-Party Services
We use third-party APIs (including Anthropic's Claude API) to analyze documents when you opt-in to Cloud AI. You agree to use the service in compliance with all relevant laws, including the CRTC Wireless Code.

5. Limitation of Liability
BillClear is provided "as is" without warranty of any kind. Under no circumstances shall BillClear be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the service or negotiations with your telecom provider.`;
