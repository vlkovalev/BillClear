# BillClear Private Beta Checklist

## Required Before TestFlight / Internal Testing

- Deploy the backend over HTTPS.
- Set `EXPO_PUBLIC_API_URL` in `eas.json` preview profile to the beta API URL.
- Set production backend environment variables from `server/.env.example`.
- Confirm `ALLOW_MOCK_ANALYSIS=false` for real beta users unless the build is clearly marked as a demo.
- Host public privacy policy and support contact pages.
- Test at least 20 real bills across TELUS, Virgin Plus, Rogers, Bell, Fido, Koodo, and Freedom where available.
- Validate failed states: unsupported carrier, password-protected PDF, poor image, oversized upload, offline API.
- Confirm app icons, splash screen, screenshots, app name, and support email.

## Required Before Public Launch

- Lawyer-reviewed privacy policy and terms.
- Rate limiting and CORS origin allowlist configured.
- Redacted logs and monitoring.
- App Store privacy nutrition labels.
- Google Play Data Safety form.
- Abuse monitoring and cost limits for cloud AI fallback.
