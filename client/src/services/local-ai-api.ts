import { API_BASE_URL } from './api-client'

export type LocalAiAnalysis = {
  title: string
  description: string
  tags: string[]
  ocrText: string
}

export type AnalyzeLocalMediaInput = {
  file: File
  sourceMediaType: 'IMAGE' | 'VIDEO_FIRST_FRAME' | 'ANIMATED_IMAGE_FIRST_FRAME'
  currentTitle: string
  currentDescription: string
  recommendedTags: string[]
  baseUrl?: string
  model?: string
  apiKey: string
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return fallback
  }

  const { message } = payload as { message?: unknown }
  return Array.isArray(message) ? message.join('；') : String(message ?? fallback)
}

export async function analyzeLocalMedia(
  input: AnalyzeLocalMediaInput,
): Promise<LocalAiAnalysis> {
  if (!input.apiKey.trim()) {
    throw new Error('请先在 AI 设置中填写 DeepSeek API Key。')
  }

  const body = new FormData()
  body.append('file', input.file, input.file.name)
  body.append('sourceMediaType', input.sourceMediaType)
  body.append('currentTitle', input.currentTitle)
  body.append('currentDescription', input.currentDescription)
  for (const tag of input.recommendedTags) {
    body.append('recommendedTags', tag)
  }

  if (input.baseUrl?.trim()) body.append('baseUrl', input.baseUrl.trim())
  if (input.model?.trim()) body.append('model', input.model.trim())

  const response = await fetch(`${API_BASE_URL}/v1/ai/analyze`, {
    method: 'POST',
    headers: { 'x-ai-api-key': input.apiKey.trim() },
    body,
  })
  const payload: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, `AI 分析请求失败（HTTP ${response.status}）`))
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as { title?: unknown }).title !== 'string' ||
    typeof (payload as { description?: unknown }).description !== 'string' ||
    !Array.isArray((payload as { tags?: unknown }).tags) ||
    typeof (payload as { ocrText?: unknown }).ocrText !== 'string'
  ) {
    throw new Error('AI 分析接口返回了无效结果。')
  }

  const result = payload as LocalAiAnalysis
  return {
    title: result.title,
    description: result.description,
    tags: result.tags.filter((tag): tag is string => typeof tag === 'string'),
    ocrText: result.ocrText,
  }
}
