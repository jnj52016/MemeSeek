import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MemeSearchBar from './MemeSearchBar'

describe('MemeSearchBar', () => {
  it('submits the current draft when the user presses Enter', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(
      <MemeSearchBar
        initialValue=""
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: '搜索梗图名称或标签',
    })

    await user.type(input, '猫猫{Enter}')

    expect(onSearch.mock.calls[0]?.[0]).toBe('猫猫')
  })
})
