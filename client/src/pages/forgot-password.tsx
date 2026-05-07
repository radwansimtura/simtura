import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

type Step = "email" | "answer" | "done";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password/lookup", { email });
      const data = (await res.json()) as { question: string | null };
      if (!data.question) {
        toast({
          title: "No security question on file",
          description:
            "Either no account exists with that email, or this account doesn't have a security question set. Contact support if you're locked out.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setQuestion(data.question);
      setStep("answer");
    } catch (err: any) {
      toast({
        title: "Couldn't look up account",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password/reset", {
        email,
        securityAnswer: answer,
        newPassword,
      });
      setStep("done");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Check your answer and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-30">
        <video
          src="/videos/ambulance-driving.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
      </div>

      <nav className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
        <Link href="/signin">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-back-signin">
            <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
            <img src={simturaLogo} alt="Simtura" className="h-9" />
          </div>
        </Link>
      </nav>

      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">
              Reset password
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {step === "done" ? "All set." : "Forgot password?"}
            </h1>
            <p className="mt-3 text-white/60">
              {step === "email" && "Enter your email and we'll show you your security question."}
              {step === "answer" && "Answer your security question and choose a new password."}
              {step === "done" && "Your password has been updated. You can sign in now."}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-white/70 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                  placeholder="you@example.com"
                  data-testid="input-email"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-lookup"
              >
                {loading ? "Looking up..." : "Continue"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          )}

          {step === "answer" && (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-wider text-white/50 mb-1">
                  Your question
                </p>
                <p className="text-sm text-white" data-testid="text-security-question">
                  {question}
                </p>
              </div>
              <div>
                <Label htmlFor="answer" className="text-white/70 text-xs uppercase tracking-wider">
                  Your answer
                </Label>
                <Input
                  id="answer"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                  placeholder="Case- and space-insensitive"
                  data-testid="input-answer"
                />
              </div>
              <div>
                <Label htmlFor="new-password" className="text-white/70 text-xs uppercase tracking-wider">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                  placeholder="At least 8 characters"
                  data-testid="input-new-password"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-reset"
              >
                {loading ? "Resetting..." : "Reset password"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => setLocation("/signin")}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-back-to-signin"
              >
                Back to sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step !== "done" && (
            <p className="mt-8 text-center text-sm text-white/60">
              Remembered it?{" "}
              <Link href="/signin" className="text-white hover:underline font-medium" data-testid="link-signin">
                Sign in
              </Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
