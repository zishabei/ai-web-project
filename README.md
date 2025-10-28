# AI Web 项目
## 启动顺序
1) Docker 基础服务（脚本已启动，如需重启）：
   docker compose --env-file .env -f infra/docker-compose.yml up -d

2) 后端（开发）：
   cd backend
   make run
   # 健康检查: http://localhost:8000/health

3) 前端（开发）：
   cd frontend
   pnpm dev
   # 访问: 终端提示地址（通常 http://localhost:5173）

> 使用 OpenAI 需在 backend/.env 或 项目根 .env 中配置 OPENAI_API_KEY
