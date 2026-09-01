import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MemeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  isAnimatedImageMimeType,
  StorageService,
} from '../storage/storage.service';
import type { AnalyzeMemeDto } from './dto/analyze-meme.dto';
import { LocalAnalysisSourceMediaType } from './dto/analyze-local-media.dto';
import { AiAnalysisError } from './ai-analysis.error';

// 默认使用 OpenAI 视觉模型，也可以通过 AI_MODEL 切换模型。
export const DEFAULT_AI_MODEL = 'gpt-4o';
const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';

const AI_REQUEST_TIMEOUT_MS = 120_000;
const AI_NETWORK_MAX_ATTEMPTS = 2;
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const DEFAULT_ANALYSIS_PROMPT = `你是一个梗图和短视频素材整理助手。请分析用户提供的一张图片；视频和动图均使用浏览器生成的第一帧 JPEG 封面，并且只返回 JSON，不要返回 Markdown 代码块或额外解释。

JSON 必须严格包含以下字段：
{
  "title": "简短、准确的中文标题",
  "description": "用一句或两句中文描述画面、情绪、变化和适合使用的语境",
  "tags": ["中文标签"],
  "ocrText": "画面中可识别的文字；没有则返回空字符串"
}

要求：
- title、description、ocrText 必须是字符串。
- tags 必须是字符串数组，最多返回 8 个标签，不要带 #。
- 不要编造画面中不存在的文字或内容。
- 输出内容必须是合法 JSON。`;

type MemeAnalysis = {
  title: string;
  description: string;
  tags: string[];
  ocrText: string;
};

type AnalysisImage = {
  url: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

type AnalyzeMemeOptions = AnalyzeMemeDto & {
  apiKey: string;
};

type AiRequestOptions = AnalyzeMemeOptions;

type AnalyzeLocalImageOptions = AiRequestOptions & {
  buffer: Buffer;
  mimeType: string;
  sourceMediaType: LocalAnalysisSourceMediaType;
  title: string;
  description: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly storage?: StorageService,
  ) {}

  async analyzeMeme(id: string, options: AnalyzeMemeOptions) {
    const meme = await this.getPrisma().meme.findUnique({ where: { id } });

    if (!meme) {
      throw new NotFoundException(`Meme with id "${id}" not found`);
    }

    await this.getPrisma().meme.update({
      where: { id },
      data: { status: MemeStatus.PROCESSING, errorMessage: null },
    });

    try {
      const imageSources = await this.resolveAnalysisImages(meme);
      const analysis = await this.requestAnalysis(imageSources, meme, options);

      return this.getPrisma().meme.update({
        where: { id },
        data: {
          title: analysis.title,
          description: analysis.description,
          tags: analysis.tags,
          ocrText: analysis.ocrText,
          status: MemeStatus.COMPLETED,
          errorMessage: null,
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn(`Meme ${id} AI analysis failed: ${errorMessage}`);

      return this.getPrisma().meme.update({
        where: { id },
        data: {
          status: MemeStatus.FAILED,
          errorMessage,
        },
      });
    }
  }

  /**
   * Uses an in-memory image supplied by the browser. This path deliberately
   * does not read or write a database record or the server upload directory.
   */
  async analyzeLocalImage(options: AnalyzeLocalImageOptions): Promise<MemeAnalysis> {
    const mimeType = options.mimeType.toLowerCase();
    const mediaType =
      options.sourceMediaType === LocalAnalysisSourceMediaType.VIDEO_FIRST_FRAME
        ? 'VIDEO'
        : 'IMAGE';
    const promptMimeType =
      options.sourceMediaType ===
      LocalAnalysisSourceMediaType.ANIMATED_IMAGE_FIRST_FRAME
        ? 'image/gif'
        : mimeType;

    return this.requestAnalysis(
      [
        {
          url: `data:${mimeType};base64,${options.buffer.toString('base64')}`,
        },
      ],
      {
        title: options.title,
        description: options.description,
        mediaType,
        mimeType: promptMimeType,
      },
      options,
      true,
    );
  }

  private async resolveAnalysisImages(meme: {
    imageUrl: string;
    mediaType?: string | null;
    mimeType?: string | null;
    thumbnailUrl?: string | null;
  }): Promise<AnalysisImage[]> {
    const isAnimatedImage =
      meme.mediaType === 'IMAGE' && isAnimatedImageMimeType(meme.mimeType);
    const needsFirstFrame = meme.mediaType === 'VIDEO' || isAnimatedImage;

    if (needsFirstFrame && meme.thumbnailUrl) {
      return [{ url: await this.resolveImageSource(meme.thumbnailUrl) }];
    }

    if (needsFirstFrame) {
      throw new BadRequestException(
        '视频或动图缺少浏览器生成的首帧封面，请重新上传该文件',
      );
    }

    return [{ url: await this.resolveImageSource(meme.imageUrl) }];
  }

  private async resolveImageSource(imageUrl: string): Promise<string> {
    if (/^https?:\/\//i.test(imageUrl)) {
      return imageUrl;
    }

    const image = await this.getStorage().readMemeImage(imageUrl);
    return `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;
  }

  private async requestAnalysis(
    imageSources: AnalysisImage[],
    meme: {
      title: string;
      description: string;
      mediaType?: string | null;
      mimeType?: string | null;
    },
    options: AiRequestOptions,
    mapErrorsForApi = false,
  ): Promise<MemeAnalysis> {
    const configuredBaseUrl =
      options.baseUrl?.trim() || process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
    const baseUrl = configuredBaseUrl?.replace(/\/$/, '');

    if (!baseUrl) {
      throw new Error(
        '未配置 AI_BASE_URL。请配置支持图片输入的 OpenAI 兼容模型接口。',
      );
    }

    this.assertAllowedAiBaseUrl(baseUrl);

    const model =
      options.model?.trim() || process.env.AI_MODEL || DEFAULT_AI_MODEL;
    const recommendedTags =
      options.recommendedTags?.filter(Boolean).join('、') || '无';
    const isAnimatedImage =
      meme.mediaType === 'IMAGE' && isAnimatedImageMimeType(meme.mimeType);
    const userPrompt =
      meme.mediaType === 'VIDEO'
        ? `请分析这段视频的第一帧画面。请概括画面主体、可见动作线索、情绪和适合使用的语境。当前已有标题：${meme.title || '无'}；当前已有描述：${meme.description || '无'}；推荐标签：${recommendedTags}。请按照系统提示词返回 JSON。`
        : isAnimatedImage
          ? `请分析这张动图的第一帧画面。请概括画面主体、可见动作线索、情绪和适合使用的语境。当前已有标题：${meme.title || '无'}；当前已有描述：${meme.description || '无'}；推荐标签：${recommendedTags}。请按照系统提示词返回 JSON。`
          : `请分析这张梗图。当前已有标题：${meme.title || '无'}；当前已有描述：${meme.description || '无'}；推荐标签：${recommendedTags}。请按照系统提示词返回 JSON。`;
    let response: Response;

    try {
      response = await this.fetchWithNetworkRetry(
        `${baseUrl}/chat/completions`,
        {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: DEFAULT_ANALYSIS_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                ...imageSources.map((image) => ({
                  type: 'image_url' as const,
                  image_url: { url: image.url },
                })),
              ],
            },
          ],
        }),
        },
      );
    } catch (error) {
      if (!mapErrorsForApi) {
        throw error;
      }

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        throw new AiAnalysisError(504, 'AI_TIMEOUT', 'AI 分析超时，请稍后重试。');
      }

      throw new AiAnalysisError(
        502,
        'AI_UPSTREAM_ERROR',
        'AI 服务暂时不可用，请稍后重试。',
      );
    }

    const payload = (await response.json().catch(() => undefined)) as
      ChatCompletionResponse | undefined;

    if (!response.ok) {
      if (!mapErrorsForApi) {
        throw new Error(
          payload?.error?.message
            ? `AI 请求失败：${payload.error.message}`
            : `AI 请求失败（HTTP ${response.status}）`,
        );
      }

      const message = 'AI 服务请求失败，请稍后重试。';

      if (response.status === 401 || response.status === 403) {
        throw new AiAnalysisError(
          401,
          'AI_API_KEY_REJECTED',
          'AI API Key 无效或被拒绝。',
        );
      }

      if (response.status === 429) {
        throw new AiAnalysisError(
          429,
          'AI_RATE_LIMITED',
          'AI 请求过于频繁，请稍后重试。',
        );
      }

      throw new AiAnalysisError(502, 'AI_UPSTREAM_ERROR', message);
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('AI 返回了空内容');
    }

    try {
      return this.parseAnalysis(content);
    } catch (error) {
      if (!mapErrorsForApi) {
        throw error;
      }

      throw new AiAnalysisError(
        422,
        'INVALID_AI_OUTPUT',
        'AI 返回的数据格式不正确，请重试。',
      );
    }
  }

  private assertAllowedAiBaseUrl(baseUrl: string) {
    let normalizedBaseUrl: string;

    try {
      const url = new URL(baseUrl);
      if (url.protocol !== 'https:') {
        throw new Error('AI 服务地址必须使用 HTTPS。');
      }
      normalizedBaseUrl = url.toString().replace(/\/$/, '');
    } catch (error) {
      if (error instanceof Error && error.message === 'AI 服务地址必须使用 HTTPS。') {
        throw error;
      }
      throw new BadRequestException('AI 服务地址格式不正确。');
    }

    const allowedBaseUrls = [
      DEFAULT_AI_BASE_URL,
      process.env.AI_BASE_URL,
      ...(process.env.AI_ALLOWED_BASE_URLS?.split(',') ?? []),
    ]
      .map((value) => value?.trim().replace(/\/$/, ''))
      .filter((value): value is string => Boolean(value));

    if (!allowedBaseUrls.includes(normalizedBaseUrl)) {
      throw new BadRequestException(
        '当前 AI 服务地址未被服务器允许，请联系部署者配置白名单。',
      );
    }
  }

  private getPrisma(): PrismaService {
    if (!this.prisma) {
      throw new Error('当前服务仅启用了本地媒体 AI 分析，不支持旧梗图数据库接口。');
    }
    return this.prisma;
  }

  private getStorage(): StorageService {
    if (!this.storage) {
      throw new Error('当前服务仅启用了本地媒体 AI 分析，不支持旧文件存储接口。');
    }
    return this.storage;
  }

  private parseAnalysis(content: string): MemeAnalysis {
    const jsonText = content
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    let value: unknown;

    try {
      value = JSON.parse(jsonText);
    } catch {
      throw new Error('AI 返回的内容不是合法 JSON');
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('AI 返回的 JSON 结构无效');
    }

    const result = value as Record<string, unknown>;
    const title = typeof result.title === 'string' ? result.title.trim() : '';
    const description =
      typeof result.description === 'string' ? result.description.trim() : '';
    const ocrText =
      typeof result.ocrText === 'string' ? result.ocrText.trim() : '';
    const tags = Array.isArray(result.tags)
      ? result.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (
      !title ||
      typeof result.description !== 'string' ||
      !Array.isArray(result.tags)
    ) {
      throw new Error('AI 返回的 JSON 缺少合法的 title、description 或 tags');
    }

    return {
      title,
      description,
      tags: [...new Set(tags)],
      ocrText,
    };
  }

  private async fetchWithNetworkRetry(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= AI_NETWORK_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        const shouldRetry =
          attempt < AI_NETWORK_MAX_ATTEMPTS &&
          this.isRetryableNetworkError(error);

        if (!shouldRetry) {
          throw error;
        }

        this.logger.warn(
          `AI request network failure, retrying once: ${this.getErrorMessage(error)}`,
        );
      }
    }

    throw new Error('AI 网络请求失败');
  }

  private isRetryableNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return true;
      }

      if (error instanceof TypeError && error.message === 'fetch failed') {
        return true;
      }
    }

    return this.collectErrorCodes(error).some((code) =>
      RETRYABLE_NETWORK_ERROR_CODES.has(code),
    );
  }

  private collectErrorCodes(error: unknown): string[] {
    const codes = new Set<string>();
    const visited = new Set<object>();

    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object' || visited.has(value)) {
        return;
      }

      visited.add(value);
      const errorRecord = value as Record<string, unknown>;

      if (typeof errorRecord.code === 'string') {
        codes.add(errorRecord.code);
      }

      visit(errorRecord.cause);

      if (Array.isArray(errorRecord.errors)) {
        errorRecord.errors.forEach(visit);
      }
    };

    visit(error);
    return [...codes];
  }

  private getErrorDiagnostics(error: unknown): string {
    const diagnostics = new Set<string>();
    const visited = new Set<object>();

    const visit = (value: unknown, isRoot = false) => {
      if (!value || typeof value !== 'object' || visited.has(value)) {
        return;
      }

      visited.add(value);
      const errorRecord = value as Record<string, unknown>;
      const parts: string[] = [];

      if (typeof errorRecord.code === 'string') {
        parts.push(errorRecord.code);
      } else if (
        isRoot &&
        typeof errorRecord.name === 'string' &&
        ['AbortError', 'TimeoutError'].includes(errorRecord.name)
      ) {
        parts.push(errorRecord.name);
      }

      if (typeof errorRecord.syscall === 'string') {
        parts.push(errorRecord.syscall);
      }

      if (typeof errorRecord.address === 'string') {
        const address =
          typeof errorRecord.port === 'number'
            ? `${errorRecord.address}:${errorRecord.port}`
            : errorRecord.address;
        parts.push(address);
      }

      if (parts.length > 0) {
        diagnostics.add(parts.join(' '));
      }

      visit(errorRecord.cause);

      if (Array.isArray(errorRecord.errors)) {
        errorRecord.errors.forEach((nestedError) => visit(nestedError));
      }
    };

    visit(error, true);
    return [...diagnostics].slice(0, 5).join('; ');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      const diagnostics = this.getErrorDiagnostics(error);
      const message = diagnostics
        ? `${error.message} (${diagnostics})`
        : error.message;

      return message.slice(0, 500);
    }

    return 'AI 分析失败，请稍后重试';
  }
}
