import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import simturaLogo from "@/assets/simtura-logo.png";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Sparkles,
  Loader2,
  ListChecks,
  Lightbulb,
  BarChart3,
  Lock,
} from "lucide-react";

interface FlashcardData {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  tags: string[];
  sourceStepId: string | null;
  difficulty: number;
  stability: number;
  state: string;
  lapses: number;
  reps: number;
  priorityBoost: boolean;
  dueDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

interface QueueResponse {
  cards: FlashcardData[];
  count: number;
}

type Rating = "again" | "hard" | "good" | "easy";
type Tab = "flashcards" | "quiz" | "concept-review" | "stats";

const RATINGS: Array<{ value: Rating; label: string; color: string; hint: string }> = [
  { value: "again", label: "Again", color: "bg-red-600 hover:bg-red-700", hint: "I forgot" },
  { value: "hard", label: "Hard", color: "bg-orange-600 hover:bg-orange-700", hint: "Got it but with effort" },
  { value: "good", label: "Good", color: "bg-blue-600 hover:bg-blue-700", hint: "I knew it" },
  { value: "easy", label: "Easy", color: "bg-green-600 hover:bg-green-700", hint: "Trivially easy" },
];

const TABS: Array<{ id: Tab; label: string; icon: typeof Brain; available: boolean }> = [
  { id: "flashcards", label: "Flashcards", icon: Brain, available: true },
  { id: "quiz", label: "Drill / Quiz", icon: ListChecks, available: true },
  { id: "concept-review", label: "Concept Review", icon: Lightbulb, available: false },
  { id: "stats", label: "Stats", icon: BarChart3, available: false },
];

export default function LearnPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("flashcards");

  // Flashcards state
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Quiz state
  type QuizPhase = "idle" | "loading" | "question" | "answered" | "done";
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("idle");
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<{ id: string; questionText: string; options: string[]; category: string } | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizTotal, setQuizTotal] = useState(25);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizWasCorrect, setQuizWasCorrect] = useState<boolean | null>(null);
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ score: number; correctCount: number; total: number } | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Redirect to signin if not authed
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/signin?next=/learn");
    }
  }, [user, authLoading, setLocation]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("GET", "/api/flashcards/queue?limit=20");
      const data: QueueResponse = await res.json();
      setCards(data.cards);
      setCurrentIndex(0);
      setRevealed(false);
    } catch (err: any) {
      setError(err?.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === "flashcards") loadQueue();
  }, [user, activeTab, loadQueue]);

  const startQuiz = async () => {
    setQuizPhase("loading");
    setQuizError(null);
    setQuizScore(null);
    setQuizSelected(null);
    try {
      const res = await apiRequest("POST", "/api/quiz/start");
      const data = await res.json();
      setQuizSessionId(data.sessionId);
      setQuizQuestion(data.question);
      setQuizIndex(data.questionIndex);
      setQuizTotal(data.total);
      setQuizPhase("question");
    } catch (err: any) {
      setQuizError(err?.message || "Failed to start quiz.");
      setQuizPhase("idle");
    }
  };

  const submitQuizAnswer = async (choiceIndex: number) => {
    if (!quizSessionId || !quizQuestion || quizPhase !== "question") return;
    setQuizSelected(choiceIndex);
    setQuizPhase("loading");
    try {
      const res = await apiRequest("POST", "/api/quiz/submit", {
        sessionId: quizSessionId,
        questionId: quizQuestion.id,
        choiceIndex,
      });
      const data = await res.json();
      setQuizWasCorrect(data.wasCorrect);
      setQuizCorrectAnswer(data.correctAnswer);
      if (data.done) {
        setQuizScore({ score: data.score, correctCount: data.correctCount, total: data.total });
        setQuizPhase("done");
      } else {
        setQuizPhase("answered");
        // Auto-advance after 1.5s
        setTimeout(() => {
          setQuizQuestion(data.question);
          setQuizIndex(data.questionIndex);
          setQuizSelected(null);
          setQuizWasCorrect(null);
          setQuizCorrectAnswer(null);
          setQuizPhase("question");
        }, 1500);
      }
    } catch (err: any) {
      setQuizError(err?.message || "Submission failed.");
      setQuizPhase("question");
      setQuizSelected(null);
    }
  };

  const currentCard = cards[currentIndex];
  const isQueueDone = !loading && cards.length > 0 && currentIndex >= cards.length;
  const isQueueEmpty = !loading && cards.length === 0;

  const handleSubmitRating = async (rating: Rating) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", `/api/flashcards/${currentCard.id}/review`, { rating });
      setReviewedCount((n) => n + 1);
      setRevealed(false);
      setCurrentIndex((i) => i + 1);
    } catch (err: any) {
      toast({
        title: "Review failed",
        description: err?.message || "Could not save your rating. Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcuts (only when on flashcards tab)
  useEffect(() => {
    if (activeTab !== "flashcards") return;
    const handler = (e: KeyboardEvent) => {
      if (submitting || !currentCard) return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        if (e.key === "1") handleSubmitRating("again");
        else if (e.key === "2") handleSubmitRating("hard");
        else if (e.key === "3") handleSubmitRating("good");
        else if (e.key === "4") handleSubmitRating("easy");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitting, currentCard, revealed, activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <Link href="/">
              <img src={simturaLogo} alt="Simtura" className="h-9 w-auto cursor-pointer" />
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
              <Link href="/ems" className="hover:text-white transition-colors">EMS</Link>
              <Link href="/nursing" className="hover:text-white transition-colors">Nursing</Link>
              <Link href="/learn" className="text-white transition-colors">Learn</Link>
              <Link href="/organizations" className="hover:text-white transition-colors">For Organizations</Link>
            </div>
            <Link href="/profile">
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black font-medium px-5"
              >
                {user?.name?.split(" ")[0] || "Profile"}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Learn</h1>
          <p className="text-sm text-white/60">
            Evidence-based practice modes built on the strongest learning science.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.filter((tab) => tab.available !== false).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-400 text-white"
                      : "border-transparent text-white/60 hover:text-white hover:border-white/20"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "flashcards" && (
          <div>
            {/* Section description */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold">Flashcards</h2>
              </div>
              <p className="text-sm text-white/60">
                Spaced repetition built on the FSRS algorithm. Cards from steps you missed are prioritized at the top.
              </p>
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 mb-4">
                <p className="text-sm text-red-200">{error}</p>
                <Button
                  onClick={loadQueue}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-500/30 text-red-200 hover:bg-red-500/20"
                >
                  Try again
                </Button>
              </div>
            )}

            {!loading && isQueueEmpty && !error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-white/10 bg-white/5 p-8 text-center"
              >
                <Sparkles className="h-10 w-10 mx-auto text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nothing due right now</h3>
                <p className="text-sm text-white/70 mb-6 leading-relaxed max-w-md mx-auto">
                  Cards build up as you complete scenarios. Steps you miss get prioritized at the top of your queue, and everything else cycles through at intervals tuned to how well you know it.
                </p>
                <Button
                  onClick={() => setLocation("/ems")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Browse scenarios
                </Button>
              </motion.div>
            )}

            {!loading && isQueueDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center"
              >
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Caught up</h3>
                <p className="text-sm text-white/70 mb-6">
                  You reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}. Come back tomorrow for the next batch.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={loadQueue}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Refresh queue
                  </Button>
                  <Button
                    onClick={() => setLocation("/ems")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Browse scenarios
                  </Button>
                </div>
              </motion.div>
            )}

            {!loading && currentCard && !isQueueDone && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    {currentCard.priorityBoost ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs text-amber-300">
                        <Sparkles className="h-3 w-3" />
                        You missed this recently
                      </div>
                    ) : <div />}
                    <div className="text-sm text-white/60 font-mono">
                      {currentIndex + 1} / {cards.length}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">
                      Question
                    </div>
                    <p className="text-lg leading-relaxed text-white whitespace-pre-wrap">
                      {currentCard.front}
                    </p>
                  </div>

                  {revealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 backdrop-blur-md"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-blue-400/80 font-medium mb-2">
                        Answer
                      </div>
                      <p className="text-base leading-relaxed text-white/90 whitespace-pre-wrap">
                        {currentCard.back}
                      </p>
                    </motion.div>
                  )}

                  {!revealed ? (
                    <Button
                      onClick={() => setRevealed(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base"
                      disabled={submitting}
                    >
                      Show answer <span className="ml-2 text-xs text-white/50">(Space)</span>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RATINGS.map((r, i) => (
                        <Button
                          key={r.value}
                          onClick={() => handleSubmitRating(r.value)}
                          disabled={submitting}
                          className={`${r.color} text-white py-6 flex-col h-auto`}
                          title={r.hint}
                        >
                          <span className="text-base font-semibold">{r.label}</span>
                          <span className="text-[10px] opacity-70 mt-0.5">{i + 1}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {revealed && (
                    <p className="text-[11px] text-center text-white/40 mt-2">
                      Press 1–4 to rate · Cards prioritized: missed first, then new, then due
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="space-y-4">
            {quizPhase === "idle" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
                <ListChecks className="h-10 w-10 mx-auto text-white/40 mb-4" />
                <h3 className="text-xl font-semibold mb-2">NREMT Drill Mode</h3>
                <p className="text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
                  25 adaptive multiple-choice questions drawn from the NREMT blueprint. Difficulty adjusts to your performance.
                </p>
                {quizError && <p className="text-red-400 text-sm mb-4">{quizError}</p>}
                <Button onClick={startQuiz} className="rounded-full bg-white text-black hover:bg-white/90 px-8">
                  Start Quiz
                </Button>
              </motion.div>
            )}
            {quizPhase === "loading" && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {(quizPhase === "question" || quizPhase === "answered") && quizQuestion && (
              <motion.div key={quizQuestion.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs text-white/40 uppercase tracking-wider">{quizQuestion.category}</span>
                  <span className="text-xs text-white/40">{quizIndex + 1} / {quizTotal}</span>
                </div>
                <p className="text-base font-medium text-white leading-relaxed mb-6">{quizQuestion.questionText}</p>
                <div className="space-y-2">
                  {quizQuestion.options.map((opt, i) => {
                    const isSelected = quizSelected === i;
                    const isCorrectOpt = quizPhase === "answered" && opt === quizCorrectAnswer;
                    const isWrongSelected = quizPhase === "answered" && isSelected && !quizWasCorrect;
                    return (
                      <button
                        key={i}
                        disabled={quizPhase === "answered"}
                        onClick={() => submitQuizAnswer(i)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                          isCorrectOpt
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : isWrongSelected
                            ? "border-red-500/60 bg-red-500/10 text-red-300"
                            : isSelected
                            ? "border-blue-500/60 bg-blue-500/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizPhase === "answered" && (
                  <p className={`mt-4 text-sm font-medium ${quizWasCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {quizWasCorrect ? "✓ Correct" : `✗ Correct answer: ${quizCorrectAnswer}`}
                  </p>
                )}
              </motion.div>
            )}
            {quizPhase === "done" && quizScore && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${quizScore.score >= 70 ? "bg-emerald-500/20 ring-2 ring-emerald-500/50" : "bg-amber-500/20 ring-2 ring-amber-500/50"}`}>
                  <span className="text-3xl font-bold">{quizScore.score}%</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Quiz Complete</h3>
                <p className="text-white/60 text-sm mb-6">{quizScore.correctCount} of {quizScore.total} correct</p>
                <Button onClick={startQuiz} className="rounded-full bg-white text-black hover:bg-white/90 px-8">
                  Try Again
                </Button>
              </motion.div>
            )}
          </div>
        )}
        {/* Coming-soon placeholders */}
        {activeTab !== "flashcards" && activeTab !== "quiz" && (
          <ComingSoonPanel tab={activeTab} />
        )}
      </main>
    </div>
  );
}

function ComingSoonPanel({ tab }: { tab: Tab }) {
  const config = {
    "quiz": {
      icon: ListChecks,
      title: "Drill / Quiz Mode",
      description: "Practice testing surface, separate from scenario simulation. Pulls 10 random questions from steps you've struggled with — randomized order, multiple-choice or short-answer format. Pure practice testing per Dunlosky's HIGH-utility framework.",
    },
    "concept-review": {
      icon: Lightbulb,
      title: "Concept Review",
      description: "Elaborative interrogation surface. Picks a step you missed, asks 'Why is X the right approach here?' Type your explanation, get teaching feedback from the AI. Builds durable understanding through self-explanation.",
    },
    "stats": {
      icon: BarChart3,
      title: "Stats & Progress",
      description: "Visualize your mastery curve. See which concepts are sticking, which need work, and how your retention is trending over time. Surfaces FSRS memory stability data, scenario performance, and concept-level proficiency.",
    },
  };
  const c = config[tab as keyof typeof config];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60 mb-6">
        <Lock className="h-3 w-3" />
        Coming soon
      </div>
      <Icon className="h-12 w-12 mx-auto text-white/40 mb-4" />
      <h3 className="text-xl font-semibold mb-3">{c.title}</h3>
      <p className="text-sm text-white/60 leading-relaxed max-w-lg mx-auto">
        {c.description}
      </p>
    </motion.div>
  );
}
