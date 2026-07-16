/**
 * AI 分析设置
 * @property prompt 分析梗图时使用的提示词
 * @property recommendedTags AI 推荐使用的标签列表
 * @property model 当前使用的 AI 模型名称
 * @property apiBaseUrl AI 服务的 API 地址
 * @property isApiKeyConfigured 服务端是否已经配置 API Key
 */
export type AiSettings = {
  prompt: string
  recommendedTags: string[]
  model: string
  apiBaseUrl: string
  isApiKeyConfigured: boolean
}
