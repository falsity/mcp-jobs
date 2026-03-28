#!/bin/bash
# Start MCP jobs HTTP server. Edit port/host below or set MCP_JOBS_PORT, MCP_JOBS_HOST.
# Run from uni-agent: ./mcp-jobs/start.sh
# Or from here: ./start.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Optional: set port and host (defaults used by server:http if not set)
# export MCP_JOBS_PORT=6000
# export MCP_JOBS_HOST=0.0.0.0

if [ ! -f "dist/mcp-http-simple.js" ] && [ ! -f "dist/mcp-http.js" ]; then
  echo "[MCP] Building..."
  pnpm install && pnpm run build
fi

pnpm run server:http
