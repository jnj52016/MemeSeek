import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export enum LocalAnalysisSourceMediaType {
  IMAGE = 'IMAGE',
  VIDEO_FIRST_FRAME = 'VIDEO_FIRST_FRAME',
  ANIMATED_IMAGE_FIRST_FRAME = 'ANIMATED_IMAGE_FIRST_FRAME',
}

export class AnalyzeLocalMediaDto {
  @ApiProperty({ enum: LocalAnalysisSourceMediaType })
  @IsEnum(LocalAnalysisSourceMediaType)
  sourceMediaType!: LocalAnalysisSourceMediaType;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentTitle?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  currentDescription?: string;

  @ApiPropertyOptional({ example: 'https://api.deepseek.com' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'deepseek-v4-flash-vision-exp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    if (value === undefined) return value;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  recommendedTags?: string[];
}
