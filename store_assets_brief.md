# BillClear: App Store & Play Store Assets Brief

This brief compiles the marketing copy, asset descriptions, metadata, and App Store Privacy Nutrition Label guidelines required for submitting BillClear to the Apple App Store and Google Play Store.

---

## 1. Store Metadata

*   **App Name**: BillClear
*   **Subtitle (iOS)**: Decode telecom bills & fees
*   **Short Description (Android)**: Scan and translate Canadian telecom bills. Expose hidden fees and price increases.
*   **Support Email**: `support@billclear.ca`
*   **Privacy Policy URL**: `https://billclear.ca/privacy`
*   **Support URL**: `https://billclear.ca/support`

### Detailed App Description
> Stop overpaying your Canadian telecom provider. Rogers, Bell, Telus, Koodo, Fido, Virgin Plus, and Freedom Mobile bills are notoriously complex, filled with vague line items, hidden administrative fees, and unexpected price increases.
>
> BillClear translates your phone, internet, and TV bills into plain, jargon-free English. 
>
> HOW IT WORKS:
> 1. Upload a photo or PDF of your bill.
> 2. Optional: Add your previous month's bill for an exact comparison scan.
> 3. Instantly review a breakdown highlighting what is expected, what has changed, and what is questionable.
> 4. Generate a draft dispute letter ready to copy and paste to your carrier's customer relations or escalate to the CCTS.
>
> SECURE & PRIVATE:
> We take privacy seriously. BillClear processes all documents transiently in memory. We never store your raw PDFs or bill photos, and our logs are automatically redacted to ensure no personal identifiers are saved.

### Search Keywords
> bill, scanner, telecom, carrier, rogers, bell, telus, koodo, fido, freedom, mobile, phone bill, dispute, ccts, crtc, save money, invoice, canada, finance

---

## 2. Graphic Assets Configuration

*   **App Icon**: Link to [icon.png](file:///c:/Users/heliu/Desktop/WebSItes/BillClear/assets/icon.png) (and adaptive version in [adaptive-icon.png](file:///c:/Users/heliu/Desktop/WebSItes/BillClear/assets/adaptive-icon.png)). Contains a modern vector green receipt icon with a shield checkmark on a warm cream background (#f7f5ef).
*   **Splash Screen**: Link to [splash.png](file:///c:/Users/heliu/Desktop/WebSItes/BillClear/assets/splash.png). Portrays the central logo and sleek 'BillClear' typography.

---

## 3. App Store Privacy Nutrition Labels

Under Apple's privacy guidelines, BillClear collects:
1.  **User Content (Document / Photo upload)**:
    *   *File Uploads*: Uploaded PDFs and images are sent to the backend proxy for processing. However, because they are processed entirely in memory and immediately discarded, they are marked as **transient** and **not retained**.

The app does not currently integrate any analytics or crash-reporting SDK, so no "Usage Data" or "Diagnostics" categories should be declared until one is actually added. Update this section if/when an analytics or crash reporter is integrated.

---

## 4. Screenshot Layout Plan

*   **Screenshot 1 (Hook)**: Focus on the photo/PDF intake screen with the text header: *"Scan your Canadian telecom bills before you pay them."*
*   **Screenshot 2 (Plain-English)**: Display the parsed summary layout: *"Your bill is $14.23 higher this month. Here's why."*
*   **Screenshot 3 (Flagged Charges)**: Close-up on the charge breakdown card showing: *"Account service fee: New charge detected. Click here to dispute."*
*   **Screenshot 4 (Dispute Helper)**: Display the copy-paste template generated for a CCTS dispute.
