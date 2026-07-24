import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MemeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AnalyzeMemeDto } from './dto/analyze-meme.dto';

// 默认使用 OpenAI 视觉模型，也可以通过 AI_MODEL 切换模型。
export const DEFAULT_AI_MODEL = 'gpt-4o';

const DEFAULT_ANALYSIS_PROMPT = `你是一个梗图整理助手。请分析用户提供的图片，并且只返回 JSON，不要返回 Markdown 代码块或额外解释。

JSON 必须严格包含以下字段：
{
  "title": "简短、准确的中文标题",
  "description": "用一句或两句中文描述画面、情绪和适合使用的语境",
  "tags": ["中文标签"],
  "ocrText": "图片中可识别的文字；没有则返回空字符串"
}

要求：
- title、description、ocrText 必须是字符串。
- tags 必须是字符串数组，最多返回 8 个标签，不要带 #。
- 不要编造图片中不存在的文字。
- 输出内容必须是合法 JSON。`;

type MemeAnalysis = {
  title: string;
  description: string;
  tags: string[];
  ocrText: string;
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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async analyzeMeme(id: string, options: AnalyzeMemeOptions) {
    const meme = await this.prisma.meme.findUnique({ where: { id } });

    if (!meme) {
      throw new NotFoundException(`Meme with id "${id}" not found`);
    }

    await this.prisma.meme.update({
      where: { id },
      data: { status: MemeStatus.PROCESSING, errorMessage: null },
    });

    try {
      const imageSource = await this.resolveImageSource(meme.imageUrl);
      const analysis = await this.requestAnalysis(imageSource, meme, options);

      return this.prisma.meme.update({
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

      return this.prisma.meme.update({
        where: { id },
        data: {
          status: MemeStatus.FAILED,
          errorMessage,
        },
      });
    }
  }

  private async resolveImageSource(imageUrl: string): Promise<string> {
    if (/^https?:\/\//i.test(imageUrl)) {
      return imageUrl;
    }

    const image = await this.storage.readMemeImage(imageUrl);
    return `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;
  }

  private async requestAnalysis(
    imageSource: string,
    meme: { title: string; description: string },
    options: AnalyzeMemeOptions,
  ): Promise<MemeAnalysis> {
    const baseUrl = process.env.AI_BASE_URL?.replace(/\/$/, '');

    if (!baseUrl) {
      throw new Error(
        '未配置 AI_BASE_URL。请配置支持图片输入的 OpenAI 兼容模型接口。',
      );
    }

    const model =
      options.model?.trim() || process.env.AI_MODEL || DEFAULT_AI_MODEL;
    const recommendedTags =
      options.recommendedTags?.filter(Boolean).join('、') || '无';
    const userPrompt = `请分析这张梗图。当前已有标题：${meme.title || '无'}；当前已有描述：${meme.description || '无'}；推荐标签：${recommendedTags}。请按照系统提示词返回 JSON。`;
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
              { type: 'image_url', image_url: { url: imageSource } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const payload = (await response.json().catch(() => undefined)) as
      ChatCompletionResponse | undefined;

    if (!response.ok) {
      throw new Error(
        payload?.error?.message
          ? `AI 请求失败：${payload.error.message}`
          : `AI 请求失败（HTTP ${response.status}）`,
      );
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('AI 返回了空内容');
    }

    return this.parseAnalysis(content);
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message.slice(0, 500);
    }

    return 'AI 分析失败，请稍后重试';
  }
}
