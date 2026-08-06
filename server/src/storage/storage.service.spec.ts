import {
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  MAX_MEME_VIDEO_SIZE,
  StorageService,
} from './storage.service';

describe('StorageService video media', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  it('saves a video and its JPEG first-frame thumbnail', async () => {
    const saved = await storage.saveMemeFile(
      {
        buffer: Buffer.from('video bytes'),
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        size: 11,
      },
      {
        buffer: Buffer.from('jpeg bytes'),
        originalname: 'clip-thumbnail.jpg',
        mimetype: 'image/jpeg',
        size: 10,
      },
    );

    expect(saved).toEqual(
      expect.objectContaining({
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        thumbnailUrl: expect.stringMatching(
          /^\/uploads\/memes\/thumbnails\/.+\.jpg$/,
        ),
        duration: null,
      }),
    );

    await storage.removeMemeMedia(saved.mediaUrl, saved.thumbnailUrl);
  });

  it('requires a browser-generated thumbnail for videos', async () => {
    await expect(
      storage.saveMemeFile({
        buffer: Buffer.from('video bytes'),
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        size: 11,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a video whose extension does not match its MIME type', async () => {
    await expect(
      storage.saveMemeFile({
        buffer: Buffer.from('video bytes'),
        originalname: 'clip.mov',
        mimetype: 'video/mp4',
        size: 11,
      }),
    ).rejects.toThrow('文件扩展名与媒体类型不匹配');
  });

  it('rejects a video larger than the configured upload limit', async () => {
    await expect(
      storage.saveMemeFile({
        originalname: 'large.mp4',
        mimetype: 'video/mp4',
        size: MAX_MEME_VIDEO_SIZE + 1,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
