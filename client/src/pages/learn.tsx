import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QuizPanel from "@/components/QuizPanel";
import MobileNav from "@/components/MobileNav";
import DesktopNav from "@/components/DesktopNav";
import simturaLogo from "@/assets/simtura-logo.png";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Sparkles,
  Loader2,
  ListChecks,
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
type Tab = "flashcards" | "quiz";

const RATINGS: Array<{ value: Rating; label: string; color: string; hint: string }> = [
  { value: "again", label: "Again", color: "bg-red-600 hover:bg-red-700", hint: "I forgot" },
  { value: "hard", label: "Hard", color: "bg-orange-600 hover:bg-orange-700", hint: "Got it but with effort" },
  { value: "good", label: "Good", color: "bg-blue-600 hover:bg-blue-700", hint: "I knew it" },
  { value: "easy", label: "Easy", color: "bg-green-600 hover:bg-green-700", hint: "Trivially easy" },
];

const TABS: Array<{ id: Tab; label: string; icon: typeof Brain; available: boolean }> = [
  { id: "flashcards", label: "Flashcards", icon: Brain, available: true },
  { id: "quiz", label: "Practice NREMT Quiz", icon: ListChecks, available: true },
];

const ACTIVE_TAB_STORAGE_KEY = "simtura:learn:activeTab";

function readStoredTab(): Tab {
  try {
    const v = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (v === "flashcards" || v === "quiz") return v;
  } catch {
    // localStorage may throw in Safari private mode; fall through to default.
  }
  return "flashcards";
}

export default function LearnPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>(readStoredTab);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Best-effort; refresh just won't restore the tab if storage is unavailable.
    }
  }, [activeTab]);

  // Flashcards state
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

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
            <DesktopNav />
            <div className="flex items-center gap-2">
              <MobileNav />
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
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight text-white">
            Learn
          </h1>
          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
            Evidence-based practice modes built on the strongest learning science.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-8">
          <div className="flex gap-1">
            {TABS.filter((tab) => tab.available !== false).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                Spaced repetition built on FSRS (Free Spaced Repetition Scheduler) — calibrated to show each card right before you&apos;d forget it. Cards from the steps you missed in scenarios are surfaced first, so the platform learns what <em>you</em> need to work on, not what the average user needs.
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

        {activeTab === "quiz" && <QuizPanel />}
      </main>
    </div>
  );
}
