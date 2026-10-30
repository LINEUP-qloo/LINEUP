# LINEUP — Design direction: "Backstage"

Approved 2026-10-30. Re-read this before every screen. If a change breaks a rule here, the change
is wrong, not the rule.

## 1. Core idea

A calm, dark workroom for people who program live music. The data is the hero; the chrome stays
quiet. **One** thing performs: the bill, shown as a split-flap board, flipping names into place.

Trust is the whole brief: every pick shows *why* it's there (which headliner pulled it, how well
known it is, that the numbers are measured live), right where the booker decides.

## 2. Page architecture

| Route | Job | Allowed motion |
|---|---|---|
| `/` landing | Say what LINEUP decides, prove it with one real example, get the user into the tool | the split-flap board (signature) + quiet fades |
| `/app` tool | Enter headliners → read picks → build the bill → export/pitch | micro feedback, the board flipping acts in, nothing else |

`/app` reads `?h=` and `?city=` (repeatable) so landing presets open a ready-to-run bill.

Tool order (never reshuffle): **Input → Bill (board) → Support acts → Sponsors → Local partners → Audience → How we got this.**

## 3. Colour

All values live in `app/tokens.css`. Components never use a raw hex.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0B0B0D` | `#F7F6F2` | page |
| `--surface-1` | `#141417` | `#FFFFFF` | cards, panels |
| `--surface-2` | `#1C1C20` | `#EFEEE8` | inputs, raised rows, board tiles |
| `--line` | white 8% | ink 10% | hairline borders |
| `--line-strong` | white 16% | ink 18% | input borders, dividers that matter |
| `--text` | `#F3F2EE` | `#16161A` | primary (17.5:1) |
| `--text-2` | `#A3A29C` | `#5C5B57` | secondary (≥5.8:1) |
| `--text-3` | `#6E6D69` | `#8A8984` | disabled, large meta only (≥3:1) |
| `--accent` | `#D4FF3A` | `#4D6B00` | primary action, focus ring, selection, the board's flap glint |
| `--on-accent` | `#0B0B0D` | `#FFFFFF` | text on accent |
| `--ok` / `--warn` / `--bad` | `#3FD9A8` / `#F2B33D` / `#FF6B5E` | `#0F7A57` / `#9A5B00` / `#C2342A` | state only, always with icon + word |
| `--series-0…4` | sky, rose, violet, apricot, mint | darker of each | headliner identity in data |

Rules
- **One accent.** Lime means "act here / you are here". It never colours data.
- **Series colours are data.** A headliner keeps one series colour everywhere: chip, board, attribution bar.
- **State colours are state.** Never decoration, never a section tint.
- Gradients: none on text; at most a single, very low-alpha radial wash behind the landing hero.

## 4. Type

- **Geist** (UI, 400/500/600; poster names 800) + **Geist Mono** (numbers, codes, micro-labels).
- `font-variant-numeric: tabular-nums` on every number.
- Minimum size 12px. Micro-labels: mono, 12px, uppercase, +0.06em — sparingly (section eyebrows, table headers).
- Scale (fluid, `clamp()`): display `2.75→5.5rem`, h1 `2→3rem`, h2 `1.5→2rem`, h3 `1.125→1.25rem`, body `1rem`, small `0.875rem`, micro `0.75rem`.
- Jump 3–4 steps between headline and body; no timid in-between sizes.

## 5. Shape & space

- Radius: pill (buttons, chips, segmented controls) · `--r-card: 16px` · `--r-input: 12px` · `--r-tile: 6px` (board flaps).
- 8-pt spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Desktop: 12-col grid, max width 1200px, 24px gutters. Phone: 16px side padding, single column.
- Touch targets ≥ 44px. No horizontal scroll at 360px.
- Elevation: hairline borders first; one soft shadow token for dialogs/toasts only.

## 6. Motion

- One easing family: `--ease-out: cubic-bezier(.2,.7,.2,1)`; `--ease-in-out: cubic-bezier(.6,0,.2,1)`.
- Durations: `--dur-micro: 180ms` (press, hover, toggle) · `--dur-ui: 500ms` (dialogs, rows entering, bars filling) · `--dur-hero: 1200ms` (the board only).
- Motion exists to show state change or give feedback. Nothing loops in the tool.
- `prefers-reduced-motion`: board shows final text instantly, bars appear filled, dialogs fade only.

## 7. Signature moment — the board

- React Bits `SplitFlapText`, restyled with tokens: tiles `--surface-2`, text `--text`, a 1px `--accent` glint on the flipping flap only.
- Where: the landing hero (cycles the real preset bills, stops after one pass, never loops forever) and the bill header in `/app` (headliners flip in on result; an added act flips into its tier).
- One board per screen. Never on body copy, buttons or numbers.
- Always has real text for screen readers (`sr-only`), and the final state is readable without animation.

## 8. Components

Primitives in `app/ui/`: Button (primary / ghost / danger / quiet; sm/md/lg; loading), Field (label, hint, error) + ChipInput, Card, ListRow, Chip/Badge, Banner (info/ok/warn/error), Dialog, Segmented/Range, EmptyState, Skeleton, Toast.
Every interactive primitive has hover, pressed (`scale(.98)`), focus-visible (2px `--accent` ring, 2px offset), disabled and loading states.

React Bits (vendored in `app/ui/rb/`, restyled, reduced-motion verified): `SplitFlapText`, `StatusMark`, `SwipeToast`. `Counter` was shortlisted and dropped: the bill count is one small number and didn't earn 20 KB. Icons: `lucide-react`.

## 9. Copy

Plain, confident, short. Sentence case for UI; uppercase only for mono micro-labels.

| Internal | UI says |
|---|---|
| affinity | Taste fit |
| popularity | How well known |
| hidden gem (`isHiddenGem`) | Deep cut |
| undercard | Support acts |
| over-index / under-index | More / less likely than average |
| discovery band floor / ceiling | How well known: lesser-known ↔ bigger names |
| clash | Same crowd |
| scan clashes | Check for same-crowd acts |
| Qloo trace / insights(...) | How we got this — N live lookups · Xs |
| unresolved | Couldn't find |

Errors say what happened + what to do, never an env var or status code.

## 10. Anti-patterns (each one breaks the style)

1. A second accent colour, or lime used for data.
2. Gradient or outlined/stroked text anywhere in the tool; gradient text on body copy anywhere.
3. WebGL, three.js, GSAP, Lenis or a custom cursor on `/app`.
4. More than one React Bits "effect" visible per screen; any React Bits demo colour/size/speed left unchanged.
5. Anything that loops forever in the tool (marquees, pulsing dots, idle animations).
6. Sticky/pinned sections that cover or fade content the user is reading.
7. Hover-only actions. Every action is visible and reachable by keyboard and touch.
8. Bare 0–1 decimals as the headline of a row. Numbers get a label and a meaning.
9. Truncating an act's name to fit a layout. Wrap it.
10. Text below 12px, or secondary text below AA on its surface.
11. A spinner where a skeleton of the real layout would do.
12. Errors or states that silently disappear.
13. Glass/blur panels, film grain, vignettes, watermark numerals.
14. Invented content: no fake logos, testimonials, stats or stock photos. Only real Qloo output.
15. Repeated figures that disagree (bill, sheet, brief and pitch must quote the same values).

## 11. Landing beat sheet

| # | Section | One job | Beat | Duration | Reduced motion |
|---|---|---|---|---|---|
| 1 | Hero | Say what LINEUP decides + start | Board flips a real preset bill; headline + input ready immediately | board 1.2 s | static board |
| 2 | How it works | Picks are measured, not guessed | three steps, one real attribution bar fills | 0.5 s | static |
| 3 | What you get | The deliverables | bill · sponsors · partners · audience, as quiet cards | fade 0.5 s | none |
| 4 | CTA | One action | none | — | — |

## 12. Self-verification (run per screen)

- [ ] Screenshots at 390×844, 1440×900 and 360px; dark + light; reduced motion.
- [ ] No horizontal scroll at 360px; no truncated act names.
- [ ] Tab through: every control reachable, visible focus ring, dialogs trap focus and close on Esc.
- [ ] All states present: loading (skeleton), empty (next action), error (what + fix), success.
- [ ] No raw hex in components (`grep -nE "#[0-9a-fA-F]{3,8}" app/**/*.tsx`).
- [ ] No `three`/`gsap`/`lenis` in the `/app` bundle.
- [ ] Every anti-pattern above checked.
