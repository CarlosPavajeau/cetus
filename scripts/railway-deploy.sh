#!/usr/bin/env bash
# Deploys one Railway service from its GitHub source (the latest commit on main) and waits until it is
# healthy, so the caller deploys the next service only once this one serves traffic. Railway marks a
# deployment SUCCESS only after its health check passes, so this polls for that.
#
#   scripts/railway-deploy.sh <service>
#
# Needs RAILWAY_TOKEN (a project token for the production environment) and jq.
set -euo pipefail

SERVICE=${1:?usage: railway-deploy.sh <service>}
# Covers the build on Railway (Gradle for the API and the worker) plus their 300 s health check.
TIMEOUT_SECONDS=${RAILWAY_DEPLOY_TIMEOUT:-1200}

started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "==> Deploying $SERVICE"
railway redeploy --from-source --yes --service "$SERVICE"

echo "==> Waiting for $SERVICE to build and pass its health check"
deadline=$((SECONDS + TIMEOUT_SECONDS))
while ((SECONDS < deadline)); do
  # The newest deployment created after this script started is the one the redeploy just made.
  status=$(railway deployment list --service "$SERVICE" --limit 5 --json |
    jq -r --arg since "$started_at" '[.[] | select(.createdAt >= $since)] | first | .status // "PENDING"')
  case "$status" in
    SUCCESS)
      echo " ✓ $SERVICE is live"
      exit 0
      ;;
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "::error::$SERVICE deployment ended as $status. Check its logs with: railway logs --service $SERVICE"
      exit 1
      ;;
  esac
  echo "    $status"
  sleep 15
done

echo "::error::$SERVICE was not healthy after ${TIMEOUT_SECONDS}s"
exit 1
