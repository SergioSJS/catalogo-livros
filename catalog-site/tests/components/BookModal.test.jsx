import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { BookModal } from '../../src/components/BookModal.jsx'

// Mock the API client
vi.mock('../../src/api/client.js', () => ({
  patchPersonalFields: vi.fn(),
  patchBookMetadata: vi.fn(),
}))
import { patchPersonalFields, patchBookMetadata } from '../../src/api/client.js'

const book2 = {
  file_hash: 'def456',
  title: 'Cairn',
  filename: 'cairn.pdf',
  relative_path: 'EN/OSR/cairn.pdf',
  parent_folder: 'OSR',
  language: 'en',
  page_count: 60,
  file_size_human: '1.5 MB',
  system_tags: ['OSR'],
  category_tags: [],
  genre_tags: [],
  custom_tags: [],
  thumbnail_url: null,
  summary: 'Cairn RPG.',
  llm_confidence: null,
  llm_provider: null,
  read_status: 'unread',
  played_status: 'unplayed',
  solo_friendly: false,
  review: null,
  score: null,
}

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
  patchBookMetadata.mockResolvedValue({ ...book })
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

  it('renders file path as breadcrumb (dirs only)', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    // formatPath shows directories as "EN › OSR › Mausritter" (filename stripped)
    expect(screen.getByText(/EN/)).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<BookModal book={book} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
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

  it('changes played_status and marks as dirty', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jogado' }))
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('toggles solo_friendly checkbox and marks as dirty', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /solo friendly/i }))
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('changes review textarea and marks as dirty', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/suas notas/i), { target: { value: 'Ótimo jogo!' } })
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('sets score via star button and marks as dirty', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /4 estrelas/i }))
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('sends all personal fields on save', async () => {
    patchPersonalFields.mockResolvedValue({ ...book })
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jogado' }))
    fireEvent.click(screen.getByRole('button', { name: /4 estrelas/i }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(patchPersonalFields).toHaveBeenCalledWith('abc123', expect.objectContaining({
        read_status: 'read',
        played_status: 'played',
        score: 4,
      }))
    })
  })

  it('renders download link with correct hash', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    const link = screen.getByRole('link', { name: /download/i })
    expect(link).toHaveAttribute('href', '/api/books/abc123/download')
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

describe('BookModal — editor de metadados', () => {
  it('shows edit metadata pencil button in same row as close button', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    const editBtn = screen.getByRole('button', { name: /editar metadados/i })
    expect(editBtn).toBeInTheDocument()
    // Both buttons must share the same direct parent (modal-top-bar)
    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    expect(editBtn.parentElement).toBe(closeBtn.parentElement)
  })

  it('clicking edit shows title input with current value', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    expect(screen.getByRole('textbox', { name: /título/i })).toHaveValue('Mausritter')
  })

  it('clicking edit shows summary textarea', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    expect(screen.getByRole('textbox', { name: /resumo/i })).toBeInTheDocument()
  })

  it('can change title and save calls patchBookMetadata', async () => {
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /título/i }), { target: { value: 'Novo Título' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar metadados/i }))
    await waitFor(() => {
      expect(patchBookMetadata).toHaveBeenCalledWith('abc123', expect.objectContaining({ title: 'Novo Título' }))
    })
  })

  it('cancel hides the metadata editor', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('textbox', { name: /título/i })).not.toBeInTheDocument()
  })

  it('can remove a tag chip', async () => {
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    fireEvent.click(screen.getByRole('button', { name: /remover OSR/i }))
    fireEvent.click(screen.getByRole('button', { name: /salvar metadados/i }))
    await waitFor(() => {
      expect(patchBookMetadata).toHaveBeenCalledWith('abc123', expect.objectContaining({ system_tags: [] }))
    })
  })

  it('can add a new tag', async () => {
    render(<BookModal book={book} onClose={() => {}} onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /editar metadados/i }))
    const input = screen.getByPlaceholderText(/adicionar sistema/i)
    fireEvent.change(input, { target: { value: 'PbtA' } })
    fireEvent.click(screen.getByRole('button', { name: /adicionar sistema/i }))
    fireEvent.click(screen.getByRole('button', { name: /salvar metadados/i }))
    await waitFor(() => {
      expect(patchBookMetadata).toHaveBeenCalledWith('abc123', expect.objectContaining({ system_tags: ['OSR', 'PbtA'] }))
    })
  })
})

describe('BookModal — navegação prev/next', () => {
  it('renders prev/next buttons when books list provided', () => {
    render(<BookModal book={book} books={[book, book2]} bookIndex={0} onNavigate={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /próximo/i })).toBeInTheDocument()
  })

  it('prev button disabled on first book', () => {
    render(<BookModal book={book} books={[book, book2]} bookIndex={0} onNavigate={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })

  it('next button disabled on last book', () => {
    render(<BookModal book={book2} books={[book, book2]} bookIndex={1} onNavigate={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled()
  })

  it('clicking next calls onNavigate with next index', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book} books={[book, book2]} bookIndex={0} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }))
    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it('clicking prev calls onNavigate with prev index', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book2} books={[book, book2]} bookIndex={1} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }))
    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  it('ArrowRight key calls onNavigate with next index', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book} books={[book, book2]} bookIndex={0} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it('ArrowLeft key calls onNavigate with prev index', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book2} books={[book, book2]} bookIndex={1} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  it('ArrowRight on last book calls onNavigate with null (cross-page)', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book2} books={[book, book2]} bookIndex={1} onNavigate={onNavigate} hasNextPage onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith('next-page')
  })

  it('ArrowLeft on first book calls onNavigate with prev-page (cross-page)', () => {
    const onNavigate = vi.fn()
    render(<BookModal book={book} books={[book, book2]} bookIndex={0} onNavigate={onNavigate} hasPrevPage onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith('prev-page')
  })

  it('does not render nav buttons without books prop', () => {
    render(<BookModal book={book} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /próximo/i })).not.toBeInTheDocument()
  })
})
