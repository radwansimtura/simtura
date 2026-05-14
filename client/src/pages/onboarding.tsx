import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Pause, Brain, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Pause,
    title: "Scenarios pause at critical moments",
    body: "You'll watch a call unfold, then be asked to decide: what do you do next? No multiple choice safety net — just you and the patient.",
  },
  {
    icon: Brain,
    title: "AI grades your open-response answers",
    body: "Type your answer in plain language. Our AI compares it against clinician-validated correct actions and scores your reasoning, not just keywords.",
  },
  {
    icon: CheckCircle,
    title: "Immediate feedback on every step",
    body: "After each decision you get specific feedback — what you got right, what you missed, and why it matters clinically.",
  },
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (user?.onboardedAt) {
    setLocation("/ems");
    return null;
  }

  const handleStart = async () => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/me/onboard");
    } catch {
      // non-critical — proceed anyway
    }
    setLocation("/ems");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full"
      >
        <h1 className="text-3xl font-bold mb-2">Here's how Simtura works</h1>
        <p className="text-white/60 mb-10 text-base">
          Three things to know before your first scenario.
        </p>

        <div className="space-y-6 mb-12">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 * i }}
              className="flex gap-4 items-start bg-white/5 rounded-xl p-5 border border-white/10"
            >
              <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <step.icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold mb-1">{step.title}</p>
                <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={handleStart}
          disabled={loading}
          className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? "Loading..." : "Start Training"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>

        <p className="text-center text-white/30 text-xs mt-4">
          You have 1 free scenario per day. Pro gives you unlimited access.
        </p>
      </motion.div>
    </div>
  );
}
