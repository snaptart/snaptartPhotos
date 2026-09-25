#!/usr/bin/env bash
# Merges snaptart/cms main into this site's dev on a sync branch and opens a PR.
# Called by .github/workflows/cms-sync.yml with GH_TOKEN, CMS_REPO and BASE set,
# from a checkout of BASE.
#
# - Nothing to do when BASE already has the CMS's latest commit.
# - A clean merge is pushed as sync/cms-<sha> with a PR into BASE, which lists the CMS commits
#   and flags a schema change (label "needs db:push") or dependency change.
# - A conflicting merge opens an issue naming the files instead; resolve it by hand
#   (see PROMOTING.md, "Pulling CMS updates into a site").
# - Older open sync PRs are closed once a newer one supersedes them.
set -euo pipefail

git config user.name "cms-sync[bot]"
git config user.email "cms-sync@users.noreply.github.com"

git remote add cms "https://x-access-token:${GH_TOKEN}@github.com/${CMS_REPO}.git"
git fetch --quiet cms main

cms_sha=$(git rev-parse cms/main)
short=${cms_sha:0:7}

if git merge-base --is-ancestor "$cms_sha" HEAD; then
  echo "${BASE} already has CMS ${short}; nothing to do."
  exit 0
fi

branch="sync/cms-${short}"
if git ls-remote --exit-code --heads origin "$branch" >/dev/null; then
  echo "${branch} already exists; its PR or issue is still open."
  exit 0
fi

commits=$(git log --no-merges --format='- %s (`%h`)' "HEAD..${cms_sha}")
# Files the CMS changed since this site last merged it.
changed=$(git diff --name-only "HEAD...${cms_sha}")

git checkout -q -b "$branch"
if ! git merge --no-ff -m "Merge CMS ${short} into ${BASE}" "$cms_sha"; then
  conflicts=$(git diff --name-only --diff-filter=U | sed 's/^/- `/; s/$/`/')
  git merge --abort
  # Nothing is pushed on a conflict, so check for this update's issue before opening another.
  title_prefix="CMS sync needs a hand: ${short} "
  open=$(gh issue list --state open --json title \
    --jq "[.[] | select(.title | startswith(\"${title_prefix}\"))] | length")
  if [ "${open:-0}" != "0" ]; then
    echo "An issue for the ${short} conflict is already open."
    exit 0
  fi
  gh issue create \
    --title "CMS sync needs a hand: ${short} conflicts with ${BASE}" \
    --body "$(printf '%s\n\n%s\n\n%s\n%s\n\n%s\n%s\n' \
      "Merging \`${CMS_REPO}\` main (\`${short}\`) into \`${BASE}\` stopped on conflicts. Nothing was pushed." \
      "Resolve it locally: \`git checkout -b ${branch} ${BASE}\`, \`git fetch upstream\`, \`git merge upstream/main\`, fix the files below, then open a PR into \`${BASE}\`." \
      "**Conflicting files:**" "$conflicts" \
      "**CMS commits in this update:**" "$commits")"
  exit 0
fi

git push -q origin "$branch"

notes=""
labels=()
if grep -qx 'src/lib/db/schema.ts' <<<"$changed"; then
  notes+=$'- **Schema changed:** after merging, run `npm run db:push` against this site\'s database. It is one-way.\n'
  gh label create "needs db:push" --color d93f0b --description "Merging this changes the database schema" --force >/dev/null
  labels+=(--label "needs db:push")
fi
if grep -qxE 'package(-lock)?\.json' <<<"$changed"; then
  notes+=$'- **Dependencies changed:** run `npm install` locally after pulling.\n'
fi
[ -n "$notes" ] || notes=$'- No schema or dependency changes.\n'

gh pr create --base "$BASE" --head "$branch" "${labels[@]}" \
  --title "Sync CMS updates (${short})" \
  --body "$(printf '%s\n\n%s\n\n%s\n%s\n\n%s\n' \
    "Merges \`${CMS_REPO}\` main (\`${short}\`) into \`${BASE}\`. Opened automatically by the *Sync CMS updates* workflow." \
    "$notes" \
    "**CMS commits:**" "$commits" \
    "Check the Vercel preview, then merge. Release \`${BASE}\` to \`main\` as usual.")"

# Close older sync PRs; the new branch already contains everything they had.
for n in $(gh pr list --state open --json number,headRefName \
  --jq ".[] | select(.headRefName | startswith(\"sync/cms-\")) | select(.headRefName != \"${branch}\") | .number"); do
  gh pr close "$n" --delete-branch --comment "Superseded by the newer CMS sync (${short})."
done
