import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Scenario } from "@shared/schema";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clock,
  Search,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import simturaLogo from "@/assets/simtura-logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useScope, type ScopeMode } from "@/hooks/use-scope";
import { SiteFooter } from "@/components/site-footer";
import MobileNav from "@/components/MobileNav";
import DesktopNav from "@/components/DesktopNav";

const difficultyColors: Record<string, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const certColors: Record<string, string> = {
  EMR: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  EMT: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  AEMT: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Paramedic: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  RN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  LPN: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  BSN: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

interface DisciplineScenariosPageProps {
  discipline: string;
  heroWord: string;
  heroSubtitle: string;
  heroImage: string;
  heroVideo?: string;
  accentColor?: string;
  certLevels: string[];
}

export default function DisciplineScenariosPage({
  discipline,
  heroWord,
  heroSubtitle,
  heroImage,
  heroVideo,
  certLevels,
}: DisciplineScenariosPageProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { user } = useAuth();
  const { scope, setScope } = useScope();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCert, setSelectedCert] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");

  useEffect(() => {
    document.title = `${discipline} Scenarios | Simtura.ai`;
    return () => { document.title = "Simtura.ai"; };
  }, [discipline]);

  const { data: scenarios, isLoading, error, refetch } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios", discipline],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios?discipline=${discipline}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredScenarios = scenarios?.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCert = selectedCert === "All" || s.certLevel === selectedCert;
    const matchesDifficulty =
      selectedDifficulty === "All" || s.difficulty === selectedDifficulty;
    return matchesSearch && matchesCert && matchesDifficulty;
  });

  const scrollToScenarios = () => {
    document.getElementById("scenarios")?.scrollIntoView({ behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4 text-sm">Couldn't load scenarios.</p>
          <Button onClick={() => refetch()} variant="outline" className="text-white border-white/20">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white relative min-h-screen">
      {/* Top nav — matches landing */}
      <nav className="fixed top-0 left-0 right-0 z-50" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
                <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                <img src={simturaLogo} alt="Simtura" className="h-9 w-auto" data-testid="img-logo" />
              </div>
            </Link>
            <DesktopNav />
            <div className="flex items-center gap-3">
              <MobileNav />
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-5 hidden sm:inline-flex"
                onClick={scrollToScenarios}
                data-testid="button-nav-cta"
              >
                Browse
              </Button>
              {user ? (
                <Link href="/profile">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-4"
                    data-testid="button-nav-profile"
                  >
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    {user.name?.split(" ")[0] || "Profile"}
                  </Button>
                </Link>
              ) : (
                <Link href="/signin">
                  <Button
                    size="sm"
                    className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5"
                    data-testid="button-nav-signin"
                  >
                    Sign in
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          {heroVideo ? (
            <motion.video
              key={heroVideo}
              className="absolute inset-0 h-full w-full object-cover"
              src={heroVideo}
              autoPlay={!reduceMotion}
              muted
              loop
              playsInline
              poster={heroImage}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ opacity: { duration: 0.8 }, scale: { duration: 12, ease: "linear" } }}
              data-testid="video-hero-bg"
            />
          ) : (
            <img
              src={heroImage}
              alt={discipline}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/90" />
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 0.7, letterSpacing: "0.4em" }}
            transition={{ duration: 1.2, delay: 0.1 }}
            className="text-[11px] uppercase tracking-[0.4em] text-white/60 mb-6"
            data-testid="text-hero-eyebrow"
          >
            {discipline === "EMS" ? "Emergency Medical Services" : "Clinical Nursing"}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.h1
              key={heroWord}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-8xl lg:text-9xl font-bold tracking-tight leading-[1.05] text-white mb-6"
              data-testid="text-hero-word"
            >
              {heroWord}
            </motion.h1>
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg text-white/75 max-w-xl mb-10 font-light"
            data-testid="text-hero-subtitle"
          >
            {heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={scrollToScenarios}
              className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
              data-testid="button-hero-browse"
            >
              Browse Scenarios
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <button
          onClick={scrollToScenarios}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-white/50 hover:text-white transition-colors"
          aria-label="Scroll to scenarios"
          data-testid="button-scroll-down"
        >
          <span className="text-[11px] uppercase tracking-[0.25em]">Scenarios</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* SCENARIOS SECTION */}
      <section id="scenarios" className="relative z-10 scroll-mt-24 px-6 sm:px-10 py-20 sm:py-28 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-3">
            Choose a scenario.
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-xl">
            Step into a real patient case. Make the call. Learn what works.
          </p>
        </motion.div>

        {/* Scope selector — EMS only */}
        {discipline === "EMS" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Practice scope</p>
            <p className="text-sm text-white/60 mb-4 max-w-xl">
              Select your provider level. The same scenarios play for all scopes — only the quiz questions change to match your scope of practice.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["EMT-B", "AEMT", "Paramedic"] as ScopeMode[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    scope === s
                      ? s === "EMT-B"
                        ? "bg-blue-500 text-white"
                        : s === "AEMT"
                        ? "bg-violet-500 text-white"
                        : "bg-rose-500 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
              {scope && (
                <span className="self-center text-xs text-white/40 ml-2">
                  Questions will be generated for <span className="text-white/70">{scope}</span> scope
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 space-y-4"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search scenarios..."
              className="pl-11 h-11 rounded-full bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...certLevels].map((cert) => (
              <button
                key={cert}
                onClick={() => setSelectedCert(cert)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCert === cert
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
                data-testid={`button-filter-cert-${cert}`}
              >
                {cert}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-1 self-center" />
            {["All", "Beginner", "Intermediate", "Advanced"].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedDifficulty === diff
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
                data-testid={`button-filter-diff-${diff}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                <Skeleton className="h-56 w-full bg-white/5" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 bg-white/5" />
                  <Skeleton className="h-4 w-full bg-white/5" />
                  <Skeleton className="h-4 w-2/3 bg-white/5" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 bg-white/5" />
                    <Skeleton className="h-6 w-20 bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredScenarios && filteredScenarios.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((scenario, i) => (
              <ScenarioCard key={scenario.id} scenario={scenario} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/[0.02]">
            <Search className="h-10 w-10 mx-auto text-white/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white" data-testid="text-no-results">
              No scenarios found
            </h3>
            <p className="text-white/50 text-sm">
              Try adjusting your filters or search term.
            </p>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function ScenarioCard({ scenario, index }: { scenario: Scenario; index: number }) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <Link href={`/scenario/${scenario.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
        whileHover={reduceMotion ? undefined : { y: -4 }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] cursor-pointer transition-all duration-300 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 h-full flex flex-col"
        data-testid={`card-scenario-${scenario.id}`}
      >
        <div className="relative h-56 overflow-hidden shrink-0">
          {scenario.imageUrl ? (
            <img
              src={scenario.imageUrl}
              alt={scenario.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/[0.02]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge
              variant="outline"
              className={`border ${certColors[scenario.certLevel] || "bg-white/10 text-white border-white/20"} backdrop-blur-sm`}
            >
              {scenario.certLevel}
            </Badge>
            <Badge
              variant="outline"
              className={`border ${difficultyColors[scenario.difficulty] || "bg-white/10 text-white border-white/20"} backdrop-blur-sm`}
            >
              {scenario.difficulty}
            </Badge>
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-white/80 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
            <Clock className="h-3 w-3" />
            {scenario.estimatedMinutes} min
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3
            className="text-lg font-semibold mb-2 text-white group-hover:text-white transition-colors"
            data-testid={`text-scenario-title-${scenario.id}`}
          >
            {scenario.title}
          </h3>
          <p className="text-sm text-white/55 line-clamp-3 mb-4 leading-relaxed flex-1">
            {scenario.description}
          </p>
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
            Start scenario
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
