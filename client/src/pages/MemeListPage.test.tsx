import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemeListPage from './MemeListPage'

const localLibraryMock = vi.hoisted(() => ({
  useLocalLibrary: vi.fn(),
  useLocalMemes: vi.fn(),
}))

vi.mock('../services/local-library-context', () => ({
  useLocalLibrary: localLibraryMock.useLocalLibrary,
}))

vi.mock('../services/use-local-memes', () => ({
  useLocalMemes: localLibraryMock.useLocalMemes,
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location-search">{location.search}</output>
}

describe('MemeListPage', () => {
  beforeEach(() => {
    localLibraryMock.useLocalLibrary.mockReturnValue({
      directory: {},
      records: [],
      scannedAt: '2026-09-01T00:00:00.000Z',
    })
    localLibraryMock.useLocalMemes.mockReturnValue({
      loading: false,
      memes: [],
      error: null,
    })
  })

  it('writes the local-library search keyword to the URL', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
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
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByRole('searchbox', { name: '搜索梗图名称或标签' }),
      'runtime{Enter}',
    )

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?q=runtime',
      )
    })
    expect(localLibraryMock.useLocalMemes).toHaveBeenLastCalledWith(
      expect.any(Object),
      [],
      'runtime',
    )
  })
})
