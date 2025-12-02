ai-web-project/
├── backend/          # 🔹 后端服务（FastAPI）
├── frontend/         # 🔹 前端应用（React + Vite + TypeScript + Tailwind）
├── infra/            # 🔹 Caddy/脚本等基础设施
├── start_public.sh   # 🔹 本机一键部署脚本（Caddy + Cloudflare Tunnel）
├── stop_public.sh    # 🔹 公网服务关闭脚本
├── .env/.env.example # 🔹 环境变量配置与示例
├── README.md         # 🔹 运行文档
└── Project.md        # 🔹 项目结构说明


backend/
├── app/
│   ├── api/          # 🌐 FastAPI 路由（挂在 /api 前缀）
│   │   └── routes.py # → /api/health、/api/ai/ask、/api/kb/... 等接口
│   ├── core/         # ⚙️ 配置管理（.env → Pydantic Settings）
│   │   └── config.py # → OPENAI_API_KEY、OPENAI_VECTOR_STORE_ID 等
│   ├── services/     # 🧠 AI 与知识库逻辑
│   │   └── ai.py     # → 调用 OpenAI / 上传文档至向量库
│   ├── db/           # 🗄️ 数据层占位（可扩展 SQLAlchemy）
│   ├── schemas/      # 📦 Pydantic 数据模型
│   └── main.py       # 🚀 FastAPI 入口
│
├── pyproject.toml    # 📦 Python 依赖（uv 管理）
├── uv.lock           # 🔒 依赖锁
├── Makefile          # 🧰 `make run` 运行后端
└── README.md         # 后端说明


frontend/
├── src/
│   ├── App.tsx       # 🧠 Chat UI + 知识库上传入口
│   ├── api.ts        # 🌐 fetch 封装（默认请求 `/api/...`）
│   ├── main.tsx      # ⚙️ React 入口
│   └── index.css     # 🎨 Tailwind 样式
│
├── index.html        # Vite 模板
├── vite.config.ts    # 构建配置
├── tsconfig.json     # TypeScript 配置
├── package.json      # pnpm 脚本（dev/build）
├── pnpm-lock.yaml    # 依赖锁
├── .env.development.local  # 本地 API（http://localhost:8000/api）
└── .env.local        # 公共变量（向量库 ID 等）


infra/
├── min-prod/
│   └── Caddyfile     # 🧾 由脚本生成：/api → FastAPI，其余静态资源


运行流程（摘要）
1. **本地调试**：`pnpm dev` + `uvicorn app.main:app`，确保前端 `.env.development.local` 指向 `http://localhost:8000/api`。
2. **知识库**：在 `.env` 配置 `OPENAI_VECTOR_STORE_ID`，前端按钮上传文件 → `/api/kb/vector-stores/{id}/files` → OpenAI Vector Store。
3. **聊天**：`/api/ai/ask` 按消息历史调用 OpenAI；有向量库时自动检索，否则回退普通 Chat Completions。
4. **公网体验**：执行 `./start_public.sh` → 构建前端、启动 Caddy、开启 Cloudflare Quick Tunnel，生成 `https://***.trycloudflare.com` 对外访问；`./stop_public.sh` 回收。

技术栈示意
React / Vite (Frontend)
   ↓ `/api`
FastAPI (Backend)
   ↓ OpenAI API + Vector Store
   ↓（可扩展 Postgres / Redis / Milvus）
