import type { AiSettings } from '../types/ai-settings'
import { defaultAiSettings } from '../mocks/ai-settings'

// localStorage 使用的固定名称，避免不同页面使用不同的 Key。
const AI_SETTINGS_STORAGE_KEY = 'memeseek-ai-settings'

// 从浏览器读取 AI 设置；没有数据或数据格式错误时使用默认值。
export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') {
    return defaultAiSettings
  }

  const savedSettings = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)

  if (!savedSettings) {
    return defaultAiSettings
  }

  try {
    const parsedSettings = JSON.parse(savedSettings) as Partial<AiSettings>

    return {
      recommendedTags: Array.isArray(parsedSettings.recommendedTags)
        ? parsedSettings.recommendedTags.filter(
            (tag): tag is string => typeof tag === 'string',
          )
        : defaultAiSettings.recommendedTags,
      model:
        typeof parsedSettings.model === 'string'
          ? parsedSettings.model
          : defaultAiSettings.model,
      apiKey:
        typeof parsedSettings.apiKey === 'string'
          ? parsedSettings.apiKey
          : defaultAiSettings.apiKey,
    }
  } catch {
    return defaultAiSettings
  }
}

// 把 AI 设置保存到浏览器；当前版本不会把设置发送到后端。
export function saveAiSettings(settings: AiSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    AI_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      recommendedTags: settings.recommendedTags,
      model: settings.model,
      apiKey: settings.apiKey,
    }),
  )
}
