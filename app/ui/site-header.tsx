import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";

/** Top bar shared by the landing page and the tool. */
export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="no-print border-b border-line">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group rounded-chip" aria-label="LINEUP home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-small text-text-2 md:inline">Powered by the Qloo taste graph</span>
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
