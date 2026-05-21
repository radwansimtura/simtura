import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Play,
  Square,
} from "lucide-react";
import { createOrchestrator, type DrillOrchestrator } from "@/lib/drill-mode/orchestrator";
import {
  DRILL_DURATION_SECONDS,
  SCENARIO_1A_ID,
  type EndReason,
  type GradingResult,
  type TranscriptEntry,
} from "@/lib/drill-mode/types";
import { registerDrillModeServiceWorker } from "@/lib/drill-mode/service-worker";
import { DrillReport } from "@/components/drill-mode/drill-report";

type Phase =
  | "loading_flags"
  | "ready"
  | "mic_denied"
  | "starting"
  | "running"
  | "grading"
  | "report";

type FeatureFlags = { drillModeEnabled: boolean };

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function requestMicPermission(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: "Microphone API not available in this browser." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, reason: message };
  }
}

export default function DrillScenario1APage() {
  const [, navigate] = useLocation();
  useEffect(() => {
    document.title = "Drill Mode — Scenario 1A | Simtura.ai";
    return () => {
      document.title = "Simtura.ai";
    };
  }, []);

  useEffect(() => {
    void registerDrillModeServiceWorker();
  }, []);

  const { data: flags, isLoading: flagsLoading } = useQuery<FeatureFlags>({
    queryKey: ["/api/feature-flags"],
  });

  const [phase, setPhase] = useState<Phase>("loading_flags");
  const [micError, setMicError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [scene, setScene] = useState<"wide" | "clipboard">("wide");
  const [transcriptVersion, setTranscriptVersion] = useState(0);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  const backgroundRef = useRef<HTMLVideoElement>(null);
  const clipboardRef = useRef<HTMLVideoElement>(null);
  const orchestratorRef = useRef<DrillOrchestrator | null>(null);

  useEffect(() => {
    if (flagsLoading) return;
    if (!flags?.drillModeEnabled) return;
    setPhase((p) => (p === "loading_flags" ? "ready" : p));
  }, [flagsLoading, flags]);

  useEffect(() => {
    return () => {
      if (orchestratorRef.current) {
        void orchestratorRef.current.stop("abandoned");
        orchestratorRef.current = null;
      }
    };
  }, []);

  const transcript: TranscriptEntry[] = useMemo(() => {
    if (!orchestratorRef.current) return [];
    return orchestratorRef.current.getLogger().snapshotTranscript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptVersion]);

  async function handleStart() {
    setMicError(null);
    const mic = await requestMicPermission();
    if (!mic.ok) {
      setPhase("mic_denied");
      setMicError(mic.reason ?? "Microphone permission denied.");
      return;
    }
    setPhase("starting");
    try {
      const orchestrator = createOrchestrator({
        visualHandles: {
          backgroundRef,
          clipboardRef,
        },
        callbacks: {
          onElapsed: setElapsed,
          onSttListening: setListening,
          onSttError: setSttError,
          onSceneChange: setScene,
          onTranscriptUpdate: () => setTranscriptVersion((v) => v + 1),
          onSessionEnded: (reason) => {
            void handleGrade(reason);
          },
        },
      });
      orchestratorRef.current = orchestrator;
      await orchestrator.start();
      setPhase("running");
    } catch (err) {
      console.error(err);
      setMicError(err instanceof Error ? err.message : "Failed to start drill.");
      setPhase("ready");
    }
  }

  async function handleGrade(_reason: EndReason) {
    setPhase("grading");
    const o = orchestratorRef.current;
    if (!o) {
      setGradingError("Orchestrator missing.");
      setPhase("report");
      return;
    }
    const sessionId = o.getSessionId();
    if (!sessionId) {
      setGradingError("Session was not persisted (no session ID).");
      setPhase("report");
      return;
    }
    try {
      const res = await fetch(`/api/drill/sessions/${sessionId}/grade`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`grade ${res.status}`);
      const body: GradingResult = await res.json();
      setGrading(body);
      setPhase("report");
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : "Grading failed.");
      setPhase("report");
    }
  }

  async function handleStopEarly() {
    const o = orchestratorRef.current;
    if (!o) return;
    await o.stop("candidate_terminated");
  }

  function handleRetry() {
    orchestratorRef.current = null;
    setGrading(null);
    setGradingError(null);
    setElapsed(0);
    setSttError(null);
    setTranscriptVersion(0);
    setPhase("ready");
  }

  if (flagsLoading || phase === "loading_flags") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!flags?.drillModeEnabled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-white/40 mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Drill Mode is coming soon</h1>
          <p className="text-white/60 text-sm mb-6">
            Continuous voice-driven scenario practice with real-time evaluation. We&rsquo;re building it now.
          </p>
          <Link href={`/scenario/${SCENARIO_1A_ID}`}>
            <Button variant="outline" data-testid="button-back-to-scenario">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scenario 1A
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "report" && grading) {
    return (
      <DrillReport
        result={grading}
        onRetry={handleRetry}
        onBack={() => navigate(`/scenario/${SCENARIO_1A_ID}`)}
      />
    );
  }

  if (phase === "report" && gradingError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Couldn&rsquo;t grade the session</h1>
          <p className="text-white/60 text-sm mb-2">{gradingError}</p>
          <p className="text-white/40 text-xs mb-6">
            Your transcript was logged. Try again or come back later.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRetry} variant="outline" data-testid="button-retry-after-error">
              Try again
            </Button>
            <Link href={`/scenario/${SCENARIO_1A_ID}`}>
              <Button variant="ghost" data-testid="button-back-to-scenario-after-error">
                Back to Scenario 1A
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remaining = DRILL_DURATION_SECONDS - elapsed;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-black">
        <video
          ref={backgroundRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${scene === "wide" ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          loop
        />
        <video
          ref={clipboardRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${scene === "clipboard" ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/scenario/${SCENARIO_1A_ID}`}>
              <Button variant="ghost" size="sm" data-testid="button-back-from-drill">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <span className="text-xs uppercase tracking-wider text-white/40">Drill Mode · Scenario 1A</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1 text-sm tabular-nums px-3 py-1 rounded-full bg-white/5 border border-white/10 ${remaining <= 60 ? "text-red-300" : "text-white/80"}`}
              data-testid="text-timer"
            >
              {formatClock(remaining)}
            </div>
            <div className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
              {listening ? (
                <>
                  <Mic className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-white/70">Listening</span>
                </>
              ) : (
                <>
                  <MicOff className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-white/40">Idle</span>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          {phase === "ready" && (
            <div className="max-w-md text-center">
              <h1 className="text-3xl font-bold mb-3">Ready to start</h1>
              <p className="text-white/70 text-sm mb-2">
                15-minute continuous voice exam. Speak naturally. The patient and evaluator will respond.
              </p>
              <p className="text-white/50 text-xs mb-8">
                The session begins with dispatch. Talk through your assessment as you would in the real exam.
              </p>
              {micError && (
                <p className="text-red-300 text-sm mb-4">{micError}</p>
              )}
              <Button
                size="lg"
                onClick={handleStart}
                className="bg-blue-500 hover:bg-blue-400 text-white"
                data-testid="button-start-drill"
              >
                <Play className="h-4 w-4 mr-2" />
                Start drill
              </Button>
            </div>
          )}

          {phase === "mic_denied" && (
            <div className="max-w-md text-center">
              <MicOff className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Microphone access required</h1>
              <p className="text-white/60 text-sm mb-2">{micError}</p>
              <p className="text-white/40 text-xs mb-6">
                Grant microphone permission in your browser, then try again.
              </p>
              <Button onClick={handleStart} variant="outline" data-testid="button-retry-mic">
                Try again
              </Button>
            </div>
          )}

          {phase === "starting" && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Loading assets...</p>
            </div>
          )}

          {phase === "running" && (
            <div className="w-full max-w-3xl">
              {sttError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-200">
                  Speech recognition: {sttError}
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4 max-h-[55vh] overflow-y-auto">
                <div className="text-xs uppercase tracking-wide text-white/40 mb-3">Transcript</div>
                <div className="space-y-2 text-sm">
                  {transcript.length === 0 && (
                    <p className="text-white/30 italic">Waiting for the dispatcher...</p>
                  )}
                  {transcript.map((entry, i) => (
                    <TranscriptLine key={i} entry={entry} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "grading" && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-white/80 text-base mb-1">Evaluating your performance...</p>
              <p className="text-white/40 text-xs">Sending transcript for grading.</p>
            </div>
          )}
        </main>

        {phase === "running" && (
          <footer className="px-6 py-4 flex justify-center">
            <Button
              onClick={handleStopEarly}
              variant="outline"
              size="sm"
              data-testid="button-end-drill"
            >
              <Square className="h-4 w-4 mr-2" />
              End scenario early
            </Button>
          </footer>
        )}
      </div>
    </div>
  );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  if (entry.speaker === "candidate") {
    return (
      <div className="flex gap-2">
        <span className="text-blue-300/80 text-xs font-medium uppercase tracking-wide w-20 shrink-0">You</span>
        <span className="text-white/85">{entry.text}</span>
      </div>
    );
  }
  if (entry.event === "scenario_start") {
    return <div className="text-white/30 italic text-xs">— scenario started —</div>;
  }
  if (entry.event === "scenario_end") {
    return <div className="text-white/30 italic text-xs">— scenario ended ({entry.text}) —</div>;
  }
  if (entry.event === "clipboard_write") {
    const label = entry.text ?? entry.lineId;
    return (
      <div className="text-white/30 italic text-xs">
        {label ? `(evaluator notes: ${label})` : "(evaluator notes)"}
      </div>
    );
  }
  const speaker = entry.event === "patient_audio" ? "Patient" : "Evaluator";
  return (
    <div className="flex gap-2">
      <span className="text-white/40 text-xs font-medium uppercase tracking-wide w-20 shrink-0">{speaker}</span>
      <span className="text-white/70 italic">{entry.lineId ?? ""}</span>
    </div>
  );
}
