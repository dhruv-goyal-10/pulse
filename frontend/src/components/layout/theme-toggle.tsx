"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button ref={buttonRef} variant="ghost" size="icon" aria-label="Toggle theme" />;

  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";

  const toggle = async () => {
    const doc = document as DocumentWithViewTransition;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || !buttonRef.current || prefersReducedMotion) {
      setTheme(next);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);
    document.documentElement.style.setProperty("--reveal-r", `${endRadius}px`);

    const transition = doc.startViewTransition(() => {
      setTheme(next);
    });

    try {
      await transition.finished;
    } finally {
      document.documentElement.style.removeProperty("--reveal-x");
      document.documentElement.style.removeProperty("--reveal-y");
      document.documentElement.style.removeProperty("--reveal-r");
    }
  };

  return (
    <Button ref={buttonRef} variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
