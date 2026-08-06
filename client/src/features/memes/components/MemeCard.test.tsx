import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MemeCard from './MemeCard'
import type { Meme } from '../../../types/meme'

const videoMeme: Meme = {
  id: 'video-meme',
  imageUrl: '/uploads/memes/clip.mp4',
  mediaType: 'VIDEO',
  mimeType: 'video/mp4',
  thumbnailUrl: '/uploads/memes/thumbnails/clip.jpg',
  duration: null,
  title: '办公室名场面',
  description: '',
  tags: [],
  ocrText: '',
  transcript: '',
  status: 'COMPLETED',
  errorMessage: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

describe('MemeCard', () => {
  it('uses the video source and generated thumbnail as poster', () => {
    const { container } = render(
      <MemeCard meme={videoMeme} onClick={vi.fn()} />,
    )

    const video = container.querySelector('video')

    expect(video).toHaveAttribute(
      'src',
      'http://localhost:3000/uploads/memes/clip.mp4',
    )
    expect(video).toHaveAttribute(
      'poster',
      'http://localhost:3000/uploads/memes/thumbnails/clip.jpg',
    )
    expect(screen.getByText('视频素材 · 点击查看详情')).toBeInTheDocument()
  })
})
