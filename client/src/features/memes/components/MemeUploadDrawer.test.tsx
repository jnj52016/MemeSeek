import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemeUploadDrawer from './MemeUploadDrawer'

const localLibraryMock = vi.hoisted(() => ({
  importLocalMedia: vi.fn(),
  useLocalLibrary: vi.fn(),
}))

vi.mock('../../../services/local-library', () => ({
  importLocalMedia: localLibraryMock.importLocalMedia,
}))

vi.mock('../../../services/local-library-context', () => ({
  useLocalLibrary: localLibraryMock.useLocalLibrary,
}))

describe('MemeUploadDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localLibraryMock.useLocalLibrary.mockReturnValue({ directory: {} })
    localLibraryMock.importLocalMedia.mockResolvedValue({
      id: 'local-meme',
      relativePath: 'local-meme.png',
      mediaType: 'IMAGE',
      title: 'pasted-image',
      description: '',
      tags: [],
      ocrText: '',
      transcript: '',
      status: 'COMPLETED',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('saves a pasted image to the selected local library', async () => {
    const user = userEvent.setup()
    const onUploaded = vi.fn()
    render(<MemeUploadDrawer open onClose={vi.fn()} onUploaded={onUploaded} />)

    fireEvent.paste(screen.getByTestId('meme-upload-zone'), {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => new File(['image bytes'], '', { type: 'image/png' }),
          },
        ],
      },
    })
    await user.click(screen.getByRole('button', { name: '开始上传' }))

    await waitFor(() => expect(localLibraryMock.importLocalMedia).toHaveBeenCalledTimes(1))
    expect(localLibraryMock.importLocalMedia).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ name: expect.stringMatching(/^pasted-image-\d+\.png$/) }),
      undefined,
    )
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-meme' }))
  })

  it('rejects oversized pasted images before local writing', async () => {
    render(<MemeUploadDrawer open onClose={vi.fn()} onUploaded={vi.fn()} />)
    const oversizedImage = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.png',
      { type: 'image/png' },
    )
    fireEvent.paste(screen.getByTestId('meme-upload-zone'), {
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => oversizedImage }],
      },
    })

    expect(await screen.findByText('图片大小不能超过 10MB')).toBeInTheDocument()
    expect(localLibraryMock.importLocalMedia).not.toHaveBeenCalled()
  })

  it('shows a failure state when local writing fails', async () => {
    const user = userEvent.setup()
    localLibraryMock.importLocalMedia.mockRejectedValue(new Error('disk full'))
    render(<MemeUploadDrawer open onClose={vi.fn()} onUploaded={vi.fn()} />)
    const input = document.querySelector('input[type="file"]')

    await user.upload(
      input as HTMLInputElement,
      new File(['image'], 'runtime.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: '开始上传' }))

    expect(await screen.findByText('上传失败，可以重新尝试')).toBeVisible()
  })
})
