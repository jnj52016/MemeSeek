// Mock 梗图数据：只用于前端开发和页面演示，后端接口完成后会被 API 数据替换。
import type { Meme } from '../types/meme'

// public 目录中的文件通过 /mock-images/... 访问，不需要写 client/public。
export const mockMemes: Meme[] = [
  {
    id: 'meme-001',
    imageUrl: '/mock-images/mock-cat.png',
    title: '猫猫震惊',
    description: '一只猫表现出震惊的表情。',
    tags: ['猫', '表情', '震惊'],
    ocrText: '',
    status: 'COMPLETED',
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
  },
  {
    id: 'meme-002',
    imageUrl: '/mock-images/mock-effort.svg',
    title: '今天也要努力',
    description: '表达努力工作或学习的场景。',
    tags: ['动物', '努力', '日常'],
    ocrText: '',
    status: 'PROCESSING',
    createdAt: '2026-07-17T11:00:00.000Z',
    updatedAt: '2026-07-17T11:00:00.000Z',
  },
  {
    id: 'meme-003',
    imageUrl: '/mock-images/mock-question.svg',
    title: '这合理吗',
    description: '表达疑惑和吐槽的场景。',
    tags: ['吐槽', '疑惑'],
    ocrText: '',
    status: 'FAILED',
    errorMessage: 'AI 分析失败',
    createdAt: '2026-07-17T12:00:00.000Z',
    updatedAt: '2026-07-17T12:00:00.000Z',
  },
]
