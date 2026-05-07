#!/usr/bin/env bash
# Finish the in-progress merge that scripts/merge-and-push.sh started.
# Run from Replit Shell:  bash scripts/finish-merge.sh
set -euo pipefail

if [ ! -f .git/MERGE_HEAD ]; then
  echo "ERROR: no merge in progress. Run scripts/merge-and-push.sh first."
  exit 1
fi

UNRESOLVED=$(git diff --name-only --diff-filter=U)
echo "==> Unresolved files:"
echo "$UNRESOLVED" | sed 's/^/    - /'

echo "==> Resolving server/routes.ts via Node"
node -e '
const fs = require("fs");
const path = "server/routes.ts";
let src = fs.readFileSync(path, "utf8");
const UNION = `  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment", "Sports Injury - Primary Assessment (Copy)", "Scenario 1A — Chest Pain / Heart Problems (NREMT Practice)", "Respiratory Failure - Elderly Patient", "Severe Hemorrhage - Thigh Laceration", "Combative Overdose - Suspected Opioid Reversal", "Pediatric Asthma Attack - Acute Exacerbation", "Multi-Patient MVC - Driver #1 (Post-Triage)", "Elderly Fall - Possible Head Injury (Anticoagulated)", "Tension Pneumothorax - Industrial Chest Trauma"];`;
const re = /<{7} HEAD\n([\s\S]*?)={7}\n([\s\S]*?)>{7}[^\n]*\n/g;
let count = 0;
src = src.replace(re, (block, head, theirs) => {
  count++;
  if (block.includes("PUBLISHED_EMS_TITLES")) {
    return UNION + "\n";
  }
  // Other conflict blocks: prefer HEAD (local has 35 newer commits).
  return head;
});
fs.writeFileSync(path, src);
console.log(`    Resolved ${count} conflict block(s) in routes.ts`);
'
git add server/routes.ts

# Any other unresolved file: prefer HEAD via --ours
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -n "$REMAINING" ]; then
  echo "==> Resolving remaining files with --ours (HEAD)"
  for f in $REMAINING; do
    echo "    $f"
    git checkout --ours -- "$f"
    git add "$f"
  done
fi

echo "==> Verifying no conflict markers remain"
if grep -rnE '^(<{7}|={7}$|>{7})' server/ shared/ client/src/ 2>/dev/null; then
  echo "ERROR: conflict markers still present"
  exit 1
fi

echo "==> Building"
npm run build

echo "==> Committing merge"
git commit -m "Merge origin/main: union published scenarios + reconcile divergent work"

echo "==> Pushing"
git push origin main

echo "==> Verifying clean sync"
git fetch origin
git rev-list --left-right --count origin/main...HEAD
echo "Done."
