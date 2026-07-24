import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadAiSettings,
  saveAiSettings,
} from './ai-settings-storage'

describe('ai-settings-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns separate OpenAI analysis and content defaults', () => {
    const settings = loadAiSettings()

    expect(settings.analysis.baseUrl).toBe('https://api.openai.com/v1')
    expect(settings.analysis.model).toBe('gpt-4o')
    expect(settings.content.model).toBe('gpt-4o-mini')
    expect(settings.useAnalysisForContent).toBe(true)
  })

  it('migrates the legacy single AI setting to analysis settings', () => {
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
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'legacy-key',
      model: 'gpt-4o',
    })
    expect(settings.content.apiKey).toBe('')
    expect(settings.recommendedTags).toEqual(['猫'])
  })

  it('saves both provider settings', () => {
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
  })
})
