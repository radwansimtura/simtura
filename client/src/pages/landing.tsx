import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import {
  Activity,
  ArrowRight,
  Moon,
  Sun,
  Stethoscope,
  Siren,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-background to-indigo-950/20 dark:from-blue-950/50 dark:via-background dark:to-indigo-950/30" />
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl"
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl"
          animate={{
            x: [0, -60, 40, 0],
            y: [0, 50, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[40%] left-[50%] w-[30vw] h-[30vw] rounded-full bg-cyan-500/3 dark:bg-cyan-500/5 blur-3xl"
          animate={{
            x: [0, -100, 60, 0],
            y: [0, 40, -60, 0],
            scale: [1, 1.2, 0.85, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight" data-testid="text-brand-name">Simtura.ai</span>
            </div>
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-16">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-sm text-muted-foreground mb-8">
            <Activity className="h-3.5 w-3.5 text-primary" />
            AI-Powered Clinical Training
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6" data-testid="text-hero-title">
            Train like it's real.
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              Save lives for real.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            Immersive AI simulations for healthcare professionals. Practice patient assessments,
            make critical decisions, and build confidence through realistic clinical scenarios.
          </p>
        </motion.div>

        <motion.div
          className="w-full max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="text-center text-sm font-medium text-muted-foreground mb-6 tracking-wide uppercase">
            Choose your discipline
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link href="/ems">
              <motion.div
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                data-testid="card-ems"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/images/ems-hero-background.jpg"
                    alt="EMS emergency medical services"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 text-white">
                      <Siren className="h-5 w-5 text-blue-400" />
                      <span className="text-xs font-medium uppercase tracking-wider text-blue-300">Emergency Medical Services</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">EMS Training</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Field-based scenarios for EMRs, EMTs, AEMTs, and Paramedics. Practice primary assessments,
                    trauma management, and critical decision-making in pre-hospital emergencies.
                  </p>
                  <div className="flex items-center gap-1 text-sm text-primary font-medium">
                    Browse EMS Scenarios <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/nursing">
              <motion.div
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                data-testid="card-nursing"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/images/nursing-hero-background.jpg"
                    alt="Nursing hospital environment"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 text-white">
                      <Stethoscope className="h-5 w-5 text-emerald-400" />
                      <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">Nursing</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-500 transition-colors">Nursing Training</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Hospital-based scenarios for RN students and practicing nurses. Stroke recognition,
                    patient assessment, Code Stroke activation, and interdisciplinary care coordination.
                  </p>
                  <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
                    Browse Nursing Scenarios <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-16 mb-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Free to get started
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Realistic AI simulations
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Practice 24/7
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 border-t border-border/30 py-8 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Simtura.ai</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bridging the gap between classroom and clinical practice. Built for healthcare professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
