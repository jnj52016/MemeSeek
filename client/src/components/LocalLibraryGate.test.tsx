import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LocalLibraryGate from './LocalLibraryGate'

const localLibraryMock = vi.hoisted(() => ({
  initializeLocalLibrary: vi.fn(),
  inspectStoredDirectory: vi.fn(),
  requestStoredDirectoryPermission: vi.fn(),
  selectLocalLibrary: vi.fn(),
}))

vi.mock('../services/local-library-access', () => ({
  ...localLibraryMock,
}))

vi.mock('../services/local-library', () => ({
  initializeLocalLibrary: localLibraryMock.initializeLocalLibrary,
}))

const libraryDirectory = {
  name: '我的梗图',
  queryPermission: vi.fn(),
  requestPermission: vi.fn(),
}

describe('LocalLibraryGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localLibraryMock.initializeLocalLibrary.mockResolvedValue({
      directory: libraryDirectory,
      records: [],
      scannedAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('renders the application after restoring a permitted directory', async () => {
    localLibraryMock.inspectStoredDirectory.mockResolvedValue({
      kind: 'ready',
      directory: libraryDirectory,
    })

    render(
      <LocalLibraryGate>
        <p>梗图库内容</p>
      </LocalLibraryGate>,
    )

    expect(await screen.findByText('梗图库内容')).toBeInTheDocument()
    expect(localLibraryMock.selectLocalLibrary).not.toHaveBeenCalled()
  })

  it('allows a new user to choose a local library', async () => {
    const user = userEvent.setup()
    localLibraryMock.inspectStoredDirectory.mockResolvedValue({
      kind: 'needs-selection',
    })
    localLibraryMock.selectLocalLibrary.mockResolvedValue({
      kind: 'ready',
      directory: libraryDirectory,
    })

    render(
      <LocalLibraryGate>
        <p>梗图库内容</p>
      </LocalLibraryGate>,
    )

    await user.click(
      await screen.findByRole('button', { name: '选择梗图文件夹' }),
    )

    expect(localLibraryMock.selectLocalLibrary).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('梗图库内容')).toBeInTheDocument()
  })

  it('restores a remembered directory without requiring reselection', async () => {
    const user = userEvent.setup()
    localLibraryMock.inspectStoredDirectory.mockResolvedValue({
      kind: 'needs-permission',
      directory: libraryDirectory,
    })
    localLibraryMock.requestStoredDirectoryPermission.mockResolvedValue({
      kind: 'ready',
      directory: libraryDirectory,
    })

    render(
      <LocalLibraryGate>
        <p>梗图库内容</p>
      </LocalLibraryGate>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '继续访问：我的梗图',
      }),
    )

    expect(localLibraryMock.requestStoredDirectoryPermission).toHaveBeenCalledWith(
      libraryDirectory,
    )
    expect(localLibraryMock.selectLocalLibrary).not.toHaveBeenCalled()
    expect(await screen.findByText('梗图库内容')).toBeInTheDocument()
  })
})
