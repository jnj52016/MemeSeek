import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MemeStatus } from '@prisma/client';
import { CreateMemeDto } from './dto/create-meme.dto';
import { FindMemesDto } from './dto/find-memes.dto';
import { MemeListResponseDto, MemeResponseDto } from './dto/meme-response.dto';
import { UpdateMemeDto } from './dto/update-meme.dto';
import { MemesService } from './memes.service';
import { MAX_MEME_IMAGE_SIZE } from '../storage/storage.service';
import type { MemeUploadFile } from '../storage/storage.service';

@Controller('memes')
@ApiTags('memes')
@ApiExtraModels(CreateMemeDto)
export class MemesController {
  constructor(private readonly memesService: MemesService) {}

  @Post()
  @ApiOperation({ summary: '新增梗图' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        imageUrl: { type: 'string', example: '/uploads/memes/example.png' },
        title: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, type: MemeResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MEME_IMAGE_SIZE },
      fileFilter: (_request, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  create(
    @Body() dto: CreateMemeDto,
    @UploadedFile() file?: MemeUploadFile,
  ) {
    return this.memesService.create(dto, file);
  }

  @Get()
  @ApiOperation({ summary: '查询梗图列表' })
  @ApiQuery({ name: 'q', required: false, type: String, description: '搜索标题、描述或 OCR 文本' })
  @ApiQuery({ name: 'status', required: false, enum: MemeStatus })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: MemeListResponseDto })
  findAll(@Query() query: FindMemesDto) {
    return this.memesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询单个梗图' })
  @ApiParam({ name: 'id', description: '梗图 ID' })
  @ApiResponse({ status: 200, type: MemeResponseDto })
  @ApiResponse({ status: 404, description: '梗图不存在' })
  findOne(@Param('id') id: string) {
    return this.memesService.findOne(id);
  }

  @Post(':id/open-location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '打开梗图文件所在位置' })
  @ApiParam({ name: 'id', description: '梗图 ID' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean', example: true } } },
  })
  @ApiResponse({ status: 404, description: '梗图或图片文件不存在' })
  openLocation(@Param('id') id: string) {
    return this.memesService.openLocation(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改梗图文字信息' })
  @ApiParam({ name: 'id', description: '梗图 ID' })
  @ApiBody({ type: UpdateMemeDto })
  @ApiResponse({ status: 200, type: MemeResponseDto })
  @ApiResponse({ status: 404, description: '梗图不存在' })
  update(@Param('id') id: string, @Body() dto: UpdateMemeDto) {
    return this.memesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除梗图' })
  @ApiParam({ name: 'id', description: '梗图 ID' })
  @ApiResponse({ status: 200, type: MemeResponseDto })
  @ApiResponse({ status: 404, description: '梗图不存在' })
  remove(@Param('id') id: string) {
    return this.memesService.remove(id);
  }
}
