// NREMT mini-test quiz panel for the /learn page.
//
// State machine: landing → resuming? → active → results.
// Session ID is persisted to localStorage so refreshing the page resumes
// the current question rather than abandoning it. Server is source of
// truth on which question is pending (via /api/quiz/:sessionId/state).
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Placeholder UI; real states added in subsequent steps.
  return (
    <div className="text-white/60">
      Phase: {phase}
      {error && <div className="text-red-300 mt-2">Error: {error}</div>}
    </div>
  );
}
