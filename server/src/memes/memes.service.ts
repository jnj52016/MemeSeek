import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMemeDto } from './dto/create-meme.dto';
import { FindMemesDto } from './dto/find-memes.dto';
import { UpdateMemeDto } from './dto/update-meme.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMemeDto) {
    return this.prisma.meme.create({
      data: {
        imageUrl: dto.imageUrl,
        title: dto.title,
        description: dto.description,
        tags: dto.tags,
      },
    });
  }

  async findAll(query: FindMemesDto) {
    const search = query.q?.trim();
    const where: Prisma.MemeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { ocrText: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.meme.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.meme.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string) {
    const meme = await this.prisma.meme.findUnique({ where: { id } });

    if (!meme) {
      throw new NotFoundException(`Meme with id "${id}" not found`);
    }

    return meme;
  }

  async update(id: string, dto: UpdateMemeDto) {
    await this.findOne(id);

    return this.prisma.meme.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.meme.delete({ where: { id } });
  }
}
