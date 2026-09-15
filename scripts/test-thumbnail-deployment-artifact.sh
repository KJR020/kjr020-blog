#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cat >"$tmp/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == api ]]; then
  url="${@: -1}"
  case "$url" in
    *workflows/deploy.yml/runs*)
      [[ "$SCENARIO" != api-error ]] || exit 1
      echo '{"workflow_runs":[{"id":1,"run_attempt":2,"head_sha":"old"}]}' ;;
    *jobs*)
      echo '{"jobs":[{"steps":[{"name":"Deploy to Cloudflare Pages","conclusion":"success"}]}]}' ;;
    *git/trees*)
      [[ "$SCENARIO" != tree-error ]] || exit 1
      if [[ "$SCENARIO" == initial ]]; then echo '{"tree":[],"truncated":false}'; else echo '{"tree":[{"path":"scripts/thumbnail-deployment-artifact.sh"}],"truncated":false}'; fi ;;
    *) echo "unexpected API $url" >&2; exit 2 ;;
  esac
elif [[ "$1" == run && "$2" == download ]]; then
  [[ "$*" == *published-generated-images-1-2* ]] || exit 2
  [[ "$SCENARIO" == normal ]] || exit 1
  mkdir -p .thumbnail-previous/card .thumbnail-previous/ogp
  echo '{}' > .thumbnail-previous/manifest.json
else exit 2
fi
MOCK
chmod +x "$tmp/gh"
export PATH="$tmp:$PATH" GITHUB_REPOSITORY=x/y GITHUB_RUN_ID=999 GITHUB_RUN_ATTEMPT=1
for scenario in initial normal api-error tree-error expired; do
  result=0
  (cd "$tmp"; SCENARIO="$scenario" bash "$root/scripts/thumbnail-deployment-artifact.sh" restore) >"$tmp/log" 2>&1 || result=$?
  case "$scenario" in initial|normal) expected=0 ;; *) expected=1 ;; esac
  if [[ "$expected" == 0 && "$result" != 0 ]] || [[ "$expected" == 1 && "$result" == 0 ]]; then
    echo "FAIL $scenario: exit $result"; cat "$tmp/log"; exit 1
  fi
  echo "PASS $scenario"
done
