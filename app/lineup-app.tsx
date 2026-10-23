"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { LineupResult, Pick, Place, Sponsor } from "@/lib/lineup";

const HUES = ["#ccff00", "#43e5ff", "#ff4fa3", "#ff8a3d", "#a78bfa"];
const PRESETS = [
  { label: "Tyler · Phoebe · Fred", names: ["Tyler, the Creator", "Phoebe Bridgers", "Fred again.."], city: "Los Angeles" },
  { label: "Tyler, the Creator", names: ["Tyler, the Creator"], city: "Atlanta" },
  { label: "Phoebe Bridgers", names: ["Phoebe Bridgers"], city: "Nashville" },
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

export default function LineupApp() {
  const [headliners, setHeadliners] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LineupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [bill, setBill] = useState<Record<string, number>>({}); // pickId → tier index

  const toggleBill = (id: string) =>
    setBill((b) => {
      if (id in b) {
        const { [id]: _drop, ...rest } = b;
        return rest;
      }
      return { ...b, [id]: 1 }; // default new adds to Undercard
    });
  const moveTier = (id: string, dir: -1 | 1) =>
    setBill((b) => (id in b ? { ...b, [id]: Math.max(0, Math.min(TIERS.length - 1, b[id] + dir)) } : b));

  const hueFor = useMemo(() => {
    const m = new Map<string, string>();
    result?.headliners.forEach((h, i) => m.set(h.name, HUES[i % HUES.length]));
    return (n: string) => m.get(n) ?? "#86867d";
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

  async function program(hs = headliners, c = city) {
    if (!hs.length) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    setBill({});
    try {
      const params = new URLSearchParams();
      hs.forEach((h) => params.append("h", h));
      if (c.trim()) params.set("city", c.trim());
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

  const runPreset = (p: (typeof PRESETS)[number]) => {
    setHeadliners(p.names);
    setCity(p.city);
    program(p.names, p.city);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* masthead */}
      <header className="flex items-end justify-between border-b border-line pb-5">
        <div>
          <h1 className="font-display text-5xl font-black leading-[0.82] tracking-tight text-bone md:text-7xl">
            LINE<span className="text-volt">UP</span>
          </h1>
          <p className="mt-2 max-w-md font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
            Program the bill by taste — not by guesswork
          </p>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ash md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-volt anim-pulse" />
          powered by Qloo taste graph
        </div>
      </header>

      {/* input console */}
      <section className="mt-6 border border-line bg-ink-2/60 p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-ash">Headliners</label>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-line pb-2">
              {headliners.map((h, i) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-2 rounded-sm px-2 py-1 font-mono text-xs"
                  style={{ background: `${HUES[i % HUES.length]}1a`, color: HUES[i % HUES.length] }}
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
          <div className="md:w-56">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ash">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && program()}
              placeholder="Los Angeles"
              className="mt-2 w-full border-b border-line bg-transparent py-1 text-sm text-bone outline-none placeholder:text-ash/60"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => program()}
            disabled={!headliners.length || loading}
            className="bg-volt px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-black transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {loading ? "Programming…" : "Program the bill →"}
          </button>
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
        />
      )}

      {!result && !loading && !error && (
        <p className="mt-16 text-center font-mono text-sm text-ash">
          Enter your headliners and hit <span className="text-volt">Program the bill</span>.
        </p>
      )}
    </div>
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
}: {
  result: LineupResult;
  hueFor: (n: string) => string;
  loading: boolean;
  brief: string | null;
  briefLoading: boolean;
  bill: Record<string, number>;
  toggleBill: (id: string) => void;
  moveTier: (id: string, dir: -1 | 1) => void;
}) {
  const { lineup, sponsors, places, audience, headliners, unresolved, trace, city } = result;
  return (
    <div className={loading ? "pointer-events-none opacity-50" : ""}>
      {/* the bill */}
      <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Billing</span>
        {headliners.map((h, i) => (
          <span key={h.id} className="font-display text-2xl font-bold" style={{ color: HUES[i % HUES.length] }}>
            {h.name}
          </span>
        ))}
        {city && <span className="font-mono text-xs text-ash">· {city}</span>}
      </div>
      {unresolved.length > 0 && (
        <p className="mt-1 font-mono text-[11px] text-ember/80">couldn’t resolve: {unresolved.join(", ")}</p>
      )}

      <BriefPanel brief={brief} loading={briefLoading} />

      <BillPoster result={result} bill={bill} moveTier={moveTier} toggleBill={toggleBill} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* hero: the lineup */}
        <section className="lg:col-span-2">
          <SectionLabel n="01" title="The Undercard" hint="high taste-fit · bookable · not already famous" />
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {lineup.map((p, i) => (
              <LineupRow key={p.id} p={p} rank={i + 1} hueFor={hueFor} delay={i * 0.04} onBill={p.id in bill} toggleBill={toggleBill} />
            ))}
            {!lineup.length && <li className="py-6 font-mono text-sm text-ash">No undercard found in band.</li>}
          </ol>
        </section>

        {/* right rail: audience + trace */}
        <aside className="space-y-6">
          {audience && <AudiencePanel audience={audience} />}
          <TracePanel trace={trace} />
        </aside>
      </div>

      {/* sponsors + places */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <SectionLabel n="02" title="Sponsor Fit" hint="brands the crowd over-indexes on" />
          <div className="mt-3 flex flex-wrap gap-2">
            {sponsors.map((s, i) => (
              <SponsorCard key={s.id} s={s} delay={i * 0.03} />
            ))}
            {!sponsors.length && <p className="font-mono text-sm text-ash">—</p>}
          </div>
        </section>
        <section>
          <SectionLabel n="03" title="Local Partners" hint={city ? `spots in ${city}` : "add a city"} />
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {places.map((p, i) => (
              <PlaceRow key={p.id} p={p} delay={i * 0.03} />
            ))}
            {!places.length && <li className="py-4 font-mono text-sm text-ash">{city ? "—" : "add a city to see partners"}</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

function BriefPanel({ brief, loading }: { brief: string | null; loading: boolean }) {
  if (!brief && !loading) return null;
  return (
    <div className="anim-rise mt-5 border-l-2 border-volt bg-ink-2/60 py-3 pl-4 pr-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-volt">
        Programmer’s Brief <span className="text-ash">· generated from the taste data</span>
      </div>
      {loading && !brief ? (
        <p className="mt-2 font-mono text-sm text-ash cursor-blink">drafting the bill</p>
      ) : (
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-bone">{brief}</p>
      )}
    </div>
  );
}

function SectionLabel({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-xs text-volt">{n}</span>
      <h2 className="font-display text-xl font-bold uppercase tracking-wide text-bone">{title}</h2>
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">{hint}</span>
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
    <li className="anim-rise grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3" style={{ animationDelay: `${delay}s` }}>
      <span className="font-mono text-sm text-ash">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-lg font-bold text-bone">{p.name}</span>
          {p.isHiddenGem && (
            <span className="shrink-0 rounded-sm bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
              ◆ gem
            </span>
          )}
        </div>
        {p.genres.length > 0 && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ash">{p.genres.join(" · ")}</div>
        )}
        <div className="mt-2 max-w-sm">
          <AttributionBar drivenBy={p.drivenBy} hueFor={hueFor} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="text-right">
          <div className="font-mono text-base text-volt">{p.affinity.toFixed(2)}</div>
          <div className="font-mono text-[10px] text-ash">pop {p.popularity.toFixed(2)}</div>
        </div>
        <button
          onClick={() => toggleBill(p.id)}
          className={
            onBill
              ? "border border-volt bg-volt/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt"
              : "border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ash transition-colors hover:border-volt hover:text-volt"
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
}: {
  result: LineupResult;
  bill: Record<string, number>;
  moveTier: (id: string, dir: -1 | 1) => void;
  toggleBill: (id: string) => void;
}) {
  const count = Object.keys(bill).length;
  const byTier = TIERS.map((_, ti) => result.lineup.filter((p) => bill[p.id] === ti));
  return (
    <section className="mt-6 border border-line bg-ink-2/60 p-5">
      <SectionLabel n="00" title="The Bill" hint={count ? `${count} act${count > 1 ? "s" : ""} added · the bill you’re programming` : "add acts from the undercard below"} />
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
                    <span className="inline-flex items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
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
      {!count && (
        <p className="mt-4 text-center font-mono text-sm text-ash">
          Hit <span className="text-volt">+ add</span> on undercard picks to build your bill — then promote them with ▲▼.
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

function SponsorCard({ s, delay }: { s: Sponsor; delay: number }) {
  return (
    <div className="anim-rise flex items-center gap-2 border border-line bg-ink-2/60 px-3 py-2" style={{ animationDelay: `${delay}s` }}>
      <span className="font-display text-sm font-bold text-bone">{s.name}</span>
      <span className="font-mono text-[10px] text-volt">{s.affinity.toFixed(2)}</span>
    </div>
  );
}

function PlaceRow({ p, delay }: { p: Place; delay: number }) {
  return (
    <li className="anim-rise flex items-start justify-between gap-3 py-2.5" style={{ animationDelay: `${delay}s` }}>
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-bold text-bone">{p.name}</div>
        {p.address && <div className="truncate font-mono text-[10px] text-ash">{p.address}</div>}
        {p.goodFor.length > 0 && (
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ash/70">{p.goodFor.join(" · ")}</div>
        )}
      </div>
      <span className="shrink-0 font-mono text-xs text-volt">{p.affinity.toFixed(2)}</span>
    </li>
  );
}

function AudiencePanel({ audience }: { audience: NonNullable<LineupResult["audience"]> }) {
  return (
    <div className="anim-rise border border-line bg-ink-2/60 p-4">
      <SectionLabel n="◷" title="Audience" hint="who this bill pulls" />
      <div className="mt-4 space-y-2">
        {audience.age.map((a) => (
          <DivergingBar key={a.bracket} label={AGE_LABEL[a.bracket] ?? a.bracket} score={a.score} />
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <DivergingBar label="male" score={audience.gender.male} />
        <div className="mt-2">
          <DivergingBar label="female" score={audience.gender.female} />
        </div>
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-ash">over / under-index vs baseline</p>
    </div>
  );
}

function DivergingBar({ label, score }: { label: string; score: number }) {
  const w = Math.min(Math.abs(score), 1) * 50;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-ash">{label}</span>
      <div className="relative h-2.5 flex-1 bg-ink">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <div
          className="absolute inset-y-0"
          style={
            score >= 0
              ? { left: "50%", width: `${w}%`, background: "var(--color-volt)" }
              : { right: "50%", width: `${w}%`, background: "var(--color-ash)" }
          }
        />
      </div>
      <span className="w-9 shrink-0 font-mono text-[10px]" style={{ color: score >= 0 ? "var(--color-volt)" : "var(--color-ash)" }}>
        {score >= 0 ? "+" : ""}
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function TracePanel({ trace }: { trace: LineupResult["trace"] }) {
  const totalMs = trace.reduce((s, t) => s + t.ms, 0);
  return (
    <div className="anim-rise border border-line bg-ink-2/60 p-4">
      <SectionLabel n="⦿" title="Qloo trace" hint={`${totalMs}ms`} />
      <ul className="mt-3 space-y-1.5 font-mono text-[11px]">
        {trace.map((t, i) => (
          <li key={i} className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2 text-ash">
              <span className="text-volt">✓</span>
              <span className="truncate">{t.label}</span>
            </span>
            <span className="shrink-0 text-ash/70">
              {t.count}× · {t.ms}ms
            </span>
          </li>
        ))}
      </ul>
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
