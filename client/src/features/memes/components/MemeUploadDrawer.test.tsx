import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MemeUploadDrawer from './MemeUploadDrawer'
import { memesApi } from '../../../services/api-client'

describe('MemeUploadDrawer', () => {
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
