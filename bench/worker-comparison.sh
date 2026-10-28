#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
COMPOSE=(docker compose -f bench/docker-compose.yml)
GROUP=${1:-reference}
case "$GROUP" in reference|curve|historical|large|remote|soak|soak-historical|caches) ;; *) echo "Unknown group: $GROUP" >&2; exit 1;; esac
for variant in ${VARIANTS:-base new}; do
  case "$variant" in base|new) ;; *) echo "Unknown variant: $variant" >&2; exit 1;; esac
done
LOCK=/tmp/cetus-worker-comparison.lock
mkdir "$LOCK" || { echo "Another worker comparison is running" >&2; exit 1; }
trap 'rmdir "$LOCK"' EXIT
if [[ "$GROUP" == caches ]]; then
  export ISSUERS=${ISSUERS:-257}
  node --input-type=module -e 'import fs from "node:fs"; const state = JSON.parse(fs.readFileSync("bench/.state.json")); if (!state.seed?.webhooks || state.organizations.length < Number(process.env.ISSUERS)) throw new Error(`Seed ${process.env.ISSUERS} issuers with BENCH_WEBHOOKS=1 first`);'
  export BENCH_WEBHOOK_PRIVATE_TARGETS=true
  docker compose -f bench/docker-compose.yml --profile caches up -d --no-build webhook-receiver
fi
DURATION_POINT=${DURATION_POINT:-2m}
REPETITIONS=${REPETITIONS:-3}
STATE=$(mktemp -d /tmp/cetus-worker-comparison.XXXXXX)
mkdir -p bench/results
INDEX="bench/results/worker-$GROUP-$(date +%Y%m%d-%H%M%S).tsv"
printf 'variant\tpoint\trepetition\texit_code\tdirectory\n' >"$INDEX"

wait_idle() {
  for ((i=0; i<180; i++)); do
    count=$("${COMPOSE[@]}" exec -T postgres psql -U postgres -d cetus -At -c "select count(*) from billing.jobs where status in ('PENDING','RUNNING')")
    if [[ "$count" == 0 ]]; then return; fi
    sleep 2
  done
  echo "Queue did not empty; refusing to mix runs" >&2
  return 1
}

run_point() {
  local point=$1 rate=$2 lines=$3 latency=$4 duration=$5
  if [[ -n "${POINT_FILTER:-}" && "$POINT_FILTER" != "$point" ]]; then return; fi
  for ((rep=1; rep<=REPETITIONS; rep++)); do
    wait_idle
    local previous
    previous=$(node --input-type=module -e 'import fs from "node:fs"; console.log(fs.readdirSync("bench/results").filter(x=>/^20.*end-to-end-constant$/.test(x)).sort().at(-1) ?? "")')
    local code=0
    BENCH_VARIANT="$variant" PROFILE=constant RATE="$rate" DURATION="$duration" LINES="$lines" \
      ISSUERS="${ISSUERS:-5}" WAIT_DELIVERY=1 DIAN_LATENCY="$latency" \
      bench/bench.sh run end-to-end || code=$?
    directory=$(node --input-type=module -e 'import fs from "node:fs"; console.log(fs.readdirSync("bench/results").filter(x=>/^20.*end-to-end-constant$/.test(x)).sort().at(-1))')
    if [[ "$directory" == "$previous" ]]; then echo "No evidence directory was created" >&2; return 1; fi
    printf '%s\t%s\t%s\t%s\tbench/results/%s\n' "$variant" "$point" "$rep" "$code" "$directory" >>"$INDEX"
  done
}

wait_idle
if [[ -n "${STATE_TEMPLATE:-}" ]]; then
  cp "$STATE_TEMPLATE/initial.dump" "$STATE/initial.dump"
  cp "$STATE_TEMPLATE/state.json" "$STATE/state.json"
else
  "${COMPOSE[@]}" exec -T postgres pg_dump -U postgres -d cetus -Fc >"$STATE/initial.dump"
  cp bench/.state.json "$STATE/state.json"
fi
for variant in ${VARIANTS:-base new}; do
  export BENCH_WORKER_IMAGE="cetus-bench-worker:performance-$variant"
  export BENCH_JOBS_CONCURRENCY=12 BENCH_JOBS_LIMIT_PROCESS_DOCUMENT=8 BENCH_DB_POOL_SIZE=20
  export BENCH_JAVA_OPTS='-XX:AOTCache=app.aot -XX:+UseSerialGC -XX:MaxRAMPercentage=40 -Duser.timezone=America/Bogota -Xlog:gc'
  if [[ "$GROUP" == historical || "$GROUP" == soak-historical ]]; then
    export BENCH_JOBS_CONCURRENCY=36 BENCH_JOBS_LIMIT_PROCESS_DOCUMENT=32 BENCH_DB_POOL_SIZE=40
  fi
  if [[ "$GROUP" == remote ]]; then
    "${COMPOSE[@]}" --profile latency up -d --no-build postgres-latency
    export BENCH_WORKER_DB_URL=jdbc:postgresql://postgres-latency:6433/cetus
  else
    unset BENCH_WORKER_DB_URL
  fi
  "${COMPOSE[@]}" stop api worker console
  "${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d cetus --clean --if-exists <"$STATE/initial.dump"
  cp "$STATE/state.json" bench/.state.json
  "${COMPOSE[@]}" up -d --no-build --wait api worker console
  BENCH_VARIANT="$variant-warmup" PROFILE=constant RATE=2 DURATION=1m LINES=2 WAIT_DELIVERY=1 DIAN_LATENCY=PT0S \
    bench/bench.sh run end-to-end
  case "$GROUP" in
    reference)
      run_point instant 2 2 PT0S "$DURATION_POINT"
      run_point latency 2 2 PT1.5S "$DURATION_POINT" ;;
    curve)
      for rate in 2 4 5 6 8; do run_point "rate-$rate" "$rate" 2 PT1.5S "$DURATION_POINT"; done ;;
    historical)
      for rate in 15 20 25; do run_point "historical-$rate" "$rate" 2 PT1.5S "$DURATION_POINT"; done ;;
    large)
      for lines in 2 100 500; do run_point "lines-$lines" 2 "$lines" PT0S "$DURATION_POINT"; done ;;
    caches) run_point caches 2 2 PT0S 3m ;;
    remote) run_point remote "${STABLE_RATE:?Set the stable rate measured without extra RTT}" 2 PT1.5S "$DURATION_POINT" ;;
    soak|soak-historical)
      run_point "$GROUP" "${SOAK_RATE:?Set 70 percent of the stable rate}" 2 PT1.5S 30m ;;
    *) echo "Unknown group: $GROUP" >&2; exit 1 ;;
  esac
  wait_idle
done
echo "Evidence: $INDEX; reproducible initial data: $STATE"
