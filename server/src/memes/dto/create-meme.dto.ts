import {
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemeDto {
  @ApiPropertyOptional({ example: '/uploads/memes/example.png' })
  @IsString()
  @IsOptional()
  imageUrl!: string;

  @ApiPropertyOptional({ example: '程序员加班' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '用于描述这张梗图' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['程序员', '加班'], type: [String] })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? value : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
