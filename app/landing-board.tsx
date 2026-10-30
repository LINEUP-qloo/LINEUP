"use client";

import SplitFlapText from "./ui/rb/split-flap-text";

/** Landing hero: the board flips through real preset headliners once, then holds. */
export function LandingBoard({ names }: { names: string[] }) {
  const words = names.map((n) => n.toUpperCase());
  const cols = Math.max(...words.map((w) => w.length));
  return (
    <div className="@container w-full">
      <span className="sr-only">Headlining: {names.join(", ")}</span>
      <div aria-hidden style={{ fontSize: `min(34px, calc(100cqi / ${(cols * 0.86).toFixed(2)}))` }}>
        <SplitFlapText
          words={words}
          padTo={cols}
          loop={false}
          intro
          cycleDelay={1600}
          fontSize="1em"
          gap="0.08em"
          tileRadius="0.12em"
          flipDuration={0.07}
          flipsPerChar={6}
          stagger={0.025}
          depth={0.35}
          glare={0.25}
          charset="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        />
      </div>
    </div>
  );
}
