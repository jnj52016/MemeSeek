import type { AiSettings } from '../types/ai-settings'

export const defaultAiSettings: AiSettings = {
  analysis: {
    model: 'gpt-4o',
    apiKey: '',
  },
  content: {
    model: 'gpt-4o-mini',
    apiKey: '',
  },
  useAnalysisForContent: true,
  recommendedTags: ['猫', '动物', '表情', '吐槽', '日常'],
}
