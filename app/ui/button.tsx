"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { cx } from "./cx";

export { cx };

type Variant = "primary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,transform,opacity] duration-(--dur-micro) ease-out " +
  "active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  ghost: "border border-line-strong text-text hover:bg-surface-2 hover:border-text-3",
  quiet: "text-text-2 hover:text-text hover:bg-surface-2",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};

// sm stays compact on desktop but grows to a 44px target on touch screens
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-small pointer-coarse:h-11",
  md: "h-11 px-5 text-small",
  lg: "h-13 px-7 text-body",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", loading = false, icon, iconOnly = false, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      className={cx(base, variants[variant], sizes[size], iconOnly && "aspect-square px-0", className)}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 spin" /> : icon}
      {children}
    </button>
  );
});
