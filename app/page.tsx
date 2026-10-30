import Link from "next/link";
import { ArrowRight, Building2, Megaphone, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "./ui/site-header";
import { Card } from "./ui/surface";
import { LandingBoard } from "./landing-board";
import { PRESETS, presetHref } from "./presets";

// A real pick from a live run (Tyler · Phoebe · Fred, Los Angeles, 2026-10-30).
const EXAMPLE = {
  act: "1010 Benja SL",
  split: [
    { name: "Fred again..", share: 35, series: "bg-series-2" },
    { name: "Phoebe Bridgers", share: 34, series: "bg-series-1" },
    { name: "Tyler, the Creator", share: 31, series: "bg-series-0" },
  ],
};

const DELIVERABLES = [
  { Icon: Sparkles, title: "Support acts", body: "Acts this crowd will love that aren't famous yet, ranked, with which headliner's fans pulled each one in." },
  { Icon: Megaphone, title: "Sponsors", body: "Brands the audience already over-indexes on, each one a click away from a pitch email written from the numbers." },
  { Icon: Building2, title: "Local partners", body: "Venues and spots the crowd goes to in every city on the route." },
  { Icon: Users, title: "Audience", body: "Which ages and genders this bill pulls, compared with the average audience." },
];

const cta =
  "inline-flex h-13 items-center justify-center gap-2 rounded-pill px-7 text-body font-medium transition-[background-color,transform,filter] duration-(--dur-micro) ease-out active:scale-[.98]";

export default function Landing() {
  return (
    <>
      <SiteHeader
        action={
          <Link href="/app" className="inline-flex h-9 items-center rounded-pill bg-accent px-4 text-small font-medium text-on-accent transition-[filter] hover:brightness-110 pointer-coarse:h-11">
            Open the tool
          </Link>
        }
      />

      <main>
        {/* 1 · hero: say what LINEUP decides, start immediately */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem]" style={{ background: "radial-gradient(60% 60% at 70% 30%, var(--wash), transparent 70%)" }} />
          <div className="shell relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="eyebrow">For festival bookers, talent buyers and promoters</p>
              <h1 className="mt-4 text-display font-extrabold text-balance">Program your bill by taste.</h1>
              <p className="mt-6 max-w-xl text-h3 font-normal text-text-2">
                Enter your headliners and a city. LINEUP returns the support acts, sponsors and local partners your actual audience
                loves, with the measured reason behind every pick.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className={`${cta} bg-accent text-on-accent hover:brightness-110`}>
                  Build a bill <ArrowRight aria-hidden className="size-5" />
                </Link>
                <Link href={presetHref(PRESETS[0])} className={`${cta} border border-line-strong text-text hover:bg-surface-2`}>
                  See a real example
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Card className="p-3 shadow-pop md:p-4">
                <div className="rounded-input border border-board-line bg-board-bg p-4 md:p-6">
                  <p className="font-mono text-micro tracking-wide text-board-text/70 uppercase">Now headlining</p>
                  <div className="mt-3">
                    <LandingBoard names={PRESETS[0].names} />
                  </div>
                </div>
                <div className="px-2 pt-4 pb-1">
                  <p className="text-small text-text-2">Open a real bill:</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <li key={p.label}>
                        <Link
                          href={presetHref(p)}
                          className="inline-flex h-9 items-center rounded-pill border border-line-strong px-3.5 text-small font-medium text-text transition-colors hover:bg-surface-2 pointer-coarse:h-11"
                        >
                          {p.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* 2 · how it works: picks are measured, not guessed */}
        <section aria-labelledby="how-title" className="border-t border-line">
          <div className="shell grid gap-12 py-16 md:py-24 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow">How it works</p>
              <h2 id="how-title" className="mt-3 text-h1 font-semibold">
                Measured, not guessed.
              </h2>
              <p className="mt-4 text-body text-text-2">
                A language model can only imagine what a crowd likes. LINEUP asks Qloo&apos;s taste graph, which measures it across
                more than 250 million real artists, brands and places, and shows you the reason for every pick.
              </p>
              <ol className="mt-8 flex flex-col gap-5">
                {[
                  ["Add your headliners", "One or several, plus the cities you're playing."],
                  ["LINEUP runs live lookups", "Support acts, sponsors, local partners and audience, in a few seconds."],
                  ["Build the bill", "Pin acts into tiers, check for acts that pull the same crowd, then export or pitch."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-pill border border-line-strong font-mono text-small text-text-2">{i + 1}</span>
                    <div>
                      <p className="text-body font-medium">{t}</p>
                      <p className="text-small text-text-2">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <Card className="p-5 md:p-8">
                <p className="eyebrow">Why this pick?</p>
                <p className="mt-3 text-h2 font-semibold">{EXAMPLE.act}</p>
                <p className="mt-1 text-small text-text-2">Support act for Tyler, the Creator, Phoebe Bridgers and Fred again.. in Los Angeles</p>
                <div className="mt-8" role="img" aria-label={`Pulled in by: ${EXAMPLE.split.map((s) => `${s.name} ${s.share}%`).join(", ")}`}>
                  <p className="text-small font-medium">Pulled in by each headliner&apos;s fans</p>
                  <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-pill">
                    {EXAMPLE.split.map((s) => (
                      <div key={s.name} className={`h-full ${s.series}`} style={{ width: `${s.share}%` }} />
                    ))}
                  </div>
                  <ul className="mt-3 flex flex-col gap-2">
                    {EXAMPLE.split.map((s) => (
                      <li key={s.name} className="flex items-center justify-between gap-3 text-small">
                        <span className="inline-flex items-center gap-2 text-text-2">
                          <span className={`size-2.5 rounded-pill ${s.series}`} />
                          {s.name}
                        </span>
                        <span className="font-mono text-text">{s.share}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-8 border-t border-line pt-4 text-micro text-text-2">From a live run on 30 Oct 2026. Every result in the tool is fetched fresh.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* 3 · what you get */}
        <section aria-labelledby="get-title" className="border-t border-line">
          <div className="shell py-16 md:py-24">
            <p className="eyebrow">What you get</p>
            <h2 id="get-title" className="mt-3 max-w-2xl text-h1 font-semibold">
              Everything a bill needs, from one search.
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DELIVERABLES.map(({ Icon, title, body }) => (
                <li key={title}>
                  <Card className="h-full p-5">
                    <Icon aria-hidden className="size-5 text-text-2" />
                    <h3 className="mt-4 text-h3 font-semibold">{title}</h3>
                    <p className="mt-2 text-small text-text-2">{body}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 · one action */}
        <section className="border-t border-line">
          <div className="shell flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-24">
            <h2 className="max-w-xl text-h1 font-semibold">Who&apos;s headlining your next show?</h2>
            <Link href="/app" className={`${cta} bg-accent text-on-accent hover:brightness-110`}>
              Build a bill <ArrowRight aria-hidden className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-8 text-small text-text-2">
          <p>Built on the Qloo taste graph for the Qloo LLM Hackathon.</p>
          <p className="flex gap-4">
            <a href="https://github.com/LINEUP-qloo/LINEUP" className="underline decoration-line-strong underline-offset-4 hover:text-text">
              Source on GitHub
            </a>
            <span>MIT licence</span>
          </p>
        </div>
      </footer>
    </>
  );
}
