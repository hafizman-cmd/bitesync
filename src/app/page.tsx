import { ArrowDown, ArrowRight, Ban, ChevronRight, Clock3, Heart, Layers2, Link2, MapPin, ShieldCheck, Utensils, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Footer, Header } from "@/components/site";
import { copy } from "@/lib/copy";
import { getLocale } from "@/lib/server-locale";

const stepIcons = [Link2, Layers2, Utensils];

export default async function Home() {
  const locale = await getLocale();
  const t = copy[locale];
  return <>
    <Header home locale={locale} />
    <main>
      <section className="site-width hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> {t.heroEyebrow}</p>
          <h1 id="hero-title">{t.heroFirst}<br className="desktop-break" /> {t.heroSecond} <em>{t.heroAccent}</em></h1>
          <p className="hero-description">{t.heroDescription}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/create">{t.create} <ArrowRight size={19} strokeWidth={1.75} /></Link>
            <Link className="button secondary" href="/create?demo=1">{t.demo} <ChevronRight size={17} strokeWidth={1.75} /></Link>
          </div>
          <div className="hero-notes">
            <span><Clock3 size={16} strokeWidth={1.75} /> {t.rounds}</span>
            <span><ShieldCheck size={17} strokeWidth={1.75} /> {t.noSignup}</span>
          </div>
        </div>
        <div className="hero-visual">
          <Image className="hero-photo" src="/images/pak-gembus-storefront.webp" alt={t.storefront} fill sizes="(max-width: 760px) 96vw, 52vw" preload />
          <div className="preview-stack" aria-hidden="true">
            <div className="preview-back" />
            <div className="preview-card">
              <div className="preview-image">
                <Image src="/images/pak-gembus-ayam-gepuk.webp" alt="" fill sizes="80px" loading="eager" />
              </div>
              <div className="preview-copy">
                <p>{t.indonesian}</p>
                <strong>Ayam Gepuk Pak Gembus</strong>
                <span><MapPin size={13} strokeWidth={1.75} /> Malaysia</span>
              </div>
              <div className="preview-votes"><i><X size={20} strokeWidth={1.75} /></i><i><Heart size={19} strokeWidth={1.75} /></i></div>
            </div>
          </div>
        </div>
      </section>
      <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="site-width">
          <div className="steps-heading">
            <div>
              <p className="eyebrow"><ArrowDown size={14} strokeWidth={1.75} /> {t.how}</p>
              <h2 id="steps-title">{t.stepsHeading}</h2>
            </div>
          </div>
          <div className="steps-grid">
            {t.steps.map(({ title, description }, index) => {
              const Icon = stepIcons[index];
              return <article className="step-card" key={index}>
                <span className="step-icon"><Icon size={23} strokeWidth={1.75} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>;
            })}
          </div>
          <div className="veto-note"><Ban size={16} strokeWidth={1.75} /> {t.vetoNote}</div>
        </div>
      </section>
    </main>
    <Footer locale={locale} />
  </>;
}
