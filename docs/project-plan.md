# MemeSeek 项目开发计划

## 一、项目目标

MemeSeek 是一个个人使用的梗图管理工具，目标是完成一个可以展示前后端能力的全栈项目。

核心功能：

- 上传、查看、编辑和删除梗图。
- 使用 AI 分析梗图标题、描述、标签和图片文字。
- 根据关键词和标签搜索梗图。
- 使用 Docker 在本地运行 PostgreSQL 和后端服务。

## 二、当前技术栈

### 前端

- React
- TypeScript
- Vite
- Ant Design
- Tailwind CSS 4
- React Router
- TanStack Query
- Zustand（有真正的跨页面共享状态时再使用）
- Vitest
- React Testing Library

### 后端

- NestJS
- Prisma 6
- PostgreSQL
- Swagger / OpenAPI
- Docker

### AI

- 当前使用通义千问视觉模型的 OpenAI 兼容 API。
- 默认提示词固定在后端，不在前端编辑。
- 梗图图片识别使用通义千问视觉模型，图片通过 `image_url` 传入。

## 三、开发阶段

### 阶段一：项目初始化

- [x] 创建 GitHub 仓库并连接本地项目。
- [x] 初始化 `client` 前端项目。
- [x] 初始化 `server` NestJS 项目。
- [x] 创建 pnpm workspace。
- [x] 配置根目录 Git 忽略规则和启动脚本。

### 阶段二：前端基础配置

- [x] 配置 React、TypeScript 和 Vite。
- [x] 配置 Ant Design。
- [x] 配置 Tailwind CSS 4。
- [x] 配置 React Router。
- [x] 配置 TanStack Query Provider。
- [x] 整理前端目录结构。
- [x] 定义 `Meme`、`MemeStatus` 和 `AiSettings` 类型。

### 阶段三：前端 Mock 页面

- [x] 梗图列表页。
- [x] 搜索框和 URL 搜索参数。
- [x] 梗图卡片和网格布局。
- [x] 上传梗图抽屉。
- [x] 上传进度和 AI 分析中的状态。
- [x] 梗图详情弹窗。
- [x] 编辑标题、描述和标签。
- [x] 删除确认弹窗。
- [x] AI 设置页面。
- [x] 通义千问 API Key 输入和本地保存。
- [x] Mock 数据和 Mock 图片整理。
- [x] 加载 Skeleton、空状态和搜索无结果状态。
- [x] AI 分析失败状态展示。

### 阶段四：后端数据库初始化

- [x] 创建 `docker-compose.yml`。
- [x] 启动本地 PostgreSQL 容器。
- [x] 在 `server/.env` 中配置数据库连接地址。
- [x] 安装 Prisma 6。
- [x] 初始化 Prisma。
- [x] 编写 `schema.prisma`。
- [x] 创建 `Meme` 数据模型。
- [x] 创建 `MemeStatus` 枚举。
- [x] 执行数据库迁移。
- [x] 创建 Prisma Module 和 Prisma Service。

### 阶段五：后端 CRUD 接口

- [x] 创建 Memes Module。
- [x] 创建 Memes Controller。
- [x] 创建 Memes Service。
- [x] 创建新增、修改和查询 DTO。
- [x] 配置参数验证。
- [x] 实现 `POST /memes`。
- [x] 实现 `GET /memes`。
- [x] 实现 `GET /memes/:id`。
- [x] 实现 `PATCH /memes/:id`。
- [x] 实现 `DELETE /memes/:id`。
- [x] 配置本地图片上传和静态文件访问。

### 阶段六：Swagger 和前后端联调

- [x] 配置 Swagger。
- [x] 检查所有接口的请求和响应类型。
- [x] 安装 `openapi-typescript`。
- [x] 安装 `openapi-fetch`。
- [x] 生成前端 API 类型。
- [x] 创建统一 API Client。
- [x] 使用 TanStack Query 请求真实梗图数据。
- [x] 跑通上传、查询、编辑和删除流程。

### 阶段七：AI 分析

- [x] 创建后端 AI Module 和 AI Service。
- [x] 设计固定的 AI 分析提示词。
- [x] 实现 OpenAI 兼容 Chat Completions 调用。
- [x] 确认图片输入方案：使用通义千问 OpenAI 兼容视觉模型。
- [x] 校验 AI 返回的 JSON。
- [x] 保存标题、描述、标签和 OCR 文字。
- [x] 处理 AI 分析失败。
- [x] 实现重新分析接口。
- [x] 配置通义千问 OpenAI 兼容视觉请求和默认模型。
- [ ] 使用真实通义千问 API Key 完成端到端图片分析。

### 阶段八：测试、优化和材料整理

- [x] 完成至少 5 个有价值的前端测试。
- [x] 测试搜索和 URL 参数。
- [x] 测试上传失败和 AI 失败状态。
- [x] 测试编辑和删除流程。
- [x] 补充后端 Meme API E2E 测试。
- [ ] 优化图片加载和移动端布局。
- [ ] 完善 README。
- [ ] 添加项目截图、架构图和流程图。
- [ ] 准备项目演示流程。

## 四、开发原则

- 先完成一个小功能的完整流程，再继续扩展。
- 页面负责组合，组件负责展示，服务负责通信。
- 服务端数据交给 TanStack Query 管理。
- 简单的局部状态使用 `useState`。
- 不把梗图列表重复保存到 Zustand。
- API Key 不提交到 Git，不写入公开代码。
- Mock 数据只用于前端开发，真实数据由后端和数据库负责。
