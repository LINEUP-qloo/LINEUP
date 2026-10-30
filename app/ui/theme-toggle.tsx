"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

type Theme = "dark" | "light";

/** Light/dark switch. The pre-paint script in layout.tsx applies the saved theme; this only reads it after mount. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const flip = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lineup-theme", next);
    } catch {
      /* storage blocked — theme still applies for this visit */
    }
    setTheme(next);
  };

  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <Button
      variant="quiet"
      size="sm"
      iconOnly
      onClick={flip}
      aria-label={label}
      title={label}
      icon={theme === "light" ? <Moon aria-hidden className="size-4" /> : <Sun aria-hidden className="size-4" />}
    />
  );
}
