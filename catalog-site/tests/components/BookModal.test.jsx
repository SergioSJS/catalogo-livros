import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BookModal } from '../../src/components/BookModal.jsx'

// Mock the API client
vi.mock('../../src/api/client.js', () => ({
  patchPersonalFields: vi.fn(),
}))
import { patchPersonalFields } from '../../src/api/client.js'

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
  read_status: 'unread',
  played_status: 'unplayed',
  solo_friendly: false,
  review: null,
  score: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookModal — renderização', () => {
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

describe('BookModal — editor pessoal', () => {
  it('save button is hidden initially (no changes)', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument()
  })

  it('save button appears after changing read status', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('calls patchPersonalFields with updated fields on save', async () => {
    patchPersonalFields.mockResolvedValue({ ...book, read_status: 'read', score: 5 })
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(patchPersonalFields).toHaveBeenCalledWith('abc123', expect.objectContaining({
        read_status: 'read',
      }))
    })
  })

  it('calls onUpdate with server response after save', async () => {
    const updatedBook = { ...book, read_status: 'read' }
    patchPersonalFields.mockResolvedValue(updatedBook)
    const onUpdate = vi.fn()
    render(<BookModal book={book} onClose={() => {}} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(updatedBook)
    })
  })

  it('shows error message when save fails', async () => {
    patchPersonalFields.mockRejectedValue(new Error('HTTP 500'))
    render(<BookModal book={book} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText(/erro ao salvar/i)).toBeInTheDocument()
    })
  })

  it('hides save button after successful save', async () => {
    patchPersonalFields.mockResolvedValue({ ...book, read_status: 'read' })
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument()
    })
  })

  it('resets personal state when book changes', async () => {
    const { rerender } = render(<BookModal book={book} onClose={() => {}} />)

    // Faz uma alteração
    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()

    // Troca de livro
    const book2 = { ...book, file_hash: 'xyz999', title: 'Outro Livro' }
    rerender(<BookModal book={book2} onClose={() => {}} />)

    // Save button deve sumir (estado resetado)
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument()
  })
})
