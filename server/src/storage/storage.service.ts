import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { exec, execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { promisify } from 'node:util';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';

const execFileAsync = promisify(execFile);

export const MEME_UPLOAD_DIRECTORY = join(
  __dirname,
  '..',
  '..',
  'uploads',
  'memes',
);

export const MAX_MEME_IMAGE_SIZE = 10 * 1024 * 1024;

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
export const SHORT_ANIMATED_IMAGE_MAX_DURATION = 3;

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

export function isAnimatedImageMimeType(mimeType: string | undefined) {
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

export type MemeVideoKeyframe = {
  timestamp: number;
  buffer: Buffer;
  mimeType: string;
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
  private readonly logger = new Logger(StorageService.name);
  private readonly memeUploadDirectory = MEME_UPLOAD_DIRECTORY;

  async onModuleInit() {
    await mkdir(this.memeUploadDirectory, { recursive: true });
  }

  async saveMemeFile(file: MemeUploadFile): Promise<SavedMemeMedia> {
    let mimeType = file?.mimetype?.toLowerCase();
    const mediaType = getMemeMediaType(mimeType);
    let extension = getMemeExtension(mimeType);

    if (!file || !mimeType || !mediaType || !extension) {
      await this.removeUploadedFile(file);
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
      throw new BadRequestException('文件扩展名与媒体类型不匹配');
    }

    const maxSize =
      mediaType === 'VIDEO' ? MAX_MEME_VIDEO_SIZE : MAX_MEME_IMAGE_SIZE;

    if (file.size > maxSize) {
      await this.removeUploadedFile(file);
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

      if (mediaType === 'VIDEO') {
        const videoInfo = await this.processVideo(filePath);
        thumbnailPath = videoInfo.thumbnailPath;

        return {
          mediaUrl,
          mediaType,
          mimeType,
          thumbnailUrl: thumbnailPath
            ? this.toMemeUrl(thumbnailPath)
            : null,
          duration: videoInfo.duration,
        };
      }

      if (isAnimatedImageMimeType(mimeType)) {
        const imageInfo = await this.processAnimatedImage(filePath);
        thumbnailPath = imageInfo.thumbnailPath;

        return {
          mediaUrl,
          mediaType,
          mimeType,
          thumbnailUrl: thumbnailPath
            ? this.toMemeUrl(thumbnailPath)
            : null,
          duration: imageInfo.duration,
        };
      }

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

  async readMemeMediaKeyframes(
    mediaUrl: string,
    duration: number | null | undefined,
    sourceType: 'VIDEO' | 'ANIMATED_IMAGE',
  ): Promise<MemeVideoKeyframe[]> {
    const filePath = this.resolveMemePath(mediaUrl);

    if (!filePath) {
      throw new BadRequestException(
        sourceType === 'ANIMATED_IMAGE'
          ? '只能分析本地上传的动图'
          : '只能分析本地上传的视频',
      );
    }

    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';
    const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe';
    const keyframeDirectory = join(
      this.memeUploadDirectory,
      'keyframes',
      randomUUID(),
    );

    try {
      await mkdir(keyframeDirectory, { recursive: true });

      const parsedDuration = Number(duration);
      let videoDuration =
        Number.isFinite(parsedDuration) && parsedDuration > 0
          ? parsedDuration
          : null;

      if (videoDuration === null) {
        try {
          videoDuration = await this.readVideoDuration(filePath, ffprobePath);
        } catch (error) {
          if (
            sourceType === 'ANIMATED_IMAGE' &&
            error instanceof BadRequestException
          ) {
            return await this.readAnimatedImageFallback(mediaUrl);
          }

          throw error;
        }
      }

      if (
        videoDuration === null ||
        !Number.isFinite(videoDuration) ||
        videoDuration <= 0
      ) {
        throw new BadRequestException('无法读取视频时长，无法提取关键帧');
      }

      const frameCount =
        sourceType === 'ANIMATED_IMAGE'
          ? videoDuration <= SHORT_ANIMATED_IMAGE_MAX_DURATION
            ? 1
            : 8
          : Math.max(1, Math.min(8, Math.ceil(videoDuration)));
      const keyframes: MemeVideoKeyframe[] = [];

      for (let index = 0; index < frameCount; index += 1) {
        const timestamp =
          sourceType === 'ANIMATED_IMAGE' && frameCount === 1
            ? 0
            : Math.min(
                videoDuration * ((index + 0.5) / frameCount),
                Math.max(0, videoDuration - 0.05),
              );
        const framePath = join(
          keyframeDirectory,
          `frame-${String(index + 1).padStart(2, '0')}.jpg`,
        );

        await execFileAsync(
          ffmpegPath,
          [
            '-y',
            '-ss',
            timestamp.toFixed(3),
            '-i',
            filePath,
            '-frames:v',
            '1',
            '-vf',
            'scale=1024:-2:force_original_aspect_ratio=decrease',
            '-q:v',
            '4',
            framePath,
          ],
          { windowsHide: true },
        );

        keyframes.push({
          timestamp,
          buffer: await readFile(framePath),
          mimeType: 'image/jpeg',
        });
      }

      return keyframes;
    } catch (error) {
      if (this.isMissingMediaTool(error)) {
        if (sourceType === 'ANIMATED_IMAGE') {
          return await this.readAnimatedImageFallback(mediaUrl);
        }

        throw new ServiceUnavailableException(
          '视频 AI 分析需要安装 FFmpeg 和 ffprobe，或配置 FFMPEG_PATH 与 FFPROBE_PATH',
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new BadRequestException('视频关键帧提取失败，请检查视频文件是否有效');
    } finally {
      await rm(keyframeDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private async readAnimatedImageFallback(
    mediaUrl: string,
  ): Promise<MemeVideoKeyframe[]> {
    const image = await this.readMemeImage(mediaUrl);

    return [
      {
        timestamp: 0,
        buffer: image.buffer,
        mimeType: image.mimeType,
      },
    ];
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

  private async processVideo(filePath: string): Promise<{
    duration: number | null;
    thumbnailPath: string | null;
  }> {
    const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe';
    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';
    const thumbnailDirectory = join(this.memeUploadDirectory, 'thumbnails');
    const thumbnailPath = join(
      thumbnailDirectory,
      `${basename(filePath, extname(filePath))}.jpg`,
    );

    try {
      const duration = await this.readVideoDuration(filePath, ffprobePath);

      await mkdir(thumbnailDirectory, { recursive: true });
      await execFileAsync(
        ffmpegPath,
        [
          '-y',
          '-i',
          filePath,
          '-frames:v',
          '1',
          '-vf',
          'scale=640:-2:force_original_aspect_ratio=decrease',
          '-q:v',
          '3',
          thumbnailPath,
        ],
        { windowsHide: true },
      );

      return { duration, thumbnailPath };
    } catch (error) {
      if (this.isMissingMediaTool(error)) {
        this.logger.warn(
          'FFmpeg/ffprobe 未安装，视频仍会保存，但不会生成封面或时长信息。',
        );
        return { duration: null, thumbnailPath: null };
      }

      await this.removeFile(thumbnailPath);
      throw new BadRequestException('视频文件无法读取或生成封面');
    }
  }

  private async processAnimatedImage(filePath: string): Promise<{
    duration: number | null;
    thumbnailPath: string | null;
  }> {
    const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe';
    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';
    const thumbnailDirectory = join(this.memeUploadDirectory, 'thumbnails');
    const thumbnailPath = join(
      thumbnailDirectory,
      `${basename(filePath, extname(filePath))}.jpg`,
    );
    let duration: number | null = null;

    try {
      try {
        duration = await this.readVideoDuration(filePath, ffprobePath);
      } catch {
        // 静态 GIF/WebP 可能没有可用的 duration，仍然继续生成第一帧封面。
      }

      await mkdir(thumbnailDirectory, { recursive: true });
      await execFileAsync(
        ffmpegPath,
        [
          '-y',
          '-ss',
          '0',
          '-i',
          filePath,
          '-frames:v',
          '1',
          '-vf',
          'scale=640:-2:force_original_aspect_ratio=decrease',
          '-q:v',
          '3',
          thumbnailPath,
        ],
        { windowsHide: true },
      );

      return { duration, thumbnailPath };
    } catch (error) {
      if (this.isMissingMediaTool(error)) {
        this.logger.warn(
          'FFmpeg 未安装，动图仍会保存，但不会生成 JPEG 封面。',
        );
        return { duration, thumbnailPath: null };
      }

      await this.removeFile(thumbnailPath);
      throw new BadRequestException('动图无法读取或生成 JPEG 封面');
    }
  }

  private async readVideoDuration(
    filePath: string,
    ffprobePath: string,
  ): Promise<number> {
    const metadataResult = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { windowsHide: true },
    );
    const duration = Number(metadataResult.stdout.toString().trim());

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('无法读取视频时长，无法提取关键帧');
    }

    return duration;
  }

  private isMissingMediaTool(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'UNKNOWN')
    );
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
