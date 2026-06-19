# BillClear

BillClear is a React Native MVP for Canadian telecom bill transparency. The first build focuses on the highest-value moment: upload a PDF or bill photo, then receive a plain-English explanation of charges, new fees, and likely dispute points.

## What is built

- Expo React Native app for iOS, Android, and web preview.
- PDF upload through `expo-document-picker`.
- Photo upload through `expo-image-picker`.
- Optional previous-month PDF upload so the analyzer can compare actual bills instead of guessing.
- A privacy-first hybrid analysis flow: the backend tries local carrier parsers first, then uses cloud AI only when the user enables AI fallback.
- Mock backend mode when local parsing is not available and cloud AI is disabled or unconfigured, so the end-to-end app can be tested before paying for AI calls.
- Sanitized TELUS and Virgin Plus sample bill fixtures in `src/data`, extracted from local PDFs for month-to-month testing.
- Inline scan errors, a clear/reset action, scan confidence, and local dispute letter drafting for flagged charges.

The Anthropic API key lives only on the backend. The app never holds it, so it is safe to install on a phone. Claude is optional; BillClear can run private parser-first scans without any cloud AI key.

Raw bill PDFs are ignored by git via `samples/*_bills/*.pdf` because real telecom bills can include names, addresses, account numbers, phone numbers, and payment details. The local PDFs are private functional test fixtures only.

## Run locally

This has two parts that both need to be running: the backend and the Expo app. Start the backend first.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm start
```

You should see `BillClear API listening on http://localhost:4000`. Leave this running in its own terminal window.

The backend returns mock analysis data when `server/.env` does not contain an `ANTHROPIC_API_KEY`. To use live Claude analysis, add your Anthropic key to `server/.env`.

### 2. Expo App

In a second terminal from the project root:

```bash
npm install
cp .env.example .env
npm start
```

For iOS Simulator or Android Emulator on the same machine, `EXPO_PUBLIC_API_URL=http://localhost:4000` works as-is.

For a real phone running Expo Go, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP address, for example `http://192.168.1.42:4000`. Your phone and computer must be on the same Wi-Fi network.

To test comparison, tap **Add previous month PDF for comparison** before or after choosing the current bill. If a current bill is already scanned, adding the previous bill automatically reruns the scan.

The app defaults to **Private parser first**. Turn on **AI fallback allowed** only when you want the backend to use the configured cloud AI provider if local parsing cannot read the bill.

## Sample bill extraction

The helper script extracts basic totals from local TELUS PDFs:

```bash
python scripts/extract_telus_samples.py
```

Virgin Plus PDFs use a different layout and are extracted with:

```bash
python scripts/extract_virgin_samples.py
```

Use the output to refresh the matching sanitized fixture in `src/data` after adding or redacting new sample bills.

## Troubleshooting

- **Cannot reach the server:** make sure the backend is running and `EXPO_PUBLIC_API_URL` matches where it is listening. Restart Expo after changing `.env`.
- **Dependency version warnings:** after `npm install` in the project root, run `npx expo install --fix` once to align Expo package versions.
- **Mock results only:** add `ANTHROPIC_API_KEY` to `server/.env` when you want real Claude analysis.
- **Cloud AI never runs:** turn on **AI fallback allowed** in the app. Local parser scans still run first.
- **Large file errors:** current uploads are limited to 12 MB to avoid slow base64 encoding on mobile devices.

## Private beta build path

BillClear is configured for EAS builds with `eas.json`.

1. Deploy `server` to an HTTPS backend.
2. Update the `preview` profile in `eas.json` with the deployed API URL.
3. Set backend environment variables from `server/.env.example`.
4. Keep `ALLOW_MOCK_ANALYSIS=false` for real beta testers unless the build is clearly marked as a demo.
5. Build an internal preview:

```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
```

See `docs/BETA_CHECKLIST.md`, `PRIVACY_POLICY.md`, and `TERMS.md` before sharing the app outside trusted testers.

## MVP scope

Version one should prove that users understand their bill faster after scanning it. It does not need account creation, payments, carrier integrations, or a fee database yet.

## AI response contract

The app expects this exact shape back from the backend, and the backend prompt in `server/analyzeBillPrompt.js` is written to produce it:

```ts
type BillAnalysis = {
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
```

Keep that contract stable so the mobile UI can stay simple while the scanning intelligence improves behind it.

## Developer brief

Build a Canadian telecom bill scanner app in React Native. Users upload a PDF or photo of a phone, internet, or wireless bill. The app returns a plain-English explanation of what they are being charged, what changed since the previous bill if available, which charges are normal, which are new or suspicious, and what the user can ask the carrier to explain.

The MVP should prioritize:

- fast upload and scan flow
- clear results screen
- trust-building language
- Canadian carrier terminology
- structured AI output that can be tested and displayed reliably

Avoid building negotiation automation, account linking, subscription billing, or a full fee database until the scan result is validated with real users.
