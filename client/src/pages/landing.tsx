import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Heart,
  Moon,
  Shield,
  Stethoscope,
  Sun,
  Target,
  Users,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl" data-testid="nav-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight" data-testid="text-brand-name">Simtura.ai</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
              <a href="#levels" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Cert Levels</a>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Link href="/scenarios">
                <Button data-testid="button-start-training">Start Training</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-ambulance.png"
            alt="Inside ambulance view"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-28 sm:py-36 lg:py-44">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-6">
              <Zap className="mr-1 h-3 w-3" /> AI-Powered EMS Training
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight" data-testid="text-hero-title">
              Train like it's real.
              <br />
              <span className="text-blue-400">Save lives for real.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed max-w-lg" data-testid="text-hero-subtitle">
              Interactive AI simulations that put you in the field. Practice patient assessments, 
              make critical decisions, and build the confidence to handle any emergency.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/scenarios">
                <Button size="lg" data-testid="button-hero-start">
                  Browse Scenarios <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="backdrop-blur-sm" data-testid="button-hero-learn">
                  Learn More
                </Button>
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Free to get started
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                EMR through Paramedic
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Realistic scenarios
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-background" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Why Simtura</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-features-title">
              Bridge the gap between classroom and field
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Traditional training leaves you sitting in circles waiting your turn. Simtura puts you 
              in the action whenever you want, wherever you are.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Decision-Based Learning",
                description: "Make real-time decisions during patient encounters. Each choice affects the outcome, just like in the field.",
              },
              {
                icon: BookOpen,
                title: "Step-by-Step Feedback",
                description: "Get instant, detailed feedback on every action. Understand what you did right and what to improve.",
              },
              {
                icon: Shield,
                title: "Safe Practice Environment",
                description: "Make mistakes without consequences. Build confidence before your first shift through repeated practice.",
              },
              {
                icon: Stethoscope,
                title: "Realistic Patient Scenarios",
                description: "From pediatric asthma to trauma assessments. Scenarios mirror what you'll encounter on duty.",
              },
              {
                icon: GraduationCap,
                title: "Multiple Certification Levels",
                description: "Content tailored for EMRs, EMTs, AEMTs, and Paramedics. Train at your level, advance when ready.",
              },
              {
                icon: Heart,
                title: "Protocol-Aligned",
                description: "Scenarios follow established EMS protocols. Practice the right way from the start.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-md border border-border/50 bg-card p-6 transition-colors"
                data-testid={`card-feature-${i}`}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-card/50" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-how-title">
              From dispatch to hospital in minutes
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Each scenario walks you through a complete patient encounter, from arrival to transfer of care.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Dispatch",
                description: "Receive the call. Get patient details and prepare your approach.",
              },
              {
                step: "02",
                title: "Scene Assessment",
                description: "Evaluate scene safety, determine MOI/NOI, and form your general impression.",
              },
              {
                step: "03",
                title: "Patient Care",
                description: "Perform primary assessment, treat life threats, gather history, and manage care.",
              },
              {
                step: "04",
                title: "Transfer & Review",
                description: "Transfer care at the hospital. Review your performance and learn from feedback.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center" data-testid={`step-${i}`}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-background" id="levels">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Certification Levels</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-levels-title">
              Train at your level
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Scenarios are tailored to each certification level with appropriate scope of practice.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { level: "EMR", name: "Emergency Medical Responder", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
              { level: "EMT", name: "Emergency Medical Technician", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
              { level: "AEMT", name: "Advanced EMT", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
              { level: "Paramedic", name: "Paramedic", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-md border p-6 text-center ${item.color}`}
                data-testid={`card-level-${item.level}`}
              >
                <div className="text-2xl font-bold mb-1">{item.level}</div>
                <div className="text-sm opacity-80">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Users, value: "10+", label: "Training Scenarios" },
              { icon: Target, value: "100%", label: "Protocol-Aligned" },
              { icon: Zap, value: "24/7", label: "Practice Anytime" },
            ].map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
            Ready to start training?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Jump into your first scenario today. Practice makes permanent, and every rep 
            gets you closer to saving lives with confidence.
          </p>
          <Link href="/scenarios">
            <Button size="lg" data-testid="button-cta-start">
              Start Your First Scenario <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Simtura.ai</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bridging the gap between classroom and field. Built for EMS professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
