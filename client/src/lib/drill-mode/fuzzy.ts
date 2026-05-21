export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

// Medical-term vocabulary. Each entry maps a canonical form to common
// variants likely to be mis-transcribed by browser STT. The normalizer
// replaces any token within edit distance 2 of a variant (or the canonical
// itself) with the canonical form, then the rule-table regex can match
// reliably.
//
// Keep canonical forms lower-case and single-token. Multi-token replacements
// are handled by a separate phrase-level pass.
const MEDICAL_TERMS: Record<string, string[]> = {
  ppe: ["ppe", "bsi"],
  gloves: ["gloves", "glove"],
  oxygen: ["oxygen", "oxgyen", "oxgen"],
  cannula: ["cannula", "canula", "cannulla"],
  pulseox: ["pulseox", "pulse-ox", "pulsox", "pulsox"],
  spo2: ["spo2", "spo-2", "sp02", "saturation", "satporation"],
  nitroglycerin: ["nitroglycerin", "nitroglycerine", "nitroglicerin", "nitroglycerne"],
  nitro: ["nitro"],
  sublingual: ["sublingual", "sublingually", "sublingial", "sublingul"],
  aspirin: ["aspirin", "asprin", "aspirine"],
  asa: ["asa"],
  diaphoretic: ["diaphoretic", "diapheretic", "diaphretic", "diaphretic"],
  auscultate: ["auscultate", "asculate", "ascultate", "auscultates"],
  jvd: ["jvd"],
  jugular: ["jugular", "jugullar", "juglar"],
  edema: ["edema", "oedema", "edma"],
  palpate: ["palpate", "palpates", "palpat"],
  hemorrhage: ["hemorrhage", "hemmorhage", "hemorrage"],
  als: ["als"],
  bls: ["bls"],
  bvm: ["bvm"],
  ecg: ["ecg", "ekg"],
  acs: ["acs"],
  stemi: ["stemi", "stemmy"],
  bradycardia: ["bradycardia", "bradycardiac"],
  tachycardia: ["tachycardia", "tachycardiac"],
  metoprolol: ["metoprolol", "metoprool"],
  simvastatin: ["simvastatin"],
  eliquis: ["eliquis", "eloquis", "elequis"],
  apixaban: ["apixaban"],
  viagra: ["viagra"],
  cialis: ["cialis"],
  levitra: ["levitra"],
  sildenafil: ["sildenafil", "sildenafyl"],
  tadalafil: ["tadalafil"],
};

const VARIANT_TO_CANONICAL: Array<{ variant: string; canonical: string }> = [];
for (const [canonical, variants] of Object.entries(MEDICAL_TERMS)) {
  for (const variant of variants) {
    VARIANT_TO_CANONICAL.push({ variant, canonical });
  }
}
// Sort by length descending so longer variants match first.
VARIANT_TO_CANONICAL.sort((a, b) => b.variant.length - a.variant.length);

const MAX_DISTANCE = 2;
const MIN_TOKEN_LEN_FOR_FUZZY = 5;

// Bare tokens that are themselves valid medical terms — do NOT fuzzy-rewrite
// them, even if they fall within edit distance of a longer canonical. Without
// this, "pulse" (5 chars, distance 2 from "pulseox" → allowed) was silently
// becoming "pulseox" via the token-level fuzzy pass, breaking pulse-primary
// and the `pulse rate` alternation in vitals-hr. The phrase-level pass
// (PHRASE_REPLACEMENTS) still handles "pulse ox" / "pulse oximeter" /
// "pulse-ox" → "pulseox" before the token loop runs.
const NEVER_FUZZY = new Set(["pulse"]);

export function normalizeUtterance(utterance: string): string {
  if (!utterance) return utterance;
  const tokens = utterance.toLowerCase().split(/(\s+|[.,!?;:])/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || /^\s/.test(tok) || /^[.,!?;:]$/.test(tok)) continue;
    if (tok.length < MIN_TOKEN_LEN_FOR_FUZZY) {
      // exact match only — too short for fuzzy without false positives
      for (const { variant, canonical } of VARIANT_TO_CANONICAL) {
        if (tok === variant) {
          tokens[i] = canonical;
          break;
        }
      }
      continue;
    }
    if (NEVER_FUZZY.has(tok)) {
      // Valid bare term — leave as-is, skip the fuzzy match entirely.
      continue;
    }
    let best: { canonical: string; distance: number } | null = null;
    for (const { variant, canonical } of VARIANT_TO_CANONICAL) {
      const distance = levenshtein(tok, variant);
      if (distance === 0) {
        best = { canonical, distance: 0 };
        break;
      }
      const allowed = Math.min(MAX_DISTANCE, Math.floor(variant.length / 3));
      if (distance <= allowed && (!best || distance < best.distance)) {
        best = { canonical, distance };
      }
    }
    if (best) tokens[i] = best.canonical;
  }
  return tokens.join("");
}

// Phrase-level normalizations for two-word terms STT often mis-tokenizes.
const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bpulse\s+ox(imeter|imetry)?\b/gi, "pulseox"],
  [/\bnasal\s+canul+a\b/gi, "nasal cannula"],
  [/\bblood\s+pressure\b/gi, "blood pressure"],
  [/\bheart\s+rate\b/gi, "heart rate"],
  [/\bchest\s+wall\b/gi, "chest wall"],
  [/\blung\s+sounds?\b/gi, "lung sounds"],
];

export function preprocessUtterance(utterance: string): string {
  let out = utterance.toLowerCase();
  for (const [re, replacement] of PHRASE_REPLACEMENTS) {
    out = out.replace(re, replacement);
  }
  return normalizeUtterance(out);
}
