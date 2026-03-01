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

resolve_npm_global_bin() {
  npm bin -g 2>/dev/null || true
}

ensure_openclaw_on_path() {
  local npm_global_bin
  npm_global_bin="$(resolve_npm_global_bin)"
  local installed_bin="${npm_global_bin%/}/openclaw"

  if command -v openclaw >/dev/null 2>&1; then
    return
  fi

  if [ -x "$installed_bin" ]; then
    local shim_target="/usr/local/bin/openclaw"
    if [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
      ln -sf "$installed_bin" "$shim_target"
      log "Created shim: $shim_target -> $installed_bin"
      return
    fi

    local user_bin_dir="$HOME/.local/bin"
    mkdir -p "$user_bin_dir"
    ln -sf "$installed_bin" "$user_bin_dir/openclaw"
    warn "openclaw was installed at $installed_bin but is not on PATH."
    warn "Added shim at $user_bin_dir/openclaw. Add this to your shell profile:"
    warn "  export PATH=\"$user_bin_dir:\$PATH\""
    return
  fi

  warn "openclaw binary not found in npm global bin ($npm_global_bin)."
}


has_build_output() {
  local repo_dir="$1"
  [ -f "$repo_dir/dist/entry.js" ] || [ -f "$repo_dir/dist/entry.mjs" ]
}

prepare_repo_for_install() {
  local repo_dir="$1"
  if has_build_output "$repo_dir"; then
    return
  fi

  log "Build output missing in $repo_dir; running build before install"
  if command -v pnpm >/dev/null 2>&1; then
    (
      cd "$repo_dir"
      pnpm install
      pnpm build
    )
    return
  fi

  warn "pnpm not found; falling back to npm install + npm run build"
  (
    cd "$repo_dir"
    npm install
    npm run build
  )
}

install_repo_tarball() {
  local repo_dir="$1"
  local tmp_pack
  tmp_pack="$(mktemp -d)"
  local tarball
  tarball="$(cd "$repo_dir" && npm pack --silent --pack-destination "$tmp_pack")"
  npm install -g "$tmp_pack/$tarball"
  rm -rf "$tmp_pack"
}

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
  prepare_repo_for_install "$repo_dir"
  install_repo_tarball "$repo_dir"
}

install_from_repo_url() {
  local repo_url="$1"
  local ref="${OPENCLAW_INSTALL_REF:-main}"
  local tmp_repo
  tmp_repo="$(mktemp -d)"
  log "Cloning $repo_url#$ref"
  require_cmd git
  git clone --depth 1 --branch "$ref" "$repo_url" "$tmp_repo"
  prepare_repo_for_install "$tmp_repo"
  install_repo_tarball "$tmp_repo"
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

ensure_openclaw_on_path

log 'Installation complete.'
log "Memory/session state preserved at: $STATE_DIR"
