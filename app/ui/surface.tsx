import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cx } from "./cx";

/** Card / panel: the one surface style. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-card border border-line bg-surface-1", className)} {...rest} />;
}

/** Section header: mono eyebrow, title, one plain-language line. */
export function SectionHead({
  eyebrow,
  title,
  lede,
  action,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-h2 font-semibold text-text">
          {title}
        </h2>
        {lede && <p className="mt-2 text-small text-text-2">{lede}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/** A plain list row: leading, main, trailing. Wraps instead of truncating. */
export function ListRow({
  lead,
  title,
  meta,
  trail,
  className,
}: {
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trail?: ReactNode;
  className?: string;
}) {
  return (
    <li className={cx("flex items-start gap-4 border-b border-line py-4 last:border-b-0", className)}>
      {lead && <div className="shrink-0 pt-0.5">{lead}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium break-words text-text">{title}</div>
        {meta && <div className="mt-1 text-small break-words text-text-2">{meta}</div>}
      </div>
      {trail && <div className="shrink-0 text-right">{trail}</div>}
    </li>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "bad";
const badgeTone: Record<Tone, string> = {
  neutral: "border-line-strong text-text-2",
  accent: "border-accent/40 bg-accent-soft text-accent",
  ok: "border-ok/40 text-ok",
  warn: "border-warn/40 text-warn",
  bad: "border-bad/40 text-bad",
};

/** Chip / badge: short status or tag. */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 rounded-pill border px-2.5 text-micro font-medium whitespace-nowrap", badgeTone[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

const bannerTone = {
  info: { cls: "border-line-strong", Icon: Info, icon: "text-text-2" },
  ok: { cls: "border-ok/40", Icon: CheckCircle2, icon: "text-ok" },
  warn: { cls: "border-warn/40", Icon: AlertTriangle, icon: "text-warn" },
  error: { cls: "border-bad/50", Icon: XCircle, icon: "text-bad" },
} as const;

/** Banner: what happened + what to do. Errors are announced to screen readers. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof bannerTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = bannerTone[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex flex-wrap items-start gap-3 rounded-card border bg-surface-1 p-4", t.cls, className)}
    >
      <t.Icon aria-hidden className={cx("mt-0.5 size-5 shrink-0", t.icon)} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-body font-medium text-text">{title}</p>
        {children && <div className="mt-1 text-small text-text-2">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Skeleton block — the shape of what's coming, never a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

/** Empty state: what's missing + the next action. */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-strong p-6">
      {icon && <div className="text-text-2">{icon}</div>}
      <p className="text-body font-medium text-text">{title}</p>
      {children && <div className="max-w-prose text-small text-text-2">{children}</div>}
      {action}
    </div>
  );
}
