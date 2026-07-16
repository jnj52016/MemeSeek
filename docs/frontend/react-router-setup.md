# MemeSeek 前端路由配置教程

本文介绍如何为 MemeSeek 配置两个 MVP 页面：

```text
/             梗图列表页
/ai-settings  AI 提示词设置页
```

当前项目使用的是 `react-router`，不需要安装 `react-router-dom`。

## 一、路由是什么

路由就是“URL 地址和页面组件之间的对应关系”：

```text
/             → MemeListPage
/ai-settings  → AiSettingsPage
```

当用户访问不同地址时，React Router 会显示对应的页面组件。

## 二、创建页面组件

在 `client/src/pages/` 下创建两个文件。

### `MemeListPage.tsx`

```tsx
function MemeListPage() {
  return <h1>梗图列表页</h1>
}

export default MemeListPage
```

### `AiSettingsPage.tsx`

```tsx
function AiSettingsPage() {
  return <h1>AI 提示词设置页</h1>
}

export default AiSettingsPage
```

先使用简单文字确认路由正常，之后再逐步开发真正的页面内容。

## 三、创建路由配置文件

在 `client/src/` 下创建：

```text
router.tsx
```

写入：

```tsx
import { createBrowserRouter } from 'react-router'
import AiSettingsPage from './pages/AiSettingsPage'
import MemeListPage from './pages/MemeListPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MemeListPage />,
  },
  {
    path: '/ai-settings',
    element: <AiSettingsPage />,
  },
])
```

这里做了两件事：

- 创建浏览器路由。
- 配置 URL 和页面组件的对应关系。

## 四、修改 `main.tsx`

打开：

```text
client/src/main.tsx
```

将内容改成：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

`RouterProvider` 会接管应用的页面显示。配置完成后，`App.tsx` 暂时不会作为根页面使用。

## 五、启动并验证

在项目根目录运行：

```powershell
pnpm --filter client dev
```

分别打开：

```text
http://localhost:5173/
http://localhost:5173/ai-settings
```

应该分别看到：

```text
梗图列表页
AI 提示词设置页
```

## 六、页面之间跳转

如果要在页面中添加跳转链接，可以使用 `Link`：

```tsx
import { Link } from 'react-router'

function Navigation() {
  return (
    <nav>
      <Link to="/">梗图列表</Link>
      <Link to="/ai-settings">AI 设置</Link>
    </nav>
  )
}

export default Navigation
```

`Link` 会在前端内部切换页面，不会重新加载整个网页。

## 七、当前不需要做的事情

- 不需要创建独立的搜索结果路由。
- 不需要创建独立的梗图详情路由。
- 梗图详情先使用列表页中的弹窗。
- 暂时不需要嵌套路由和权限路由。
- 暂时不需要安装 `react-router-dom`。

## 配置完成后的结构

```text
client/src/
├─ pages/
│  ├─ MemeListPage.tsx
│  └─ AiSettingsPage.tsx
├─ router.tsx
├─ App.tsx
└─ main.tsx
```

## 官方参考

- [React Router Installation](https://reactrouter.com/start/data/installation)
- [React Router API Reference](https://api.reactrouter.com/v7/modules/react-router.html)
