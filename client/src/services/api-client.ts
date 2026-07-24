import createClient from 'openapi-fetch';
import type { components, paths } from '../api/generated';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

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

export type UploadMemeInput = {
  title?: string;
  description?: string;
  tags?: string[];
};

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

function getUploadErrorMessage(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    return '图片上传失败';
  }

  const message = 'message' in payload ? payload.message : undefined;

  if (Array.isArray(message)) {
    return message.map(String).join('、');
  }

  if (typeof message === 'string') {
    return message;
  }

  return '图片上传失败';
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

  upload(
    file: File,
    input: UploadMemeInput = {},
    onProgress?: (progress: number) => void,
  ): Promise<Meme> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (input.title) {
      formData.append('title', input.title);
    }

    if (input.description) {
      formData.append('description', input.description);
    }

    if (input.tags?.length) {
      for (const tag of input.tags) {
        formData.append('tags', tag);
      }
    }

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', `${API_BASE_URL}/memes`);

      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      });

      request.addEventListener('error', () => {
        reject(new Error('无法连接 MemeSeek API'));
      });

      request.addEventListener('load', () => {
        let payload: unknown;

        try {
          payload = JSON.parse(request.responseText);
        } catch {
          payload = undefined;
        }

        if (request.status < 200 || request.status >= 300) {
          reject(new Error(getUploadErrorMessage(payload)));
          return;
        }

        onProgress?.(100);
        resolve(payload as Meme);
      });

      request.send(formData);
    });
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

export function resolveMemeImageUrl(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl) || !imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}
