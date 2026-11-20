import { ArrowDown, ArrowRight, Ban, ChevronRight, Clock3, Heart, Layers2, Link2, MapPin, ShieldCheck, Utensils, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Footer, Header } from "@/components/site";

const steps = [
  { icon: Link2, title: "Share a link", description: "Pick an area, create a room, and drop the link in your group chat." },
  { icon: Layers2, title: "Swipe your picks", description: "Like the places you’d eat, pass on the rest, and veto a hard no." },
  { icon: Utensils, title: "Get a match", description: "BiteSync tallies everyone’s picks. Open the winner in Maps and go." },
];

export default function Home() {
  return <>
    <Header home />
    <main>
      <section className="site-width hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> The group dining decider</p>
          <h1 id="hero-title">Decide where<br className="desktop-break" /> to eat, <em>together.</em></h1>
          <p className="hero-description">Share a link, swipe on nearby restaurants, and settle dinner with your group in 90 seconds.</p>
          <div className="hero-actions">
            <Link className="button primary" href="/create">Create room <ArrowRight size={19} strokeWidth={1.75} /></Link>
            <Link className="button secondary" href="/create?demo=1">Try a demo <ChevronRight size={17} strokeWidth={1.75} /></Link>
          </div>
          <div className="hero-notes">
            <span><Clock3 size={16} strokeWidth={1.75} /> 90-second rounds</span>
            <span><ShieldCheck size={17} strokeWidth={1.75} /> No sign-up</span>
          </div>
        </div>
        <div className="hero-visual">
          <Image className="hero-photo" src="/images/pak-gembus-storefront.webp" alt="Ayam Gepuk Pak Gembus restaurant storefront" fill sizes="(max-width: 760px) 96vw, 52vw" preload />
          <div className="preview-stack" aria-hidden="true">
            <div className="preview-back" />
            <div className="preview-card">
              <div className="preview-image">
                <Image src="/images/pak-gembus-ayam-gepuk.webp" alt="" fill sizes="80px" loading="eager" />
              </div>
              <div className="preview-copy">
                <p>Indonesian</p>
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
              <p className="eyebrow"><ArrowDown size={14} strokeWidth={1.75} /> How it works</p>
              <h2 id="steps-title">From group chat to table.</h2>
            </div>
          </div>
          <div className="steps-grid">
            {steps.map(({ icon: Icon, title, description }) => <article className="step-card" key={title}>
              <span className="step-icon"><Icon size={23} strokeWidth={1.75} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>)}
          </div>
          <div className="veto-note"><Ban size={16} strokeWidth={1.75} /> Everyone gets one veto per round.</div>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
