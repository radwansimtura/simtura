// Exports all draft NREMT questions to a Word doc for review.
// Grouped by category in NREMT blueprint order, sorted by difficulty within.
// Reviewer fills the "Approve?" column with yes / no / edit, then we sync
// back to the DB via scripts/import-nremt-review.ts.
//
// Usage: npx tsx scripts/export-nremt-for-review.ts
import { writeFileSync } from "node:fs";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import { db } from "../server/db";
import { nremtQuestions, type NremtQuestion } from "../shared/schema";
import { eq, asc } from "drizzle-orm";

const CATEGORY_ORDER = ["Airway", "Cardiology", "Trauma", "Medical", "Operations"] as const;
const OUTPUT_PATH = "nremt-review.docx";

function cell(children: Paragraph[], widthPct: number): TableCell {
  return new TableCell({
    children,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  });
}

function buildQuestionRow(q: NremtQuestion, index: number): TableRow {
  const opts = q.options as string[];
  const letters = ["A", "B", "C", "D"];

  const questionCellChildren: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: `Q${index}. `, bold: true }),
        new TextRun({ text: `[d${q.difficulty}] `, italics: true }),
        new TextRun({ text: q.questionText }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];
  opts.forEach((opt, i) => {
    const isCorrect = i === q.correctIndex;
    questionCellChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${isCorrect ? "✓ " : "  "}${letters[i]}. ${opt}`,
            bold: isCorrect,
          }),
        ],
      }),
    );
  });
  questionCellChildren.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  questionCellChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Explanation: ", bold: true }),
        new TextRun({ text: q.explanation }),
      ],
    }),
  );
  questionCellChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Sub-area: ", bold: true }),
        new TextRun({ text: q.subCategory ?? "—", italics: true }),
        new TextRun({ text: "    Source: ", bold: true }),
        new TextRun({ text: q.sourceReference ?? "—", italics: true }),
      ],
    }),
  );

  const idCell = cell(
    [
      new Paragraph({
        children: [new TextRun({ text: "ID", bold: true, size: 16 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: q.id.slice(0, 8), size: 16 })],
      }),
    ],
    8,
  );

  const approveCell = cell(
    [
      new Paragraph({
        children: [new TextRun({ text: "Approve?", bold: true, size: 18 })],
      }),
      new Paragraph({ children: [new TextRun({ text: "" })] }),
      new Paragraph({
        children: [
          new TextRun({ text: "(yes / no / edit)", italics: true, size: 16 }),
        ],
      }),
    ],
    12,
  );

  const notesCell = cell(
    [
      new Paragraph({
        children: [new TextRun({ text: "Notes", bold: true, size: 18 })],
      }),
      new Paragraph({ children: [new TextRun({ text: "" })] }),
    ],
    20,
  );

  return new TableRow({
    children: [idCell, cell(questionCellChildren, 60), approveCell, notesCell],
  });
}

function buildHeaderRow(): TableRow {
  const headerCell = (text: string, widthPct: number): TableCell =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 20 })],
        }),
      ],
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { fill: "DDDDDD" },
    });
  return new TableRow({
    tableHeader: true,
    children: [
      headerCell("ID", 8),
      headerCell("Question", 60),
      headerCell("Approve?", 12),
      headerCell("Notes", 20),
    ],
  });
}

async function main(): Promise<void> {
  console.log("Loading draft NREMT questions...");
  const all = await db
    .select()
    .from(nremtQuestions)
    .where(eq(nremtQuestions.status, "draft"))
    .orderBy(asc(nremtQuestions.category), asc(nremtQuestions.difficulty));

  if (all.length === 0) {
    console.log("No draft questions found. Nothing to export.");
    process.exit(0);
  }
  console.log(`Found ${all.length} draft questions across categories.`);

  const byCategory = new Map<string, NremtQuestion[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const q of all) {
    const list = byCategory.get(q.category);
    if (list) list.push(q);
    else {
      console.warn(`Unknown category "${q.category}" on question ${q.id}`);
      byCategory.set(q.category, [q]);
    }
  }

  const docChildren: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: "NREMT Question Bank — Review", bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${all.length} draft questions. Mark each as yes / no / edit in the Approve? column. Notes column for fixes or comments.`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];

  let counter = 1;
  for (const cat of CATEGORY_ORDER) {
    const list = byCategory.get(cat) ?? [];
    if (list.length === 0) continue;

    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${cat} (${list.length})`, bold: true })],
      }),
    );

    const rows = [buildHeaderRow()];
    for (const q of list) {
      rows.push(buildQuestionRow(q, counter++));
    }
    docChildren.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" },
        },
      }),
    );
    docChildren.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Wrote ${all.length} questions to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
