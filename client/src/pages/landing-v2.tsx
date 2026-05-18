import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronDown,
  PlayCircle,
  Quote,
  Check,
  User,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import simturaLogo from "@/assets/simtura-logo.png";
import { useAuth } from "@/hooks/use-auth";
import { SiteFooter } from "@/components/site-footer";
import StructuredData from "@/components/structured-data";
import MobileNav from "@/components/MobileNav";
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

const WHY_IT_WORKS = [
  {
    num: "01",
    title: "Pressure.",
    body: "Passive review sticks in calm settings. Simtura encodes under realistic stakes — so recall fires when it counts.",
  },
  {
    num: "02",
    title: "Immersion.",
    body: "First-person video and live dispatch are the exact conditions the brain needs to encode procedural memory that holds in the field.",
  },
  {
    num: "03",
    title: "Precision.",
    body: "Grading in seconds reinforces the right decision before the memory sets. That's trained instinct — not just retained information.",
  },
];

const DEMO_ROUND = {
  scene: "Primary Assessment — Sports Injury",
  context: "22F soccer player. Elbow strike to left ribs. RR 32, SpO₂ 88%, diminished left breath sounds.",
  question: "Breathing is rapid and shallow with an SpO₂ of 88%. What do you apply and at what flow rate?",
  answer: "Non-rebreather mask at 15 LPM. SpO₂ of 88% requires maximum BLS oxygen delivery.",
  score: 96,
  feedback: [
    { type: "good" as const, text: "NRB at 15 LPM correct — highest O₂ concentration at the BLS level." },
    { type: "good" as const, text: "Identifying inadequate breathing, not just low SpO₂: critical distinction." },
    { type: "note" as const, text: "Nasal cannula is insufficient here — SpO₂ 88% demands a non-rebreather." },
  ],
  vitals: { hr: "124", spo2: "88", bp: "96/62" },
};

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
    price: "From $16",
    period: "/ seat / month",
    blurb: "Cohort-based licensing for schools, agencies, and healthcare organizations.",
    features: [
      "Single Cohort, Department, or Institution tiers",
      "Pay for your course, not the calendar year",
      "Individual student redemption codes",
      "Cohort dashboard & analytics",
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
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const { user, upgrade } = useAuth();

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
            <div className="flex items-center gap-2">
              <MobileNav />
              <img src={simturaLogo} alt="Simtura" className="h-9 w-auto" data-testid="img-logo" />
            </div>
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
              <Link href="/learn" className="hover:text-white transition-colors" data-testid="link-nav-learn">Learn</Link>
              <a href="#pricing" className="hover:text-white transition-colors" data-testid="link-nav-pricing">Pricing</a>
              <Link href="/organizations" className="hover:text-white transition-colors" data-testid="link-nav-organizations">For Organizations</Link>
              <Link href="/why-it-works" className="hover:text-white transition-colors" data-testid="link-nav-why-it-works">Why Simtura.ai Works</Link>
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
                  onClick={() => { try { (window as any).gtag?.("event", "cta_click", { location: "hero" }); } catch {} }}
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

      <ScenarioDemo />

      {/* WHY IT WORKS */}
      <section id="how-it-works" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-24 sm:py-32 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">Why it works</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">Evidence-based training.</h2>
        </div>
        <div className="grid md:grid-cols-3 border-t border-white/[0.07]">
          {WHY_IT_WORKS.map((item, i) => (
            <motion.div
              key={item.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className={`pt-9 ${i < WHY_IT_WORKS.length - 1 ? "md:pr-10 md:border-r border-white/[0.07]" : ""} ${i > 0 ? "md:pl-10" : ""}`}
            >
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/[0.18] mb-5 tabular-nums">{item.num}</div>
              <h3 className="text-[19px] font-semibold text-white leading-[1.3] tracking-[-0.01em] mb-3">{item.title}</h3>
              <p className="text-[15px] text-white/50 leading-[1.7]">{item.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-14 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <button className="inline-flex items-center justify-center gap-2 text-sm font-medium h-11 rounded-full bg-white text-black hover:bg-white/90 px-7 transition-colors">
              Try a scenario free <ArrowRight className="w-4 h-4" />
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

          {/* Billing toggle */}
          <div className="inline-flex items-center mt-8 rounded-full border border-white/10 bg-white/[0.04] p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === "monthly" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${billing === "annual" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
            >
              Annual
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${billing === "annual" ? "bg-green-500 text-white" : "bg-green-500/20 text-green-400"}`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PRICING.map((tier, i) => {
            const isProAnnual = tier.highlight && billing === "annual";
            const displayPrice = isProAnnual ? "$190" : tier.price;
            const displayPeriod = isProAnnual ? "/ year" : tier.period;
            return (
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
                <span className="text-4xl font-bold text-white">{displayPrice}</span>
                <span className="text-sm text-white/50">{displayPeriod}</span>
              </div>
              {isProAnnual && (
                <p className="text-xs text-green-400 mb-5">Save $38 vs monthly — 2 months free</p>
              )}
              {!isProAnnual && (tier.trust ? (
                <p className="text-xs text-white/40 mb-5">{tier.trust}</p>
              ) : (
                <div className="mb-5" />
              ))}
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <Check className="h-4 w-4 text-white/60 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.highlight ? (
                user ? (
                  <Button
                    onClick={() => { upgrade(billing); try { (window as any).gtag?.("event", "cta_click", { location: "pricing_pro" }); } catch {} }}
                    className="w-full h-11 rounded-full font-medium bg-white text-black hover:bg-white/90"
                    data-testid="button-pricing-pro"
                  >
                    {tier.cta}
                  </Button>
                ) : (
                  <Link href={tier.href}>
                    <Button
                      className="w-full h-11 rounded-full font-medium bg-white text-black hover:bg-white/90"
                      data-testid="button-pricing-pro"
                      onClick={() => { try { (window as any).gtag?.("event", "cta_click", { location: "pricing_pro" }); } catch {} }}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                )
              ) : (
                tier.name === "Free" ? (
                  <Link href={tier.href}>
                    <Button
                      className={`w-full h-11 rounded-full font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20`}
                      data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                      onClick={() => { try { (window as any).gtag?.("event", "cta_click", { location: "pricing_free" }); } catch {} }}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <Link href={tier.href}>
                    <Button
                      className={`w-full h-11 rounded-full font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20`}
                      data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                )
              )}
            </motion.div>
            );
          })}
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

function ScenarioDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputTextRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const charCountRef = useRef<HTMLSpanElement>(null);

  const typingAbortRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const videoEndHandlerRef = useRef<(() => void) | null>(null);

  const [frozen, setFrozen] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [phase, setPhase] = useState<"question" | "grading" | "result">("question");
  const [inputTyping, setInputTyping] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [scoreBarPct, setScoreBarPct] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const fill = progressFillRef.current;
    if (!video || !fill) return;
    let raf: number;
    const tick = () => {
      if (video.duration) fill.style.width = `${(video.currentTime / video.duration) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => { raf = requestAnimationFrame(tick); };
    const onStop = () => cancelAnimationFrame(raf);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onStop);
    video.addEventListener("ended", onStop);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("ended", onStop);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { startRound(); observer.disconnect(); }
    }, { threshold: 0.3 });
    observer.observe(root);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAll() {
    typingAbortRef.current = true;
    clearTimeout(typingTimerRef.current);
    clearTimeout(phaseTimerRef.current);
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    const video = videoRef.current;
    if (video && videoEndHandlerRef.current) {
      video.removeEventListener("ended", videoEndHandlerRef.current);
      videoEndHandlerRef.current = null;
    }
  }

  function countUp(target: number, duration: number) {
    const start = performance.now();
    const frame = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setScoreDisplay(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }

  function typeText(text: string, onDone: () => void) {
    typingAbortRef.current = false;
    if (inputTextRef.current) inputTextRef.current.innerHTML = '<span class="demo-cursor"></span>';
    if (charCountRef.current) charCountRef.current.textContent = "0 / 500";
    let i = 0;
    const tick = () => {
      if (typingAbortRef.current) return;
      if (i < text.length) {
        if (inputTextRef.current) inputTextRef.current.innerHTML = text.slice(0, ++i) + '<span class="demo-cursor"></span>';
        if (charCountRef.current) charCountRef.current.textContent = `${i} / 500`;
        typingTimerRef.current = setTimeout(tick, 28 + Math.random() * 22);
      } else {
        if (inputTextRef.current) inputTextRef.current.textContent = text;
        if (charCountRef.current) charCountRef.current.textContent = `${text.length} / 500`;
        onDone();
      }
    };
    tick();
  }

  function startRound() {
    const video = videoRef.current;
    if (!video) return;
    clearAll();
    setFrozen(false);
    setLivePaused(false);
    setPhase("question");
    setInputTyping(false);
    setShowSubmit(false);
    setScoreDisplay(0);
    setScoreBarPct(0);
    if (inputTextRef.current) inputTextRef.current.innerHTML = '<span class="demo-cursor"></span>';
    if (charCountRef.current) charCountRef.current.textContent = "0 / 500";
    if (progressFillRef.current) { progressFillRef.current.style.transition = "none"; progressFillRef.current.style.width = "0%"; }
    video.currentTime = 0;
    video.play().catch(() => {});
    const onEnded = () => {
      videoEndHandlerRef.current = null;
      setFrozen(true);
      setLivePaused(true);
      setInputTyping(true);
      typeText(DEMO_ROUND.answer, () => {
        setShowSubmit(true);
        phaseTimerRef.current = setTimeout(() => {
          setPhase("grading");
          phaseTimerRef.current = setTimeout(() => {
            setPhase("result");
            countUp(DEMO_ROUND.score, 900);
            setTimeout(() => setScoreBarPct(DEMO_ROUND.score), 80);
            phaseTimerRef.current = setTimeout(() => startRound(), 5000);
          }, 1100);
        }, 900);
      });
    };
    videoEndHandlerRef.current = onEnded;
    video.addEventListener("ended", onEnded, { once: true });
  }

  return (
    <section ref={rootRef} className="relative z-10 bg-black px-6 sm:px-10 py-[72px]">
      <style>{`
        .demo-cursor{display:inline-block;width:2px;height:14px;background:rgba(255,255,255,.7);vertical-align:middle;margin-left:1px;animation:demoBlink .55s step-end infinite}
        @keyframes demoBlink{0%,100%{opacity:1}50%{opacity:0}}
        .demo-live-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:demoPulse 1.8s ease infinite;flex-shrink:0;display:inline-block}
        .demo-live-dot.paused{background:rgba(255,255,255,.3);animation:none}
        @keyframes demoPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.4)}50%{opacity:.7;box-shadow:0 0 0 4px rgba(34,197,94,0)}}
        @keyframes demoSpin{to{transform:rotate(360deg)}}
        .demo-spinner{animation:demoSpin .7s linear infinite}
      `}</style>
      <div className="max-w-[1120px] mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">Assess. Decide. Learn.</h2>
        </div>
        <div className="flex flex-col rounded-[24px] overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 40px 100px rgba(0,0,0,.6)" }}>
          {/* VIDEO */}
          <div className="relative overflow-hidden bg-black" style={{ height: "clamp(180px, 48vw, 340px)" }}>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" src="/videos/s1-step5-breathing.mp4" muted playsInline />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.08) 50%, transparent 100%)" }} />
            <div className="absolute inset-0 z-10 flex flex-col">
              <div className="absolute top-[18px] left-5 flex items-center gap-[7px] text-[11px] font-semibold tracking-[0.06em]" style={{ color: "rgba(255,255,255,.45)" }}>
                <span className={`demo-live-dot${livePaused ? " paused" : ""}`} />
                {DEMO_ROUND.scene}
              </div>
              <div className="absolute inset-0 flex items-start justify-end pointer-events-none" style={{ background: "rgba(0,0,0,.4)", opacity: frozen ? 1 : 0, transition: "opacity .5s ease", padding: "22px 26px 18px 18px" }}>
                <div className="flex items-center gap-1.5 rounded-full text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5" style={{ background: "rgba(255,255,255,.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.8)" }}>
                  <span style={{ fontSize: "9px" }}>⏸</span> Paused
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex items-end justify-between" style={{ padding: "18px 28px 20px 24px", background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 100%)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,.4)" }}>Step</span>
                  <div className="flex gap-[3px] items-center">
                    {[0,1,2,3,4,5,6].map(i => (
                      <div key={i} style={{ width: i===2?"20px":"14px", height:"3px", borderRadius:"2px", background: i<2?"rgba(255,255,255,.5)":i===2?"#3b82f6":"rgba(255,255,255,.15)" }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-[18px] items-center">
                  {[{val:DEMO_ROUND.vitals.hr,label:"HR",alert:true},{val:DEMO_ROUND.vitals.spo2,label:"SpO₂",alert:true},{val:DEMO_ROUND.vitals.bp,label:"BP",alert:false}].map(v => (
                    <div key={v.label} className="text-right">
                      <div className="text-[17px] font-bold leading-none tabular-nums" style={{ color: v.alert?"#f97316":"rgba(255,255,255,.9)" }}>{v.val}</div>
                      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] mt-[3px]" style={{ color: "rgba(255,255,255,.3)" }}>{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTION PANEL */}
          <div className="relative min-h-[320px] sm:min-h-[220px]" style={{ borderTop: "1px solid rgba(255,255,255,.07)", background: "#070707" }}>
            {/* Question */}
            <div className="absolute inset-0 flex items-start sm:items-center justify-center overflow-y-auto px-5 py-5 sm:px-12 sm:py-7" style={{ opacity: phase==="question"?1:0, transform: phase==="question"?"translateY(0)":"translateY(8px)", transition: "opacity .4s ease, transform .4s ease", pointerEvents: phase==="question"?"auto":"none" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-14 w-full">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(255,255,255,.28)" }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[10px] h-[10px] opacity-50"><circle cx="8" cy="5" r="2.5"/><path strokeLinecap="round" d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>
                    Patient Presentation
                  </div>
                  <p className="text-[13px] leading-[1.7] mb-5" style={{ color: "rgba(255,255,255,.4)" }}>{DEMO_ROUND.context}</p>
                  <p className="text-[16px] font-semibold leading-[1.55] tracking-[-0.01em]" style={{ color: "rgba(255,255,255,.95)" }}>{DEMO_ROUND.question}</p>
                </div>
                <div className="flex flex-col">
                  <div className="rounded-[10px] mb-3" style={{ background: "rgba(255,255,255,.04)", border: inputTyping?"1px solid rgba(255,255,255,.25)":"1px solid rgba(255,255,255,.12)", padding: "12px 14px", minHeight: "88px", transition: "border-color .3s" }}>
                    <div ref={inputTextRef} className="text-[13.5px] leading-[1.65]" style={{ color: "rgba(255,255,255,.8)" }}><span className="demo-cursor" /></div>
                  </div>
                  <div className="flex items-center justify-between mb-[10px]">
                    <button className="flex items-center gap-1.5 text-[12.5px] font-medium rounded-lg" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", padding: "6px 12px", color: "rgba(255,255,255,.6)" }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path strokeLinecap="round" d="M8 2a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V4a2 2 0 0 1 2-2z"/><path strokeLinecap="round" d="M4 8a4 4 0 0 0 8 0M8 12v2M6 14h4"/></svg>
                      Speak
                    </button>
                    <span ref={charCountRef} className="text-[11.5px]" style={{ color: "rgba(255,255,255,.25)" }}>0 / 500</span>
                  </div>
                  <button className="w-full flex items-center justify-center rounded-lg text-[13.5px] font-semibold text-white mb-2" style={{ background: "#3b82f6", height: "40px", border: "none", opacity: showSubmit?1:0, transform: showSubmit?"translateY(0)":"translateY(4px)", transition: "opacity .3s, transform .3s", cursor: "default" }}>
                    Submit for AI Grading
                  </button>
                  <button className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium py-1" style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", cursor: "default" }}>
                    💡 Hint
                  </button>
                </div>
              </div>
            </div>
            {/* Grading */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: phase==="grading"?1:0, transform: phase==="grading"?"translateY(0)":"translateY(8px)", transition: "opacity .4s ease, transform .4s ease", pointerEvents: "none" }}>
              <div className="flex flex-col items-center">
                <div className="demo-spinner w-[26px] h-[26px] rounded-full mb-3.5" style={{ border: "2px solid rgba(255,255,255,.07)", borderTopColor: "#3b82f6" }} />
                <div className="text-[13px] tracking-[0.04em]" style={{ color: "rgba(255,255,255,.35)" }}>Grading your response…</div>
              </div>
            </div>
            {/* Result */}
            <div className="absolute inset-0 flex items-start sm:items-center justify-center overflow-y-auto px-5 py-5 sm:px-12 sm:py-7" style={{ opacity: phase==="result"?1:0, transform: phase==="result"?"translateY(0)":"translateY(8px)", transition: "opacity .4s ease, transform .4s ease", pointerEvents: phase==="result"?"auto":"none" }}>
              <div className="w-full grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-12 items-start">
                <div className="flex flex-col">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Score</div>
                  <div className="flex items-baseline gap-1.5 mb-2.5">
                    <span className="text-[56px] font-extrabold leading-none tabular-nums" style={{ letterSpacing: "-.04em" }}>{scoreDisplay}</span>
                    <span className="text-[18px]" style={{ color: "rgba(255,255,255,.25)" }}>/ 100</span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,.07)" }}>
                    <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #3b82f6, #22c55e)", width: `${scoreBarPct}%`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
                  </div>
                  <button onClick={startRound} className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.04em]" style={{ color: "rgba(255,255,255,.4)", background: "none", border: "none" }}>
                    Next decision point
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {DEMO_ROUND.feedback.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.6]" style={{ color: f.type==="good"?"rgba(134,239,172,.8)":"rgba(253,224,71,.7)" }}>
                      <span className="text-[11px] mt-0.5 shrink-0">{f.type==="good"?"✓":"→"}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.05)" }}>
          <div ref={progressFillRef} className="h-full rounded-full" style={{ background: "rgba(59,130,246,.45)", width: "0%" }} />
        </div>
      </div>
    </section>
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
