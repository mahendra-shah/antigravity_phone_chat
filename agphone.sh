#!/bin/bash
# ============================================================
#  agphone — Antigravity Phone Connect
#  Start the web UI + HTTPS tunnel with ONE command from anywhere
#
#  Usage:  agphone
#  Access: Scan the QR code or open the HTTPS link on your phone
# ============================================================

set -euo pipefail

PROJECT_DIR="/Users/mahendra/work-dir/open-source/antigravity_phone_chat"
PORT=3000
SERVER_PID=""
TUNNEL_PID=""

# ── Colors ───────────────────────────────────────────────────
BOLD="\033[1m"
DIM="\033[2m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"
RESET="\033[0m"

# ── Header ───────────────────────────────────────────────────
echo
echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${BLUE}│   🚀  Antigravity Phone Connect          │${RESET}"
echo -e "${BOLD}${BLUE}│       Access from anywhere over HTTPS   │${RESET}"
echo -e "${BOLD}${BLUE}└─────────────────────────────────────────┘${RESET}"
echo

# ── Cleanup on Ctrl+C / exit ─────────────────────────────────
cleanup() {
  echo
  echo -e "${YELLOW}⏹  Shutting down...${RESET}"
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  pkill -f "ssh.*pinggy" 2>/dev/null || true
  pkill -f "ngrok http" 2>/dev/null || true
  echo -e "${GREEN}✓ Shutdown complete.${RESET}"
  exit 0
}
trap cleanup EXIT INT TERM

# ── Step 1: Verify project exists ────────────────────────────
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}✗ Project not found: $PROJECT_DIR${RESET}"
  exit 1
fi
cd "$PROJECT_DIR"

# Read .env if it exists
set +u
[ -f .env ] && export $(grep -v '^#' .env | xargs)
set -u

# ── Step 2: Kill stale processes ─────────────────────────────
echo -e "${DIM}[1/4] Cleaning up old instances...${RESET}"
pkill -f "node server.js" 2>/dev/null || true
pkill -f "ssh.*pinggy"    2>/dev/null || true
pkill -f "ngrok http"     2>/dev/null || true
lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# ── Step 3: Ensure node deps installed ───────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${DIM}[2/4] Installing dependencies (first run)...${RESET}"
  npm install --silent
else
  echo -e "${DIM}[2/4] Dependencies ✓${RESET}"
fi

# ── Step 4: Source NVM so node is in PATH ────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" --no-use

for d in "$HOME"/.nvm/versions/node/*/bin; do
  export PATH="$d:$PATH"
  break
done

if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ node not found. Install Node.js or set up NVM.${RESET}"
  exit 1
fi

# ── Step 4.5: Ensure Antigravity is running with CDP ──
if ! curl -s -m 2 http://127.0.0.1:9000/json/list &>/dev/null; then
  echo -e "${YELLOW}Antigravity is not listening on port 9000. Restarting it automatically...${RESET}"
  pkill -f "Antigravity.app" 2>/dev/null || true
  sleep 2
  open -a /Applications/Antigravity.app --args --remote-debugging-port=9000
  echo -n -e "${DIM}         Waiting for Antigravity"
  for i in $(seq 1 15); do
    sleep 1
    if curl -s -m 1 http://127.0.0.1:9000/json/list &>/dev/null; then
      echo -e " ✓${RESET}"
      break
    fi
    echo -n "."
  done
  echo
fi

# ── Step 4.5: Ensure Antigravity is running with CDP ──
if ! curl -s -m 2 http://127.0.0.1:9000/json/list &>/dev/null; then
  echo -e "${YELLOW}Antigravity is not listening on port 9000. Restarting it automatically...${RESET}"
  pkill -f "Antigravity.app" 2>/dev/null || true
  sleep 2
  open -a /Applications/Antigravity.app --args --remote-debugging-port=9000
  echo -n -e "${DIM}         Waiting for Antigravity"
  for i in $(seq 1 15); do
    sleep 1
    if curl -s -m 1 http://127.0.0.1:9000/json/list &>/dev/null; then
      echo -e " ✓${RESET}"
      break
    fi
    echo -n "."
  done
  echo
fi

# ── Step 5: Start Node server ────────────────────────────────
echo -e "${DIM}[3/4] Starting server on port $PORT...${RESET}"
SERVER_LOG="/tmp/agphone-server.log"
: > "$SERVER_LOG"
# FORCE_HTTP=1 → server uses plain HTTP so Pinggy/Ngrok can proxy it cleanly
FORCE_HTTP=1 node server.js >> "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

echo -n -e "${DIM}         Waiting"
for i in $(seq 1 20); do
  sleep 1
  if curl -sk "https://localhost:$PORT/" &>/dev/null || \
     curl -s  "http://localhost:$PORT/"  &>/dev/null; then
    echo -e " ✓${RESET}"
    break
  fi
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo -e "${RESET}"
    echo -e "${RED}✗ Server did not start. Last log:${RESET}"
    tail -10 "$SERVER_LOG"
    exit 1
  fi
done

# ── Step 6: Start HTTPS tunnel ───────────────────────────────
TUNNEL_LOG="/tmp/agphone-tunnel.log"
: > "$TUNNEL_LOG"
TUNNEL_URL=""

set +u
HAS_NGROK_DOMAIN="$NGROK_DOMAIN"
HAS_NGROK_TOKEN="$NGROK_AUTHTOKEN"
set -u

if [ -n "$HAS_NGROK_DOMAIN" ] && command -v ngrok &>/dev/null; then
  echo -e "${DIM}[4/4] Opening persistent HTTPS tunnel via Ngrok...${RESET}"
  
  if [ -n "$HAS_NGROK_TOKEN" ]; then
    ngrok config add-authtoken "$HAS_NGROK_TOKEN" >/dev/null 2>&1
  fi
  
  ngrok http --domain="$NGROK_DOMAIN" "https://localhost:$PORT" --log="$TUNNEL_LOG" >/dev/null &
  TUNNEL_PID=$!
  TUNNEL_URL="https://$NGROK_DOMAIN"
  
  # Wait briefly for ngrok to establish
  echo -n -e "${DIM}         Waiting for Ngrok"
  for i in $(seq 1 10); do
    sleep 1
    if grep -q "started tunnel" "$TUNNEL_LOG" 2>/dev/null; then
      echo -e " ✓${RESET}"
      break
    fi
    echo -n "."
    if [ "$i" -eq 10 ]; then
       echo -e "${RESET}"
       echo -e "${YELLOW}⚠  Ngrok took too long to start. Check tunnel logs, you may need an NGROK_AUTHTOKEN.${RESET}"
    fi
  done
else
  echo -e "${DIM}[4/4] Opening temporary HTTPS tunnel via Pinggy...${RESET}"
  ssh -p 443 \
      -R "0:localhost:$PORT" \
      -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -o LogLevel=quiet \
      a.pinggy.io >> "$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  echo -n -e "${DIM}         Getting HTTPS URL"
  for i in $(seq 1 30); do
    sleep 1
    echo -n "."
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9._-]+\.(pinggy\.net|pinggy-free\.link|pinggy\.link)' \
                 "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
    if [ -n "$TUNNEL_URL" ]; then
      echo -e " ✓${RESET}"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo -e "${RESET}"
      echo -e "${YELLOW}⚠  Could not detect URL. Tunnel log:${RESET}"
      cat "$TUNNEL_LOG"
      break
    fi
  done
fi

# ── Step 7: Print access info ────────────────────────────────
echo
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✅  Antigravity Phone Connect is LIVE!   ${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${RESET}"
echo

if [ -n "$TUNNEL_URL" ]; then
  echo -e "  ${BOLD}📱 Open on your phone:${RESET}"
  echo -e "  ${BOLD}${CYAN}${TUNNEL_URL}${RESET}"
  echo
  # Using the robust Node.js QR code generator
  if [ -f "qr.cjs" ]; then
    node qr.cjs "$TUNNEL_URL"
  else
    # Fallback if qr.cjs is missing
    python3 -c "import qrcode, sys; qr = qrcode.QRCode(version=1, box_size=1, border=1); qr.add_data(sys.argv[1]); qr.make(fit=True); qr.print_ascii(invert=True)" "$TUNNEL_URL" 2>/dev/null || true
  fi
fi

echo -e "  ${DIM}💻 Local:  https://localhost:$PORT${RESET}"
echo -e "  ${DIM}📋 Logs:   $SERVER_LOG  |  $TUNNEL_LOG${RESET}"
if [ -z "$HAS_NGROK_DOMAIN" ]; then
  echo -e "  ${DIM}⚠  Pinggy free tunnels expire after 60 min — just run agphone again${RESET}"
else
  echo -e "  ${DIM}🛡️  Using permanent Ngrok domain: $NGROK_DOMAIN${RESET}"
fi
echo
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything."
echo

wait $SERVER_PID
