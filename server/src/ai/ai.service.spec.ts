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
          image_url: { url: 'data:image/png;base64,ZmFrZSBpbW1hZ2U=' },
        },
      ]),
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
