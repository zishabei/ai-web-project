#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# 停止 Caddy 容器
docker stop aiweb-caddy 2>/dev/null || true

# 停止后端
if [[ -f "$ROOT/.backend.pid" ]]; then
  kill -9 "$(cat "$ROOT/.backend.pid")" 2>/dev/null || true
  rm -f "$ROOT/.backend.pid"
fi

echo "✅ 所有服务已停止（后端 + Caddy）。"
echo "如运行过 Cloudflare Tunnel，请手动 Ctrl+C 关闭其窗口。"
