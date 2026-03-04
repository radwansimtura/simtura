import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import {
  ArrowRight,
  ChevronDown,
  Moon,
  Sun,
  Stethoscope,
  Siren,
  Play,
  Shield,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import simturaLogo from "@assets/Screenshot_2026-02-17_at_3.35.49_PM_1772603261236.png";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-background to-indigo-950/15 dark:from-blue-950/60 dark:via-background dark:to-indigo-950/40" />
        <motion.div
          className="absolute top-[-30%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-blue-500/4 dark:bg-blue-500/8 blur-[120px]"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 50, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-indigo-500/4 dark:bg-indigo-500/8 blur-[120px]"
          animate={{
            x: [0, -70, 50, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.85, 1.15, 1],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full bg-cyan-500/3 dark:bg-cyan-500/6 blur-[100px]"
          animate={{
            x: [0, -120, 80, 0],
            y: [0, 50, -70, 0],
            scale: [1, 1.25, 0.8, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[5%] right-[15%] w-[28vw] h-[28vw] rounded-full bg-blue-400/3 dark:bg-blue-400/6 blur-[100px]"
          animate={{
            x: [0, 60, -90, 0],
            y: [0, -100, 40, 0],
            scale: [1, 1.1, 0.85, 1],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[15%] left-[25%] w-[22vw] h-[22vw] rounded-full bg-violet-400/2 dark:bg-violet-400/5 blur-[80px]"
          animate={{
            x: [0, -50, 70, 0],
            y: [0, 70, -50, 0],
            scale: [1, 0.8, 1.2, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={simturaLogo} alt="Simtura" className="h-8" data-testid="img-logo" />
            </div>
            <Button size="icon" variant="ghost" onClick={toggleTheme} className="text-foreground/70 hover:text-foreground" data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 backdrop-blur-sm text-sm text-blue-600 dark:text-blue-400 mb-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            AI-Powered Clinical Training
          </motion.div>

          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-bold tracking-tighter leading-none mb-8" data-testid="text-hero-title">
            <motion.span
              className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Simtura
            </motion.span>
          </h1>

          <motion.p
            className="text-xl sm:text-2xl text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed font-light mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            data-testid="text-hero-subtitle"
          >
            Immersive AI simulations for healthcare professionals.
            <br className="hidden sm:block" />
            Practice real scenarios. Build real confidence.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-blue-500/60" />
              First-person video scenarios
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-blue-500/60" />
              Evidence-based feedback
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-blue-500/60" />
              Practice anytime
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => document.getElementById("disciplines")?.scrollIntoView({ behavior: "smooth" })}
            data-testid="button-scroll-down"
          >
            <span className="text-xs text-muted-foreground/40 uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-5 w-5 text-muted-foreground/30" />
          </motion.div>
        </motion.div>
      </section>

      <section id="disciplines" className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-24">
        <motion.div
          className="w-full max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-blue-500/70 dark:text-blue-400/70 mb-3 tracking-widest uppercase">
              Training Paths
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Choose your discipline
            </h2>
            <p className="text-muted-foreground/70 max-w-lg mx-auto">
              Select your field to explore tailored clinical training scenarios built for your certification level.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <Link href="/ems">
              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md cursor-pointer transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10"
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.25 }}
                data-testid="card-ems"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src="/images/ems-hero-background.jpg"
                    alt="EMS emergency medical services"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 text-white mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-400/20">
                        <Siren className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-blue-300/90">Emergency Medical Services</span>
                    </div>
                  </div>
                </div>
                <div className="p-7">
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-500 transition-colors duration-300">EMS Training</h2>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
                    Field-based scenarios for EMRs, EMTs, AEMTs, and Paramedics. Practice primary assessments,
                    trauma management, and critical decision-making.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 font-medium">
                    Browse Scenarios <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/nursing">
              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md cursor-pointer transition-all duration-300 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10"
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.25 }}
                data-testid="card-nursing"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src="/images/nursing-hero-background.jpg"
                    alt="Nursing hospital environment"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 text-white mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/20">
                        <Stethoscope className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">Nursing</span>
                    </div>
                  </div>
                </div>
                <div className="p-7">
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-emerald-500 transition-colors duration-300">Nursing Training</h2>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
                    Hospital-based scenarios for nursing students and practicing nurses. Stroke recognition,
                    patient assessment, and interdisciplinary care coordination.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-emerald-500 dark:text-emerald-400 font-medium">
                    Browse Scenarios <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/20 py-10 bg-background/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={simturaLogo} alt="Simtura" className="h-6 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground/50">
              Bridging the gap between classroom and clinical practice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
