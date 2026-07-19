# Corpus one-command installer (Windows).
#
#   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.ps1 | iex"
#
# or, from a clone:  .\install.ps1
#
# Does everything REQUIREMENTS.md sections 1-2 describe: gets the source (clones to
# ~\.corpus-src when run standalone, uses the clone it lives in otherwise), installs and
# links the MCP server so the corpus-* commands are on PATH, and best-effort installs
# graphifyy (optional — memory tools work without it). Idempotent: safe to re-run to
# update. The one thing it cannot do for you is the per-project step: `corpus-setup`
# from each repo you want memory in — MCP wiring is per-directory by design.
$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "!  $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "x  $msg" -ForegroundColor Red; exit 1 }

# --- Node >= 18 (the only hard prerequisite) --------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node.js >= 18 is required. Install it from https://nodejs.org and re-run."
}
$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 18) { Fail "Node $(node --version) is too old - Corpus needs >= 18." }

# --- Locate the source -------------------------------------------------------
# Run from inside a clone -> use it. Piped via irm|iex ($PSScriptRoot empty) -> clone
# (or update) a canonical copy in ~\.corpus-src.
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "mcp-server-2\package.json"))) {
  $src = $PSScriptRoot
  Step "Installing from this clone: $src"
} else {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "git is required to download Corpus. Install it from https://git-scm.com and re-run."
  }
  $src = Join-Path $HOME ".corpus-src"
  if (Test-Path (Join-Path $src ".git")) {
    Step "Updating existing source in $src"
    git -C $src pull --ff-only
    if ($LASTEXITCODE -ne 0) { Fail "git pull failed - fix $src (or delete it) and re-run." }
  } else {
    Step "Cloning Corpus to $src"
    git clone https://github.com/Rahbir1518/Corpus.git $src
    if ($LASTEXITCODE -ne 0) { Fail "git clone failed - see output above." }
  }
}

# --- Install + link the MCP server ------------------------------------------
# npm link publishes the corpus-* commands onto PATH (per-user on Windows, no admin).
Push-Location (Join-Path $src "mcp-server-2")
try {
  Step "npm install (compiles the server via the prepare hook)"
  npm install
  if ($LASTEXITCODE -ne 0) { Fail "npm install failed - see output above." }
  Step "npm link (puts corpus-setup / corpus-connect / corpus-ls ... on your PATH)"
  npm link
  if ($LASTEXITCODE -ne 0) { Fail "npm link failed - see output above." }
} finally { Pop-Location }

# --- Graphify (optional: enables codebase_search) ----------------------------
if (Get-Command graphify -ErrorAction SilentlyContinue) {
  Step "Graphify already installed - skipping"
} else {
  Step "Installing graphifyy (optional - powers codebase_search)"
  $pipOk = $false
  foreach ($py in @("py", "python", "python3")) {
    if (Get-Command $py -ErrorAction SilentlyContinue) {
      & $py -m pip install graphifyy
      if ($LASTEXITCODE -eq 0) { $pipOk = $true; break }
    }
  }
  if (-not $pipOk) {
    Warn "Could not install graphifyy (needs Python 3.9+ with pip)."
    Warn "Everything else works without it; install later with: python -m pip install graphifyy"
  }
}

# --- Verify ------------------------------------------------------------------
if (Get-Command corpus-setup -ErrorAction SilentlyContinue) {
  Write-Host ""
  Write-Host "Corpus installed." -ForegroundColor Green
} else {
  Warn "Installed, but corpus-setup is not visible in THIS shell - open a new terminal."
}
Write-Host ""
Write-Host "Next - from EACH project you want memory in:"
Write-Host "    cd your-project"
Write-Host "    corpus-setup"
Write-Host ""
Write-Host "Then start Claude Code / Gemini CLI / Codex in that project and approve the"
Write-Host "'corpus' MCP server. corpus-ls lists every workspace this machine can reach."
