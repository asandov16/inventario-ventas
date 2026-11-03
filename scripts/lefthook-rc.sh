# Sourced by lefthook before every hook (see `rc` in lefthook.yml).
# Git hooks do not inherit the interactive shell's `nvm use`, so activate the
# Node version from .nvmrc here when nvm is available.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent >/dev/null 2>&1 || true
fi
