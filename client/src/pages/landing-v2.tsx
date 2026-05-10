import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronDown,
  PlayCircle,
  Eye,
  Brain,
  Gauge,
  Quote,
  Check,
  User,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";
import { useAuth } from "@/hooks/use-auth";
import { SiteFooter } from "@/components/site-footer";
import StructuredData from "@/components/structured-data";
import { organizationSchema, softwareApplicationSchema, faqSchema, websiteSchema } from "@/structured-data/schemas";

type Clip = { src: string; discipline: string };

const MONTAGE: Clip[] = [
  { src: "/videos/hero-nurse.mp4", discipline: "Nursing" },
  { src: "/videos/hero-clip-1.mp4", discipline: "Fire" },
  { src: "/videos/hero-clip-2.mp4", discipline: "Police" },
  { src: "/videos/hero-clip-3.mp4", discipline: "EMS" },
];

const CUT_MS = 5200;

interface Testimonial {
  quote: string;
  boldPhrase?: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "It's the closest I've felt to the real call without being on one. The pause-and-decide flow rewires how you think under pressure.",
    name: "Maya Chen",
    role: "Paramedic · Year 3",
  },
  {
    quote: "We piloted Simtura with our nursing cohort for stroke recognition. Pass rates on the unit competency jumped noticeably the first month.",
    boldPhrase: "Pass rates on the unit competency jumped noticeably",
    name: "Dr. Lisa Bowman",
    role: "RN, MSN · Clinical Educator",
  },
  {
    quote: "Finally a sim platform that doesn't feel like a quiz. The first-person video makes you commit before you can second-guess yourself.",
    name: "Marcus Reyes",
    role: "EMT-B · Houston FD",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Watch the call unfold.",
    body: "Step into a first-person scene — dispatch tones, scene size-up, patient contact. Real video, not a slideshow.",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Decide under pressure.",
    body: "The video pauses at every critical decision point. You commit to an answer — no peeking, no second-guessing.",
  },
  {
    icon: <Gauge className="h-5 w-5" />,
    title: "Get instant feedback.",
    body: "NREMT-aligned grading explains why each call mattered, what the protocol says, and what would have happened next.",
  },
];

interface PricingTier {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
  trust?: string;
}

const PRICING: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "One scenario per day. No card required.",
    features: [
      "1 scenario per day",
      "Full first-person video",
      "Instant feedback on every step",
    ],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    blurb: "Unlimited scenarios. For students prepping for boards.",
    features: [
      "Unlimited scenarios",
      "NREMT- and NCLEX-aligned grading",
      "Performance dashboard",
      "Cancel anytime",
    ],
    cta: "Go Pro",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Programs",
    price: "$21",
    period: "/ seat / month",
    blurb: "Bulk licenses for schools, agencies, and shift crews.",
    features: [
      "From $21/seat/mo (50+ seats)",
      "Pay only for your course duration",
      "Single-code redemption",
      "Cohort dashboard",
    ],
    cta: "Request a quote",
    href: "/contact?ref=programs",
    highlight: false,
    trust: "Custom quotes available — contact sales",
  },
];

// Reordered: most conversion-critical first
const FAQ = [
  {
    q: "Can I try a scenario before paying?",
    a: "Yes — one scenario per day is always free, no credit card required. Upgrade to Pro for unlimited access.",
  },
  {
    q: "Do these scenarios count toward clinical hours?",
    a: "Simtura is a decision-making trainer, not a clinical hours substitute. Many programs use it as adjunct prep before live sim lab and field internships. Check with your program coordinator about credit.",
  },
  {
    q: "How does organization licensing work?",
    a: "You buy seats in bulk, get a code per seat, and distribute them to your students or crew. Everyone redeems independently and you see redemption status in one dashboard.",
  },
  {
    q: "Who writes and reviews the content?",
    a: "Every scenario is built and reviewed by NREMT-certified paramedics and practicing RNs, then mapped to the relevant board exam objectives (NREMT for EMS, NCLEX for nursing).",
  },
  {
    q: "Does this work on my phone?",
    a: "Yes — fully responsive. That said, the video is the whole experience, so most users prefer a tablet or laptop for the immersion.",
  },
];

const DISCIPLINES = [
  { label: "EMS", href: "/ems" },
  { label: "Nursing", href: "/nursing" },
  { label: "Fire", href: "/fire" },
  { label: "Police", href: "/police" },
];

export default function LandingPageV2() {
  const reduceMotion = useReducedMotion() ?? false;
  const [idx, setIdx] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % MONTAGE.length);
    }, CUT_MS);
    return () => clearInterval(t);
  }, [reduceMotion]);

  const current = MONTAGE[idx];

  return (
    <div className="bg-black text-white relative">
      <StructuredData schema={organizationSchema} id="schema-organization" />
      <StructuredData schema={softwareApplicationSchema} id="schema-software" />
      <StructuredData schema={faqSchema} id="schema-faq" />
      <StructuredData schema={websiteSchema} id="schema-website" />

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <img src={simturaLogo} alt="Simtura" className="h-9 w-auto" data-testid="img-logo" />
            <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
              {/* Disciplines dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-white transition-colors text-white/70 text-sm">
                  Disciplines
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-2 w-44 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 shadow-xl z-50">
                  {DISCIPLINES.map(({ label, href }) => (
                    <Link key={href} href={href} className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              <a href="#pricing" className="hover:text-white transition-colors" data-testid="link-nav-pricing">Pricing</a>
              <Link href="/organizations" className="hover:text-white transition-colors" data-testid="link-nav-organizations">For Organizations</Link>
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
                      className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5"
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

      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/85" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 h-full flex items-center px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">

          <div className="max-w-xl">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {MONTAGE.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 transition-all duration-500 ${
                i === idx ? "w-8 bg-white" : "w-3 bg-white/30"
              }`}
            />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-24 sm:py-32 max-w-6xl mx-auto">
        <div className="text-center mb-14 sm:mb-20">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">How it works</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            Three steps. Zero hand-holding.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-7"
              data-testid={`step-${i + 1}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                  {step.icon}
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">Step {i + 1}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{step.title}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <button className="inline-flex items-center justify-center gap-2 text-sm font-medium h-11 rounded-full bg-white text-black hover:bg-white/90 px-7 transition-colors">
              Try a scenario free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/scenarios" className="text-sm text-white/60 hover:text-white transition-colors underline underline-offset-4">
            View scenario library →
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-20 sm:py-28 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">What people say</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            Trusted by educators<br className="hidden sm:inline" /> and frontline crews.
          </h2>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            Used by EMS programs, nursing schools, and fire academies nationwide
          </div>
        </div>

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
                {t.boldPhrase ? (
                  <>
                    "{t.quote.split(t.boldPhrase)[0]}
                    <strong className="text-white">{t.boldPhrase}</strong>
                    {t.quote.split(t.boldPhrase)[1]}"
                  </>
                ) : (
                  `"${t.quote}"`
                )}
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-white/50 mt-0.5">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-24 sm:py-32 max-w-6xl mx-auto">
        <div className="text-center mb-14 sm:mb-20">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">Pricing</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4">
            Simple. Transparent. No surprises.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PRICING.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                tier.highlight
                  ? "border-white/40 bg-white/[0.06]"
                  : "border-white/10 bg-white/[0.025]"
              }`}
              data-testid={`pricing-${tier.name.toLowerCase()}`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white text-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 font-semibold">
                  Most popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <p className="text-sm text-white/60 mt-1">{tier.blurb}</p>
              </div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-white/50">{tier.period}</span>
              </div>
              {tier.trust ? (
                <p className="text-xs text-white/40 mb-5">{tier.trust}</p>
              ) : (
                <div className="mb-5" />
              )}
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <Check className="h-4 w-4 text-white/60 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.href}>
                <Button
                  className={`w-full h-11 rounded-full font-medium ${
                    tier.highlight
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  }`}
                  data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                >
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-20 sm:py-28 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">FAQ</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            Questions, answered.
          </h2>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {FAQ.map((item, i) => (
            <FaqRow key={item.q} item={item} index={i} defaultOpen={i === 0} />
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-white/55">
          Still have questions?{" "}
          <Link href="/contact" className="text-white underline underline-offset-4 hover:text-white/80" data-testid="link-faq-contact">
            Talk to us
          </Link>
          .
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
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={user ? "/ems" : "/signup"}>
              <Button
                size="lg"
                className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
                data-testid="button-cta-final-primary"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Try a scenario free
              </Button>
            </Link>
            <Link href={user ? "/ems" : "/signup"}>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 font-medium px-6"
                data-testid="button-cta-final-secondary"
              >
                {user ? "Continue training" : "Create your account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FaqRow({
  item,
  index,
  defaultOpen = false,
}: {
  item: { q: string; a: string };
  index: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left"
        data-testid={`faq-toggle-${index}`}
        aria-expanded={open}
      >
        <span className="text-base sm:text-lg font-medium text-white">{item.q}</span>
        <span className="shrink-0 text-white/60">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white/65 leading-relaxed pt-3" data-testid={`faq-answer-${index}`}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
