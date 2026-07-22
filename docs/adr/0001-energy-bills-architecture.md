# ADR-0001: Adding energy bills (electricity/natural gas) to BillClear

**Status:** Proposed
**Date:** 2026-06-20
**Deciders:** Product/eng owner (you)

## Context

BillClear today is a Canadian **telecom-only** bill scanner: local parsers for TELUS and Virgin Plus, a system
prompt and rights note written around the CRTC Wireless Code and the CCTS complaint process, a Pro paywall
(`isPro` in `App.tsx`) gating multi-bill comparison/trend, cloud AI fallback, dispute letter drafting, and PDF
export, and a privacy-first backend (`server/`) that tries local parsing before any cloud AI call.

Research this session showed real, well-documented pain in **energy bills** specifically: Statistics Canada
found 15% of Canadian households cut back on necessities like food or medicine in the past year to pay an
energy bill, and 14% kept their home at an unsafe/uncomfortable temperature because heating/cooling was
unaffordable. Energy bill confusion is significant enough that a dedicated Energy Ombudsman and provincial
bodies (e.g. the Ontario Energy Board) publish consumer bill-literacy material. That makes energy the natural
second vertical for BillClear — but unlike telecom, **energy is regulated per province**, not by one national
body: Ontario Energy Board, Alberta Utilities Commission, BC Utilities Commission, Hydro-Québec's Régie de
l'énergie, and others each have their own rules and complaint paths.

The question this ADR answers: should energy-bill support be a **new, separate project**, or should it be
**added to the existing BillClear codebase**?

## Decision

**Extend BillClear in place**, behind a new `billCategory` abstraction, built additively so the existing,
already-validated telecom flow is not touched. Do not fork a separate app/repo for this.

## Options Considered

### Option A: Entirely separate project (new repo, new Expo app, new backend)

| Dimension | Assessment |
|---|---|
| Complexity to start | Low — clean slate, zero risk to telecom code |
| Complexity overall | High — duplicates Expo scaffold, Express backend, rate limiting, paywall, multi-bill trend, PDF export, legal text |
| Cost | Two backends to host, two paywalls to eventually wire to real billing, two store listings if shipped |
| Monetization | Fragmented — a user with both a phone bill and an energy bill pays for two separate subscriptions for two narrower products |

**Pros:** no regression risk to the validated telecom MVP; free to experiment with branding/positioning; simplest possible starting scaffold.
**Cons:** duplicates infrastructure that already works (Pro gating, multi-bill "Total due over time" trend, dispute letter drafting, the `reportHtml.ts` PDF export pipeline) — none of that logic is telecom-specific, so rebuilding it is pure waste; weakens the value prop the research surfaced, where users praise apps that show "a complete picture" across bills, not a narrower single-category tool; two apps for the user to install instead of one.

### Option B: Extend BillClear with a category abstraction

| Dimension | Assessment |
|---|---|
| Complexity | Medium — requires generalizing `Carrier`/parser dispatch, branching the system prompt and rights note by category (and province, for energy) |
| Cost | Reuses everything already built and tested: Express backend, rate limiting, `isPro` paywall, multi-bill comparison, dispute letters, PDF export |
| Monetization | Unified — one Pro subscription gets more valuable as it covers more of a household's bills, with zero new UI work for the features that are already category-agnostic |

**Pros:** `BillAnalysis`/`BillCharge`/`BillFinding` (`src/types.ts`) are already generic — they carry no telecom-specific fields, so energy-bill results slot into the same UI, same PDF report template, same paywall with no schema changes; only the *parsers* (`server/providers/localAnalyzer.js`) and the *prompt content* (`server/analyzeBillPrompt.js`, the dispute letter's CCTS reference) are telecom-specific today.
**Cons:** risk of telecom assumptions leaking into shared code if the category abstraction isn't introduced deliberately (e.g. `Carrier` as a type name, CRTC/CCTS hardcoded into the rights note); provincial branching for energy is real, ongoing content-authoring work that telecom's single national framework didn't require.

## Trade-off Analysis

The expensive, already-solved parts of BillClear — the paywall, the multi-bill trend view, dispute letter
drafting, the PDF export pipeline, the privacy-first local-parser-first backend flow — are not telecom-specific
in their *logic*. Only two things are telecom-specific today: the regex parsers that read a TELUS/Virgin Plus
bill, and the prompt/rights-note copy that references CRTC/CCTS. Forking a new project (Option A) throws away
everything that isn't telecom-specific just to avoid touching the small part that is. Option B's real risk —
hardcoded telecom assumptions in shared code — is avoidable by introducing the category abstraction *before*
writing the first energy parser, not after.

## Consequences

- **Easier:** the Pro subscription's value proposition strengthens for free — "compare unlimited previous
  bills," the trend view, and PDF export all work for energy bills the moment a parser and prompt exist, with
  no UI changes.
- **Harder:** rights-note and dispute-letter content must branch by category and, for energy, by province —
  more content to author and keep current as provincial rules change. Test coverage needs real (redacted)
  sample bills per province/utility, the same way TELUS/Virgin Plus samples were sourced.
- **Will need to revisit:** whether `Carrier` (`src/types.ts`) should become a category-agnostic shape, e.g.
  `provider: string` plus `category: "telecom" | "energy"` — a type change that touches `App.tsx`,
  `localAnalyzer.js`, `claudeAnalyzer.js`, `analyzeBillPrompt.js`, and `reportHtml.ts`.

## Action Items

1. [ ] Add `category: "telecom" | "energy"` to `BillAnalysis` (default to `"telecom"` for back-compat with existing TELUS/Virgin Plus results).
2. [ ] Refactor `parseKnownBill` in `server/providers/localAnalyzer.js` from an if/else chain into a small parser registry (`{ test, parse, category }[]`) so adding a parser never requires touching dispatch logic.
3. [ ] Branch `SYSTEM_PROMPT` in `server/analyzeBillPrompt.js` and the rights-note guidance by category; for energy, further by province.
4. [ ] **Research before coding**, per candidate province: regulator name + consumer complaint path (Ontario Energy Board, Alberta Utilities Commission, BC Utilities Commission, Hydro-Québec's Régie de l'énergie, etc.), typical bill structure (note Ontario specifically has both regulated utility-direct and competitive-retailer billing, which adds real structural variation), and the confusing line items that regulator's own consumer-help pages already call out.
5. [ ] Prototype against **one province first** — Ontario is the natural starting point given its population and the depth of OEB's published consumer bill-literacy material.
6. [ ] Source 2–3 real, redacted electricity or gas bills from that province the same way the TELUS/Virgin Plus samples were sourced, and build the first parser against real layouts rather than guessing.
7. [ ] Ship energy as a second `category` behind the **same** Pro paywall — no new pricing tier — to reinforce "one subscription covers more of your household bills."
