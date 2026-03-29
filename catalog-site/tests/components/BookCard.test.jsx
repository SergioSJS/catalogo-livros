import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookCard } from '../../src/components/BookCard.jsx'

const book = {
  file_hash: 'abc123',
  title: 'Mausritter',
  filename: 'mausritter.pdf',
  parent_folder: 'Mausritter',
  language: 'en',
  page_count: 48,
  system_tags: ['OSR'],
  category_tags: ['Core Rulebook'],
  genre_tags: ['Fantasy'],
  custom_tags: [],
  thumbnail_url: null,
  summary: 'A mouse RPG.',
  llm_confidence: 0.9,
}

describe('BookCard', () => {
  it('renders title', () => {
    render(<BookCard book={book} onSelect={() => {}} />)
    expect(screen.getByText('Mausritter')).toBeInTheDocument()
  })

  it('renders system badge', () => {
    render(<BookCard book={book} onSelect={() => {}} />)
    expect(screen.getByText('OSR')).toBeInTheDocument()
  })

  it('renders page count', () => {
    render(<BookCard book={book} onSelect={() => {}} />)
    expect(screen.getByText(/48/)).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<BookCard book={book} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(book)
  })

  it('renders fallback thumbnail when no thumbnail_url', () => {
    render(<BookCard book={book} onSelect={() => {}} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders score overlay with filled stars when score is set', () => {
    render(<BookCard book={{ ...book, score: 3 }} onSelect={() => {}} />)
    const overlay = screen.getByTestId('score-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveTextContent('★★★')
  })

  it('renders score overlay as empty when score is null', () => {
    render(<BookCard book={{ ...book, score: null }} onSelect={() => {}} />)
    const overlay = screen.getByTestId('score-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveTextContent('Sem nota')
  })
})
