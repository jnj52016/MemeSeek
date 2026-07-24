/**
 * AI 分析设置
 * @property recommendedTags AI 推荐使用的标签列表。
 * @property model 当前使用的视觉模型名称。
 * @property apiKey AI API Key，仅供个人本地使用。
 */
export type AiSettings = {
  recommendedTags: string[]
  model: string
  apiKey: string
}
