# MemeSeek 开发 TODO

> 这是新对话开始时优先阅读的项目进度文件。
>
> 最后更新：2026-07-24

## 一、当前进度

项目已经完成前端 Mock MVP、后端 CRUD、图片上传闭环、AI 后端服务接入以及分析 AI / 内容 AI 配置拆分，现在进入 OpenAI 真实视觉模型验证阶段。

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
后端接口测试和 AI 失败状态测试已完成
        ↓
上传区域 Ctrl+V 图片粘贴代码和前端测试已补充
        ↓
真实 OpenAI 视觉模型端到端验证已完成
        ↓
下一步：运行完整自动化测试和构建，并整理项目材料
```

说明：数据库迁移、Prisma Client 生成、后端构建和 E2E 启动测试此前均已通过；本次 AI 配置拆分后的测试和构建仍待重新运行。

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
- [x] `/ai-settings` OpenAI AI 设置页（默认 OpenAI 视觉模型）。
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
- [x] AI API Key 可以在前端输入和更换。
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

- [x] 创建后端 AI Module 和 AI Service。
- [x] 在后端固定默认分析提示词。
- [x] 实现 OpenAI 兼容 Chat Completions 调用。
- [x] 确认图片识别方案：使用 OpenAI 视觉模型和 Chat Completions 接口。
- [x] 校验 AI 返回的 JSON。
- [x] 保存标题、描述、标签和 OCR 文字。
- [x] 处理 AI 分析失败。
- [x] 实现重新分析接口。
- [x] 使用真实 OpenAI API Key 完成端到端图片分析验证。

### 图片剪贴板粘贴上传

目标是在现有上传抽屉中支持用户复制图片后按 `Ctrl+V` 粘贴，并继续使用现有的图片上传、进度展示和 AI 分析流程。

- [x] 在 `MemeUploadDrawer` 的上传区域监听 `paste` 事件，仅在上传抽屉打开且未处于上传完成/处理中时处理粘贴。
- [x] 从 `ClipboardEvent.clipboardData.items` 中查找 `image/*` 项，通过 `getAsFile()` 读取剪贴板图片；不依赖 `navigator.clipboard.read()`，避免额外的剪贴板权限和浏览器兼容问题。
- [x] 为剪贴板生成没有真实文件名的图片补充文件名（例如 `pasted-image-<timestamp>.png`），转换成标准 `File` 后复用现有的类型校验、10MB 大小校验、预览和清除逻辑。
- [x] 粘贴文字或剪贴板中没有图片时给出明确提示，不覆盖当前已选择的图片；重复粘贴图片时更新当前选择和预览。
- [x] 复用现有 `memesApi.upload(File)`、上传进度、失败重试和分析 AI 调用，不新增后端接口；默认仍由用户点击“开始上传”后提交，避免误粘贴直接产生 AI 请求。
- [x] 更新上传区域文案和可访问性提示，明确支持“点击、拖拽或 Ctrl+V 粘贴图片”。
- [x] 补充前端测试：粘贴图片成功、粘贴非图片提示、超过 10MB 拒绝、粘贴后仍可预览/清除/上传，以及上传后仍触发分析 AI。
- [x] 完成浏览器手动验证，确认 Ctrl+V 粘贴、拖拽和点击选择上传均正常。
- [x] 补充剪贴板无图片或读取失败时的降级提示，并确认点击选择和拖拽上传不受影响。

### AI 配置拆分计划

目标是把当前单一的 `AiSettings` 拆分成两类配置，避免视觉识别模型和后续文本生成模型混在一起：

- [x] 将 `AiSettings` 类型拆分为 `analysis` 和 `content` 两套配置，至少分别保存 `apiKey` 和 `model`。
- [x] 更新 `defaultAiSettings`：分析 AI 默认使用 `gpt-4o`，内容 AI 默认使用 `gpt-4o-mini`。
- [x] 更新 `localStorage` 存储结构，继续使用 `memeseek-ai-settings`，内部改为 `{ analysis, content, ... }`。
- [x] 增加旧配置迁移：将旧版本顶层的 `apiKey`、`model` 自动迁移到 `analysis`，避免已有用户重新填写配置。
- [x] 改造 `/ai-settings` 页面，使用两个配置卡片：分析 AI、内容 AI。
- [x] 在两套配置中增加 OpenAI 兼容接口的 Base URL 输入，并默认使用 `https://api.openai.com/v1`。
- [x] 分析 AI 配置保留视觉模型说明、API Key 和推荐标签；内容 AI 配置预留文本模型和 API Key。
- [x] 增加“内容 AI 使用与分析 AI 相同配置”选项，减少同一服务商下的重复填写。
- [x] 修改上传、列表自动分析和详情重新分析流程，只读取 `analysis` 配置。
- [x] 为未来的文案改写、自然语言搜索和批量内容生成预留 `content` 配置读取入口；当前没有内容生成接口时不触发内容 AI 调用。
- [x] 明确接口边界：现有 `POST /memes/:id/analyze` 只属于分析 AI；内容 AI 将来使用独立的内容生成接口。
- [x] 两套配置各自保存 OpenAI 兼容接口的 `baseUrl`；后端 `AI_BASE_URL` 作为未填写地址时的默认兜底。

### 测试和项目材料

- [x] 完成至少 5 个有价值的前端测试。
- [x] 测试搜索和 URL 参数。
- [x] 测试上传失败状态。
- [x] 测试 AI 分析失败状态。
- [x] 完成后端 Meme API E2E 测试，覆盖上传、查询、编辑、删除、静态文件和错误响应。
- [x] 测试编辑和删除流程。
- [x] 测试分析 AI / 内容 AI 两套配置的保存和读取。
- [x] 测试旧版单一 AI 配置迁移到分析 AI 配置。
- [ ] 测试上传自动分析、详情重新分析只使用分析 AI 配置。
- [x] 完善 README。
- [ ] 添加并提交项目截图。
- [x] 在 README 中补充架构图和上传流程说明。
- [x] 准备项目演示流程，见 `docs/demo-flow.md`。

## 四、重要技术决定

- 项目暂时定位为个人本地工具，优先使用 Docker，不急着部署公网。
- 当前前端使用 Mock 数据，后端 CRUD 完成后再切换真实 API。
- 默认 AI 提示词固定在后端，不在前端编辑。
- 当前个人本地使用时，OpenAI API Key 保存在浏览器 `localStorage`。
- 如果以后公开部署，API Key 必须改为由后端保存和调用。
- 第一版 AI 分析使用非流式请求，等完整 JSON 后再保存数据库。
- 流式请求以后用于自然语言搜索或长文本生成。
- 当前统一使用 OpenAI：后端通过 `AI_BASE_URL` 调用 OpenAI Chat Completions 接口，并发送 `image_url` 图片输入；默认地址为 `https://api.openai.com/v1`。
- API Key 继续由浏览器保存，并通过 `x-ai-api-key` 请求头临时发送给后端，不保存到数据库。
- AI 设置拆分为分析 AI 和内容 AI：分析 AI 负责图片理解、OCR、标题、描述和标签生成；内容 AI 负责未来的文本改写、自然语言搜索和其他内容生成。
- 当前上传和重新分析流程只使用分析 AI；内容 AI 先完成配置结构，不在尚未实现内容功能时提前调用。
- 两套配置各自保存 OpenAI 兼容接口地址、模型和 API Key；分析请求把地址和模型传给后端，后端 `AI_BASE_URL` 仅作为兜底。当前项目定位为本地工具，公开部署时需要增加 Base URL 白名单以防 SSRF。

## 五、当前阶段：验证 OpenAI 视觉接口

Meme CRUD、请求 DTO、全局参数校验、Swagger 文档、前端 OpenAPI Client、列表真实联调、图片上传运行验证、后端接口 E2E 测试、AI Module/Service 和前端分析 AI 调用流程已完成。

前端原有的单一 AI 设置已经拆分为分析 AI 和内容 AI。分析 AI 用于当前图片分析闭环；内容 AI 用于后续文本改写、自然语言搜索和批量内容生成，目前只建立配置结构，不提前实现未确定的业务接口。

图片上传已接通：后端通过 `POST /memes` 接收 multipart 文件，保存到 `server/uploads/memes/`，并通过 `/uploads/memes/...` 提供静态访问；前端上传成功后会刷新 TanStack Query 列表。当前已补充复制到系统剪贴板的图片在上传抽屉中直接粘贴，并复用同一条上传和 AI 分析链路。

本次已在上传抽屉中加入 Ctrl+V 图片粘贴：剪贴板图片会被转换为标准 `File`，复用现有大小校验、预览、上传进度和分析 AI 流程；后端无需新增接口。浏览器手动验证已通过；对应前端自动化测试已补充，但当前环境缺少 `node` / `pnpm`，尚未执行。

真实 OpenAI 视觉模型端到端验证已完成，已确认上传图片可以进入分析流程并返回识别结果。

本阶段已完成以下验证：

- 后端 E2E 测试覆盖上传、查询筛选、编辑、删除、静态图片访问、参数校验和 404 响应。
- AI Service 单元测试覆盖成功 JSON 解析和失败状态持久化。
- AI 分析接口 E2E 测试覆盖未配置视觉代理时的 `FAILED` 状态。
- 真实 OpenAI 视觉模型端到端验证已完成，确认图片分析和结果写入流程正常。
- 前端测试覆盖上传后 AI 分析、重新分析入口、失败状态及错误信息展示。
- 配置拆分后的测试和前后端生产构建需要重新运行；当前环境缺少 `node` / `pnpm`，尚未完成本次改动后的自动化验证。

下一步：

1. 在有 Node.js / pnpm 的环境中运行前端测试、前端构建、后端测试和后端构建。
2. 检查标题、描述、标签和 OCR 是否正确写入数据库，并补充自动化断言。
3. 测试上传自动分析、详情重新分析只使用分析 AI 配置。
4. 将界面截图保存到 `docs/screenshots/`，并在 README 中展示。

有 API Key 时，前端上传成功后会自动调用分析接口；没有 API Key 时保留 `COMPLETED`，可以在详情弹窗中配置 Key 后重新分析。

## 六、新对话启动提示词

复制下面这段给新对话：

```text
这是 MemeSeek 项目，请先阅读根目录的 TODO.md。

然后阅读：
1. docs/project-plan.md
2. docs/project-status.md
3. docs/project-architecture-guide.md

请检查当前项目的 git status，并根据 TODO.md 的“下一步”继续。
当前 AI 后端服务、分析 AI / 内容 AI 配置拆分、Ctrl+V 图片粘贴上传和真实视觉模型验证均已完成；下一步是运行自动化测试和构建，并补充项目截图；先告诉我准备做什么，等我确认后再执行。
先告诉我准备做什么，等我确认后再执行。
```

## 七、更新规则

每完成一个任务后：

1. 把对应的 `[ ]` 改为 `[x]`。
2. 更新“当前进度”。
3. 删除或修改已经解决的遗留问题。
4. 写清楚下一步具体操作。
5. 如果改变技术方案，记录到“重要技术决定”。
