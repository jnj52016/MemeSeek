import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemeListPage from './MemeListPage'
import { memesApi } from '../services/api-client'
import { saveAiSettings } from '../services/ai-settings-storage'
import type { Meme } from '../types/meme'

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

function renderPage(initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <MemeListPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MemeListPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(memesApi, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
  })

  it('writes the search keyword to the URL', async () => {
    const user = userEvent.setup()

    renderPage()

    const input = await screen.findByRole('searchbox', {
      name: '搜索梗图名称或标签',
    })

    await user.type(input, 'runtime{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?q=runtime',
      )
    })

    expect(memesApi.list).toHaveBeenLastCalledWith({ q: 'runtime' })
  })

  it('re-analyzes a failed meme with the analysis provider settings', async () => {
    const user = userEvent.setup()
    const failedMeme: Meme = {
      id: 'failed-meme',
      imageUrl: '/uploads/memes/failed.png',
      mediaType: 'IMAGE',
      mimeType: 'image/png',
      thumbnailUrl: null,
      duration: null,
      title: '待重新分析',
      description: '旧描述',
      tags: ['旧标签'],
      ocrText: '',
      transcript: '',
      status: 'FAILED',
      errorMessage: '上一次分析失败',
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    }
    vi.mocked(memesApi.list).mockResolvedValue({
      items: [failedMeme],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    const analyze = vi.spyOn(memesApi, 'analyze').mockResolvedValue({
      ...failedMeme,
      status: 'COMPLETED',
      errorMessage: null,
    })
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
      recommendedTags: ['测试'],
    })

    renderPage()

    await user.click(
      await screen.findByRole('button', { name: /待重新分析/ }),
    )
    await user.click(await screen.findByRole('button', { name: '重新分析' }))

    await waitFor(() => {
      expect(analyze).toHaveBeenCalledWith('failed-meme', {
        baseUrl: 'https://analysis.example/v1',
        apiKey: 'analysis-key',
        model: 'analysis-model',
        recommendedTags: ['测试'],
      })
    })
  })
})
