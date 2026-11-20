"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { copy } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

const query = "(prefers-color-scheme: dark)";
const event = "bitesync:theme";

function subscribe(callback: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", callback);
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}

function currentTheme() {
  let saved;
  try { saved = localStorage.getItem("bitesync-theme"); } catch {}
  return saved || (matchMedia(query).matches ? "dark" : "light");
}

export function ThemeToggle({ locale }: { locale: Locale }) {
  const dark = useSyncExternalStore(subscribe, currentTheme, () => "light") === "dark";
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("bitesync-theme", next); } catch {}
    window.dispatchEvent(new Event(event));
  }
  const Icon = dark ? Sun : Moon;
  return <button className="theme-button" type="button" onClick={toggle} aria-label={dark ? copy[locale].light : copy[locale].dark}>
    <Icon size={19} strokeWidth={1.75} />
  </button>;
}
