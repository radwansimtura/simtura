import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import simturaLogo from "@/assets/simtura-logo.png";

interface ComingSoonPageProps {
  discipline: string;
  accentColor: "orange" | "blue" | "emerald" | "violet";
  subtitle: string;
}

const accentClasses: Record<string, string> = {
  orange: "text-orange-400",
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
};

const glowClasses: Record<string, string> = {
  orange: "bg-orange-500/10",
  blue: "bg-blue-500/10",
  emerald: "bg-emerald-500/10",
  violet: "bg-violet-500/10",
};

export default function ComingSoonPage({ discipline, accentColor, subtitle }: ComingSoonPageProps) {
  const accent = accentClasses[accentColor];
  const glow = glowClasses[accentColor];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-[0.06] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.6),_transparent_50%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
              <img src={simturaLogo} alt="Simtura" className="h-9" />
            </div>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <p className={`text-[11px] uppercase tracking-[0.4em] mb-4 ${accent}`}>
            {discipline}
          </p>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            Coming Soon.
          </h1>

          <p className="text-white/60 text-lg leading-relaxed mb-10">
            {subtitle}
          </p>

          <Link href="/">
            <span className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </span>
          </Link>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
