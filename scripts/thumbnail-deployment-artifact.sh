#!/usr/bin/env bash
set -euo pipefail

# Published images are not a disposable cache. Only a confirmed pre-contract
# deployment permits bootstrapping; API failures and expired artifacts stop deploy.
if [[ "${1:-}" != restore ]]; then
  echo "usage: $0 restore" >&2
  exit 2
fi

command -v gh >/dev/null 2>&1 || { echo "published-artifact: gh unavailable" >&2; exit 1; }
repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
current="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
api() { gh api -H 'Accept: application/vnd.github+json' "$@"; }

runs="$(api "/repos/${repo}/actions/workflows/deploy.yml/runs?branch=main&per_page=20")" || exit 1
run_id=""; attempt=""; sha=""
while IFS=$'\t' read -r id att commit; do
  [[ -z "$id" || "$id" == "$current" ]] && continue
  jobs="$(api "/repos/${repo}/actions/runs/${id}/jobs?per_page=100")" || exit 1
  if jq -e '.jobs[] | .steps[]? | select(.name == "Deploy to Cloudflare Pages" and .conclusion == "success")' <<<"$jobs" >/dev/null; then run_id="$id"; attempt="$att"; sha="$commit"; break; fi
done < <(jq -r '.workflow_runs[] | [.id,.run_attempt,.head_sha] | @tsv' <<<"$runs")
[[ -n "$run_id" ]] || { echo "published-artifact: cannot identify previous public deployment" >&2; exit 1; }

# A successful git tree response distinguishes first adoption from API errors.
tree="$(api "/repos/${repo}/git/trees/${sha}?recursive=1")"
jq -e '(.truncated == false) and (.tree | type == "array")' <<<"$tree" >/dev/null
if ! jq -e '.tree[] | select(.path == "scripts/thumbnail-deployment-artifact.sh")' <<<"$tree" >/dev/null; then
  echo "published-artifact: confirmed pre-contract deployment; initial adoption"
  exit 0
fi

if gh run download "$run_id" --name "published-generated-images-${run_id}-${attempt}" --dir .thumbnail-previous; then exit 0; fi
echo "published-artifact: artifact missing or expired for public run ${run_id}" >&2
exit 1
