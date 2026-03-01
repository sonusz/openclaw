#!/usr/bin/env bash
set -euo pipefail

# OpenClaw local-repo installer.
# - Installs OpenClaw from this repository checkout (or OPENCLAW_INSTALL_REPO_URL).
# - Auto-resolves common conflicts from previous installs.
# - Preserves existing ~/.openclaw memory/session state.

log() { printf '[openclaw-install] %s\n' "$*"; }
warn() { printf '[openclaw-install] WARN: %s\n' "$*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_cmd npm
require_cmd mktemp

STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
LEGACY_STATE_DIR="${OPENCLAW_LEGACY_STATE_DIR:-$HOME/.clawdbot}"
BACKUP_ROOT="$(mktemp -d)"
RESTORE_MANIFEST="$BACKUP_ROOT/restore.list"

backup_state_dir() {
  local src="$1"
  local label="$2"
  if [ -d "$src" ]; then
    local dst="$BACKUP_ROOT/$label"
    mkdir -p "$dst"
    cp -a "$src/." "$dst/"
    printf '%s|%s\n' "$dst" "$src" >>"$RESTORE_MANIFEST"
    log "Backed up $src"
  fi
}

restore_state_dirs() {
  if [ ! -f "$RESTORE_MANIFEST" ]; then
    return
  fi

  while IFS='|' read -r backup_dir target_dir; do
    [ -n "$backup_dir" ] || continue
    mkdir -p "$target_dir"
    cp -a "$backup_dir/." "$target_dir/"
    log "Restored state into $target_dir"
  done <"$RESTORE_MANIFEST"
}

cleanup() {
  restore_state_dirs || warn 'State restore encountered an error.'
  rm -rf "$BACKUP_ROOT"
}
trap cleanup EXIT

backup_state_dir "$STATE_DIR" "openclaw"
backup_state_dir "$LEGACY_STATE_DIR" "clawdbot"

# Resolve runtime conflicts from existing installs.
pkill -9 -f openclaw-gateway >/dev/null 2>&1 || true
pkill -9 -f clawdbot-gateway >/dev/null 2>&1 || true

# Remove conflicting global installs (ignore failures for partial installs).
npm uninstall -g openclaw >/dev/null 2>&1 || true
npm uninstall -g clawdbot >/dev/null 2>&1 || true

install_from_dir() {
  local repo_dir="$1"
  log "Installing from local repo: $repo_dir"
  npm install -g "$repo_dir"
}

install_from_repo_url() {
  local repo_url="$1"
  local ref="${OPENCLAW_INSTALL_REF:-main}"
  local tmp_repo
  tmp_repo="$(mktemp -d)"
  log "Cloning $repo_url#$ref"
  require_cmd git
  git clone --depth 1 --branch "$ref" "$repo_url" "$tmp_repo"
  npm install -g "$tmp_repo"
  rm -rf "$tmp_repo"
}

if [ -f "./package.json" ] && [ -f "./openclaw.mjs" ]; then
  install_from_dir "$(pwd)"
elif [ -n "${OPENCLAW_INSTALL_REPO_URL:-}" ]; then
  install_from_repo_url "$OPENCLAW_INSTALL_REPO_URL"
else
  cat >&2 <<'USAGE'
Could not find an OpenClaw repo checkout in the current directory.

Run one of the following:
  1) cd into your fork checkout, then rerun install.sh
  2) set OPENCLAW_INSTALL_REPO_URL to your fork URL, e.g.
     OPENCLAW_INSTALL_REPO_URL=https://github.com/<you>/openclaw.git ./install.sh
USAGE
  exit 1
fi

restore_state_dirs
: >"$RESTORE_MANIFEST"

log 'Installation complete.'
log "Memory/session state preserved at: $STATE_DIR"
