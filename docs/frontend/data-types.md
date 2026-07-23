# MemeSeek 数据类型设计教程

## 一、数据类型是做什么的

数据类型就是提前说明：一条数据有哪些字段，每个字段是什么类型。

例如：

```ts
type Meme = {
  id: string
  title: string
  tags: string[]
}
```

它相当于一张数据说明书，让 TypeScript 知道梗图数据应该长什么样。

## 二、根据页面功能找字段

不要一开始凭感觉添加很多字段，先看页面需要展示什么。

### 梗图列表页需要什么

页面需要展示：

- 图片
- 名称
- 标签
- 分析状态

所以至少需要：

```text
imageUrl
title
tags
status
```

### 梗图详情弹窗需要什么

详情弹窗需要展示：

- 大图
- 名称
- 标签
- 描述
- OCR 文字

所以需要继续增加：

```text
description
ocrText
```

### 后续管理需要什么

为了编辑、删除和排序，需要：

```text
id
createdAt
updatedAt
```

## 三、设计 `Meme` 类型

在：

```text
client/src/types/meme.ts
```

写入：

```ts
export type MemeStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type Meme = {
  id: string
  imageUrl: string
  title: string
  description: string
  tags: string[]
  ocrText: string
  status: MemeStatus
  errorMessage?: string
  createdAt: string
  updatedAt: string
}
```

## 四、每个字段是什么意思

| 字段 | 类型 | 作用 |
|---|---|---|
| `id` | `string` | 梗图唯一标识，用于详情、编辑和删除 |
| `imageUrl` | `string` | 梗图图片地址 |
| `title` | `string` | 梗图名称 |
| `description` | `string` | AI 生成的图片描述 |
| `tags` | `string[]` | 标签列表，例如 `['猫', '搞笑']` |
| `ocrText` | `string` | 图片中识别出的文字 |
| `status` | `MemeStatus` | AI 分析状态 |
| `errorMessage` | `string?` | 分析失败时的错误信息 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 最后更新时间 |

## 五、为什么要单独定义 `MemeStatus`

不要在代码里到处直接写状态字符串：

```ts
status === 'COMPLETED'
```

先定义允许的状态：

```ts
export type MemeStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'
```

这样 TypeScript 会限制状态只能是这三个值，避免拼写错误。

```ts
const status: MemeStatus = 'COMPLETED'
```

下面这种写法会报错：

```ts
const status: MemeStatus = 'SUCCESS'
```

## 六、什么时候使用可选字段

字段后面加 `?` 表示这个字段可能不存在：

```ts
errorMessage?: string
```

因为正常分析成功时没有错误信息，只有失败时才需要它。

```ts
const completedMeme: Meme = {
  id: 'meme-001',
  imageUrl: '/uploads/cat.png',
  title: '猫猫震惊',
  description: '一只猫表现出震惊的表情。',
  tags: ['猫', '震惊'],
  ocrText: '',
  status: 'COMPLETED',
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
}
```

## 七、设计 `AiSettings` 类型

AI 设置页面需要：

- 推荐标签
- 使用的模型
- DeepSeek API Key

在：

```text
client/src/types/ai-settings.ts
```

写入：

```ts
export type AiSettings = {
  recommendedTags: string[]
  model: string
  apiKey: string
}
```

当前项目是个人本地工具，所以 API Key 会由用户在前端输入，并保存在当前浏览器的 `localStorage` 中。

如果以后公开部署给其他人使用，就不能继续把真实 API Key 保存在前端，而应该改为由后端保存和调用。

## 八、如何判断字段是否应该添加

可以问自己三个问题：

1. 页面是否需要展示它？
2. 用户是否需要编辑它？
3. 后端是否需要保存或查询它？

如果三个问题都是“否”，当前版本通常不需要添加。

例如：

```text
收藏数量 → 当前页面不需要，可以暂时不加
用户 ID   → 当前没有登录功能，可以暂时不加
向量数据  → 当前不做向量搜索，可以暂时不加
```

## 九、前端类型和后端类型的关系

前端类型、API 类型和数据库模型描述的是同一类业务数据，但不一定完全相同。

```text
前端 Meme 类型
        ↕
后端 API 响应类型
        ↕
数据库 Meme 模型
```

目前可以先用前端类型开发页面，后端接口完成后再检查字段是否一致。

以后接入 OpenAPI 后，可以让 API 类型由后端文档自动生成，而不是手动重复维护。

## 十、当前项目的建议顺序

```text
确定页面需要展示什么
        ↓
列出字段
        ↓
确定字段类型
        ↓
定义 TypeScript 类型
        ↓
创建 Mock 数据
        ↓
让页面使用 Mock 数据
```

当前 MemeSeek 只需要先定义：

```text
Meme
MemeStatus
AiSettings
```

不需要现在设计用户、登录、收藏夹、向量搜索等后续功能的数据类型。
