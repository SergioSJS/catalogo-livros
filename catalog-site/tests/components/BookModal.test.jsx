import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookModal } from '../../src/components/BookModal.jsx'

const book = {
  file_hash: 'abc123',
  title: 'Mausritter',
  filename: 'mausritter.pdf',
  relative_path: 'EN/OSR/Mausritter/mausritter.pdf',
  parent_folder: 'Adventure',
  language: 'en',
  page_count: 48,
  file_size_human: '2.1 MB',
  system_tags: ['OSR'],
  category_tags: ['Core Rulebook'],
  genre_tags: ['Fantasy'],
  custom_tags: ['solo-friendly'],
  thumbnail_url: null,
  summary: 'A mouse RPG where you play tiny mice adventurers.',
  llm_confidence: 0.92,
  llm_provider: 'openrouter',
}

describe('BookModal', () => {
  it('renders book title', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.getByText('Mausritter')).toBeInTheDocument()
  })

  it('renders summary', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.getByText(/mouse RPG/)).toBeInTheDocument()
  })

  it('renders all tags', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.getByText('OSR')).toBeInTheDocument()
    expect(screen.getByText('Core Rulebook')).toBeInTheDocument()
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(screen.getByText('solo-friendly')).toBeInTheDocument()
  })

  it('renders file path', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.getByText(/mausritter.pdf/)).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<BookModal book={book} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when book is null', () => {
    const { container } = render(<BookModal book={null} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
