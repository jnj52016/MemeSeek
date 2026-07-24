# MemeSeek

MemeSeek 是一个面向个人使用的梗图管理工具：把图片集中保存起来，再通过 AI 自动识别标题、描述、标签和图片文字，方便搜索和复用。

## 功能

- 梗图上传：支持点击选择、拖拽上传，以及在上传区域按 `Ctrl+V` 粘贴图片。
- 图片预览、上传进度和上传失败提示。
- 使用 OpenAI 兼容视觉模型分析图片，生成标题、描述、标签和 OCR 文字。
- 分析中的 `PROCESSING`、完成的 `COMPLETED` 和失败的 `FAILED` 状态展示。
- 梗图搜索：按标题、描述、标签或 OCR 文字检索，并同步到 URL 的 `?q=` 参数。
- 梗图详情查看、标题/描述/标签编辑和删除。
- 失败梗图重新分析。
- 分析 AI 与内容 AI 分开配置；API Key 仅保存在当前浏览器的 `localStorage` 中。

## 界面预览

当前版本包含以下主要界面：

1. 梗图列表页：搜索框、上传入口和梗图卡片。
2. 上传抽屉：点击、拖拽或 `Ctrl+V` 粘贴图片，随后预览并开始上传。
3. 梗图详情弹窗：查看 AI 识别结果、编辑信息和重新分析。
4. AI 设置页：分别配置分析 AI、内容 AI、Base URL、模型和推荐标签。

截图来自本地开发环境 `http://localhost:5173`。如果要将截图提交到仓库，建议保存到 `docs/screenshots/`，并使用以下文件名：

```text
docs/screenshots/meme-library.png
docs/screenshots/upload-drawer.png
docs/screenshots/meme-detail.png
docs/screenshots/ai-settings.png
```

> 说明：对话中的截图附件不会自动写入 Git 工作区。将截图保存到上述路径后，即可把对应文件替换为 README 图片链接并提交到仓库。

## 技术栈

### 前端

- React + TypeScript + Vite
- Ant Design
- Tailwind CSS 4
- React Router
- TanStack Query
- Vitest + React Testing Library

### 后端

- NestJS
- Prisma 6
- PostgreSQL 16
- Swagger / OpenAPI
- Docker Compose

### AI

- OpenAI 兼容 Chat Completions 接口
- 支持图片输入的视觉模型
- 非流式请求，等待完整 JSON 后保存分析结果

## 项目结构

```text
MemeSeek/
├─ client/                         # React 前端
│  ├─ src/pages/                   # 列表页、AI 设置页
│  ├─ src/features/memes/          # 梗图业务组件
│  ├─ src/services/                # API Client、本地 AI 设置存储
│  ├─ src/types/                   # TypeScript 类型
│  └─ public/mock-images/          # Mock 图片
├─ server/                         # NestJS 后端
│  ├─ src/memes/                   # Meme CRUD、上传和分析入口
│  ├─ src/ai/                      # AI Service 和视觉分析逻辑
│  ├─ src/storage/                 # 本地图片存储
│  ├─ prisma/                      # Schema 和数据库迁移
│  └─ uploads/memes/               # 本地上传图片
├─ docs/                           # 开发计划、状态和架构文档
├─ docker-compose.yml              # PostgreSQL 本地环境
└─ TODO.md                         # 项目进度和后续任务
```

## 本地运行

### 环境要求

- Node.js 23+
- pnpm 9+
- Docker Desktop

### 安装依赖

```bash
pnpm install
```

### 启动 PostgreSQL

```bash
docker compose up -d
```

默认数据库配置为：

```text
数据库：memeseek
用户：memeseek
密码：memeseek_dev_password
地址：localhost:5432
```

### 配置后端

复制环境变量模板：

```bash
copy server/.env.example server/.env
```

然后根据实际服务商修改 `server/.env` 中的数据库和 AI 默认配置：

```env
DATABASE_URL="postgresql://memeseek:memeseek_dev_password@localhost:5432/memeseek?schema=public"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o"
```

执行数据库迁移：

```bash
pnpm --filter server exec prisma migrate deploy
```

### 启动前后端

```bash
pnpm dev
```

访问：

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- Swagger：http://localhost:3000/docs
- OpenAPI JSON：http://localhost:3000/docs-json

也可以分别启动：

```bash
pnpm --filter client dev
pnpm --filter server start:dev
```

## AI 配置

进入前端的“AI 设置”页面，分别填写：

- 分析 AI：负责图片理解、OCR、标题、描述和标签。
- 内容 AI：为未来的文本改写、自然语言搜索和批量内容生成预留。

每套配置包含 OpenAI 兼容接口地址、API Key 和模型名称。上传或重新分析时只使用分析 AI 配置。

当前项目是个人本地工具，API Key 保存在浏览器 `localStorage`，不会写入数据库。不要把包含真实 API Key 的配置文件或截图提交到 Git；如果未来公开部署，应改为由后端安全保存和调用 API Key，并限制 Base URL 以防 SSRF。

## 上传和分析流程

```text
点击 / 拖拽 / Ctrl+V 粘贴图片
              ↓
前端校验图片类型和 10MB 大小限制
              ↓
预览并点击“开始上传”
              ↓
POST /memes multipart 上传
              ↓
保存到 server/uploads/memes/
              ↓
调用 POST /memes/:id/analyze
              ↓
视觉模型返回 JSON
              ↓
保存标题、描述、标签和 OCR 文字
```

粘贴图片会先进入预览状态，不会因为误粘贴直接调用 AI；用户点击“开始上传”后才提交。

## 主要 API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/memes` | 创建梗图并上传图片 |
| `GET` | `/memes` | 查询、搜索和分页 |
| `GET` | `/memes/:id` | 查看梗图详情 |
| `PATCH` | `/memes/:id` | 编辑标题、描述和标签 |
| `DELETE` | `/memes/:id` | 删除梗图和本地图片 |
| `POST` | `/memes/:id/analyze` | 重新执行 AI 图片分析 |

## 测试和构建

```bash
# 前端测试
pnpm --filter client test

# 前端构建
pnpm --filter client build

# 前端代码检查
pnpm --filter client lint

# 后端单元测试
pnpm --filter server test

# 后端 E2E 测试
pnpm --filter server test:e2e

# 后端构建
pnpm --filter server build
```

## 项目状态

当前已经完成：

- 前后端 Meme CRUD 和图片上传闭环。
- 本地 PostgreSQL、Prisma、Swagger 和前端 OpenAPI Client。
- AI 后端服务、失败处理、重新分析和分析 AI / 内容 AI 配置拆分。
- 文件选择、拖拽和 Ctrl+V 粘贴图片上传。
- 真实 OpenAI 视觉模型端到端验证。

详细进度见 [TODO.md](TODO.md)，开发计划见 [docs/project-plan.md](docs/project-plan.md)，项目状态见 [docs/project-status.md](docs/project-status.md)。

## 安全说明

- 不要提交 `server/.env` 或任何包含真实 API Key 的文件。
- 当前 API Key 的浏览器本地存储方案只适合个人本地使用。
- 公开部署前需要增加登录、后端密钥管理、Base URL 白名单、上传鉴权和更严格的资源访问控制。
