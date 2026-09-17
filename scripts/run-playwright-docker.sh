#!/usr/bin/env bash

set -euo pipefail

# package.jsonのPlaywrightと同じバージョンに固定する。
readonly PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.57.0-noble"
readonly MODE="${1:-test}"
readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${MODE}" in
  test | update-snapshots) ;;
  *)
    echo "Usage: $0 [test|update-snapshots]" >&2
    exit 2
    ;;
esac

docker_args=(
  run
  --rm
  --init
  --ipc=host
  --mount "type=bind,source=${REPOSITORY_ROOT},target=/source,readonly"
  --env "CI=true"
  --env "HOST_UID=$(id -u)"
  --env "HOST_GID=$(id -g)"
  --env "PLAYWRIGHT_DOCKER_MODE=${MODE}"
)

if [[ "${MODE}" == "update-snapshots" ]]; then
  docker_args+=(
    --mount "type=bind,source=${REPOSITORY_ROOT},target=/output"
  )
fi

if [[ -f "${HOME}/.npmrc" ]]; then
  docker_args+=(
    --mount "type=bind,source=${HOME}/.npmrc,target=/root/.npmrc,readonly"
  )
fi

for variable_name in \
  npm_config_registry \
  PUBLIC_GISCUS_REPO \
  PUBLIC_GISCUS_REPO_ID \
  PUBLIC_GISCUS_CATEGORY \
  PUBLIC_GISCUS_CATEGORY_ID; do
  if [[ -n "${!variable_name:-}" ]]; then
    docker_args+=(--env "${variable_name}")
  fi
done

docker "${docker_args[@]}" "${PLAYWRIGHT_IMAGE}" bash -lc '
  set -euo pipefail

  mkdir -p /work
  tar \
    --exclude=.astro \
    --exclude=.git \
    --exclude=dist \
    --exclude=node_modules \
    --exclude=playwright-report \
    --exclude=test-results \
    -C /source -cf - . | tar -C /work -xf -

  cd /work
  corepack enable
  corepack prepare pnpm@11.7.0 --activate
  pnpm install --frozen-lockfile

  if [[ "${PLAYWRIGHT_DOCKER_MODE}" == "update-snapshots" ]]; then
    pnpm exec playwright test e2e/snapshot.spec.ts --update-snapshots
    tar -cf - e2e/snapshot.spec.ts-snapshots | tar -C /output -xf -
    chown -R "${HOST_UID}:${HOST_GID}" /output/e2e/snapshot.spec.ts-snapshots
  else
    pnpm exec playwright test
  fi
'
