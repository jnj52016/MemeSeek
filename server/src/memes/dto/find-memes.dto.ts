import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MemeStatus } from '@prisma/client';

export class FindMemesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(MemeStatus)
  status?: MemeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
