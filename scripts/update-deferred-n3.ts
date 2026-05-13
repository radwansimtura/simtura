// Update DEFERRED.md after Phase N3:
// - Add D26 (submit latency)
// - Update D16 to note scenario boost-fsrs route was deleted
import { readFileSync, writeFileSync } from "node:fs";

const path = "DEFERRED.md";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

// Edit 1: Update D16 to note the deletion of the scenario route.
replaceOnce(
  `### D16. \`boost-fsrs\` (Day 5 flashcard integration) is dormant
Missed quiz questions should auto-promote into flashcard review.
**Plan:** Build NREMT version of boost-fsrs once Phase N4 ships and we
see how users actually use the quiz/flashcard combo.`,
  `### D16. boost-fsrs integration not yet built for NREMT path
The Day 5 scenario boost-fsrs route was deleted in Phase N3 (it depended on
\`stepId\` being non-null, which Phase N1 relaxed; route had no UI callers).
The concept — auto-promote missed questions into flashcard review — is still
the right product behavior, just needs to be reimplemented against the NREMT
question schema.
**Plan:** Build NREMT version of boost-fsrs once Phase N4 ships and we see
how users actually use the quiz/flashcard combo.`,
  "Edit 1: update D16 to reflect scenario route deletion",
);

// Edit 2: Add D26 (submit latency) immediately after D25 (the last existing item).
replaceOnce(
  `### D25. Repo ownership transferred to \`radwansimtura/simtura\` by Yousef
Push works via redirect, but \`git remote -v\` still points at old URL.
**Plan:** (a) Ask Yousef whether the ownership change was intentional,
(b) update remote URL, (c) establish a "communicate before changing
co-founder-touched infra" norm.

---`,
  `### D25. Repo ownership transferred to \`radwansimtura/simtura\` by Yousef
Push works via redirect, but \`git remote -v\` still points at old URL.
**Plan:** (a) Ask Yousef whether the ownership change was intentional,
(b) update remote URL, (c) establish a "communicate before changing
co-founder-touched infra" norm.

### D26. \`/api/quiz/submit\` latency ~3s per request
Live testing during Phase N3 showed each submit takes 2-3 seconds. Cause is
sequential DB roundtrips per request: fetch session, fetch placeholder, update
placeholder, fetch just-served question, pick next question, insert next
placeholder, update session. Six round trips. Painful UX — users tapping an
answer expect <500ms response.
**Plan:** Batch the writes into a single transaction; cache the session row
in a per-request memo so we don't re-fetch it; consider denormalizing the
just-served question's category onto the placeholder row so we don't have
to look it up. Real fix likely cuts this to ~500-800ms.

---`,
  "Edit 2: add D26 submit latency",
);

// Edit 3: D24 references "D9 (no metric)" but should now reference D9 directly. No change needed —
// the note is correct. Skipping.

writeFileSync(path, src);
console.log("\nDEFERRED.md updated.");
