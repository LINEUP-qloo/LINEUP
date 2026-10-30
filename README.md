# LINEUP

**Program your bill by taste — not by guesswork.**

Lineup is an agentic tool for anyone who programs a live audience — festival bookers, venue
talent buyers, tour promoters. Give it your confirmed **headliners** and a **city**, and it uses
Qloo's Taste AI to return the things that actually make a bill work:

- **The undercard** — high-affinity support acts your crowd will love but that *aren't already
  famous* (the bookings you'd never guess), each with the Qloo reason behind it.
- **Sponsor fit** — brands that specific audience over-indexes on.
- **Local partners** — venues/spots in that city the crowd resonates with.
- **Audience read** — the age/gender skew the bill actually pulls.
- **A programmer's brief** — a short, grounded recommendation that ties it together.

Then you actually *program* with it:

- **Compose the bill** — pin undercard picks into billing tiers (main support → undercard → openers)
  and watch the poster fill.
- **Clash detection** — scan the bill for two acts that pull the *same* crowd (a wasted slot),
  measured by taste-neighbor overlap.
- **Tour routing** — add multiple cities; the local-partner lane re-runs per stop.
- **Sponsor pitch** — one click drafts a grounded outreach email to a brand, citing the measured
  audience over-index and that brand's own affinity.
- **Export** — copy the bill sheet to your clipboard or print/Save-as-PDF a clean one-pager.
- **Discovery band** — a popularity floor/ceiling that dials how obscure the undercard gets.

> **Why it can't exist without Qloo.** Booking and sponsorship matching *is* a taste-graph
> problem. A bare LLM can only hallucinate a plausible-sounding audience overlap ("fans of
> indie-pop probably like this brand"). Qloo **measures** it across 250M+ real entities and hands
> back an affinity score *and the attribution*. Every recommendation in Lineup is a measured bet
> from the taste graph — remove Qloo and there is no product.

## What makes it Qloo-powered

Lineup leans on four distinct capabilities of the Qloo Insights API, all load-bearing:

| Lane | Qloo call | The idea |
|------|-----------|----------|
| Undercard | `GET /v2/insights` · `filter.type=urn:entity:artist` + `filter.popularity.min/max` | Qloo's top-affinity neighbors of famous headliners are themselves famous (popularity ≈ 1.0) and useless as bookings. The **popularity band** surfaces high-affinity acts in a *bookable* fame range — the actual discovery. |
| Attribution | `feature.explainability=true` | Each pick carries `query.explainability` showing **how much each headliner drove it**. With a multi-act bill you see "this booking is 38% Phoebe / 32% Tyler / 30% Fred" — the proof it's a measured match, not a guess. |
| Sponsors / Partners | `filter.type=urn:entity:brand` and `urn:entity:place` (+ `filter.location`) | Cross-domain affinity — the same audience signal, projected into other domains. |
| Audience | `filter.type=urn:demographics` | Signed over/under-index by age and gender, averaged across the headliners. |
| Clash detection | `GET /v2/insights` · `signal.interests.entities=<act>` per bill act | Two acts "clash" when each is a high-affinity taste-neighbor of the other — they pull the same crowd, so booking both wastes a slot. Verified: same-scene acts ≈0.95, unrelated acts absent. |
| Tour routing | `urn:entity:place` + `filter.location` per city | Local partners re-run per tour stop. (Undercard/sponsors/audience don't — Qloo taste affinity is global, not geographic; verified, so we don't fake per-city bills.) |

Ranking uses Qloo's `query.affinity` and each entity's `popularity`; the undercard is ordered by a
**gem score** = `affinity × (1 − popularity)` to reward on-taste-but-under-the-radar acts.

The LLM (Groq) is used **only** to narrate — the programmer's brief and the sponsor pitch are both
given the Qloo facts and explicitly told never to invent acts, brands, venues, or numbers. All
intelligence comes from the taste graph.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — "Backstage" design system: tokens in `app/tokens.css`, Geist + Geist Mono, dark and light themes (see `DESIGN-DIRECTION.md`)
- **Qloo Taste AI** hackathon API (`https://hackathon.api.qloo.com`) — the engine
- **Groq** (`openai/gpt-oss-120b`) — grounded narration (optional)

## Run it locally

Requires Node 18+ (built-in `fetch`).

```bash
npm install
```

Create a `.env` in the project root:

```bash
QLOO_API_KEY=your_qloo_hackathon_key   # required — get it from the Qloo LLM Hackathon dev guide
GROQ_API_KEY=your_groq_key             # optional — enables the programmer's brief
GROQ_MODEL=openai/gpt-oss-120b         # optional — override the narration model
```

Then:

```bash
npm run dev          # http://localhost:3000
# or
npm run build && npm start
```

Open http://localhost:3000, add a few headliners + a city (or hit a preset), and **Program the bill**.

> **Sanity-check your Qloo key first:** `QLOO_API_KEY=xxx node verify-qloo.mjs` runs a set of
> day-zero probes (search, cross-domain insights, explainability, demographics, rate limit).

## Deploy (Vercel)

```bash
npx vercel link
npx vercel env add QLOO_API_KEY     # Production + Preview
npx vercel env add GROQ_API_KEY     # optional
npx vercel --prod
```

The API key lives server-side only (in Next route handlers) and is never shipped to the client.

## Project structure

```
app/
  page.tsx            # landing page (/)
  app/page.tsx        # the tool (/app); presets open it as /app?h=…&city=…
  lineup-app.tsx      # tool state + input form
  results.tsx         # results: bill board, support acts, sponsors, partners, audience, pitch dialog
  tokens.css          # design tokens (colour, type, shape, space, motion)
  ui/                 # primitives (Button, Field/ChipInput, Card, Banner, Dialog, Skeleton…) + vendored React Bits
  api/lineup/route.ts # the engine endpoint
  api/brief/route.ts  # the Groq narration endpoint
  api/clash/route.ts  # pairwise taste-overlap for bill acts
  api/pitch/route.ts  # grounded sponsor outreach email
lib/
  qloo.ts             # Qloo client (search, insights) — concurrency cap + 429 backoff
  lineup.ts           # resolve headliners → lanes → rank/assemble → trace; clash detection
  narrate.ts          # grounded programmer's brief + sponsor pitch via Groq
verify-qloo.mjs       # day-zero API probe
```

## License

MIT — see [LICENSE](./LICENSE).
