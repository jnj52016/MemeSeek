import type { AiSettings } from '../types/ai-settings'

// AI 设置的默认数据：用于首次打开页面或恢复默认设置。
export const defaultAiSettings: AiSettings = {
  recommendedTags: ['猫', '动物', '表情', '吐槽', '日常'],
  model: 'deepseek-v4-flash',
  apiKey: '',
}
