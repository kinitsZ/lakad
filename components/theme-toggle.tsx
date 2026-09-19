"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/** The theme lives on <html>, set before paint by the script in the root layout. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const readTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

// Unknown until hydration, so the first paint doesn't claim the wrong label.
const serverTheme = () => null;

function toggle() {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private browsing — the choice just won't survive a reload.
  }
}

export function ThemeToggle({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "icon";
  className?: string;
}) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, serverTheme);
  const ariaLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        className={`w-8 h-8 rounded-full bg-surface border border-line grid place-items-center cursor-pointer hover:border-accent ${className}`}
      >
        <span className="w-[13px] h-[13px] rounded-full bg-accent" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      className={`flex items-center gap-[7px] border border-line rounded-full px-2.5 py-[5px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent hover:text-ink ${className}`}
    >
      <span className="w-3 h-3 rounded-full bg-accent" />
      <span className="min-w-[30px] text-left">
        {theme === "dark" ? "Dark" : theme === "light" ? "Light" : ""}
      </span>
    </button>
  );
}
