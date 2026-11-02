#!/bin/zsh
set -eu
setopt null_glob
ROOT="${0:A:h:h}"
CANDIDATES=("$(command -v node || true)" /opt/homebrew/bin/node /usr/local/bin/node "$HOME"/.nvm/versions/node/*/bin/node)
for NODE_BIN in "${CANDIDATES[@]}"; do
  if [[ -x "$NODE_BIN" ]] && "$NODE_BIN" -e 'process.exit(Number(process.versions.node.split(".")[0])>=22?0:1)' 2>/dev/null; then
    exec "$NODE_BIN" "$ROOT/src/cli.mjs" "$@"
  fi
done
print 'Node.js 22+ is required. / 请先安装 Node.js 22 或以上。'
exit 1
