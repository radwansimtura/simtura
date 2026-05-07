#!/usr/bin/env bash
# Full merge of origin/main into local main.
# Handles two known conflicts in server/routes.ts:
#   1. PUBLISHED_EMS_TITLES — take union of both sides (10 titles)
#   2. /api/evaluate handler — take origin/main's version (frontend already uses it)
# Other files: prefer HEAD (local has 37 newer commits).
#
# Run from Replit Shell:  bash scripts/merge-v2.sh
set -euo pipefail

echo "==> Cleaning stale lock files"
rm -f .git/ORIG_HEAD.lock .git/index.lock .git/HEAD.lock 2>/dev/null || true

echo "==> Checking working tree"
if [ -f .git/MERGE_HEAD ]; then
  echo "    aborting in-progress merge"
  git merge --abort || true
fi
if ! git diff-index --quiet HEAD --; then
  echo "ERROR: working tree dirty. Commit or stash first."
  git status
  exit 1
fi

echo "==> Fetching origin"
git fetch origin

LOCAL_AHEAD=$(git rev-list --count origin/main..HEAD)
REMOTE_AHEAD=$(git rev-list --count HEAD..origin/main)
echo "    Local ahead: $LOCAL_AHEAD   Remote ahead: $REMOTE_AHEAD"

if [ "$REMOTE_AHEAD" = "0" ]; then
  echo "==> Nothing to merge."
  [ "$LOCAL_AHEAD" != "0" ] && git push origin main
  exit 0
fi

echo "==> Starting merge"
set +e
git merge --no-ff --no-commit origin/main
set -e

echo "==> Unresolved files:"
git diff --name-only --diff-filter=U | sed 's/^/    - /'

# === server/routes.ts: surgical resolution ===
if git diff --name-only --diff-filter=U | grep -qx 'server/routes.ts'; then
  echo "==> Resolving server/routes.ts"
  node <<'NODE'
const fs = require("fs");
const path = "server/routes.ts";
let src = fs.readFileSync(path, "utf8");

// 1. Resolve every conflict block.
const UNION = `  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment", "Sports Injury - Primary Assessment (Copy)", "Scenario 1A — Chest Pain / Heart Problems (NREMT Practice)", "Respiratory Failure - Elderly Patient", "Severe Hemorrhage - Thigh Laceration", "Combative Overdose - Suspected Opioid Reversal", "Pediatric Asthma Attack - Acute Exacerbation", "Multi-Patient MVC - Driver #1 (Post-Triage)", "Elderly Fall - Possible Head Injury (Anticoagulated)", "Tension Pneumothorax - Industrial Chest Trauma"];`;

const re = /<{7} HEAD\n([\s\S]*?)={7}\n([\s\S]*?)>{7}[^\n]*\n/g;
let n = 0;
src = src.replace(re, (block, head, theirs) => {
  n++;
  if (block.includes("PUBLISHED_EMS_TITLES")) return UNION + "\n";
  // Default: take HEAD (local has 37 newer commits).
  return head;
});
console.log(`    Resolved ${n} conflict block(s) in routes.ts (default: HEAD)`);

// 2. Replace HEAD's /api/evaluate handler with origin/main's version.
// HEAD takes {question, correctAnswer, traineeResponse} — frontend doesn't send that.
// origin/main takes {stepId, traineeResponse, questionIndex} — frontend uses this.
const reEvaluate = /  app\.post\("\/api\/evaluate"[\s\S]*?\n  \}\);\n(?=\n  app\.get\("\/api\/scenarios")/;
if (!reEvaluate.test(src)) {
  console.error("ERROR: /api/evaluate block not found");
  process.exit(1);
}
const CLEAN = `  app.post("/api/evaluate", async (req, res) => {
    const parsed = evaluateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: "Evaluation service not configured" });
    }

    const { stepId, traineeResponse, questionIndex } = parsed.data;

    const step = await storage.getScenarioStep(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found" });
    }

    let prompt: string;
    let correctActions: string[];
    const questionsArr = (step.questions as any[]) || null;
    if (questionsArr && Array.isArray(questionsArr) && questionsArr.length > 0) {
      const qIdx = typeof questionIndex === "number" ? questionIndex : 0;
      const q = questionsArr[qIdx];
      if (!q) return res.status(400).json({ message: "Invalid questionIndex" });
      prompt = String(q.prompt || "");
      correctActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
    } else {
      prompt = step.prompt || "";
      correctActions = step.correctActions || [];
    }

    if (!prompt || correctActions.length === 0) {
      return res.status(400).json({ message: "Step has no gradable content" });
    }

    const scenario = await storage.getScenario(step.scenarioId);
    const gradingMode = scenario?.gradingMode ?? "flexible";
    const systemPrompt = gradingMode === "nremt_medical" ? getNremtMedicalPrompt() : getFlexiblePrompt();

    const userMessage = \`Step Prompt: \${prompt}
Correct Actions Required: \${JSON.stringify(correctActions)}
Common Incorrect Actions: \${JSON.stringify(step.incorrectActions)}
Critical Criterion This Step Can Violate: \${step.criticalCriterion || "None"}
Why It Matters Clinically: \${step.whyItMatters || "Not specified"}
NREMT Skill Sheet Item: \${step.nremtSkillSheetItem || "Not specified"}
Trainee's Response: "\${traineeResponse}"

Evaluate the trainee's response.\`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return res.status(502).json({ message: "Evaluator returned no text" });
      }

      let raw = textBlock.text.trim();
      if (raw.startsWith("\\\`\\\`\\\`")) {
        raw = raw.replace(/^\\\`\\\`\\\`(?:json)?\\s*/i, "").replace(/\\\`\\\`\\\`\\s*$/, "").trim();
      }

      const parsedResp = JSON.parse(raw);
      res.json({
        pass: Boolean(parsedResp.pass),
        score: Math.max(0, Math.min(100, Math.round(Number(parsedResp.score) || 0))),
        summary: typeof parsedResp.summary === "string" ? parsedResp.summary.slice(0, 300) : "",
        correct: Array.isArray(parsedResp.correct) ? parsedResp.correct.map(String).slice(0, 8) : [],
        missed: Array.isArray(parsedResp.missed) ? parsedResp.missed.map(String).slice(0, 8) : [],
        tip: typeof parsedResp.tip === "string" ? parsedResp.tip.slice(0, 300) : "",
        whyItMatters: typeof parsedResp.whyItMatters === "string" ? parsedResp.whyItMatters.slice(0, 500) : null,
        criticalFailure: Boolean(parsedResp.criticalFailure),
        criticalCriterionViolated: typeof parsedResp.criticalCriterionViolated === "string" ? parsedResp.criticalCriterionViolated : null,
      });
    } catch (err) {
      console.error("Evaluation error:", err);
      res.status(500).json({ message: "Evaluation failed", error: err && err.message ? err.message : "unknown" });
    }
  });
`;
src = src.replace(reEvaluate, CLEAN);
console.log("    /api/evaluate handler replaced with origin/main's version");

// 3. evaluateSchema must accept stepId/traineeResponse/questionIndex.
const reSchema = /const evaluateSchema = z\.object\(\{[\s\S]*?\}\);/;
const NEW_SCHEMA = `const evaluateSchema = z.object({
  stepId: z.string().min(1),
  traineeResponse: z.string().min(1).max(2000),
  questionIndex: z.number().int().min(0).optional(),
});`;
if (reSchema.test(src)) {
  src = src.replace(reSchema, NEW_SCHEMA);
  console.log("    evaluateSchema updated to stepId-based");
}

fs.writeFileSync(path, src);
NODE
  git add server/routes.ts
fi

# === Other unresolved files: prefer HEAD ===
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -n "$REMAINING" ]; then
  echo "==> Other files: prefer HEAD"
  for f in $REMAINING; do
    echo "    $f --ours"
    git checkout --ours -- "$f"
    git add "$f"
  done
fi

echo "==> Verifying no conflict markers"
if grep -rnE '^(<{7}|={7}$|>{7})' server/ shared/ client/src/ 2>/dev/null; then
  echo "ERROR: markers remain"
  exit 1
fi

echo "==> Building"
npm run build

echo "==> Committing merge"
git commit -m "Merge origin/main: union published scenarios + adopt new evaluate handler"

echo "==> Pushing"
git push origin main

echo "==> Final sync check"
git fetch origin
git rev-list --left-right --count origin/main...HEAD
echo "Done."
