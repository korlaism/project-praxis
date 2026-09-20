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
  echo 'docker compose up -d 2>&1 | tail -3 || docker-compose up -d 2>&1 | tail -3'
  echo 'sleep 2'
  echo 'docker ps --filter name=dev-praxis --format "    {{.Names}}  {{.Status}}  {{.Ports}}" || true'
} > "$WORK/remote.sh"

echo "==> deploying to $HOST:~/$REMOTE"
ssh "$HOST" wsl bash -s < "$WORK/remote.sh"

echo "==> checking it answers"
curl -fsS -o /dev/null -w "    index.html  %{http_code}\n" "http://$WEB_HOST:$PORT/"
curl -fsS -o /dev/null -w "    a module    %{http_code}  %{content_type}\n" "http://$WEB_HOST:$PORT/scenario/mount.js"
echo "==> live at http://$WEB_HOST:$PORT/"
