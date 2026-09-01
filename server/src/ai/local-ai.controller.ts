import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AiService } from './ai.service';
import { AiAnalysisError } from './ai-analysis.error';
import {
  AnalyzeLocalMediaDto,
  LocalAnalysisSourceMediaType,
} from './dto/analyze-local-media.dto';

type MemoryUpload = { buffer: Buffer; mimetype: string; size: number };

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasSupportedImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  return (
    mimeType === 'image/webp' &&
    buffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
    buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
  );
}

@Controller('v1/ai')
@ApiTags('local-ai')
export class LocalAiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Temporarily analyze a local image without persistence' })
  @ApiHeader({ name: 'x-ai-api-key', required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'sourceMediaType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        sourceMediaType: { type: 'string', enum: Object.values(LocalAnalysisSourceMediaType) },
        currentTitle: { type: 'string' },
        currentDescription: { type: 'string' },
        baseUrl: { type: 'string', format: 'uri' },
        model: { type: 'string' },
        recommendedTags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 200 })
  async analyze(
    @UploadedFile() file: MemoryUpload | undefined,
    @Headers('x-ai-api-key') apiKey: string | undefined,
    @Body() dto: AnalyzeLocalMediaDto,
  ) {
    if (!apiKey?.trim()) {
      throw new AiAnalysisError(
        HttpStatus.UNAUTHORIZED,
        'AI_API_KEY_REQUIRED',
        '请先填写有效的 DeepSeek API Key。',
      );
    }

    if (
      !file?.buffer?.length ||
      !ACCEPTED_IMAGE_TYPES.has(file.mimetype) ||
      !hasSupportedImageSignature(file.buffer, file.mimetype)
    ) {
      throw new AiAnalysisError(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        'UNSUPPORTED_ANALYSIS_MEDIA',
        '仅支持 JPEG、PNG、WebP 图片或 JPEG 首帧封面。',
      );
    }

    return this.aiService.analyzeLocalImage({
      buffer: file.buffer,
      mimeType: file.mimetype,
      sourceMediaType: dto.sourceMediaType,
      title: dto.currentTitle ?? '',
      description: dto.currentDescription ?? '',
      apiKey: apiKey.trim(),
      baseUrl: dto.baseUrl,
      model: dto.model,
      recommendedTags: dto.recommendedTags,
    });
  }
}
