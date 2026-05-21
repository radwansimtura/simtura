import { CheckCircle2, XCircle, AlertTriangle, ShieldX, ChevronDown } from "lucide-react";
import type {
  GradingResult,
  PointEvaluation,
  SectionScore,
} from "@/lib/drill-mode/types";

interface DrillReportProps {
  result: GradingResult;
  onRetry?: () => void;
  onBack?: () => void;
}

type SectionKey = keyof GradingResult["sectionScores"];

const SECTION_LABELS: Record<SectionKey, string> = {
  sceneSizeUp: "Scene size-up",
  primarySurvey: "Primary survey",
  historyTaking: "History taking",
  secondaryAssessment: "Secondary assessment",
  vitalSigns: "Vital signs",
  fieldImpression: "Field impression",
  interventions: "Interventions",
  reassessment: "Reassessment",
  handoff: "Handoff",
};

const SECTION_ORDER: SectionKey[] = [
  "sceneSizeUp",
  "primarySurvey",
  "historyTaking",
  "secondaryAssessment",
  "vitalSigns",
  "fieldImpression",
  "interventions",
  "reassessment",
  "handoff",
];

// Maps the leading letters of a point_id (e.g. "SS1" → "sceneSizeUp") so the
// flat point_by_point array can be grouped under the right section header.
const PREFIX_TO_SECTION: Record<string, SectionKey> = {
  SS: "sceneSizeUp",
  PS: "primarySurvey",
  HT: "historyTaking",
  SA: "secondaryAssessment",
  VS: "vitalSigns",
  FI: "fieldImpression",
  IN: "interventions",
  RA: "reassessment",
  HO: "handoff",
};

function sectionForPointId(pointId: string): SectionKey | null {
  const m = pointId.match(/^([A-Z]+)/);
  if (!m) return null;
  return PREFIX_TO_SECTION[m[1]] ?? null;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function percent(score: SectionScore): number {
  return score.possible > 0 ? Math.round((score.earned / score.possible) * 100) : 0;
}

function scoreFillClass(pct: number): string {
  if (pct >= 80) return "bg-green-400/80";
  if (pct >= 50) return "bg-amber-400/80";
  return "bg-red-400/80";
}

// ---------------------------------------------------------------------------
// Outcome banner — red / green / amber depending on the scenario_outcome enum.
// ---------------------------------------------------------------------------

interface BannerConfig {
  ring: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
  title: string;
}

function bannerForOutcome(outcome: GradingResult["scenarioOutcome"]): BannerConfig {
  if (outcome === "PASS") {
    return {
      ring: "border-green-500/40",
      bg: "bg-green-500/15",
      text: "text-green-100",
      icon: <CheckCircle2 className="h-8 w-8 text-green-300" />,
      title: "PASSED",
    };
  }
  if (outcome === "FAIL_CRITICAL_CRITERIA") {
    return {
      ring: "border-red-500/50",
      bg: "bg-red-500/15",
      text: "text-red-100",
      icon: <ShieldX className="h-8 w-8 text-red-300" />,
      title: "EXAM FAILED — CRITICAL CRITERIA VIOLATED",
    };
  }
  return {
    ring: "border-amber-500/40",
    bg: "bg-amber-500/15",
    text: "text-amber-100",
    icon: <AlertTriangle className="h-8 w-8 text-amber-300" />,
    title: "DID NOT PASS — INSUFFICIENT POINTS",
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionProgressBar({
  label,
  score,
}: {
  label: string;
  score: SectionScore;
}) {
  const pct = percent(score);
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 text-sm text-white/70 shrink-0">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full transition-[width] ${scoreFillClass(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-20 text-right text-sm text-white/60 tabular-nums shrink-0">
        {score.earned} of {score.possible}
      </div>
    </div>
  );
}

function PointRow({ point, missed }: { point: PointEvaluation; missed: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {missed ? (
        <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-white/85">
          <span className="text-white/40 mr-2 tabular-nums">{point.pointId}</span>
          {point.name}
        </div>
        {point.evidence && (
          <div className="text-xs text-white/50 mt-0.5">{point.evidence}</div>
        )}
        {point.note && (
          <div className="text-xs text-amber-200/80 mt-0.5 italic">{point.note}</div>
        )}
      </div>
    </div>
  );
}

function SectionDetail({
  sectionKey,
  score,
  points,
}: {
  sectionKey: SectionKey;
  score: SectionScore;
  points: PointEvaluation[];
}) {
  if (points.length === 0) return null;
  const earned = points.filter((p) => p.earned);
  const missed = points.filter((p) => !p.earned);
  const pct = percent(score);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-white/90">{SECTION_LABELS[sectionKey]}</h3>
        <span className="text-xs text-white/50 tabular-nums">
          {score.earned} of {score.possible} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
        <div
          className={`h-full ${scoreFillClass(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {missed.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-red-300/70">
            Missed ({missed.length})
          </p>
          <div className="space-y-2">
            {missed.map((p) => (
              <PointRow key={p.pointId} point={p} missed />
            ))}
          </div>
        </div>
      )}

      {earned.length > 0 && (
        <details className="group mt-3">
          <summary className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-green-300/70 cursor-pointer select-none hover:text-green-300 list-none">
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-0 -rotate-90" />
            Earned ({earned.length})
          </summary>
          <div className="space-y-2 mt-2 pl-4">
            {earned.map((p) => (
              <PointRow key={p.pointId} point={p} missed={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

export function DrillReport({ result, onRetry, onBack }: DrillReportProps) {
  const banner = bannerForOutcome(result.scenarioOutcome);
  const violatedCCs = result.criticalCriteria.filter((c) => c.violated);
  const scorePct =
    Math.round((result.totalScore / 42) * 100); // possible total is the fixed 42 from the rubric

  // Group point_by_point by section once.
  const pointsBySection: Record<SectionKey, PointEvaluation[]> = {
    sceneSizeUp: [],
    primarySurvey: [],
    historyTaking: [],
    secondaryAssessment: [],
    vitalSigns: [],
    fieldImpression: [],
    interventions: [],
    reassessment: [],
    handoff: [],
  };
  for (const p of result.pointByPoint) {
    const sec = sectionForPointId(p.pointId);
    if (sec) pointsBySection[sec].push(p);
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Outcome banner */}
        <div
          className={`rounded-2xl border ${banner.ring} ${banner.bg} px-6 py-5 flex items-center gap-4`}
          data-testid={`banner-${result.scenarioOutcome.toLowerCase()}`}
        >
          {banner.icon}
          <div className="flex-1 min-w-0">
            <p className={`text-xs uppercase tracking-[0.2em] ${banner.text} opacity-80`}>
              Scenario 1A complete
            </p>
            <h1 className={`text-lg sm:text-xl font-semibold ${banner.text}`}>
              {banner.title}
            </h1>
          </div>
        </div>

        {/* Violated critical criteria (only when FAIL_CRITICAL_CRITERIA) */}
        {violatedCCs.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-5">
            <h2 className="text-sm uppercase tracking-wide text-red-200/80 mb-3">
              Critical criteria violated ({violatedCCs.length})
            </h2>
            <div className="space-y-3">
              {violatedCCs.map((cc) => (
                <div key={cc.criterionId} className="flex items-start gap-3 text-sm">
                  <ShieldX className="h-4 w-4 text-red-300 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-white/90">
                      <span className="text-white/50 mr-2">{cc.criterionId}</span>
                      {cc.name}
                    </div>
                    {cc.evidence && (
                      <div className="text-xs text-white/60 mt-0.5">{cc.evidence}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary headline */}
        {result.summaryComment && (
          <p className="text-lg text-white/90 italic leading-snug px-1" data-testid="text-summary">
            “{result.summaryComment}”
          </p>
        )}

        {/* Score + time stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-blue-400 tabular-nums">
              {result.totalScore}
              <span className="text-white/40 text-xl"> / 42</span>
            </div>
            <div className="text-xs text-white/50 mt-1">
              Total score · {scorePct}%
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-white tabular-nums">
              {formatTime(result.totalTimeUsedSeconds)}
              <span className="text-white/40 text-xl"> / 15:00</span>
            </div>
            <div className="text-xs text-white/50 mt-1">Time used</div>
          </div>
        </div>

        {/* Section progress overview */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm uppercase tracking-wide text-white/40 mb-4">
            Section scores
          </h2>
          <div className="space-y-3">
            {SECTION_ORDER.map((key) => (
              <SectionProgressBar
                key={key}
                label={SECTION_LABELS[key]}
                score={result.sectionScores[key]}
              />
            ))}
          </div>
        </div>

        {/* Per-section point detail — missed visible, earned collapsed */}
        <div className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-white/40">
            Detail by section
          </h2>
          {SECTION_ORDER.map((key) => (
            <SectionDetail
              key={key}
              sectionKey={key}
              score={result.sectionScores[key]}
              points={pointsBySection[key]}
            />
          ))}
        </div>

        {/* Strengths + Areas for review */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-green-500/25 bg-green-500/[0.05] p-5">
            <h2 className="text-sm uppercase tracking-wide text-green-200/80 mb-3">
              Strengths
            </h2>
            {result.strengths.length === 0 ? (
              <p className="text-sm text-white/40 italic">None recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm text-white/85">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-300 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-5">
            <h2 className="text-sm uppercase tracking-wide text-amber-200/80 mb-3">
              Areas for review
            </h2>
            {result.areasForReview.length === 0 ? (
              <p className="text-sm text-white/40 italic">None recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm text-white/85">
                {result.areasForReview.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Procedural notes (collapsible, default closed) */}
        {result.proceduralNotes.length > 0 && (
          <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <summary className="flex items-center justify-between text-sm uppercase tracking-wide text-white/50 cursor-pointer select-none list-none">
              <span>
                Procedural notes
                <span className="ml-2 text-white/30">({result.proceduralNotes.length})</span>
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-3 space-y-1 text-sm text-white/80">
              {result.proceduralNotes.map((note, i) => (
                <li key={i}>• {note}</li>
              ))}
            </ul>
          </details>
        )}

        {/* Non-standard sequence flags (collapsible, default closed) */}
        {result.nonStandardSequenceFlags.length > 0 && (
          <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <summary className="flex items-center justify-between text-sm uppercase tracking-wide text-white/50 cursor-pointer select-none list-none">
              <span>
                Non-standard sequence flags
                <span className="ml-2 text-white/30">({result.nonStandardSequenceFlags.length})</span>
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-3 space-y-1 text-sm text-white/80">
              {result.nonStandardSequenceFlags.map((flag, i) => (
                <li key={i}>• {flag}</li>
              ))}
            </ul>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
              data-testid="button-retry-drill"
            >
              Try again
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white/80 text-sm font-medium transition-colors"
              data-testid="button-back-from-report"
            >
              Back to scenarios
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
