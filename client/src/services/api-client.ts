import createClient from 'openapi-fetch';
import type { components, paths } from '../api/generated';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

export type Meme = components['schemas']['MemeResponseDto'];
export type MemeListResponse = components['schemas']['MemeListResponseDto'];
export type MemeStatus = components['schemas']['MemeStatus'];
export type CreateMemeInput = components['schemas']['CreateMemeDto'];
export type UpdateMemeInput = components['schemas']['UpdateMemeDto'];
export type FindMemesQuery = NonNullable<
  paths['/memes']['get']['parameters']['query']
>;

function unwrapResponse<T>(data: T | undefined, error: unknown): T {
  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'MemeSeek API 请求失败';

    throw new Error(message);
  }

  if (data === undefined) {
    throw new Error('MemeSeek API 返回了空响应');
  }

  return data;
}

export const memesApi = {
  async list(query?: FindMemesQuery): Promise<MemeListResponse> {
    const response = await apiClient.GET('/memes', {
      params: { query },
    });

    return unwrapResponse(response.data, response.error);
  },

  async get(id: string): Promise<Meme> {
    const response = await apiClient.GET('/memes/{id}', {
      params: { path: { id } },
    });

    return unwrapResponse(response.data, response.error);
  },

  async create(body: CreateMemeInput): Promise<Meme> {
    const response = await apiClient.POST('/memes', { body });

    return unwrapResponse(response.data, response.error);
  },

  async update(id: string, body: UpdateMemeInput): Promise<Meme> {
    const response = await apiClient.PATCH('/memes/{id}', {
      params: { path: { id } },
      body,
    });

    return unwrapResponse(response.data, response.error);
  },

  async remove(id: string): Promise<Meme> {
    const response = await apiClient.DELETE('/memes/{id}', {
      params: { path: { id } },
    });

    return unwrapResponse(response.data, response.error);
  },
};
