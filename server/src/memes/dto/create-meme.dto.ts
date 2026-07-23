import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemeDto {
  @ApiProperty({ example: '/uploads/memes/example.png' })
  @IsString()
  @IsNotEmpty()
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
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
