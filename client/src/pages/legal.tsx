import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

const SECTIONS = [
  {
    title: "Educational use only",
    body: "Simtura.ai is a clinical training simulator. The scenarios, feedback, and AI responses provided here are for educational practice and competency development. Nothing on this platform is medical advice, a substitute for licensed clinical judgment, or appropriate for use in real patient care.",
  },
  {
    title: "Account & data",
    body: "When you create an account, we store your email, name, and a securely hashed password. We never store your password in plain text. We track your scenario attempts, scores, and timestamps so we can show you progress over time. You can request deletion of your account and associated data at any time by contacting us.",
  },
  {
    title: "How we use your data",
    body: "Account and progress data is used solely to operate Simtura.ai — sign-in, gating of free vs. Pro features, and your personal performance dashboard. We do not sell or rent your data. Aggregated, anonymized usage statistics may be used to improve scenarios.",
  },
  {
    title: "AI grading",
    body: "Open-response answers may be sent to a third-party large language model (Anthropic Claude) for grading against pre-validated correct answers. The grader does not generate medical recommendations — it only compares your answer to a clinician-approved reference. Do not include real patient identifiers in any free-text response.",
  },
  {
    title: "Cookies",
    body: "We use a single first-party session cookie to keep you signed in. We do not use third-party advertising or tracking cookies.",
  },
  {
    title: "Subscriptions",
    body: "Free accounts include one scenario per day. Pro accounts unlock unlimited scenarios. You may downgrade or cancel at any time; access continues through the end of your current billing period.",
  },
  {
    title: "Limitation of liability",
    body: "Simtura.ai is provided on an as-is basis. To the fullest extent permitted by law, Simtura.ai and its operators disclaim liability for any clinical decisions made based on practice content. Always defer to your program, instructors, and current local protocols.",
  },
  {
    title: "Contact",
    body: "Questions about privacy, your data, or these terms? Reach us at hello@simtura.ai or via the contact page.",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="fixed inset-0 z-0 opacity-[0.06] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.6),_transparent_50%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
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
            Legal & Privacy
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            How we handle your data.
          </h1>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            Plain-English summary of how Simtura.ai works, what we store, and what we don't.
          </p>
          <p className="mt-2 text-xs text-white/40 uppercase tracking-wider">
            Last updated · April 2026
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
              data-testid={`section-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
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
