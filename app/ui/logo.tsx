/**
 * LINEUP mark: one split-flap tile showing a bill. Top flap = the headliner (wide, accent);
 * bottom flap = support and openers, centred like a poster. The hinge line ties it to the board.
 * Dark in both themes, like the board. The top flap flips once on hover/focus (see .logo-flap in globals.css).
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7" fill="var(--board-tile)" />
      <g className="logo-flap">
        <rect x="6" y="7" width="20" height="5" rx="1.5" fill="var(--accent-on-board)" />
      </g>
      <rect y="15.5" width="32" height="1" fill="var(--board-bg)" />
      <rect x="9" y="19.5" width="14" height="3" rx="1.2" fill="var(--board-text)" />
      <rect x="11.5" y="24.5" width="9" height="2.5" rx="1.1" fill="var(--board-text)" opacity="0.55" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[1.0625rem] leading-none font-extrabold tracking-[-0.03em] text-text">LINEUP</span>
    </span>
  );
}
