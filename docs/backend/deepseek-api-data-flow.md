# MemeSeek 中视觉 AI API 的数据流

## 一、先说结论

MemeSeek 最适合采用下面这条路线：

```text
浏览器前端
   │
   │ 发送图片、梗图信息和用户设置
   ▼
NestJS 后端
   │
   │ 使用 API Key 调用通义千问视觉模型
   ▼
通义千问 OpenAI 兼容 API
   │
   │ 返回完整结果或分段结果
   ▼
NestJS 后端
   │
   │ 校验结果、保存数据库、返回前端
   ▼
浏览器前端
```

也就是说，推荐的最终结构是：

```text
前端 → 后端 → 通义千问视觉 API
前端 ← 后端 ← 通义千问视觉 API
```

前端负责页面展示，后端负责调用 AI、处理结果和保存数据。

## 二、当前项目的 API Key 在哪里

目前 AI 设置页只是把 API Key 保存到了浏览器的 `localStorage`：

```text
client/src/pages/AiSettingsPage.tsx
        ↓
client/src/services/ai-settings-storage.ts
        ↓
浏览器 localStorage
```

当前 API Key 会在分析请求时由前端临时传给后端，不保存到数据库。

以后接入后端时，点击“保存设置”可以调用后端接口：

```text
前端输入 API Key
        ↓
PUT /settings/ai-key
        ↓
NestJS 后端暂存 API Key
```

后端不应该把完整 API Key 返回给前端，只返回：

```json
{
  "isConfigured": true
}
```

因为这是个人本地工具，API Key 可以由前端输入并更换，不需要每次手动修改 `server/.env`。

## 三、后端如何调用视觉 AI API

后端调用视觉 AI API 时，API Key 放在请求头中：

```http
Authorization: Bearer 你的_DEEPSEEK_API_KEY
```

数据路线如下：

```text
NestJS AiService
        ↓
读取当前 API Key
        ↓
发送 Authorization 请求头
        ↓
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
        ↓
读取视觉模型返回结果
```

前端不需要直接知道视觉模型的完整请求细节。

## 四、非流式请求是什么

非流式请求会等待 AI 完成全部内容后，一次性返回结果。

```text
前端上传梗图
      ↓
后端保存图片，创建 PROCESSING 记录
      ↓
后端调用视觉模型，等待完整结果
      ↓
后端解析 title、description、tags 等字段
      ↓
后端保存数据库
      ↓
返回完整梗图数据
      ↓
前端刷新列表
```

例如后端最终返回：

```json
{
  "title": "猫猫震惊",
  "description": "一只猫露出惊讶的表情。",
  "tags": ["猫", "动物", "震惊"],
  "ocrText": ""
}
```

非流式请求适合 MemeSeek 的图片分析，因为我们需要等完整 JSON 生成后，再一次性保存到数据库。

第一版建议使用非流式请求。

## 五、流式请求是什么

流式请求不会等 AI 全部生成完，而是生成一部分就返回一部分。

```text
前端发起请求
      ↓
后端调用视觉模型，设置 stream: true
      ↓
视觉模型返回第一段内容
      ↓
后端转发第一段内容给前端
      ↓
视觉模型返回第二段内容
      ↓
后端转发第二段内容给前端
      ↓
前端不断拼接内容并更新页面
```

视觉模型的流式响应使用 SSE，也就是 Server-Sent Events。响应内容类似：

```text
data: {"choices":[{"delta":{"content":"猫"}}]}

data: {"choices":[{"delta":{"content":"猫露出"}}]}

data: [DONE]
```

流式数据的路线是：

```text
前端 ← SSE ← NestJS ← SSE ← 视觉模型
```

流式请求适合：

- 自然语言搜索解释
- AI 对话页面
- 较长的文字生成任务
- 希望用户看到“正在生成”的过程

但它会增加前后端处理复杂度，需要处理连接中断、内容拼接和结束标记。

## 六、MemeSeek 第一版应该选哪一种

建议这样安排：

| 功能 | 请求方式 | 原因 |
|---|---|---|
| 上传梗图并分析 | 非流式 | 需要完整 JSON 后再保存数据库 |
| 重新分析梗图 | 非流式 | 需要完整结果覆盖原数据 |
| 自然语言搜索 | 第一版非流式 | 先提取关键词和标签，逻辑简单 |
| AI 对话或长文本 | 后续流式 | 可以逐段显示生成内容 |

所以第一版不是所有功能都要使用流式请求。

## 七、为什么不建议前端直接调用视觉 AI API

前端直连的路线是：

```text
浏览器前端 → 视觉 AI API
```

它的优点是代码少、看起来简单，但有这些问题：

- API Key 会暴露在浏览器中。
- 用户可以在开发者工具中看到请求和 Key。
- 前端需要自己处理视觉模型返回格式。
- API 请求容易受到跨域、限流和重复提交影响。
- 后端无法统一记录分析失败和调用日志。
- 不利于展示 NestJS 后端能力。

个人本地工具可以暂时这样做，但 MemeSeek 的项目目标是展示全栈能力，所以最终仍然建议使用：

```text
浏览器前端 → NestJS → 视觉 AI API
```

## 八、API Key 更换应该怎么做

推荐的运行方式是：

```text
1. 用户在前端输入新的 API Key
2. 点击保存
3. 前端调用 PUT /settings/ai-key
4. 后端替换当前正在使用的 API Key
5. 后续 AI 请求使用新 Key
```

后端可以先把 Key 保存在内存中：

```ts
private currentApiKey = process.env.DEEPSEEK_API_KEY ?? ''
```

用户更换 Key 时，只更新 `currentApiKey`，不需要重启服务。

第一版可以接受服务重启后重新输入 Key。以后如果需要持久化，再考虑加密保存到本地数据库。

## 九、梗图图片分析需要特别注意

通义千问视觉模型支持通过 OpenAI 兼容 Chat Completions 接口接收 `image_url`，可以直接完成梗图的图片理解、OCR 和结构化分析：

```text
梗图图片
   ↓
通义千问视觉模型
   ↓
标题、描述、标签、OCR 文字
```

当前实现直接使用支持图片输入的通义千问视觉模型完成全部分析。

## 十、MemeSeek 的推荐实现顺序

```text
第一步：完成前端 API Key 输入和保存
        ↓
第二步：后端增加 AI 设置接口
        ↓
第三步：后端增加视觉 AI AiService
        ↓
第四步：先用非流式请求测试文本分析
        ↓
第五步：确认通义千问视觉模型方案
        ↓
第六步：接入梗图上传和 AI 分析流程
        ↓
第七步：以后需要实时展示时，再增加流式请求
```

## 十一、当前实现补充

当前后端已经实现：

```text
前端 localStorage API Key
        ↓ x-ai-api-key
POST /memes/:id/analyze
        ↓
AiService 设置 PROCESSING
        ↓
AI_BASE_URL/chat/completions
        ↓
校验 JSON 并保存 COMPLETED，或保存 FAILED 和 errorMessage
```

`AI_BASE_URL` 当前配置为通义千问 OpenAI 兼容接口，例如 `https://dashscope.aliyuncs.com/compatible-mode/v1`；代码会自动追加 `/chat/completions`。以后切换到其他 OpenAI 兼容模型时，只需修改 `AI_BASE_URL` 和 `AI_MODEL`。

## 十二、参考资料

- [通义千问 OpenAI 兼容 Chat Completions](https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai)
- [通义千问 OpenAI 兼容接口参数](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
