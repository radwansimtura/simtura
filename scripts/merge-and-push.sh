#!/usr/bin/env bash
# Resolve divergent main + push to origin/main.
# Run this ONCE from the Replit Shell tab (NOT from the agent) with:
#   bash scripts/merge-and-push.sh
#
# Requires git push credentials to be configured (Replit Git panel handles this).

set -euo pipefail

echo "==> Cleaning any stale git lock files"
rm -f .git/ORIG_HEAD.lock .git/index.lock .git/HEAD.lock 2>/dev/null || true

echo "==> Verifying clean working tree"
if [ -f .git/MERGE_HEAD ]; then
  echo "Aborting in-progress merge first..."
  git merge --abort || true
fi
if ! git diff-index --quiet HEAD --; then
  echo "ERROR: Working tree is dirty. Commit or stash before running this script."
  git status
  exit 1
fi

echo "==> Fetching origin"
git fetch origin

LOCAL_AHEAD=$(git rev-list --count origin/main..HEAD)
REMOTE_AHEAD=$(git rev-list --count HEAD..origin/main)
echo "    Local ahead: $LOCAL_AHEAD   Remote ahead: $REMOTE_AHEAD"

if [ "$REMOTE_AHEAD" = "0" ]; then
  echo "==> Nothing to merge. Pushing if needed."
  if [ "$LOCAL_AHEAD" != "0" ]; then git push origin main; fi
  exit 0
fi

echo "==> Starting merge of origin/main"
if ! git merge --no-ff --no-commit origin/main; then
  echo "    Merge produced conflicts (expected). Resolving known conflicts..."
fi

UNRESOLVED=$(git diff --name-only --diff-filter=U)
echo "    Unresolved files:"
echo "$UNRESOLVED" | sed 's/^/      - /'

# ---- server/routes.ts: union the PUBLISHED_EMS_TITLES allowlist ----
if echo "$UNRESOLVED" | grep -qx 'server/routes.ts'; then
  echo "==> Resolving server/routes.ts (PUBLISHED_EMS_TITLES union)"
  python3 - <<'PY'
import re, sys
path = "server/routes.ts"
src = open(path).read()

UNION_LINE = '  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment", "Sports Injury - Primary Assessment (Copy)", "Scenario 1A — Chest Pain / Heart Problems (NREMT Practice)", "Respiratory Failure - Elderly Patient", "Severe Hemorrhage - Thigh Laceration", "Combative Overdose - Suspected Opioid Reversal", "Pediatric Asthma Attack - Acute Exacerbation", "Multi-Patient MVC - Driver #1 (Post-Triage)", "Elderly Fall - Possible Head Injury (Anticoagulated)", "Tension Pneumothorax - Industrial Chest Trauma"];'

# Replace any conflict block whose body contains PUBLISHED_EMS_TITLES with the union line.
pattern = re.compile(
    r'<{7} HEAD\n(?:.*\n)*?={7}\n(?:.*\n)*?>{7}[^\n]*\n',
    re.MULTILINE,
)

def repl(m):
    block = m.group(0)
    if "PUBLISHED_EMS_TITLES" in block:
        return UNION_LINE + "\n"
    # Other conflict blocks in routes.ts: prefer HEAD side (local has 35 newer commits).
    head_match = re.search(r'<{7} HEAD\n((?:.*\n)*?)={7}\n', block)
    if head_match:
        return head_match.group(1)
    return block

new_src = pattern.sub(repl, src)
if new_src == src:
    print("WARN: no conflict blocks found in routes.ts", file=sys.stderr)
open(path, "w").write(new_src)
print("    routes.ts resolved (union for allowlist, HEAD-prefer for other blocks)")
PY
  git add server/routes.ts
fi

# ---- Generic resolution for any other conflicted file: prefer HEAD ----
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -n "$REMAINING" ]; then
  echo "==> Resolving remaining files by preferring HEAD (local) version"
  for f in $REMAINING; do
    case "$f" in
      package-lock.json)
        echo "    $f -> will regenerate after"
        git checkout --ours -- "$f"
        ;;
      *)
        echo "    $f -> --ours (HEAD)"
        git checkout --ours -- "$f"
        ;;
    esac
    git add "$f"
  done
fi

# Regenerate lockfile if package.json or package-lock.json was touched in the merge
if git diff --cached --name-only | grep -qE '^(package\.json|package-lock\.json)$'; then
  echo "==> Regenerating package-lock.json"
  rm -f package-lock.json
  npm install --no-audit --no-fund
  git add package.json package-lock.json
fi

echo "==> Verifying no conflict markers remain"
if grep -rnE '^(<{7}|={7} *$|>{7})' server/ shared/ client/src/ 2>/dev/null; then
  echo "ERROR: conflict markers still present. Aborting."
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
