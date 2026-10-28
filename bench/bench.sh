#!/usr/bin/env bash
# Capacity benchmark of Cetus with Railway's limits (1 vCPU / 1 GB for the API and the worker, 512 MB for the
# console), against the DIAN mock. See bench/README.md.
#
#   bench/bench.sh up                 build and start the stack (project cetus-bench, its own ports and volume)
#   bench/bench.sh seed               tenants + API keys (bench/.state.json) and a document history to list
#   bench/bench.sh run <scenario>     run bench/scenarios/<scenario>.js; output in bench/results/<time>-<scenario>/
#   bench/bench.sh coldstart <scen.>  restart the API and the worker and run the scenario on the cold JVMs
#                                     (PROFILE=constant RATE=700 DURATION=2m unless set)
#   bench/bench.sh latency <ISO>      set the DIAN mock's answer delay, e.g. PT1.5S (PT0S: instant)
#   bench/bench.sh drain              drop the worker's backlog left by a run, so it does not skew the next one
#   bench/bench.sh down [-v]          stop the stack (-v also drops its database)
#
# run takes PROFILE (smoke|load|stress|soak), RATE, DURATION, MAX_VUS and DIAN_LATENCY from the environment.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
BENCH="$ROOT/bench"
COMPOSE=(docker compose -f "$BENCH/docker-compose.yml")
API_URL=http://localhost:8180
CONSOLE_URL=http://localhost:3100
MOCK_URL=http://localhost:8190

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m ✓\033[0m %s\n' "$*"; }
die() {
  printf '\033[1;31m ✗\033[0m %s\n' "$*" >&2
  exit 1
}

psql_bench() { "${COMPOSE[@]}" exec -T postgres psql -U postgres -d cetus -v ON_ERROR_STOP=1 "$@"; }

up() {
  info "Building and starting the benchmark stack (the first build takes a few minutes)"
  "${COMPOSE[@]}" up -d --build --wait
  ok "console $CONSOLE_URL · api $API_URL · worker :8181 · dian-mock $MOCK_URL · postgres :5532"
  "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
}

seed() {
  info "Creating tenants through the console and the API"
  DATABASE_URL=postgres://cetus_auth:cetus@localhost:5532/cetus CONSOLE_URL=$CONSOLE_URL CETUS_API_URL=$API_URL node --import "$BENCH/lib/node-ts.mjs" "$BENCH/seed.ts"
  local per_issuer=${BENCH_HISTORY_PER_ISSUER:-4000}
  info "Cloning $per_issuer documents per issuer so the console lists a realistic table"
  psql_bench -q -v per_issuer="$per_issuer" <"$BENCH/sql/clone-documents.sql"
  # Give the scenarios a sample of each issuer's history to open, not just the warm-up invoice.
  local sample
  sample=$(psql_bench -At -c "
    SELECT json_object_agg(issuer_id, ids) FROM (
      SELECT issuer_id, json_agg(id) AS ids FROM (
        SELECT issuer_id, id, row_number() OVER (PARTITION BY issuer_id ORDER BY random()) AS n
        FROM billing.documents) d
      WHERE n <= 200 GROUP BY issuer_id) s")
  node -e '
    const fs = require("node:fs");
    const [path, sample] = process.argv.slice(1);
    const state = JSON.parse(fs.readFileSync(path, "utf8"));
    const ids = JSON.parse(sample);
    for (const org of state.organizations) org.documentIds = ids[org.issuerId] ?? org.documentIds;
    fs.writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
  ' "$BENCH/.state.json" "$sample"
  psql_bench -c "SELECT count(*) AS documents FROM billing.documents"
  ok "Seeded; the session cookies in bench/.state.json last as long as Better Auth's sessions (7 days)"
}

latency() {
  local value=${1:?usage: bench.sh latency PT1.5S}
  curl -sf -X POST "$MOCK_URL/__mock/latency?value=$value" >/dev/null || die "The DIAN mock refused latency $value"
  ok "DIAN mock answers after $value"
}

# Intake runs issue far more than the worker processes. Their documents stay RECEIVED; nobody waits for them.
drain() {
  psql_bench -c "DELETE FROM billing.jobs WHERE status IN ('PENDING', 'RUNNING') RETURNING 1" -q -At | wc -l |
    xargs printf ' \033[1;32m✓\033[0m dropped %s pending jobs\n'
}

# Every 5 s while k6 runs: CPU and memory of each container, and the job queue (the worker's backlog).
collect() {
  local out=$1
  echo "time,container,cpu,mem_usage,mem_percent" >"$out/containers.csv"
  echo "time,job_type,status,jobs,oldest_seconds" >"$out/jobs.csv"
  echo "time,state,connections" >"$out/connections.csv"
  while :; do
    local now
    now=$(date +%H:%M:%S)
    docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" \
      $("${COMPOSE[@]}" ps -q) 2>/dev/null | sed "s/^/$now,/" >>"$out/containers.csv" || true
    local jobs
    jobs=$(psql_bench -At -F, -c "
      SELECT job_type, status, count(*), coalesce(extract(epoch FROM now() - min(run_at))::int, 0)
      FROM billing.jobs WHERE status IN ('PENDING', 'RUNNING') GROUP BY 1, 2" 2>/dev/null) || true
    # An empty queue is a sample too, or the report would end on the last non-empty one.
    printf '%s\n' "${jobs:--,-,0,0}" | sed "s/^/$now,/" >>"$out/jobs.csv"
    psql_bench -At -F, -c "
      SELECT coalesce(state, 'background'), count(*) FROM pg_stat_activity
      WHERE datname = 'cetus' GROUP BY 1" 2>/dev/null | sed "s/^/$now,/" >>"$out/connections.csv" || true
    sleep 5
  done
}

run() {
  local scenario=${1:?usage: bench.sh run <scenario>}
  local script="$BENCH/scenarios/$scenario.js"
  [ -f "$script" ] || die "No scenario $scenario; available: $(ls "$BENCH/scenarios" | sed 's/\.js$//' | xargs)"
  [ -f "$BENCH/.state.json" ] || die "Run bench/bench.sh seed first"
  command -v k6 >/dev/null || die "k6 is not installed (brew install k6)"
  [ -n "${DIAN_LATENCY:-}" ] && latency "$DIAN_LATENCY"

  local out
  out="$BENCH/results/$(date +%Y%m%d-%H%M%S)-$scenario-${PROFILE:-smoke}"
  mkdir -p "$out"
  {
    echo "variant=${BENCH_VARIANT:-unspecified}"
    git -C "$ROOT" rev-parse HEAD
    git -C "$ROOT" diff --binary | shasum -a 256
    echo "lines=${LINES:-2} wait_delivery=${WAIT_DELIVERY:-0} require_skipped=${REQUIRE_SKIPPED:-1} issuers=${ISSUERS:-all}"
    "${COMPOSE[@]}" images --format json
    echo "scenario=$scenario profile=${PROFILE:-smoke} rate=${RATE:-} duration=${DURATION:-} max_vus=${MAX_VUS:-}"
    curl -sf "$MOCK_URL/__mock" || true
    [ -n "${COLDSTART:-}" ] && printf '%s\n' "$COLDSTART"
    "${COMPOSE[@]}" config --format json | node -e '
      const c = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
      for (const [name, s] of Object.entries(c.services)) {
        console.log(`${name}: cpus=${s.cpus ?? "-"} mem=${s.mem_limit ?? "-"}`);
        for (const [key, value] of Object.entries(s.environment ?? {})) {
          if (key.startsWith("CETUS_JOBS_") || key.startsWith("CETUS_CACHE_") || key === "CETUS_DB_POOL_SIZE" || key === "JAVA_OPTS") console.log(`${name}: ${key}=${value}`);
        }
      }'
  } >"$out/run.txt"

  local started
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  psql_bench -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements" >"$out/sql-setup.txt"
  psql_bench -c "COPY (SELECT userid, toplevel, queryid, calls, total_exec_time, rows FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())) TO STDOUT WITH CSV HEADER" >"$out/sql-before.csv"
  collect "$out" &
  local collector=$!
  # The PID goes into the trap now: the local is gone by the time the shell exits.
  trap "kill $collector 2>/dev/null || true" EXIT

  info "Running $scenario (${PROFILE:-smoke}); results in ${out#"$ROOT"/}"
  local status=0
  # A Mac left alone sleeps mid-run, which freezes Docker too and shows up as minutes-long latencies. -s keeps
  # the system awake on AC power even with the display off; closing the lid still sleeps it.
  local awake=()
  command -v caffeinate >/dev/null && awake=(caffeinate -is)
  K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT="$out/report.html" K6_WEB_DASHBOARD_OPEN=false \
    ${awake[@]+"${awake[@]}"} k6 run --quiet --summary-export "$out/summary.json" \
    -e API_URL=$API_URL -e CONSOLE_URL=$CONSOLE_URL "$script" 2>&1 | tee "$out/k6.log" || status=$?
  kill $collector 2>/dev/null || true
  trap - EXIT
  "${COMPOSE[@]}" logs --no-color --since "$started" api worker console >"$out/services.log" 2>&1 || true
  psql_bench -c "COPY (SELECT userid, toplevel, queryid, calls, total_exec_time, rows FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())) TO STDOUT WITH CSV HEADER" >"$out/sql-after.csv"
  "${COMPOSE[@]}" logs --no-color --since "$started" localstack | awk '/AWS kms.Decrypt/ {count++} END {print "kms_decrypt_calls=" count+0}' >"$out/kms.txt"
  node "$BENCH/lib/summarize.mjs" "$out" | tee "$out/resources.txt"
  ok "Report: ${out#"$ROOT"/}/report.html"
  return $status
}

# The first minutes after a deploy: restart both JVMs, wait until they are up and load them right away.
coldstart() {
  local scenario=${1:?usage: bench.sh coldstart <scenario>}
  [ -f "$BENCH/scenarios/$scenario.js" ] || die "No scenario $scenario"
  info "Restarting the API and the worker"
  local since start
  since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  start=$(date +%s)
  "${COMPOSE[@]}" restart api worker >/dev/null
  "${COMPOSE[@]}" up -d --wait api worker >/dev/null
  local ready=$(($(date +%s) - start))
  # Quarkus logs "... started in 2.345s." once it listens; in JSON (prod) it is inside the message.
  local api worker
  api=$("${COMPOSE[@]}" logs --no-color --since "$since" api | grep -o 'started in [0-9.]*s' | tail -1)
  worker=$("${COMPOSE[@]}" logs --no-color --since "$since" worker | grep -o 'started in [0-9.]*s' | tail -1)
  COLDSTART="coldstart: api ${api:-?}, worker ${worker:-?}, both ready ${ready}s after the restart"
  ok "$COLDSTART"
  COLDSTART=$COLDSTART PROFILE=${PROFILE:-constant} RATE=${RATE:-700} DURATION=${DURATION:-2m} run "$scenario"
}

case ${1:-} in
  up) up ;;
  seed) seed ;;
  run) run "${2:-}" ;;
  coldstart) coldstart "${2:-}" ;;
  latency) latency "${2:-}" ;;
  drain) drain ;;
  down)
    shift
    "${COMPOSE[@]}" down ${@+"$@"}
    ;;
  *) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
