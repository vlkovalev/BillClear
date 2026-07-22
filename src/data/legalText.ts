export const PRIVACY_POLICY_TEXT = `Effective Date: June 19, 2026

BillClear is committed to protecting your privacy. This policy describes how we handle information when you use the BillClear mobile application and backend services (together, the "Service").

1. Information We Collect
When you upload a bill (in PDF or image format), we collect the raw document or photo file data (processed entirely in memory) and minimal technical data needed to handle the request, such as your IP address (used only for rate limiting) and standard HTTP headers. We do not require an account, name, email, or payment information to use the Service, and we do not intentionally collect or store personal identifiers like your name, phone number, address, or account numbers from the content of uploaded bills.

2. How We Process Data (In-Memory Processing)
- Zero Retention: Uploaded bills (PDFs, images) are processed entirely in memory. They are never saved to persistent storage (hard drives or databases) on our servers.
- Instant Deletion: Once the analysis is returned to your device, the memory buffer containing your bill file is freed and is not retained.
- Private Parser First: BillClear attempts to read your bill using a local, carrier-specific parser before any cloud AI is used.
- Optional Cloud AI Processing: You can choose whether to allow Cloud AI (via Anthropic's Claude API) as a fallback when the private parser cannot read your bill. If Cloud AI is enabled, the base64 data is securely transmitted to Anthropic via encrypted HTTPS requests. BillClear is fully usable without ever enabling Cloud AI.

3. International Data Transfers
When Cloud AI fallback is enabled for a scan, your bill data is sent to Anthropic, a service provider based in the United States, so it may be processed outside Canada. Leave Cloud AI fallback off if you prefer your data to stay within our private-parser pipeline.

4. Data Hardening & Logs Redaction
- Our server logs are redacted. We use filters to automatically strip any traces of account IDs, phone numbers, postal codes, and email addresses.
- All data in transit is encrypted using Secure Sockets Layer/Transport Layer Security (HTTPS).
- Requests are rate-limited per IP address to reduce the risk of abuse.

5. Your Choices and Controls
You decide whether to enable Cloud AI fallback, and you can clear or restart a scan at any time; nothing about a cancelled or completed scan is retained server-side.

6. Children's Privacy
BillClear is not directed at children and is not intended for use by anyone under the age of 13.

7. Compliance & Canadian Protections
BillClear complies with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). Since we do not retain, store, or sell any personal data, your telecom billing details remain entirely your own.`;

export const TERMS_TEXT = `Effective Date: June 19, 2026

Welcome to BillClear. By using our mobile application and backend services (together, the "Service"), you agree to these Terms of Service.

1. Description of Service
BillClear provides Canadian telecom bill scanning and plain-English analysis. We translate line items, identify new fees, and suggest potential points of dispute. The Service does not require account creation or payment.

2. Eligibility and Acceptable Use
- You must be able to form a binding contract to use the Service.
- You agree to use the Service only for your own bills, or bills you have authorization to scan on someone else's behalf.
- You agree not to use the Service unlawfully, or to abuse, overload, or circumvent its rate limits or security controls.

3. No Legal or Financial Advice
- The analysis, findings, and suggestions provided by BillClear are for informational and transparency purposes only.
- BillClear is not a law firm, financial advisor, or carrier representative.
- We do not guarantee that any dispute raised with a carrier will result in credits, refunds, or billing changes.

4. Customer Responsibility
- You are responsible for verifying the accuracy of all billing details (such as total due and due dates) before submitting disputes or payments.
- You agree not to upload bills containing credit card numbers or other high-sensitivity financial credentials.

5. Third-Party Services
We use third-party APIs (including Anthropic's Claude API) to analyze documents when you opt in to Cloud AI. You agree to use the Service in compliance with all relevant laws, including the CRTC Wireless Code.

6. Disclaimer of Warranties
The Service is provided "as is" and "as available," without warranties of any kind, including accuracy or fitness for a particular purpose. We do not warrant that every bill format will be successfully parsed.

7. Limitation of Liability
BillClear is provided without warranty of any kind. Under no circumstances shall BillClear be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the Service or negotiations with your telecom provider.

8. Termination
We may suspend or restrict access for any user found to be abusing the Service, without notice.

9. Governing Law
These Terms are governed by the laws of Canada and the applicable laws of the province in which BillClear operates.`;
