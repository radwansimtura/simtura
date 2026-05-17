// NREMT mini-test quiz panel for the /learn page.
//
// State machine: landing → resuming? → active → results.
// Session ID is persisted to localStorage so refreshing the page resumes
// the current question rather than abandoning it. Server is source of
// truth on which question is pending (via /api/quiz/:sessionId/state).
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  ListChecks,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// API types — kept narrow on purpose. Mirror the server route response shapes.
// ---------------------------------------------------------------------------

interface QuizQuestion {
  id: string;
  category: string;
  subCategory: string | null;
  difficulty: number;
  questionText: string;
  options: string[];
}

interface StartResponse {
  sessionId: string;
  questionIndex: number;
  total: number;
  question: QuizQuestion;
}

interface SubmitContinueResponse {
  done: false;
  questionIndex: number;
  total: number;
  question: QuizQuestion;
}

interface SubmitDoneResponse {
  done: true;
  sessionId: string;
  score: number;
  correctCount: number;
  total: number;
}

type SubmitResponse = SubmitContinueResponse | SubmitDoneResponse;

interface CategoryBreakdown {
  category: string;
  correct: number;
  total: number;
  percent: number;
}

interface MissedQuestion {
  questionText: string;
  choices: string[];
  chosenAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  category: string;
  subCategory: string | null;
  difficulty: number;
}

interface ResultsPayload {
  sessionId: string;
  score: number;
  correctCount: number;
  total: number;
  breakdownByCategory: CategoryBreakdown[];
  missed: MissedQuestion[];
}

interface ActiveStateResponse {
  status: "active";
  questionIndex: number;
  total: number;
  question: QuizQuestion;
}

interface CompleteStateResponse extends ResultsPayload {
  status: "complete";
}

type StateResponse = ActiveStateResponse | CompleteStateResponse;

// ---------------------------------------------------------------------------
// API client (thin wrappers over apiRequest for type safety).
// ---------------------------------------------------------------------------

async function startSession(): Promise<StartResponse> {
  const res = await apiRequest("POST", "/api/quiz/start", {});
  return res.json();
}

async function submitAnswer(
  sessionId: string,
  questionId: string,
  choiceIndex: number,
): Promise<SubmitResponse> {
  const res = await apiRequest("POST", "/api/quiz/submit", {
    sessionId,
    questionId,
    choiceIndex,
  });
  return res.json();
}

async function fetchResults(sessionId: string): Promise<ResultsPayload> {
  const res = await apiRequest("GET", `/api/quiz/${sessionId}/results`);
  return res.json();
}

async function fetchSessionState(sessionId: string): Promise<StateResponse> {
  const res = await apiRequest("GET", `/api/quiz/${sessionId}/state`);
  return res.json();
}

// ---------------------------------------------------------------------------
// localStorage helpers. Single key: the active NREMT session ID for this user.
// Cleared when a session completes or is abandoned via "Start over".
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "simtura:nremtQuiz:activeSessionId";

function readStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    // localStorage may throw in Safari private mode; treat as no stored session.
    return null;
  }
}

function writeStoredSessionId(sessionId: string): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Best-effort; resume just won't work if storage is unavailable.
  }
}

function clearStoredSessionId(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // No-op.
  }
}

function percentColor(percent: number): string {
  if (percent >= 80) return "text-green-400";
  if (percent >= 50) return "text-yellow-400";
  return "text-red-400";
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

type Phase = "landing" | "resuming" | "active" | "results";

export default function QuizPanel(): JSX.Element {
  const [phase, setPhase] = useState<Phase>("landing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [total, setTotal] = useState<number>(25);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missedExpanded, setMissedExpanded] = useState<boolean>(false);

  // On mount, check localStorage for an in-flight session. If one exists,
  // verify it with the server before restoring state. If the server says it's
  // gone or wrong, clear and start at landing.
  useEffect(() => {
    const stored = readStoredSessionId();
    if (!stored) {
      setPhase("landing");
      return;
    }
    setPhase("resuming");
    fetchSessionState(stored)
      .then((state) => {
        if (state.status === "active") {
          setSessionId(stored);
          setCurrentQuestion(state.question);
          setQuestionIndex(state.questionIndex);
          setTotal(state.total);
          setSelectedChoice(null);
          setPhase("active");
        } else if (state.status === "complete") {
          setSessionId(stored);
          setResults(state);
          setPhase("results");
        }
      })
      .catch(() => {
        // 404 or other failure — treat as a stale session, drop it.
        clearStoredSessionId();
        setPhase("landing");
      });
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const data = await startSession();
      writeStoredSessionId(data.sessionId);
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotal(data.total);
      setSelectedChoice(null);
      setResults(null);
      setMissedExpanded(false);
      setPhase("active");
    } catch (err: any) {
      setError(err?.message || "Failed to start quiz.");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (sessionId === null || currentQuestion === null || selectedChoice === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await submitAnswer(sessionId, currentQuestion.id, selectedChoice);
      if (data.done) {
        const fullResults = await fetchResults(sessionId);
        setResults(fullResults);
        clearStoredSessionId();
        setPhase("results");
      } else {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setTotal(data.total);
        setSelectedChoice(null);
      }
    } catch (err: any) {
      setError(err?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNew = () => {
    clearStoredSessionId();
    setSessionId(null);
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setResults(null);
    setMissedExpanded(false);
    setError(null);
    setPhase("landing");
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "resuming" && (
        <motion.div
          key="resuming"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border border-white/10 bg-white/5 p-8 text-center"
          data-testid="quiz-resuming"
        >
          <Loader2 className="h-6 w-6 animate-spin text-white/40 mx-auto mb-3" />
          <p className="text-sm text-white/60">Restoring your quiz...</p>
        </motion.div>
      )}

      {phase === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border border-white/10 bg-white/5 p-6 sm:p-8 text-center"
          data-testid="quiz-landing"
        >
          <ListChecks className="h-10 w-10 mx-auto text-white/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">NREMT Drill Mode</h2>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
            Twenty-five questions per session, weighted across the five NREMT blueprint categories (Airway, Cardiology, Trauma, Medical, Operations). Difficulty adapts to how you&apos;re doing. The session-end breakdown shows exactly which categories need more work. Built on retrieval practice — the highest-utility study strategy in the cognitive science literature, and the closest thing to actually sitting the exam.
          </p>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 mb-4 text-left">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <Button
            onClick={handleStart}
            disabled={starting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            data-testid="quiz-start-button"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting...
              </>
            ) : (
              "Start Quiz"
            )}
          </Button>
        </motion.div>
      )}

      {phase === "active" && currentQuestion && (
        <motion.div
          key="active"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
          data-testid="quiz-active"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs uppercase tracking-wider text-white/60">
              {currentQuestion.category}
            </span>
            <span className="font-mono text-sm text-white/60" data-testid="quiz-progress">
              {questionIndex + 1} / {total}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-md"
            >
              <p className="text-base sm:text-lg leading-relaxed text-white whitespace-pre-wrap" data-testid="quiz-question-text">
                {currentQuestion.questionText}
              </p>
            </motion.div>
          </AnimatePresence>

          {submitting ? (
            <div className="space-y-2" data-testid="quiz-options-skeleton">
              {currentQuestion.options.map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-white/10 bg-white/[0.02] py-3 sm:py-4 px-4 h-[52px] sm:h-[60px]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedChoice === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedChoice(i)}
                    className={`w-full text-left rounded-lg border py-3 sm:py-4 px-4 transition-colors ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20"
                    }`}
                    data-testid={`quiz-option-${i}`}
                  >
                    <span className="text-sm sm:text-base text-white/90">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-200 mb-3">{error}</p>
              <Button
                onClick={handleSubmit}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-200 hover:bg-red-500/20"
                data-testid="quiz-retry-submit"
              >
                Try again
              </Button>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={selectedChoice === null || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 sm:py-6 text-base"
            data-testid="quiz-submit-button"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              questionIndex + 1 === total ? "Submit final answer" : "Submit"
            )}
          </Button>
        </motion.div>
      )}

      {phase === "results" && results && (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
          data-testid="quiz-results"
        >
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-6">Quiz Complete</h2>
            <div className="mx-auto mb-4 flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full border-4 border-blue-500/40">
              <span className="text-5xl sm:text-6xl font-bold text-white" data-testid="quiz-score-percent">
                {results.score}%
              </span>
            </div>
            <p className="text-sm text-white/60" data-testid="quiz-score-subtitle">
              {results.correctCount} of {results.total} correct
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white/80 mb-3 uppercase tracking-wider">
              By category
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {results.breakdownByCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                  data-testid={`quiz-category-${cat.category}`}
                >
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-2 leading-tight">
                    {cat.category}
                  </div>
                  <div className={`text-2xl font-semibold ${percentColor(cat.percent)}`}>
                    {cat.percent}%
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {cat.correct} / {cat.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {results.missed.length > 0 && (
            <div>
              <button
                onClick={() => setMissedExpanded((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/[0.07] transition-colors"
                data-testid="quiz-missed-toggle"
              >
                <span className="text-sm font-medium text-white">
                  Review missed questions ({results.missed.length})
                </span>
                {missedExpanded ? (
                  <ChevronUp className="h-4 w-4 text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/60" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {missedExpanded && (
                  <motion.div
                    key="missed-list"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mt-3">
                      {results.missed.map((m, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-3"
                          data-testid={`quiz-missed-${i}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                              {m.category}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                              Difficulty {m.difficulty}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-white leading-relaxed">
                            {m.questionText}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-white/40">Your answer: </span>
                              <span className="text-red-400">
                                {m.chosenAnswer ?? "(none)"}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40">Correct answer: </span>
                              <span className="text-green-400">{m.correctAnswer}</span>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                              <span className="text-white/40">Why: </span>
                              <span className="text-white/80">{m.explanation}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              onClick={handleStartNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              data-testid="quiz-start-new-button"
            >
              Start new quiz
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
