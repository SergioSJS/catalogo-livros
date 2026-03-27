import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookGrid } from '../../src/components/BookGrid.jsx'

const books = [
  { file_hash: 'h1', title: 'Mausritter', system_tags: ['OSR'], category_tags: [], genre_tags: [], custom_tags: [], page_count: 48, thumbnail_url: null, language: 'en', filename: 'a.pdf', parent_folder: 'A', llm_confidence: null, summary: null },
  { file_hash: 'h2', title: 'Cairn', system_tags: ['OSR'], category_tags: [], genre_tags: [], custom_tags: [], page_count: 60, thumbnail_url: null, language: 'en', filename: 'b.pdf', parent_folder: 'B', llm_confidence: null, summary: null },
]

describe('BookGrid', () => {
  it('renders all book cards', () => {
    render(<BookGrid books={books} loading={false} onSelect={() => {}} />)
    expect(screen.getByText('Mausritter')).toBeInTheDocument()
    expect(screen.getByText('Cairn')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    render(<BookGrid books={[]} loading={true} onSelect={() => {}} />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('shows empty state when no books', () => {
    render(<BookGrid books={[]} loading={false} onSelect={() => {}} />)
    expect(screen.getByText(/no books/i)).toBeInTheDocument()
  })
})
