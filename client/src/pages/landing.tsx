import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Stethoscope,
  Siren,
  Activity,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import simturaLogo from "@assets/Screenshot_2026-02-17_at_3.35.49_PM_1772603261236.png";

const HERO_PHRASES = [
  "Train EMS responders.",
  "Train nursing teams.",
  "Train your entire workforce.",
];

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@*<>/\\";

function useScrambleText(phrases: string[], holdMs = 2200, scrambleMs = 900, enabled = true) {
  const [text, setText] = useState(phrases[0]);
  const idxRef = useRef(0);
  useEffect(() => {
    if (!enabled) {
      setText(phrases[0]);
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const next = () => {
      const from = phrases[idxRef.current];
      idxRef.current = (idxRef.current + 1) % phrases.length;
      const to = phrases[idxRef.current];
      const start = performance.now();
      const len = Math.max(from.length, to.length);
      const reveal = new Array(len).fill(0).map((_, i) => Math.random() * 0.6 + i / len * 0.4);
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / scrambleMs);
        let out = "";
        for (let i = 0; i < len; i++) {
          const target = to[i] || " ";
          if (t >= reveal[i]) {
            out += target;
          } else if (target === " ") {
            out += " ";
          } else {
            out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
        }
        setText(out);
        if (t < 1) raf = requestAnimationFrame(tick);
        else timer = setTimeout(next, holdMs);
      };
      raf = requestAnimationFrame(tick);
    };
    timer = setTimeout(next, holdMs);
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [phrases, holdMs, scrambleMs, enabled]);
  return text;
}

function DataLine({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/50"
    >
      <span className="h-1 w-1 rounded-full bg-cyan-400" />
      <span className="text-white/35">{label}</span>
      <span className="text-white/70">{value}</span>
    </motion.div>
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const headline = useScrambleText(HERO_PHRASES, 2200, 900, !reduceMotion);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduceMotion) {
      v.pause();
      return;
    }
    v.playbackRate = 0.75;
    v.play().catch(() => {});
  }, [reduceMotion]);

  return (
    <div className="bg-black text-white relative overflow-hidden">
      {/* Sticky top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-4 flex h-12 items-center justify-between gap-4 rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-5">
            <div className="flex items-center gap-2">
              <img src={simturaLogo} alt="Simtura" className="h-6 brightness-0 invert" data-testid="img-logo" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 hidden sm:inline">v2.4</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
              <a href="#disciplines" className="hover:text-white transition-colors" data-testid="link-nav-system">System</a>
              <Link href="/ems" className="hover:text-white transition-colors" data-testid="link-nav-ems">EMS</Link>
              <Link href="/nursing" className="hover:text-white transition-colors" data-testid="link-nav-nursing">Nursing</Link>
              <a href="#disciplines" className="hover:text-white transition-colors" data-testid="link-nav-about">About</a>
            </div>
            <Link href="/ems">
              <Button
                size="sm"
                className="h-8 rounded-full bg-cyan-400 text-black hover:bg-cyan-300 font-medium px-4"
                data-testid="button-nav-cta"
              >
                Start Training
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background video */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            data-testid="video-hero-bg"
          >
            <source src="/videos/ambulance-driving.mp4" type="video/mp4" />
          </video>
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-black/30" />
          {/* Scanlines */}
          <div
            className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
            }}
          />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.8'/></svg>\")",
            }}
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,black_100%)]" />
        </div>

        {/* HUD top-left status */}
        <div className="absolute top-24 left-4 sm:left-8 z-10 space-y-1.5 hidden sm:block">
          <DataLine label="SYS" value="SIMTURA.AI //" delay={0.4} />
          <DataLine label="MODE" value="LIVE SIMULATION" delay={0.55} />
          <DataLine label="GEO" value="FIELD + CLINICAL" delay={0.7} />
        </div>

        {/* HUD top-right status */}
        <div className="absolute top-24 right-4 sm:right-8 z-10 space-y-1.5 text-right hidden sm:block">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 flex items-center justify-end gap-2"
          >
            <Activity className="h-3 w-3 text-cyan-400" />
            <span>BIO_FEED · 72 BPM</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40"
          >
            CH-01 · DISPATCH ACTIVE
          </motion.div>
        </div>

        {/* Center hero content */}
        <div className="relative z-10 flex h-full flex-col items-start justify-center px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm mb-6"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-medium">
              AI · Clinical Simulation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6 max-w-4xl"
            data-testid="text-hero-title"
          >
            <span className="block text-white/95">An intelligent bridge</span>
            <span className="block text-white/95">connecting the field</span>
            <span className="block">
              <span className="text-white/40">to </span>
              <span className="text-cyan-400">clinical mastery.</span>
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="font-mono text-base sm:text-lg text-white/70 mb-10 min-h-[1.5em]"
            data-testid="text-hero-scramble"
          >
            <span className="text-cyan-400 mr-2">&gt;</span>
            <span>{headline}</span>
            <span className="ml-1 inline-block h-4 w-2 align-middle bg-cyan-400 animate-pulse" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link href="/ems">
              <Button
                size="lg"
                className="h-12 rounded-full bg-cyan-400 text-black hover:bg-cyan-300 font-semibold px-6 group"
                data-testid="button-hero-primary"
              >
                Start Training
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a
              href="#disciplines"
              className="h-12 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white/90 font-medium px-5 transition-colors"
              data-testid="button-hero-secondary"
            >
              Explore Disciplines
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>

        {/* Bottom HUD bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 sm:gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <span className="hidden sm:inline">6 SCENARIOS</span>
              <span className="hidden sm:inline">2 DISCIPLINES</span>
              <span className="hidden md:inline">AI-GRADED</span>
            </div>
            <button
              onClick={() => document.getElementById("disciplines")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-white transition-colors"
              data-testid="button-scroll-down"
            >
              SCROLL <ChevronDown className="h-3 w-3 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* DISCIPLINES SECTION */}
      <section
        id="disciplines"
        className="relative z-10 min-h-screen px-4 sm:px-8 lg:px-16 py-24 max-w-7xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 sm:mb-16 max-w-3xl"
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400 mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-cyan-400" />
            02 · DISCIPLINES
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
            Pick your <span className="text-white/40">arena.</span>
          </h2>
          <p className="text-white/60 text-lg max-w-xl">
            Two cinematic training tracks built around real patient scenarios — from the back of an
            ambulance to the bedside.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DisciplineCard
            href="/ems"
            videoSrc="/videos/ambulance-driving.mp4"
            label="01 · Emergency Medical Services"
            title="Field response."
            subtitle="EMR · EMT · AEMT · Paramedic"
            description="Sports injury, asthma, MVC, cardiac arrest — primary assessments and critical decisions in the back of the rig."
            icon={<Siren className="h-4 w-4" />}
            accent="cyan"
            testId="card-ems"
          />
          <DisciplineCard
            href="/nursing"
            videoSrc="/videos/hospital-transport.mp4"
            label="02 · Nursing"
            title="Bedside care."
            subtitle="LPN · RN · BSN"
            description="Stroke recognition, neuro checks, interdisciplinary handoff — clinical reasoning from triage through ICU transfer."
            icon={<Stethoscope className="h-4 w-4" />}
            accent="emerald"
            testId="card-nursing"
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={simturaLogo} alt="Simtura" className="h-5 brightness-0 invert opacity-70" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              SIMTURA.AI · 2026
            </span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Bridging classroom to clinical practice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function DisciplineCard({
  href,
  videoSrc,
  label,
  title,
  subtitle,
  description,
  icon,
  accent,
  testId,
}: {
  href: string;
  videoSrc: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "emerald";
  testId: string;
}) {
  const accentText = accent === "cyan" ? "text-cyan-400" : "text-emerald-400";
  const accentBorder = accent === "cyan" ? "hover:border-cyan-400/40 focus-within:border-cyan-400/60" : "hover:border-emerald-400/40 focus-within:border-emerald-400/60";
  const accentShadow = accent === "cyan" ? "hover:shadow-cyan-500/10" : "hover:shadow-emerald-500/10";
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const playPreview = () => {
    if (reduceMotion) return;
    videoRef.current?.play().catch(() => {});
  };
  const pausePreview = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <Link href={href}>
      <motion.div
        whileHover={reduceMotion ? undefined : { y: -4 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={playPreview}
        onMouseLeave={pausePreview}
        onFocus={playPreview}
        onBlur={pausePreview}
        onTouchStart={playPreview}
        tabIndex={0}
        className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] cursor-pointer transition-all duration-300 ${accentBorder} hover:shadow-2xl ${accentShadow} focus:outline-none focus-visible:ring-2 ${accent === "cyan" ? "focus-visible:ring-cyan-400/60" : "focus-visible:ring-emerald-400/60"}`}
        data-testid={testId}
      >
        <div className="relative h-72 sm:h-80 overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/40 backdrop-blur-sm ${accentText}`}>
              {icon}
            </div>
            <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accentText}`}>
              {label}
            </span>
          </div>
        </div>
        <div className="relative p-6 sm:p-8 -mt-16">
          <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1 text-white">
            {title}
          </h3>
          <p className={`font-mono text-[11px] uppercase tracking-[0.22em] mb-4 ${accentText}`}>
            {subtitle}
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-5 max-w-md">
            {description}
          </p>
          <div className={`inline-flex items-center gap-2 text-sm font-medium ${accentText}`}>
            Browse Scenarios
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
