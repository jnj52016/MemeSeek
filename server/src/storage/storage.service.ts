import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

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

  async removeMemeImage(imageUrl: string | null | undefined): Promise<void> {
    if (!imageUrl?.startsWith('/uploads/memes/')) {
      return;
    }

    const fileName = basename(imageUrl.split('?')[0]);
    const filePath = resolve(this.memeUploadDirectory, fileName);

    if (dirname(filePath) !== resolve(this.memeUploadDirectory)) {
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
}
