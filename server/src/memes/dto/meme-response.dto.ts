import { ApiProperty } from '@nestjs/swagger';
import { MediaType, MemeStatus } from '@prisma/client';

export class MemeResponseDto {
  @ApiProperty({ example: 'cmry37yj80000vznobcdlan7m' })
  id!: string;

  @ApiProperty({ example: '/uploads/memes/example.png' })
  imageUrl!: string;

  @ApiProperty({ enum: MediaType, enumName: 'MediaType', example: MediaType.IMAGE })
  mediaType!: MediaType;

  @ApiProperty({ type: String, nullable: true, example: 'image/png' })
  mimeType!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '/uploads/memes/thumbnails/example.jpg', description: '视频或动图封面地址' })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 12.5 })
  duration!: number | null;

  @ApiProperty({ example: '程序员加班', default: '' })
  title!: string;

  @ApiProperty({ example: '用于描述这张梗图', default: '' })
  description!: string;

  @ApiProperty({ example: ['程序员', '加班'], type: [String] })
  tags!: string[];

  @ApiProperty({ example: '', default: '' })
  ocrText!: string;

  @ApiProperty({ example: '', default: '' })
  transcript!: string;

  @ApiProperty({ enum: MemeStatus, enumName: 'MemeStatus', example: MemeStatus.COMPLETED })
  status!: MemeStatus;

  @ApiProperty({ type: String, nullable: true, example: null })
  errorMessage!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class MemeListResponseDto {
  @ApiProperty({ type: [MemeResponseDto] })
  items!: MemeResponseDto[];

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
