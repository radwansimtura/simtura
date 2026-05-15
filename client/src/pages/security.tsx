import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import simturaLogo from "@/assets/simtura-logo.png";

const SECTIONS = [
  {
    title: "What we collect",
    body: "Email address, name, training responses, scenario performance scores, and timestamps.",
  },
  {
    title: "What we never collect",
    body: "Real patient data, PHI, clinical records, or personally identifiable patient information of any kind. All scenarios are simulated.",
  },
  {
    title: "How data is stored",
    body: "PostgreSQL database hosted on Render with encryption at rest and TLS in transit. No third-party data brokers.",
  },
  {
    title: "Who can access it",
    body: "Only the Simtura engineering team. We do not sell or share user data.",
  },
  {
    title: "Data retention",
    body: "Account data is kept while your account is active. Request deletion anytime at radwan@simtura.ai and we will remove it within 30 days.",
  },
  {
    title: "Is Simtura HIPAA compliant?",
    body: "Simtura is a training platform using entirely simulated scenarios. No real patient health information is ever entered, stored, or processed. HIPAA applies to real PHI — because our platform contains no real PHI, HIPAA obligations do not apply. For institutional procurement teams with compliance questions, contact radwan@simtura.ai.",
  },
  {
    title: "Contact",
    body: "Security and privacy questions: radwan@simtura.ai.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-black text-white relative">
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

      <main className="relative z-10 pt-32 pb-16 px-6 sm:px-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">
            Trust
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Security &amp; Privacy
          </h1>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            How we protect your data and what we never touch.
          </p>
          <p className="mt-2 text-xs text-white/40 uppercase tracking-wider">
            Last updated · May 2026
          </p>
        </motion.div>

        <div className="mt-14 space-y-10">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3) }}
            >
              <h2 className="text-xl font-semibold tracking-tight mb-3">{s.title}</h2>
              <p className="text-white/65 leading-relaxed">{s.body}</p>
            </motion.section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
