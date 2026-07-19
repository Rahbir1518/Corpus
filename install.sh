#!/usr/bin/env bash
# Corpus one-command installer (macOS / Linux).
#
#   curl -fsSL https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.sh | bash
#
# or, from a clone:  ./install.sh
#
# Does everything REQUIREMENTS.md sections 1-2 describe: gets the source (clones to
# ~/.corpus-src when run standalone, uses the clone it lives in otherwise), installs and
# links the MCP server so the corpus-* commands are on PATH, and best-effort installs
# graphifyy (optional — memory tools work without it). Idempotent: safe to re-run to
# update. The one thing it cannot do for you is the per-project step: `corpus-setup`
# from each repo you want memory in — MCP wiring is per-directory by design.
set -eu

REPO="https://github.com/Rahbir1518/Corpus.git"

step() { printf '\033[36m>> %s\033[0m\n' "$1"; }
warn() { printf '\033[33m!  %s\033[0m\n' "$1"; }
fail() { printf '\033[31mx  %s\033[0m\n' "$1" >&2; exit 1; }

# --- Node >= 18 (the only hard prerequisite) --------------------------------
command -v node >/dev/null 2>&1 || fail "Node.js >= 18 is required. Install it from https://nodejs.org and re-run."
node_major=$(node --version | sed 's/^v//' | cut -d. -f1)
[ "$node_major" -ge 18 ] || fail "Node $(node --version) is too old - Corpus needs >= 18."

# --- Locate the source -------------------------------------------------------
# Run from inside a clone -> use it. Piped via curl|bash ($0 is "bash") -> clone (or
# update) a canonical copy in ~/.corpus-src.
script_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd || true)
if [ -n "$script_dir" ] && [ -f "$script_dir/mcp-server-2/package.json" ]; then
  src="$script_dir"
  step "Installing from this clone: $src"
else
  command -v git >/dev/null 2>&1 || fail "git is required to download Corpus. Install it and re-run."
  src="$HOME/.corpus-src"
  if [ -d "$src/.git" ]; then
    step "Updating existing source in $src"
    git -C "$src" pull --ff-only || fail "git pull failed - fix $src (or delete it) and re-run."
  else
    step "Cloning Corpus to $src"
    git clone "$REPO" "$src" || fail "git clone failed - see output above."
  fi
fi

# --- Install + link the MCP server ------------------------------------------
step "npm install (compiles the server via the prepare hook)"
(cd "$src/mcp-server-2" && npm install) || fail "npm install failed - see output above."
step "npm link (puts corpus-setup / corpus-connect / corpus-ls ... on your PATH)"
(cd "$src/mcp-server-2" && npm link) || fail "npm link failed. If it was a permissions error, point npm at a user directory and re-run:
    npm config set prefix ~/.npm-global   (then add ~/.npm-global/bin to PATH)"

# --- Graphify (optional: enables codebase_search) ----------------------------
if command -v graphify >/dev/null 2>&1; then
  step "Graphify already installed - skipping"
else
  step "Installing graphifyy (optional - powers codebase_search)"
  pip_ok=0
  for py in python3 python py; do
    if command -v "$py" >/dev/null 2>&1 && "$py" -m pip install graphifyy; then
      pip_ok=1
      break
    fi
  done
  if [ "$pip_ok" -eq 0 ]; then
    warn "Could not install graphifyy (needs Python 3.9+ with pip)."
    warn "Everything else works without it; install later with: python3 -m pip install graphifyy"
  fi
fi

# --- Verify ------------------------------------------------------------------
printf '\n'
if command -v corpus-setup >/dev/null 2>&1; then
  printf '\033[32mCorpus installed.\033[0m\n'
else
  warn "Installed, but corpus-setup is not visible in THIS shell - open a new terminal."
fi
cat <<'EOF'

Next - from EACH project you want memory in:
    cd your-project
    corpus-setup

Then start Claude Code / Gemini CLI / Codex in that project and approve the
'corpus' MCP server. corpus-ls lists every workspace this machine can reach.
EOF
