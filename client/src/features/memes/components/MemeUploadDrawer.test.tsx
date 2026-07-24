import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MemeUploadDrawer from './MemeUploadDrawer'
import { memesApi } from '../../../services/api-client'

describe('MemeUploadDrawer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts a pasted image and sends it through the existing upload flow', async () => {
    const user = userEvent.setup()
    const upload = vi.spyOn(memesApi, 'upload').mockResolvedValue({
      id: 'pasted-meme',
      imageUrl: '/uploads/memes/pasted.png',
      title: 'pasted-image',
      description: '',
      tags: [],
      ocrText: '',
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

    expect(upload).toHaveBeenCalledTimes(1)
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
})
