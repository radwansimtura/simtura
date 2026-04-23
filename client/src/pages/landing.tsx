import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Stethoscope, Siren, Quote, User } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";
import { useAuth } from "@/hooks/use-auth";
import { SiteFooter } from "@/components/site-footer";

const TESTIMONIALS = [
  {
    quote:
      "It's the closest I've felt to the real call without being on one. The pause-and-decide flow rewires how you think under pressure.",
    name: "Maya Chen",
    role: "Paramedic · Year 3",
  },
  {
    quote:
      "We piloted Simtura with our nursing cohort for stroke recognition. Pass rates on the unit competency jumped noticeably the first month.",
    name: "Dr. Lisa Bowman",
    role: "RN, MSN · Clinical Educator",
  },
  {
    quote:
      "Finally a sim platform that doesn't feel like a quiz. The first-person video makes you commit to a decision before you can second-guess it.",
    name: "Marcus Reyes",
    role: "EMT-B · Houston FD",
  },
];

type Clip = { src: string; discipline: string };

const MONTAGE: Clip[] = [
  { src: "/videos/hero-nurse.mp4", discipline: "Nursing" },
  { src: "/videos/hero-clip-1.mp4", discipline: "Fire" },
  { src: "/videos/hero-clip-2.mp4", discipline: "Police" },
  { src: "/videos/hero-clip-3.mp4", discipline: "EMS" },
];

const CUT_MS = 5200;

export default function LandingPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % MONTAGE.length);
    }, CUT_MS);
    return () => clearInterval(t);
  }, [reduceMotion]);

  const current = MONTAGE[idx];
  const { user } = useAuth();

  return (
    <div className="bg-black text-white relative">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <img src={simturaLogo} alt="Simtura" className="h-9 w-auto" data-testid="img-logo" />
            <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
              <Link href="/ems" className="hover:text-white transition-colors" data-testid="link-nav-ems">EMS</Link>
              <Link href="/nursing" className="hover:text-white transition-colors" data-testid="link-nav-nursing">Nursing</Link>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/profile">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-5"
                    data-testid="button-nav-profile"
                  >
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    {user.name?.split(" ")[0] || "Profile"}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signin" className="hidden sm:inline-block text-sm text-white/70 hover:text-white transition-colors" data-testid="link-nav-signin">
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-5"
                      data-testid="button-nav-cta"
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO MONTAGE */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Crossfading clips */}
        <div className="absolute inset-0 z-0 bg-black">
          <AnimatePresence>
            <motion.video
              key={current.src + idx}
              className="absolute inset-0 h-full w-full object-cover"
              src={current.src}
              autoPlay
              muted
              playsInline
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.45 }, scale: { duration: CUT_MS / 1000, ease: "linear" } }}
              data-testid="video-hero-bg"
            />
          </AnimatePresence>
          {/* Soft overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/85" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold tracking-tight leading-[1.05] text-white text-5xl sm:text-6xl lg:text-7xl mb-5"
              data-testid="text-hero-headline"
            >
              Perfect the scene.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="text-base sm:text-lg text-white/75 mb-8 font-light flex flex-wrap items-baseline gap-x-1.5"
              data-testid="text-hero-subtitle"
            >
              <span>Immersive video simulations for</span>
              <span className="relative inline-flex h-[1.25em] min-w-[3.5em] items-baseline overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={current.discipline}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="font-semibold text-white"
                    data-testid={`text-hero-discipline-${current.discipline.toLowerCase()}`}
                  >
                    {current.discipline}.
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
            >
              <Link href={user ? "/ems" : "/signup"}>
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
                  data-testid="button-hero-primary"
                >
                  Start Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Cut indicator dots */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {MONTAGE.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 transition-all duration-500 ${
                i === idx ? "w-8 bg-white" : "w-3 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <button
          onClick={() => document.getElementById("disciplines")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-white/50 hover:text-white transition-colors"
          data-testid="button-scroll-down"
          aria-label="Scroll to disciplines"
        >
          <span className="text-[11px] uppercase tracking-[0.25em]">Explore</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* DISCIPLINES SECTION */}
      <section id="disciplines" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-24 sm:py-32 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4">
            Choose your path.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Two tracks built around real patient scenarios.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          <DisciplineCard
            href="/ems"
            videoSrc="/videos/ambulance-driving.mp4"
            label="Emergency Medical Services"
            title="EMS"
            description="Field response, primary assessments, and critical decisions for EMRs through Paramedics."
            icon={<Siren className="h-4 w-4" />}
            testId="card-ems"
          />
          <DisciplineCard
            href="/nursing"
            videoSrc="/videos/hospital-transport.mp4"
            label="Nursing"
            title="Nursing"
            description="Bedside care, neuro checks, and clinical reasoning for LPNs, RNs, and BSNs."
            icon={<Stethoscope className="h-4 w-4" />}
            testId="card-nursing"
          />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-24 sm:py-32 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">
            What people say
          </p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            Trusted by educators<br className="hidden sm:inline" /> and frontline crews.
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-7 backdrop-blur-sm hover:border-white/20 transition-colors h-full flex flex-col"
              data-testid={`testimonial-${i}`}
            >
              <Quote className="h-6 w-6 text-white/20 mb-4" />
              <blockquote className="text-white/85 text-[15px] leading-relaxed flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-white/50 mt-0.5">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-6 sm:px-10 pb-24 sm:pb-32 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5">
            Step into the call.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-8">
            Free forever — one scenario a day. Upgrade anytime for unlimited access.
          </p>
          <Link href={user ? "/ems" : "/signup"}>
            <Button
              size="lg"
              className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
              data-testid="button-cta-final"
            >
              {user ? "Continue training" : "Create your account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}

function DisciplineCard({
  href,
  videoSrc,
  label,
  title,
  description,
  icon,
  testId,
}: {
  href: string;
  videoSrc: string;
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  testId: string;
}) {
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
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] cursor-pointer transition-all duration-300 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        data-testid={testId}
      >
        <div className="relative h-72 sm:h-80 overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute top-5 left-5 flex items-center gap-2 text-white/80">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              {icon}
            </div>
            <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2 text-white">
              {title}
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-md">
              {description}
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
              Browse Scenarios
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
