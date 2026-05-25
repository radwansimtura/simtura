import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { UpgradeModal } from "@/components/upgrade-modal";
import type { Scenario, ScenarioStep, VitalSigns, StepQuestion, StepResponse, GradeElaborationResponse } from "@shared/schema";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  Info,
  Lightbulb,
  Wind,
  Stethoscope,
  ThermometerSun,
  XCircle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Play,
  Mic,
  MicOff,
  Loader2,
  Brain,
  Share2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useScope } from "@/hooks/use-scope";

function track(event: string, params?: Record<string, unknown>) {
  try { (window as any).gtag?.("event", event, params ?? {}); } catch {}
}

type TrainerMode = "multiple-choice" | "open-response";

type GradeResult = {
  pass: boolean;
  score: number;
  summary: string;
  correct: string[];
  missed: string[];
  tip?: string;
  whyItMatters?: string;
  criticalFailure: boolean;
  criticalCriterionViolated: string | null;
};

const PASS_THRESHOLD = 70;

interface ScopeQuestion {
  question_type: string;
  cross_scope: boolean;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  rationale_correct: string;
  rationale_A: string;
  rationale_B: string;
  rationale_C: string;
  rationale_D: string;
}

type TrainerPhase =
  | "intro"
  | "dispatch-video"
  | "step-video"
  | "question"
  | "feedback"
  | "departure-video"
  | "results";

function getStepQuestions(step: ScenarioStep): StepQuestion[] {
  const questionsArray = step.questions as StepQuestion[] | null;
  if (questionsArray && Array.isArray(questionsArray) && questionsArray.length > 0) {
    return questionsArray;
  }
  return [{
    prompt: step.prompt,
    patientState: step.patientState ?? undefined,
    vitalSigns: step.vitalSigns as VitalSigns | null,
    correctActions: step.correctActions || [],
    incorrectActions: step.incorrectActions || [],
    feedbackCorrect: step.feedbackCorrect,
    feedbackIncorrect: step.feedbackIncorrect,
    hint: step.hint ?? undefined,
    isCritical: step.isCritical,
  }];
}

function ScopeVitals({ vitalSigns }: { vitalSigns: VitalSigns | null | undefined }) {
  if (!vitalSigns) return null;
  const v = vitalSigns;
  return (
    <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {v.hr != null && v.hr > 0 && (
        <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <div><div className="text-[10px] text-white/40">HR</div><div className="text-xs font-semibold font-mono text-white/90">{v.hr} bpm</div></div>
        </div>
      )}
      {v.rr != null && v.rr > 0 && (
        <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
          <Wind className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <div><div className="text-[10px] text-white/40">RR</div><div className="text-xs font-semibold font-mono text-white/90">{v.rr} /min</div></div>
        </div>
      )}
      {v.spo2 != null && v.spo2 > 0 && (
        <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <div><div className="text-[10px] text-white/40">SpO2</div><div className="text-xs font-semibold font-mono text-white/90">{v.spo2}%</div></div>
        </div>
      )}
      {v.bp && (
        <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
          <Stethoscope className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <div><div className="text-[10px] text-white/40">BP</div><div className="text-xs font-semibold font-mono text-white/90">{v.bp}</div></div>
        </div>
      )}
    </div>
  );
}

export default function ScenarioTrainerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const setLocation = navigate;
  const { user } = useAuth();
  const { toast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [phase, setPhase] = useState<TrainerPhase>("intro");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [responses, setResponses] = useState<StepResponse[]>([]);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoFading, setVideoFading] = useState(false);
  const [mode, setMode] = useState<TrainerMode>("multiple-choice");
  const [traineeAnswer, setTraineeAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [flashcardSync, setFlashcardSync] = useState<{ created: number; boosted: number; totalCardsInDeck: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [elaborationText, setElaborationText] = useState("");
  const [elaborationResult, setElaborationResult] = useState<GradeElaborationResponse | null>(null);
  const [elaborationLoading, setElaborationLoading] = useState(false);
  const [elaborationError, setElaborationError] = useState<string | null>(null);
  const [criticalFailureState, setCriticalFailureState] = useState<{
    show: boolean;
    criterion: string | null;
    summary: string;
  }>({ show: false, criterion: null, summary: "" });
  const { scope, setScope } = useScope();
  const [scopeSelectedOption, setScopeSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [scopeShowFeedback, setScopeShowFeedback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSupported = typeof window !== "undefined" && (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  const { data: scenario, isLoading: scenarioLoading, error: scenarioError } = useQuery<Scenario>({
    queryKey: ["/api/scenarios", id],
  });

  useEffect(() => {
    if (scenario?.title) {
      document.title = `${scenario.title} | Simtura.ai`;
      return () => { document.title = "Simtura.ai"; };
    }
  }, [scenario?.title]);

  const backUrl = scenario?.discipline === "Nursing" ? "/nursing" : "/ems";

  const { data: steps, isLoading: stepsLoading, error: stepsError } = useQuery<ScenarioStep[]>({
    queryKey: ["/api/scenarios", id, "steps"],
  });

  // /api/scenarios/:id/steps requires auth. A 401 from either query means
  // the user is logged out — redirect to signin with a next= back to here
  // rather than falling through to the "Scenario not found" check.
  useEffect(() => {
    const err = scenarioError ?? stepsError;
    if (err && err.message.startsWith("401")) {
      setLocation(`/signin?next=/scenario/${id}`);
    }
  }, [scenarioError, stepsError, id, setLocation]);

  const totalQuestions = useMemo(() => {
    if (!steps) return 0;
    return steps.reduce((sum, step) => sum + getStepQuestions(step).length, 0);
  }, [steps]);

  const questionsAnsweredSoFar = useMemo(() => {
    if (!steps) return 0;
    let count = 0;
    for (let i = 0; i < currentStepIndex; i++) {
      count += getStepQuestions(steps[i]).length;
    }
    count += currentQuestionIndex;
    return count;
  }, [steps, currentStepIndex, currentQuestionIndex]);

  const allQuestionsList = useMemo(() => {
    if (!steps) return [];
    const list: { step: ScenarioStep; question: StepQuestion; questionIndex: number }[] = [];
    for (const step of steps) {
      const qs = getStepQuestions(step);
      qs.forEach((q, qi) => list.push({ step, question: q, questionIndex: qi }));
    }
    return list;
  }, [steps]);

  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attempts", {
        scenarioId: id,
        totalSteps: totalQuestions,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAttemptId(data.id);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.startsWith("401")) {
        setLocation(`/signin?next=/scenario/${id}`);
      } else if (msg.startsWith("429") || msg.includes("free_limit_reached")) {
        track("free_limit_hit", { scenario_id: id });
        setShowUpgrade(true);
      }
    },
  });

  const completeAttemptMutation = useMutation({
    mutationFn: async (finalResponses: StepResponse[]) => {
      const correctCount = finalResponses.filter((r) => r.isCorrect).length;
      const score = Math.round((correctCount / finalResponses.length) * 100);
      const res = await apiRequest("PATCH", `/api/attempts/${attemptId}`, {
        completedAt: new Date().toISOString(),
        score,
        correctSteps: correctCount,
        responses: finalResponses,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attempts"] });
      // Sync flashcards: create deck/cards if needed, boost missed-step cards.
      // Capture response for the results page summary card.
      if (attemptId) {
        apiRequest("POST", "/api/flashcards/sync-from-attempt", { attemptId })
          .then((res) => res.json())
          .then((data) => {
            if (data && typeof data === "object") {
              setFlashcardSync({
                created: typeof data.created === "number" ? data.created : 0,
                boosted: typeof data.boosted === "number" ? data.boosted : 0,
                totalCardsInDeck: typeof data.totalCardsInDeck === "number" ? data.totalCardsInDeck : 0,
              });
            }
          })
          .catch((err) => console.warn("Flashcard sync failed:", err));
      }
    },
  });

  useEffect(() => {
    if (steps && steps.length > 0 && !attemptId) {
      startAttemptMutation.mutate();
    }
  }, [steps]);

  const playVideo = useCallback((src: string, onEnded?: () => void) => {
    const video = videoRef.current;
    if (!video) {
      onEnded?.();
      return;
    }
    setVideoFading(true);
    let resolved = false;
    const resolve = () => {
      if (resolved) return;
      resolved = true;
      onEnded?.();
    };
    const fallbackTimer = setTimeout(() => {
      setVideoFading(false);
      resolve();
    }, 30000);
    setTimeout(() => {
      video.src = src;
      video.load();
      video.currentTime = 0;
      const handleCanPlay = () => {
        video.removeEventListener("canplay", handleCanPlay);
        setVideoFading(false);
        video.play().catch(() => {
          clearTimeout(fallbackTimer);
          resolve();
        });
      };
      const handleError = () => {
        video.removeEventListener("error", handleError);
        clearTimeout(fallbackTimer);
        setVideoFading(false);
        resolve();
      };
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("error", handleError);
      if (onEnded) {
        const handleEnded = () => {
          video.removeEventListener("ended", handleEnded);
          video.removeEventListener("error", handleError);
          clearTimeout(fallbackTimer);
          resolve();
        };
        video.addEventListener("ended", handleEnded);
      } else {
        clearTimeout(fallbackTimer);
      }
    }, 300);
  }, []);

  const handleStartScenario = () => {
    if (!steps || steps.length === 0) return;
    track("scenario_start", { scenario_id: id, discipline: scenario?.discipline });

    const startFirstStep = () => {
      const step = steps[0];
      if (step?.videoUrl) {
        setPhase("step-video");
        playVideo(step.videoUrl, () => {
          setPhase("question");
          setStepStartTime(Date.now());
        });
      } else {
        setPhase("question");
        setStepStartTime(Date.now());
      }
    };

    if (scenario?.discipline === "Nursing") {
      startFirstStep();
    } else {
      setPhase("dispatch-video");
      playVideo("/videos/ambulance-driving.mp4", () => {
        startFirstStep();
      });
    }
  };

  const currentStep = steps?.[currentStepIndex] ?? null;
  const currentQuestions = currentStep ? getStepQuestions(currentStep) : [];
  const currentQuestion = currentQuestions[currentQuestionIndex] ?? null;

  const isScopeAdaptive = scenario?.gradingMode === "scope-adaptive";
  const currentScopeQuestions: ScopeQuestion[] =
    isScopeAdaptive && scope && currentStep?.questions
      ? ((currentStep.questions as Record<string, ScopeQuestion[]>)[scope] ?? [])
      : [];
  const currentScopeQuestion = isScopeAdaptive ? (currentScopeQuestions[currentQuestionIndex] ?? null) : null;

  const progressValue = totalQuestions > 0 ? ((questionsAnsweredSoFar + (phase === "feedback" ? 1 : 0)) / totalQuestions) * 100 : 0;
  const vitals = currentQuestion?.vitalSigns as VitalSigns | null;

  const [shuffledActions, setShuffledActions] = useState<string[]>([]);

  useEffect(() => {
    if (currentQuestion) {
      const allActions = [...(currentQuestion.correctActions || []), ...(currentQuestion.incorrectActions || [])];
      setShuffledActions(allActions.sort(() => Math.random() - 0.5));
    }
  }, [currentStepIndex, currentQuestionIndex, currentQuestion?.prompt]);

  // Reset scope answer state when navigating steps/questions
  useEffect(() => {
    if (isScopeAdaptive) {
      setScopeSelectedOption(null);
      setScopeShowFeedback(false);
    }
  }, [currentStepIndex, currentQuestionIndex, isScopeAdaptive]);

  const handleSelectAction = (action: string) => {
    if (phase !== "question") return;
    setSelectedAction(action);
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!speechSupported) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript) setTraineeAnswer((prev) => (prev ? prev + " " : "") + transcript.trim());
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error === "not-allowed") {
        setGradeError("Microphone access was denied. Enable it in your browser settings to use voice input.");
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [speechSupported]);

  useEffect(() => () => stopListening(), [stopListening]);

  const handleSubmit = async () => {
    if (!currentStep) return;
    const timeSpent = Math.round((Date.now() - stepStartTime) / 1000);

    // Scope-adaptive MCQ path
    if (isScopeAdaptive && currentScopeQuestion) {
      if (!scopeSelectedOption) return;
      const isCorrect = scopeSelectedOption === currentScopeQuestion.correct;
      const response: StepResponse = {
        stepId: currentStep.id,
        questionIndex: currentQuestionIndex,
        selectedAction: currentScopeQuestion.options[scopeSelectedOption],
        isCorrect,
        timeSpent,
        mode: "multiple-choice",
      };
      setResponses((prev) => [...prev, response]);
      setScopeShowFeedback(true);
      setPhase("feedback");
      return;
    }

    if (!currentQuestion) return;

    if (mode === "multiple-choice") {
      if (!selectedAction) return;
      const isCorrect = (currentQuestion.correctActions || []).includes(selectedAction);
      const response: StepResponse = {
        stepId: currentStep.id,
        questionIndex: currentQuestionIndex,
        selectedAction,
        isCorrect,
        timeSpent,
        mode: "multiple-choice",
      };
      setResponses((prev) => [...prev, response]);
      setPhase("feedback");
      return;
    }

    const trimmed = traineeAnswer.trim();
    if (!trimmed) return;
    setSubmittedAnswer(trimmed);
    stopListening();
    setIsGrading(true);
    setGradeError(null);
    try {
      const res = await apiRequest("POST", "/api/evaluate", {
        stepId: currentStep.id,
        traineeResponse: trimmed,
        questionIndex: currentQuestionIndex,
      });
      const result: GradeResult = await res.json();
      setGradeResult(result);
      if (result.criticalFailure) {
        if (attemptId) {
          await apiRequest("PATCH", `/api/attempts/${attemptId}`, {
            criticalFailure: true,
            criticalCriterionViolated: result.criticalCriterionViolated,
            endedEarly: true,
            completedAt: new Date().toISOString(),
          }).catch(() => {});
        }
        setCriticalFailureState({
          show: true,
          criterion: result.criticalCriterionViolated,
          summary: result.summary,
        });
        return;
      }
      const isCorrect = result.score >= PASS_THRESHOLD;
      const response: StepResponse = {
        stepId: currentStep.id,
        questionIndex: currentQuestionIndex,
        selectedAction: trimmed,
        isCorrect,
        timeSpent,
        mode: "open-response",
        aiScore: result.score,
        aiIncluded: result.correct,
        aiMissed: result.missed,
        aiSummary: result.summary,
      };
      setResponses((prev) => [...prev, response]);
      setPhase("feedback");
    } catch (err: any) {
      setGradeError(err?.message || "Evaluation failed. Please try again.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleSubmitElaboration = async (dontKnow = false) => {
    if (!currentStep) return;
    setElaborationLoading(true);
    setElaborationError(null);
    try {
      const res = await apiRequest("POST", "/api/grade-elaboration", {
        stepId: currentStep.id,
        traineeExplanation: dontKnow ? undefined : elaborationText,
        dontKnow: dontKnow || undefined,
      });
      const result: GradeElaborationResponse = await res.json();
      setElaborationResult(result);
    } catch (err: any) {
      setElaborationError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setElaborationLoading(false);
    }
  };

  const handleNext = () => {
    if (!steps || !currentStep) return;

    // Scope-adaptive: determine if more questions remain in this step
    const questionsInStep = isScopeAdaptive ? currentScopeQuestions.length : currentQuestions.length;
    const hasMoreQuestions = currentQuestionIndex + 1 < questionsInStep;

    if (hasMoreQuestions) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAction(null);
      setScopeSelectedOption(null);
      setScopeShowFeedback(false);
      setShowHint(false);
      setTraineeAnswer("");
      setSubmittedAnswer("");
      setGradeResult(null);
      setGradeError(null);
      setElaborationText("");
      setElaborationResult(null);
      setElaborationError(null);
      setPhase("question");
      setStepStartTime(Date.now());
      return;
    }

    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex >= steps.length) {
      const finalResponses = [...responses];
      completeAttemptMutation.mutate(finalResponses);
      track("scenario_complete", { scenario_id: id, discipline: scenario?.discipline });
      const departureUrl = scenario?.departureVideoUrl;
      if (departureUrl) {
        setPhase("departure-video");
        playVideo(departureUrl, () => {
          setPhase("results");
        });
      } else {
        setPhase("results");
      }
    } else {
      setCurrentStepIndex(nextStepIndex);
      setCurrentQuestionIndex(0);
      setSelectedAction(null);
      setScopeSelectedOption(null);
      setScopeShowFeedback(false);
      setShowHint(false);
      setTraineeAnswer("");
      setSubmittedAnswer("");
      setGradeResult(null);
      setGradeError(null);
      setElaborationText("");
      setElaborationResult(null);
      setElaborationError(null);
      const nextStep = steps[nextStepIndex];
      if (nextStep?.videoUrl) {
        setPhase("step-video");
        playVideo(nextStep.videoUrl, () => {
          setPhase("question");
          setStepStartTime(Date.now());
        });
      } else {
        setPhase("question");
        setStepStartTime(Date.now());
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (scenarioLoading || stepsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-white/40 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Scenario not found</h2>
          <Button onClick={() => navigate(backUrl)} variant="outline" data-testid="button-back-scenarios">
            Back to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  // Scope-adaptive scenarios legitimately have zero scenario_steps — their
  // questions are generated at runtime from scope-questions, not pre-seeded.
  if (scenario.gradingMode !== "scope-adaptive" && (!steps || steps.length === 0)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-white/40 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Scenario not found</h2>
          <Button onClick={() => navigate(backUrl)} variant="outline" data-testid="button-back-scenarios">
            Back to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  const isCorrectAnswer = selectedAction && currentQuestion && (currentQuestion.correctActions || []).includes(selectedAction);

  if (phase === "results") {
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / responses.length) * 100);

    return (
      <div ref={containerRef} className="relative min-h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl"
          >
            <div className="text-center mb-8">
              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                score >= 80 ? "bg-green-500/20 ring-2 ring-green-500/50" : score >= 60 ? "bg-yellow-500/20 ring-2 ring-yellow-500/50" : "bg-red-500/20 ring-2 ring-red-500/50"
              }`}>
                {score >= 80 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                ) : score >= 60 ? (
                  <AlertTriangle className="h-10 w-10 text-yellow-400" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-400" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-results-title">Scenario Complete</h1>
              <p className="text-white/60">{scenario.title}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
              <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{score}%</div>
                <div className="text-xs text-white/50 mt-1">Overall Score</div>
              </div>
              <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{correctCount}</div>
                <div className="text-xs text-white/50 mt-1">Correct</div>
              </div>
              <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{responses.length - correctCount}</div>
                <div className="text-xs text-white/50 mt-1">Incorrect</div>
              </div>
            </div>

            {flashcardSync && (flashcardSync.created > 0 || flashcardSync.totalCardsInDeck > 0) && (
              <Link href="/learn">
                <div className="group flex items-center justify-between gap-4 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 hover:border-blue-500/50 px-5 py-4 cursor-pointer transition-all mb-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Brain className="h-5 w-5 text-blue-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">
                        {flashcardSync.created > 0
                          ? `${flashcardSync.created} card${flashcardSync.created === 1 ? "" : "s"} added to your review queue`
                          : `${flashcardSync.totalCardsInDeck} cards in your review queue`}
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        {flashcardSync.boosted > 0
                          ? `${flashcardSync.boosted} from steps you missed are prioritized at the top.`
                          : "Spaced repetition keeps what you've learned from fading."}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            )}

            <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="font-semibold text-white/80 mb-3 sticky top-0 bg-black/80 backdrop-blur-sm py-2">Question-by-Question Review</h3>
              {responses.map((response, i) => {
                const qInfo = allQuestionsList.find(
                  (q) => q.step.id === response.stepId && q.questionIndex === (response.questionIndex ?? 0)
                ) ?? allQuestionsList[i];
                const question = qInfo?.question;
                const step = qInfo?.step;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 backdrop-blur-sm ${
                      response.isCorrect
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    }`}
                    data-testid={`review-step-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      {response.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/90 mb-0.5">{step?.phase}: {question?.prompt?.slice(0, 80)}...</div>
                        <div className="text-xs text-white/50">
                          Your answer: <span className={response.isCorrect ? "text-green-400" : "text-red-400"}>{response.selectedAction}</span>
                        </div>
                        {!response.isCorrect && question && (
                          <div className="text-xs text-white/40 mt-0.5">
                            Correct: {question.correctActions?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-white/30 shrink-0">{response.timeSpent}s</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate(backUrl)} variant="outline" className="border-white/20 text-white" data-testid="button-back-scenarios">
                <ArrowLeft className="mr-2 h-4 w-4" /> All Scenarios
              </Button>
              <Button onClick={() => window.location.reload()} className="bg-blue-600 text-white" data-testid="button-retry">
                Retry Scenario
              </Button>
              <Button
                variant="ghost"
                className="border-white/20 text-white"
                data-testid="button-share"
                onClick={async () => {
                  const shareText = `I just scored ${score}% on "${scenario.title}" on Simtura.ai`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: "Simtura.ai", text: shareText, url: "https://simtura.ai" });
                    } catch {}
                  } else {
                    try {
                      await navigator.clipboard.writeText("https://simtura.ai");
                      toast({ title: "Copied!", description: "Link copied to clipboard." });
                    } catch {}
                  }
                }}
              >
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const showVideoPlaying = phase === "dispatch-video" || phase === "step-video" || phase === "departure-video";
  const showQuestionUI = phase === "question" || phase === "feedback";

  const questionsInCurrentStep = isScopeAdaptive ? currentScopeQuestions.length : currentQuestions.length;
  const isLastQuestion = currentStepIndex + 1 >= (steps?.length ?? 0) && currentQuestionIndex + 1 >= Math.max(questionsInCurrentStep, 1);
  const hasMoreQuestionsInStep = currentQuestionIndex + 1 < questionsInCurrentStep;
  const nextButtonLabel = isLastQuestion ? "View Results" : hasMoreQuestionsInStep ? "Next Question" : "Next Step";

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-black flex flex-col sm:block" data-testid="video-trainer-container">
      <video
        ref={videoRef}
        className={`transition-opacity duration-500 sm:object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full ${
          showVideoPlaying
            ? "flex-1 w-full object-contain bg-black"
            : "shrink-0 h-[35vh] w-full object-cover"
        } ${videoFading ? "opacity-0" : "opacity-100"}`}
        muted={isMuted}
        playsInline
        data-testid="video-background"
      />

      {showVideoPlaying && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30 z-10" />
      )}

      {showQuestionUI && (
        <>
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />
        </>
      )}

      <div className="absolute bottom-4 right-4 z-30 group">
        <div className="relative flex items-center justify-center">
          <Info className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors cursor-default" />
          <div className="absolute bottom-6 right-0 w-56 rounded-xl bg-black/80 backdrop-blur border border-white/10 px-3 py-2.5 text-[11px] text-white/60 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            These videos are AI-generated. You may occasionally notice visual glitches — like objects appearing or disappearing. They don't affect the learning content.
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backUrl)}
              className="text-white/80"
              data-testid="button-exit-scenario"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="text-sm font-medium text-white/90 truncate max-w-[200px]">{scenario.title}</div>
              {phase !== "intro" && (
                <div className="text-xs text-white/50">
                  {showVideoPlaying ? (
                    phase === "dispatch-video" ? "En Route..." : phase === "departure-video" ? "Transporting patient..." : `Step ${currentStepIndex + 1} of ${steps?.length ?? 0}`
                  ) : (
                    <>
                      Step {currentStepIndex + 1} of {steps?.length ?? 0}
                      {currentQuestions.length > 1 && (
                        <span className="text-white/30"> &middot; Q{currentQuestionIndex + 1}/{currentQuestions.length}</span>
                      )}
                      <span className="text-white/30"> &middot; {questionsAnsweredSoFar + 1}/{totalQuestions} total</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showQuestionUI && currentStep && (
              <Badge className="bg-blue-600/80 text-white border-0 backdrop-blur-sm text-xs">
                {currentStep.phase}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/60"
              data-testid="button-toggle-mute"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white/60"
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {phase !== "intro" && (
          <div className="px-4 pb-2">
            <Progress value={progressValue} className="h-1 bg-white/10" data-testid="progress-bar" />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-start sm:items-center justify-center bg-black/70 overflow-y-auto"
          >
            <div className="text-center max-w-lg px-4 pt-16 pb-6 sm:py-0">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-600/30 ring-2 ring-blue-500/50 flex items-center justify-center">
                  <Stethoscope className="h-8 w-8 text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3" data-testid="text-scenario-title">{scenario.title}</h1>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Badge className="bg-white/10 text-white/70 border-white/20">{scenario.certLevel}</Badge>
                  <Badge className="bg-white/10 text-white/70 border-white/20">{scenario.difficulty}</Badge>
                  <Badge className="bg-white/10 text-white/70 border-white/20">{totalQuestions} questions</Badge>
                </div>
                <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 mb-4 text-left">
                  <div className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2">Dispatch Info</div>
                  <p className="text-sm text-white/80 leading-relaxed">{scenario.patientSummary}</p>
                </div>

                <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 mb-6 text-left">
                  <div className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">Practice Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode("multiple-choice")}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        mode === "multiple-choice"
                          ? "border-blue-500/60 bg-blue-500/15"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      }`}
                      data-testid="button-mode-multiple-choice"
                    >
                      <div className="text-sm font-semibold text-white mb-0.5">Multiple Choice</div>
                      <div className="text-[11px] text-white/50 leading-snug">Pick the correct answer from options.</div>
                    </button>
                    <button
                      onClick={() => setMode("open-response")}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        mode === "open-response"
                          ? "border-blue-500/60 bg-blue-500/15"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      }`}
                      data-testid="button-mode-open-response"
                    >
                      <div className="text-sm font-semibold text-white mb-0.5 flex items-center gap-1.5">
                        Open Response <Brain className="h-3 w-3 text-blue-400" />
                      </div>
                      <div className="text-[11px] text-white/50 leading-snug">Type or speak your answer. AI scores it.</div>
                    </button>
                  </div>
                </div>

                {user && user.tier !== "pro" && (
                  <p className="text-center text-xs text-white/40 mb-3">
                    Free accounts: 1 scenario per day. <span className="text-white/60">Upgrade for unlimited.</span>
                  </p>
                )}
                <Button
                  onClick={handleStartScenario}
                  size="lg"
                  className="bg-blue-600 text-white px-8 text-base"
                  data-testid="button-start-scenario"
                >
                  <Play className="mr-2 h-5 w-5" /> Respond to Call
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {showVideoPlaying && (
          <motion.div
            key="video-playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end justify-center pb-12"
          >
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white/80 font-medium">
                {phase === "dispatch-video" && "Responding to call..."}
                {phase === "step-video" && `Arriving at step ${currentStepIndex + 1}...`}
                {phase === "departure-video" && "Transporting to hospital..."}
              </span>
            </div>
          </motion.div>
        )}

        {/* Scope-adaptive question UI */}
        {showQuestionUI && isScopeAdaptive && (
          <motion.div
            key={`scope-question-${currentStepIndex}-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 sm:inset-0 sm:top-0 z-20 sm:flex sm:items-center"
          >
            <div className="w-full sm:max-w-md px-4 sm:pl-8 sm:pr-2 pb-4 sm:pb-0 max-h-[65vh] sm:max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar bg-black sm:bg-transparent rounded-t-xl sm:rounded-none pt-3 sm:pt-0">
              {/* Vitals from step */}
              <ScopeVitals vitalSigns={currentStep?.vitalSigns as VitalSigns | null} />

              {/* No scope selected */}
              {!scope && (
                <div className="rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 p-5">
                  <p className="text-white/90 text-sm font-medium mb-1">
                    Select your provider scope
                  </p>
                  <p className="text-white/50 text-xs mb-4">
                    Questions and grading will match your certification level. You can change this later from the scenarios page.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["EMT-B", "AEMT", "Paramedic"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setScope(s)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                          s === "EMT-B"
                            ? "bg-blue-500 hover:bg-blue-400 text-white"
                            : s === "AEMT"
                            ? "bg-violet-500 hover:bg-violet-400 text-white"
                            : "bg-rose-500 hover:bg-rose-400 text-white"
                        }`}
                        data-testid={`button-inline-scope-${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Question */}
              {scope && currentScopeQuestion && (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className={`text-[10px] border-0 ${scope === "EMT-B" ? "bg-blue-600/80" : scope === "AEMT" ? "bg-violet-600/80" : "bg-rose-600/80"} text-white`}>
                      {scope} Scope
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">
                      {currentScopeQuestion.question_type}
                    </Badge>
                    {currentScopeQuestion.cross_scope && (
                      <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400">
                        Situational Awareness
                      </Badge>
                    )}
                  </div>

                  <div className="mb-3 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 p-4">
                    <h2 className="text-base font-bold text-white">
                      {currentScopeQuestion.question}
                    </h2>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const isSelected = scopeSelectedOption === letter;
                      const isCorrect = scopeShowFeedback && letter === currentScopeQuestion.correct;
                      const isWrong = scopeShowFeedback && isSelected && letter !== currentScopeQuestion.correct;
                      return (
                        <button
                          key={letter}
                          onClick={() => !scopeShowFeedback && setScopeSelectedOption(letter)}
                          disabled={scopeShowFeedback}
                          className={`w-full text-left rounded-lg border p-3 transition-all text-sm backdrop-blur-md ${
                            scopeShowFeedback
                              ? isCorrect
                                ? "border-green-500/50 bg-green-500/15"
                                : isWrong
                                ? "border-red-500/50 bg-red-500/15"
                                : "border-white/5 bg-black/40 opacity-40"
                              : isSelected
                              ? "border-blue-500/50 bg-blue-500/15"
                              : "border-white/10 bg-black/50 hover:border-white/20 hover:bg-black/60"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5 ${
                              scopeShowFeedback
                                ? isCorrect ? "bg-green-500 text-white" : isWrong ? "bg-red-500 text-white" : "bg-white/10 text-white/30"
                                : isSelected ? "bg-blue-500 text-white" : "bg-white/10 text-white/50"
                            }`}>
                              {scopeShowFeedback ? (isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : isWrong ? <XCircle className="h-3.5 w-3.5" /> : letter) : letter}
                            </div>
                            <span className="text-white/90 text-xs leading-snug">{currentScopeQuestion.options[letter]}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit */}
                  {!scopeShowFeedback && (
                    <div className="mb-3">
                      <Button
                        onClick={handleSubmit}
                        disabled={!scopeSelectedOption}
                        className="bg-blue-600 text-white disabled:opacity-30"
                      >
                        Submit Answer
                      </Button>
                    </div>
                  )}

                  {/* Feedback rationale */}
                  {scopeShowFeedback && (() => {
                    const isCorrect = scopeSelectedOption === currentScopeQuestion.correct;
                    const rationaleKey = `rationale_${scopeSelectedOption}` as keyof ScopeQuestion;
                    const selectedRationale = currentScopeQuestion[rationaleKey] as string;
                    const correctRationale = currentScopeQuestion.rationale_correct;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2 mb-3"
                      >
                        <div className={`rounded-lg border p-4 backdrop-blur-md ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                            <span className="text-sm font-semibold text-white">{isCorrect ? "Correct" : "Incorrect"}</span>
                          </div>
                          <p className="text-xs text-white/80 leading-relaxed">{isCorrect ? correctRationale : selectedRationale}</p>
                        </div>
                        {!isCorrect && (
                          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 backdrop-blur-md">
                            <div className="text-[10px] uppercase tracking-wider text-green-400/70 font-medium mb-1">Correct answer — {currentScopeQuestion.correct}</div>
                            <p className="text-xs text-white/70 leading-relaxed">{correctRationale}</p>
                          </div>
                        )}
                        <Button
                          onClick={handleNext}
                          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        >
                          {nextButtonLabel} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })()}
                </>
              )}

              {/* No questions for this step */}
              {scope && currentScopeQuestions.length === 0 && (
                <div className="rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 p-5 text-center">
                  <p className="text-white/60 text-sm">No questions available for this step.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {showQuestionUI && !isScopeAdaptive && currentQuestion && (
          <motion.div
            key={`question-${currentStepIndex}-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 sm:inset-0 sm:top-0 z-20 sm:flex sm:items-center"
          >
            <div className="w-full sm:max-w-md px-4 sm:pl-8 sm:pr-2 pb-4 sm:pb-0 max-h-[65vh] sm:max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar bg-black sm:bg-transparent rounded-t-xl sm:rounded-none pt-3 sm:pt-0">
              {vitals && (
                <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="vitals-panel">
                  {vitals.hr !== undefined && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">HR</div>
                        <div className="text-xs font-semibold font-mono text-white/90">{vitals.hr} bpm</div>
                      </div>
                    </div>
                  )}
                  {vitals.rr !== undefined && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <Wind className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">RR</div>
                        <div className="text-xs font-semibold font-mono text-white/90">{vitals.rr} /min</div>
                      </div>
                    </div>
                  )}
                  {vitals.spo2 !== undefined && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">SpO2</div>
                        <div className="text-xs font-semibold font-mono text-white/90">{vitals.spo2}%</div>
                      </div>
                    </div>
                  )}
                  {vitals.bp && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <Stethoscope className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">BP</div>
                        <div className="text-xs font-semibold font-mono text-white/90">{vitals.bp}</div>
                      </div>
                    </div>
                  )}
                  {vitals.skinColor && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <ThermometerSun className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">Skin</div>
                        <div className="text-xs font-semibold text-white/90">{vitals.skinColor}</div>
                      </div>
                    </div>
                  )}
                  {vitals.etco2 !== undefined && (
                    <div className="rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-2 flex items-center gap-2">
                      <Wind className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/40">EtCO2</div>
                        <div className="text-xs font-semibold font-mono text-white/90">{vitals.etco2} mmHg</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.patientState && (
                <div className="mb-3 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 p-3" data-testid="patient-state">
                  <div className="flex items-start gap-2">
                    <Stethoscope className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5">Patient Presentation</div>
                      <p className="text-xs text-white/80 leading-relaxed">{currentQuestion.patientState}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-3 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 p-4">
                <h2 className="text-base font-bold text-white mb-1" data-testid="text-step-prompt">
                  {currentQuestion.prompt}
                </h2>
                {currentQuestion.isCritical && scenario?.gradingMode === "nremt_medical" && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Critical Decision
                  </Badge>
                )}
              </div>

              {mode === "multiple-choice" && (
                <div className="space-y-1.5 mb-3">
                  {shuffledActions.map((action, i) => {
                    const isSelected = selectedAction === action;
                    const isCorrect = phase === "feedback" && (currentQuestion.correctActions || []).includes(action);
                    const isWrong = phase === "feedback" && isSelected && !isCorrect;

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectAction(action)}
                        disabled={phase === "feedback"}
                        className={`w-full text-left rounded-lg border p-3 transition-all text-sm backdrop-blur-md ${
                          phase === "feedback"
                            ? isCorrect
                              ? "border-green-500/50 bg-green-500/15"
                              : isWrong
                              ? "border-red-500/50 bg-red-500/15"
                              : "border-white/5 bg-black/40 opacity-40"
                            : isSelected
                            ? "border-blue-500/50 bg-blue-500/15"
                            : "border-white/10 bg-black/50 hover:border-white/20 hover:bg-black/60"
                        }`}
                        data-testid={`button-action-${i}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                            phase === "feedback"
                              ? isCorrect
                                ? "bg-green-500 text-white"
                                : isWrong
                                ? "bg-red-500 text-white"
                                : "bg-white/10 text-white/30"
                              : isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-white/10 text-white/50"
                          }`}>
                            {phase === "feedback" ? (
                              isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : isWrong ? <XCircle className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)
                            ) : (
                              String.fromCharCode(65 + i)
                            )}
                          </div>
                          <span className="text-white/90 text-xs leading-snug">{action}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {mode === "open-response" && phase === "question" && (
                <div className="mb-3 rounded-lg border border-white/10 bg-black/50 backdrop-blur-md p-3" data-testid="open-response-input">
                  <Textarea
                    value={traineeAnswer}
                    onChange={(e) => setTraineeAnswer(e.target.value)}
                    placeholder={isListening ? "Listening... speak your answer." : "Type your answer or tap the mic to dictate..."}
                    rows={4}
                    disabled={isGrading}
                    className="bg-transparent border-white/10 text-white placeholder:text-white/30 resize-none focus-visible:ring-blue-500/40"
                    data-testid="textarea-open-answer"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {speechSupported ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={isListening ? "destructive" : "secondary"}
                        onClick={isListening ? stopListening : startListening}
                        disabled={isGrading}
                        className="text-xs"
                        data-testid="button-mic"
                      >
                        {isListening ? (
                          <><MicOff className="mr-1.5 h-3.5 w-3.5" /> Stop</>
                        ) : (
                          <><Mic className="mr-1.5 h-3.5 w-3.5" /> Speak</>
                        )}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-white/40">Voice input not supported in this browser</span>
                    )}
                    <span className="text-[10px] text-white/40">{traineeAnswer.length} chars</span>
                  </div>
                </div>
              )}

              {phase === "question" && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isGrading ||
                      (mode === "open-response" ? !traineeAnswer.trim() : !selectedAction)
                    }
                    className="bg-blue-600 text-white disabled:opacity-30"
                    data-testid="button-submit-answer"
                  >
                    {isGrading ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Grading...</>
                    ) : mode === "open-response" ? (
                      "Submit for AI Grading"
                    ) : (
                      "Submit Answer"
                    )}
                  </Button>
                  {currentQuestion.hint && !showHint && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowHint(true)}
                      className="text-white/60"
                      data-testid="button-show-hint"
                    >
                      <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Hint
                    </Button>
                  )}
                  {gradeError && (
                    <span className="text-xs text-red-400" data-testid="text-grade-error">{gradeError}</span>
                  )}
                </div>
              )}

              {showHint && phase === "question" && currentQuestion.hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-md p-3"
                  data-testid="hint-panel"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-white/80">{currentQuestion.hint}</p>
                  </div>
                </motion.div>
              )}

              {phase === "feedback" && (() => {
                const usesAI = mode === "open-response";
                const passedOpen = usesAI && gradeResult ? gradeResult.score >= PASS_THRESHOLD : false;
                const headlineCorrect = usesAI ? passedOpen : !!isCorrectAnswer;
                return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                  data-testid="feedback-panel"
                >
                  {submittedAnswer && (
                    <div
                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-md"
                      data-testid="submitted-answer-panel"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-blue-400/80 font-medium mb-1.5">
                        Your answer
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                        {submittedAnswer}
                      </p>
                    </div>
                  )}
                  {usesAI && gradeResult && (
                    <div className={`rounded-lg border p-4 backdrop-blur-md ${
                      passedOpen ? "border-green-500/30 bg-green-500/10" : "border-yellow-500/30 bg-yellow-500/10"
                    }`} data-testid="ai-grade-panel">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-blue-400" />
                          <span className="text-xs uppercase tracking-wider text-white/60 font-medium">AI Congruency Score</span>
                        </div>
                        <div className={`text-2xl font-bold font-mono ${passedOpen ? "text-green-400" : "text-yellow-400"}`} data-testid="text-ai-score">
                          {gradeResult.score}<span className="text-sm text-white/40">/100</span>
                        </div>
                      </div>
                      {gradeResult.summary && (
                        <p className="text-xs text-white/70 leading-relaxed mb-3" data-testid="text-ai-summary">{gradeResult.summary}</p>
                      )}
                      {gradeResult.correct.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] uppercase tracking-wider text-green-400/80 font-medium mb-1">You covered</div>
                          <ul className="space-y-0.5">
                            {gradeResult.correct.map((item, i) => (
                              <li key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {gradeResult.missed.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-red-400/80 font-medium mb-1">You missed</div>
                          <ul className="space-y-0.5">
                            {gradeResult.missed.map((item, i) => (
                              <li key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                                <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {usesAI && gradeResult && !passedOpen && gradeResult.tip && scenario?.gradingMode !== "nremt_medical" && (
                    <div
                      className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 backdrop-blur-md"
                      data-testid="coaching-tip-panel"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-purple-400/80 font-medium mb-1">
                            Coaching tip
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed">{gradeResult.tip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!(!headlineCorrect && !criticalFailureState.show) && (
                  <div className={`rounded-lg border p-4 backdrop-blur-md ${
                    headlineCorrect
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {headlineCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-sm text-white mb-0.5">
                          {usesAI
                            ? (passedOpen
                                ? `Pass (≥${PASS_THRESHOLD})`
                                : (gradeResult?.whyItMatters ? "Why this matters" : `Below passing (${PASS_THRESHOLD}+ to pass)`))
                            : (headlineCorrect ? "Correct!" : "Not quite right")}
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {headlineCorrect
                            ? currentQuestion.feedbackCorrect
                            : (usesAI && gradeResult?.whyItMatters
                                ? gradeResult.whyItMatters
                                : currentQuestion.feedbackIncorrect)}
                        </p>
                      </div>
                    </div>
                  </div>
                  )}
                  {!headlineCorrect && scenario?.gradingMode === "nremt_medical" && !criticalFailureState.show && (
                    <div
                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-md"
                      data-testid="elaboration-panel"
                    >
                      {!elaborationResult ? (
                        <>
                          <div className="flex items-start gap-2.5 mb-3">
                            <Brain className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-semibold text-sm text-white mb-0.5">
                                {(() => {
                                  const currentAction = gradeResult?.missed?.[0];
                                  const previousStep = steps && currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
                                  const previousAction = previousStep?.correctActions?.[0];
                                  if (!currentAction) return "Why is this the correct action?";
                                  if (previousAction) {
                                    return `Why is "${currentAction}" the correct step immediately after "${previousAction}"?`;
                                  }
                                  return `Why is "${currentAction}" the correct first action?`;
                                })()}
                              </div>
                              <p className="text-xs text-white/60 leading-relaxed">
                                Explaining in your own words helps build durable understanding.
                              </p>
                            </div>
                          </div>
                          <textarea
                            value={elaborationText}
                            onChange={(e) => setElaborationText(e.target.value)}
                            placeholder="Type your explanation..."
                            className="w-full min-h-[80px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                            disabled={elaborationLoading}
                            data-testid="textarea-elaboration"
                          />
                          {elaborationError && (
                            <p className="text-xs text-red-400 mt-2" data-testid="text-elaboration-error">
                              {elaborationError}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-2 mt-3">
                            <Button
                              variant="ghost"
                              onClick={() => handleSubmitElaboration(true)}
                              disabled={elaborationLoading}
                              className="text-white/60 hover:text-white/90 hover:bg-white/5 text-xs"
                              data-testid="button-elaboration-dont-know"
                            >
                              I don't know
                            </Button>
                            <Button
                              onClick={() => handleSubmitElaboration(false)}
                              disabled={elaborationLoading || elaborationText.trim().length === 0}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              data-testid="button-elaboration-submit"
                            >
                              {elaborationLoading ? "Submitting..." : "Submit explanation"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-white mb-1">
                              {elaborationResult.isReasonable ? "Good thinking" : "Here's the reasoning"}
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed mb-2">
                              {elaborationResult.feedback}
                            </p>
                            {elaborationResult.captured.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[10px] uppercase tracking-wider text-green-400/80 font-medium mb-1">
                                  You connected
                                </div>
                                <ul className="space-y-0.5">
                                  {elaborationResult.captured.map((item, i) => (
                                    <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {elaborationResult.didNotMention.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium mb-1">
                                  Also worth knowing
                                </div>
                                <ul className="space-y-0.5">
                                  {elaborationResult.didNotMention.map((item, i) => (
                                    <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                                      <Lightbulb className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleNext}
                      disabled={!headlineCorrect && scenario?.gradingMode === "nremt_medical" && !criticalFailureState.show && !elaborationResult}
                      className="bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-next-step"
                    >
                      {nextButtonLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          navigate(backUrl);
        }}
        reason="You've used your free scenario for today. Upgrade to Pro for unlimited training."
      />

      <AnimatePresence>
        {criticalFailureState.show && (
          <motion.div
            key="critical-failure-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-md mx-4"
            >
              <div className="rounded-2xl bg-red-950/90 backdrop-blur-xl border border-red-500/30 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/40">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Scenario Ended — Critical Failure
                  </h2>
                </div>

                {criticalFailureState.criterion && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-4">
                    <div className="text-[10px] uppercase tracking-wider text-red-400/80 font-medium mb-1">
                      Criterion Violated
                    </div>
                    <p className="text-sm text-white/90 leading-snug">
                      {criticalFailureState.criterion}
                    </p>
                  </div>
                )}

                {criticalFailureState.summary && (
                  <p className="text-xs text-white/60 mb-2 leading-relaxed italic">
                    {criticalFailureState.summary}
                  </p>
                )}

                <p className="text-xs text-white/50 mb-5 leading-relaxed">
                  On the NREMT exam, this would be an automatic failure regardless of other points earned.
                </p>

                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                  data-testid="button-restart-after-critical-failure"
                >
                  Restart Scenario
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation(backUrl)}
                  className="w-full mt-2 text-white/50 hover:text-white/80"
                >
                  Back to Scenarios
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
