import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Scenario, ScenarioStep, VitalSigns, StepResponse } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  Lightbulb,
  Wind,
  Stethoscope,
  ThermometerSun,
  XCircle,
} from "lucide-react";

export default function ScenarioTrainerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [responses, setResponses] = useState<StepResponse[]>([]);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const { data: scenario, isLoading: scenarioLoading } = useQuery<Scenario>({
    queryKey: ["/api/scenarios", id],
  });

  const { data: steps, isLoading: stepsLoading } = useQuery<ScenarioStep[]>({
    queryKey: ["/api/scenarios", id, "steps"],
  });

  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attempts", {
        scenarioId: id,
        totalSteps: steps?.length || 0,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAttemptId(data.id);
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
    },
  });

  useEffect(() => {
    if (steps && steps.length > 0 && !attemptId) {
      startAttemptMutation.mutate();
    }
  }, [steps]);

  const currentStep = steps?.[currentStepIndex];
  const progress = steps ? ((currentStepIndex) / steps.length) * 100 : 0;
  const vitals = currentStep?.vitalSigns as VitalSigns | null;

  const allActions = currentStep
    ? [...(currentStep.correctActions || []), ...(currentStep.incorrectActions || [])].sort(
        () => Math.random() - 0.5
      )
    : [];

  const handleSelectAction = (action: string) => {
    if (showFeedback) return;
    setSelectedAction(action);
  };

  const handleSubmit = () => {
    if (!selectedAction || !currentStep) return;

    const isCorrect = (currentStep.correctActions || []).includes(selectedAction);
    const timeSpent = Math.round((Date.now() - stepStartTime) / 1000);

    const response: StepResponse = {
      stepId: currentStep.id,
      selectedAction,
      isCorrect,
      timeSpent,
    };

    setResponses((prev) => [...prev, response]);
    setShowFeedback(true);

    setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleNext = () => {
    if (!steps) return;

    if (currentStepIndex + 1 >= steps.length) {
      const finalResponses = [...responses];
      completeAttemptMutation.mutate(finalResponses);
      setIsComplete(true);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedAction(null);
      setShowFeedback(false);
      setShowHint(false);
      setStepStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (scenarioLoading || stepsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!scenario || !steps || steps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Scenario not found</h2>
          <Button onClick={() => navigate("/scenarios")} data-testid="button-back-scenarios">
            Back to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / responses.length) * 100);

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              score >= 80 ? "bg-green-500/10" : score >= 60 ? "bg-yellow-500/10" : "bg-red-500/10"
            }`}>
              {score >= 80 ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : score >= 60 ? (
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-results-title">Scenario Complete</h1>
            <p className="text-muted-foreground mb-8">{scenario.title}</p>

            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="rounded-md border border-border/50 bg-card p-4">
                <div className="text-3xl font-bold text-primary">{score}%</div>
                <div className="text-xs text-muted-foreground mt-1">Overall Score</div>
              </div>
              <div className="rounded-md border border-border/50 bg-card p-4">
                <div className="text-3xl font-bold text-green-500">{correctCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Correct</div>
              </div>
              <div className="rounded-md border border-border/50 bg-card p-4">
                <div className="text-3xl font-bold text-red-500">{responses.length - correctCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Incorrect</div>
              </div>
            </div>

            <div className="space-y-3 mb-10 text-left">
              <h3 className="font-semibold mb-4">Step-by-Step Review</h3>
              {responses.map((response, i) => {
                const step = steps[i];
                return (
                  <div
                    key={i}
                    className={`rounded-md border p-4 ${
                      response.isCorrect
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    }`}
                    data-testid={`review-step-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      {response.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">{step?.phase}: {step?.prompt?.slice(0, 80)}...</div>
                        <div className="text-xs text-muted-foreground">
                          Your answer: <span className={response.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{response.selectedAction}</span>
                        </div>
                        {!response.isCorrect && step && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Correct: {step.correctActions?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{response.timeSpent}s</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/scenarios")} variant="outline" data-testid="button-back-scenarios">
                <ArrowLeft className="mr-2 h-4 w-4" /> All Scenarios
              </Button>
              <Button onClick={() => window.location.reload()} data-testid="button-retry">
                Retry Scenario
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/scenarios")} data-testid="button-exit-scenario">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="hidden sm:block">
                <div className="text-sm font-medium truncate max-w-[200px]">{scenario.title}</div>
                <div className="text-xs text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <Progress value={progress} className="h-2" data-testid="progress-bar" />
            </div>
            <Badge variant="outline" className="shrink-0">
              {currentStep?.phase}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {vitals && (
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="vitals-panel">
                {vitals.hr !== undefined && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <Heart className="h-4 w-4 text-red-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">HR</div>
                      <div className="text-sm font-semibold font-mono">{vitals.hr} bpm</div>
                    </div>
                  </div>
                )}
                {vitals.rr !== undefined && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <Wind className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">RR</div>
                      <div className="text-sm font-semibold font-mono">{vitals.rr} /min</div>
                    </div>
                  </div>
                )}
                {vitals.spo2 !== undefined && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <Activity className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">SpO2</div>
                      <div className="text-sm font-semibold font-mono">{vitals.spo2}%</div>
                    </div>
                  </div>
                )}
                {vitals.bp && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-purple-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">BP</div>
                      <div className="text-sm font-semibold font-mono">{vitals.bp}</div>
                    </div>
                  </div>
                )}
                {vitals.skinColor && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <ThermometerSun className="h-4 w-4 text-orange-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Skin</div>
                      <div className="text-sm font-semibold">{vitals.skinColor}, {vitals.skinTemp}</div>
                    </div>
                  </div>
                )}
                {vitals.etco2 !== undefined && (
                  <div className="rounded-md border border-border/50 bg-card p-3 flex items-center gap-3">
                    <Wind className="h-4 w-4 text-teal-500 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">EtCO2</div>
                      <div className="text-sm font-semibold font-mono">{vitals.etco2} mmHg</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep?.patientState && (
              <div className="mb-6 rounded-md border border-border/50 bg-card p-5" data-testid="patient-state">
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Patient Presentation</div>
                    <p className="text-sm leading-relaxed">{currentStep.patientState}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2" data-testid="text-step-prompt">
                {currentStep?.prompt}
              </h2>
              {currentStep?.isCritical && (
                <Badge variant="destructive" className="mt-2">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Critical Decision
                </Badge>
              )}
            </div>

            <div className="space-y-2 mb-6">
              {allActions.map((action, i) => {
                const isSelected = selectedAction === action;
                const isCorrect = showFeedback && (currentStep?.correctActions || []).includes(action);
                const isWrong = showFeedback && isSelected && !isCorrect;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAction(action)}
                    disabled={showFeedback}
                    className={`w-full text-left rounded-md border p-4 transition-all text-sm ${
                      showFeedback
                        ? isCorrect
                          ? "border-green-500/50 bg-green-500/10"
                          : isWrong
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-border/30 opacity-50"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-card hover:border-primary/30"
                    }`}
                    data-testid={`button-action-${i}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                        showFeedback
                          ? isCorrect
                            ? "border-green-500 bg-green-500 text-white"
                            : isWrong
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-border text-muted-foreground"
                          : isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}>
                        {showFeedback ? (
                          isCorrect ? <CheckCircle2 className="h-4 w-4" /> : isWrong ? <XCircle className="h-4 w-4" /> : String.fromCharCode(65 + i)
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </div>
                      <span>{action}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!showFeedback && (
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSubmit} disabled={!selectedAction} data-testid="button-submit-answer">
                  Submit Answer
                </Button>
                {currentStep?.hint && !showHint && (
                  <Button variant="ghost" onClick={() => setShowHint(true)} data-testid="button-show-hint">
                    <Lightbulb className="mr-2 h-4 w-4" /> Show Hint
                  </Button>
                )}
              </div>
            )}

            {showHint && !showFeedback && currentStep?.hint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-4"
                data-testid="hint-panel"
              >
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-sm">{currentStep.hint}</p>
                </div>
              </motion.div>
            )}

            {showFeedback && (
              <motion.div
                ref={feedbackRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
                data-testid="feedback-panel"
              >
                <div className={`rounded-md border p-5 ${
                  (currentStep?.correctActions || []).includes(selectedAction || "")
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}>
                  <div className="flex items-start gap-3">
                    {(currentStep?.correctActions || []).includes(selectedAction || "") ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-sm mb-1">
                        {(currentStep?.correctActions || []).includes(selectedAction || "") ? "Correct!" : "Not quite right"}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {(currentStep?.correctActions || []).includes(selectedAction || "")
                          ? currentStep?.feedbackCorrect
                          : currentStep?.feedbackIncorrect}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleNext} data-testid="button-next-step">
                    {currentStepIndex + 1 >= (steps?.length || 0) ? "View Results" : "Next Step"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
