import type { DeclarationTag, RouterResult, SessionState } from "./types";

export function createSessionState(scenarioKey: string): SessionState {
  return {
    scenarioKey,
    startedAtMs: Date.now(),
    elapsedSeconds: 0,
    scenarioEnded: false,
    endReason: null,

    ppeVerbalized: false,
    sceneSafetyVerbalized: false,
    noiVerbalized: false,
    patientCountAcked: false,
    alsRequested: false,
    spinalAskedTrauma: false,
    spinalDeterminationMade: false,

    airwayAssessed: false,
    ventilationAssessed: false,
    oxygenApplied: false,
    bleedingAssessed: false,
    pulseAssessed: false,
    skinAssessed: false,
    pulseOxRead: false,

    vitalsRequested: false,
    fieldImpressionMade: false,
    transportDecisionMade: false,

    prescriptionConfirmed: false,
    dosesTodayAsked: false,
    edMedsAsked: false,
    aspirinGiven: false,
    nitroGiven: false,

    reassessmentComplete: false,
    alsArrived: false,
    handoffInProgress: false,
    handoffCompleted: false,
  };
}

const DECLARATION_TAG_TO_FLAG: Record<DeclarationTag, keyof SessionState> = {
  ppe: "ppeVerbalized",
  scene_safety: "sceneSafetyVerbalized",
  noi: "noiVerbalized",
  patient_count: "patientCountAcked",
  als_request: "alsRequested",
  spinal_determination: "spinalDeterminationMade",
  general_impression: "ppeVerbalized",
  field_impression: "fieldImpressionMade",
  transport_decision: "transportDecisionMade",
  reassessment_spec: "reassessmentComplete",
};

const LINE_TO_FLAGS: Record<string, Array<keyof SessionState>> = {
  P1: ["spinalAskedTrauma"],
  E1: ["pulseOxRead"],
  E2: ["airwayAssessed"],
  E3: ["ventilationAssessed"],
  E4: ["oxygenApplied"],
  E5: ["bleedingAssessed"],
  E6: ["pulseAssessed"],
  E7: ["skinAssessed"],
  "E12-full": ["vitalsRequested"],
  "E12-bp": ["vitalsRequested"],
  "E12-hr": ["vitalsRequested"],
  "E12-rr": ["vitalsRequested"],
  "E12-spo2": ["vitalsRequested"],
  E13: ["aspirinGiven"],
  E14: ["nitroGiven"],
  E15: ["reassessmentComplete"],
  E16: ["alsArrived"],
  E17: ["handoffCompleted"],
  P19: ["prescriptionConfirmed"],
  P20: ["dosesTodayAsked"],
  P21: ["edMedsAsked"],
};

export function applyRouterResult(state: SessionState, result: RouterResult): SessionState {
  const next = { ...state };
  for (const tag of result.declarationTags) {
    const flag = DECLARATION_TAG_TO_FLAG[tag];
    if (flag) (next as Record<string, unknown>)[flag] = true;
  }
  if (result.lineId && LINE_TO_FLAGS[result.lineId]) {
    for (const flag of LINE_TO_FLAGS[result.lineId]) {
      (next as Record<string, unknown>)[flag] = true;
    }
  }
  return next;
}

export function tickElapsed(state: SessionState): SessionState {
  return { ...state, elapsedSeconds: Math.floor((Date.now() - state.startedAtMs) / 1000) };
}

export function contraindicationChecksComplete(state: SessionState): boolean {
  return state.prescriptionConfirmed && state.dosesTodayAsked && state.edMedsAsked;
}

export function shouldAutoFireAlsArrival(state: SessionState): boolean {
  return state.reassessmentComplete && !state.alsArrived && !state.scenarioEnded;
}

export function isHandoffEligible(state: SessionState): boolean {
  return state.alsArrived && !state.handoffCompleted;
}
