# MemeSeek Mock 数据整理说明

## 一、Mock 数据是什么

Mock 数据是假数据，主要用于后端接口完成前开发页面。

它可以帮助我们提前完成：

- 列表展示
- 搜索和筛选
- 详情弹窗
- 编辑和删除交互
- 加载、空状态和失败状态

Mock 数据不是真实数据库数据，刷新页面后可能恢复初始内容。

## 二、Mock 数据放在哪里

当前项目使用下面的结构：

```text
client/
├─ public/
│  └─ mock-images/
│     ├─ mock-cat.png
│     ├─ mock-effort.svg
│     └─ mock-question.svg
└─ src/
   ├─ mocks/
   │  └─ memes.ts
   ├─ types/
   │  └─ meme.ts
   └─ pages/
      └─ MemeListPage.tsx
```

每个位置的职责不同：

| 位置 | 作用 |
|---|---|
| `src/types/` | 定义数据应该有哪些字段和类型 |
| `src/mocks/` | 保存模拟的 TypeScript 数据对象 |
| `public/mock-images/` | 保存 Mock 图片、图标等静态资源 |
| `pages/` | 使用 Mock 数据组合页面 |
| `features/` | 展示和操作具体的业务组件 |

## 三、为什么图片不放进 `src/mocks/`

`src/mocks/` 放的是数据对象，例如：

```ts
{
  id: 'meme-001',
  title: '猫猫震惊',
  tags: ['猫', '表情'],
  imageUrl: '/mock-images/mock-cat.png'
}
```

图片本身属于静态资源，所以放到：

```text
client/public/mock-images/
```

`public` 下的文件可以直接通过网站根路径访问：

```text
client/public/mock-images/mock-cat.png
        ↓
/mock-images/mock-cat.png
```

因此 `imageUrl` 不应该写成：

```ts
'client/public/mock-images/mock-cat.png'
```

也不应该写成：

```ts
'/public/mock-images/mock-cat.png'
```

## 四、Mock 数据文件应该怎么写

在 `client/src/mocks/memes.ts` 中：

```ts
import type { Meme } from '../types/meme'

export const mockMemes: Meme[] = [
  {
    id: 'meme-001',
    imageUrl: '/mock-images/mock-cat.png',
    title: '猫猫震惊',
    description: '一只猫表现出震惊的表情。',
    tags: ['猫', '表情', '震惊'],
    ocrText: '',
    status: 'COMPLETED',
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
  },
]
```

注意：

- 使用 `Meme[]` 检查字段是否完整。
- `id` 必须唯一。
- `status` 只能使用 `PROCESSING`、`COMPLETED` 或 `FAILED`。
- `FAILED` 数据可以填写 `errorMessage`。
- 图片路径必须和 `public/mock-images/` 中的文件名一致。

## 五、页面如何使用 Mock 数据

当前列表页暂时这样引入：

```ts
import { mockMemes } from '../mocks/memes'

const [memes, setMemes] = useState<Meme[]>(mockMemes)
```

这里的 `memes` 是页面当前正在使用的数据，上传、编辑和删除只会修改浏览器内存中的数据。

## 六、以后接入后端时怎么替换

后端接口完成后，不需要重新设计组件，只需要把数据来源替换成 TanStack Query：

```text
现在：
MemeListPage → mockMemes

以后：
MemeListPage → useQuery → GET /memes
```

页面组件仍然接收 `Meme[]`，所以 `MemeCard`、`MemeGrid` 等展示组件可以继续使用。

最终可以删除：

```ts
import { mockMemes } from '../mocks/memes'
```

但 `src/mocks/` 可以暂时保留，用于测试和演示。

## 七、不要这样放 Mock 数据

不建议把大量 Mock 数据直接写在页面组件中：

```tsx
function MemeListPage() {
  const memes = [
    // 很多数据...
  ]
}
```

这样会让页面同时负责：

- 页面布局
- 数据定义
- 搜索逻辑
- 交互逻辑

更好的方式是：

```text
types/  → 说明数据结构
mocks/  → 提供假数据
pages/  → 组合页面
features/ → 处理梗图业务组件
```

## 八、当前项目的 Mock 数据边界

当前 Mock 阶段可以模拟：

- 梗图列表
- 分析中状态
- 分析成功状态
- 分析失败状态
- 搜索无结果
- 上传进度
- 编辑和删除

当前 Mock 阶段不能真正完成：

- 数据库持久化
- 多设备同步
- 真实图片文件保存
- 真实通义千问视觉 API 调用
- 后端网络错误处理

这些功能要等 NestJS、PostgreSQL 和真实 API 接入后再实现。
