import type { AiSettings } from '../types/ai-settings'

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
export const DEEPSEEK_VISION_MODEL = 'deepseek-v4-flash-vision-exp'

export const defaultAiSettings: AiSettings = {
  analysis: {
    baseUrl: DEEPSEEK_BASE_URL,
    model: DEEPSEEK_VISION_MODEL,
    apiKey: '',
  },
  content: {
    baseUrl: DEEPSEEK_BASE_URL,
    model: DEEPSEEK_VISION_MODEL,
    apiKey: '',
  },
  useAnalysisForContent: true,
  recommendedTags: ['猫', '动物', '表情', '吐槽', '日常'],
}
