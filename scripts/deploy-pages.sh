#!/usr/bin/env bash
# Publishes a built app to the Cloudflare Pages project as a branch deployment (ADR-038).
# Usage: deploy-pages.sh <dist-dir> <branch> <commit-sha>
# Needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, WRANGLER_VERSION and PAGES_PROJECT in the environment.
#
# Wrangler runs from a temporary folder outside the pnpm workspace (it refuses to manage
# Pages projects from a workspace root) and is pinned to an exact version. It is not a
# project dependency so that every CI job does not have to install it.
set -euo pipefail

dist_dir="$1"
branch="$2"
commit="$3"
production_branch="production" # Nothing deploys to it until Stage 4.

workdir="$(mktemp -d)"
cd "$workdir"
wrangler=(npx --yes "wrangler@${WRANGLER_VERSION}")

# Create the project the first time (Direct Upload, production branch unused for now).
if ! "${wrangler[@]}" pages project list 2>/dev/null | grep -q "\b${PAGES_PROJECT}\b"; then
  "${wrangler[@]}" pages project create "$PAGES_PROJECT" --production-branch="$production_branch"
fi

"${wrangler[@]}" pages deploy "$dist_dir" \
  --project-name="$PAGES_PROJECT" \
  --branch="$branch" \
  --commit-hash="$commit" \
  --commit-dirty=true
