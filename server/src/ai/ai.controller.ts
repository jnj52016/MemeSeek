import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AnalyzeMemeDto } from './dto/analyze-meme.dto';
import { MemeResponseDto } from '../memes/dto/meme-response.dto';

@Controller('memes')
@ApiTags('memes-ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':id/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新分析梗图' })
  @ApiParam({ name: 'id', description: '梗图 ID' })
  @ApiHeader({
    name: 'x-ai-api-key',
    required: true,
    description: '当前本地会话使用的 AI API Key，不会保存到数据库',
  })
  @ApiBody({ type: AnalyzeMemeDto })
  @ApiResponse({ status: 200, type: MemeResponseDto })
  @ApiNotFoundResponse({ description: '梗图不存在' })
  async analyze(
    @Param('id') id: string,
    @Headers('x-ai-api-key') apiKey: string | undefined,
    @Body() dto: AnalyzeMemeDto,
  ) {
    if (!apiKey?.trim()) {
      throw new BadRequestException('请先配置 AI API Key');
    }

    return this.aiService.analyzeMeme(id, {
      ...dto,
      apiKey: apiKey.trim(),
    });
  }
}
