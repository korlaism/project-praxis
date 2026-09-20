#!/usr/bin/env bash
# Build the lab and deploy it to the dev server.
#
#   ./deploy/deploy-lab.sh
#
# Static files only: the lab is a folder, and the notebook lives in the
# learner's browser. Nothing runs server-side and nothing is stored there.
#
# Everything travels as ONE script on stdin, with the bundle carried inside it
# as base64. A pipe and a heredoc cannot both be stdin, and nested quoting
# through Windows cmd -> wsl -> bash is its own swamp; this avoids both.
#
# The previous build is kept as site.prev, so a bad deploy rolls back with one
# mv rather than a rebuild.
set -euo pipefail

HOST=${PRAXIS_HOST:-ai}
# The address to VERIFY over, which is not the same as the ssh alias: an alias
# lives in ssh config and means nothing to curl. Ask ssh for the hostname it
# already resolves to, so nobody's tailnet address has to live in this file.
# Override with PRAXIS_WEB_HOST when the two genuinely differ.
WEB_HOST=${PRAXIS_WEB_HOST:-$(ssh -G "$HOST" 2>/dev/null | awk '/^hostname /{print $2; exit}')}
WEB_HOST=${WEB_HOST:-localhost}
REMOTE=${PRAXIS_REMOTE_DIR:-apps/praxis}
PORT=${PRAXIS_PORT:-8086}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> building"
rm -rf "$ROOT/dist/index"
node "$ROOT/tools/build-topic.mjs" "$ROOT/lab/index.html" >/dev/null
echo "    $(find "$ROOT/dist/index" -type f | wc -l | tr -d ' ') files, checked and publishable"

# macOS tar otherwise ships AppleDouble files and xattr headers: 25 files
# arrive as 59, and every extract prints a warning.
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -cz -C "$ROOT/dist/index" . | base64 > "$WORK/bundle.b64"
echo "    $(du -h "$WORK/bundle.b64" | cut -f1) to ship"

{
  echo 'set -euo pipefail'
  echo "cd ~ && mkdir -p '$REMOTE' && cd '$REMOTE'"

  echo "cat > nginx-praxis.conf <<'PRAXIS_CONF'"
  cat "$ROOT/deploy/nginx-praxis.conf"
  echo "PRAXIS_CONF"

  echo "cat > docker-compose.yml <<'PRAXIS_YML'"
  cat "$ROOT/deploy/docker-compose.yml"
  echo "PRAXIS_YML"

  echo 'rm -rf site.new && mkdir site.new'
  echo "base64 -d <<'PRAXIS_B64' | tar -xz -C site.new"
  cat "$WORK/bundle.b64"
  echo "PRAXIS_B64"

  # swap, keeping one previous build to roll back to
  echo 'rm -rf site.prev'
  echo 'if [ -d site ]; then mv site site.prev; fi'
  echo 'mv site.new site'
  echo 'echo "    deployed $(find site -type f | wc -l | tr -d " ") files"'

  # Docker Desktop's credential helper has no logon session over SSH, so even
  # pulling a public image fails. Public images need no credentials at all.
  echo 'mkdir -p "$HOME/.docker-nocreds"'
  echo '[ -s "$HOME/.docker-nocreds/config.json" ] || echo "{}" > "$HOME/.docker-nocreds/config.json"'
  echo 'export DOCKER_CONFIG="$HOME/.docker-nocreds"'
  # --force-recreate is not optional here, and this is the reason (P-75).
  #
  # The swap above replaces the DIRECTORY that the container bind-mounts, so
  # the container keeps pointing at the old inode. Two deploys later the
  # rm -rf above deletes that inode and the container is mounted to nothing:
  # first it serves 403 / "directory index is forbidden", then it will not
  # start at all. A plain `up -d` is a no-op when the container already
  # exists, and `restart` reuses the same stale mount — only recreating it
  # re-resolves the path.
  echo 'docker compose up -d --force-recreate 2>&1 | tail -3 || docker-compose up -d --force-recreate 2>&1 | tail -3'
  echo 'sleep 2'
  echo 'docker ps --filter name=dev-praxis --format "    {{.Names}}  {{.Status}}  {{.Ports}}" || true'
} > "$WORK/remote.sh"

echo "==> deploying to $HOST:~/$REMOTE"
ssh "$HOST" wsl bash -s < "$WORK/remote.sh"

# A 200 is not evidence. When the bind mount goes stale (P-75) nginx falls
# back to /index.html for everything, so a JavaScript module answers 200 with
# Content-Type text/html and the old check called that a success. It reported
# a healthy deploy three times while the site was broken.
#
# So: assert what came back, not that something came back.
fail=0
base="http://$WEB_HOST:$PORT"

check_type() {                      # path  expected-content-type
  local path="$1" want="$2" got
  if ! got="$(curl -fsS -o /dev/null -w '%{content_type}' "$base/$path" 2>/dev/null)"; then
    printf '    FAIL  /%-38s did not answer\n' "$path"; fail=1; return
  fi
  case "$got" in
    *"$want"*) printf '    ok    /%-38s %s\n' "$path" "$got" ;;
    *)         printf '    FAIL  /%-38s got %s, wanted %s\n' "$path" "$got" "$want"; fail=1 ;;
  esac
}

check_contains() {                  # path  substring the body must contain
  local path="$1" want="$2"
  if curl -fsS "$base/$path" 2>/dev/null | grep -qF -- "$want"; then
    printf '    ok    /%-38s contains %s\n' "${path:-(root)}" "$want"
  else
    printf '    FAIL  /%-38s missing %s\n' "${path:-(root)}" "$want"; fail=1
  fi
}

echo "==> checking what it actually served"
check_contains "" "<title>Praxis Lab"
check_type "scenario/mount.js" "application/javascript"
check_type "harness/lab.css" "text/css"
check_type "harness/fonts/familjen-grotesk-latin.woff2" "font/woff2"

if [ "$fail" -ne 0 ]; then
  echo "==> DEPLOY FAILED VERIFICATION — the previous build is in $REMOTE/site.prev"
  exit 1
fi
echo "==> live at http://$WEB_HOST:$PORT/"
