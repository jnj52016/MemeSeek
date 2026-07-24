import type {
  AiProviderSettings,
  AiSettings,
} from '../types/ai-settings'
import { defaultAiSettings } from '../mocks/ai-settings'

const AI_SETTINGS_STORAGE_KEY = 'memeseek-ai-settings'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneDefaultSettings(): AiSettings {
  return {
    analysis: { ...defaultAiSettings.analysis },
    content: { ...defaultAiSettings.content },
    useAnalysisForContent: defaultAiSettings.useAnalysisForContent,
    recommendedTags: [...defaultAiSettings.recommendedTags],
  }
}

function normalizeProviderSettings(
  value: unknown,
  fallback: AiProviderSettings,
): AiProviderSettings {
  const record = isRecord(value) ? value : {}
  const model = typeof record.model === 'string' ? record.model.trim() : ''
  const apiKey = typeof record.apiKey === 'string' ? record.apiKey : ''

  return {
    // Do not keep models from the previous Qwen/DeepSeek setup after the
    // application has switched to OpenAI.
    model:
      !model || /^(qwen|deepseek)([-_]|$)/i.test(model)
        ? fallback.model
        : model,
    apiKey,
  }
}

function normalizeSettings(value: unknown): AiSettings {
  const record = isRecord(value) ? value : {}
  const legacyProvider = {
    model: record.model,
    apiKey: record.apiKey,
  }
  const hasNewProviderSettings = 'analysis' in record || 'content' in record

  const analysis = normalizeProviderSettings(
    hasNewProviderSettings ? record.analysis : legacyProvider,
    defaultAiSettings.analysis,
  )
  const content = normalizeProviderSettings(
    record.content,
    defaultAiSettings.content,
  )
  const recommendedTags = Array.isArray(record.recommendedTags)
    ? record.recommendedTags.filter(
        (tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()),
      )
    : [...defaultAiSettings.recommendedTags]

  return {
    analysis,
    content,
    useAnalysisForContent:
      typeof record.useAnalysisForContent === 'boolean'
        ? record.useAnalysisForContent
        : true,
    recommendedTags,
  }
}

export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') {
    return cloneDefaultSettings()
  }

  const savedSettings = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)

  if (!savedSettings) {
    return cloneDefaultSettings()
  }

  try {
    return normalizeSettings(JSON.parse(savedSettings) as unknown)
  } catch {
    return cloneDefaultSettings()
  }
}

export function saveAiSettings(settings: AiSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    AI_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      analysis: settings.analysis,
      content: settings.content,
      useAnalysisForContent: settings.useAnalysisForContent,
      recommendedTags: settings.recommendedTags,
    }),
  )
}
