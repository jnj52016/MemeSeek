import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MemeStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindMemesDto {
  @ApiPropertyOptional({ example: '程序员' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: MemeStatus, enumName: 'MemeStatus' })
  @IsOptional()
  @IsEnum(MemeStatus)
  status?: MemeStatus;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
