# MemeSeek 后端项目结构

## 一、后端定位

MemeSeek 后端使用 NestJS，负责提供 HTTP API、保存梗图数据、管理图片文件，以及调用通义千问视觉模型完成图片分析。

当前后端已经完成 PostgreSQL、Prisma Schema、首次数据库迁移、Meme CRUD 接口、Swagger 文档和前端列表真实联调，下一阶段是图片上传。

后端的核心调用关系如下：

```text
HTTP 请求
   ↓
Controller        处理路由和请求参数
   ↓
DTO / Validation  校验客户端输入
   ↓
Service           执行业务逻辑
   ↓
PrismaService     访问数据库
   ↓
PostgreSQL
```

## 二、当前实际目录

```text
server/
├─ prisma/
│  ├─ schema.prisma              # 数据库模型定义
│  ├─ migrations/                # 已生成的数据库迁移记录
│  │  ├─ migration_lock.toml
│  │  └─ 20260723213215_init/
│  │     └─ migration.sql
│
├─ .env                           # 本地数据库连接，不能提交到 Git
│
├─ src/
│  ├─ main.ts                     # NestJS 启动入口
│  ├─ app.module.ts               # 根模块
│  ├─ prisma/
│  │  ├─ prisma.module.ts         # 全局 Prisma 模块
│  │  └─ prisma.service.ts        # PrismaClient 生命周期管理
│  ├─ app.controller.ts           # 当前示例 Controller
│  ├─ app.service.ts              # 当前示例 Service
│  └─ app.controller.spec.ts      # 当前示例单元测试
│
├─ test/
│  ├─ app.e2e-spec.ts             # 端到端测试
│  └─ jest-e2e.json               # E2E 测试配置
│
├─ package.json                   # 后端脚本和依赖
├─ tsconfig.json                  # TypeScript 配置
├─ nest-cli.json                  # Nest CLI 配置
└─ eslint.config.mjs              # ESLint 配置
```

`app.controller.ts` 和 `app.service.ts` 是 NestJS 初始化时生成的示例文件。开始实现真实业务后，可以保留健康检查，也可以删除示例接口。

## 三、计划中的目标目录

随着后端功能增加，`server/src/` 最终大致整理为：

```text
server/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
│
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  │
│  ├─ prisma/
│  │  ├─ prisma.module.ts         # 提供 PrismaService
│  │  └─ prisma.service.ts        # PrismaClient 生命周期管理
│  │
│  ├─ memes/
│  │  ├─ dto/
│  │  │  ├─ create-meme.dto.ts    # 新增梗图的输入字段
│  │  │  ├─ update-meme.dto.ts    # 修改梗图的输入字段
│  │  │  └─ find-memes.dto.ts     # 搜索和分页参数
│  │  ├─ memes.controller.ts      # /memes 路由
│  │  ├─ memes.service.ts         # 梗图业务逻辑
│  │  └─ memes.module.ts          # 梗图模块
│  │
│  ├─ ai/
│  │  ├─ ai.service.ts            # 视觉 AI 调用和结果解析
│  │  └─ ai.module.ts
│  │
│  ├─ storage/
│  │  ├─ storage.service.ts       # 图片保存和访问地址生成
│  │  └─ storage.module.ts
│  │
│  └─ common/                     # 只有出现共用逻辑后再增加
│     ├─ filters/
│     ├─ interceptors/
│     └─ decorators/
│
├─ uploads/
│  └─ memes/                      # 本地图片文件，不进入数据库
│
└─ test/
   ├─ memes.e2e-spec.ts
   └─ jest-e2e.json
```

## 四、各层的职责

### `main.ts`

启动 NestJS 应用，并配置全局能力，例如：

- 全局前缀，例如 `/api`；
- `ValidationPipe` 请求校验；
- CORS；
- Swagger；
- 全局异常处理。

### `app.module.ts`

根模块只负责组装整个应用：

```text
AppModule
├─ PrismaModule
├─ MemesModule
├─ AiModule
└─ StorageModule
```

不要把所有业务代码都写进 `AppModule`。它只负责导入模块和配置模块之间的组合关系。

### `prisma/`

`PrismaModule` 和 `PrismaService` 是数据库基础设施：

- `PrismaService` 继承 `PrismaClient`；
- 应用启动时连接数据库；
- 应用关闭时断开数据库；
- 其他业务 Service 通过依赖注入使用它；
- 数据库模型和迁移仍然放在 `server/prisma/`，不要放进 `src/prisma/`。

### `memes/`

这是第一批真正的业务模块，负责梗图的增删改查。

- `Controller`：定义 HTTP 路由、状态码和参数来源；
- `DTO`：定义并校验客户端可以提交的字段；
- `Service`：编排查询、创建、修改、删除等业务逻辑；
- `Module`：声明并导出该模块需要的 Provider。

Controller 不直接操作 Prisma，数据库查询统一放到 Service 中。

### `ai/`

负责视觉 AI 相关逻辑：

- 固定默认提示词；
- 组织图片分析请求；
- 校验 AI 返回的 JSON；
- 把标题、描述、标签和 OCR 文本返回给业务层；
- 处理超时、请求失败和格式错误。

AI Service 不应该直接决定 HTTP 响应格式，Controller 仍然负责对外的 API 响应。

### `storage/`

负责图片文件，不负责梗图业务数据：

- 校验文件类型和大小；
- 保存文件到 `uploads/memes/`；
- 生成图片访问地址；
- 后续替换为对象存储时，尽量只修改这一层。

数据库的 `imageUrl` 字段只保存访问地址，不保存图片二进制内容。

## 五、Meme 请求的典型流程

### 第一阶段：先跑通数据库 CRUD

```text
POST /memes
   ↓
CreateMemeDto 校验 imageUrl、title、description、tags
   ↓
MemesService.create()
   ↓
PrismaService.meme.create()
   ↓
返回 Meme 记录
```

第一阶段可以直接提交 `imageUrl`，目的是先验证数据库读写和 API 结构。

### 后续阶段：加入图片上传和 AI 分析

```text
上传图片
   ↓
StorageService 保存文件
   ↓
创建 Meme，status = PROCESSING
   ↓
AiService 调用通义千问视觉模型
   ↓
校验 AI 返回 JSON
   ├─ 成功：保存分析结果，status = COMPLETED
   └─ 失败：保存 errorMessage，status = FAILED
```

第一版 AI 使用非流式请求，等完整 JSON 返回后再写入数据库。

## 六、Meme API 的初步边界

```text
POST   /memes        创建梗图
GET    /memes        查询梗图，可按关键词搜索
GET    /memes/:id    查询单个梗图
PATCH  /memes/:id    修改标题、描述和标签
DELETE /memes/:id    删除梗图
```

建议 `GET /memes` 第一版支持搜索 `title`、`description` 和 `ocrText`，并按 `createdAt` 倒序返回。

`status`、`createdAt` 和 `updatedAt` 由后端管理，不允许客户端在普通创建或编辑请求中随意提交。

## 七、推荐开发顺序

1. 创建 `PrismaModule` 和 `PrismaService`。
2. 在 `main.ts` 配置全局 `ValidationPipe`。
3. 创建 `MemesModule`、Controller 和 Service。
4. 创建 Meme 的三个 DTO，并实现五个 CRUD 接口。
5. 用 Prisma Studio 或 HTTP 请求验证数据库读写。
6. 添加 Swagger，固定请求和响应结构。
7. 创建 `StorageModule`，接入真实图片上传。
8. 创建 `AiModule`，接入通义千问视觉模型和分析状态更新。
9. 最后把前端 Mock 数据切换为真实 API。

这个顺序可以让每个阶段都有一条可验证的最小链路：先确认数据库，再确认 API，最后接入图片和 AI。
