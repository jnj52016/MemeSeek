# MemeSeek 后端开发指南

这份文档是 MemeSeek 后端的执行手册。目标不是一次性把所有功能写完，而是按照从简单到复杂的顺序，逐步完成一条可以运行、可以验证的完整链路。

当前项目状态：

- 前端 Mock MVP 已完成。
- `server/` 是刚初始化的 NestJS 项目。
- PostgreSQL Docker 容器已经启动，地址是 `localhost:5432`。
- Prisma、数据库 Schema、CRUD 接口和图片上传还没有完成。

当前阶段只做数据库和基础后端，不要先接 DeepSeek，也不要先改前端页面。

## 一、先理解后端每一层做什么

一个请求应该按照这条路径流动：

```text
浏览器
  ↓ HTTP 请求
Controller
  ↓ 接收参数
DTO / ValidationPipe
  ↓ 检查参数
Service
  ↓ 处理业务规则
Prisma
  ↓ 执行数据库操作
PostgreSQL
```

各层职责如下：

| 层 | 负责什么 | 不负责什么 |
|---|---|---|
| Controller | 定义 URL、HTTP 方法和参数入口 | 不直接写数据库查询 |
| DTO | 描述和验证请求数据 | 不处理业务逻辑 |
| Service | 编写业务规则、组织数据库操作 | 不负责返回 HTML 页面 |
| Prisma Service | 连接 Prisma Client | 不决定业务流程 |
| PostgreSQL | 持久化数据 | 不理解前端页面 |
| Module | 组织相关的 Controller、Service 和依赖 | 不承载具体业务逻辑 |

例如“删除梗图”的完整过程是：

```text
DELETE /memes/:id
  → MemesController.remove(id)
  → MemesService.remove(id)
  → prisma.meme.delete({ where: { id } })
  → PostgreSQL 删除记录
```

记住一句话：

> Controller 接请求，DTO 查参数，Service 做业务，Prisma 操作数据库。

## 二、后端开发顺序

按下面的顺序做，每完成一段就运行检查命令：

```text
1. 配置数据库环境变量
      ↓
2. 安装并初始化 Prisma
      ↓
3. 编写 Meme 数据模型
      ↓
4. 执行数据库迁移
      ↓
5. 创建 PrismaModule 和 PrismaService
      ↓
6. 创建 MemesModule、Controller、Service
      ↓
7. 添加 DTO 和参数校验
      ↓
8. 完成 Meme CRUD
      ↓
9. 添加本地图片保存和静态访问
      ↓
10. 添加 Swagger
      ↓
11. 用真实 API 替换前端 Mock
      ↓
12. 最后接入 AI 分析
```

不要在数据库还不能保存数据时先开发 AI。否则遇到问题时，很难判断是上传、数据库、接口还是 AI 请求出了错。

## 三、第一阶段：配置数据库和 Prisma

### 1. 确认 PostgreSQL 容器

在项目根目录执行：

```powershell
docker compose ps
```

应该能看到 `memeseek-postgres`，状态为 `healthy`。如果容器没有启动：

```powershell
docker compose up -d
```

### 2. 创建 `server/.env`

文件内容：

```env
DATABASE_URL="postgresql://memeseek:memeseek_dev_password@localhost:5432/memeseek?schema=public"
```

`.env` 只放在本地，不要提交 API Key 或其他秘密配置到 Git。确认 `.gitignore` 已经忽略 `server/.env`。

### 3. 安装 Prisma 6

在项目根目录执行：

```powershell
pnpm --filter server add @prisma/client@6
pnpm --filter server add -D prisma@6
```

### 4. 初始化 Prisma

```powershell
cd server
pnpm exec prisma init
```

初始化后应该有：

```text
server/
├─ prisma/
│  └─ schema.prisma
└─ .env
```

如果 Prisma 自动生成了 `server/.env`，把其中的 `DATABASE_URL` 改成上面的本地 PostgreSQL 地址。

## 四、第二阶段：设计 Meme 数据表

前端已经定义了 `Meme` 类型，后端数据库需要保存这些字段：

| 字段 | 类型 | 用途 |
|---|---|---|
| `id` | `String` | 梗图唯一 ID |
| `imageUrl` | `String` | 图片访问地址 |
| `title` | `String` | 标题 |
| `description` | `String` | 描述 |
| `tags` | `String[]` | 标签列表 |
| `ocrText` | `String` | AI 识别出的文字 |
| `status` | 枚举 | `PROCESSING`、`COMPLETED` 或 `FAILED` |
| `errorMessage` | 可空字符串 | AI 失败时的错误信息 |
| `createdAt` | `DateTime` | 创建时间 |
| `updatedAt` | `DateTime` | 修改时间 |

编辑 `server/prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum MemeStatus {
  PROCESSING
  COMPLETED
  FAILED
}

model Meme {
  id           String     @id @default(cuid())
  imageUrl     String
  title        String     @default("")
  description  String     @default("")
  tags         String[]   @default([])
  ocrText      String     @default("")
  status       MemeStatus @default(PROCESSING)
  errorMessage String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([status])
  @@index([createdAt])
}
```

这里的设计有几个原因：

- `cuid()` 适合本地项目，不需要前端生成 ID。
- `tags String[]` 使用 PostgreSQL 数组，第一版不需要额外的标签表。
- 新上传的梗图先是 `PROCESSING`，AI 完成后改为 `COMPLETED`，失败时改为 `FAILED`。
- `imageUrl` 只保存访问地址，不把图片二进制塞进数据库。

### 迁移数据库

```powershell
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
```

迁移成功后，可以用 Prisma Studio 查看数据：

```powershell
pnpm exec prisma studio
```

验收标准：

- `server/prisma/migrations/` 出现迁移目录。
- Prisma Studio 能打开 `Meme` 表。
- `pnpm --filter server build` 能通过。

## 五、第三阶段：创建 Prisma Module

先生成目录：

```powershell
nest g module prisma
```

创建 `server/src/prisma/prisma.service.ts`：

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

编辑 `server/src/prisma/prisma.module.ts`：

```ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

在 `server/src/app.module.ts` 导入 `PrismaModule`。加上 `@Global()` 后，其他业务模块可以直接注入 `PrismaService`。

## 六、第四阶段：配置请求校验

安装校验依赖：

```powershell
pnpm --filter server add class-validator class-transformer
```

在 `server/src/main.ts` 中启用全局校验：

```ts
import { ValidationPipe } from '@nestjs/common'

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
```

三个配置的作用：

- `whitelist`：删除 DTO 没有声明的字段。
- `forbidNonWhitelisted`：发现多余字段时直接报错，避免客户端偷偷传入不该修改的字段。
- `transform`：把查询参数中的字符串转换成 DTO 声明的数字等类型。

## 七、第五阶段：创建 Memes 模块和 CRUD

### 1. 生成模块文件

在 `server/` 目录执行：

```powershell
nest g module memes
nest g controller memes
nest g service memes
```

最终目录可以是：

```text
server/src/
├─ prisma/
│  ├─ prisma.module.ts
│  └─ prisma.service.ts
├─ memes/
│  ├─ dto/
│  │  ├─ create-meme.dto.ts
│  │  ├─ update-meme.dto.ts
│  │  └─ find-memes.dto.ts
│  ├─ memes.controller.ts
│  ├─ memes.service.ts
│  └─ memes.module.ts
├─ app.module.ts
└─ main.ts
```

### 2. DTO 只描述客户端可以提交的字段

`create-meme.dto.ts` 的第一版可以这样写：

```ts
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateMemeDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
```

`status`、`createdAt` 和 `updatedAt` 不应该让普通客户端随意提交，它们由后端管理。`update-meme.dto.ts` 可以使用 `PartialType(CreateMemeDto)`，表示编辑时所有字段都是可选的。

### 3. Controller 只负责路由和参数

接口建议固定为：

```text
POST   /memes       新增梗图
GET    /memes       查询梗图列表
GET    /memes/:id   查询单个梗图
PATCH  /memes/:id   修改梗图文字信息
DELETE /memes/:id   删除梗图
```

Controller 的结构可以是：

```ts
@Controller('memes')
export class MemesController {
  constructor(private readonly memesService: MemesService) {}

  @Post()
  create(@Body() dto: CreateMemeDto) {
    return this.memesService.create(dto)
  }

  @Get()
  findAll(@Query() query: FindMemesDto) {
    return this.memesService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memesService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemeDto) {
    return this.memesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.memesService.remove(id)
  }
}
```

### 4. Service 负责数据库和业务规则

Service 中注入 `PrismaService`：

```ts
@Injectable()
export class MemesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMemeDto) {
    return this.prisma.meme.create({ data: dto })
  }

  findOne(id: string) {
    return this.prisma.meme.findUniqueOrThrow({ where: { id } })
  }

  update(id: string, dto: UpdateMemeDto) {
    return this.prisma.meme.update({ where: { id }, data: dto })
  }

  remove(id: string) {
    return this.prisma.meme.delete({ where: { id } })
  }
}
```

`findAll` 需要支持搜索。第一版可以搜索 `title`、`description` 和 `ocrText`，并按 `createdAt` 倒序返回。建议返回统一结构，而不是只返回数组：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

这样以后增加分页时，不需要改变接口整体结构。

### 5. 先用 HTTP 工具验证 CRUD

启动后端：

```powershell
pnpm --filter server start:dev
```

可以用 Postman、Insomnia 或 VS Code REST Client 测试：

```http
POST http://localhost:3000/memes
Content-Type: application/json

{
  "imageUrl": "/uploads/memes/example.png",
  "title": "测试梗图",
  "description": "用于验证数据库写入",
  "tags": ["测试", "Meme"]
}
```

然后依次请求：

```text
GET    http://localhost:3000/memes
GET    http://localhost:3000/memes/{id}
PATCH  http://localhost:3000/memes/{id}
DELETE http://localhost:3000/memes/{id}
```

只有这五个接口都能用，才进入图片上传和前端联调。

## 八、第六阶段：本地图片保存

第一版把图片保存到项目目录：

```text
server/uploads/memes/
```

数据库只保存类似下面的路径：

```text
/uploads/memes/550e8400-e29b-41d4-a716-446655440000.png
```

实现时要遵守以下规则：

1. 使用随机文件名，不直接使用用户原始文件名。
2. 限制文件大小，例如 10 MB。
3. 只允许常见图片 MIME 类型，例如 `image/jpeg`、`image/png`、`image/webp`。
4. 不把用户输入拼接成任意文件路径，避免路径穿越。
5. 删除梗图时同时删除对应图片文件。
6. 数据库删除失败时，不要先删除图片；否则会产生记录丢失。
7. 图片保存成功但数据库写入失败时，要清理孤立文件。

NestJS 中可以使用 `FileInterceptor` 接收 `multipart/form-data`。图片上传和数据库写入最好放在同一个 Service 流程中：

```text
接收文件
  → 校验类型和大小
  → 保存随机文件名
  → 创建 Meme 数据记录
  → 返回记录
```

先完成 JSON 版 CRUD，再把 `POST /memes` 扩展为上传文件，可以减少同时排查多个问题的难度。

## 九、第七阶段：Swagger

安装依赖：

```powershell
pnpm --filter server add @nestjs/swagger swagger-ui-express
```

在 `main.ts` 配置 Swagger：

```ts
const config = new DocumentBuilder()
  .setTitle('MemeSeek API')
  .setDescription('MemeSeek 梗图管理接口')
  .setVersion('1.0')
  .build()

const document = SwaggerModule.createDocument(app, config)
SwaggerModule.setup('docs', app, document)
```

启动后访问：

```text
http://localhost:3000/docs
```

每个 DTO 和接口都应补充 Swagger 装饰器，让文档能看懂请求体、查询参数和返回结果。Swagger 稳定后，再用它生成前端类型。

## 十、第八阶段：前后端联调

后端 CRUD 和 Swagger 完成后，再修改前端数据来源：

```text
原来：mocks/memes.ts
      ↓
之后：TanStack Query → api-client.ts → NestJS API
```

建议新增：

```text
client/src/services/api-client.ts
client/src/services/meme-service.ts
client/src/hooks/use-memes.ts
```

职责分工：

- `api-client.ts`：保存 API 基础地址和统一请求配置。
- `meme-service.ts`：封装 `getMemes`、`createMeme`、`updateMeme`、`deleteMeme`。
- `use-memes.ts`：使用 TanStack Query 管理查询、缓存、刷新和 mutation 状态。
- 页面和组件：只调用 Hook，不直接拼接 `fetch` URL。

前端联调的验收顺序：

```text
后端已有数据 → 前端列表显示
      ↓
前端搜索 → 后端 GET /memes?q=...
      ↓
前端编辑 → PATCH /memes/:id
      ↓
前端删除 → DELETE /memes/:id
      ↓
前端上传 → POST /memes
```

## 十一、第九阶段：AI 分析最后做

CRUD 和图片上传稳定后，再创建：

```text
server/src/ai/
├─ ai.module.ts
├─ ai.service.ts
└─ dto/
```

建议流程：

```text
上传图片
  → 创建 Meme，status = PROCESSING
  → 调用 AI Service
  → 校验 AI 返回 JSON
  → 保存 title、description、tags、ocrText
  → 成功改为 COMPLETED
  → 失败改为 FAILED，并保存 errorMessage
```

AI Service 不应该让前端传入完整提示词。默认提示词固定在后端，前端只能提交图片和必要的设置。

当前是个人本地工具时，可以让前端把 API Key 通过请求传给后端使用，但后端不应把它写入数据库、日志或响应体。以后公开部署时，应改成后端安全保存 API Key。

图片识别模型和 DeepSeek 的视觉输入能力，应在真正接入时再核对官方接口文档，不要先假设某个模型一定支持图片。

重新分析可以设计为：

```text
POST /memes/:id/reanalyze
```

它应该把状态重新设置为 `PROCESSING`，调用 AI，成功或失败后更新同一条 Meme 记录，而不是创建新记录。

## 十二、错误处理规则

后端至少要处理这些情况：

| 情况 | 建议响应 |
|---|---|
| ID 不存在 | `404 Not Found` |
| 请求字段格式错误 | `400 Bad Request` |
| 图片类型不支持 | `400 Bad Request` |
| 图片超过大小限制 | `413 Payload Too Large` |
| 数据库唯一约束冲突 | `409 Conflict` |
| AI 调用失败 | 保留 Meme 记录，状态改为 `FAILED` |
| 未预期的服务器错误 | `500 Internal Server Error` |

不要把数据库原始错误堆栈直接返回给前端。开发环境可以记录日志，但响应只返回前端需要展示的信息。

## 十三、测试怎么安排

先测 Service，再测接口：

### Service 单元测试

- 创建 Meme 时调用 `prisma.meme.create`。
- 查询不存在的 ID 时返回 404。
- 修改 Meme 时只更新 DTO 中允许的字段。
- 删除 Meme 时调用正确的 Prisma 方法。
- 搜索条件能传给 Prisma。

### E2E 接口测试

- `POST /memes` 能创建记录。
- `GET /memes` 能返回列表和总数。
- `PATCH /memes/:id` 能修改标题和标签。
- `DELETE /memes/:id` 能删除记录。
- 非法请求体会得到 400。

测试不要依赖开发数据库中的旧数据。可以使用测试数据库，或者在每个测试前准备、测试后清理数据。

## 十四、每完成一个阶段都要检查

每次开发后执行：

```powershell
pnpm --filter server build
pnpm --filter server test
git status --short
```

并同步更新：

- `TODO.md`：把已经完成的任务改为 `[x]`。
- `docs/project-status.md`：更新当前阶段和下一步。
- `docs/project-plan.md`：如果技术方案发生变化，再更新开发计划。

## 十五、现在立刻做什么

当前不要做前端和 AI。按照下面顺序开始：

```powershell
# 1. 根目录
pnpm --filter server add @prisma/client@6
pnpm --filter server add -D prisma@6

# 2. 进入后端
cd server
pnpm exec prisma init

# 3. 配置 server/.env
# 4. 编写 prisma/schema.prisma
# 5. 执行迁移
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
```

完成数据库迁移后，下一步才是创建 `PrismaModule` 和 `PrismaService`。数据库可以正常读写后，再开始 `MemesModule` 的五个 CRUD 接口。

最终目标不是一次写很多文件，而是先跑通这一条最小链路：

```text
POST /memes
  → 数据写入 PostgreSQL
  → GET /memes 能查到
  → PATCH /memes/:id 能修改
  → DELETE /memes/:id 能删除
```

这条链路稳定之后，图片上传、前端联调和 AI 分析都会容易很多。
