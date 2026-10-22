#!/usr/bin/env bash
# Runs the local stack in a single terminal: infra (docker compose), console, API, worker and, optionally, the DIAN mock.
# Each service's output is prefixed with its name and also written to .logs/<service>.log. Ctrl+C stops every service;
# the containers keep running (make infra-down stops them).
#
#   scripts/dev.sh [--mock] [--no-infra] [console|api|worker|mock ...]   start services (default: console api worker)
#   scripts/dev.sh setup                                                  first-time setup: deps, infra, auth migrations
#   scripts/dev.sh infra                                                  start the containers and wait until they are ready
#
# Written for the bash 3.2 that ships with macOS: no associative arrays, no `wait -n`.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
LOG_DIR="$ROOT/.logs"

# Dummy credentials so the AWS SDK talks to LocalStack.
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test}
export AWS_REGION=${AWS_REGION:-us-east-1}

MOCK_URL=http://localhost:8090/WcfDianCustomerServices.svc
GRADLE="./gradlew --console=plain"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !\033[0m %s\n' "$*" >&2; }
die() {
  printf '\033[1;31m ✗\033[0m %s\n' "$*" >&2
  exit 1
}

# --- Services -------------------------------------------------------------------------------------------------------

port_of() {
  case $1 in
    console) echo 3000 ;;
    api) echo 8080 ;;
    worker) echo 8081 ;;
    mock) echo 8090 ;;
  esac
}

color_of() {
  case $1 in
    console) echo 35 ;;
    api) echo 36 ;;
    worker) echo 33 ;;
    mock) echo 32 ;;
  esac
}

# Stdin comes from /dev/null: the services run in the background and Quarkus' dev console would otherwise read the tty.
run_service() {
  case $1 in
    console) pnpm --filter @cetus/console dev ;;
    api) $GRADLE :apps:api:quarkusDev ;;
    # The API already takes the default debug port (5005).
    worker)
      if [ "$WITH_MOCK" = 1 ]; then
        CETUS_DIAN_TEST_URL=$MOCK_URL $GRADLE :apps:worker:quarkusDev -Ddebug=5006
      else
        $GRADLE :apps:worker:quarkusDev -Ddebug=5006
      fi
      ;;
    mock) $GRADLE :apps:dian-mock:run ;;
  esac
}

PIDS=""
NAMES=""

start_service() {
  local name=$1 prefix
  prefix=$(printf '\033[%sm%-7s│\033[0m ' "$(color_of "$name")" "$name")
  : >"$LOG_DIR/$name.log"
  # With job control on (set -m) every subshell gets its own process group, so cleanup can signal the whole tree.
  (
    run_service "$name" </dev/null 2>&1 |
      awk -v p="$prefix" -v f="$LOG_DIR/$name.log" '{ print p $0; fflush(); print >> f; fflush(f) }'
  ) &
  PIDS="$PIDS $!"
  NAMES="$NAMES $name"
}

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

wait_until() {
  local timeout=$1
  shift
  local i=0
  until "$@" >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -ge "$timeout" ] && return 1
    sleep 1
  done
}

STOPPING=0
cleanup() {
  [ "$STOPPING" = 1 ] && return
  STOPPING=1
  trap - INT TERM
  [ -z "$PIDS" ] && return
  echo
  info "Stopping services..."
  local pid name listeners=""
  # The Quarkus dev JVMs and the mock's JVM are forked by the Gradle daemon, outside our process groups, so they are
  # stopped through whatever listens on their ports (those ports were free before we started).
  for name in $NAMES; do
    listeners="$listeners $(lsof -t -iTCP:"$(port_of "$name")" -sTCP:LISTEN 2>/dev/null || true)"
  done
  for pid in $PIDS; do kill -INT -- "-$pid" 2>/dev/null || true; done
  for pid in $listeners; do kill -TERM "$pid" 2>/dev/null || true; done
  local i=0
  while [ "$i" -lt 20 ]; do
    local alive=0
    for pid in $PIDS $listeners; do kill -0 "$pid" 2>/dev/null && alive=1; done
    [ "$alive" = 0 ] && break
    sleep 1
    i=$((i + 1))
  done
  for pid in $PIDS; do kill -KILL -- "-$pid" 2>/dev/null || true; done
  for pid in $listeners; do kill -KILL "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  ok "Stopped"
}

# --- Infra ----------------------------------------------------------------------------------------------------------

localstack_ready() { curl -sf localhost:4566/_localstack/init/ready | grep -q '"completed": true'; }

infra_up() {
  command -v docker >/dev/null || die "Docker is not installed"
  docker info >/dev/null 2>&1 || die "Docker is not running"
  info "Starting Postgres and LocalStack"
  docker compose up -d --quiet-pull
  wait_until 60 docker compose exec -T postgres pg_isready -U postgres -q || die "Postgres did not become ready"
  # LocalStack runs infra/localstack/init.sh (KMS key + bucket) after it boots.
  wait_until 90 localstack_ready || die "LocalStack did not finish its init scripts (docker compose logs localstack)"
  ok "Postgres :5432 · LocalStack :4566"
}

# --- Commands -------------------------------------------------------------------------------------------------------

setup() {
  command -v pnpm >/dev/null || die "pnpm is not installed (corepack enable)"
  command -v java >/dev/null || die "Java 25 is not installed"
  [ -f gradle/wrapper/gradle-wrapper.jar ] || die "Missing Gradle wrapper: gradle wrapper --gradle-version 8.10.2"
  if [ ! -f apps/console/.env ]; then
    local secret
    secret=$(openssl rand -base64 32)
    sed "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$secret|" apps/console/.env.example >apps/console/.env
    ok "Created apps/console/.env with a fresh BETTER_AUTH_SECRET"
  fi
  info "Installing Node dependencies"
  pnpm install
  infra_up
  info "Migrating the auth schema"
  pnpm --filter @cetus/console db:migrate
  info "Compiling the Java apps"
  $GRADLE -q :apps:api:classes :apps:worker:classes :apps:dian-mock:classes
  ok "Ready. Run: make dev"
}

up() {
  local services="" with_infra=1 s
  WITH_MOCK=0
  for s in ${@+"$@"}; do
    case $s in
      --mock) WITH_MOCK=1 ;;
      --no-infra) with_infra=0 ;;
      console | api | worker) services="$services $s" ;;
      mock)
        WITH_MOCK=1
        services="$services $s"
        ;;
      *) die "Unknown option or service: $s" ;;
    esac
  done
  [ -z "$services" ] && services=" console api worker"
  if [ "$WITH_MOCK" = 1 ]; then
    case "$services " in *" mock "*) ;; *) services="$services mock" ;; esac
  fi
  has() { case "$services " in *" $1 "*) return 0 ;; esac; return 1; }

  for s in $services; do
    if port_busy "$(port_of "$s")"; then
      lsof -nP -iTCP:"$(port_of "$s")" -sTCP:LISTEN >&2
      die "Port $(port_of "$s") ($s) is already in use"
    fi
  done
  if has console; then
    [ -f apps/console/.env ] || die "Missing apps/console/.env (make setup)"
    [ -d apps/console/node_modules ] || die "Missing Node dependencies (make setup)"
  fi

  [ "$with_infra" = 1 ] && infra_up
  mkdir -p "$LOG_DIR"

  # Compile the shared modules once; two Gradle builds compiling them at the same time step on each other's outputs.
  local tasks=""
  for s in $services; do
    case $s in
      api | worker) tasks="$tasks :apps:$s:classes" ;;
      mock) tasks="$tasks :apps:dian-mock:classes" ;;
    esac
  done
  if [ -n "$tasks" ]; then
    info "Compiling:$tasks"
    # shellcheck disable=SC2086
    $GRADLE -q $tasks || die "Compilation failed"
  fi

  set -m
  trap 'cleanup; exit 130' INT TERM
  trap cleanup EXIT

  # The API downloads the console's JWKS to validate tokens, so the console goes first.
  if has console; then
    start_service console
    info "Waiting for the console's JWKS"
    wait_until 120 curl -sf localhost:3000/api/auth/jwks || warn "The console is not answering /api/auth/jwks yet"
  elif has api && ! curl -sf localhost:3000/api/auth/jwks >/dev/null 2>&1; then
    warn "The console is not running; the API will not be able to validate JWTs"
  fi
  for s in $services; do
    [ "$s" = console ] || start_service "$s"
  done

  # Report each service once its port opens and notice the ones that exit; bash 3.2 has no `wait -n`.
  local ready="" started now running pid name i
  started=$(date +%s)
  while :; do
    running=0
    i=0
    for pid in $PIDS; do
      i=$((i + 1))
      name=$(echo $NAMES | cut -d' ' -f"$i")
      if kill -0 "$pid" 2>/dev/null; then
        running=1
        case "$ready " in *" $name "*) continue ;; esac
        if port_busy "$(port_of "$name")"; then
          now=$(date +%s)
          ok "$name ready at http://localhost:$(port_of "$name") ($((now - started))s)"
          ready="$ready $name"
        fi
      else
        case "$ready " in *" !$name "*) ;; *)
          warn "$name exited (see .logs/$name.log)"
          ready="$ready !$name"
          ;;
        esac
      fi
    done
    [ "$running" = 0 ] && break
    sleep 1
  done
}

case ${1:-} in
  setup) setup ;;
  infra) infra_up ;;
  -h | --help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) up ${@+"$@"} ;;
esac
