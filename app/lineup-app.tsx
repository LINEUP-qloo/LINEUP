"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { Clash, LineupResult, Pick, Place, Sponsor } from "@/lib/lineup";
import { Cursor, HeroCanvas, HeroObject, HeroText, Magnetic, Reveal, SmoothScroll, StackSection, Tilt, refreshScroll } from "./motion";

const HUES = ["var(--hue-0)", "var(--hue-1)", "var(--hue-2)", "var(--hue-3)", "var(--hue-4)"]; // theme-driven, defined in globals.css
const MARQUEE = ["Program the bill", "By taste, not guesswork", "The undercard", "Sponsor fit", "Local partners", "Audience read"];
const PRESETS = [
  { label: "Tyler · Phoebe · Fred", names: ["Tyler, the Creator", "Phoebe Bridgers", "Fred again.."], cities: ["Los Angeles"] },
  { label: "Tyler, the Creator", names: ["Tyler, the Creator"], cities: ["Atlanta"] },
  { label: "Phoebe Bridgers", names: ["Phoebe Bridgers"], cities: ["Nashville"] },
  { label: "Fred · 3-city run", names: ["Fred again.."], cities: ["Los Angeles", "New York City", "Chicago"] },
];
const PENDING_STEPS = [
  "Resolve headliners · /search",
  "Support acts · insights(artist, pop-band)",
  "Sponsor fit · insights(brand)",
  "Local partners · insights(place)",
  "Audience read · insights(demographics)",
];
const AGE_LABEL: Record<string, string> = {
  "24_and_younger": "≤24",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};
// Bill tiers, in billing order below the headliners. Index 0 = highest on the poster.
const TIERS = ["Main Support", "Undercard", "Openers"];
const TIER_SIZE = ["text-2xl md:text-3xl", "text-lg md:text-xl", "text-sm md:text-base"];

const firstName = (n: string) => n.split(/[ ,]/)[0];
const pct = (n: number) => `${Math.round(n * 100)}%`;

// Plain-text bill sheet — the thing a booker pastes into an email to an agent/partner.
function buildSheet(r: LineupResult, bill: Record<string, number>, brief: string | null): string {
  const L: string[] = [];
  L.push(`LINEUP${r.city ? ` · ${r.city}` : ""}`);
  L.push(`Headliners: ${r.headliners.map((h) => h.name).join(" · ")}`);
  L.push("", "THE BILL");
  TIERS.forEach((tier, ti) => {
    const acts = r.lineup.filter((p) => bill[p.id] === ti).map((p) => p.name);
    if (acts.length) L.push(`  ${tier}: ${acts.join(", ")}`);
  });
  if (!Object.keys(bill).length) L.push("  (no support acts added yet)");
  if (brief) L.push("", "PROGRAMMER'S BRIEF", `  ${brief}`);
  if (r.sponsors.length)
    L.push("", "SPONSOR FIT", `  ${r.sponsors.slice(0, 6).map((s) => `${s.name} (${s.affinity.toFixed(2)})`).join(", ")}`);
  if (r.tour.length > 1) {
    r.tour.forEach((stop) => {
      L.push("", `LOCAL PARTNERS · ${stop.city}`);
      stop.places.slice(0, 6).forEach((p) => L.push(`  ${p.name}${p.address ? ` · ${p.address}` : ""}`));
    });
  } else if (r.places.length) {
    L.push("", `LOCAL PARTNERS${r.city ? ` · ${r.city}` : ""}`);
    r.places.slice(0, 6).forEach((p) => L.push(`  ${p.name}${p.address ? ` · ${p.address}` : ""}`));
  }
  if (r.audience) {
    const a = r.audience;
    L.push("", "AUDIENCE (over / under-index vs baseline)");
    L.push(`  age: ${a.age.map((x) => `${AGE_LABEL[x.bracket] ?? x.bracket} ${x.score >= 0 ? "+" : ""}${x.score.toFixed(2)}`).join(", ")}`);
    L.push(`  gender: male ${a.gender.male >= 0 ? "+" : ""}${a.gender.male.toFixed(2)}, female ${a.gender.female >= 0 ? "+" : ""}${a.gender.female.toFixed(2)}`);
  }
  L.push("", "Programmed with LINEUP · powered by the Qloo taste graph");
  return L.join("\n");
}

function ExportBar({ result, bill, brief }: { result: LineupResult; bill: Record<string, number>; brief: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildSheet(result, bill, brief));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — print still works */
    }
  };
  const btn = "border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ash transition-colors hover:border-volt hover:text-volt";
  return (
    <div className="no-print flex shrink-0 items-center gap-2">
      <button onClick={copy} className={btn}>{copied ? "✓ copied" : "⧉ copy sheet"}</button>
      <button onClick={() => window.print()} className={btn}>⎙ print / pdf</button>
    </div>
  );
}

export default function LineupApp() {
  const [headliners, setHeadliners] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [cityDraft, setCityDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LineupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [bill, setBill] = useState<Record<string, number>>({}); // pickId → tier index
  const [minPop, setMinPop] = useState(0.2);
  const [maxPop, setMaxPop] = useState(0.8);
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [clashLoading, setClashLoading] = useState(false);
  const [clashScanned, setClashScanned] = useState(false);
  const [pitchFor, setPitchFor] = useState<string | null>(null);
  const [pitchText, setPitchText] = useState<string | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // content height jumps when results/brief/clashes stream in — keep Lenis's
  // scroll limit in sync or wheel scrolling clamps to the old (shorter) page.
  useEffect(() => {
    const r = requestAnimationFrame(() => refreshScroll());
    return () => cancelAnimationFrame(r);
  }, [result, brief, loading, clashes, bill]);

  const toggleBill = (id: string) => {
    setClashes([]); // membership changed → prior scan is stale
    setClashScanned(false);
    setBill((b) => {
      if (id in b) {
        const { [id]: _drop, ...rest } = b;
        return rest;
      }
      return { ...b, [id]: 1 }; // default new adds to Undercard
    });
  };
  const moveTier = (id: string, dir: -1 | 1) =>
    setBill((b) => (id in b ? { ...b, [id]: Math.max(0, Math.min(TIERS.length - 1, b[id] + dir)) } : b));

  const hueFor = useMemo(() => {
    const m = new Map<string, string>();
    result?.headliners.forEach((h, i) => m.set(h.name, HUES[i % HUES.length]));
    return (n: string) => m.get(n) ?? "var(--color-ash)";
  }, [result]);

  const addHeadliner = (raw: string) => {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (v && !headliners.includes(v)) setHeadliners([...headliners, v]);
    setDraft("");
  };
  const onDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      addHeadliner(draft);
    } else if (e.key === "Backspace" && !draft && headliners.length) {
      setHeadliners(headliners.slice(0, -1));
    }
  };

  const addCity = (raw: string) => {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (v && !cities.includes(v)) setCities([...cities, v]);
    setCityDraft("");
  };
  const onCityKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && cityDraft.trim()) {
      e.preventDefault();
      addCity(cityDraft);
    } else if (e.key === "Enter") {
      program();
    } else if (e.key === "Backspace" && !cityDraft && cities.length) {
      setCities(cities.slice(0, -1));
    }
  };

  async function program(hs = headliners, cs = cities) {
    if (!hs.length) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    setBill({});
    setClashes([]);
    setClashScanned(false);
    try {
      const params = new URLSearchParams();
      hs.forEach((h) => params.append("h", h));
      cs.forEach((c) => c.trim() && params.append("city", c.trim()));
      params.set("minPop", minPop.toFixed(2));
      params.set("maxPop", maxPop.toFixed(2));
      const res = await fetch(`/api/lineup?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data as LineupResult);
      fetchBrief(data as LineupResult);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBrief(r: LineupResult) {
    setBriefLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
      const j = await res.json();
      setBrief(j.brief ?? null);
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  }

  async function scanClashes() {
    const ids = Object.keys(bill);
    if (ids.length < 2) return;
    setClashLoading(true);
    try {
      const res = await fetch("/api/clash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      const j = await res.json();
      setClashes(j.clashes ?? []);
      setClashScanned(true);
    } catch {
      setClashes([]);
    } finally {
      setClashLoading(false);
    }
  }

  async function openPitch(sponsor: string) {
    if (!result) return;
    setPitchFor(sponsor);
    setPitchText(null);
    setPitchLoading(true);
    try {
      const res = await fetch("/api/pitch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result, sponsor }) });
      const j = await res.json();
      setPitchText(j.pitch ?? null);
    } catch {
      setPitchText(null);
    } finally {
      setPitchLoading(false);
    }
  }

  const runPreset = (p: (typeof PRESETS)[number]) => {
    setHeadliners(p.names);
    setCities(p.cities);
    program(p.names, p.cities);
  };

  return (
    <>
      <SmoothScroll />
      <Cursor />

      {/* fixed top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="font-display text-sm font-black uppercase tracking-tight text-bone mix-blend-difference">
          LINE<span className="text-volt">UP</span>
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="flex items-center gap-2 border border-line bg-ink/40 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ash backdrop-blur transition-colors hover:border-bone hover:text-bone"
            data-cursor
          >
            <span className="h-2 w-2 rounded-full border border-current" style={{ background: theme === "dark" ? "transparent" : "currentColor" }} />
            {theme === "dark" ? "dark" : "light"}
          </button>
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ash md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-volt anim-pulse" />
            powered by Qloo taste graph
          </div>
        </div>
      </div>

      {/* cinematic hero */}
      <section className="no-print relative flex min-h-screen flex-col overflow-hidden px-5 md:px-8">
        <HeroCanvas theme={theme} />
        <HeroObject theme={theme} />
        <div className="vignette" />
        <HeroText className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end pb-6 pt-28">
          <p className="hero-in font-mono text-[11px] uppercase tracking-[0.3em] text-ash">
            Taste-driven live-event programming
          </p>
          <h1 className="hero-title text-bone" aria-label="LINEUP">
            {"LINE".split("").map((c, i) => (
              <span key={i} className="hero-char" style={{ animationDelay: `${0.05 + i * 0.07}s` }} aria-hidden>
                {c}
              </span>
            ))}
            {"UP".split("").map((c, i) => (
              <span key={i} className="hero-char text-volt" style={{ animationDelay: `${0.05 + (4 + i) * 0.07}s` }} aria-hidden>
                {c}
              </span>
            ))}
          </h1>
          <p className="hero-in mt-4 max-w-xl text-lg leading-snug text-ash md:text-xl">
            Give it your headliners and a city. Qloo&apos;s taste graph returns the support acts,
            sponsors, and local partners your actual audience over-indexes on, with the reason
            behind every pick.
          </p>
        </HeroText>

        {/* input console — lives in the hero, immediately usable */}
        <section className="no-print relative z-10 mx-auto mb-10 w-full max-w-6xl border border-line bg-ink-2/60 p-4 backdrop-blur md:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-ash">Headliners</label>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-line pb-2">
              {headliners.map((h, i) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-2 rounded-sm px-2 py-1 font-mono text-xs"
                  style={{
                    background: `color-mix(in oklab, ${HUES[i % HUES.length]} 14%, transparent)`,
                    color: HUES[i % HUES.length],
                  }}
                >
                  {h}
                  <button
                    onClick={() => setHeadliners(headliners.filter((x) => x !== h))}
                    className="opacity-60 hover:opacity-100"
                    aria-label={`remove ${h}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onDraftKey}
                onBlur={() => draft.trim() && addHeadliner(draft)}
                placeholder={headliners.length ? "add another…" : "e.g. Tyler, the Creator  ↵"}
                className="min-w-[14ch] flex-1 bg-transparent py-1 text-sm text-bone outline-none placeholder:text-ash/60"
              />
            </div>
          </div>
          <div className="md:w-72">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ash">
              Cities <span className="text-ash/50">· one stop, or a tour route</span>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-line pb-2">
              {cities.map((c) => (
                <span key={c} className="inline-flex items-center gap-2 rounded-sm bg-bone/10 px-2 py-1 font-mono text-xs text-bone">
                  {c}
                  <button onClick={() => setCities(cities.filter((x) => x !== c))} className="opacity-60 hover:opacity-100" aria-label={`remove ${c}`}>
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                onKeyDown={onCityKey}
                onBlur={() => cityDraft.trim() && addCity(cityDraft)}
                placeholder={cities.length ? "add a stop…" : "Los Angeles  ↵"}
                className="min-w-[10ch] flex-1 bg-transparent py-1 text-sm text-bone outline-none placeholder:text-ash/60"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Discovery band</span>
          <label className="flex items-center gap-2 font-mono text-[10px] text-ash">
            floor
            <input
              type="range" min={0} max={95} step={5} value={Math.round(minPop * 100)}
              onChange={(e) => setMinPop(Math.min(Number(e.target.value) / 100, maxPop - 0.05))}
              onPointerUp={() => result && program()}
              className="w-24 accent-volt"
            />
            <span className="w-8 text-volt">{minPop.toFixed(2)}</span>
          </label>
          <label className="flex items-center gap-2 font-mono text-[10px] text-ash">
            ceiling
            <input
              type="range" min={5} max={100} step={5} value={Math.round(maxPop * 100)}
              onChange={(e) => setMaxPop(Math.max(Number(e.target.value) / 100, minPop + 0.05))}
              onPointerUp={() => result && program()}
              className="w-24 accent-volt"
            />
            <span className="w-8 text-volt">{maxPop.toFixed(2)}</span>
          </label>
          <span className="font-mono text-[9px] text-ash/60">lower = deeper cuts · higher = bigger names</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Magnetic>
            <button
              onClick={() => program()}
              disabled={!headliners.length || loading}
              data-cursor
              className="bg-volt px-5 py-2.5 font-display text-base font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {loading ? "Programming…" : "Program the bill →"}
            </button>
          </Magnetic>
          <span className="mx-1 font-mono text-[10px] uppercase tracking-widest text-ash">or try</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => runPreset(p)}
              disabled={loading}
              className="border border-line px-2.5 py-1.5 font-mono text-[11px] text-ash transition-colors hover:border-volt hover:text-volt disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>
        </section>

        <div className="no-print scroll-cue pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-ash">
          scroll ↓
        </div>
      </section>

      {/* kinetic marquee band */}
      <div className="marquee-mask no-print overflow-hidden border-y border-line py-4">
        <div className="marquee-track font-display text-4xl font-black uppercase leading-none md:text-6xl">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {MARQUEE.map((w, i) => (
                <span key={i} className="flex items-center">
                  <span className={i % 2 ? "marquee-word" : "text-bone"}>{w}</span>
                  <span className="mx-6 text-volt md:mx-10">✳</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* results */}
      <div className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
      {error && (
        <p className="mt-5 border border-ember/40 bg-ember/5 px-4 py-3 font-mono text-sm text-ember">⚠ {error}</p>
      )}

      {loading && !result && <LoadingTrace />}

      {result && (
        <Results
          result={result}
          hueFor={hueFor}
          loading={loading}
          brief={brief}
          briefLoading={briefLoading}
          bill={bill}
          toggleBill={toggleBill}
          moveTier={moveTier}
          clashes={clashes}
          clashLoading={clashLoading}
          clashScanned={clashScanned}
          scanClashes={scanClashes}
          onPitch={openPitch}
        />
      )}

      {pitchFor && <PitchModal sponsor={pitchFor} text={pitchText} loading={pitchLoading} onClose={() => setPitchFor(null)} />}

      {!result && !loading && !error && (
        <p className="mt-16 text-center font-mono text-sm text-ash">
          Scroll back up, enter your headliners, and hit <span className="text-volt">Program the bill</span>.
        </p>
      )}
      </div>
    </>
  );
}

/* ——————————————————————————— results ——————————————————————————— */

function Results({
  result,
  hueFor,
  loading,
  brief,
  briefLoading,
  bill,
  toggleBill,
  moveTier,
  clashes,
  clashLoading,
  clashScanned,
  scanClashes,
  onPitch,
}: {
  result: LineupResult;
  hueFor: (n: string) => string;
  loading: boolean;
  brief: string | null;
  briefLoading: boolean;
  bill: Record<string, number>;
  toggleBill: (id: string) => void;
  moveTier: (id: string, dir: -1 | 1) => void;
  clashes: Clash[];
  clashLoading: boolean;
  clashScanned: boolean;
  scanClashes: () => void;
  onPitch: (sponsor: string) => void;
}) {
  const { lineup, sponsors, places, audience, headliners, unresolved, trace, city } = result;
  return (
    <div className={loading ? "pointer-events-none opacity-50" : ""}>
      {/* centered intro: billing + brief + bill */}
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="no-print mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Now programming</span>
          {headliners.map((h, i) => (
            <span key={h.id} className="font-display text-2xl font-black tracking-tight" style={{ color: HUES[i % HUES.length] }}>
              {h.name}
            </span>
          ))}
          {city && <span className="font-mono text-xs text-ash">· {city}</span>}
        </div>
        {unresolved.length > 0 && (
          <p className="mt-1 font-mono text-[11px] text-ember/80">couldn’t resolve: {unresolved.join(", ")}</p>
        )}

        <Reveal>
          <BriefPanel brief={brief} loading={briefLoading} />
        </Reveal>

        <Reveal className="mt-14">
          <BillPoster result={result} bill={bill} moveTier={moveTier} toggleBill={toggleBill} brief={brief} clashes={clashes} clashLoading={clashLoading} clashScanned={clashScanned} scanClashes={scanClashes} />
        </Reveal>
      </div>

      {/* 01–04 stack on top of each other; each pins and the next scrolls up over it */}
      <div className="mt-24">
        {/* 01 — undercard: the base of the stack. Not pinned (it's the long list), so it
            scrolls smoothly and shows every act; 02–04 pin and stack up over it. */}
        <section className="stack-card no-print relative bg-ink">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8">
            <div className="relative">
              <span className="watermark pointer-events-none absolute -right-2 -top-8 z-0 select-none font-display text-[24vw] font-black leading-none">01</span>
              <div className="relative z-10">
                <SectionLabel n="01" title="The Undercard" hint="high taste-fit · bookable · not already famous" />
                <ol className="mt-8 border-t border-line">
                  {lineup.map((p, i) => (
                    <LineupRow key={p.id} p={p} rank={i + 1} hueFor={hueFor} delay={i * 0.03} onBill={p.id in bill} toggleBill={toggleBill} />
                  ))}
                  {!lineup.length && <li className="py-8 font-mono text-sm text-ash">No undercard found in band.</li>}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* 02 — sponsors: offset tile grid */}
        <StackSection>
          <div className="relative">
            <span className="watermark pointer-events-none absolute -left-2 -top-8 z-0 select-none font-display text-[24vw] font-black leading-none">02</span>
            <div className="relative z-10">
              <SectionLabel n="02" title="Sponsor Fit" hint="brands the crowd over-indexes on" />
              <div className="mt-8 grid grid-cols-2 items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
                {sponsors.map((s, i) => (
                  <Tilt key={s.id} max={12} className={i % 2 === 1 ? "md:mt-7" : ""}>
                    <SponsorCard s={s} delay={i * 0.03} onPitch={onPitch} />
                  </Tilt>
                ))}
                {!sponsors.length && <p className="font-mono text-sm text-ash">·</p>}
              </div>
            </div>
          </div>
        </StackSection>

        {/* 03 — partners (quiet column) or tour (stepped route) */}
        <StackSection>
          {result.tour.length > 1 ? (
            <TourPanel tour={result.tour} />
          ) : (
            <section>
              <SectionLabel n="03" title="Local Partners" hint={city ? `spots in ${city}` : "add a city"} />
              <div className="mt-8 max-w-2xl">
                <ol className="border-l border-line">
                  {places.map((p, i) => (
                    <PlaceRow key={p.id} p={p} index={i + 1} delay={i * 0.03} />
                  ))}
                  {!places.length && <li className="py-4 pl-5 font-mono text-sm text-ash">{city ? "·" : "add a city to see partners"}</li>}
                </ol>
              </div>
            </section>
          )}
        </StackSection>

        {/* 04 — audience: centered, data-forward */}
        {audience && (
          <StackSection>
            <AudiencePanel audience={audience} />
          </StackSection>
        )}
      </div>

      {/* trace: quiet full-width strip */}
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal className="mt-20">
          <TracePanel trace={trace} />
        </Reveal>
      </div>
    </div>
  );
}

function TourPanel({ tour }: { tour: LineupResult["tour"] }) {
  return (
    <section>
      <SectionLabel n="03" title="Tour Routing" hint="local partners per stop · the only lane that varies by city" />
      <div className="mt-8 flex gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {tour.map((stop, si) => (
          <div key={stop.city} className="w-72 shrink-0 border-t-2 border-volt pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">stop {String(si + 1).padStart(2, "0")}</span>
              <span className="font-mono text-[10px] text-ash">{stop.places.length} partners</span>
            </div>
            <div className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-tight text-bone">{stop.city}</div>
            <ol className="mt-4 border-l border-line">
              {stop.places.map((p, i) => (
                <PlaceRow key={p.id} p={p} index={i + 1} delay={i * 0.02} />
              ))}
              {!stop.places.length && <li className="py-3 pl-5 font-mono text-sm text-ash">·</li>}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function BriefPanel({ brief, loading }: { brief: string | null; loading: boolean }) {
  if (!brief && !loading) return null;
  return (
    <div className="anim-rise mt-12 max-w-4xl">
      <div className="font-mono text-[10px] uppercase tracking-widest text-volt">
        Programmer’s Brief <span className="text-ash">· generated from the taste data</span>
      </div>
      {loading && !brief ? (
        <p className="mt-4 font-mono text-base text-ash cursor-blink">drafting the bill</p>
      ) : (
        <p className="mt-4 font-display text-base font-medium leading-[1.5] tracking-tight text-bone md:text-lg">
          <span className="text-volt">“</span>
          {brief}
          <span className="text-volt">”</span>
        </p>
      )}
    </div>
  );
}

function SectionLabel({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div className="section-head group relative">
      <div className="flex items-end gap-4">
        <span className="section-num shrink-0" aria-hidden>
          {n}
        </span>
        <div className="flex-1 pb-1.5">
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight text-bone md:text-3xl">{title}</h2>
          <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-widest text-ash">{hint}</span>
        </div>
      </div>
      <div className="section-rule mt-3 h-px w-full bg-line" />
    </div>
  );
}

function LineupRow({
  p,
  rank,
  hueFor,
  delay,
  onBill,
  toggleBill,
}: {
  p: Pick;
  rank: number;
  hueFor: (n: string) => string;
  delay: number;
  onBill: boolean;
  toggleBill: (id: string) => void;
}) {
  return (
    <li
      className="lineup-row anim-rise grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-line py-5 md:grid-cols-[4.5rem_1fr_minmax(13rem,20rem)_auto] md:gap-6"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="rank-num text-4xl md:text-6xl">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="truncate font-display text-2xl font-black uppercase leading-none tracking-tight text-bone md:text-4xl">
            {p.name}
          </span>
          {p.isHiddenGem && (
            <span className="shrink-0 rounded-sm bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
              ◆ gem
            </span>
          )}
        </div>
        {p.genres.length > 0 && (
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ash">{p.genres.join(" · ")}</div>
        )}
        <div className="mt-3 max-w-sm md:hidden">
          <AttributionBar drivenBy={p.drivenBy} hueFor={hueFor} />
        </div>
      </div>
      <div className="hidden md:block">
        <AttributionBar drivenBy={p.drivenBy} hueFor={hueFor} />
      </div>
      <div className="flex items-center justify-end gap-4">
        <div className="text-right">
          <div className="font-mono text-lg text-volt md:text-xl">{p.affinity.toFixed(2)}</div>
          <div className="font-mono text-[10px] text-ash">pop {p.popularity.toFixed(2)}</div>
        </div>
        <button
          onClick={() => toggleBill(p.id)}
          data-cursor
          className={
            onBill
              ? "shrink-0 border border-volt bg-volt/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-volt"
              : "shrink-0 border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ash transition-colors hover:border-volt hover:text-volt"
          }
        >
          {onBill ? "✓ on bill" : "+ add"}
        </button>
      </div>
    </li>
  );
}

function BillPoster({
  result,
  bill,
  moveTier,
  toggleBill,
  brief,
  clashes,
  clashLoading,
  clashScanned,
  scanClashes,
}: {
  result: LineupResult;
  bill: Record<string, number>;
  moveTier: (id: string, dir: -1 | 1) => void;
  toggleBill: (id: string) => void;
  brief: string | null;
  clashes: Clash[];
  clashLoading: boolean;
  clashScanned: boolean;
  scanClashes: () => void;
}) {
  const count = Object.keys(bill).length;
  const byTier = TIERS.map((_, ti) => result.lineup.filter((p) => bill[p.id] === ti));
  const nameOf = (id: string) => result.lineup.find((p) => p.id === id)?.name ?? id;
  return (
    <section className="mt-6 border border-line bg-ink-2/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionLabel n="00" title="The Bill" hint={count ? `${count} act${count > 1 ? "s" : ""} added · the bill you’re programming` : "add acts from the undercard below"} />
        <div className="no-print flex shrink-0 items-center gap-2">
          {count >= 2 && (
            <button
              onClick={scanClashes}
              disabled={clashLoading}
              className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ash transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
              title="Check for acts that pull the same crowd"
            >
              {clashLoading ? "scanning…" : "⚠ scan clashes"}
            </button>
          )}
          <ExportBar result={result} bill={bill} brief={brief} />
        </div>
      </div>
      <div className="mt-5 space-y-4 text-center">
        <div className="flex flex-wrap items-baseline justify-center gap-x-6 gap-y-1">
          {result.headliners.map((h, i) => (
            <span key={h.id} className="font-display text-3xl font-black uppercase tracking-tight md:text-5xl" style={{ color: HUES[i % HUES.length] }}>
              {h.name}
            </span>
          ))}
        </div>
        {TIERS.map((tier, ti) =>
          byTier[ti].length ? (
            <div key={tier}>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-ash">{tier}</div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                {byTier[ti].map((p) => (
                  <span key={p.id} className={`group inline-flex items-center gap-1.5 font-display font-bold text-bone ${TIER_SIZE[ti]}`}>
                    {p.name}
                    <span className="no-print inline-flex items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
                      <button onClick={() => moveTier(p.id, -1)} disabled={ti === 0} className="font-mono text-[11px] text-ash hover:text-volt disabled:opacity-20" aria-label="move up a tier">▲</button>
                      <button onClick={() => moveTier(p.id, 1)} disabled={ti === TIERS.length - 1} className="font-mono text-[11px] text-ash hover:text-volt disabled:opacity-20" aria-label="move down a tier">▼</button>
                      <button onClick={() => toggleBill(p.id)} className="font-mono text-[11px] text-ash hover:text-ember" aria-label="remove from bill">✕</button>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
      {(clashScanned || clashLoading) && (
        <div className="no-print mt-5 border-t border-line pt-3">
          {clashes.length ? (
            <>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ember">
                ⚠ {clashes.length} clash{clashes.length > 1 ? "es" : ""} · acts pulling the same crowd · a wasted slot
              </div>
              <ul className="mt-2 space-y-1 font-mono text-[11px]">
                {clashes.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-2">
                    <span className="text-bone">{nameOf(c.a)} ↔ {nameOf(c.b)}</span>
                    <span className="text-ash">overlap {c.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            !clashLoading && <div className="font-mono text-[11px] text-volt">✓ no clashes · every act covers a distinct slice of the crowd</div>
          )}
        </div>
      )}
      {!count && (
        <p className="no-print mt-4 text-center font-mono text-sm text-ash">
          Hit <span className="text-volt">+ add</span> on undercard picks to build your bill, then promote them with ▲▼.
        </p>
      )}
    </section>
  );
}

function AttributionBar({ drivenBy, hueFor }: { drivenBy: { name: string; score: number }[]; hueFor: (n: string) => string }) {
  const total = drivenBy.reduce((s, d) => s + d.score, 0) || 1;
  if (!drivenBy.length) return null;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink">
        {drivenBy.map((d, i) => (
          <div
            key={i}
            className="bar-fill h-full"
            style={{ width: pct(d.score / total), background: hueFor(d.name), animationDelay: `${0.15 + i * 0.08}s` }}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-ash">
        {drivenBy.map((d, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5" style={{ background: hueFor(d.name) }} />
            {firstName(d.name)} {pct(d.score / total)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SponsorCard({ s, delay, onPitch }: { s: Sponsor; delay: number; onPitch: (sponsor: string) => void }) {
  return (
    <div
      className="anim-rise group relative flex min-h-[8.5rem] flex-col justify-between border border-line bg-ink-2/60 p-4 transition-colors hover:border-volt"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="font-mono text-[10px] text-ash transition-colors group-hover:text-volt">{s.affinity.toFixed(2)} affinity</span>
      <span className="mt-6 font-display text-xl font-black uppercase leading-none tracking-tight text-bone md:text-2xl">{s.name}</span>
      <button
        onClick={() => onPitch(s.name)}
        data-cursor
        className="no-print mt-3 self-start border-b border-transparent font-mono text-[10px] uppercase tracking-wider text-ash transition-colors hover:border-volt hover:text-volt md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
        title={`Draft a sponsorship pitch to ${s.name}`}
      >
        draft pitch →
      </button>
    </div>
  );
}

function PitchModal({ sponsor, text, loading, onClose }: { sponsor: string; text: string | null; loading: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl border border-line bg-ink-2 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-volt">Sponsorship Pitch · grounded in the taste data</div>
            <div className="font-display text-xl font-bold text-bone">{sponsor}</div>
          </div>
          <button onClick={onClose} className="font-mono text-base text-ash hover:text-bone" aria-label="close">✕</button>
        </div>
        {loading ? (
          <p className="mt-4 font-mono text-sm text-ash cursor-blink">drafting the pitch from the taste data</p>
        ) : text ? (
          <>
            <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap font-body text-[15px] leading-relaxed text-bone">{text}</pre>
            <div className="mt-4 flex justify-end">
              <button onClick={copy} className="border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ash transition-colors hover:border-volt hover:text-volt">
                {copied ? "✓ copied" : "⧉ copy email"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 font-mono text-sm text-ash">Pitch unavailable. Set GROQ_API_KEY to enable grounded drafting.</p>
        )}
      </div>
    </div>
  );
}

function PlaceRow({ p, delay, index }: { p: Place; delay: number; index?: number }) {
  return (
    <li className="anim-rise flex items-start justify-between gap-3 py-3.5 pl-5" style={{ animationDelay: `${delay}s` }}>
      <div className="flex min-w-0 gap-3">
        {index !== undefined && (
          <span className="shrink-0 font-mono text-[10px] text-ash/60">{String(index).padStart(2, "0")}</span>
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold text-bone">{p.name}</div>
          {p.address && <div className="truncate font-mono text-[10px] text-ash">{p.address}</div>}
          {p.goodFor.length > 0 && (
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ash/70">{p.goodFor.join(" · ")}</div>
          )}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs text-volt">{p.affinity.toFixed(2)}</span>
    </li>
  );
}

function AudiencePanel({ audience }: { audience: NonNullable<LineupResult["audience"]> }) {
  return (
    <div className="anim-rise">
      <SectionLabel n="04" title="Audience" hint="who this bill pulls · over / under-index vs baseline" />
      <div className="mx-auto mt-10 grid max-w-3xl gap-x-12 gap-y-10 md:grid-cols-2">
        <div>
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-ash">Age</div>
          <div className="space-y-4">
            {audience.age.map((a) => (
              <DivergingBar key={a.bracket} label={AGE_LABEL[a.bracket] ?? a.bracket} score={a.score} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-ash">Gender</div>
          <div className="space-y-4">
            <DivergingBar label="male" score={audience.gender.male} />
            <DivergingBar label="female" score={audience.gender.female} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DivergingBar({ label, score }: { label: string; score: number }) {
  const w = Math.min(Math.abs(score), 1) * 50;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-right font-mono text-xs text-ash">{label}</span>
      <div className="relative h-4 flex-1 bg-ink">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <div
          className="bar-fill absolute inset-y-0"
          style={
            score >= 0
              ? { left: "50%", width: `${w}%`, background: "var(--color-volt)" }
              : { right: "50%", width: `${w}%`, background: "var(--color-ash)" }
          }
        />
      </div>
      <span className="w-12 shrink-0 font-mono text-sm tabular-nums" style={{ color: score >= 0 ? "var(--color-volt)" : "var(--color-ash)" }}>
        {score >= 0 ? "+" : ""}
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function TracePanel({ trace }: { trace: LineupResult["trace"] }) {
  const totalMs = trace.reduce((s, t) => s + t.ms, 0);
  return (
    <div className="no-print anim-rise border-t border-line pt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px]">
        <span className="uppercase tracking-widest text-ash/60">Qloo trace</span>
        {trace.map((t, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-volt">✓</span>
            <span className="text-bone">{t.label}</span>
            <span className="text-ash/60">
              {t.count}× · {t.ms}ms
            </span>
            {i < trace.length - 1 && <span className="text-line">/</span>}
          </span>
        ))}
        <span className="ml-auto text-volt">{totalMs}ms total · live calls</span>
      </div>
    </div>
  );
}

function LoadingTrace() {
  return (
    <div className="mt-8 border border-line bg-ink-2/60 p-5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-volt anim-pulse" />
        <span className="font-display text-lg font-bold uppercase tracking-wide text-bone cursor-blink">Querying the taste graph</span>
      </div>
      <ul className="mt-4 space-y-2 font-mono text-[11px] text-ash">
        {PENDING_STEPS.map((s, i) => (
          <li key={i} className="flex items-center gap-2 anim-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
            <span className="text-volt/60">▸</span> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
