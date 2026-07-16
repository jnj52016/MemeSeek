# MemeSeek 前端项目结构

## 一句话理解

前端项目可以先简单分成几类：

- `pages`：页面
- `components`：可以重复使用的组件
- `features`：具体业务功能
- `services`：请求后端 API
- `types`：TypeScript 类型
- `mocks`：暂时用来模拟后端的数据

## 当前结构

```text
client/
├─ public/                  # 可以直接访问的静态文件
├─ src/
│  ├─ assets/               # 页面使用的图片、图标
│  ├─ components/           # 通用组件
│  ├─ features/
│  │  ├─ memes/             # 梗图相关功能
│  │  └─ ai-settings/       # AI 设置相关功能
│  ├─ hooks/                # 可复用的 React Hooks
│  ├─ mocks/                # Mock 梗图数据
│  ├─ pages/                # 页面组件
│  ├─ services/             # API 请求代码
│  ├─ types/                # TypeScript 类型和生成的 API 类型
│  ├─ App.tsx               # 应用根组件
│  └─ main.tsx              # 应用启动入口
└─ package.json             # 前端依赖和命令
```

## 这几个目录怎么用

### `pages`

放页面：

```text
pages/
├─ MemeListPage.tsx         # 梗图列表页
└─ AiSettingsPage.tsx       # AI 提示词页面
```

梗图详情暂时是弹窗，不单独创建详情页。

### `components`

放多个地方都可能使用的组件，例如：

```text
components/
├─ AppLayout.tsx
├─ SearchInput.tsx
└─ MemeDetailModal.tsx
```

### `features`

放业务功能内部的代码。

```text
features/
├─ memes/                   # 上传、列表、详情相关代码
└─ ai-settings/             # AI 提示词设置相关代码
```

刚开始可以先把页面组件放在 `pages`，功能复杂后再移动到对应的 `features` 中。

### `services`

放和后端通信的代码，例如：

```text
services/
├─ api-client.ts            # 统一的请求客户端
└─ meme-service.ts          # 梗图相关 API
```

页面不直接写详细的请求代码，而是调用这里的函数。

### `types`

放 TypeScript 类型，例如：

```text
types/
├─ meme.ts                  # Meme 类型
└─ api.d.ts                 # 根据 OpenAPI 生成的类型
```

## OpenAPI 工具放在哪里

你提到的两个工具都属于“前端和后端联调工具”，不是页面组件。

### `openapi-typescript`

它根据后端的 OpenAPI 文档生成 TypeScript 类型。

它是一个开发工具，安装在 `client` 的开发依赖中，生成结果放在：

```text
client/src/types/api.d.ts
```

可以在 `client/package.json` 中配置命令：

```json
{
  "scripts": {
    "generate:api": "openapi-typescript http://localhost:3000/api-json -o src/types/api.d.ts"
  }
}
```

以后后端启动后，运行：

```powershell
pnpm --filter client generate:api
```

就可以重新生成 API 类型。

### `openapi-fetch`

它根据生成的 OpenAPI 类型提供类型安全的请求功能。

它是前端运行时依赖，主要代码放在：

```text
client/src/services/api-client.ts
```

之后 `meme-service.ts` 可以使用这个统一客户端请求后端。

简单关系如下：

```text
后端 Swagger/OpenAPI 文档
        ↓
openapi-typescript
        ↓
src/types/api.d.ts
        ↓
openapi-fetch
        ↓
src/services/api-client.ts
        ↓
页面和业务功能
```

## 现在暂时不用做什么

目前后端还没有正式的 Meme API，所以暂时：

- 不安装 `openapi-typescript`
- 不安装 `openapi-fetch`
- 不创建 `api.d.ts`
- 不创建 `api-client.ts`

等后端完成 Swagger 配置并能访问 OpenAPI 文档后，再接入这两个工具。
