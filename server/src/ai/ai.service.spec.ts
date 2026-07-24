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
    process.env.AI_VISION_BASE_URL = 'https://vision.example/v1';
  });

  afterEach(() => {
    delete process.env.AI_VISION_BASE_URL;
    jest.restoreAllMocks();
  });

  it('saves validated AI JSON as completed meme metadata', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
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
});
