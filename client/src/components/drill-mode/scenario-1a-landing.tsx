import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Mic } from "lucide-react";

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
              <button
                onClick={onStartLearn}
                className="group rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 p-6 text-left transition-all"
                data-testid="button-start-learn-mode"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                  <BookOpen className="h-5 w-5 text-blue-300" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Learn Mode</h2>
                <p className="text-sm text-white/60">
                  Step-by-step guided assessment. Click through each decision, get feedback, and review the reasoning.
                </p>
              </button>

              {drillEnabled ? (
                <Link href="/drill/scenario-1a">
                  <button
                    className="w-full h-full group rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 hover:border-blue-500/50 p-6 text-left transition-all"
                    data-testid="button-start-drill-mode"
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/25 flex items-center justify-center mb-4">
                      <Mic className="h-5 w-5 text-blue-200" />
                    </div>
                    <h2 className="text-lg font-semibold mb-1">Drill Mode</h2>
                    <p className="text-sm text-white/60">
                      Continuous 15-minute voice exam simulation. Speak naturally, the patient and evaluator respond in real time, graded at the end.
                    </p>
                  </button>
                </Link>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 opacity-60">
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
