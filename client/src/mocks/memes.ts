import type { Meme } from '../types/meme'

export const mockMemes: Meme[] = [
  {
    id: 'meme-001',
    imageUrl: '/mock-cat.png',
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
    imageUrl: '/mock-effort.png',
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
    imageUrl: '/mock-question.png',
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