/**
 * One-time script: exports every quiz question with its distractors to a Word doc
 * for review. Each question shows the scenario, prompt, correct answer, and 3 distractors.
 * Use Track Changes in Word to mark issues — we'll batch-fix from your markup.
 *
 * Run with: npx tsx scripts/export-distractors-for-review.ts
 * Output: ./distractors-review.docx
 */

import { db } from "../server/db";
import { scenarioSteps, scenarios } from "../shared/schema";
import { asc } from "drizzle-orm";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle,
} from "docx";
import fs from "fs";

interface QuestionEntry {
  scenarioTitle: string;
  stepOrder: number;
  questionLabel: string; // e.g. "Step 3, Q2" or "Step 5"
  prompt: string;
  correctAnswer: string;
  distractors: string[];
}

async function main() {
  console.log("Loading data from DB...");

  const allScenarios = await db.select().from(scenarios);
  const scenarioById = new Map(allScenarios.map((s) => [s.id, s]));

  const allSteps = await db.select().from(scenarioSteps).orderBy(asc(scenarioSteps.stepOrder));

  // Group by scenario
  const stepsByScenario = new Map<string, typeof allSteps>();
  for (const step of allSteps) {
    const list = stepsByScenario.get(step.scenarioId) || [];
    list.push(step);
    stepsByScenario.set(step.scenarioId, list);
  }

  const entries: QuestionEntry[] = [];
  for (const scenario of allScenarios) {
    const steps = (stepsByScenario.get(scenario.id) || []).sort((a, b) => a.stepOrder - b.stepOrder);
    for (const step of steps) {
      const questions = Array.isArray(step.questions) ? (step.questions as any[]) : [];
      if (questions.length > 0) {
        // Multi-question shape
        questions.forEach((q, idx) => {
          const qPrompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
          const qActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
          const qDistractors = Array.isArray(q.distractors) ? q.distractors.map(String) : [];
          if (!qPrompt || qActions.length === 0 || qDistractors.length !== 3) return;
          entries.push({
            scenarioTitle: scenario.title,
            stepOrder: step.stepOrder,
            questionLabel: `Step ${step.stepOrder}, Q${idx + 1}`,
            prompt: qPrompt,
            correctAnswer: qActions[0],
            distractors: qDistractors,
          });
        });
      } else {
        // Legacy single-question shape
        const sPrompt = typeof step.prompt === "string" ? step.prompt.trim() : "";
        const sActions = step.correctActions ?? [];
        const sDistractors = step.distractors ?? [];
        if (!sPrompt || sActions.length === 0 || sDistractors.length !== 3) continue;
        entries.push({
          scenarioTitle: scenario.title,
          stepOrder: step.stepOrder,
          questionLabel: `Step ${step.stepOrder}`,
          prompt: sPrompt,
          correctAnswer: sActions[0],
          distractors: sDistractors,
        });
      }
    }
  }

  console.log(`Total questions: ${entries.length}`);
  console.log(`Across ${stepsByScenario.size} scenarios.\n`);

  // Build the doc
  const ACCENT = "2E5BFF";
  const GREEN = "2E7D32";
  const CORRECT_FILL = "E8F5E9";
  const DISTRACTOR_GRAY = "555555";

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Simtura Distractor Review", font: "Arial", size: 44, bold: true })],
      spacing: { after: 80 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Generated " + new Date().toLocaleString(), font: "Arial", size: 20, italics: true, color: "777777" })],
      spacing: { after: 240 },
    })
  );

  // Instructions
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "How to use this doc", font: "Arial", size: 28, bold: true, color: ACCENT })],
      spacing: { before: 200, after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Turn on Track Changes in Word. For each question, the correct answer is highlighted green. The 3 distractors follow. Mark any distractor that's:", font: "Arial", size: 22 })],
      spacing: { after: 60 },
    })
  );
  for (const issue of [
    "Too obviously wrong (gives away the answer)",
    "Too obviously right (could be marked correct by a knowledgeable person)",
    "Clinically dangerous if memorized as a 'fact' (would teach wrong information)",
    "Off-format compared to the correct answer (wildly different length/style)",
    "Repetitive across questions",
    "Outside the scope (nursing answer on EMT question, etc.)",
  ]) {
    children.push(
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: issue, font: "Arial", size: 22 })],
        spacing: { after: 40 },
      })
    );
  }
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Use Track Changes to strike through or rewrite. Add comments on the side for context. We'll batch-fix from your markup.", font: "Arial", size: 22, italics: true, color: DISTRACTOR_GRAY })],
      spacing: { before: 120, after: 200 },
    })
  );

  // Group entries by scenario
  const byScenario = new Map<string, QuestionEntry[]>();
  for (const e of entries) {
    const list = byScenario.get(e.scenarioTitle) || [];
    list.push(e);
    byScenario.set(e.scenarioTitle, list);
  }

  let questionCounter = 0;
  for (const [scenarioTitle, scenarioEntries] of Array.from(byScenario.entries())) {
    // Scenario heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: scenarioTitle, font: "Arial", size: 36, bold: true })],
        spacing: { before: 480, after: 200 },
        pageBreakBefore: true,
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${scenarioEntries.length} questions`, font: "Arial", size: 20, italics: true, color: DISTRACTOR_GRAY })],
        spacing: { after: 240 },
      })
    );

    for (const e of scenarioEntries) {
      questionCounter++;
      // Question header
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Q${questionCounter} — `, font: "Arial", size: 22, bold: true, color: ACCENT }),
            new TextRun({ text: e.questionLabel, font: "Arial", size: 22, bold: true }),
          ],
          spacing: { before: 240, after: 80 },
        })
      );
      // Prompt
      children.push(
        new Paragraph({
          children: [new TextRun({ text: e.prompt, font: "Arial", size: 22 })],
          spacing: { after: 120 },
        })
      );
      // Correct answer (green-bordered, highlighted)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Correct:  ", font: "Arial", size: 22, bold: true, color: GREEN }),
            new TextRun({ text: e.correctAnswer, font: "Arial", size: 22 }),
          ],
          spacing: { after: 80 },
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: GREEN, space: 12 } },
          indent: { left: 240 },
          shading: { fill: CORRECT_FILL, type: "clear" },
        })
      );
      // Distractors (each numbered)
      e.distractors.forEach((d, idx) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Distractor ${idx + 1}:  `, font: "Arial", size: 22, bold: true, color: DISTRACTOR_GRAY }),
              new TextRun({ text: d, font: "Arial", size: 22 }),
            ],
            spacing: { after: 60 },
            indent: { left: 240 },
          })
        );
      });
    }
  }

  const doc = new Document({
    creator: "Simtura",
    title: "Distractor Review",
    description: "Review document for quiz/drill distractors",
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: ACCENT },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          ],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("distractors-review.docx", buf);
  console.log("✓ Wrote distractors-review.docx");
  console.log(`  ${entries.length} questions across ${byScenario.size} scenarios`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
