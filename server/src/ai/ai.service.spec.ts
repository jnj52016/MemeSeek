import { Logger } from '@nestjs/common';
import { MemeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from './ai.service';

describe('AiService', () => {
  const meme = {
    id: 'meme-1',
    imageUrl: '/uploads/memes/meme-1.png',
    title: '旧标题',
    description: '旧描述',
  };
  let prisma: {
    meme: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let storage: {
    readMemeImage: jest.Mock;
  };
  let service: AiService;

  beforeEach(() => {
    prisma = {
      meme: {
        findUnique: jest.fn().mockResolvedValue(meme),
        update: jest.fn().mockImplementation(({ data }: { data: object }) => ({
          ...meme,
          ...data,
        })),
      },
    };
    storage = {
      readMemeImage: jest.fn().mockResolvedValue({
        buffer: Buffer.from('fake image'),
        mimeType: 'image/png',
      }),
    };
    service = new AiService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
    process.env.AI_BASE_URL = 'https://vision.example/v1';
  });

  afterEach(() => {
    delete process.env.AI_BASE_URL;
    jest.restoreAllMocks();
  });

  it('saves validated AI JSON as completed meme metadata', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '猫猫震惊',
                  description: '一只猫露出惊讶的表情。',
                  tags: ['猫', '震惊'],
                  ocrText: '',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await service.analyzeMeme('meme-1', {
      baseUrl: 'https://vision.example/v1',
      apiKey: 'test-key',
      model: 'vision-model',
      recommendedTags: ['猫'],
    });

    expect(result).toEqual(
      expect.objectContaining({
        title: '猫猫震惊',
        description: '一只猫露出惊讶的表情。',
        tags: ['猫', '震惊'],
        status: MemeStatus.COMPLETED,
        errorMessage: null,
      }),
    );
    expect(prisma.meme.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MemeStatus.PROCESSING,
        }) as unknown,
      }),
    );
    expect(prisma.meme.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'meme-1' },
        data: expect.objectContaining({
          title: '猫猫震惊',
          description: '一只猫露出惊讶的表情。',
          tags: ['猫', '震惊'],
          ocrText: '',
          status: MemeStatus.COMPLETED,
          errorMessage: null,
        }) as unknown,
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://vision.example/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body));
    expect(requestBody).toEqual(
      expect.objectContaining({
        model: 'vision-model',
        response_format: { type: 'json_object' },
      }),
    );
    expect(requestBody.messages[1].content).toEqual(
      expect.arrayContaining([
        {
          type: 'image_url',
          image_url: { url: 'data:image/png;base64,ZmFrZSBpbWFnZQ==' },
        },
      ]),
    );
    expect(timeoutSpy).toHaveBeenCalledWith(120_000);
  });

  it('analyzes an in-memory local image without reading or writing persistent storage', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '本地图片',
                  description: '只在内存中分析。',
                  tags: ['本地'],
                  ocrText: '',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await service.analyzeLocalImage({
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimeType: 'image/jpeg',
      sourceMediaType: 'IMAGE' as never,
      title: '',
      description: '',
      apiKey: 'test-key',
    });

    expect(result).toEqual(
      expect.objectContaining({ title: '本地图片', tags: ['本地'] }),
    );
    expect(prisma.meme.findUnique).not.toHaveBeenCalled();
    expect(prisma.meme.update).not.toHaveBeenCalled();
    expect(storage.readMemeImage).not.toHaveBeenCalled();
  });

  it('retries one network failure and logs its underlying cause', async () => {
    const connectionError = Object.assign(
      new Error('connect ETIMEDOUT 203.0.113.10:443'),
      {
        code: 'ETIMEDOUT',
        syscall: 'connect',
        address: '203.0.113.10',
        port: 443,
      },
    );
    const networkError = new TypeError('fetch failed', {
      cause: connectionError,
    });
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: '网络重试成功',
                    description: '第一次连接超时，第二次成功。',
                    tags: ['重试'],
                    ocrText: '',
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await service.analyzeMeme('meme-1', {
      apiKey: 'test-key',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: MemeStatus.COMPLETED,
        title: '网络重试成功',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, 120_000);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, 120_000);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ETIMEDOUT connect 203.0.113.10:443'),
    );
  });

  it('persists network diagnostics after the retry also fails', async () => {
    const connectionError = Object.assign(new Error('socket reset'), {
      code: 'ECONNRESET',
      syscall: 'read',
      address: '203.0.113.20',
      port: 443,
    });
    const networkError = new TypeError('fetch failed', {
      cause: connectionError,
    });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(networkError);

    const result = await service.analyzeMeme('meme-1', {
      apiKey: 'test-key',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(MemeStatus.FAILED);
    expect(result.errorMessage).toContain(
      'fetch failed (ECONNRESET read 203.0.113.20:443)',
    );
  });

  it('persists a failed state when the AI JSON is invalid', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"title":"缺少字段"}' } }],
        }),
        { status: 200 },
      ),
    );

    const result = await service.analyzeMeme('meme-1', { apiKey: 'test-key' });

    expect(result.status).toBe(MemeStatus.FAILED);
    expect(result.errorMessage).toContain('AI 返回的 JSON 缺少合法的 title');
    expect(prisma.meme.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: MemeStatus.FAILED }) as unknown,
      }),
    );
  });

  it('sends a video first-frame thumbnail to the vision model', async () => {
    prisma.meme.findUnique.mockResolvedValue({
      ...meme,
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      thumbnailUrl: '/uploads/memes/thumbnails/clip.jpg',
    });
    storage.readMemeImage.mockResolvedValue({
      buffer: Buffer.from('video first frame'),
      mimeType: 'image/jpeg',
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '视频首帧',
                  description: '视频首帧画面',
                  tags: ['视频'],
                  ocrText: '',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await service.analyzeMeme('meme-1', {
      baseUrl: 'https://vision.example/v1',
      apiKey: 'test-key',
      model: 'vision-model',
    });

    expect(result.status).toBe(MemeStatus.COMPLETED);
    expect(storage.readMemeImage).toHaveBeenCalledWith(
      '/uploads/memes/thumbnails/clip.jpg',
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body));
    expect(requestBody.messages[1].content[0].text).toContain('第一帧');
    expect(requestBody.messages[1].content).toContainEqual({
      type: 'image_url',
      image_url: {
        url: 'data:image/jpeg;base64,dmlkZW8gZmlyc3QgZnJhbWU=',
      },
    });
  });

  it('persists a failed state when a video has no first-frame thumbnail', async () => {
    prisma.meme.findUnique.mockResolvedValue({
      ...meme,
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      thumbnailUrl: null,
    });

    const result = await service.analyzeMeme('meme-1', { apiKey: 'test-key' });

    expect(result.status).toBe(MemeStatus.FAILED);
    expect(result.errorMessage).toContain('首帧封面');
    expect(storage.readMemeImage).not.toHaveBeenCalled();
  });

  it('can complete video analysis after a failed attempt is retried', async () => {
    prisma.meme.findUnique.mockResolvedValue({
      ...meme,
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      thumbnailUrl: '/uploads/memes/thumbnails/clip.jpg',
    });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'temporary outage' } }),
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: '重试成功',
                    description: '重试后完成分析',
                    tags: ['重试'],
                    ocrText: '',
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const failed = await service.analyzeMeme('meme-1', {
      baseUrl: 'https://vision.example/v1',
      apiKey: 'test-key',
      model: 'vision-model',
    });
    const completed = await service.analyzeMeme('meme-1', {
      baseUrl: 'https://vision.example/v1',
      apiKey: 'test-key',
      model: 'vision-model',
    });

    expect(failed.status).toBe(MemeStatus.FAILED);
    expect(completed).toEqual(
      expect.objectContaining({
        status: MemeStatus.COMPLETED,
        title: '重试成功',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
