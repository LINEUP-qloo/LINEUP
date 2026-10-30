"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Gem, ListPlus, Mail, Plus, Printer, Users, X } from "lucide-react";
import type { Clash, LineupResult, Pick, Place, Sponsor } from "@/lib/lineup";
import { Button, cx } from "./ui/button";
import { Badge, Banner, Card, EmptyState, ListRow, SectionHead, Skeleton } from "./ui/surface";
import { Board, boardRows } from "./ui/board";
import { Dialog } from "./ui/dialog";
import StatusMark from "./ui/rb/status-mark";

// Bill tiers, in billing order below the headliners. Index 0 = highest on the poster.
export const TIERS = ["Direct support", "Support", "Openers"];

const AGE_LABEL: Record<string, string> = {
  "24_and_younger": "24 and under",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55 and over",
};
// phones show the top of each list first; the rest is one tap away
const PHONE_ACTS = 6;
const PHONE_SPONSORS = 4;
const LOOKUPS = ["Find the headliners", "Support acts", "Sponsor fit", "Local partners", "Audience"];

const firstName = (n: string) => n.split(/[ ,]/)[0];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

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
    L.push("", "AUDIENCE (more / less likely than average)");
    L.push(`  age: ${a.age.map((x) => `${AGE_LABEL[x.bracket] ?? x.bracket} ${signed(x.score)}`).join(", ")}`);
    L.push(`  gender: male ${signed(a.gender.male)}, female ${signed(a.gender.female)}`);
  }
  L.push("", "Programmed with LINEUP · powered by the Qloo taste graph");
  return L.join("\n");
}

type ResultsProps = {
  result: LineupResult;
  hueFor: (n: string) => string;
  loading: boolean;
  brief: string | null;
  briefLoading: boolean;
  bill: Record<string, number>;
  toggleBill: (id: string) => void;
  toggleFromList: (id: string) => void;
  moveTier: (id: string, dir: -1 | 1) => void;
  clashes: Clash[];
  clashLoading: boolean;
  clashScanned: boolean;
  clashFailed: boolean;
  scanClashes: () => void;
  onPitch: (sponsor: string) => void;
  onCopied: () => void;
};

export function Results(props: ResultsProps) {
  const { result, hueFor, loading, brief, briefLoading, bill, toggleFromList, onPitch } = props;
  const { lineup, sponsors, places, audience, headliners, unresolved, trace, city, tour } = result;
  const multi = headliners.length > 1;
  const isTour = tour.length > 1;
  const [allActs, setAllActs] = useState(false);
  const [allSponsors, setAllSponsors] = useState(false);

  if (!headliners.length)
    return (
      <div className="mt-8">
        <EmptyState icon={<Users aria-hidden className="size-6" />} title="We couldn't find those artists">
          Nothing matched {unresolved.length ? <span className="text-text">{unresolved.join(", ")}</span> : "your headliners"} in the
          taste graph. Check the spelling, or use the name as it appears on streaming services.
        </EmptyState>
      </div>
    );

  const sections = [
    ["bill", "Bill"],
    ["support", "Support acts"],
    ["sponsors", "Sponsors"],
    ["partners", isTour ? "Tour" : "Partners"],
    ...(audience ? [["audience", "Audience"]] : []),
  ];

  return (
    <div aria-busy={loading} className={cx("transition-opacity duration-(--dur-ui)", loading && "pointer-events-none opacity-50")}>
      {/* key fact first: who you're programming, and what came back */}
      <header className="mt-12">
        <p className="eyebrow">Now programming{city ? ` · ${isTour ? `${tour.length}-city tour` : city}` : ""}</p>
        <h2 className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-h1 font-semibold">
          {headliners.map((h) => (
            <span key={h.id} className="inline-flex items-center gap-3">
              <span aria-hidden className="size-3 rounded-pill" style={{ background: hueFor(h.name) }} />
              {h.name}
            </span>
          ))}
        </h2>
        <p className="mt-3 text-body text-text-2">
          {lineup.length} support acts · {sponsors.length} sponsors ·{" "}
          {isTour ? `partners in ${tour.length} cities` : city ? `${places.length} partners in ${city}` : "add a city for local partners"}
          {audience ? " · audience read" : ""}
        </p>
        {unresolved.length > 0 && (
          <Banner tone="warn" className="mt-4" title={`Couldn't find ${unresolved.join(", ")}`}>
            The bill below uses the headliners we did find. Check the spelling, or try the name as it appears on streaming services.
          </Banner>
        )}
      </header>

      <nav aria-label="Sections" className="no-print sticky top-0 z-30 -mx-(--gutter) mt-6 border-b border-line bg-bg px-(--gutter)">
        <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex h-11 items-center rounded-pill px-4 text-small whitespace-nowrap text-text-2 transition-colors hover:bg-surface-2 hover:text-text">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-12">
        <BillCard {...props} className="lg:col-span-8" />
        <BriefCard brief={brief} loading={briefLoading} className="lg:col-span-4" />
      </div>

      {/* support acts */}
      <section id="support" aria-labelledby="support-title" className="mt-16 scroll-mt-20">
        <SectionHead
          id="support-title"
          eyebrow="Support acts"
          title="Acts this crowd will love"
          lede={
            multi
              ? "Ranked for strong taste fit and room to grow. The bar shows which headliner's fans pulled each act in."
              : `Ranked for strong taste fit and room to grow, all drawn from ${headliners[0].name}'s audience.`
          }
        />
        {lineup.length ? (
          <>
          <ol className="mt-6 border-t border-line">
            <li aria-hidden className={cx("hidden gap-6 py-3 md:grid", multi ? "md:grid-cols-[2.5rem_minmax(0,1fr)_13rem_9rem_9.5rem]" : "md:grid-cols-[2.5rem_minmax(0,1fr)_9rem_9.5rem]")}>
              <span className="eyebrow">#</span>
              <span className="eyebrow">Act</span>
              {multi && <span className="eyebrow">Pulled in by</span>}
              <span className="eyebrow">How well known</span>
              <span />
            </li>
            {lineup.map((p, i) => (
              <ActRow key={p.id} p={p} rank={i + 1} multi={multi} hueFor={hueFor} onBill={p.id in bill} toggle={toggleFromList} hiddenOnPhone={!allActs && i >= PHONE_ACTS} />
            ))}
          </ol>
          {!allActs && lineup.length > PHONE_ACTS && (
            <Button variant="ghost" className="no-print mt-4 w-full md:hidden" onClick={() => setAllActs(true)}>
              Show all {lineup.length} acts
            </Button>
          )}
          </>
        ) : (
          <div className="mt-6">
            <EmptyState title="No support acts in this range">
              Nothing fits between those &ldquo;how well known&rdquo; limits. Widen the range above and program the bill again.
            </EmptyState>
          </div>
        )}
      </section>

      {/* sponsors + partners */}
      <div className={cx("mt-16 grid gap-16", !isTour && "lg:grid-cols-12 lg:gap-8")}>
        <section id="sponsors" aria-labelledby="sponsors-title" className={cx("scroll-mt-20", !isTour && "lg:col-span-7")}>
          <SectionHead id="sponsors-title" eyebrow="Sponsors" title="Brands this crowd already loves" lede="Each one can become a pitch email, written from these numbers." />
          {sponsors.length ? (
            <>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {sponsors.map((s, i) => (
                <SponsorCard key={s.id} s={s} multi={multi} hueFor={hueFor} onPitch={onPitch} hiddenOnPhone={!allSponsors && i >= PHONE_SPONSORS} />
              ))}
            </ul>
            {!allSponsors && sponsors.length > PHONE_SPONSORS && (
              <Button variant="ghost" className="no-print mt-4 w-full md:hidden" onClick={() => setAllSponsors(true)}>
                Show all {sponsors.length} sponsors
              </Button>
            )}
            </>
          ) : (
            <div className="mt-6">
              <EmptyState title="No sponsor matches">The taste graph didn&apos;t return brands for this audience.</EmptyState>
            </div>
          )}
        </section>

        <section id="partners" aria-labelledby="partners-title" className={cx("scroll-mt-20", !isTour && "lg:col-span-5")}>
          {isTour ? (
            <>
              <SectionHead id="partners-title" eyebrow="Tour" title="Local partners, stop by stop" lede="Taste fit is the same everywhere. Venues and spots change with each city." />
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tour.map((stop, si) => (
                  <Card key={stop.city} className="p-5">
                    <p className="eyebrow">Stop {si + 1}</p>
                    <h3 className="mt-1 text-h3 font-semibold">{stop.city}</h3>
                    <PlaceList places={stop.places} city={stop.city} />
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionHead id="partners-title" eyebrow="Local partners" title={city ? `Spots in ${city}` : "Local partners"} lede="Venues and places this crowd already goes to." />
              <Card className="mt-6 px-5">
                <PlaceList places={places} city={city} />
              </Card>
            </>
          )}
        </section>
      </div>

      {audience && <AudiencePanel audience={audience} />}

      <TraceDetails trace={trace} />
    </div>
  );
}

/* ——— the bill ——— */

function BillCard({ result, bill, moveTier, toggleBill, brief, clashes, clashLoading, clashScanned, clashFailed, scanClashes, onCopied, className }: ResultsProps & { className?: string }) {
  const count = Object.keys(bill).length;
  const byTier = TIERS.map((_, ti) => result.lineup.filter((p) => bill[p.id] === ti));
  const nameOf = (id: string) => result.lineup.find((p) => p.id === id)?.name ?? id;
  const clashWith = (id: string) => clashes.filter((c) => c.a === id || c.b === id).map((c) => nameOf(c.a === id ? c.b : c.a));
  const headlinerRows = result.headliners.flatMap((h) => boardRows(h.name, 16));
  const headCols = Math.max(8, ...headlinerRows.map((r) => r.length));
  const actRows = (name: string) => boardRows(name, 24).slice(0, 2);
  const actCols = Math.max(10, ...result.lineup.filter((p) => p.id in bill).flatMap((p) => actRows(p.name).map((r) => r.length)));

  return (
    <section id="bill" aria-labelledby="bill-title" className={cx("scroll-mt-20", className)}>
      <Card className="p-4 md:p-6">
        <SectionHead
          id="bill-title"
          eyebrow="The bill"
          title={count ? `${count} support act${count > 1 ? "s" : ""} on the bill` : "Your bill"}
          action={
            <div className="no-print flex flex-wrap gap-2">
              <ExportActions result={result} bill={bill} brief={brief} onCopied={onCopied} />
            </div>
          }
        />

        {/* the signature: a split-flap board */}
        <div className="mt-5 rounded-input border border-board-line bg-board-bg p-3 md:p-5">
          <p className="font-mono text-micro tracking-wide text-board-text/70 uppercase">Headlining</p>
          <Board className="mt-2" lines={headlinerRows} cols={headCols} maxSize={40} label={`Headlining: ${result.headliners.map((h) => h.name).join(", ")}`} />
          {TIERS.map((tier, ti) =>
            byTier[ti].length ? (
              <div key={tier} className="mt-4">
                <p className="font-mono text-micro tracking-wide text-board-text/70 uppercase">{tier}</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {byTier[ti].map((p) => (
                    <Board key={p.id} lines={actRows(p.name)} cols={actCols} maxSize={ti === 0 ? 22 : ti === 1 ? 18 : 15} label={`${tier}: ${p.name}`} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>

        {count ? (
          <div className="no-print mt-5">
            <h3 className="text-small font-medium text-text">Running order</h3>
            <ol className="mt-2">
              {TIERS.flatMap((tier, ti) =>
                byTier[ti].map((p) => {
                  const same = clashWith(p.id);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3 last:border-b-0">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-body font-medium break-words">{p.name}</p>
                        <p className="text-small text-text-2">
                          {tier}
                          {same.length > 0 && <span className="text-warn"> · Same crowd as {same.join(", ")}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="quiet" iconOnly disabled={ti === 0} onClick={() => moveTier(p.id, -1)} aria-label={`Move ${p.name} up to ${TIERS[ti - 1] ?? tier}`} icon={<ArrowUp aria-hidden className="size-4" />} />
                        <Button size="sm" variant="quiet" iconOnly disabled={ti === TIERS.length - 1} onClick={() => moveTier(p.id, 1)} aria-label={`Move ${p.name} down to ${TIERS[ti + 1] ?? tier}`} icon={<ArrowDown aria-hidden className="size-4" />} />
                        <Button size="sm" variant="quiet" iconOnly onClick={() => toggleBill(p.id)} aria-label={`Remove ${p.name} from the bill`} icon={<X aria-hidden className="size-4" />} />
                      </div>
                    </li>
                  );
                }),
              )}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button size="sm" variant="ghost" onClick={scanClashes} disabled={count < 2} loading={clashLoading} icon={<Users aria-hidden className="size-4" />}>
                Check for same-crowd acts
              </Button>
              <ClashStatus count={count} loading={clashLoading} scanned={clashScanned} failed={clashFailed} clashes={clashes} nameOf={nameOf} />
            </div>
          </div>
        ) : (
          <p className="no-print mt-5 flex items-start gap-2 text-small text-text-2">
            <ListPlus aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Add acts from <a href="#support" className="text-text underline decoration-line-strong underline-offset-4 hover:decoration-text">the support list</a>. Each one flips onto the board, then you can move it between {TIERS.join(", ").toLowerCase()}.
            </span>
          </p>
        )}
      </Card>
    </section>
  );
}

function ClashStatus({ count, loading, scanned, failed, clashes, nameOf }: { count: number; loading: boolean; scanned: boolean; failed: boolean; clashes: Clash[]; nameOf: (id: string) => string }) {
  if (count < 2) return <p className="text-small text-text-2">Add two or more acts to check whether any pull the same crowd.</p>;
  if (loading) return <StatusMark strike={false} status="running" size={20} label={<span className="text-small text-text-2">Comparing each act&apos;s fans…</span>} />;
  if (failed)
    return <StatusMark strike={false} status="failed" size={20} label={<span className="text-small text-text-2">Couldn&apos;t run the check. Try again in a moment.</span>} />;
  if (!scanned) return <p className="text-small text-text-2">Two acts with the same fans waste a slot.</p>;
  if (!clashes.length) return <StatusMark strike={false} status="done" size={20} label={<span className="text-small text-text">No overlap. Every act brings a different slice of the crowd.</span>} />;
  return (
    <div className="flex basis-full flex-col gap-1.5">
      <Badge tone="warn" className="self-start">
        {clashes.length} pair{clashes.length > 1 ? "s" : ""} pull the same crowd
      </Badge>
      <ul className="text-small text-text-2">
        {clashes.map((c, i) => (
          <li key={i}>
            <span className="text-text">{nameOf(c.a)}</span> and <span className="text-text">{nameOf(c.b)}</span> · overlap{" "}
            <span className="font-mono">{c.score.toFixed(2)}</span>. Consider keeping one.
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExportActions({ result, bill, brief, onCopied }: { result: LineupResult; bill: Record<string, number>; brief: string | null; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildSheet(result, bill, brief));
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — print still works */
    }
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={copy} icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}>
        {copied ? "Copied" : "Copy sheet"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => window.print()} icon={<Printer aria-hidden className="size-4" />}>
        Print / PDF
      </Button>
    </>
  );
}

function BriefCard({ brief, loading, className }: { brief: string | null; loading: boolean; className?: string }) {
  return (
    <Card className={cx("flex flex-col p-4 md:p-6", className)}>
      <p className="eyebrow">Programmer&apos;s brief</p>
      {loading && !brief ? (
        <div className="mt-4 flex flex-col gap-2.5" aria-label="Writing the brief">
          {[100, 96, 92, 98, 70].map((w, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
          <p className="mt-2 text-small text-text-2">Writing the brief from these results…</p>
        </div>
      ) : brief ? (
        <>
          <p className="mt-4 text-body leading-relaxed text-text">{brief}</p>
          <p className="mt-auto pt-4 text-micro text-text-2">Written only from the taste data on this page.</p>
        </>
      ) : (
        <p className="mt-4 text-small text-text-2">The written brief isn&apos;t available right now. Everything else on this page is unaffected.</p>
      )}
    </Card>
  );
}

/* ——— support acts ——— */

function ActRow({ p, rank, multi, hueFor, onBill, toggle, hiddenOnPhone }: { p: Pick; rank: number; multi: boolean; hueFor: (n: string) => string; onBill: boolean; toggle: (id: string) => void; hiddenOnPhone?: boolean }) {
  return (
    <li
      className={cx(
        hiddenOnPhone && "max-md:hidden print:grid",
        "grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-b border-line py-5 md:items-center md:gap-x-6 md:py-4",
        multi ? "md:grid-cols-[2.5rem_minmax(0,1fr)_13rem_9rem_9.5rem]" : "md:grid-cols-[2.5rem_minmax(0,1fr)_9rem_9.5rem]",
      )}
    >
      <span className="pt-0.5 font-mono text-small text-text-2 md:pt-0">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-h3 font-semibold break-words">{p.name}</h3>
          {p.isHiddenGem && (
            <Badge tone="neutral" icon={<Gem aria-hidden className="size-3" />}>
              Deep cut
            </Badge>
          )}
        </div>
        <p className="mt-1 text-small text-text-2">
          {p.genres.length > 0 && <span className="capitalize">{p.genres.join(" · ")} · </span>}
          Taste fit <span className="font-mono text-text">{p.affinity.toFixed(2)}</span>
        </p>
      </div>
      {multi && (
        <div className="col-start-2 md:col-start-auto">
          <span className="sr-only">Pulled in by: </span>
          <AttributionBar drivenBy={p.drivenBy} hueFor={hueFor} />
        </div>
      )}
      <div className="col-start-2 md:col-start-auto">
        <FameMeter value={p.popularity} />
      </div>
      <div className="no-print col-start-2 md:col-start-auto md:justify-self-end">
        <Button
          size="sm"
          variant={onBill ? "quiet" : "ghost"}
          aria-pressed={onBill}
          onClick={() => toggle(p.id)}
          className={cx("w-full md:w-auto", onBill && "text-accent hover:text-accent")}
          icon={onBill ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          aria-label={onBill ? `${p.name} is on the bill. Remove` : `Add ${p.name} to the bill`}
        >
          {onBill ? "On the bill" : "Add to bill"}
        </Button>
      </div>
    </li>
  );
}

/** 0–1 popularity as a short meter + the measured value. */
function FameMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3 md:block">
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-pill bg-surface-2 md:w-full" role="img" aria-label={`How well known: ${value.toFixed(2)} out of 1`}>
        <div className="grow-x h-full rounded-pill bg-text-2" style={{ width: pct(value) }} />
      </div>
      <p className="text-small text-text-2 md:mt-1.5">
        <span className="md:hidden">How well known </span>
        <span className="font-mono">{value.toFixed(2)}</span>
      </p>
    </div>
  );
}

function AttributionBar({ drivenBy, hueFor }: { drivenBy: { name: string; score: number }[]; hueFor: (n: string) => string }) {
  const total = drivenBy.reduce((s, d) => s + d.score, 0) || 1;
  if (!drivenBy.length) return null;
  return (
    <div>
      <div aria-hidden className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-pill">
        {drivenBy.map((d, i) => (
          <div key={i} className="grow-x h-full" style={{ width: pct(d.score / total), background: hueFor(d.name), animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-micro text-text-2">
        {drivenBy.map((d, i) => (
          <li key={i} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-pill" style={{ background: hueFor(d.name) }} />
            {firstName(d.name)} <span className="font-mono">{pct(d.score / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ——— sponsors & partners ——— */

function SponsorCard({ s, multi, hueFor, onPitch, hiddenOnPhone }: { s: Sponsor; multi: boolean; hueFor: (n: string) => string; onPitch: (sponsor: string) => void; hiddenOnPhone?: boolean }) {
  return (
    <li className={cx(hiddenOnPhone && "max-md:hidden print:block")}>
      <Card className="flex h-full flex-col gap-4 p-4">
        <div>
          <h3 className="text-h3 font-semibold break-words">{s.name}</h3>
          <p className="mt-1 text-small text-text-2">
            Taste fit <span className="font-mono text-text">{s.affinity.toFixed(2)}</span>
          </p>
        </div>
        {multi && <AttributionBar drivenBy={s.drivenBy} hueFor={hueFor} />}
        <Button size="sm" variant="ghost" className="no-print mt-auto self-start" onClick={() => onPitch(s.name)} icon={<Mail aria-hidden className="size-4" />}>
          Draft pitch
        </Button>
      </Card>
    </li>
  );
}

function PlaceList({ places, city }: { places: Place[]; city?: string }) {
  if (!places.length)
    return <p className="py-5 text-small text-text-2">{city ? `No partner spots came back for ${city}.` : "Add a city above to see local partners."}</p>;
  return (
    <ol>
      {places.map((p, i) => (
        <ListRow
          key={p.id}
          lead={<span className="font-mono text-small text-text-2">{String(i + 1).padStart(2, "0")}</span>}
          title={p.name}
          meta={
            <>
              {p.address && <span className="block">{p.address}</span>}
              {p.goodFor.length > 0 && <span className="block capitalize">Good for {p.goodFor.join(", ").toLowerCase()}</span>}
            </>
          }
          trail={
            <span className="text-micro text-text-2">
              fit <span className="font-mono text-small text-text">{p.affinity.toFixed(2)}</span>
            </span>
          }
        />
      ))}
    </ol>
  );
}

/* ——— audience ——— */

function AudiencePanel({ audience }: { audience: NonNullable<LineupResult["audience"]> }) {
  const top = [...audience.age].sort((a, b) => b.score - a.score)[0];
  const lean = audience.gender.female >= audience.gender.male ? "female" : "male";
  return (
    <section id="audience" aria-labelledby="audience-title" className="mt-16 scroll-mt-20">
      <SectionHead
        id="audience-title"
        eyebrow="Audience"
        title="Who this bill pulls"
        lede="Compared with the average audience. Bars to the right mean more likely than average; to the left, less likely."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-12">
        <Card className="p-5 md:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-h3 font-semibold">Age</h3>
            <p className="text-small text-text-2">
              Strongest: <span className="text-text">{AGE_LABEL[top.bracket] ?? top.bracket}</span>{" "}
              <span className="font-mono">{signed(top.score)}</span>
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {audience.age.map((a) => (
              <DivergingBar key={a.bracket} label={AGE_LABEL[a.bracket] ?? a.bracket} score={a.score} />
            ))}
          </div>
        </Card>
        <Card className="p-5 md:col-span-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-h3 font-semibold">Gender</h3>
            <p className="text-small text-text-2">
              Leans <span className="text-text">{lean}</span>
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <DivergingBar label="Male" score={audience.gender.male} />
            <DivergingBar label="Female" score={audience.gender.female} />
          </div>
        </Card>
      </div>
    </section>
  );
}

function DivergingBar({ label, score }: { label: string; score: number }) {
  const w = Math.min(Math.abs(score), 1) * 50;
  const up = score >= 0;
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3" role="img" aria-label={`${label}: ${up ? "more" : "less"} likely than average, ${signed(score)}`}>
      <span className="text-small text-text-2">{label}</span>
      <div className="relative h-3">
        <div className="absolute inset-y-[-4px] left-1/2 w-px bg-line-strong" />
        <div
          className={cx("absolute inset-y-0 rounded-pill", up ? "grow-x bg-text" : "bg-text-3")}
          style={up ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
        />
      </div>
      <span className={cx("text-right font-mono text-small", up ? "text-text" : "text-text-2")}>{signed(score)}</span>
    </div>
  );
}

/* ——— proof ——— */

function TraceDetails({ trace }: { trace: LineupResult["trace"] }) {
  const totalMs = trace.reduce((s, t) => s + t.ms, 0);
  return (
    <details className="no-print group mt-16 rounded-card border border-line bg-surface-1">
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-body font-medium">How we got this</span>
        <span className="text-small text-text-2">
          {trace.length} live lookups · <span className="font-mono">{(totalMs / 1000).toFixed(1)}s</span>
          <span aria-hidden className="ml-2 inline-block transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <ol className="border-t border-line px-5 py-2">
        {trace.map((t, i) => {
          const [human, call] = t.label.split(" · ");
          return (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line py-3 last:border-b-0">
              <Check aria-hidden className="size-4 shrink-0 self-center text-ok" />
              <span className="text-small text-text">{human}</span>
              {call && <code className="font-mono text-micro text-text-2">{call}</code>}
              <span className="ml-auto font-mono text-micro text-text-2">
                {t.count} results · {t.ms}ms
              </span>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line px-5 py-3 text-micro text-text-2">
        Every pick comes from Qloo&apos;s taste graph. The written brief and pitches only restate these numbers.
      </p>
    </details>
  );
}

/* ——— loading ——— */

export function LoadingResults() {
  return (
    <div className="mt-12" aria-label="Loading results">
      <p className="eyebrow">Programming the bill</p>
      <p className="mt-2 text-body text-text-2">
        Running live taste-graph lookups: {LOOKUPS.join(", ").toLowerCase()}. This takes a few seconds.
      </p>
      <Skeleton className="mt-6 h-10 w-2/3 max-w-xl" />
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <Card className="p-4 md:p-6 lg:col-span-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-5 h-40 w-full rounded-input" />
        </Card>
        <Card className="flex flex-col gap-2.5 p-4 md:p-6 lg:col-span-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      </div>
      <div className="mt-16 flex flex-col">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line py-5">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="hidden h-4 w-40 md:block" />
            <Skeleton className="h-9 w-28 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ——— pitch ——— */

export function PitchDialog({ sponsor, text, loading, onClose, onRetry }: { sponsor: string | null; text: string | null; loading: boolean; onClose: () => void; onRetry: () => void }) {
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
  let body: ReactNode;
  if (loading)
    body = (
      <div className="flex flex-col gap-2.5" aria-label="Drafting the pitch">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-3 h-4" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4 w-4/5" />
        <p className="mt-2 text-small text-text-2">Drafting from the measured audience data…</p>
      </div>
    );
  else if (text) body = <p className="text-body leading-relaxed whitespace-pre-wrap text-text">{text}</p>;
  else
    body = (
      <Banner tone="warn" title="Couldn't draft this pitch right now">
        The sponsor data on the page is still accurate. Try again in a moment.
      </Banner>
    );
  return (
    <Dialog
      open={!!sponsor}
      onClose={onClose}
      eyebrow="Sponsorship pitch"
      title={sponsor ?? ""}
      footer={
        loading ? null : text ? (
          <Button variant="primary" onClick={copy} icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}>
            {copied ? "Copied" : "Copy email"}
          </Button>
        ) : (
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {body}
      {text && !loading && <p className="mt-4 text-micro text-text-2">Written only from the taste data on this page. Review before sending.</p>}
    </Dialog>
  );
}
