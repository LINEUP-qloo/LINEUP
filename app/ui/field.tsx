"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./cx";

const SERIES = ["text-series-0", "text-series-1", "text-series-2", "text-series-3", "text-series-4"];
const SERIES_DOT = ["bg-series-0", "bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4"];
export const seriesText = (i: number) => SERIES[i % SERIES.length];
export const seriesBg = (i: number) => SERIES_DOT[i % SERIES_DOT.length];

/** Label + control + hint/error, wired for screen readers. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-small font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-msg`} className="text-small text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-msg`} className="text-small text-text-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputFrame =
  "rounded-input border border-line-strong bg-surface-2 transition-colors duration-(--dur-micro) " +
  "hover:border-text-3 focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-accent/40";

/** Text input that collects values as chips (headliners, cities). Presentational: key handling stays with the caller. */
export function ChipInput({
  label,
  hint,
  error,
  chips,
  onRemove,
  seriesChips = false,
  inputProps,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  chips: string[];
  onRemove: (value: string) => void;
  seriesChips?: boolean;
  inputProps: ComponentPropsWithRef<"input">;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className={cx(inputFrame, "flex min-h-13 flex-wrap items-center gap-2 px-2 py-2")}>
        {chips.map((c, i) => (
          <span
            key={c}
            className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-chip border border-line bg-surface-1 pl-2.5 pr-1 text-small text-text"
          >
            {seriesChips && <span aria-hidden className={cx("size-2 shrink-0 rounded-pill", seriesBg(i))} />}
            <span className="truncate">{c}</span>
            <button
              type="button"
              onClick={() => onRemove(c)}
              aria-label={`Remove ${c}`}
              className="relative grid size-6 shrink-0 place-items-center rounded-pill text-text-2 transition-colors hover:bg-surface-2 hover:text-text after:absolute after:-inset-2.5 after:content-['']"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          aria-describedby={hint || error ? `${id}-msg` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          className="h-9 min-w-[12ch] flex-1 bg-transparent px-2 text-body text-text outline-none placeholder:text-text-2"
          {...inputProps}
        />
      </div>
    </Field>
  );
}
