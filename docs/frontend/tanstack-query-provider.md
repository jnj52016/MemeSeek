# TanStack Query Provider 配置教程

## 一、TanStack Query 是做什么的

TanStack Query 用来管理服务端数据，例如：

- 获取梗图列表
- 获取梗图详情
- 上传梗图
- 修改梗图
- 删除梗图
- 缓存请求结果
- 重新请求最新数据

它不是用来替代 `useState` 的。

```text
useState          → 组件内部的小状态
TanStack Query    → 来自后端的服务端数据
```

## 二、为什么需要 Provider

页面中的 `useQuery` 和 `useMutation` 需要知道：

- 使用哪个 Query Client
- 数据缓存放在哪里
- 请求失败时如何重试
- 数据多久算新鲜

`QueryClientProvider` 就是把这些能力提供给整个 React 应用。

结构可以理解为：

```text
QueryClientProvider
└─ RouterProvider
   ├─ MemeListPage
   └─ AiSettingsPage
```

只要页面在 `QueryClientProvider` 内部，就可以使用 TanStack Query。

## 三、当前是否需要后端

不需要。

Provider 只是基础配置，当前没有后端 API 也可以先配置。配置完成后，暂时不会自动发起任何请求。

## 四、创建 Query Client

建议在客户端创建一个专门的文件：

```text
client/src/services/query-client.ts
```

写入：

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
```

### 这几个配置是什么意思

```ts
staleTime: 30_000
```

表示请求成功后的 30 秒内，数据暂时被认为是新鲜的，不会因为普通页面切换立即重新请求。

```ts
retry: 1
```

表示请求失败后最多自动重试 1 次。

## 五、修改 `main.tsx`

打开：

```text
client/src/main.tsx
```

加入导入：

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './services/query-client'
```

完整示例：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { queryClient } from './services/query-client'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

这里的层级是：

```text
StrictMode
└─ QueryClientProvider
   └─ RouterProvider
      └─ 页面
```

## 六、以后如何获取梗图列表

后端 API 完成后，可以在页面中使用 `useQuery`：

```tsx
import { useQuery } from '@tanstack/react-query'

function MemeListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['memes'],
    queryFn: getMemes,
  })

  if (isLoading) {
    return <p>加载中...</p>
  }

  if (isError) {
    return <p>加载失败</p>
  }

  return <div>{data?.map((meme) => meme.title)}</div>
}
```

### `queryKey`

```ts
queryKey: ['memes']
```

它是缓存数据的名字。以后搜索条件变化时，可以把关键词放进去：

```ts
queryKey: ['memes', { q: keyword }]
```

不同关键词会产生不同的缓存记录。

### `queryFn`

```ts
queryFn: getMemes
```

它是真正请求后端的函数，通常放在：

```text
client/src/services/meme-service.ts
```

页面只负责使用查询结果，不直接编写请求细节。

## 七、以后如何上传、修改和删除

写操作使用 `useMutation`：

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function UploadButton() {
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: uploadMeme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })

  return (
    <button onClick={() => uploadMutation.mutate(file)}>
      上传梗图
    </button>
  )
}
```

上传成功后：

```ts
queryClient.invalidateQueries({ queryKey: ['memes'] })
```

会让梗图列表重新获取最新数据。

## 八、当前阶段要做什么

当前可以先完成：

1. 创建 `src/services/query-client.ts`。
2. 修改 `main.tsx`，加入 `QueryClientProvider`。
3. 启动前端，确认页面仍然可以打开。

当前暂时不用：

- 编写 `useQuery`。
- 编写 `useMutation`。
- 请求真实后端。
- 把梗图列表放进 Zustand。

## 官方参考

[TanStack Query React 安装文档](https://tanstack.com/query/latest/docs/framework/react/installation)
