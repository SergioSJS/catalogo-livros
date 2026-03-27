import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '../../src/components/Pagination.jsx'

describe('Pagination', () => {
  it('renders page info', () => {
    render(<Pagination page={2} totalPages={5} onPage={() => {}} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('disables prev on first page', () => {
    render(<Pagination page={1} totalPages={5} onPage={() => {}} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<Pagination page={5} totalPages={5} onPage={() => {}} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onPage with decremented page on prev click', () => {
    const onPage = vi.fn()
    render(<Pagination page={3} totalPages={5} onPage={onPage} />)
    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('calls onPage with incremented page on next click', () => {
    const onPage = vi.fn()
    render(<Pagination page={3} totalPages={5} onPage={onPage} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPage).toHaveBeenCalledWith(4)
  })
})
