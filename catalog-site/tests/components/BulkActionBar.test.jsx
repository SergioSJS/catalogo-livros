import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionBar } from '../../src/components/BulkActionBar.jsx'

describe('BulkActionBar', () => {
  it('shows selected count', () => {
    render(<BulkActionBar selectedCount={3} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    expect(screen.getByText(/3 selecionados/)).toBeInTheDocument()
  })

  it('shows singular for 1 selected', () => {
    render(<BulkActionBar selectedCount={1} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    expect(screen.getByText(/1 selecionado/)).toBeInTheDocument()
  })

  it('apply button disabled when selectedCount is 0', () => {
    render(<BulkActionBar selectedCount={0} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    expect(screen.getByRole('button', { name: /aplicar/i })).toBeDisabled()
  })

  it('apply button enabled when selectedCount > 0', () => {
    render(<BulkActionBar selectedCount={2} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    expect(screen.getByRole('button', { name: /aplicar/i })).not.toBeDisabled()
  })

  it('calls onClearSelection when clear button clicked', () => {
    const onClear = vi.fn()
    render(<BulkActionBar selectedCount={2} onApply={() => {}} onClearSelection={onClear} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /limpar seleção/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('calls onExitBulk when exit button clicked', () => {
    const onExit = vi.fn()
    render(<BulkActionBar selectedCount={0} onApply={() => {}} onClearSelection={() => {}} onExitBulk={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: /sair/i }))
    expect(onExit).toHaveBeenCalled()
  })

  it('calls onApply with fields wrapper when in personal mode', () => {
    const onApply = vi.fn()
    render(<BulkActionBar selectedCount={2} onApply={onApply} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ fields: expect.any(Object) }))
  })

  it('shows saving state when saving prop is true', () => {
    render(<BulkActionBar selectedCount={2} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} saving />)
    expect(screen.getByRole('button', { name: /aplicar/i })).toBeDisabled()
    expect(screen.getByText(/salvando/i)).toBeInTheDocument()
  })

  it('renders action and value selects in personal mode', () => {
    render(<BulkActionBar selectedCount={1} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    expect(screen.getByRole('combobox', { name: /campo/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /valor/i })).toBeInTheDocument()
  })

  it('switching to add_tags mode shows tag input', () => {
    render(<BulkActionBar selectedCount={1} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ tags/i }))
    expect(screen.getByRole('textbox', { name: /tags/i })).toBeInTheDocument()
  })

  it('switching to remove_tags mode shows tag input', () => {
    render(<BulkActionBar selectedCount={1} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /− tags/i }))
    expect(screen.getByRole('textbox', { name: /tags/i })).toBeInTheDocument()
  })

  it('add_tags apply button disabled when no tag entered', () => {
    render(<BulkActionBar selectedCount={2} onApply={() => {}} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ tags/i }))
    expect(screen.getByRole('button', { name: /aplicar/i })).toBeDisabled()
  })

  it('calls onApply with add_tags payload', () => {
    const onApply = vi.fn()
    render(<BulkActionBar selectedCount={2} onApply={onApply} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ tags/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /tags/i }), { target: { value: 'OSR, solo' } })
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      add_tags: expect.objectContaining({ system_tags: expect.arrayContaining(['OSR', 'solo']) }),
    }))
  })

  it('calls onApply with remove_tags payload', () => {
    const onApply = vi.fn()
    render(<BulkActionBar selectedCount={2} onApply={onApply} onClearSelection={() => {}} onExitBulk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /− tags/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /tags/i }), { target: { value: 'oldtag' } })
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      remove_tags: expect.objectContaining({ system_tags: ['oldtag'] }),
    }))
  })
})
