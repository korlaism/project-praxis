#!/usr/bin/env bash
# Run the generation spike against a local ollama on another machine.
#
#   ./tools/spike-on-ollama.sh --per-primitive 2 --label 2026-10-19b
#
# Everything stays in ONE process group on purpose. Started as separate
# commands, the SSH that holds ollama open and the SSH that forwards the port
# both die between invocations — which cost two calls of one run (P-102) and
# then every call of the next (P-103) before anyone noticed, because a lost
# call looks exactly like a model that returned nothing.
#
# The forward targets the WSL VM's own address rather than Windows' loopback:
# an -L to 127.0.0.1 lands on the Windows side and never reaches the Linux
# listener. The address is asked for rather than written down — it changes.
#
# Nothing here is specific to a model. PRAXIS_MODEL is whatever is pulled.
set -euo pipefail

HOST=${PRAXIS_HOST:-ai}
MODEL=${PRAXIS_MODEL:-qwen2.5:7b}
PORT=${PRAXIS_OLLAMA_PORT:-11434}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IPFILE=$(mktemp)
cleanup() { kill ${OLLAMA_PID:-} ${FWD_PID:-} 2>/dev/null || true; rm -f "$IPFILE"; }
trap cleanup EXIT

# ONE wsl session, held open for the whole run. WSL shuts the distro down a
# few seconds after its last session ends, which killed ollama between the
# command that started it and the command that used it — twice, costing a
# ninety-minute run each time. The sleep is the point: it is what keeps the
# Linux side alive, and the IP comes from the same session rather than from
# another one, because asking separately was itself another session.
#
# The script goes over stdin rather than inside the command. Nested quoting
# through Windows cmd -> wsl -> bash is its own swamp, as deploy-lab.sh says;
# an escaped $1 inside four levels of quotes is how the previous version of
# this failed.
echo "==> starting ollama on $HOST, and pinning the distro open"
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=1000 "$HOST" "wsl -- bash" > "$IPFILE" 2>/dev/null <<REMOTE &
OLLAMA_HOST=0.0.0.0:$PORT nohup ollama serve >/tmp/ollama.log 2>&1 &
echo "PRAXIS_WSL_IP:\$(hostname -I | awk '{print \$1}')"
sleep 86400
REMOTE
OLLAMA_PID=$!

for _ in $(seq 1 40); do
  WSLIP=$(tr -d '\0\r' < "$IPFILE" | sed -n 's/^PRAXIS_WSL_IP:\(.*\)$/\1/p' | tr -d ' ' | head -1)
  [ -n "$WSLIP" ] && break
  sleep 2
done
[ -n "$WSLIP" ] || { echo "could not start ollama or find the WSL address on $HOST"; exit 1; }

echo "==> forwarding localhost:$PORT -> $WSLIP:$PORT"
ssh -N -o ServerAliveInterval=15 -o ServerAliveCountMax=1000 -L "$PORT:$WSLIP:$PORT" "$HOST" >/dev/null 2>&1 &
FWD_PID=$!
sleep 6

curl -s --max-time 25 "http://127.0.0.1:$PORT/api/tags" | grep -q "$MODEL" || {
  echo "$MODEL is not loaded on $HOST — pull it there first"; exit 1; }

# curl reaching it is not proof that node will: check with the same client the
# spike uses, before spending anything on a run that cannot talk to anybody.
node -e "fetch('http://127.0.0.1:$PORT/api/tags').then(r=>r.ok?0:Promise.reject(new Error(r.status))).then(()=>process.exit(0)).catch(e=>{console.error('node cannot reach it:',e.message);process.exit(1)})" || exit 1

echo "==> $MODEL reachable; running the spike"

PRAXIS_MODEL_URL="http://127.0.0.1:$PORT/v1/chat/completions" PRAXIS_MODEL_KEY=ollama \
  node "$ROOT/tools/generate-spike.mjs" --model "$MODEL" "$@"
