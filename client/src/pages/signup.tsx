import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SECURITY_QUESTIONS } from "@shared/schema";
import { ArrowLeft, ArrowRight } from "lucide-react";
import simturaLogo from "@/assets/simtura-logo.png";

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (securityAnswer.trim().length < 2) {
      toast({
        title: "Security answer required",
        description: "We use this so you can recover your account if you forget your password.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, name, securityQuestion, securityAnswer });
      toast({ title: "Account created.", description: "You're all set." });
      setLocation("/onboarding");
    } catch (err: any) {
      toast({
        title: "Sign up failed",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Try a different email.",
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
          src="/videos/hospital-transport.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
      </div>

      <nav className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
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
              Get started
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Start training.
            </h1>
            <p className="mt-3 text-white/60">
              One scenario per day, free forever.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-white/70 text-xs uppercase tracking-wider">
                Full name
              </Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                placeholder="Alex Morgan"
                data-testid="input-name"
              />
            </div>
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
            <div>
              <Label htmlFor="password" className="text-white/70 text-xs uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                placeholder="At least 8 characters"
                data-testid="input-password"
              />
            </div>

            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-3">
                Account recovery
              </p>
              <Label className="text-white/70 text-xs uppercase tracking-wider">
                Security question
              </Label>
              <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                <SelectTrigger
                  className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white focus:ring-white/30"
                  data-testid="select-security-question"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {SECURITY_QUESTIONS.map((q) => (
                    <SelectItem key={q} value={q} data-testid={`option-question-${q.slice(0, 16)}`}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="security-answer" className="text-white/70 text-xs uppercase tracking-wider">
                Your answer
              </Label>
              <Input
                id="security-answer"
                required
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                placeholder="Something only you'd know"
                data-testid="input-security-answer"
              />
              <p className="mt-2 text-xs text-white/40">
                Case- and space-insensitive. You'll use this if you ever forget your password.
              </p>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-white cursor-pointer"
                data-testid="checkbox-terms"
              />
              <label htmlFor="terms" className="text-xs text-white/60 leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link href="/legal" className="text-white underline underline-offset-2 hover:text-white/80">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-white/80">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading || !agreedToTerms}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium disabled:opacity-40"
              data-testid="button-signup"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/signin" className="text-white hover:underline font-medium" data-testid="link-signin">
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
