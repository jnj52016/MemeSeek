/** AI provider settings kept locally for this personal application. */
export type AiProviderSettings = {
  /** OpenAI-compatible base URL, without /chat/completions. */
  baseUrl: string
  model: string
  apiKey: string
}

export type AiSettings = {
  /** Vision model used to inspect uploaded memes. */
  analysis: AiProviderSettings
  /** Text model reserved for future content generation features. */
  content: AiProviderSettings
  /** Reuse the analysis provider for content features when enabled. */
  useAnalysisForContent: boolean
  /** Tags sent to the analysis prompt as suggestions. */
  recommendedTags: string[]
}
