import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

const SECTIONS = [
  {
    title: "Who We Are",
    body: "Simtura.ai is operated by Simtura.ai Incorporated, a company providing clinical training simulations for EMS and nursing students. If you have any questions about this policy, contact us at radwan@simtura.ai.",
  },
  {
    title: "What Data We Collect",
    body: "Account data: your email address, full name, and a bcrypt-hashed password when you register. Training data: scenario attempts, decision timestamps, scores, and performance over time. Payment data: for Pro subscribers, payment is processed by Stripe. Simtura.ai does not store full card numbers or CVVs — Stripe handles and stores all payment credentials under PCI-DSS compliance. Usage data: browser type, device type, approximate region, and session duration via first-party analytics (no cross-site tracking).",
  },
  {
    title: "How We Use Your Data",
    body: "We use your data to authenticate your account and gate free vs. Pro features, to display your personal progress dashboard, and to improve scenario quality using aggregated, anonymized performance trends. We do NOT sell, rent, or share your personal data with third-party advertisers.",
  },
  {
    title: "AI Processing (Third-Party LLM)",
    body: "Open-ended responses you submit may be sent to Anthropic's Claude API for automated grading against clinician-approved reference answers. This data is not used to train Anthropic's models (per Anthropic's API data usage policy). Do not include real patient names, dates of birth, or any real PHI in free-text fields.",
  },
  {
    title: "Cookies & Local Storage",
    body: "We use a single first-party session cookie to keep you signed in. We do not deploy third-party advertising cookies, retargeting pixels, or cross-site trackers. You can withdraw cookie consent at any time by clearing your browser's localStorage for simtura.ai or using your browser's built-in cookie controls — this will not delete your account.",
  },
  {
    title: "Data Retention",
    body: "Account and training data is retained for as long as your account is active. If you request deletion, we will remove your personal data within 30 days, except where retention is required by law (e.g., billing records).",
  },
  {
    title: "Your Rights",
    body: "Depending on your location, you may have rights under GDPR, CCPA, or other laws, including: the right to access your data, correct inaccuracies, request deletion (\"right to be forgotten\"), object to processing, and data portability. To exercise any of these rights, email radwan@simtura.ai with the subject line \"Privacy Request.\"",
  },
  {
    title: "Children's Privacy",
    body: "Simtura.ai is not directed at children under 13. If you believe a child has created an account, contact us at radwan@simtura.ai and we will delete it promptly.",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this policy periodically. If changes are material, we will notify registered users by email and update the \"Last Updated\" date at the top of this page.",
  },
  {
    title: "Contact",
    body: "Privacy questions: radwan@simtura.ai.",
  },
];

export default function PrivacyPolicyPage() {
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
            Privacy
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            How we collect, use, and protect your personal data.
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
