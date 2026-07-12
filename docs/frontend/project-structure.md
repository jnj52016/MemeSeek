# MemeSeek 客户端项目结构

## 当前目标

MemeSeek 第一版客户端包含两个主要页面：

- 梗图列表页：搜索、上传、浏览梗图，以及通过弹窗查看详情。
- AI 提示词设置页：查看和维护梗图分析提示词、标签规则和模型配置。

当前目录结构保持简单，只为 MVP 的页面和功能预留位置，不提前引入复杂的架构。

## 目录结构

```text
client/
├─ public/                     # 不需要经过构建处理的静态资源
├─ src/
│  ├─ assets/                  # 图片、图标等前端资源
│  ├─ components/              # 多个页面共用的展示组件
│  ├─ features/
│  │  ├─ memes/                # 梗图相关功能
│  │  └─ ai-settings/          # AI 提示词设置相关功能
│  ├─ hooks/                   # 可复用的 React Hooks
│  ├─ mocks/                   # 开发阶段使用的 Mock 数据
│  ├─ pages/                   # 页面级组件
│  ├─ services/                # API 请求和外部服务封装
│  ├─ types/                   # TypeScript 类型定义
│  ├─ App.tsx                  # 应用根组件和路由入口
│  ├─ main.tsx                 # React 应用启动入口
│  ├─ App.css                  # App 级样式（后续可逐步整理）
│  └─ index.css                # 全局样式
├─ PROJECT_STRUCTURE.md        # 本文档
└─ package.json                # 客户端依赖和脚本
```

## 各目录怎么使用

### `pages`

存放页面级组件，例如：

```text
pages/
├─ MemeListPage.tsx
└─ AiSettingsPage.tsx
```

详情暂时不是独立页面，而是梗图列表页中的弹窗，因此不需要单独创建详情页。

### `components`

存放跨页面复用的组件，例如：

```text
components/
├─ AppLayout.tsx
├─ SearchInput.tsx
└─ MemeDetailModal.tsx
```

只有在组件确实被多个功能使用时，才放到这里。

### `features`

按照业务功能组织代码。梗图列表、上传和详情相关代码可以放到 `features/memes`，AI 提示词页面相关代码可以放到 `features/ai-settings`。

这样可以避免把所有业务代码都堆在 `components` 目录中。

### `types`

存放共享的数据类型，后续会在这里定义：

- `Meme`
- `MemeStatus`
- `AiSettings`

目前只创建目录，不提前写具体类型。

### `mocks`

存放前端独立开发阶段使用的 Mock 梗图和 AI 设置数据。后续接入后端 API 后，可以逐步替换这些数据。

### `services`

存放 API 调用代码，例如获取梗图列表、上传梗图、修改梗图和删除梗图。页面组件不直接编写请求细节。

### `hooks`

存放可复用的状态和行为逻辑，例如搜索参数、上传状态或梗图查询逻辑。简单的局部状态仍然直接使用组件内的 `useState`。

## 当前暂时不做的事情

- 不创建独立的搜索结果页。
- 不创建独立的梗图详情页。
- 不提前设计完整的用户、权限和登录目录。
- 不把所有状态都放入 Zustand。
- 不在客户端保存真实的 AI API Key。

后续页面和数据模型稳定后，再逐步补充具体文件。
