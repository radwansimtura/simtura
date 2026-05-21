import { preprocessUtterance } from "./fuzzy";
import { contraindicationChecksComplete } from "./session-state";
import type {
  DeclarationTag,
  RouterCategory,
  RouterResult,
  SessionState,
} from "./types";

interface RouteSpec {
  category: RouterCategory;
  lineId?: string | null;
  declarationTags?: DeclarationTag[];
  clipboard?: boolean;
}

// `test` returns the index in the (normalized) utterance where the rule's
// trigger phrase begins, or -1 if it does not match. This lets the
// multi-intent path preserve the candidate's actual speaking order within
// a category — see routing-logic.md §5.1.
interface Rule {
  id: string;
  test: (utterance: string, state: SessionState) => number;
  route: (state: SessionState) => RouteSpec | null;
  confidence: number;
}

const rx = (pattern: string) => new RegExp(pattern, "i");

function firstIndex(...indices: number[]): number {
  let best = -1;
  for (const i of indices) {
    if (i < 0) continue;
    if (best < 0 || i < best) best = i;
  }
  return best;
}

const RULES: Rule[] = [
  // Rule 1: verbal declarations (clipboard only or clipboard + audio)
  {
    id: "ppe-declaration",
    // Match against the post-normalization form: the fuzzy normalizer rewrites
    // bsi → ppe and glove → gloves before this regex runs, so the literal
    // alternations need to be the canonical forms (no bare `bsi` or `glove up`).
    // "to put on" subsumes "going to put on" and "i am (now )?(going to )?put on"
    // since it appears as a substring of each.
    test: (u) => u.search(rx("\\b(putting on|donning|standard precautions|body substance isolation|gloves on|i'?ll put on|to put on|gloves up)\\b")),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["ppe"],
      clipboard: true,
    }),
    confidence: 0.9,
  },
  {
    id: "scene-safety-question",
    test: (u) => u.search(rx("\\bscene\\b.*\\b(safe|safety|clear|secure)\\b|is.*scene.*safe")),
    route: () => ({
      category: "CLINICAL_DATA_REQUEST",
      lineId: "E-S2",
      declarationTags: ["scene_safety"],
      clipboard: true,
    }),
    confidence: 0.92,
  },
  {
    id: "noi-declaration",
    // "this is (a) medical/cardiac NOUN" is gated on a clinical noun to avoid
    // false-firing on "medical bracelet", "medical advice", or "medical history".
    test: (u) => u.search(rx("\\b(noi|nature of illness|medical call|chief complaint is|cardiac call|this is (a |an )?(medical|cardiac) (call|patient|case|emergency|presentation|issue|problem)|looks (like )?(a |an )?(medical|cardiac) (call|patient|case|emergency|presentation|issue|problem))\\b")),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["noi"],
      clipboard: true,
    }),
    confidence: 0.85,
  },
  {
    id: "patient-count-question",
    test: (u) =>
      u.search(rx("how many patients|number of patients|other patients|additional patients|just one patient|only one patient")),
    route: () => ({
      category: "CLINICAL_DATA_REQUEST",
      lineId: "E-S4",
      declarationTags: ["patient_count"],
      clipboard: true,
    }),
    confidence: 0.92,
  },
  {
    id: "als-request",
    // Verb-then-target shape: any of these verbs followed by ALS/paramedic/EMS/
    // "advanced life support" anywhere later in the utterance. Verbs alone are
    // not enough to fire — there must be a target word, which keeps phrases
    // like "I need to assess the airway" from triggering this rule.
    test: (u) =>
      u.search(
        rx(
          "(\\bcall(ing)?( for)?|\\bgoing to (call|request|page|dispatch|ask)|\\brequest(ing)?|\\bask(ing)? for|\\bneed\\b|\\bpage\\b|\\bget me\\b|\\bbring in\\b|\\bdispatch).*?(\\bals\\b|\\bparamedic|\\badvanced life support\\b|\\bems\\b)|\\bals backup\\b|\\bparamedic backup\\b|\\bals on scene\\b|\\bals en route\\b",
        ),
      ),
    route: () => ({
      category: "CLINICAL_DATA_REQUEST",
      lineId: "E-S5",
      declarationTags: ["als_request"],
      clipboard: true,
    }),
    confidence: 0.92,
  },
  {
    id: "spinal-determination",
    // Three composable shapes:
    //   A. <spinal-noun> ... <negation-adjective>  — e.g. "spinal stabilization is not necessary"
    //   B. not (going to ) <verb> <spinal-noun>    — e.g. "I'm not going to apply any spinal restrictions"
    //   C. no [need for] <spinal-noun> [modality]  — e.g. "no need for c-spine"
    // The adjective list in A is gated on `not` or `un-` so we don't fire when
    // the candidate says the opposite (e.g. "spinal stabilization is necessary").
    test: (u) =>
      u.search(
        rx(
          "\\b(spinal|c[- ]?spine|spine)\\b.*?\\b(not (necessary|needed|indicated|warranted|required)|un(necessary|needed|warranted))\\b|\\bnot (going to )?(apply|applying|need|require|use) (any )?(spinal|c[- ]?spine|spine)|\\bno (need for (spinal|c[- ]?spine|spine)|(spinal|c[- ]?spine|spine) (immobilization|stabilization|precautions|restrictions)|c[- ]?spine\\b)",
        ),
      ),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["spinal_determination"],
      clipboard: true,
    }),
    confidence: 0.9,
  },
  {
    id: "general-impression",
    test: (u) => u.search(rx("\\bgeneral impression\\b")),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["general_impression"],
      clipboard: true,
    }),
    confidence: 0.88,
  },
  {
    id: "field-impression",
    test: (u) =>
      firstIndex(
        u.search(rx("(field impression|i think this|i suspect|this appears to be|this looks like|diagnosis is|impression is).*(acs|mi\\b|stemi|heart attack|cardiac|acute coronary)")),
        u.search(rx("\\bfield impression\\b.*(acs|cardiac|mi\\b|heart attack)")),
      ),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["field_impression"],
      clipboard: true,
    }),
    confidence: 0.9,
  },
  {
    id: "transport-decision",
    test: (u) =>
      u.search(rx("\\b(high priority|load and go|rapid transport|expedit(e|ing) transport|priority patient|transport now|priority one|emergent transport)\\b")),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["transport_decision"],
      clipboard: true,
    }),
    confidence: 0.9,
  },
  {
    id: "reassessment-spec",
    // The "monitor/check/watch X every Y" alts require a clinical interval
    // (5 minutes, q5, etc.) after `every`, so "monitor every step" misses.
    test: (u) =>
      u.search(rx("reassess(ing)?.*(every|each|q ?5|5 minutes?|five minutes?|priority)|reassessment every|i'?ll reassess|(monitor(ing)?|check(ing)?|watch(ing)?).*(every (5|five|q ?5)|q ?5 minutes?|5 minutes?|five minutes?)|vitals every (5|five) minutes?")),
    route: () => ({
      category: "VERBAL_DECLARATION",
      lineId: null,
      declarationTags: ["reassessment_spec"],
      clipboard: true,
    }),
    confidence: 0.85,
  },

  // Rule 2: intervention actions
  {
    id: "aspirin-admin",
    test: (u) =>
      u.search(rx("324\\s*(mg|milligrams?).*(aspirin|asa)|aspirin.*324|four (baby|81 ?mg|81-milligram) aspirin|four 81|chewable aspirin|asa 324|administer.*aspirin")),
    route: () => ({ category: "INTERVENTION_ACTION", lineId: "E13", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "nitro-admin",
    test: (u) =>
      u.search(rx("0\\.?4\\s*(mg|milligrams?).*(nitro|nitroglycerin)|nitro.*0\\.?4|sublingual nitro|nitro sl|nitro under (the )?tongue|one nitro tablet|administer.*nitro")),
    route: (state) => {
      const ok = contraindicationChecksComplete(state);
      return {
        category: "INTERVENTION_ACTION",
        lineId: ok ? "E14" : "E14",
        clipboard: true,
      };
    },
    confidence: 0.92,
  },
  {
    id: "pulse-ox-place",
    test: (u) =>
      u.search(rx("(place|placing|apply|applying|put|putting|attach|attaching|hook(ing)?( (him|her|them|the patient))? up( to)?|connect(ing)?|getting).*pulse ?ox|pulse oximeter on|sat probe|check the sat|what'?s the (sp ?o2|spo2|sat)|sp ?o2 reading|oxygen saturation")),
    route: () => ({ category: "INTERVENTION_ACTION", lineId: "E1", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "o2-apply",
    test: (u) =>
      u.search(rx("(apply|place|start|begin|put|give|giving|administer|administering|going to (put|start|give)|hook(ing)?( (him|her|them|the patient))? up( to)?).*(oxygen|o2|nasal cannula|nc\\b)|4 ?(liters?|lpm).*(oxygen|o2|nasal cannula|nc\\b)|(oxygen|o2).*4 ?(liters?|lpm)|nc at 4|nasal cannula at|starting o2|initiating oxygen|placing.*cannula")),
    route: () => ({ category: "INTERVENTION_ACTION", lineId: "E4", clipboard: true }),
    confidence: 0.9,
  },

  // Rule 3: clinical data requests (evaluator answers)
  {
    id: "airway",
    test: (u) =>
      u.search(rx("\\bairway\\b.*(patent|open|assess|check|status|clear|adequate|finding|inspect|evaluat|look)|(assess(ing)?|check(ing)?|look(ing)? at|inspect(ing)?|evaluat(e|ing)).*\\bairway\\b|is .*airway")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E2", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "ventilation",
    test: (u) =>
      u.search(rx("\\b(breathing|ventilation|chest rise|respiratory effort|tidal volume|moving air|chest expansion|breath quality)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E3", clipboard: true }),
    confidence: 0.85,
  },
  {
    id: "bleeding",
    test: (u) =>
      u.search(rx("\\b(bleeding|hemorrhage|blood loss|sweep for bleeding|major bleed|exsanguination)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E5", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "skin",
    // Reverse-order pattern added: verbs → skin (e.g. "check the skin"). Without
    // it the rule was order-sensitive and missed natural phrasings.
    test: (u) =>
      u.search(rx("\\bskin\\b.*(color|temp|temperature|condition|feel|moisture|cool|warm|dry|sweat|assess|check|look|inspect|find|status)|(check(ing)?|looking at|look at|assess(ing)?|inspect(ing)?|examine|evaluat(e|ing)).*\\bskin\\b|skin (assessment|finding|status)|how does (his|the patient'?s) skin")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E7", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "lung-sounds",
    test: (u) =>
      u.search(rx("lung sounds|auscultate.*lungs|breath sounds|listen to.*lungs|lungs.*(clear|sound|listen)|auscultat(e|ion)")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E8", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "chest-wall",
    // `palpat(e|ing)` covers "palpate" + "palpating" — the fuzzy normalizer
    // only reaches edit distance 2, and "palpate → palpating" is distance 3.
    test: (u) =>
      u.search(rx("chest wall|palpat(e|ing).*chest|(press(ing)?|push(ing)?).*chest|chest tenderness|tender.*chest")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E9", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "jvd",
    test: (u) =>
      u.search(rx("\\b(jvd|jugular venous distension|jugular distention|neck veins|jugular)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E10", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "edema",
    test: (u) =>
      u.search(rx("\\b(edema|pedal edema|peripheral edema|swelling.*(leg|ankle)|swelling in.*legs)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E11", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "vitals-full",
    // Verb-then-target shape adds natural request phrasings ("let's get vitals",
    // "what are his vitals", "may I have vitals"). Bare `vital signs` is NOT
    // matched alone — it would false-fire on narrative phrases like "the
    // patient's vital signs are stable" outside a request context.
    test: (u) =>
      u.search(rx("\\b(full|complete|baseline|set of) vital(s| signs?)\\b|\\b(get|getting|let'?s get|give me|get me|i'?d like|i want|need|grab|take|run|check|may (i|we) have|can (i|we) have) (the |a |any |his |her |their |patient'?s |set of )?vital(s| signs?)\\b|\\bwhat (are|is) (the |his |her |their |patient'?s )?vital(s| signs?)\\b|\\bvital signs? please\\b|\\ball (the )?vitals\\b|^vitals\\??$")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E12-full", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "vitals-bp",
    test: (u) =>
      u.search(rx("\\b(blood pressure|bp)\\b|what'?s the bp|check.*bp")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E12-bp", clipboard: true }),
    confidence: 0.85,
  },
  {
    id: "vitals-hr",
    test: (u, state) =>
      state.vitalsRequested ? u.search(rx("\\b(heart rate|hr\\b|pulse rate)\\b")) : -1,
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E12-hr", clipboard: true }),
    confidence: 0.8,
  },
  {
    id: "vitals-rr",
    test: (u) =>
      u.search(rx("\\b(respiratory rate|resp rate|rr\\b|respirations\\b)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E12-rr", clipboard: true }),
    confidence: 0.82,
  },

  // Rule 4: patient questions
  {
    id: "p1-trauma",
    test: (u) =>
      u.search(rx("\\b(fall|fallen|fell|trauma|back pain|neck pain|spinal pain|hurt yourself|hit your head|recent injury|any injuries)\\b")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P1", clipboard: true }),
    confidence: 0.88,
  },
  {
    id: "p2-cc",
    test: (u) =>
      u.search(rx("what'?s (going on|wrong|bothering you|the matter|happening)|why did you call|chief complaint|tell me what'?s wrong|what brings (us|me|the ambulance|emergency) here")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P2", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p3-name",
    test: (u) =>
      u.search(rx("\\b(your name|what'?s your name|state your name|name please|tell me your name)\\b")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P3", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "p4-location",
    test: (u) =>
      u.search(rx("where are you|do you know where you are|what place|where do you think you are|are you at home")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P4", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p5-date",
    test: (u) =>
      u.search(rx("what day|what date|what year|what month|today'?s date|do you know what day|what'?s the date")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P5", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p6-event",
    test: (u) =>
      u.search(rx("do you know why (we|i|the ambulance|i'?m here)|why are we here|what'?s happening to you|do you know what'?s going on")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P6", clipboard: true }),
    confidence: 0.85,
  },
  {
    id: "p7-onset",
    test: (u) =>
      u.search(rx("suddenly or gradually|how did this start|how did it (start|begin)|when did it begin|what (were|was) you doing when|onset")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P7", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p8-provocation",
    test: (u) =>
      u.search(rx("anything make it (better|worse)|better or worse|what makes it|provoke|any relief|does anything help")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P8", clipboard: true }),
    confidence: 0.88,
  },
  {
    id: "p9-quality",
    test: (u) =>
      u.search(rx("describe the pain|what does (the pain|it) feel like|how does it feel|sharp or dull|pressure or pain|what kind of pain|burning or pressure")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P9", clipboard: true }),
    confidence: 0.88,
  },
  {
    id: "p10-radiation",
    test: (u) =>
      u.search(rx("\\b(radiate|radiating|does it travel|does it move|pain anywhere else|spread|going down|moving to)\\b")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P10", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p11-severity",
    test: (u) =>
      u.search(rx("scale of (one|1|zero|0) to (ten|10)|0 to 10|1 to 10|rate (the|your) pain|pain scale|how bad")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P11", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p12-time",
    test: (u) =>
      u.search(rx("when did this start|how long ago|how long have you|time it started|how long has it been")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P12", clipboard: true }),
    confidence: 0.85,
  },
  {
    id: "p13-associated",
    test: (u) =>
      u.search(rx("other symptoms|nausea|vomiting|dizziness|lightheaded|shortness of breath|any other|anything else.*(feel|symptom)|associated symptoms|sob\\b")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P13", clipboard: true }),
    confidence: 0.82,
  },
  {
    id: "p14-allergies",
    test: (u) => u.search(rx("\\b(allergies|allergic to|any allergies)\\b")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P14", clipboard: true }),
    confidence: 0.92,
  },
  {
    id: "p15-medications",
    test: (u) =>
      u.search(rx("what medications|what meds|do you take|current medications|any medications|prescriptions|any meds")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P15", clipboard: true }),
    confidence: 0.88,
  },
  {
    id: "p16-pmh",
    test: (u) =>
      u.search(rx("past medical history|\\bpmh\\b|medical history|any health (conditions|problems)|chronic conditions|any conditions")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P16", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p17-loi",
    test: (u) =>
      u.search(rx("last time you ate|last meal|last oral intake|anything to eat or drink|when did you last (eat|drink)")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P17", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p18-events",
    test: (u) =>
      u.search(rx("before this started|leading up to|events leading|what were you doing earlier|walk me through|what happened (right )?before")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P18", clipboard: true }),
    confidence: 0.85,
  },
  {
    id: "p19-prescription",
    test: (u) =>
      u.search(rx("(is this your prescription|is this yours|your doctor prescribe|is this nitro yours|prescribed.*you|your own (nitro|prescription))")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P19", clipboard: true }),
    confidence: 0.9,
  },
  {
    id: "p20-doses",
    test: (u) =>
      u.search(rx("taken any (nitro )?(today|already)|how many doses|any doses already|taken nitro before|have you used it")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P20", clipboard: true }),
    confidence: 0.88,
  },
  {
    id: "p21-ed-meds",
    test: (u) =>
      u.search(rx("erectile dysfunction|\\bed medications?\\b|viagra|cialis|levitra|sildenafil|tadalafil|pde ?5|sexually enhancing")),
    route: () => ({ category: "PATIENT_QUESTION", lineId: "P21", clipboard: true }),
    confidence: 0.95,
  },

  // Pulse — disambiguated by context (primary survey vs vitals)
  {
    id: "pulse-primary",
    test: (u, state) =>
      state.vitalsRequested
        ? -1
        : u.search(rx("\\b(radial pulse|check.*pulse|palpat(e|ing).*pulse|feel.*pulse|pulse.*(check|palpate|feel)|what'?s (his|her|the patient'?s) pulse|do (i|we) have a pulse|pulse present)\\b")),
    route: () => ({ category: "CLINICAL_DATA_REQUEST", lineId: "E6", clipboard: true }),
    confidence: 0.82,
  },

  // Rule 5: status checks
  {
    id: "als-status",
    test: (u) =>
      u.search(rx("where'?s als|is als here|als eta|eta on als|paramedics arrived|when (will|does) als|als status")),
    route: (state) => {
      if (state.reassessmentComplete && !state.alsArrived) {
        return { category: "STATUS_CHECK", lineId: "E16", clipboard: true };
      }
      return null;
    },
    confidence: 0.8,
  },
  {
    id: "handoff-start",
    test: (u) =>
      u.search(rx("(i'?d like to give|giving|i'?ll give|here'?s).*(report|handoff|hand-off)|(report|handoff|hand-off) to als|begin.*handoff|transferring care|let me (tell|brief|give) you|this is what i('?ve| have)( got)?|ok als|here'?s what i('?ve| have)( got)?")),
    route: () => ({ category: "STATUS_CHECK", lineId: null, clipboard: false }),
    confidence: 0.8,
  },
];

function buildResult(rule: Rule, spec: RouteSpec): RouterResult {
  return {
    category: spec.category,
    lineId: spec.lineId ?? null,
    declarationTags: spec.declarationTags ?? [],
    fireClipboardWrite: spec.clipboard ?? false,
    confidence: rule.confidence,
    reasoning: `matched rule:${rule.id}`,
    source: "keyword",
  };
}

export function routeUtterance(
  utterance: string,
  state: SessionState,
): RouterResult | null {
  const normalized = preprocessUtterance(utterance);
  for (const rule of RULES) {
    if (rule.test(normalized, state) < 0) continue;
    const spec = rule.route(state);
    if (!spec) continue;
    return buildResult(rule, spec);
  }
  return null;
}

// Priority groups for ordering multi-intent responses sensibly:
// declarations (clipboard-only, e.g. PPE) fire before clinical-data-requests
// before patient questions before status checks. This matches the way a
// real candidate's compound sentence would be processed by an evaluator.
// Within a category, results are ordered by utterance position (the order
// the candidate actually said them) so audio playback feels natural.
const CATEGORY_PRIORITY: Record<RouterCategory, number> = {
  VERBAL_DECLARATION: 1,
  CLINICAL_DATA_REQUEST: 2,
  INTERVENTION_ACTION: 3,
  PATIENT_QUESTION: 4,
  STATUS_CHECK: 5,
  UNINTELLIGIBLE: 9,
};

interface Indexed {
  result: RouterResult;
  utteranceIndex: number;
}

export function routeUtteranceMulti(
  utterance: string,
  state: SessionState,
): RouterResult[] {
  const normalized = preprocessUtterance(utterance);
  const indexed: Indexed[] = [];
  const seenLineIds = new Set<string>();
  const seenDeclTags = new Set<DeclarationTag>();

  for (const rule of RULES) {
    const idx = rule.test(normalized, state);
    if (idx < 0) continue;
    const spec = rule.route(state);
    if (!spec) continue;
    const result = buildResult(rule, spec);

    if (result.lineId) {
      if (seenLineIds.has(result.lineId)) continue;
      seenLineIds.add(result.lineId);
    }

    const dedupedTags = result.declarationTags.filter((tag) => {
      if (seenDeclTags.has(tag)) return false;
      seenDeclTags.add(tag);
      return true;
    });

    if (!result.lineId && dedupedTags.length === 0 && result.declarationTags.length > 0) {
      continue;
    }

    indexed.push({
      result: { ...result, declarationTags: dedupedTags },
      utteranceIndex: idx,
    });
  }

  indexed.sort((a, b) => {
    const catDiff =
      CATEGORY_PRIORITY[a.result.category] - CATEGORY_PRIORITY[b.result.category];
    if (catDiff !== 0) return catDiff;
    return a.utteranceIndex - b.utteranceIndex;
  });

  return indexed.map((i) => i.result);
}

export const KEYWORD_CONFIDENCE_THRESHOLD = 0.7;
