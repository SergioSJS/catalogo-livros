import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSidebar } from '../../src/components/FilterSidebar.jsx'

const facets = {
  systems: [{ value: 'OSR', count: 10 }, { value: 'PbtA', count: 5 }],
  categories: [{ value: 'Core Rulebook', count: 8 }],
  genres: [{ value: 'Fantasy', count: 12 }],
  languages: [{ value: 'en', label: 'English', count: 7 }, { value: 'pt', label: 'Português', count: 3 }],
  folders: [{ value: 'RPG/EN', count: 4 }, { value: 'RPG/PT', count: 2 }],
}

const filters = {
  systems: [], categories: [], genres: [], tags: [],
  language: null, folder: null, sort: 'title_asc',
  read_status: null, played_status: null, solo_friendly: null, score_min: null,
}

const noop = () => {}
function defaultProps(overrides = {}) {
  return {
    facets,
    filters,
    onToggleSystem: noop,
    onToggleCategory: noop,
    onToggleGenre: noop,
    onSetLanguage: noop,
    onSetFolder: noop,
    onSetReadStatus: noop,
    onSetPlayedStatus: noop,
    onSetSoloFriendly: noop,
    onSetScoreMin: noop,
    onReset: noop,
    ...overrides,
  }
}

describe('FilterSidebar — filtros de catálogo', () => {
  it('renders system facets with counts', () => {
    render(<FilterSidebar {...defaultProps()} />)
    expect(screen.getByText('OSR')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('PbtA')).toBeInTheDocument()
  })

  it('calls onToggleSystem when system filter clicked', () => {
    const onToggleSystem = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleSystem })} />)
    fireEvent.click(screen.getByText('OSR'))
    expect(onToggleSystem).toHaveBeenCalledWith('OSR')
  })

  it('calls onToggleCategory when category clicked', () => {
    const onToggleCategory = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleCategory })} />)
    fireEvent.click(screen.getByText('Core Rulebook'))
    expect(onToggleCategory).toHaveBeenCalledWith('Core Rulebook')
  })

  it('calls onToggleGenre when genre clicked', () => {
    const onToggleGenre = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleGenre })} />)
    fireEvent.click(screen.getByText('Fantasy'))
    expect(onToggleGenre).toHaveBeenCalledWith('Fantasy')
  })

  it('shows active system as checked', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, systems: ['OSR'] } })} />)
    expect(screen.getByRole('checkbox', { name: /OSR/i })).toBeChecked()
  })

  it('calls onSetLanguage when language radio clicked', () => {
    const onSetLanguage = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetLanguage })} />)
    fireEvent.click(screen.getByRole('radio', { name: /english/i }))
    expect(onSetLanguage).toHaveBeenCalledWith('en')
  })

  it('calls onSetFolder when folder radio clicked', () => {
    const onSetFolder = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetFolder })} />)
    fireEvent.click(screen.getByRole('radio', { name: 'RPG/EN' }))
    expect(onSetFolder).toHaveBeenCalledWith('RPG/EN')
  })

  it('shows reset button only when filters are active', () => {
    const { rerender } = render(<FilterSidebar {...defaultProps()} />)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()

    rerender(<FilterSidebar {...defaultProps({ filters: { ...filters, systems: ['OSR'] } })} />)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn()
    render(<FilterSidebar {...defaultProps({ onReset, filters: { ...filters, systems: ['OSR'] } })} />)
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })
})

describe('FilterSidebar — filtros pessoais', () => {
  it('renders read status options', () => {
    render(<FilterSidebar {...defaultProps()} />)
    expect(screen.getByRole('radio', { name: 'Não lido' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lendo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lido' })).toBeInTheDocument()
  })

  it('calls onSetReadStatus when read status radio clicked', () => {
    const onSetReadStatus = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetReadStatus })} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Lido' }))
    expect(onSetReadStatus).toHaveBeenCalledWith('read')
  })

  it('marks active read_status as checked', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, read_status: 'read' } })} />)
    expect(screen.getByRole('radio', { name: 'Lido' })).toBeChecked()
  })

  it('renders played status options', () => {
    render(<FilterSidebar {...defaultProps()} />)
    expect(screen.getByRole('radio', { name: 'Não jogado' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Jogando' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Jogado' })).toBeInTheDocument()
  })

  it('calls onSetPlayedStatus when played status radio clicked', () => {
    const onSetPlayedStatus = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetPlayedStatus })} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Jogado' }))
    expect(onSetPlayedStatus).toHaveBeenCalledWith('played')
  })

  it('calls onSetSoloFriendly when solo friendly checkbox clicked', () => {
    const onSetSoloFriendly = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetSoloFriendly })} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /solo friendly/i }))
    expect(onSetSoloFriendly).toHaveBeenCalled()
  })

  it('calls onSetScoreMin when star button clicked', () => {
    const onSetScoreMin = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetScoreMin })} />)
    fireEvent.click(screen.getByRole('button', { name: /3 estrelas/i }))
    expect(onSetScoreMin).toHaveBeenCalledWith(3)
  })

  it('shows reset button when personal filter active', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, read_status: 'read' } })} />)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })
})
