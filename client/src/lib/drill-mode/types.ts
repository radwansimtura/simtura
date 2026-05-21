export const SCENARIO_1A_ID = "11111111-aaaa-1111-aaaa-111111111111";
export const SCENARIO_1A_KEY = "1A";
export const DRILL_DURATION_SECONDS = 15 * 60;

export type EndReason =
  | "handoff_completed"
  | "timer_expired"
  | "candidate_terminated"
  | "abandoned";

export type RouterCategory =
  | "PATIENT_QUESTION"
  | "CLINICAL_DATA_REQUEST"
  | "VERBAL_DECLARATION"
  | "INTERVENTION_ACTION"
  | "STATUS_CHECK"
  | "UNINTELLIGIBLE";

export type DeclarationTag =
  | "ppe"
  | "scene_safety"
  | "noi"
  | "patient_count"
  | "als_request"
  | "spinal_determination"
  | "general_impression"
  | "field_impression"
  | "transport_decision"
  | "reassessment_spec";

export interface RouterResult {
  category: RouterCategory;
  lineId: string | null;
  declarationTags: DeclarationTag[];
  fireClipboardWrite: boolean;
  confidence: number;
  reasoning: string;
  source: "keyword" | "haiku" | "fallback";
}

export interface SessionState {
  scenarioKey: string;
  startedAtMs: number;
  elapsedSeconds: number;
  scenarioEnded: boolean;
  endReason: EndReason | null;

  ppeVerbalized: boolean;
  sceneSafetyVerbalized: boolean;
  noiVerbalized: boolean;
  patientCountAcked: boolean;
  alsRequested: boolean;
  spinalAskedTrauma: boolean;
  spinalDeterminationMade: boolean;

  airwayAssessed: boolean;
  ventilationAssessed: boolean;
  oxygenApplied: boolean;
  bleedingAssessed: boolean;
  pulseAssessed: boolean;
  skinAssessed: boolean;
  pulseOxRead: boolean;

  vitalsRequested: boolean;
  fieldImpressionMade: boolean;
  transportDecisionMade: boolean;

  prescriptionConfirmed: boolean;
  dosesTodayAsked: boolean;
  edMedsAsked: boolean;
  aspirinGiven: boolean;
  nitroGiven: boolean;

  reassessmentComplete: boolean;
  alsArrived: boolean;
  handoffInProgress: boolean;
  handoffCompleted: boolean;
}

export type TranscriptEntry =
  | { timestampSeconds: number; speaker: "candidate"; text: string }
  | {
      timestampSeconds: number;
      speaker: "system";
      event:
        | "scenario_start"
        | "scenario_end"
        | "evaluator_audio"
        | "patient_audio"
        | "clipboard_write";
      lineId?: string;
      text?: string;
    };

export interface RoutingLogEntry {
  timestampSeconds: number;
  utterance: string;
  result: RouterResult;
  fireDelayMs: number;
}

export interface DrillSessionResult {
  sessionId: string;
  transcript: TranscriptEntry[];
  routingLog: RoutingLogEntry[];
  endReason: EndReason;
  totalElapsedSeconds: number;
}

export interface SectionScore {
  earned: number;
  possible: number;
}

export interface PointEvaluation {
  pointId: string;
  name: string;
  earned: boolean;
  evidence?: string;
  note?: string;
}

export interface CriticalCriterionEvaluation {
  criterionId: string;
  name: string;
  violated: boolean;
  evidence?: string;
}

export interface GradingResult {
  totalScore: number;
  passedCriticalCriteria: boolean;
  scenarioOutcome:
    | "PASS"
    | "FAIL_CRITICAL_CRITERIA"
    | "FAIL_INSUFFICIENT_POINTS";
  totalTimeUsedSeconds: number;
  sectionScores: {
    sceneSizeUp: SectionScore;
    primarySurvey: SectionScore;
    historyTaking: SectionScore;
    secondaryAssessment: SectionScore;
    vitalSigns: SectionScore;
    fieldImpression: SectionScore;
    interventions: SectionScore;
    reassessment: SectionScore;
    handoff: SectionScore;
  };
  pointByPoint: PointEvaluation[];
  criticalCriteria: CriticalCriterionEvaluation[];
  proceduralNotes: string[];
  nonStandardSequenceFlags: string[];
  strengths: string[];
  areasForReview: string[];
  summaryComment: string;
}
