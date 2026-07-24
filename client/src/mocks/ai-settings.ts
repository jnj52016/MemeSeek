import type { AiSettings } from '../types/ai-settings'

export const defaultAiSettings: AiSettings = {
  analysis: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    apiKey: '',
  },
  content: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
  },
  useAnalysisForContent: true,
  recommendedTags: ['猫', '动物', '表情', '吐槽', '日常'],
}
