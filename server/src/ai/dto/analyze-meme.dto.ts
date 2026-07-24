import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeMemeDto {
  @ApiPropertyOptional({ example: 'deepseek-v4-flash' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: ['猫', '动物', '吐槽'], type: [String] })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    const normalizedValue = value as unknown;
    return normalizedValue === undefined
      ? normalizedValue
      : Array.isArray(normalizedValue)
        ? normalizedValue
        : [normalizedValue];
  })
  @IsArray()
  @IsString({ each: true })
  recommendedTags?: string[];
}
