import { ArrowUpRight, Utensils } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme";

export function Brand() {
  return <Link href="/" className="brand" aria-label="BiteSync home">
    <span className="brand-icon"><Utensils size={18} strokeWidth={1.75} /></span>
    <span>BiteSync<span className="brand-period">.</span></span>
  </Link>;
}

export function Header({ home = false }: { home?: boolean }) {
  return <header className="site-header">
    <div className="site-width nav-row">
      <Brand />
      <nav aria-label="Main navigation">
        {home && <Link href="#how-it-works" className="nav-how">How it works</Link>}
        {home && <Link href="/create?demo=1" className="nav-demo">Try a demo <ArrowUpRight size={15} strokeWidth={1.75} /></Link>}
        <ThemeToggle />
      </nav>
    </div>
  </header>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="site-width footer-row">
      <Brand />
      <Link href="/#how-it-works">How it works</Link>
    </div>
  </footer>;
}
