import { Fragment } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import MobileNav from "@/components/MobileNav";
import DesktopNav from "@/components/DesktopNav";
import simturaLogo from "@/assets/simtura-logo.png";
import {
  Eye,
  Brain,
  Calendar,
  AlertCircle,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

interface Principle {
  number: number;
  name: string;
  icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
  principle: React.ReactNode;
  implementation: React.ReactNode;
  research: React.ReactNode;
}

const PRINCIPLES: Principle[] = [
  {
    number: 1,
    name: "Scenario-based learning",
    icon: Eye,
    iconWrap: "bg-teal-500/15 border-teal-500/30",
    iconColor: "text-teal-400",
    principle: (
      <>
        Knowledge practiced only in the abstract — multiple choice in isolation — doesn&rsquo;t transfer well to the bedside. The closer practice gets to the actual conditions of performance, the more durable and transferable the resulting skill becomes.
      </>
    ),
    implementation: (
      <>
        Beyond the Practice NREMT Quiz, our scenario simulations put you in realistic patient encounters: full case stems with vitals, history, dispatch, and decision points across primary assessment, intervention, and reassessment. You make the same calls you&rsquo;ll make in the field, in the same sequence.
      </>
    ),
    research: (
      <>
        Cook et al. (2011), <em>Technology-enhanced simulation for health professions education: A systematic review and meta-analysis</em>, JAMA. Meta-analysis of 609 studies showing simulation-based training produces meaningful improvements in knowledge, skills, and patient outcomes compared to no intervention.
      </>
    ),
  },
  {
    number: 2,
    name: "Retrieval practice (the testing effect)",
    icon: Brain,
    iconWrap: "bg-blue-500/15 border-blue-500/30",
    iconColor: "text-blue-400",
    principle: (
      <>
        Pulling information <em>out of</em> your head builds memory more durably than reading information <em>into</em> it. Active recall under effort strengthens what you know and surfaces what you only thought you did.
      </>
    ),
    implementation: (
      <>
        Every question in Practice NREMT Quiz mode is retrieval practice. You&rsquo;re not re-reading the textbook chapter on cardiac arrest; you&rsquo;re being asked to commit to an answer and find out if you were right.
      </>
    ),
    research: (
      <div className="space-y-3">
        <p>
          Roediger & Karpicke (2006), <em>Test-Enhanced Learning</em>, Psychological Science.
        </p>
        <p>
          Dunlosky et al. (2013), <em>Improving Students&rsquo; Learning With Effective Learning Techniques</em>, Psychological Science in the Public Interest — practice testing was rated one of only two &ldquo;high utility&rdquo; study techniques out of ten reviewed.
        </p>
      </div>
    ),
  },
  {
    number: 3,
    name: "Spaced repetition (the spacing effect)",
    icon: Calendar,
    iconWrap: "bg-purple-500/15 border-purple-500/30",
    iconColor: "text-purple-400",
    principle: (
      <>
        Reviews distributed across days build stronger memory than the same total time spent in one session. The optimal moment to review is just before you&rsquo;d forget — late enough to require effort, early enough to still recover the memory.
      </>
    ),
    implementation: (
      <>
        Flashcards in your queue are scheduled by FSRS (Free Spaced Repetition Scheduler), an open-source algorithm that calculates per-card review intervals from your performance history. Cards you struggle with come back sooner; cards you nail get pushed further out.
      </>
    ),
    research: (
      <>
        Cepeda et al. (2008), <em>Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention</em>, Psychological Science. The definitive study on optimal spacing intervals.
      </>
    ),
  },
  {
    number: 4,
    name: "Mistake-driven content",
    icon: AlertCircle,
    iconWrap: "bg-amber-500/15 border-amber-500/30",
    iconColor: "text-amber-400",
    principle: (
      <>
        Studying material you already know is comfortable but inefficient. The most informative content is the content surfaced by your own errors.
      </>
    ),
    implementation: (
      <>
        Steps you miss in scenario simulations become flashcards in your spaced-repetition queue, prioritized at the top. Your study queue reflects your actual gaps, not a generic curriculum.
      </>
    ),
    research: (
      <>
        Metcalfe (2017), <em>Learning from Errors</em>, Annual Review of Psychology. Reviews decades of research showing that learners who make errors and receive feedback outperform learners who avoided them.
      </>
    ),
  },
  {
    number: 5,
    name: "Calibrated to the NREMT blueprint",
    icon: Target,
    iconWrap: "bg-red-500/15 border-red-500/30",
    iconColor: "text-red-400",
    principle: (
      <>
        Practice that mirrors the test you&rsquo;re preparing for transfers better than practice on adjacent material. The NREMT EMT exam weights questions across five categories at known proportions; effective practice should match those proportions.
      </>
    ),
    implementation: (
      <>
        Each 25-question Practice NREMT Quiz session draws from the bank with category weights matching the published NREMT EMT Examination Content Outline (Airway, Cardiology, Trauma, Medical, Operations). The end-of-session breakdown shows your performance per category.
      </>
    ),
    research: (
      <>
        National Registry of Emergency Medical Technicians, <em>EMT Examination Content Outline</em>. The public document specifying content area percentages on the NREMT EMT exam.
      </>
    ),
  },
  {
    number: 6,
    name: "Adaptive difficulty",
    icon: TrendingUp,
    iconWrap: "bg-green-500/15 border-green-500/30",
    iconColor: "text-green-400",
    principle: (
      <>
        Learning happens fastest in the zone where material is challenging enough to require effort but not so hard that you&rsquo;re guessing. Effective learning systems hold you at the edge of your competence.
      </>
    ),
    implementation: (
      <>
        Within a quiz session, question difficulty shifts based on your recent performance per category. A strong run on Cardiology pushes you to harder Cardiology questions; struggling on Trauma backs you off to consolidate. Every session stays at your productive struggle zone.
      </>
    ),
    research: (
      <>
        Lomas et al. (2017), <em>Is Difficulty Overrated? The Effects of Choice, Novelty and Suspense on Intrinsic Motivation in Educational Games</em>, CHI Conference on Human Factors in Computing Systems.
      </>
    ),
  },
];

interface Scenario {
  id: string;
  published: boolean;
}

const PULL_QUOTES: Record<number, string> = {
  1: "Studying material you already know is comfortable but inefficient.",
  3: "The closer practice gets to the actual conditions of performance, the more durable the resulting skill becomes.",
  5: "Credibility in this field is too easy to lose by overreaching.",
};

export default function WhyItWorksPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: scenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios"],
    queryFn: async () => {
      const res = await fetch("/api/scenarios");
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      return res.json();
    },
  });

  const scenarioCount = scenarios?.length;
  const stats: Array<{ value: string; label: string }> = [
    {
      value: scenarioCount != null ? `${scenarioCount}+` : "—",
      label: "AI-illustrated patient scenarios",
    },
    { value: "6", label: "evidence-based principles" },
    { value: "Adaptive", label: "difficulty per category" },
    { value: "Personalized", label: "review schedule" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <Link href="/">
              <img src={simturaLogo} alt="Simtura.ai" className="h-9 w-auto cursor-pointer" />
            </Link>
            <DesktopNav />
            <div className="flex items-center gap-3">
              <MobileNav />
              {user ? (
                <Link href="/profile">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-5"
                  >
                    {user.name?.split(" ")[0] || "Profile"}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signin" className="hidden sm:inline-block text-sm text-white/70 hover:text-white transition-colors">
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5"
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

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-24"
      >
        {/* Hero */}
        <div className="relative isolate text-center mb-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-[700px] h-[500px] rounded-full blur-3xl opacity-60"
              style={{
                background:
                  "radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(147,51,234,0.35) 35%, rgba(20,184,166,0.15) 60%, transparent 80%)",
              }}
            />
          </div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-6">Evidence</div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Why Simtura.ai Works
          </h1>
          <h2 className="text-xl sm:text-2xl text-white/60 font-normal mb-8">
            The science behind Simtura.ai
          </h2>
          <div className="w-16 h-px bg-white/20 mx-auto my-10" />
          <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-4 max-w-2xl mx-auto">
            You don&rsquo;t need another flashcard app or another question bank. You need a study tool that respects how the human brain actually learns — and that builds the kind of confidence you need when a critical patient is in front of you.
          </p>
          <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            This page walks through the cognitive science principles Simtura.ai is built on, what we implement from each, and what the research actually says. The evidence behind every method is why you can put your trust in Simtura.ai.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-16 max-w-3xl mx-auto">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-5 text-center"
            >
              <div className="text-3xl font-semibold text-white mb-1">{s.value}</div>
              <div className="text-xs text-white/50 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Principles */}
        <h3 className="text-xl font-semibold mt-12 mb-6">Six principles, six citations</h3>
        <div>
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            const quote = PULL_QUOTES[i];
            return (
              <Fragment key={p.number}>
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 mb-4 backdrop-blur-md">
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${p.iconWrap}`}
                    >
                      <Icon className={`w-5 h-5 ${p.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {p.number}. {p.name}
                    </h3>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">The principle</div>
                  <p className="text-sm text-white/80 leading-relaxed mb-4">{p.principle}</p>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">How Simtura.ai implements it</div>
                  <p className="text-sm text-white/80 leading-relaxed mb-4">{p.implementation}</p>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">The research</div>
                  <div className="text-sm text-white/80 leading-relaxed">{p.research}</div>
                </div>
                {quote && (
                  <div className="my-12 max-w-2xl mx-auto text-center">
                    <p className="text-xl sm:text-2xl text-white/70 leading-relaxed italic font-serif">
                      &ldquo;{quote}&rdquo;
                    </p>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* What we're not claiming */}
        <div className="my-16 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-semibold mb-6 text-center">
            What we&rsquo;re not claiming
          </h3>
          <div className="space-y-6 max-w-2xl mx-auto text-base sm:text-lg text-white/80 leading-relaxed">
            <p>
              Simtura.ai is built on principles that decades of cognitive science research supports. But the platform itself is new — we&rsquo;re in pre-beta, and we haven&rsquo;t yet collected outcome data to compare our users&rsquo; NREMT pass rates against any baseline.
            </p>
            <p>
              When we have that data, we&rsquo;ll publish it here. Until then, our claim is that the building blocks are sound. The proof that we&rsquo;ve assembled them well into a tool that produces better outcomes than the alternatives is still being collected — by you, our early users.
            </p>
            <p>
              What we are saying: the methods we&rsquo;ve chosen are the methods the research actually supports. If you&rsquo;d rather study with tools built on what works, you&rsquo;re in the right place.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center py-16 mt-12">
          <img
            src={simturaLogo}
            alt="Simtura.ai"
            className="h-12 w-auto mx-auto mb-8 opacity-80"
          />
          <h2 className="text-3xl sm:text-4xl font-semibold mb-3">Built on what works.</h2>
          <p className="text-base sm:text-lg text-white/60 mb-8 max-w-md mx-auto leading-relaxed">
            Built for medical professionals at every stage — prep, practice, and beyond.
          </p>
          <Button
            onClick={() => setLocation("/ems")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium rounded-md h-auto"
          >
            Try the platform
          </Button>
        </div>
      </motion.main>
    </div>
  );
}
