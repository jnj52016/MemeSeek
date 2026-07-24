import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MemeDetailModal from './MemeDetailModal'
import type { Meme } from '../../../types/meme'

const meme: Meme = {
  id: 'test-meme',
  imageUrl: '/uploads/memes/test.png',
  title: '原始标题',
  description: '原始描述',
  tags: ['原始标签'],
  ocrText: '',
  status: 'COMPLETED',
  errorMessage: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

describe('MemeDetailModal', () => {
  it('submits edited title and description', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <MemeDetailModal
        meme={meme}
        open
        onClose={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '编辑信息' }))

    const titleInput = screen.getByPlaceholderText('请输入梗图标题')
    const descriptionInput = screen.getByPlaceholderText('请输入梗图描述')

    await user.clear(titleInput)
    await user.type(titleInput, '编辑后的标题')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, '编辑后的描述')
    await user.click(screen.getByRole('button', { name: /保\s*存/ }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '编辑后的标题',
          description: '编辑后的描述',
          tags: ['原始标签'],
        }),
      )
    })
  })

  it('calls onDelete after the user confirms deletion', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <MemeDetailModal
        meme={meme}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: '删除梗图' }))
    await user.click(await screen.findByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(meme)
    })
  })

  it('opens the local image location', async () => {
    const user = userEvent.setup()
    const onOpenLocation = vi.fn().mockResolvedValue(undefined)

    render(
      <MemeDetailModal
        meme={meme}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onOpenLocation={onOpenLocation}
      />,
    )

    await user.click(screen.getByRole('button', { name: '打开文件所在位置' }))

    await waitFor(() => {
      expect(onOpenLocation).toHaveBeenCalledWith(meme)
    })
  })

  it('shows the AI analysis failure state and error message', () => {
    render(
      <MemeDetailModal
        meme={{
          ...meme,
          status: 'FAILED',
          errorMessage: 'AI 请求超时',
        }}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('分析失败')).toBeInTheDocument()
    expect(screen.getByText('AI 请求超时')).toBeInTheDocument()
  })

  it('calls the re-analysis handler for a failed meme', async () => {
    const user = userEvent.setup()
    const onAnalyze = vi.fn().mockResolvedValue({
      ...meme,
      status: 'COMPLETED',
      errorMessage: null,
    })

    render(
      <MemeDetailModal
        meme={{ ...meme, status: 'FAILED', errorMessage: '上一次分析失败' }}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAnalyze={onAnalyze}
      />,
    )

    await user.click(screen.getByRole('button', { name: '重新分析' }))

    await waitFor(() => {
      expect(onAnalyze).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' }),
      )
    })
  })
})
