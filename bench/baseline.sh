#!/usr/bin/env bash
# A fixed set of runs to compare two versions of the services (a JVM, a flag, a change) on the same stack.
#
#   bench/baseline.sh <label> [steps...]   steps: coldstart steady console e2e soak images (default: all, ~50 min)
#
# Writes "<label> <measurement> <result dir>" to bench/results/baseline-index.txt. Needs a seeded stack; to
# compare variants on identical data, use bench/compare.sh, which rebuilds the stack for each one.
#
# The API runs (public-api, console-api) stop the worker: on Railway each service has its own vCPU, here the
# worker's backlog would take the host's CPU and fill LocalStack's memory (S3) until it is OOM-killed.
# Every run waits 45 s after draining the queue, or a saturating run would spill into the next one.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
B=bench/bench.sh
C=(docker compose -f bench/docker-compose.yml)
INDEX=bench/results/baseline-index.txt
label=${1:?usage: bench/baseline.sh <label> [steps...]}
shift
steps=${*:-coldstart steady console e2e soak images}
mkdir -p bench/results

cool() {
  $B drain >/dev/null
  sleep 45
}
last() { ls -dt bench/results/*/ | head -1; }
rec() {
  echo "$label $1 $(last)" >>"$INDEX"
  echo "== $label $1: $(last)"
}
worker() { "${C[@]}" "$1" worker >/dev/null 2>&1; }
localstack_started() { docker inspect -f '{{.State.StartedAt}}' cetus-bench-localstack-1; }
abort() {
  echo "== $label ABORT: $1; start over with bench/bench.sh down -v, up and seed"
  exit 1
}
# A LocalStack that restarted has lost the KMS key and the certificates: every document fails from then on.
guard() { [ "$(localstack_started)" = "$started" ] || abort "LocalStack restarted at $(localstack_started)"; }

started=$(localstack_started)
$B run end-to-end >/dev/null 2>&1
node -e '
  const m = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).metrics;
  process.exit((m.accepted?.value ?? 0) > 0.99 ? 0 : 1);
' "$(last)summary.json" || abort "the end-to-end smoke accepted nothing ($(last))"

for step in $steps; do
  guard
  case $step in
    coldstart)
      cool
      $B coldstart public-api
      rec coldstart-public-api
      ;;
    steady)
      cool
      worker stop
      $B run public-api >/dev/null
      cool
      PROFILE=constant RATE=1200 DURATION=2m $B run public-api
      rec steady-public-api-1200
      worker start
      ;;
    console)
      cool
      worker stop
      $B run console-api >/dev/null
      cool
      PROFILE=constant RATE=400 DURATION=2m $B run console-api
      rec steady-console-api-400
      worker start
      ;;
    e2e)
      cool
      $B run end-to-end >/dev/null
      PROFILE=constant RATE=40 DURATION=2m $B run end-to-end
      rec steady-end-to-end-40
      ;;
    soak)
      cool
      worker stop
      PROFILE=soak RATE=1000 DURATION=15m $B run public-api
      rec soak-public-api-1000
      $B drain >/dev/null
      worker start
      guard
      cool
      PROFILE=soak RATE=300 DURATION=15m $B run mixed
      rec soak-mixed-300
      ;;
    images)
      docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -E 'cetus-bench-(api|worker):latest' |
        sed "s/^/$label image /" >>"$INDEX"
      ;;
    *) abort "unknown step $step" ;;
  esac
done
guard
$B drain >/dev/null
echo "== $label done"
