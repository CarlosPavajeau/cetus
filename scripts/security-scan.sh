#!/usr/bin/env bash
# Trivy scans behind `mise run security-scan` and `mise run security-scan-images`, the same locally and in CI.
# Settings live in trivy.yaml and accepted findings in .trivyignore.yaml.
#
#   scripts/security-scan.sh repo     dependencies (pnpm, Gradle lockfiles), secrets and Dockerfiles
#   scripts/security-scan.sh images [api|worker|console]
#                                     builds the production images (all three by default) and reports
#                                     their vulnerabilities without failing
#
# With SARIF_DIR set, each scan also writes a SARIF report there for GitHub code scanning.
set -euo pipefail

cd "$(dirname "$0")/.."

write_sarif() {
  local name=$1
  shift
  [ -n "${SARIF_DIR:-}" ] || return 0
  mkdir -p "$SARIF_DIR"
  trivy "$@" --config trivy.yaml --format sarif --exit-code 0 --quiet --output "$SARIF_DIR/$name.sarif"
}

# Scans a copy of the files git tracks or would track, so local secrets that .gitignore keeps out of the
# repository (.env, certificates) never fail the scan, and uncommitted changes are still scanned.
scan_repo() {
  local snapshot
  snapshot=$(mktemp -d)
  # shellcheck disable=SC2064 # the trap runs after this function returns, when $snapshot is out of scope.
  trap "rm -rf $(printf '%q' "$snapshot")" EXIT
  git ls-files -z --cached --others --exclude-standard \
    | while IFS= read -r -d '' file; do if [ -e "$file" ]; then printf '%s\0' "$file"; fi; done \
    | tar --null -T - -cf - \
    | tar -xf - -C "$snapshot"

  local status=0
  trivy fs --config trivy.yaml "$snapshot" || status=$?
  write_sarif repo fs "$snapshot"
  # Secrets in their own pass: every severity and every directory, while trivy.yaml keeps the threshold and
  # the skipped directories for vulnerabilities and misconfigurations.
  local secrets=(--scanners secret --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL --skip-dirs "**/node_modules")
  trivy fs --config trivy.yaml "${secrets[@]}" "$snapshot" || status=$?
  write_sarif repo-secrets fs "${secrets[@]}" "$snapshot"
  return "$status"
}

scan_images() {
  local app image
  for app in "$@"; do
    case "$app" in
      api | worker | console) ;;
      *)
        echo "unknown app: $app (api, worker or console)" >&2
        return 2
        ;;
    esac
    image="cetus-$app:security-scan"
    docker build --file "apps/$app/Dockerfile" --tag "$image" .
    # Informative: findings never fail the scan, and those without a fix are listed too. Build and scanner
    # errors still do.
    trivy image --config trivy.yaml --exit-code 0 --ignore-unfixed=false "$image"
    write_sarif "image-$app" image --ignore-unfixed=false "$image"
  done
}

case "${1:-}" in
  repo) scan_repo ;;
  images)
    shift
    if [ "$#" -eq 0 ]; then set -- api worker console; fi
    scan_images "$@"
    ;;
  *)
    echo "usage: $0 repo | images [api|worker|console]..." >&2
    exit 2
    ;;
esac
