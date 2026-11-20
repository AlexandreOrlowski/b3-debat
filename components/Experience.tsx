"use client";

import { CalendarDays, ChevronsDown, Mouse, Rotate3d, RotateCcw } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import IntroLoader from "./IntroLoader";
import PerfumeScene from "./PerfumeScene";

const chapters = [
  { id: "le-parfum", label: "Le parfum" },
  { id: "le-flacon", label: "Le flacon" },
  { id: "la-sortie", label: "La sortie" },
] as const;

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="brand-mark">
      <g stroke="currentColor" strokeWidth="1.3">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path key={angle} d="M24 22C19 18 18 2 24 2S29 18 24 22Z" transform={`rotate(${angle} 24 24)`} />
        ))}
      </g>
    </svg>
  );
}

function CalendarLink({ secondary = false }: { secondary?: boolean }) {
  return (
    <a className={secondary ? "calendar-link" : "primary-link"} href="/julia-20-janvier-2027.ics" download>
      <CalendarDays size={16} strokeWidth={1.45} aria-hidden="true" />
      Retenir la date
    </a>
  );
}

export default function Experience() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [released, setReleased] = useState(false);
  const reducedMotion = useReducedMotion();
  const experience = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: experience, offset: ["start start", "end end"] });
  const onReady = useCallback(() => setReady(true), []);
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, 1.09]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.09, 0.24], [1, 1, 0]);
  const bottleOpacity = useTransform(scrollYProgress, [0.22, 0.4, 0.6, 0.77], [0, 1, 1, 0]);
  const launchOpacity = useTransform(scrollYProgress, [0.75, 0.92, 1], [0, 1, 1]);
  const active = Math.min(chapters.length - 1, Math.max(0, Math.round(progress * (chapters.length - 1))));
  const lastChapter = active === chapters.length - 1;

  useEffect(() => {
    const update = (value: number) => setProgress(Math.max(0, Math.min(1, value)));
    update(scrollYProgress.get());
    return scrollYProgress.on("change", update);
  }, [scrollYProgress]);

  useEffect(() => {
    const launch = Date.parse("2027-01-20T00:00:00+01:00");
    const checkDate = () => setReleased(Date.now() >= launch);
    checkDate();
    const timer = window.setInterval(checkDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="campaign">
      <noscript><style>{".chapter-inner{opacity:1!important}"}</style></noscript>
      <a className="skip-link" href="#le-parfum">Aller au parfum</a>

      <div className="backdrop" aria-hidden="true">
        <motion.div className="silk" style={{ scale: reducedMotion ? 1 : backdropScale }} />
        <div className="silk-shading" />
      </div>

      <header className="masthead flex items-center justify-between">
        <a className="brand flex items-center" href="#le-parfum" aria-label="Maison Julia, accueil">
          <Mark />
          <span>Maison Julia</span>
        </a>
        <nav className="main-nav" aria-label="Navigation principale">
          {chapters.map(({ id, label }, index) => (
            <a key={id} href={`#${id}`} aria-current={index === active ? "location" : undefined}>{label}</a>
          ))}
        </nav>
        <CalendarLink secondary />
      </header>

      <figure className="product-stage" aria-label="Flacon Julia en verre torsadé. Sa rotation suit le défilement.">
        <div className="product-model">
          <PerfumeScene progress={reducedMotion ? 0 : progress} onReady={onReady} />
        </div>
        <figcaption className="view-label">
          <span className="view-rule" /><Rotate3d size={16} strokeWidth={1.2} aria-hidden="true" />
          <span>Vue à 360°</span>
        </figcaption>
      </figure>

      <main ref={experience} className="chapters">
        <section className="chapter hero" id="le-parfum" aria-labelledby="hero-title">
          <motion.div className="chapter-inner" style={{ opacity: reducedMotion ? 1 : heroOpacity }}>
            <div className="chapter-heading">
              <p className="eyebrow">Nouvelle eau de parfum</p>
              <h1 className="hero-title" id="hero-title">Julia</h1>
            </div>
            <div className="chapter-detail">
              <p className="hero-line">Le rouge, <em>à fleur de peau.</em></p>
              <p className="release-line">{released ? "Dévoilée le" : "Révélation le"} <time dateTime="2027-01-20">20 janvier 2027</time>.</p>
              <a className="primary-link" href="#le-flacon">
                <Rotate3d size={18} strokeWidth={1.4} aria-hidden="true" />
                Explorer le flacon
              </a>
            </div>
          </motion.div>
        </section>

        <section className="chapter" id="le-flacon" aria-labelledby="bottle-title">
          <motion.div className="chapter-inner" style={{ opacity: reducedMotion ? 1 : bottleOpacity }}>
            <div className="chapter-heading">
              <p className="eyebrow">Le flacon</p>
              <h2 className="chapter-title" id="bottle-title">Le verre<br /><em>en mouvement.</em></h2>
            </div>
            <div className="chapter-detail">
              <p className="body-copy">Le rouge se devine entre les torsades du verre. À chaque rotation, la lumière dessine un nouveau relief.</p>
              <a className="text-link" href="#la-sortie">Découvrir la date</a>
            </div>
          </motion.div>
        </section>

        <section className="chapter" id="la-sortie" aria-labelledby="release-title">
          <motion.div className="chapter-inner" style={{ opacity: reducedMotion ? 1 : launchOpacity }}>
            <div className="chapter-heading">
              <p className="eyebrow">Le lancement</p>
              <h2 className="chapter-title launch-title" id="release-title">
                <time dateTime="2027-01-20">20 janvier<br /><em>2027.</em></time>
              </h2>
            </div>
            <div className="chapter-detail">
              <p className="body-copy">{released ? "Julia s’est dévoilée le 20 janvier 2027." : "Le premier rendez-vous avec Julia."}</p>
              <CalendarLink />
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="chapter-bar flex items-center justify-between">
        <a className="scroll-link" href={`#${chapters[lastChapter ? 0 : active + 1].id}`}>
          <span className="scroll-icon">{lastChapter ? <RotateCcw size={17} /> : <Mouse size={18} strokeWidth={1.3} />}</span>
          <span>{lastChapter ? "Revoir le parfum" : "Défiler pour explorer"}</span>
          {!lastChapter && <ChevronsDown size={12} strokeWidth={1.3} aria-hidden="true" />}
        </a>
        <nav className="chapter-index flex items-center" aria-label="Chapitres de l’expérience">
          <span className="chapter-count" aria-hidden="true"><strong>0{active + 1}</strong><i>/</i>03</span>
          <div className="chapter-ticks flex items-center">
            {chapters.map(({ id, label }, index) => (
              <a key={id} href={`#${id}`} aria-label={label} aria-current={index === active ? "step" : undefined}><span /></a>
            ))}
          </div>
        </nav>
      </footer>
      <IntroLoader ready={ready} />
    </div>
  );
}
