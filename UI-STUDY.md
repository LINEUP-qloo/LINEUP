# LINEUP — UI study

Steps 1–2 of the UI revamp: an audit of what ships today, then the references that inform the new
direction. Nothing here changes behaviour; it is the evidence for `DESIGN-DIRECTION.md`.

Screenshots referenced below live outside the repo in `../ui-work/shots/` (`before/` = today's UI,
`ref/` = reference sites), captured with Playwright at 390×844, 1440×900 and 360px.

---

## 1. Audit (as of 2026-10-30)

### Map

One route (`/`) renders everything from `app/lineup-app.tsx` (1,032 lines, one client component).
Motion lives in `app/motion.tsx`; styling is Tailwind v4 + a 9-colour `@theme` block in `globals.css`.

| Area | States today | Actions |
|---|---|---|
| Hero | WebGL point sphere + canvas colour blobs + vignette + "LINEUP" | theme toggle |
| Input console | empty / filled chips | add/remove headliners, add/remove cities, 2 popularity sliders, **Program the bill**, 4 presets |
| Marquee band | — | — |
| Results header | "Now programming …", unresolved names | — |
| Programmer's brief | loading (blinking text), text, hidden on failure | — |
| 00 The Bill (poster) | empty hint, filled tiers, clash scanning / clashes / no clashes | ▲▼✕ per act, scan clashes, copy sheet, print/PDF |
| 01 Undercard | 12 ranked rows, empty-band message | + add / ✓ on bill |
| 02 Sponsor fit | 8 tilt cards | draft pitch (hover-only on desktop) |
| 03 Local partners / Tour routing | list, or one column per city | — |
| 04 Audience | age + gender diverging bars | — |
| Qloo trace | per-call timings | — |
| Pitch modal | loading, email text, unavailable | copy email, close |
| Global | loading list, error line, empty hint | print stylesheet |

### What's wrong

**Breaks / bugs visible in the UI**
- **Act names truncate to 1–4 characters on phone** — "1…", "SOU…", "_BY…" (`before-phone-undercard.png`). The core output is unreadable on mobile.
- **Sponsor pitch is unreachable with motion on**: the sticky stacking sections cover the sponsor cards, so the hover-only "draft pitch" can't be clicked (`before-desktop-pitch.png` shows no dialog; with reduced motion it opens).
- Sticky stacked sections render as **blank screens** between sections in full-page captures and fade content to 25% while you read it.
- Error appears **below the fold under the marquee** as a raw developer string ("QLOO_API_KEY not set (add it to .env)").
- Discovery sliders re-query on `pointerup` only → keyboard changes never apply.

**Performance**
- three.js ships in the **initial bundle** of the only page: one 706 KB chunk (190 KB gz).
- Two continuous animation loops in the hero (WebGL sphere + 2D canvas with `blur(70px)`), never paused off-screen; plus Lenis, a custom cursor and a magnetic button on the working tool.

**Hierarchy & legibility**
- The point cloud sits on top of the headline and intro on phone, and over the eyebrow and theme toggle on desktop.
- Most labels are 9–11px uppercase mono with wide tracking. Hint text at `ash/50–60` measures **2.2–2.6:1** (fails AA) in dark, 2.3:1 in light.
- The primary button renders at 30% opacity until something is typed — first impression is "broken".
- Accent soup: lime + amber + red + 5 headliner hues + a purple→lime sphere gradient. Lime is *also* headliner #1's series colour, so "accent" and "data" collide.
- Every score is a bare 0–1 decimal. Real data clusters tightly (undercard affinity 0.90–0.92 for all 12 picks), so the big lime number carries no information.
- Single-headliner bills show a 100% attribution bar on every row — noise.

**States**
- Loading is a pulsing list of API call names, not a preview of the layout; content jumps when results land.
- Brief failure and clash-scan failure are silent; pitch failure tells a booker to "Set GROQ_API_KEY".
- Empty state ("Scroll back up …") is a dead end below the form.

**Interaction & a11y**
- Chip inputs: `outline: none`, no programmatic label (`<label>` isn't associated), focus invisible.
- Bill ▲▼✕ controls are ~11px glyphs at 40% opacity — far below 44px targets; no labels beyond "move up a tier".
- Pitch modal: no `role="dialog"`, no focus trap, no Escape, background scrolls.
- Custom cursor hides the system cursor; the magnetic button moves while you aim.

**Copy**
- Internals leak into the UI: `insights(artist, pop-band)`, "affinity 0.83", "pop 0.42", "over-index", "Discovery band · floor 0.20", "Qloo trace … live calls".

**Worth keeping**
- The bill poster as the object you build. The per-headliner attribution bar (the most distinctive, most Qloo-only thing on screen). Presets. The print stylesheet. `next/font`. The idea of showing the trace as proof — reframed for humans.

---

## 2. Category references

Research notes: G2/Capterra block direct loads, so some quotes come from search-engine extracts
(marked *extract*). Visual specs I couldn't measure are marked **UNVERIFIED**. No usable Reddit
threads were found for these products.

### Chartmetric — artist analytics
- **Does well:** every number has a word. The 0–100 Artist Score sits next to a Rank, a *Career Stage* (Developing → Legendary) and a *Momentum* label, so non-analysts read the word. Brand affinity is a multiplier against a stated baseline ("10% of followers in London vs 5% average → 2× affinity"). Help docs say what a metric *can't* tell you. [hmc.chartmetric.com/what-is-chartmetric-score-career-stage-brand-affinity](https://hmc.chartmetric.com/what-is-chartmetric-score-career-stage-brand-affinity/)
- **Complaints:** "a bit overwhelming at first", layout "busy", interface "can feel cluttered" (G2, *extract*, [g2.com/products/chartmetric/reviews](https://www.g2.com/products/chartmetric/reviews)); new users need "significant time investment to understand which metrics are most relevant" ([saasworthy](https://www.saasworthy.com/product/chartmetric/reviews), *extract*).

### Soundcharts / Viberate — market intelligence
- **Does well:** one dashboard across streaming/social/radio; filtered CSV export praised (Capterra, *extract*, [capterra.com/p/183758/Soundcharts/reviews](https://www.capterra.com/p/183758/Soundcharts/reviews/)).
- **Complaints:** 10-artist benchmark cap "will explode the cost" (Capterra, *extract*). Viberate (Trustpilot 3.8 / 107 reviews): "The website can be confusing at times", small-act coverage gaps — "more than 40% was not on Viberate" ([trustpilot.com/review/www.viberate.com](https://www.trustpilot.com/review/www.viberate.com)). **Lesson:** under-the-radar acts are where data is thinnest — say so when signal is sparse.

### Prism.fm — talent buying
- **Does well:** speaks the booker's nouns — offers, holds, settlements, confirmations ([prism.fm/why-choose-prism](https://prism.fm/why-choose-prism/)). Visual specs UNVERIFIED.
- **Complaints:** almost no independent reviews ([G2 shows 0](https://www.g2.com/sellers/prism-fm)). A competitor claims it "lacks mobile access" ([gigwell.com/blog/gigwell-vs-prism](https://www.gigwell.com/blog/gigwell-vs-prism) — biased source). **Lesson:** phone is a gap in this category.

### Resident Advisor — event & lineup pages
- **Does well:** type-led editorial lineup pages; RA Guide app rated 4.9 / 8.2K, praised as simple and clean ([App Store](https://apps.apple.com/us/app/ra-guide/id981952703)).
- **Complaints:** app "totally resets, removes my seatch [sic] results" after switching apps; home is "only based on your location" (App Store). Site redesign: "annoying number of clicks", "Redesign is awful" ([Drowned in Sound forum](https://community.drownedinsound.com/t/whys-the-resident-advisor-site-redesign-so-rubbish/56260), date UNVERIFIED).

### Clashfinder — festival clash grid
- **Does well:** single-purpose stage × time grid; highlight acts in your colour; "always display stages with highlighted acts"; print layout adapts to stage count; **mobile becomes a list**, not a squeezed grid ([clashfinder.com](https://clashfinder.com/), [Glastonbury PDF](https://www.glastonburyfestivals.co.uk/download-the-clashfinder-pdf)).
- **Complaints:** only forum threads on data accuracy; contents UNVERIFIED.

### Adjacent craft
- **Linear** — Inter Display + Inter; themes moved to LCH so equal lightness reads equal across hues; 3 theme variables (base, accent, contrast) instead of 98; restrained accent; goal "reduce visual noise" ([linear.app/now/how-we-redesigned-the-linear-ui](https://linear.app/now/how-we-redesigned-the-linear-ui)). Criticised in 2026 for dimming sidebar text too far (third-party critique).
- **Stripe** — perceptual (CIELAB) colour scale with the same lightness curve per hue; "five levels apart = AA small text" ([stripe.com/blog/accessible-color-systems](https://stripe.com/blog/accessible-color-systems)). Complaints: "sometimes confusing dashboard" ([Product Hunt](https://www.producthunt.com/products/stripe/reviews)); May 2024 nav reshuffle broke habits ([support.stripe.com](https://support.stripe.com/questions/dashboard-update-may-2024)).

### Patterns worth stealing (for LINEUP)
1. **Score + word.** Replace bare `0.90` with a band word ("Strong fit") and a short meter; exact value on hover/tap.
2. **Over-index as a multiplier vs a named baseline** on a diverging axis centred on "average".
3. **One stacked attribution bar per pick**, each headliner a fixed series colour used everywhere (chips, poster, bars). Hide it when there's only one headliner.
4. **"What this can't tell you"** micro-notes (e.g. "Taste fit is global — it doesn't change by city").
5. **Low-signal flag** instead of a confident number when data is thin.
6. **Desktop table → phone cards**, never truncate the name; collapsible sections on phone.
7. **Clashes shown in place** on the poster (the two names get a marker), not just in a list below.
8. **The trade's nouns**: headliner, direct support, support, openers, bill, hold, partner.
9. **Perceptual colour + measured contrast** for both themes.
10. **Keep the last search** (headliners, cities, band) across reloads.
11. **Export is first-class** — one visible place, not tucked into a section header.
12. **Neutral chrome, colour only for data and the one accent.**

### Deliberately NOT copying
- Chartmetric's metric sprawl — show 3–4 facts per item, disclose the rest.
- Unexplained composite scores — every number gets a word and a "how it's measured" line.
- Location-only defaults (RA) — bookers plan for cities they aren't in.
- Deep click paths (RA redesign) — attribution, add-to-bill and pitch are one tap from any pick.
- Dimming secondary text below AA for "calm" (Linear critique).
- Desktop-only workflows (Prism) — phone must at least read, pin, scan and share.

---

## 3. Required references

### Lusion — lusion.co (studied in Playwright, 1440 & 390, `ref/lusion-*.png`)
Seen: a black loader with a large counter bottom-left; then a pale lavender-white base
(`rgb(240,241,250)`), black type, and one electric blue (`rgb(0,22,236)`) — the computed palette on the
page is **7 colours total**. The hero is WebGL crosses framed as a rounded card *inside* the page with
"+" crosshair marks on a grid around it; type is a single family (Aeonik); pill buttons with a dot
("LET'S TALK •", "MENU ••"). On phone the 3D window fills almost the whole first screen with no text.

- **Borrow:** colour as a system (one accent, everything else neutral); 3D/hero visual *framed as an object*, never wallpaper behind text; mono micro-labels used sparingly; one continuous motion thread; tiered assets (cheap path on mobile/reduced motion).
- **Leave out:** the look itself (crosses, lavender, Aeonik, reel); a blocking loader (our users came to work); sound; a 1 MB+ bundle; a phone first screen with no words on it.

### React Bits — reactbits.dev (site + `llms.txt`, `ref/reactbits-*.png`, `ref/rb-*.png`)
Licence confirmed: MIT + Commons Clause — fine to use in the product, not to resell the components.
All 33 candidates checked exist in `llms.txt` (registry names `<Name>-TS-TW`). Notably, most
backgrounds are now raw WebGL with no ogl/three dependency; **GlideSelect has no reduced-motion handling**.

| Candidate | Deps | Reduced motion | Fit for LINEUP |
|---|---|---|---|
| **SplitFlapText** | none | yes (+ sr-only text) | **Signature**: headliners clack onto the bill like a venue board |
| **Counter** | none | yes, tabular figures | numbers that change (bill count, clash count) |
| CountUp | motion | yes | one-off landing stats only |
| AnimatedList | @hugeicons | yes | possible for the ranked list — likely overkill vs our own rows |
| StatusMark | motion | yes | clash-scan running → done/failed |
| SwipeToast | motion, @hugeicons | yes | "Copied", "Added to bill" confirmations |
| TearTicket | motion | yes | considered for adding an act — rejected: competes with the signature |
| WebGL backgrounds (Silk, Grainient, DarkVeil…) | none | yes | at most one, landing only — and probably none |

### React Bits Pro Agent Kit — public docs only (nothing bought or installed)
A design skill is structured as: core idea → page architecture → type scale → colour/spacing (exact
values) → grid/nav/hero → sections → motion → imagery → buttons → **anti-patterns** → responsive →
accessibility → performance → implementation notes → **self-verification loop**. Prompts are separate:
"the prompt decides what the page says, the skill decides how it looks."

Ideas applied: *Corporate Trust* — "real proof placed high", "dense but organised information",
"motion so minimal it never looks like a consumer app trying too hard", and a check that **every
repeated figure agrees** (our bill, sheet, brief and pitch all quote the same numbers). *Terminal Dark*
— "monospace used only where it means something", "hairline borders instead of shadows", four text
tiers, and its own changelog raising tertiary text because it failed AA. *Apple Minimal* — one idea
per section, a type scale that jumps 3–4 steps with no timid mid-sizes, 8-pt grid. *Fintech* —
"Trust is not a section. It is the whole design brief." For LINEUP, trust = showing *why* each pick
is there (attribution, measured fit, the live-call proof) right where the decision is made.
Detailed rule text is licence-gated and was not read.

### NullMotion — github.com/blixvip/NullMotion (code read, not run)
MIT. Ads are split at scene cuts into 3–8 sections; each section has 1–2 **beats** (`[kind, text,
options]`), each beat gets one entrance (~0.3–0.6 s, `power3.out`) then holds or drifts, and drafts are
deliberately black-and-white so the idea is tested before polish. Applied below as the beat sheet for
the landing page and the results reveal.

**Draft beat sheet (to finalise after direction approval)**

| # | Section | One job | Beat (what moves) | Duration | Reduced motion |
|---|---|---|---|---|---|
| 1 | Hero | Say what LINEUP decides | Headline settles; input is ready | 0.6 s | static |
| 2 | Proof | Picks are measured, not guessed | One real pick's attribution bar fills | 0.6 s | static bar |
| 3 | Build | You program a bill | **Signature:** names flip onto the board | 1.2 s | names appear |
| 4 | CTA | One action | none | — | — |

---

## 4. Inputs for the direction

- Separate the **landing** (one hero moment allowed) from the **tool** (calm, fast, no WebGL/Lenis/cursor).
- One accent, kept out of data. Headliner series colours are data, validated for contrast in both themes.
- Signature moment: the bill as a **split-flap board** — it's the product's own object, it's music-venue native, and it costs zero dependencies.
- Scores get words; over-index gets a baseline; jargon gets a plain-language map.
