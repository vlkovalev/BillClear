# BillClear

BillClear is a React Native MVP for Canadian telecom bill transparency. The first build focuses on the highest-value moment: upload a PDF or bill photo, then receive a plain-English explanation of charges, new fees, and likely dispute points.

## What is built

- Expo React Native app for iOS, Android, and web preview.
- PDF upload through `expo-document-picker`.
- Photo upload through `expo-image-picker`.
- Optional previous-bill PDF uploads (one or more) so the analyzer can compare actual bills instead of guessing, including a "Total due over time" trend view when 2+ previous bills are added.
- A privacy-first hybrid analysis flow: the backend tries local carrier parsers first, then uses cloud AI only when the user enables AI fallback.
- Mock backend mode when local parsing is not available and cloud AI is disabled or unconfigured, so the end-to-end app can be tested before paying for AI calls.
- Sanitized TELUS and Virgin Plus sample bill fixtures in `src/data`, extracted from local PDFs for month-to-month testing.
- Inline scan errors, a clear/reset action, scan confidence, and local dispute letter drafting for flagged charges.
- A free/Pro split: the free tier is limited to one previous bill (no trend view, no cloud AI fallback, no dispute letter drafting, no PDF export); Pro unlocks unlimited previous bills plus the trend view, cloud AI fallback, dispute letter drafting, and PDF export. See "Free vs. Pro" below — no real payment provider is wired up yet.
- A richer results screen: an executive-summary row (due date, flagged-charge count, scan confidence, generated time), charges grouped into "Needs your attention" vs. "Expected charges" instead of one flat list, and a Pro-gated "Export PDF report" button that renders a letterhead-style report (`src/utils/reportHtml.ts`) via `expo-print` and shares it via `expo-sharing`.
- Groundwork for a second bill category (energy/electricity, alongside today's telecom): `BillAnalysis` carries an optional `category: "telecom" | "energy"` field (defaults to `"telecom"`), and the backend's bill parser dispatch (`server/providers/localAnalyzer.js`) is a registry instead of an if/else chain, so a new carrier or category never requires touching dispatch logic. No energy parser exists yet — see `docs/adr/0001-energy-bills-architecture.md` for the decision to extend this app rather than build a separate one, and for the province-by-province research that has to happen before an energy parser can be written.

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
npx expo install expo-print expo-sharing
cp .env.example .env
npm start
```

`expo-print` and `expo-sharing` power the **Export PDF report** button (Pro-gated, see "Free vs. Pro" below). Use `npx expo install` rather than `npm install` for these two so Expo resolves the versions that match your installed SDK.

For iOS Simulator or Android Emulator on the same machine, `EXPO_PUBLIC_API_URL=http://localhost:4000` works as-is.

For a real phone running Expo Go, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP address, for example `http://192.168.1.42:4000`. Your phone and computer must be on the same Wi-Fi network.

To test comparison, tap **Add previous bill for comparison** before or after choosing the current bill. You can add more than one — the button becomes **Add another previous bill** after the first — and each previous bill has its own remove (×) button. If a current bill is already scanned, adding or removing a previous bill automatically reruns the scan. The most recent previous bill (by date on the bill, not upload order) drives the detailed charge-by-charge diff; when 2 or more previous bills are present, the results screen also shows a "Total due over time" trend panel across all of them.

The app defaults to **Private parser first**. Turn on **AI fallback allowed** only when you want the backend to use the configured cloud AI provider if local parsing cannot read the bill.

## Free vs. Pro

`App.tsx` has a local `isPro` flag that gates three things: adding more than one previous bill (and the "Total due over time" trend view, which only shows with 2+ previous bills), the **AI fallback allowed** toggle, and dispute letter drafting on flagged charges. Tap **Upgrade** next to "Start a bill scan" (or any gated control) to see what Pro unlocks.

`isPro` is in-memory only right now — it resets on every app restart and there is a **"Turn on Pro (test mode)"** button in the upgrade screen for trying the gated UI while developing. There is no real payment provider wired up. Before shipping this to real users:

1. Remove the test-mode toggle in the upgrade modal.
2. Wire a real entitlement check, e.g. RevenueCat, Stripe, or Expo In-App Purchases, and drive `isPro` from that instead of local state.
3. Persist the entitlement (e.g. via the payment provider's SDK, which typically handles this for you) so Pro survives app restarts.

### Pricing/UX principles to keep when real billing lands

Comparable bill-negotiation and subscription-tracking apps (Rocket Money, Trim, Billshark) draw their most consistent complaints from three things: charging users for a "savings" result without a clear confirmation step beforehand, premium plans that are hard to cancel or keep charging after a cancellation attempt, and requiring full bank-account linking (Plaid) just to function — which is also the most common privacy objection to the category. What people actually praise across these apps is visibility: a clear, itemized view of what they're paying for and what changed, which is BillClear's core feature already.

That points to a few rules worth keeping as real billing gets wired up: never charge without an explicit, itemized confirmation immediately before the charge; make cancellation a single tap with no retention screen; and never require bank-account linking for any tier, free or Pro — BillClear's local-parser-first, nothing-stored design is a real differentiator against the rest of this category and should stay true at every pricing tier, not just the free one.

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
- **Large file errors:** current uploads are limited to 4 MB because Netlify Functions receive base64-encoded request bodies, which leaves less room than the raw PDF/image size.

## Private beta build path

BillClear is configured for EAS builds with `eas.json`.

1. Create/connect a Netlify site for this repo. `netlify.toml` uses `server` as the base directory, builds with `npm ci`, publishes `server/public`, and deploys the Express API as a Netlify Function.
2. Confirm the deployed site URL, then update the `preview` and `production` profiles in `eas.json` if the Netlify URL is not `https://billclear-app.netlify.app`.
3. Set backend environment variables from `server/.env.example` in Netlify, scoped to Functions.
4. Keep `ALLOW_MOCK_ANALYSIS=false` for real beta testers unless the build is clearly marked as a demo.
5. Use `/health` to confirm the deployed API is responding before making a mobile build.
6. Build an internal preview:

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
  history?: { billingPeriod: string; totalDue: number }[]; // only present with 2+ previous bills, oldest first
};
```

Keep that contract stable so the mobile UI can stay simple while the scanning intelligence improves behind it.

### Analyze-bill request shape

`POST /api/analyze-bill` accepts a `previousBills` array (zero or more) instead of a single previous bill, so the app can send any number of comparison bills:

```ts
{
  fileBase64: string;
  fileName?: string;
  fileType: "pdf" | "image";
  mediaType: string;
  previousBills?: { fileBase64: string; fileName?: string; fileType: "pdf" | "image"; mediaType: string }[];
  allowCloudAi?: boolean;
}
```

The backend still accepts the older singular `previousBill` field for backward compatibility, but the app and any new client should use `previousBills`.

## Developer brief

Build a Canadian telecom bill scanner app in React Native. Users upload a PDF or photo of a phone, internet, or wireless bill. The app returns a plain-English explanation of what they are being charged, what changed since the previous bill if available, which charges are normal, which are new or suspicious, and what the user can ask the carrier to explain.

The MVP should prioritize:

- fast upload and scan flow
- clear results screen
- trust-building language
- Canadian carrier terminology
- structured AI output that can be tested and displayed reliably

Avoid building negotiation automation, account linking, subscription billing, or a full fee database until the scan result is validated with real users.
