export class AiAnalysisError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code:
      | 'AI_API_KEY_REJECTED'
      | 'AI_API_KEY_REQUIRED'
      | 'AI_RATE_LIMITED'
      | 'AI_UPSTREAM_ERROR'
      | 'AI_TIMEOUT'
      | 'INVALID_AI_OUTPUT'
      | 'UNSUPPORTED_ANALYSIS_MEDIA',
    message: string,
  ) {
    super(message);
    this.name = 'AiAnalysisError';
  }
}
