import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadAiSettings,
  saveAiSettings,
} from './ai-settings-storage'

describe('ai-settings-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns fixed DeepSeek analysis defaults', () => {
    const settings = loadAiSettings()

    expect(settings.analysis.baseUrl).toBe('https://api.deepseek.com')
    expect(settings.analysis.model).toBe('deepseek-v4-flash-vision-exp')
    expect(settings.content.model).toBe('deepseek-v4-flash-vision-exp')
    expect(settings.useAnalysisForContent).toBe(true)
  })

  it('clears an incompatible legacy provider and API key', () => {
    window.localStorage.setItem(
      'memeseek-ai-settings',
      JSON.stringify({
        apiKey: 'legacy-key',
        model: 'qwen3-vl-plus',
        recommendedTags: ['猫'],
      }),
    )

    const settings = loadAiSettings()

    expect(settings.analysis).toEqual({
      baseUrl: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-v4-flash-vision-exp',
    })
    expect(settings.content.apiKey).toBe('')
    expect(settings.recommendedTags).toEqual(['猫'])
  })

  it('saves only the fixed DeepSeek provider and analysis key', () => {
    saveAiSettings({
      analysis: {
        baseUrl: 'https://proxy.example/v1',
        apiKey: 'analysis-key',
        model: 'gpt-4o',
      },
      content: {
        baseUrl: 'https://proxy.example/v1',
        apiKey: 'content-key',
        model: 'gpt-4o-mini',
      },
      useAnalysisForContent: false,
      recommendedTags: ['tag'],
    })

    expect(loadAiSettings()).toEqual({
      analysis: {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'analysis-key',
        model: 'deepseek-v4-flash-vision-exp',
      },
      content: {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'analysis-key',
        model: 'deepseek-v4-flash-vision-exp',
      },
      useAnalysisForContent: true,
      recommendedTags: ['tag'],
    })
  })
})
