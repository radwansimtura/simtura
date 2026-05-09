import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Sparkles,
  Loader2,
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

const RATINGS: Array<{ value: Rating; label: string; color: string; hint: string }> = [
  { value: "again", label: "Again", color: "bg-red-600 hover:bg-red-700", hint: "I forgot" },
  { value: "hard", label: "Hard", color: "bg-orange-600 hover:bg-orange-700", hint: "Got it but with effort" },
  { value: "good", label: "Good", color: "bg-blue-600 hover:bg-blue-700", hint: "I knew it" },
  { value: "easy", label: "Easy", color: "bg-green-600 hover:bg-green-700", hint: "Trivially easy" },
];

export default function ReviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
      setLocation("/signin?next=/review");
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
    if (user) loadQueue();
  }, [user, loadQueue]);

  const currentCard = cards[currentIndex];
  const isQueueDone = !loading && cards.length > 0 && currentIndex >= cards.length;
  const isQueueEmpty = !loading && cards.length === 0;

  const handleSubmitRating = async (rating: Rating) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", `/api/flashcards/${currentCard.id}/review`, { rating });
      setReviewedCount((n) => n + 1);
      // Advance
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

  // Keyboard shortcuts: Space to reveal, 1-4 to rate
  useEffect(() => {
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
  }, [submitting, currentCard, revealed]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/profile")}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-sm text-white/60 font-mono">
            {cards.length > 0 && currentIndex < cards.length
              ? `${currentIndex + 1} / ${cards.length}`
              : reviewedCount > 0
              ? `${reviewedCount} reviewed`
              : ""}
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-400" />
            Review
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Spaced repetition — built on FSRS algorithm
          </p>
        </div>

        {/* Error state */}
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

        {/* Empty state — no cards in deck yet */}
        {isQueueEmpty && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-white/10 bg-white/5 p-8 text-center"
          >
            <Sparkles className="h-10 w-10 mx-auto text-blue-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nothing due right now</h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
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

        {/* Done state — finished the queue */}
        {isQueueDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center"
          >
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Caught up</h2>
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

        {/* Active card */}
        {currentCard && !isQueueDone && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Priority badge if boosted */}
              {currentCard.priorityBoost && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  You missed this recently
                </div>
              )}

              {/* Front of card */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">
                  Question
                </div>
                <p className="text-lg leading-relaxed text-white whitespace-pre-wrap">
                  {currentCard.front}
                </p>
              </div>

              {/* Back of card */}
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

              {/* Action button or rating buttons */}
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
    </div>
  );
}
