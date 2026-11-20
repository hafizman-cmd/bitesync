"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "en" ? "ms" : "en";
  const label = next === "ms" ? "Tukar ke Bahasa Melayu" : "Switch to English";

  function toggle() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    startTransition(() => router.refresh());
  }

  return <button type="button" className="language-button" onClick={toggle} disabled={pending} aria-label={label} title={label}>
    <Languages size={18} strokeWidth={1.75} />
    <span lang={next}>{next === "ms" ? "BM" : "EN"}</span>
  </button>;
}
