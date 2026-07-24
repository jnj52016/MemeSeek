# MemeSeek 开发 TODO

> 这是新对话开始时优先阅读的项目进度文件。
>
> 最后更新：2026-07-24

## 一、当前进度

项目已经完成前端 Mock MVP、后端 CRUD 和前后端列表联调，现在进入图片上传闭环验证阶段。

```text
前端 Mock 页面已完成
        ↓
PostgreSQL Docker 容器已启动
        ↓
Prisma + Meme 数据库模型和首次迁移已完成
        ↓
Prisma Module 和 Prisma Service 已完成
        ↓
图片上传接口、后端本地保存和前端真实上传流程已完成
        ↓
运行环境已验证上传、查询、编辑和删除闭环
        ↓
前端 5 个关键自动化测试已完成
        ↓
下一步：补充后端接口测试和 AI 失败状态测试
```

说明：数据库迁移、Prisma Client 生成、后端构建和 E2E 启动测试均已通过。

## 二、已完成内容

### 项目环境

- [x] GitHub 仓库已创建并连接本地项目。
- [x] Node.js 23 已确认。
- [x] pnpm 9.11.0 已配置。
- [x] `client/` 前端项目已创建。
- [x] `server/` NestJS 后端项目已创建。
- [x] pnpm workspace 已配置。
- [x] 根目录 Git 仓库已配置。

### 前端基础

- [x] React、TypeScript、Vite 已配置。
- [x] Ant Design 已安装。
- [x] Tailwind CSS 4 已配置。
- [x] React Router 已配置。
- [x] TanStack Query Provider 已配置。
- [x] 前端目录结构已整理。
- [x] `Meme`、`MemeStatus`、`AiSettings` 类型已定义。

### 前端页面

- [x] `/` 梗图列表页。
- [x] `/ai-settings` DeepSeek AI 设置页。
- [x] URL 搜索参数 `?q=`。
- [x] 梗图卡片和网格布局。
- [x] 上传梗图抽屉。
- [x] 图片预览和真实上传进度。
- [x] AI 分析中的状态。
- [x] 梗图详情弹窗。
- [x] 编辑标题、描述和标签。
- [x] 删除确认弹窗。
- [x] 加载 Skeleton。
- [x] 暂无梗图状态。
- [x] 搜索无结果状态。
- [x] AI 分析失败状态。
- [x] 图片懒加载。

### Mock 数据和设置

- [x] Mock 梗图数据放在 `client/src/mocks/memes.ts`。
- [x] 默认 AI 设置放在 `client/src/mocks/ai-settings.ts`。
- [x] Mock 图片放在 `client/public/mock-images/`。
- [x] AI 设置保存到浏览器 `localStorage`。
- [x] DeepSeek API Key 可以在前端输入和更换。
- [x] Mock 数据整理文档已创建。

### Docker 数据库环境

- [x] 根目录已创建 `docker-compose.yml`。
- [x] PostgreSQL `postgres:16-alpine` 已启动。
- [x] 容器名称：`memeseek-postgres`。
- [x] 数据库端口：`localhost:5432`。
- [x] 容器状态：`healthy`。
- [x] 数据卷：`memeseek_postgres_data`。

## 三、遗留问题

### 后端数据库

- [x] 创建 `server/.env`。
- [x] 配置 `DATABASE_URL`。
- [x] 安装 `prisma@6` 和 `@prisma/client@6`。
- [x] 完成 Prisma 基础初始化，创建 `server/prisma/schema.prisma`。
- [x] 编写 `server/prisma/schema.prisma`。
- [x] 创建 `MemeStatus` 枚举。
- [x] 创建 `Meme` 数据模型。
- [x] 执行数据库迁移。
- [x] 创建 Prisma Module 和 Prisma Service。

### 后端接口

- [x] 创建 Memes Module。
- [x] 创建 Memes Controller。
- [x] 创建 Memes Service。
- [x] 创建新增、修改和查询 DTO。
- [x] 配置 `class-validator`。
- [x] 实现 `POST /memes`。
- [x] 实现 `GET /memes`。
- [x] 实现 `GET /memes/:id`。
- [x] 实现 `PATCH /memes/:id`。
- [x] 实现 `DELETE /memes/:id`。
- [x] 配置图片本地保存和静态访问。

### Swagger 和前后端联调

- [x] 配置 Swagger。
- [x] 检查请求参数和响应类型。
- [x] 安装 `openapi-typescript`。
- [x] 安装 `openapi-fetch`。
- [x] 生成前端 API 类型。
- [x] 创建统一 API Client。
- [x] 使用 TanStack Query 替换 Mock 列表数据。
- [x] 跑通上传、查询、编辑和删除流程。

### AI 功能

- [ ] 创建后端 AI Module 和 AI Service。
- [ ] 在后端固定默认分析提示词。
- [ ] 接入 DeepSeek API。
- [ ] 确认图片识别方案。
- [ ] 校验 AI 返回的 JSON。
- [ ] 保存标题、描述、标签和 OCR 文字。
- [ ] 处理 AI 分析失败。
- [ ] 实现重新分析接口。

### 测试和项目材料

- [x] 完成至少 5 个有价值的前端测试。
- [x] 测试搜索和 URL 参数。
- [x] 测试上传失败状态。
- [ ] 测试 AI 分析失败状态。
- [x] 测试编辑和删除流程。
- [ ] 完善 README。
- [ ] 添加项目截图、架构图和流程图。
- [ ] 准备项目演示流程。

## 四、重要技术决定

- 项目暂时定位为个人本地工具，优先使用 Docker，不急着部署公网。
- 当前前端使用 Mock 数据，后端 CRUD 完成后再切换真实 API。
- 默认 AI 提示词固定在后端，不在前端编辑。
- 当前个人本地使用时，DeepSeek API Key 保存在浏览器 `localStorage`。
- 如果以后公开部署，API Key 必须改为由后端保存和调用。
- 第一版 AI 分析使用非流式请求，等完整 JSON 后再保存数据库。
- 流式请求以后用于自然语言搜索或长文本生成。
- 当前还需要确认 DeepSeek 使用的模型是否支持图片输入，必要时增加视觉模型。

## 五、当前阶段：自动化测试补充

Meme CRUD、请求 DTO、全局参数校验、Swagger 文档、前端 OpenAPI Client、列表真实联调、图片上传运行验证和 5 个前端自动化测试已完成。

图片上传已接通：后端通过 `POST /memes` 接收 multipart 文件，保存到 `server/uploads/memes/`，并通过 `/uploads/memes/...` 提供静态访问；前端上传成功后会刷新 TanStack Query 列表。

下一步按以下顺序继续：

1. 补充后端上传、编辑、删除和错误响应测试。
2. 补充 AI 分析失败状态测试。
3. 测试通过后，再开始接入 DeepSeek 后端 AI Service。

本阶段仍然先不接 DeepSeek。由于 AI 尚未接入，真实上传创建的 Meme 暂时标记为 `COMPLETED`，接入 AI 后再改为 `PROCESSING` → `COMPLETED/FAILED`。

## 六、新对话启动提示词

复制下面这段给新对话：

```text
这是 MemeSeek 项目，请先阅读根目录的 TODO.md。

然后阅读：
1. docs/project-plan.md
2. docs/project-status.md
3. docs/project-architecture-guide.md

请检查当前项目的 git status，并根据 TODO.md 的“下一步”继续。
当前继续做前端真实联调，不要先接 DeepSeek。
先告诉我准备做什么，等我确认后再执行。
```

## 七、更新规则

每完成一个任务后：

1. 把对应的 `[ ]` 改为 `[x]`。
2. 更新“当前进度”。
3. 删除或修改已经解决的遗留问题。
4. 写清楚下一步具体操作。
5. 如果改变技术方案，记录到“重要技术决定”。
