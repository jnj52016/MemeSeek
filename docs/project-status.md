# MemeSeek 当前项目状态

## 一、当前阶段

目前已经完成前端 Mock MVP、Prisma Schema、首次数据库迁移、NestJS Prisma 数据库服务接入、Meme CRUD 接口、Swagger 文档、前端 OpenAPI Client 和列表真实联调，下一阶段进入图片上传。

当前下一步：

```text
Prisma Schema 和数据库迁移已完成
  ↓
PrismaModule 和 PrismaService 已完成
  ↓
下一步：接通图片上传流程
```

## 二、已经完成的内容

### 项目和开发环境

- GitHub 仓库已经建立并连接本地项目。
- 前端项目位于 `client/`。
- 后端项目位于 `server/`。
- 项目使用 pnpm workspace。
- Node.js 版本为 23。
- pnpm 版本为 9.11.0。

### 前端页面

- `/`：梗图列表页。
- `/ai-settings`：DeepSeek AI 设置页。
- 顶部导航和页面布局。
- 梗图搜索，并将关键词同步到 URL 的 `?q=` 参数。
- 梗图列表、卡片和上传入口。
- 梗图详情弹窗。
- 编辑标题、描述和标签。
- 删除梗图和删除确认弹窗。
- 上传抽屉、预览、模拟上传进度和分析中状态。
- 加载 Skeleton。
- 暂无梗图状态。
- 搜索无结果状态。
- AI 分析失败状态。

### 前端数据和文件结构

- `client/src/types/`：TypeScript 类型。
- `client/src/mocks/`：Mock 数据和默认设置。
- `client/public/mock-images/`：Mock 图片资源。
- `client/src/services/`：本地设置存储和未来的 API 服务。
- `client/src/features/memes/components/`：梗图业务组件。

### 数据库环境

- 已创建根目录 `docker-compose.yml`。
- 已启动 `memeseek-postgres` 容器。
- PostgreSQL 使用 `localhost:5432`。
- 容器健康状态为 `healthy`。
- 数据保存在 Docker Volume `memeseek_postgres_data`。

## 三、重要技术决定

### 关于项目部署

项目暂时定位为个人本地工具，优先使用 Docker 在本地运行，不急着部署到公网。

### 关于 API Key

当前 AI 设置页允许用户在前端输入和更换 DeepSeek API Key，并保存到浏览器 `localStorage`。

这是为了方便个人本地使用。以后如果公开部署给其他人，需要改为后端保存和调用 API Key。

### 关于默认提示词

前端不提供分析提示词编辑功能。默认提示词以后固定写在后端 AI Service 中。

### 关于数据来源

当前页面使用 Mock 数据：

```ts
const [memes, setMemes] = useState<Meme[]>(mockMemes)
```

后端 CRUD 完成后，改为使用 TanStack Query 请求真实数据。

### 关于 AI 请求

第一版 AI 分析优先使用非流式请求，因为需要等待完整 JSON 后保存标题、描述、标签和 OCR 文字。

流式请求留到以后做自然语言搜索或长文本展示。

## 四、当前未完成的内容

- 前后端真实联调。
- DeepSeek 后端调用。
- 真实图片保存。
- 测试。

## 五、下一步操作记录

### 已完成：Meme CRUD、Swagger、前端 API Client 和列表联调

已完成 `MemesModule`、Controller、Service、DTO 和全局请求校验，并实现：

```text
POST   /memes
GET    /memes
GET    /memes/:id
PATCH  /memes/:id
DELETE /memes/:id
```

`GET /memes` 当前支持关键词搜索、状态筛选和分页，JSON CRUD 已通过构建、测试和数据库接口冒烟验证。

Swagger UI 地址为 `/docs`，OpenAPI JSON 地址为 `/docs-json`。

前端类型生成文件为 `client/src/api/generated.ts`，统一 API Client 为 `client/src/services/api-client.ts`。

### 下一步：图片上传

接通 `POST /memes` 的 multipart 文件上传，保存图片并将新记录刷新到 TanStack Query 列表。

## 六、新对话开始时使用的提示词

```text
这是 MemeSeek 项目，请先阅读：

1. docs/project-plan.md
2. docs/project-status.md
3. docs/project-architecture-guide.md

然后检查当前项目的 git status。
请根据 project-status.md 的“下一步操作记录”继续开发。
先不要修改代码，先告诉我准备做什么。
```

## 七、更新规则

每完成一个阶段后，更新本文件：

1. 把完成的任务从 `[ ]` 改为 `[x]`。
2. 修改“当前阶段”。
3. 更新“当前未完成的内容”。
4. 写清楚下一步具体要做什么。
5. 如果改变技术方案，在“重要技术决定”中记录原因。
