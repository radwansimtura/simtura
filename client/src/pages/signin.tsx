import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast({ title: "Welcome back." });
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const safeNext = next && /^\/[A-Za-z0-9/_\-:.]*$/.test(next) ? next : "/profile";
      setLocation(safeNext);
    } catch (err: any) {
      toast({
        title: "Sign in failed",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background ambient video */}
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
              Sign in
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Welcome back.
            </h1>
            <p className="mt-3 text-white/60">
              Pick up where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
              data-testid="button-signin"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            New here?{" "}
            <Link href="/signup" className="text-white hover:underline font-medium" data-testid="link-signup">
              Create an account
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
