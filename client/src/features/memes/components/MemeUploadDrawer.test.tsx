import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemeUploadDrawer from './MemeUploadDrawer'
import { memesApi } from '../../../services/api-client'
import { saveAiSettings } from '../../../services/ai-settings-storage'
import type { Meme } from '../../../types/meme'

function createMeme(overrides: Partial<Meme> = {}): Meme {
  return {
    id: 'test-meme',
    imageUrl: '/uploads/memes/test.png',
    mediaType: 'IMAGE',
    mimeType: 'image/png',
    thumbnailUrl: null,
    duration: null,
    title: '测试素材',
    description: '',
    tags: [],
    ocrText: '',
    transcript: '',
    status: 'COMPLETED',
    errorMessage: null,
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('MemeUploadDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts a pasted image and sends it through the existing upload flow', async () => {
    const user = userEvent.setup()
    const upload = vi.spyOn(memesApi, 'upload').mockResolvedValue({
      id: 'pasted-meme',
      imageUrl: '/uploads/memes/pasted.png',
      mediaType: 'IMAGE',
      mimeType: 'image/png',
      thumbnailUrl: null,
      duration: null,
      title: 'pasted-image',
      description: '',
      tags: [],
      ocrText: '',
      transcript: '',
      status: 'COMPLETED',
      errorMessage: null,
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    })

    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    )

    const pastedImage = new File(['image bytes'], '', { type: 'image/png' })

    fireEvent.paste(screen.getByTestId('meme-upload-zone'), {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => pastedImage,
          },
        ],
      },
    })

    expect(screen.getByRole('img', { name: /pasted-image-\d+\.png/ })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '开始上传' }))

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    expect(upload.mock.calls[0][0]).toBeInstanceOf(File)
    expect(upload.mock.calls[0][0].name).toMatch(/^pasted-image-\d+\.png$/)
  })

  it('does not replace the selected image when the clipboard has no image', async () => {
    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    )

    fireEvent.paste(screen.getByTestId('meme-upload-zone'), {
      clipboardData: {
        items: [{ type: 'text/plain', getAsFile: () => null }],
      },
    })

    expect(
      await screen.findByText('剪贴板中没有图片，请先复制一张图片'),
    ).toBeVisible()
    expect(screen.queryByAltText(/pasted-image-/)).not.toBeInTheDocument()
  })

  it('rejects a pasted image larger than 10MB', async () => {
    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    )

    const oversizedImage = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      '',
      { type: 'image/png' },
    )

    fireEvent.paste(screen.getByTestId('meme-upload-zone'), {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => oversizedImage,
          },
        ],
      },
    })

    expect(
      await screen.findByText('图片大小不能超过 10MB'),
    ).toBeVisible()
    expect(screen.queryByAltText(/pasted-image-/)).not.toBeInTheDocument()
  })

  it('shows a failure state when the upload request fails', async () => {
    const user = userEvent.setup()
    const upload = vi
      .spyOn(memesApi, 'upload')
      .mockRejectedValue(new Error('network down'))
    const onUploaded = vi.fn()

    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={onUploaded}
      />,
    )

    const input = document.querySelector('input[type="file"]')

    expect(input).not.toBeNull()

    await user.upload(
      input as HTMLInputElement,
      new File(['image'], 'runtime.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: '开始上传' }))

    expect(await screen.findByText('上传失败，可以重新尝试')).toBeVisible()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(onUploaded).not.toHaveBeenCalled()
  })

  it('uploads a video with a generated first-frame thumbnail and uses analysis settings only', async () => {
    const user = userEvent.setup()
    const upload = vi.spyOn(memesApi, 'upload').mockResolvedValue(
      createMeme({
        id: 'video-meme',
        imageUrl: '/uploads/memes/clip.mp4',
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        thumbnailUrl: '/uploads/memes/thumbnails/clip.jpg',
        title: 'clip',
      }),
    )
    const analyze = vi.spyOn(memesApi, 'analyze').mockResolvedValue(
      createMeme({
        id: 'video-meme',
        imageUrl: '/uploads/memes/clip.mp4',
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        thumbnailUrl: '/uploads/memes/thumbnails/clip.jpg',
        title: '分析后的标题',
      }),
    )
    const onUploaded = vi.fn()

    saveAiSettings({
      analysis: {
        baseUrl: 'https://analysis.example/v1',
        model: 'analysis-model',
        apiKey: 'analysis-key',
      },
      content: {
        baseUrl: 'https://content.example/v1',
        model: 'content-model',
        apiKey: 'content-key',
      },
      useAnalysisForContent: false,
      recommendedTags: ['视频', '测试'],
    })

    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={onUploaded}
      />,
    )

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    await user.upload(
      input as HTMLInputElement,
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
    )
    expect(screen.getByText('视频预览')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '开始上传' }))

    await waitFor(() => {
      expect(analyze).toHaveBeenCalledWith('video-meme', {
        baseUrl: 'https://analysis.example/v1',
        apiKey: 'analysis-key',
        model: 'analysis-model',
        recommendedTags: ['视频', '测试'],
      })
    })
    expect(upload).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        title: 'clip',
        thumbnail: expect.any(File),
      }),
      expect.any(Function),
    )
    expect(upload.mock.calls[0]?.[1]?.thumbnail?.name).toBe('clip-thumbnail.jpg')
    expect(onUploaded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'video-meme' }),
    )
  })

  it('rejects a video larger than 500MB and unsupported media extensions', async () => {
    const user = userEvent.setup()

    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    )

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    const oversizedVideo = new File(['video'], 'large.mp4', {
      type: 'video/mp4',
    })
    Object.defineProperty(oversizedVideo, 'size', {
      configurable: true,
      value: 500 * 1024 * 1024 + 1,
    })
    await user.upload(input as HTMLInputElement, oversizedVideo)
    expect(await screen.findByText('视频大小不能超过 500MB')).toBeVisible()

    await user.upload(
      input as HTMLInputElement,
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
    )
    expect(
      await screen.findByText(
        '请选择 JPG、PNG、GIF、WebP、MP4、WebM 或 MOV 文件',
      ),
    ).toBeVisible()
  })

  it('shows the upload failure state when a video first frame cannot be generated', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function () {
      queueMicrotask(() => this.dispatchEvent(new Event('error')))
    })
    const upload = vi.spyOn(memesApi, 'upload')

    render(
      <MemeUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    )

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    await user.upload(
      input as HTMLInputElement,
      new File(['video'], 'broken.mp4', { type: 'video/mp4' }),
    )
    await user.click(screen.getByRole('button', { name: '开始上传' }))

    expect(await screen.findByText('上传失败，可以重新尝试')).toBeVisible()
    expect(upload).not.toHaveBeenCalled()
  })
})
