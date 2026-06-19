/**
 * Where the BillClear backend proxy lives.
 *
 * The Expo app NEVER talks to the Claude API directly. It only ever calls
 * this backend, which holds the Anthropic API key server-side. See /server
 * and the project README for how to run the backend.
 *
 * Set EXPO_PUBLIC_API_URL in a .env file at the project root to point the
 * app at your backend. On a physical phone (Expo Go), "localhost" means the
 * phone itself, not your computer. Use your computer's LAN IP instead,
 * e.g. http://192.168.1.42:4000
 */
const FALLBACK_API_URL = "http://localhost:4000";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? FALLBACK_API_URL).replace(/\/+$/, "");
