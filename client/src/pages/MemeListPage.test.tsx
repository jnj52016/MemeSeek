import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemeListPage from './MemeListPage'
import { memesApi } from '../services/api-client'

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
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
})
