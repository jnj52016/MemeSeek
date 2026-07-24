import {
  BadRequestException,
  NotFoundException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

export const MAX_MEME_IMAGE_SIZE = 10 * 1024 * 1024;

export type MemeUploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const IMAGE_MIME_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_EXTENSIONS).map(([mimeType, extension]) => [extension, mimeType]),
);

@Injectable()
export class StorageService {
  private readonly memeUploadDirectory = join(
    __dirname,
    '..',
    '..',
    'uploads',
    'memes',
  );

  async saveMemeImage(file: MemeUploadFile): Promise<string> {
    if (!file?.buffer || !file.mimetype) {
      throw new BadRequestException('请上传图片文件');
    }

    if (file.size > MAX_MEME_IMAGE_SIZE) {
      throw new PayloadTooLargeException('图片大小不能超过 10MB');
    }

    const extension = IMAGE_EXTENSIONS[file.mimetype.toLowerCase()];

    if (!extension) {
      throw new BadRequestException('仅支持 JPG、PNG、GIF 或 WebP 图片');
    }

    await mkdir(this.memeUploadDirectory, { recursive: true });

    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(this.memeUploadDirectory, fileName);

    await writeFile(filePath, file.buffer, { flag: 'wx' });

    return `/uploads/memes/${fileName}`;
  }

  async readMemeImage(imageUrl: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const filePath = this.resolveMemeImagePath(imageUrl);

    if (!filePath) {
      throw new BadRequestException('只能分析本地上传的梗图图片');
    }

    try {
      const buffer = await readFile(filePath);
      const extension = extname(filePath).slice(1).toLowerCase();
      const mimeType = IMAGE_MIME_TYPES[extension];

      if (!mimeType) {
        throw new BadRequestException('不支持的梗图图片格式');
      }

      return { buffer, mimeType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('梗图图片文件不存在');
      }

      throw error;
    }
  }

  async removeMemeImage(imageUrl: string | null | undefined): Promise<void> {
    const filePath = this.resolveMemeImagePath(imageUrl);

    if (!filePath) {
      return;
    }

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private resolveMemeImagePath(imageUrl: string | null | undefined): string | null {
    if (!imageUrl?.startsWith('/uploads/memes/')) {
      return null;
    }

    const fileName = basename(imageUrl.split('?')[0]);
    const filePath = resolve(this.memeUploadDirectory, fileName);

    if (dirname(filePath) !== resolve(this.memeUploadDirectory)) {
      return null;
    }

    return filePath;
  }
}
