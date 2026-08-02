import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { exec, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';

export const MEME_UPLOAD_DIRECTORY = join(
  __dirname,
  '..',
  '..',
  'uploads',
  'memes',
);

export const MAX_MEME_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_MEME_THUMBNAIL_SIZE = 2 * 1024 * 1024;

function getMaxVideoSize() {
  const configuredSizeInMb = Number(process.env.MEME_VIDEO_MAX_SIZE_MB ?? 500);

  return Number.isFinite(configuredSizeInMb) && configuredSizeInMb > 0
    ? configuredSizeInMb * 1024 * 1024
    : 500 * 1024 * 1024;
}

export const MAX_MEME_VIDEO_SIZE = getMaxVideoSize();
export const MAX_MEME_UPLOAD_SIZE = Math.max(
  MAX_MEME_IMAGE_SIZE,
  MAX_MEME_VIDEO_SIZE,
);

export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export const ANIMATED_IMAGE_MIME_TYPES = new Set([
  'image/gif',
  'image/webp',
]);

export function isAnimatedImageMimeType(mimeType: string | null | undefined) {
  return ANIMATED_IMAGE_MIME_TYPES.has(mimeType?.toLowerCase() ?? '');
}

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/gif': ['gif'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
};

export type MemeMediaType = 'IMAGE' | 'VIDEO';

export type MemeUploadFile = {
  buffer?: Buffer;
  path?: string;
  originalname?: string;
  mimetype?: string;
  size: number;
};

export type SavedMemeMedia = {
  mediaUrl: string;
  mediaType: MemeMediaType;
  mimeType: string;
  thumbnailUrl: string | null;
  duration: number | null;
};

const IMAGE_MIME_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_EXTENSIONS).map(([mimeType, extension]) => [
    extension,
    mimeType,
  ]),
);

export function getMemeExtension(mimeType: string | undefined) {
  const normalizedMimeType = mimeType?.toLowerCase();

  return (
    IMAGE_EXTENSIONS[normalizedMimeType ?? ''] ??
    VIDEO_EXTENSIONS[normalizedMimeType ?? '']
  );
}

export function getMemeMediaType(
  mimeType: string | undefined,
): MemeMediaType | null {
  const normalizedMimeType = mimeType?.toLowerCase();

  if (normalizedMimeType && IMAGE_EXTENSIONS[normalizedMimeType]) {
    return 'IMAGE';
  }

  if (normalizedMimeType && VIDEO_EXTENSIONS[normalizedMimeType]) {
    return 'VIDEO';
  }

  return null;
}

export function createMemeUploadStorage() {
  return diskStorage({
    destination: (_request, _file, callback) => {
      void mkdir(MEME_UPLOAD_DIRECTORY, { recursive: true })
        .then(() => callback(null, MEME_UPLOAD_DIRECTORY))
        .catch((error: unknown) => callback(error as Error, MEME_UPLOAD_DIRECTORY));
    },
    filename: (_request, file, callback) => {
      const extension = getMemeExtension(file.mimetype) ?? 'bin';
      callback(null, `${randomUUID()}.${extension}`);
    },
  });
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly memeUploadDirectory = MEME_UPLOAD_DIRECTORY;

  async onModuleInit() {
    await mkdir(this.memeUploadDirectory, { recursive: true });
  }

  async saveMemeFile(
    file: MemeUploadFile,
    thumbnailFile?: MemeUploadFile,
  ): Promise<SavedMemeMedia> {
    let mimeType = file?.mimetype?.toLowerCase();
    const mediaType = getMemeMediaType(mimeType);
    let extension = getMemeExtension(mimeType);

    if (!file || !mimeType || !mediaType || !extension) {
      await this.removeUploadedFile(file);
      await this.removeUploadedFile(thumbnailFile);
      throw new BadRequestException(
        '仅支持 JPG、PNG、GIF、WebP、MP4、WebM 或 MOV 文件',
      );
    }

    const originalExtension = file.originalname
      ?.split('.')
      .pop()
      ?.toLowerCase();

    const isImageExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
      originalExtension ?? '',
    );

    if (
      originalExtension &&
      !ALLOWED_EXTENSIONS[mimeType]?.includes(originalExtension) &&
      !(mediaType === 'IMAGE' && isImageExtension)
    ) {
      await this.removeUploadedFile(file);
      await this.removeUploadedFile(thumbnailFile);
      throw new BadRequestException('文件扩展名与媒体类型不匹配');
    }

    const maxSize =
      mediaType === 'VIDEO' ? MAX_MEME_VIDEO_SIZE : MAX_MEME_IMAGE_SIZE;

    if (file.size > maxSize) {
      await this.removeUploadedFile(file);
      await this.removeUploadedFile(thumbnailFile);
      throw new PayloadTooLargeException(
        mediaType === 'VIDEO'
          ? `视频大小不能超过 ${Math.round(MAX_MEME_VIDEO_SIZE / 1024 / 1024)}MB`
          : '图片大小不能超过 10MB',
      );
    }

    await mkdir(this.memeUploadDirectory, { recursive: true });

    let filePath = await this.resolveUploadedFilePath(file, extension);
    let thumbnailPath: string | null = null;

    try {
      const detectedImageMimeType = await this.detectImageMimeType(filePath);

      if (mediaType === 'IMAGE' && detectedImageMimeType) {
        mimeType = detectedImageMimeType;
        extension = getMemeExtension(mimeType) ?? extension;
        filePath = await this.normalizeMediaFileExtension(filePath, extension);
      }

      const mediaUrl = this.toMemeUrl(filePath);

      if (thumbnailFile) {
        if (
          (mediaType !== 'IMAGE' && mediaType !== 'VIDEO') ||
          thumbnailFile.mimetype?.toLowerCase() !== 'image/jpeg'
        ) {
          await this.removeUploadedFile(thumbnailFile);
          throw new BadRequestException('封面必须是 JPEG 图片');
        }

        if (thumbnailFile.size > MAX_MEME_THUMBNAIL_SIZE) {
          await this.removeUploadedFile(thumbnailFile);
          throw new PayloadTooLargeException('封面大小不能超过 2MB');
        }
      }

      if (mediaType === 'VIDEO') {
        if (!thumbnailFile) {
          throw new BadRequestException(
            '视频必须提供浏览器生成的 JPEG 首帧封面，请重新上传',
          );
        }

        thumbnailPath = await this.saveUploadedThumbnail(thumbnailFile);

        return {
          mediaUrl,
          mediaType,
          mimeType,
          thumbnailUrl: this.toMemeUrl(thumbnailPath),
          duration: null,
        };
      }

      if (isAnimatedImageMimeType(mimeType)) {
        if (!thumbnailFile) {
          throw new BadRequestException(
            '动图必须提供浏览器生成的 JPEG 首帧封面，请重新上传',
          );
        }

        thumbnailPath = await this.saveUploadedThumbnail(thumbnailFile);

        return {
          mediaUrl,
          mediaType,
          mimeType,
          thumbnailUrl: thumbnailPath
            ? this.toMemeUrl(thumbnailPath)
            : null,
          duration: null,
        };
      }

      await this.removeUploadedFile(thumbnailFile);

      return {
        mediaUrl,
        mediaType,
        mimeType,
        thumbnailUrl: null,
        duration: null,
      };
    } catch (error) {
      await this.removeFile(filePath);

      if (thumbnailPath) {
        await this.removeFile(thumbnailPath);
      }

      await this.removeUploadedFile(thumbnailFile);

      throw error;
    }
  }

  async readMemeImage(imageUrl: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const filePath = this.resolveMemePath(imageUrl);

    if (!filePath) {
      throw new BadRequestException('只能分析本地上传的图片');
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

  async removeMemeMedia(
    mediaUrl: string | null | undefined,
    thumbnailUrl?: string | null,
  ): Promise<void> {
    await Promise.all([
      this.removeFileByUrl(mediaUrl),
      this.removeFileByUrl(thumbnailUrl),
    ]);
  }

  async removeMemeImage(imageUrl: string | null | undefined): Promise<void> {
    await this.removeMemeMedia(imageUrl);
  }

  async openMemeMediaLocation(mediaUrl: string): Promise<void> {
    const filePath = this.resolveMemePath(mediaUrl);

    if (!filePath) {
      throw new BadRequestException('只能打开本地上传的媒体文件所在位置');
    }

    try {
      await stat(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('梗图媒体文件不存在');
      }

      throw error;
    }

    try {
      if (process.platform === 'win32') {
        await this.launchWindowsExplorer(filePath);
        return;
      }

      if (process.platform === 'darwin') {
        await this.launchFileManager('open', ['-R', filePath]);
        return;
      }

      if (process.platform === 'linux') {
        await this.launchFileManager('xdg-open', [dirname(filePath)]);
        return;
      }
    } catch {
      throw new ServiceUnavailableException(
        '无法打开媒体文件所在位置，请检查当前系统的文件管理器',
      );
    }

    throw new ServiceUnavailableException('当前系统不支持打开媒体文件所在位置');
  }

  async openMemeImageLocation(imageUrl: string): Promise<void> {
    await this.openMemeMediaLocation(imageUrl);
  }

  private async resolveUploadedFilePath(
    file: MemeUploadFile,
    extension: string,
  ): Promise<string> {
    if (file.path) {
      const filePath = resolve(file.path);

      if (!this.isInsideUploadDirectory(filePath)) {
        throw new BadRequestException('上传文件路径无效');
      }

      return filePath;
    }

    if (!file.buffer) {
      throw new BadRequestException('上传文件内容为空');
    }

    const filePath = join(this.memeUploadDirectory, `${randomUUID()}.${extension}`);
    await writeFile(filePath, file.buffer, { flag: 'wx' });
    return filePath;
  }

  private async detectImageMimeType(filePath: string): Promise<string | null> {
    const fileHandle = await open(filePath, 'r');

    try {
      const header = Buffer.alloc(12);
      await fileHandle.read(header, 0, header.length, 0);

      if (header.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) {
        return 'image/gif';
      }

      if (
        header.subarray(0, 4).toString('ascii') === 'RIFF' &&
        header.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        return 'image/webp';
      }

      if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
        return 'image/jpeg';
      }

      if (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47 &&
        header[4] === 0x0d &&
        header[5] === 0x0a &&
        header[6] === 0x1a &&
        header[7] === 0x0a
      ) {
        return 'image/png';
      }

      return null;
    } finally {
      await fileHandle.close();
    }
  }

  private async normalizeMediaFileExtension(
    filePath: string,
    extension: string,
  ): Promise<string> {
    if (extname(filePath).slice(1).toLowerCase() === extension) {
      return filePath;
    }

    const normalizedPath = join(
      dirname(filePath),
      `${basename(filePath, extname(filePath))}.${extension}`,
    );
    await rename(filePath, normalizedPath);
    return normalizedPath;
  }

  private async saveUploadedThumbnail(file: MemeUploadFile): Promise<string> {
    const thumbnailDirectory = join(this.memeUploadDirectory, 'thumbnails');
    const thumbnailPath = join(thumbnailDirectory, `${randomUUID()}.jpg`);

    await mkdir(thumbnailDirectory, { recursive: true });

    if (file.path) {
      const filePath = resolve(file.path);

      if (!this.isInsideUploadDirectory(filePath)) {
        throw new BadRequestException('上传封面路径无效');
      }

      await rename(filePath, thumbnailPath);
      return thumbnailPath;
    }

    if (!file.buffer) {
      throw new BadRequestException('上传封面内容为空');
    }

    await writeFile(thumbnailPath, file.buffer, { flag: 'wx' });
    return thumbnailPath;
  }

  private async removeFileByUrl(fileUrl: string | null | undefined) {
    const filePath = this.resolveMemePath(fileUrl);

    if (filePath) {
      await this.removeFile(filePath);
    }
  }

  private async removeUploadedFile(file: MemeUploadFile | undefined) {
    if (!file?.path) {
      return;
    }

    const filePath = resolve(file.path);

    if (this.isInsideUploadDirectory(filePath)) {
      await this.removeFile(filePath).catch(() => undefined);
    }
  }

  private async removeFile(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private toMemeUrl(filePath: string) {
    const relativePath = filePath
      .slice(resolve(this.memeUploadDirectory).length)
      .replaceAll(sep, '/');

    return `/uploads/memes${relativePath}`;
  }

  private resolveMemePath(fileUrl: string | null | undefined): string | null {
    if (!fileUrl?.startsWith('/uploads/memes/')) {
      return null;
    }

    let relativePath: string;

    try {
      relativePath = decodeURIComponent(fileUrl.split('?')[0]).replace(
        /^\/uploads\/memes\//,
        '',
      );
    } catch {
      return null;
    }

    const filePath = resolve(this.memeUploadDirectory, relativePath);

    if (!this.isInsideUploadDirectory(filePath)) {
      return null;
    }

    return filePath;
  }

  private isInsideUploadDirectory(filePath: string) {
    const uploadDirectory = resolve(this.memeUploadDirectory);
    const normalizedPath = resolve(filePath);

    return (
      normalizedPath === uploadDirectory ||
      normalizedPath.startsWith(`${uploadDirectory}${sep}`)
    );
  }

  private launchWindowsExplorer(filePath: string): Promise<void> {
    const explorerPath = join(
      process.env.WINDIR ?? 'C:\\Windows',
      'explorer.exe',
    );
    const command = `start "" "${explorerPath}" /select,"${filePath}"`;

    return new Promise((resolvePromise, reject) => {
      exec(command, { windowsHide: true }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePromise();
      });
    });
  }

  private launchFileManager(command: string, args: string[]): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });

      child.once('error', reject);
      child.once('spawn', () => {
        child.unref();
        resolvePromise();
      });
    });
  }
}
