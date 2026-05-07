#!/usr/bin/env bash
# Fix the corrupted /api/evaluate handler in server/routes.ts that resulted
# from the merge, then build, commit, push.
# Run from Replit Shell:  bash scripts/fix-evaluate-handler.sh
set -euo pipefail

if [ ! -f .git/MERGE_HEAD ]; then
  echo "ERROR: no merge in progress. Nothing to fix in this script."
  exit 1
fi

echo "==> Replacing /api/evaluate handler with origin/main's clean version"
node <<'NODE'
const fs = require("fs");
const path = "server/routes.ts";
let src = fs.readFileSync(path, "utf8");

const CLEAN_HANDLER = `  app.post("/api/evaluate", async (req, res) => {
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
  });`;

// Match the entire broken /api/evaluate handler.
// Starts at:  app.post("/api/evaluate", async (req, res) => {
// Ends at the matching });  on its own line, before the next  app.get("/api/scenarios"
const re = /  app\.post\("\/api\/evaluate"[\s\S]*?\n  \}\);\n(?=\n  app\.get\("\/api\/scenarios")/;
if (!re.test(src)) {
  console.error("ERROR: could not locate the /api/evaluate handler block.");
  process.exit(1);
}
src = src.replace(re, CLEAN_HANDLER + "\n");
fs.writeFileSync(path, src);
console.log("    Handler replaced.");
NODE

git add server/routes.ts

echo "==> Verifying no conflict markers remain"
if grep -rnE '^(<{7}|={7}$|>{7})' server/ shared/ client/src/ 2>/dev/null; then
  echo "ERROR: conflict markers still present"
  exit 1
fi

echo "==> Building"
npm run build

echo "==> Committing merge"
git commit -m "Merge origin/main: union published scenarios + adopt new evaluate handler"

echo "==> Pushing"
git push origin main

echo "==> Verifying clean sync"
git fetch origin
git rev-list --left-right --count origin/main...HEAD
echo "Done."
