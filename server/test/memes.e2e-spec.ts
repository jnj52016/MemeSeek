import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import * as express from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Memes API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdMemeIds = new Set<string>();
  const testRunId = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    for (const id of createdMemeIds) {
      await request(app.getHttpServer()).delete(`/memes/${id}`);
    }

    await prisma.meme.deleteMany({
      where: { title: { startsWith: `e2e-${testRunId}` } },
    });
    await app.close();
  });

  it('completes the upload, query, update, delete, and static image flow', async () => {
    const title = `e2e-${testRunId}-upload`;
    const uploadResponse = await request(app.getHttpServer())
      .post('/memes')
      .field('title', title)
      .field('description', '接口测试图片')
      .field('tags', 'upload')
      .field('tags', 'e2e')
      .attach('file', Buffer.from('fake image bytes'), {
        filename: 'fixture.png',
        contentType: 'image/png',
      })
      .expect(201);

    const meme = uploadResponse.body;
    createdMemeIds.add(meme.id);

    expect(meme.title).toBe(title);
    expect(meme.tags).toEqual(['upload', 'e2e']);
    expect(meme.status).toBe('COMPLETED');
    expect(meme.imageUrl).toMatch(/^\/uploads\/memes\/.+\.png$/);

    const imageResponse = await request(app.getHttpServer())
      .get(meme.imageUrl)
      .expect(200);
    expect(imageResponse.body.toString()).toBe('fake image bytes');

    const listResponse = await request(app.getHttpServer())
      .get('/memes')
      .query({ q: title, status: 'COMPLETED', page: 1, pageSize: 10 })
      .expect(200);
    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: meme.id })]),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/memes/${meme.id}`)
      .send({
        title: `${title}-updated`,
        description: '更新后的接口测试图片',
        tags: ['updated'],
      })
      .expect(200);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        id: meme.id,
        title: `${title}-updated`,
        description: '更新后的接口测试图片',
        tags: ['updated'],
      }),
    );

    await request(app.getHttpServer())
      .delete(`/memes/${meme.id}`)
      .expect(200);
    createdMemeIds.delete(meme.id);

    await request(app.getHttpServer()).get(`/memes/${meme.id}`).expect(404);
    await request(app.getHttpServer()).get(meme.imageUrl).expect(404);
  });

  it('rejects missing images, non-image uploads, and invalid DTOs', async () => {
    await request(app.getHttpServer())
      .post('/memes')
      .send({ title: `e2e-${testRunId}-missing-image` })
      .expect(400);

    await request(app.getHttpServer())
      .post('/memes')
      .field('title', `e2e-${testRunId}-wrong-file`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'fixture.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/memes')
      .send({
        imageUrl: '/uploads/memes/existing.png',
        tags: [123],
      })
      .expect(400);
  });

  it('returns validation and not-found errors for invalid requests', async () => {
    await request(app.getHttpServer())
      .get('/memes')
      .query({ page: 0 })
      .expect(400);

    const missingId = 'missing-meme-id';
    await request(app.getHttpServer()).get(`/memes/${missingId}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/memes/${missingId}`)
      .send({ title: '不存在的梗图' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/memes/${missingId}`)
      .expect(404);
  });

  it('returns a failed meme state when image analysis is not configured', async () => {
    const title = `e2e-${testRunId}-analysis`;
    const createResponse = await request(app.getHttpServer())
      .post('/memes')
      .send({
        imageUrl: 'https://example.test/e2e-analysis.png',
        title,
      })
      .expect(201);
    const memeId = createResponse.body.id;
    createdMemeIds.add(memeId);

    const previousVisionBaseUrl = process.env.AI_VISION_BASE_URL;
    delete process.env.AI_VISION_BASE_URL;

    try {
      const response = await request(app.getHttpServer())
        .post(`/memes/${memeId}/analyze`)
        .set('x-deepseek-api-key', 'test-key')
        .send({ model: 'deepseek-v4-flash' })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: memeId,
          status: 'FAILED',
        }),
      );
      expect(response.body.errorMessage).toContain('AI_VISION_BASE_URL');
    } finally {
      if (previousVisionBaseUrl === undefined) {
        delete process.env.AI_VISION_BASE_URL;
      } else {
        process.env.AI_VISION_BASE_URL = previousVisionBaseUrl;
      }
    }
  });
});
