"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Clash, LineupResult } from "@/lib/lineup";
import { Button } from "./ui/button";
import { ChipInput } from "./ui/field";
import { Banner, Card, EmptyState } from "./ui/surface";
import { SiteHeader } from "./ui/site-header";
import SwipeToast from "./ui/rb/swipe-toast";
import { LoadingResults, PitchDialog, Results, TIERS } from "./results";
import { PRESETS } from "./presets";

const SERIES = ["var(--series-0)", "var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

// Raw API errors are for developers; bookers get what happened + what to do.
function plainError(raw: string): { title: string; body: string } {
  if (/QLOO_API_KEY|401|403/i.test(raw))
    return { title: "LINEUP can't reach the taste graph right now.", body: "This is on our side, not yours. Try again in a minute." };
  if (/429|rate/i.test(raw))
    return { title: "The taste graph is busy.", body: "Too many lookups at once. Wait a few seconds and try again." };
  return { title: "We couldn't build this bill.", body: "The taste graph didn't answer. Check your connection and try again." };
}

type Toast = { title: string; description?: string; undo?: () => void } | null;

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
  const [clashFailed, setClashFailed] = useState(false);
  const [pitchFor, setPitchFor] = useState<string | null>(null);
  const [pitchText, setPitchText] = useState<string | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [needHeadliner, setNeedHeadliner] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [toastKey, setToastKey] = useState(0);
  const headlinerInput = useRef<HTMLInputElement>(null);
  const resultsTop = useRef<HTMLDivElement>(null);

  const notify = (t: NonNullable<Toast>) => {
    setToast(t);
    setToastKey((k) => k + 1);
  };

  const toggleBill = (id: string) => {
    setClashes([]); // membership changed → prior scan is stale
    setClashScanned(false);
    setClashFailed(false);
    setBill((b) => {
      if (id in b) {
        const { [id]: _drop, ...rest } = b;
        return rest;
      }
      return { ...b, [id]: 1 }; // default new adds to the middle tier
    });
  };
  const moveTier = (id: string, dir: -1 | 1) =>
    setBill((b) => (id in b ? { ...b, [id]: Math.max(0, Math.min(TIERS.length - 1, b[id] + dir)) } : b));

  // add/remove from the support-act list, with a confirmation the user can undo
  const toggleFromList = (id: string) => {
    const name = result?.lineup.find((p) => p.id === id)?.name ?? "Act";
    const adding = !(id in bill);
    toggleBill(id);
    notify({
      title: adding ? `${name} added to the bill` : `${name} removed from the bill`,
      description: adding ? `Placed under ${TIERS[1]}. Move it up or down on the board.` : undefined,
      undo: () => toggleBill(id),
    });
  };

  const hueFor = useMemo(() => {
    const m = new Map<string, string>();
    result?.headliners.forEach((h, i) => m.set(h.name, SERIES[i % SERIES.length]));
    return (n: string) => m.get(n) ?? "var(--text-3)";
  }, [result]);

  const addHeadliner = (raw: string) => {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (v && !headliners.includes(v)) setHeadliners([...headliners, v]);
    if (v) setNeedHeadliner(false);
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
      submit();
    } else if (e.key === "Backspace" && !cityDraft && cities.length) {
      setCities(cities.slice(0, -1));
    }
  };

  // the primary action is never a dead button: with nothing entered it says what's missing
  const submit = () => {
    const pending = draft.trim().replace(/,+$/, "").trim();
    const hs = pending && !headliners.includes(pending) ? [...headliners, pending] : headliners;
    if (pending) addHeadliner(pending);
    if (!hs.length) {
      setNeedHeadliner(true);
      headlinerInput.current?.focus();
      return;
    }
    program(hs);
  };

  async function program(hs = headliners, cs = cities) {
    if (!hs.length) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    setBill({});
    setClashes([]);
    setClashScanned(false);
    setClashFailed(false);
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
      requestAnimationFrame(() => resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
      requestAnimationFrame(() => resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
    setClashFailed(false);
    try {
      const res = await fetch("/api/clash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      const j = await res.json();
      if (j.error) throw new Error(j.error); // the route answers 200 with an error field
      setClashes(j.clashes ?? []);
      setClashScanned(true);
    } catch {
      setClashes([]);
      setClashFailed(true);
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

  const runPreset = (names: string[], cs: string[]) => {
    setHeadliners(names);
    setCities(cs);
    setNeedHeadliner(false);
    program(names, cs);
  };
  // landing-page presets arrive as /app?h=…&city=…
  const runFromUrl = useCallback((names: string[], cs: string[]) => runPreset(names, cs), []); // eslint-disable-line react-hooks/exhaustive-deps

  // the band re-runs on release (pointer) or on key-up (arrow keys), same as before for pointer users
  const commitBand = () => result && program();

  return (
    <>
      <Suspense fallback={null}>
        <UrlPreset onPreset={runFromUrl} />
      </Suspense>

      <SiteHeader />

      <main className="shell pb-24">
        {/* ——— input ——— */}
        <section aria-labelledby="build-title" className="no-print pt-8 md:pt-12">
          <p className="eyebrow">Build a bill</p>
          <h1 id="build-title" className="mt-2 max-w-3xl text-h1 font-semibold text-text">
            Who&apos;s headlining?
          </h1>
          <p className="mt-3 max-w-2xl text-body text-text-2">
            Add your confirmed headliners and where you&apos;re playing. You&apos;ll get support acts this crowd will love, the
            sponsors and local partners it already likes, and who it is.
          </p>

          <Card className="mt-6 p-4 md:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="grid gap-5 md:grid-cols-12">
                <div className="md:col-span-7">
                  <ChipInput
                    label="Headliners"
                    hint="Press Enter after each name."
                    error={needHeadliner ? "Add at least one headliner to program a bill." : undefined}
                    chips={headliners}
                    seriesChips
                    onRemove={(h) => setHeadliners(headliners.filter((x) => x !== h))}
                    inputProps={{
                      ref: headlinerInput,
                      value: draft,
                      onChange: (e) => setDraft(e.target.value),
                      onKeyDown: onDraftKey,
                      onBlur: () => draft.trim() && addHeadliner(draft),
                      placeholder: headliners.length ? "Add another headliner" : "e.g. Tyler, the Creator",
                    }}
                  />
                </div>
                <div className="md:col-span-5">
                  <ChipInput
                    label="Cities"
                    hint="One city, or several for a tour."
                    chips={cities}
                    onRemove={(c) => setCities(cities.filter((x) => x !== c))}
                    inputProps={{
                      value: cityDraft,
                      onChange: (e) => setCityDraft(e.target.value),
                      onKeyDown: onCityKey,
                      onBlur: () => cityDraft.trim() && addCity(cityDraft),
                      placeholder: cities.length ? "Add a stop" : "e.g. Los Angeles",
                    }}
                  />
                </div>
              </div>

              <fieldset className="mt-6 border-t border-line pt-5">
                <legend className="sr-only">How well known should support acts be?</legend>
                <div className="grid items-end gap-x-8 gap-y-4 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-small font-medium text-text" aria-hidden>
                        How well known
                      </p>
                      <p className="font-mono text-small text-text-2">
                        {minPop.toFixed(2)} – {maxPop.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-4">
                      <label className="flex flex-col">
                        <input
                          type="range"
                          className="range w-full"
                          min={0}
                          max={95}
                          step={5}
                          value={Math.round(minPop * 100)}
                          aria-label="Least known allowed"
                          aria-valuetext={minPop.toFixed(2)}
                          onChange={(e) => setMinPop(Math.min(Number(e.target.value) / 100, maxPop - 0.05))}
                          onPointerUp={commitBand}
                          onKeyUp={(e) => e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" ? commitBand() : undefined}
                        />
                        <span className="text-micro text-text-2">Lesser-known</span>
                      </label>
                      <label className="flex flex-col">
                        <input
                          type="range"
                          className="range w-full"
                          min={5}
                          max={100}
                          step={5}
                          value={Math.round(maxPop * 100)}
                          aria-label="Most known allowed"
                          aria-valuetext={maxPop.toFixed(2)}
                          onChange={(e) => setMaxPop(Math.max(Number(e.target.value) / 100, minPop + 0.05))}
                          onPointerUp={commitBand}
                          onKeyUp={(e) => e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" ? commitBand() : undefined}
                        />
                        <span className="text-right text-micro text-text-2">Bigger names</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex md:col-span-5 md:justify-end">
                    <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full md:w-auto">
                      {loading ? "Programming…" : "Program the bill"}
                      {!loading && <ArrowRight aria-hidden className="size-5" />}
                    </Button>
                  </div>
                </div>
              </fieldset>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="mr-1 text-small text-text-2">Try a real bill:</span>
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="ghost" disabled={loading} onClick={() => runPreset(p.names, p.cities)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </Card>
        </section>

        {/* ——— results ——— */}
        <div ref={resultsTop} className="scroll-mt-4" />
        <div aria-live="polite" className="sr-only">
          {loading ? "Programming the bill. Running live taste-graph lookups." : result ? `Bill ready for ${result.headliners.map((h) => h.name).join(", ")}.` : ""}
        </div>

        {error && (
          <Banner
            tone="error"
            className="mt-8"
            title={plainError(error).title}
            action={
              <Button variant="ghost" size="sm" onClick={() => program()}>
                Try again
              </Button>
            }
          >
            {plainError(error).body}
            <details className="mt-2">
              <summary className="cursor-pointer text-micro text-text-2">Technical details</summary>
              <code className="mt-1 block font-mono text-micro break-words text-text-2">{error}</code>
            </details>
          </Banner>
        )}

        {loading && !result && <LoadingResults />}

        {result && (
          <Results
            result={result}
            hueFor={hueFor}
            loading={loading}
            brief={brief}
            briefLoading={briefLoading}
            bill={bill}
            toggleBill={toggleBill}
            toggleFromList={toggleFromList}
            moveTier={moveTier}
            clashes={clashes}
            clashLoading={clashLoading}
            clashScanned={clashScanned}
            clashFailed={clashFailed}
            scanClashes={scanClashes}
            onPitch={openPitch}
            onCopied={() => notify({ title: "Bill sheet copied", description: "Paste it into an email or doc." })}
          />
        )}

        {!result && !loading && !error && (
          <div className="no-print mt-10">
            <EmptyState
              icon={<CheckCircle2 aria-hidden className="size-6" />}
              title="Your bill will appear here"
              action={
                <Button variant="ghost" size="sm" onClick={() => runPreset(PRESETS[0].names, PRESETS[0].cities)}>
                  See an example: {PRESETS[0].label}
                </Button>
              }
            >
              Add a headliner and press <span className="text-text">Program the bill</span>. Every pick comes from live
              taste-graph lookups, with the reason it&apos;s there.
            </EmptyState>
          </div>
        )}
      </main>

      <PitchDialog
        sponsor={pitchFor}
        text={pitchText}
        loading={pitchLoading}
        onClose={() => setPitchFor(null)}
        onRetry={() => pitchFor && openPitch(pitchFor)}
      />

      {toast && (
        <SwipeToast
          key={toastKey}
          open
          title={toast.title}
          description={toast.description}
          actionLabel={toast.undo ? "Undo" : undefined}
          onAction={toast.undo}
          onClose={() => setToast(null)}
          duration={4000}
          radius={16}
          width={380}
          className="no-print"
        />
      )}
    </>
  );
}

/** Reads ?h= / ?city= once (landing-page presets) and runs that bill. Isolated so the page still prerenders. */
function UrlPreset({ onPreset }: { onPreset: (h: string[], c: string[]) => void }) {
  const sp = useSearchParams();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const h = sp.getAll("h").map((s) => s.trim()).filter(Boolean);
    if (h.length) onPreset(h, sp.getAll("city").map((s) => s.trim()).filter(Boolean));
  }, [sp, onPreset]);
  return null;
}
