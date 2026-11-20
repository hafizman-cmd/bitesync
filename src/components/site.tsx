import { ArrowUpRight, Utensils } from "lucide-react";
import Link from "next/link";
import { brand, copy } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme";

function Brand({ locale }: { locale: Locale }) {
  return <Link href="/" className="brand" aria-label={copy[locale].brandHome}>
    <span className="brand-icon"><Utensils size={18} strokeWidth={1.75} /></span>
    <span>{brand}<span className="brand-period">.</span></span>
  </Link>;
}

export function Header({ home = false, locale }: { home?: boolean; locale: Locale }) {
  const t = copy[locale];
  return <header className="site-header">
    <div className="site-width nav-row">
      <Brand locale={locale} />
      <nav aria-label={t.navigation}>
        {home && <Link href="#how-it-works" className="nav-how">{t.how}</Link>}
        {home && <Link href="/create?demo=1" className="nav-demo">{t.demo} <ArrowUpRight size={15} strokeWidth={1.75} /></Link>}
        <LanguageToggle locale={locale} />
        <ThemeToggle locale={locale} />
      </nav>
    </div>
  </header>;
}

export function Footer({ locale }: { locale: Locale }) {
  return <footer className="site-footer">
    <div className="site-width footer-row">
      <Brand locale={locale} />
      <Link href="/#how-it-works">{copy[locale].how}</Link>
    </div>
  </footer>;
}
