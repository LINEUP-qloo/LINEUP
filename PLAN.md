# Lineup — Build Plan

**One line:** An agent that programs a live event — lineup, sponsors, vendors — around what the headliner's *actual* audience culturally loves, with Qloo's measured reason behind every pick.

**Core mechanic:** Feed headliner(s) + city as `signal.interests.entities`; sweep `filter.type` across `artist → brand → place`, rank by `affinity × (1 − popularity)` to surface *undervalued* bookings, and attach the explainability attribution + demographic read so every suggestion is a measured, defensible, non-obvious bet.

**Killer rule check:** booking/sponsorship matching *is* a taste-graph problem. A bare LLM hallucinates audience overlap; Qloo measures it across 250M entities. Without Qloo there is no product.

---

## Verified Qloo contract (empirically confirmed — see `verify-qloo.mjs`)

- Host `https://hackathon.api.qloo.com`, auth header `X-Api-Key`.
- `GET /search?query=<name>` → `results[]` with `entity_id`, `types`, `popularity` (0–1), `tags[]`, `external{spotify,lastfm,…}`.
- `GET /v2/insights` engine, params: `filter.type`, `signal.interests.entities` (comma-sep IDs), `filter.location`, `signal.demographics.age`, `feature.explainability=true`, `take`.
- Per recommended entity: `query.affinity` (0–1 rank score), `popularity` (0–1), `query.explainability.signal.interests.entities[]` = `{entity_id, score}` per-input attribution; aggregate at top-level `query.explainability.…effect_on_top{3,5,10,all}_recs`.
- Entity domains live: `artist, book, brand, destination, movie, person, place, podcast, tv_show, video_game`.
- Demographics **as output**: `filter.type=urn:demographics` → `results.demographics[].query.{age,gender}` signed over/under-index. Output age brackets: `24_and_younger, 25_to_29, 30_to_34, 35_to_44, 45_to_54, 55_and_older`. (NB: input `signal.demographics.age` uses a *different* scheme — `35_and_younger, 36_to_55, 55_and_older`.)
- **Rate limit ~8 burst → 429.** Cap concurrency ≤4, backoff+retry, cache, ship fixtures.

## The three lanes (all real Qloo calls)

1. **Lineup** — `insights filter.type=urn:entity:artist`, headliner IDs as signal, `explainability=true`, `take=10`. Rank by `affinity×(1−popularity)` → flag high-affinity/low-popularity as "hidden gem." Show which headliner(s) drove each pick.
2. **Activations** — `insights filter.type=urn:entity:brand` (sponsors) + `insights filter.type=urn:entity:place` w/ `filter.location=<city>` (venues/vendors). Rank by affinity. (Shortcut: artist `properties.associated_brands` for a quick sponsor hint.)
3. **Audience read** — `insights filter.type=urn:demographics` → diverging bar of age/gender over-index.

**Per-request budget:** ≤3 `/search` (cached by name) + 4 `/v2/insights` ≈ 7 calls. Run the 4 insights at concurrency ≤4; cache full responses by normalized-input hash; serve committed fixtures for the 2 demo scenarios so the live demo never hits a 429.

---

## Stack & file layout

Next.js (App Router) on Vercel — one deploy target, key stays server-side, instant public URL (satisfies the hard "externally hosted" rule). Tailwind + shadcn/ui. LLM narration via one server route (Claude default), deferred to Day 4. LLM only *narrates/structures* — Qloo does the thinking.

```
app/
  page.tsx                # input (headliners + city) + results, client state
  api/lineup/route.ts     # engine: resolve → 4 insights → assemble → JSON
lib/
  qloo.ts                 # server-only client: search(), insights(); holds X-Api-Key
  lineup.ts               # gem ranking (affinity×(1−pop)) + lane assembly + types
  cache.ts                # in-memory Map keyed by input hash + 429 backoff
fixtures/<scenario>.json  # 2 pre-cached demo scenarios (fallback + offline demo)
LICENSE                   # MIT — hard requirement, set in repo About
README.md                 # run instructions — hard requirement
.env.local                # QLOO_API_KEY (+ ANTHROPIC_API_KEY later), gitignored
verify-qloo.mjs           # keep — the day-zero probe
```
Narration (`lib/narrate.ts`) added Day 4, not before. No auth, no DB, no chat UI, no multi-event saving.

## 7-day sequence (today Oct 23 → deadline ~Oct 30 — CONFIRM deadline)

- **Day 1 (today):** scaffold Next.js; deploy hello-world to Vercel (**kill the DQ risk first**); commit MIT LICENSE + README, set license in About; build `lib/qloo.ts`; `/api/lineup` returns the real **Lineup lane** for one hardcoded scenario; confirm 2 demo scenarios return great artist results.
- **Day 2:** full engine — all 3 lanes + gem ranking + explainability extraction + caching + fixtures + 429 backoff. API returns a complete structured result.
- **Day 3:** result UI — input form + 3 sections + live **"Qloo call trace"** panel (scores Tech Implementation). Wire to API, redeploy.
- **Day 4:** LLM narration — "programming brief" + per-pick *why* using multi-headliner attribution.
- **Day 5:** design polish (frontend-design skill), responsive, loading/empty/error states, nail the lean-in demo moment.
- **Day 6:** harden — rehearse 2 demo scenarios, deterministic fixture fallback, finalize README run-instructions, re-confirm license in About.
- **Day 7:** buffer + Devpost writeup (lead: "worthless without Qloo — here's the measured audience read an LLM can't produce"); confirm live URL + public repo; submit.

## Demo weapon
Judge enters 2–3 headliners → each support-act pick shows its **% attribution per headliner** (from `query.explainability`). "This booking is 60% driven by Headliner A, 40% by B" — visible proof it's impossible without Qloo. End the demo there.

## Open decisions (needed to start Day 1)
1. Vercel account? (deploy target)
2. LLM for narration — Claude (default) or Groq? Key needed by Day 4.
3. GitHub: create public repo now (MIT). `gh` not authed yet — authenticate or set up manually?
4. Pick the 2 demo scenarios (headliner + city).
