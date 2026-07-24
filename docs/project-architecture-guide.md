# MemeSeek 项目架构学习指南

## 一、项目架构是什么

项目架构不是一开始就要背很多文件夹。

架构主要回答四个问题：

1. 哪个文件负责展示页面？
2. 哪个文件负责管理数据和状态？
3. 哪个文件负责和后端通信？
4. 哪个文件负责定义数据格式？

把不同职责分开，就是项目架构。

## 二、先从业务流程学习架构

不要先看文件夹，再猜它们有什么用。

应该先看一个具体功能：

```text
用户点击梗图
      ↓
列表页记录当前选中的梗图
      ↓
详情弹窗展示梗图
      ↓
用户编辑或删除
      ↓
页面更新当前列表
```

然后再把这条流程分配给不同文件。

## 三、MemeSeek 的整体数据流

### 当前 Mock 阶段

```text
MemeListPage
      ↓
src/mocks/memes.ts
      ↓
MemeGrid / MemeCard
      ↓
用户看到梗图列表
```

### 接入后端之后

```text
React 页面
      ↓
TanStack Query
      ↓
services/api-client.ts
      ↓
NestJS Controller
      ↓
NestJS Service
      ↓
Prisma
      ↓
PostgreSQL
```

AI 分析流程会在后端继续向外调用：

```text
NestJS MemesService
      ↓
NestJS AiService
      ↓
OpenAI 视觉模型
      ↓
保存 AI 分析结果
```

## 四、前端每个目录负责什么

```text
client/src/
├─ pages/                 # 页面：负责组合功能
├─ components/            # 通用组件：多个业务都可以使用
├─ features/              # 业务功能：梗图、AI 设置等
├─ services/              # API 请求或本地数据读写
├─ types/                 # TypeScript 数据类型
├─ mocks/                 # Mock 数据和默认数据
├─ hooks/                 # 可复用的自定义 Hook
├─ router.tsx             # 路由配置
└─ main.tsx               # 前端启动入口
```

### `pages`：页面组合者

页面负责把多个组件组合在一起，并管理页面级状态。

例如：

```text
MemeListPage
├─ MemeSearchBar
├─ MemeGrid
├─ MemeDetailModal
└─ MemeUploadDrawer
```

页面不应该负责所有细节。比如，上传流程不应该全部写在 `MemeListPage.tsx` 里。

### `components`：通用展示组件

如果一个组件不属于某一个具体业务，可以放在这里。

例如：

```text
components/AppLayout.tsx
```

`AppLayout` 不只服务梗图页面，AI 设置页面也可以使用，所以它属于通用组件。

### `features`：具体业务功能

如果组件只服务梗图业务，就放在：

```text
features/memes/components/
```

例如：

```text
features/memes/components/
├─ MemeCard.tsx
├─ MemeGrid.tsx
├─ MemeDetailModal.tsx
├─ MemeUploadDrawer.tsx
└─ MemeSearchBar.tsx
```

这和 `components` 不冲突：

```text
components/       → 通用组件
features/memes/   → 只属于梗图业务的组件
```

### `services`：和外部数据源通信

`services` 不负责页面展示。

它可以负责：

- 调用后端 API。
- 读取和保存 `localStorage`。
- 调用第三方服务。

例如：

```text
services/ai-settings-storage.ts
```

它只负责保存 AI 设置，不负责显示输入框。

### `types`：数据说明书

例如：

```text
types/meme.ts
types/ai-settings.ts
```

类型说明数据应该长什么样，但不保存具体数据。

```text
types/meme.ts  → Meme 必须有哪些字段
mocks/memes.ts → 实际准备几条假的 Meme 数据
```

### `mocks`：开发阶段的假数据

Mock 数据用于暂时代替后端：

```text
mocks/memes.ts       → 假梗图数据
mocks/ai-settings.ts → 默认 AI 设置
```

真实后端完成后，页面的数据来源会从 Mock 替换为 TanStack Query 请求。

## 五、如何决定一个文件放在哪里

可以按下面的顺序判断：

### 问题一：它是不是一个完整页面？

是，就放到 `pages/`。

例如：

```text
MemeListPage.tsx
AiSettingsPage.tsx
```

### 问题二：它是不是只服务某个业务？

是，就放到对应的 `features/`。

例如：

```text
features/memes/components/MemeCard.tsx
```

### 问题三：它能不能被多个业务复用？

能，就考虑放到 `components/` 或 `hooks/`。

例如：

```text
components/AppLayout.tsx
```

### 问题四：它是不是在读写外部数据？

是，就考虑放到 `services/`。

例如：

```text
services/ai-settings-storage.ts
services/meme-service.ts
```

### 问题五：它是类型还是具体数据？

```text
类型 → types/
具体数据 → mocks/
```

## 六、页面、组件和功能的关系

可以用下面这句话记忆：

```text
页面负责组合
组件负责展示
功能负责业务
服务负责通信
类型负责约束
Mock 负责临时数据
```

它们的关系不是严格的父子包含关系，而是职责关系：

```text
MemeListPage
      ↓ 组合
MemeGrid、MemeCard、MemeUploadDrawer
      ↓ 使用
Meme 类型、Mock 数据、服务函数
```

## 七、状态应该放在哪里

不同类型的状态应该放在不同位置：

| 状态类型 | 推荐位置 | 例子 |
|---|---|---|
| 组件局部状态 | `useState` | 抽屉是否打开、输入框内容 |
| 页面状态 | 页面组件 | 当前选中的梗图、搜索结果 |
| 服务端数据 | TanStack Query | 后端返回的梗图列表 |
| 跨页面状态 | Zustand | 用户界面偏好、批量上传队列 |
| URL 状态 | React Router | `?q=猫` 搜索关键词 |
| 本地设置 | `localStorage` 服务 | AI API Key、模型选择 |

不要把同一份梗图列表同时放进 `useState`、TanStack Query 和 Zustand。

## 八、后端架构怎么理解

NestJS 后端可以先记住这条流程：

```text
Controller
      ↓ 接收请求
DTO
      ↓ 检查参数
Service
      ↓ 编写业务逻辑
Prisma
      ↓ 操作数据库
PostgreSQL
```

每个部分的职责：

| 部分 | 作用 |
|---|---|
| Controller | 定义接口地址，例如 `GET /memes` |
| DTO | 定义和验证请求参数 |
| Service | 编写新增、查询、修改、删除等业务逻辑 |
| Prisma | 用 TypeScript 操作数据库 |
| PostgreSQL | 真正保存数据 |
| Module | 把相关 Controller、Service 组织在一起 |

例如删除梗图：

```text
DELETE /memes/:id
      ↓
MemesController
      ↓
MemesService
      ↓
Prisma meme.delete()
      ↓
PostgreSQL 删除记录
```

## 九、学习项目架构的正确顺序

建议按照项目实际开发顺序学习：

```text
1. React 组件、Props 和 State
        ↓
2. 页面和组件如何拆分
        ↓
3. React Router 页面切换
        ↓
4. URL 状态和表单状态
        ↓
5. API 请求和 TanStack Query
        ↓
6. NestJS Controller 和 Service
        ↓
7. Prisma 和 PostgreSQL
        ↓
8. 前后端联调
        ↓
9. 错误处理、测试和部署
```

不要一开始就学习所有高级架构。先把一个完整功能走通，例如：

```text
上传梗图
  → 后端接收文件
  → 保存数据库
  → 前端刷新列表
```

然后再学习缓存、错误重试、文件存储和 AI 分析。

## 十、架构不是一次性设计完成的

现在的 MemeSeek 可以先这样：

```text
页面 + Mock 数据 + useState
```

之后逐步变成：

```text
页面 + TanStack Query + NestJS + Prisma + PostgreSQL
```

最后再增加：

```text
AI 分析、OpenAPI 类型、测试、Docker 和部署
```

所以，架构不是为了让项目看起来复杂，而是为了让每个文件只负责自己擅长的事情，并且方便以后替换数据来源。

## 十一、当前 MemeSeek 的下一步

当前前端 Mock 页面已经基本完成，下一步可以开始后端数据库架构：

```text
Docker PostgreSQL
      ↓
Prisma schema
      ↓
Meme 数据表
      ↓
NestJS Memes 模块
      ↓
CRUD 接口
```

完成后，再把前端的：

```ts
const [memes, setMemes] = useState<Meme[]>(mockMemes)
```

替换成 TanStack Query 获取后端数据。
