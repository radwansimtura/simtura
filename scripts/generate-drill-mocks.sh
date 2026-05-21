#!/usr/bin/env bash
# Generates placeholder audio + video assets for Drill Mode Scenario 1A.
# Uses macOS `say` for TTS and ffmpeg for solid-color MP4 placeholders.
# Output: client/public/drill-assets/scenario-1a/
# Re-runnable: skips files that already exist unless --force is passed.

set -euo pipefail

FORCE=0
if [[ "${1:-}" == "--force" ]]; then FORCE=1; fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/client/public/drill-assets/scenario-1a"
AUDIO_DIR="$OUT_DIR/audio"
TMP_DIR="$(mktemp -d)"
trap "rm -rf $TMP_DIR" EXIT

mkdir -p "$AUDIO_DIR"

EVAL_VOICE="Samantha"
PATIENT_VOICE="Daniel"

gen_audio() {
  local id="$1" voice="$2" text="$3"
  local out="$AUDIO_DIR/${id}.mp3"
  if [[ $FORCE -eq 0 && -f "$out" ]]; then
    echo "  skip $id (exists)"
    return
  fi
  local aiff="$TMP_DIR/${id}.aiff"
  say -v "$voice" -o "$aiff" "$text"
  ffmpeg -y -loglevel error -i "$aiff" -codec:a libmp3lame -b:a 96k -ac 1 "$out"
  echo "  ok   $id"
}

gen_video() {
  local id="$1" color="$2" duration="$3"
  local out="$OUT_DIR/${id}.mp4"
  if [[ $FORCE -eq 0 && -f "$out" ]]; then
    echo "  skip $id (exists)"
    return
  fi
  ffmpeg -y -loglevel error -f lavfi \
    -i "color=c=${color}:s=1280x720:d=${duration}:r=24" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$out"
  echo "  ok   $id"
}

echo "Generating evaluator audio (26 lines)..."
gen_audio "D1"        "$EVAL_VOICE" "You are dispatched to 23 Pine Street for a 70-year-old male complaining of chest pain. You may begin."
gen_audio "E-S2"      "$EVAL_VOICE" "Scene is safe."
gen_audio "E-S4"      "$EVAL_VOICE" "You have one patient."
gen_audio "E-S5"      "$EVAL_VOICE" "ALS is en route. ETA approximately ten minutes."
gen_audio "E1"        "$EVAL_VOICE" "Pulse ox is 92 percent on room air."
gen_audio "E2"        "$EVAL_VOICE" "Airway is patent. Patient is speaking in full sentences."
gen_audio "E3"        "$EVAL_VOICE" "Respirations are 19, slightly labored, with adequate tidal volume. Chest rise is symmetrical."
gen_audio "E4"        "$EVAL_VOICE" "Oxygen is on at 4 liters per minute via nasal cannula. SpO2 is now 96 percent."
gen_audio "E5"        "$EVAL_VOICE" "No major bleeding noted."
gen_audio "E6"        "$EVAL_VOICE" "Radial pulse is present at 110, regular, normal quality."
gen_audio "E7"        "$EVAL_VOICE" "Skin is cool, pale, and diaphoretic."
gen_audio "E8"        "$EVAL_VOICE" "Lung sounds are clear and equal bilaterally."
gen_audio "E9"        "$EVAL_VOICE" "No tenderness on palpation of the chest wall."
gen_audio "E10"       "$EVAL_VOICE" "No jugular venous distension noted."
gen_audio "E11"       "$EVAL_VOICE" "No peripheral edema."
gen_audio "E12-full"  "$EVAL_VOICE" "Blood pressure is 164 over 92. Heart rate 110, regular, normal quality. Respirations 19, slightly labored. SpO2 is 96 percent on 4 liters."
gen_audio "E12-bp"    "$EVAL_VOICE" "Blood pressure is 164 over 92."
gen_audio "E12-hr"    "$EVAL_VOICE" "Heart rate 110, regular, normal quality."
gen_audio "E12-rr"    "$EVAL_VOICE" "Respirations 19, slightly labored."
gen_audio "E12-spo2"  "$EVAL_VOICE" "SpO2 is 96 percent on 4 liters."
gen_audio "E13"       "$EVAL_VOICE" "Aspirin administered, 324 milligrams chewed. Patient tolerated it well."
gen_audio "E14"       "$EVAL_VOICE" "Nitroglycerin 0.4 milligrams administered sublingually. Patient holds it under his tongue."
gen_audio "E15"       "$EVAL_VOICE" "On reassessment: patient reports chest pressure is now 5 out of 10. BP 152 over 88. Heart rate 102. Respirations 18. SpO2 97 percent. Mental status unchanged, alert and oriented."
gen_audio "E16"       "$EVAL_VOICE" "ALS has arrived on scene."
gen_audio "E17"       "$EVAL_VOICE" "Report received. Thank you. We've got him from here."
gen_audio "E-fallback" "$EVAL_VOICE" "Please clarify your question."

echo "Generating patient audio (21 lines)..."
gen_audio "P1"  "$PATIENT_VOICE" "No, I haven't fallen. No back or neck pain."
gen_audio "P2"  "$PATIENT_VOICE" "I've got this pressure in the middle of my chest. Feels like someone's standing on top of me."
gen_audio "P3"  "$PATIENT_VOICE" "My name is Ron."
gen_audio "P4"  "$PATIENT_VOICE" "I'm at home. In my living room."
gen_audio "P5"  "$PATIENT_VOICE" "It's Monday. November 2026."
gen_audio "P6"  "$PATIENT_VOICE" "You're here because I'm having chest pain."
gen_audio "P7"  "$PATIENT_VOICE" "It came on suddenly. I was just sitting on the couch watching a war movie."
gen_audio "P8"  "$PATIENT_VOICE" "Nothing makes it better or worse. It's just been the same."
gen_audio "P9"  "$PATIENT_VOICE" "It's not really pain. It's more like pressure. Like someone's standing on my chest."
gen_audio "P10" "$PATIENT_VOICE" "Yeah, it's going down my left arm a little."
gen_audio "P11" "$PATIENT_VOICE" "I'd say it's a seven out of ten."
gen_audio "P12" "$PATIENT_VOICE" "About 30 minutes ago."
gen_audio "P13" "$PATIENT_VOICE" "Yeah, I'm feeling lightheaded. And kind of short of breath."
gen_audio "P14" "$PATIENT_VOICE" "I'm allergic to peanuts. No medication allergies."
gen_audio "P15" "$PATIENT_VOICE" "I take simvastatin for cholesterol, Eliquis for atrial fibrillation, metoprolol for blood pressure, and I have nitroglycerin for my chest pain. I took them all this morning except the nitro."
gen_audio "P16" "$PATIENT_VOICE" "I have atrial fibrillation, high blood pressure, and high cholesterol."
gen_audio "P17" "$PATIENT_VOICE" "I had a ham sandwich about an hour and a half ago."
gen_audio "P18" "$PATIENT_VOICE" "I was sitting on the couch watching a war movie. Then the pressure started, just out of nowhere."
gen_audio "P19" "$PATIENT_VOICE" "Yes, this is mine. My doctor prescribed it."
gen_audio "P20" "$PATIENT_VOICE" "No, I haven't taken any today."
gen_audio "P21" "$PATIENT_VOICE" "No, nothing like that."

echo "Generating video placeholders (5 clips)..."
gen_video "background-loop"  "0x1a1a1a" 15
gen_video "patient-closeup"  "0x2a2a2a" 6
gen_video "clipboard-1"      "0x3a3a3a" 1
gen_video "clipboard-2"      "0x3a3a3a" 2
gen_video "clipboard-3"      "0x3a3a3a" 2.5

echo "Done. Assets in: $OUT_DIR"
