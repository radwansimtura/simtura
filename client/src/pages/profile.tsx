import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/upgrade-modal";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  LogOut,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

interface RecentAttempt {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  discipline: string | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
}

interface Stats {
  totalAttempts: number;
  totalCompleted: number;
  avgScore: number;
  bestScore: number;
  passed: number;
  todayCount: number;
  dailyLimit: number | null;
  tier: "free" | "pro";
  recent: RecentAttempt[];
}

export default function ProfilePage() {
  const { user, isLoading, signOut, downgrade } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/signin");
    }
  }, [user, isLoading, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/me/stats"],
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out." });
    setLocation("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/50">
        Loading…
      </div>
    );
  }

  const isPro = user.tier === "pro";
  const usagePct =
    stats && stats.dailyLimit
      ? Math.min(100, (stats.todayCount / stats.dailyLimit) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />

      {/* Subtle ambient bg */}
      <div className="fixed inset-0 z-0 opacity-[0.08] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.4),_transparent_50%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
              <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
              <img src={simturaLogo} alt="Simtura" className="h-9" />
            </div>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={handleSignOut}
            data-testid="button-signout"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6 sm:px-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-3">
            Profile
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" data-testid="text-name">
              {user.name || user.email}
            </h1>
            {isPro ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-amber-300 text-xs uppercase tracking-wider">
                <Crown className="h-3.5 w-3.5" />
                Pro
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-white/70 text-xs uppercase tracking-wider">
                Free
              </div>
            )}
          </div>
          <p className="text-white/50 text-sm" data-testid="text-email">
            {user.email}
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-12"
        >
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Scenarios run"
            value={stats?.totalAttempts ?? 0}
            loading={statsLoading}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg score"
            value={stats ? `${stats.avgScore}%` : "—"}
            loading={statsLoading}
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label="Best score"
            value={stats ? `${stats.bestScore}%` : "—"}
            loading={statsLoading}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Passed (≥80%)"
            value={stats?.passed ?? 0}
            loading={statsLoading}
          />
        </motion.div>

        {/* Daily limit / Pro card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          {isPro ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-[0.25em] mb-2">
                  <Crown className="h-3.5 w-3.5" />
                  Pro member
                </div>
                <h3 className="text-xl font-semibold mb-1">Unlimited scenarios.</h3>
                <p className="text-sm text-white/60">
                  Train as many cases as you need, every day.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await downgrade();
                  toast({ title: "Reverted to Free.", description: "You can re-upgrade anytime." });
                }}
                className="text-white/50 hover:text-white hover:bg-white/5"
                data-testid="button-downgrade"
              >
                Manage plan
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-2">
                    Daily usage
                  </p>
                  <h3 className="text-xl font-semibold">
                    {stats?.todayCount ?? 0} / {stats?.dailyLimit ?? 1} today
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowUpgrade(true)}
                  className="rounded-full bg-white text-black hover:bg-white/90 font-medium px-5"
                  data-testid="button-upgrade-from-profile"
                >
                  <Crown className="mr-2 h-3.5 w-3.5" />
                  Upgrade to Pro
                </Button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-gradient-to-r from-blue-400 to-violet-400"
                />
              </div>
              <p className="mt-3 text-xs text-white/50">
                Free plan includes 1 scenario per day. Pro unlocks unlimited training.
              </p>
            </div>
          )}
        </motion.div>

        {/* Recent attempts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Recent training</h2>
            <Link href="/ems">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                Browse scenarios <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {statsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : stats && stats.recent.length > 0 ? (
            <div className="space-y-2">
              {stats.recent.map((a) => {
                const passed = (a.score || 0) >= 80;
                return (
                  <Link key={a.id} href={`/scenario/${a.scenarioId}`}>
                    <div
                      className="group flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 px-5 py-4 cursor-pointer transition-all"
                      data-testid={`row-attempt-${a.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium truncate group-hover:text-white">
                          {a.scenarioTitle}
                        </h3>
                        <p className="text-xs text-white/40 mt-1">
                          {a.discipline ?? ""}
                          {a.discipline ? " · " : ""}
                          {new Date(a.startedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.completedAt && a.score !== null ? (
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              passed ? "text-emerald-300" : "text-amber-300"
                            }`}
                          >
                            {a.score}%
                          </span>
                        ) : (
                          <span className="text-xs text-white/40 italic">In progress</span>
                        )}
                        <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
              <p className="text-white/50 text-sm mb-4">No scenarios yet.</p>
              <Link href="/ems">
                <Button className="rounded-full bg-white text-black hover:bg-white/90">
                  Start your first scenario <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-[0.2em] mb-3">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
        {loading ? <span className="text-white/30">—</span> : value}
      </div>
    </div>
  );
}
