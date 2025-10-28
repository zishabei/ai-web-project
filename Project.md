ai-web-project/
├── backend/          # 🔹 后端服务（FastAPI）
├── frontend/         # 🔹 前端应用（React + Vite + TypeScript + Tailwind）
├── infra/            # 🔹 基础设施（Docker Compose，Postgres/Redis/Milvus）
├── .env              # 🔹 全局环境变量配置
├── .env.example      # 🔹 环境变量示例模板
├── README.md         # 🔹 项目文档（启动说明）


backend/
├── app/
│   ├── api/          # 🌐 存放接口定义（FastAPI 路由）
│   │   └── routes.py # → 定义了 /health、/ai/ask 等路由
│   ├── core/         # ⚙️ 系统核心配置（环境变量加载）
│   │   └── config.py # → 从 .env 加载数据库、Redis、OpenAI 等配置
│   ├── db/           # 🗄️ 数据库层（可放 SQLAlchemy 模型）
│   ├── schemas/      # 📦 数据模型（Pydantic 用于入/出参）
│   ├── services/     # 🧠 业务逻辑层
│   │   └── ai.py     # → 调用 OpenAI/Azure OpenAI 接口的逻辑
│   └── main.py       # 🚀 FastAPI 启动入口
│
├── Makefile          # 🧰 一键运行后端服务（make run）
├── pyproject.toml    # 📦 Python 项目配置（uv 自动生成）
├── uv.lock           # 🔒 uv 的依赖锁文件（等价于 requirements.txt）
├── .python-version   # 指定 Python 版本（3.11）
├── .gitignore        # 忽略虚拟环境与临时文件
└── README.md         # 后端说明（由脚本自动生成）


frontend/
├── src/
│   ├── api.ts        # 🌐 封装与后端交互的 fetch 函数
│   ├── App.tsx       # 🧠 主页面组件（输入 prompt → 调 AI → 输出结果）
│   ├── main.tsx      # ⚙️ React 入口文件（渲染根组件）
│   └── index.css     # 🎨 TailwindCSS 样式入口
│
├── index.html        # 页面模板文件（Vite 构建入口）
├── .env.local        # 环境变量（如 VITE_API_BASE=http://localhost:8000）
├── vite.config.ts    # Vite 构建配置（启用 React + Tailwind 插件）
├── tsconfig.json     # TypeScript 编译选项
├── package.json      # 项目依赖配置（使用 pnpm 管理）
└── pnpm-lock.yaml    # 依赖锁文件（固定版本）

React/Vite (Frontend)
   ↓ fetch API
FastAPI (Backend)
   ↓
PostgreSQL / Redis / Milvus
   ↓
OpenAI GPT-5 / Azure OpenAI


| 层级       | 主要技术栈                                   | 职责说明                                |
| -------- | --------------------------------------- | ----------------------------------- |
| **前端层**  | React + TypeScript + Vite + TailwindCSS | 提供教师/管理员操作界面，向后端发起 API 请求并渲染 AI 响应。 |
| **后端层**  | FastAPI + SQLAlchemy + Redis + uv       | 提供 RESTful 接口、处理业务逻辑、管理数据库与向量检索。    |
| **AI 层** | OpenAI GPT-5 / Azure OpenAI             | 负责自然语言理解与文本生成。                      |
| **数据层**  | PostgreSQL + Milvus + Redis             | 结构化数据存储、向量化搜索、缓存与任务队列。              |
| **基础设施** | Docker Compose                          | 统一启动所有依赖服务，实现一键部署。                  |

