"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

/** Modal dialog on the native <dialog>: focus trap, Esc to close, inert page. A bottom sheet on phones. */
export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="sheet m-0 mt-auto w-full max-w-none rounded-t-card border border-line bg-surface-1 p-0 text-text shadow-pop sm:m-auto sm:w-[min(640px,calc(100vw-48px))] sm:rounded-card"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId} className="mt-1 text-h3 font-semibold">
              {title}
            </h2>
          </div>
          <Button variant="quiet" size="sm" iconOnly aria-label="Close" onClick={onClose} icon={<X aria-hidden className="size-4" />} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </dialog>
  );
}
