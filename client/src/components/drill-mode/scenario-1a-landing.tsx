import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Lock, Mic } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Scenario1ALandingProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  drillEnabled: boolean;
  onStartLearn: () => void;
  backUrl: string;
}

export function Scenario1ALanding({
  title,
  description,
  imageUrl,
  drillEnabled,
  onStartLearn,
  backUrl,
}: Scenario1ALandingProps) {
  const { user } = useAuth();
  const isFreeTier = user?.tier === "free";

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/50" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-6 py-4 flex items-center">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm" data-testid="button-back-from-landing">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-3xl w-full">
            <p className="text-xs uppercase tracking-wider text-blue-300/70 mb-3 text-center">
              Scenario 1A · NREMT Practice
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center" data-testid="text-scenario-1a-title">
              {title}
            </h1>
            {description && (
              <p className="text-base text-white/70 max-w-2xl mx-auto mb-10 text-center leading-relaxed">
                {description}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="h-full flex flex-col rounded-xl border border-white/15 bg-white/[0.03] p-6">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                  <BookOpen className="h-5 w-5 text-blue-300" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Learn Mode</h2>
                <p className="text-sm text-white/60 flex-1">
                  Step-by-step guided assessment. Click through each decision, get feedback, and review the reasoning.
                </p>
                <div className="mt-5">
                  <Button
                    onClick={onStartLearn}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white"
                    data-testid="button-start-learn-mode"
                  >
                    Start Learn Mode →
                  </Button>
                </div>
              </div>

              {drillEnabled ? (
                isFreeTier ? (
                  <div
                    className="h-full flex flex-col rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5 p-6"
                    data-testid="drill-mode-pro-upsell"
                  >
                    <h2 className="text-lg font-semibold mb-3 text-blue-200 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-400" />
                      Drill Mode is a Pro feature
                    </h2>
                    <div className="flex-1">
                      <p className="text-sm text-white/70 mb-3 leading-relaxed">
                        1 in 7 candidates who pass the written exam still fail a skills station on their first attempt. Drill Mode rehearses you under real exam conditions: voice-driven scoring, 15-minute timer, NREMT-aligned grading.
                      </p>
                      <p className="text-xs text-white/50">Pro members get 10 drills/month included.</p>
                    </div>
                    <div className="mt-5 flex flex-col sm:flex-row sm:justify-center gap-2">
                      <a href="/#pricing">
                        <Button
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white"
                          data-testid="button-upsell-see-pro-plans"
                        >
                          See Pro plans →
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        onClick={onStartLearn}
                        className="w-full sm:w-auto"
                        data-testid="button-upsell-continue-learn"
                      >
                        Use Learn Mode
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5 p-6">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/25 flex items-center justify-center mb-4">
                      <Mic className="h-5 w-5 text-blue-200" />
                    </div>
                    <h2 className="text-lg font-semibold mb-1">Drill Mode</h2>
                    <p className="text-sm text-white/60 flex-1">
                      Continuous 15-minute voice exam simulation. Speak naturally, the patient and evaluator respond in real time, graded at the end.
                    </p>
                    <div className="mt-5">
                      <Link href="/drill/scenario-1a">
                        <Button
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white"
                          data-testid="button-start-drill-mode"
                        >
                          Start Drill Mode →
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-6 opacity-60">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                    <Mic className="h-5 w-5 text-white/40" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">Drill Mode</h2>
                  <p className="text-sm text-white/50">Coming soon — voice-driven exam simulation.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
