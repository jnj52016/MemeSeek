import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemeDto {
  @ApiPropertyOptional({ example: '程序员加班更新' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '更新后的描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['程序员', '工作'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
