#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
INFRA_DIR="$ROOT/infra/min-prod"
CADDY_CONT="aiweb-caddy"

# 小函数
in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
find_free_port() {
  local start=${1:-8000}
  local end=${2:-8100}
  for p in $(seq "$start" "$end"); do
    if ! in_use "$p"; then echo "$p"; return 0; fi
  done
  return 1
}

# 自动选择端口
BACK_PORT="${BACK_PORT:-$(find_free_port 8000 8010)}"
FRONT_PORT="${FRONT_PORT:-$(find_free_port 8080 8090)}"
echo "后端端口: $BACK_PORT"
echo "前端端口: $FRONT_PORT"

# -------------------- 启动后端 --------------------
pushd "$BACKEND_DIR" >/dev/null
if in_use "$BACK_PORT"; then
  echo "端口 $BACK_PORT 被占用，尝试清理旧进程…"
  kill -9 $(lsof -t -i:"$BACK_PORT") 2>/dev/null || true
fi
# 监听 0.0.0.0，支持 Docker 内访问
uv run uvicorn app.main:app --host 0.0.0.0 --port "$BACK_PORT" --workers 2 &
BACK_PID=$!
echo "$BACK_PID" > "$ROOT/.backend.pid"
popd >/dev/null

# -------------------- 构建前端 --------------------
pushd "$FRONTEND_DIR" >/dev/null
echo 'VITE_API_BASE=/api' > .env.production
pnpm install
pnpm build
popd >/dev/null

# -------------------- 生成 Caddy 配置 --------------------
mkdir -p "$INFRA_DIR"
cat > "$INFRA_DIR/Caddyfile" <<CADDY
:${FRONT_PORT} {
    @api path /api/*
    handle @api {
        reverse_proxy host.docker.internal:${BACK_PORT}
    }

    handle {
        root * /srv/dist
        try_files {path} /index.html
        file_server
    }
}
CADDY

# -------------------- 启动 Caddy --------------------
docker rm -f "$CADDY_CONT" >/dev/null 2>&1 || true
docker run --name "$CADDY_CONT" -d \
  -p ${FRONT_PORT}:${FRONT_PORT} \
  --add-host host.docker.internal:host-gateway \
  -v "$FRONTEND_DIR/dist:/srv/dist:ro" \
  -v "$INFRA_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2-alpine

# -------------------- 启动 Cloudflare 公网通道 --------------------
echo
echo "✅ 本机已就绪：http://127.0.0.1:${FRONT_PORT}"
echo "🌍 正在开通公网访问（Cloudflare Tunnel）…"
echo

cloudflared tunnel --url "http://127.0.0.1:${FRONT_PORT}"
