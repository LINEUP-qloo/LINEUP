"use client";

import SplitFlapText from "./rb/split-flap-text";
import { cx } from "./cx";

/** Break a name into board rows of at most `cols` characters, on word boundaries where possible. */
export function boardRows(text: string, cols: number): string[] {
  const rows: string[] = [];
  let line = "";
  for (const word of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    for (let w = word; w.length; ) {
      const room = line ? cols - line.length - 1 : cols;
      if (w.length <= room) {
        line = line ? `${line} ${w}` : w;
        w = "";
      } else if (line) {
        rows.push(line);
        line = "";
      } else {
        rows.push(w.slice(0, cols)); // a single word longer than the board: hard-split it
        w = w.slice(cols);
      }
    }
  }
  if (line) rows.push(line);
  return rows.length ? rows : [""];
}

/**
 * The signature: a split-flap board. Tiles size to the container width with container-query units,
 * so it fits a 360px phone and a 1200px desktop with no measuring and no layout shift.
 * Screen readers get the plain text; the tiles are decorative.
 */
export function Board({
  lines,
  cols,
  maxSize = 44,
  align = "left",
  className,
  label,
}: {
  lines: string[];
  cols: number;
  maxSize?: number;
  align?: "left" | "center";
  className?: string;
  label?: string;
}) {
  // one tile ≈ 0.78em wide + 0.08em gap
  const size = `min(${maxSize}px, calc(100cqi / ${(cols * 0.86).toFixed(2)}))`;
  return (
    <div className={cx("@container w-full", className)}>
      {label && <span className="sr-only">{label}</span>}
      <div aria-hidden className={cx("flex flex-col gap-[0.12em]", align === "center" && "items-center")} style={{ fontSize: size }}>
        {lines.map((line, i) => (
          <SplitFlapText
            key={`${i}-${line}`}
            text={line}
            padTo={cols}
            align={align}
            loop={false}
            intro
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
        ))}
      </div>
    </div>
  );
}
