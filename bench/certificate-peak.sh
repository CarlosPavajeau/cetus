#!/usr/bin/env bash
# Memory of the API container while it validates certificates: each PKCS#12 of modules/signing's matrix uploaded
# ROUNDS times (5) to the last seeded issuer, sampling the container's cgroup every 100 ms. Needs bench-up and
# bench-seed. Prints the memory before, the peak and after, in MiB.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE=(docker compose -f "$ROOT/bench/docker-compose.yml")
CONSOLE_URL=http://localhost:3100
API_URL=http://localhost:8180
MATRIX="$ROOT/modules/signing/src/test/resources/pkcs12"

read -r cookie issuer < <(node -e '
  const state = require(process.argv[1]);
  const org = state.organizations.at(-1);
  console.log(org.cookies.map((c) => `${c.name}=${c.value}`).join("; "), org.issuerId);
' "$ROOT/bench/.state.json")
token=$(curl -sf -H "Cookie: $cookie" -H "Origin: $CONSOLE_URL" "$CONSOLE_URL/api/auth/token" | node -pe 'JSON.parse(require("node:fs").readFileSync(0)).token')

api=$("${COMPOSE[@]}" ps -q api)
current() { docker exec "$api" cat /sys/fs/cgroup/memory.current; }
mib() { echo $(($1 / 1048576)); }

samples=$(mktemp)
trap 'rm -f "$samples"' EXIT
before=$(current)
docker exec "$api" sh -c 'while :; do cat /sys/fs/cgroup/memory.current; sleep 0.1; done' >"$samples" &
sampler=$!

for _ in $(seq "${ROUNDS:-5}"); do
  for file in openssl-default openssl-3des openssl-legacy-rc2 openssl-1m; do
    body=$(node -e 'console.log(JSON.stringify({pkcs12Base64: require("node:fs").readFileSync(process.argv[1]).toString("base64"), password: "cetus-test"}))' "$MATRIX/$file.p12")
    status=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API_URL/console/issuers/$issuer/certificate" \
      -H "Host: localhost" -H "Authorization: Bearer $token" -H "Content-Type: application/json" --data "$body")
    echo "$file: $status"
    expected=200
    [ "$file" = openssl-1m ] && expected=422
    [ "$status" = "$expected" ] || { kill "$sampler"; echo "$file: expected $expected" >&2; exit 1; }
  done
done

sleep 1
kill "$sampler" 2>/dev/null || true
peak=$(sort -n "$samples" | tail -1)
echo "before=$(mib "$before")MiB peak=$(mib "$peak")MiB after=$(mib "$(current)")MiB"
