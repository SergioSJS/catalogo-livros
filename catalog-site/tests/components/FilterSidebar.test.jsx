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
  systems_not: [], categories_not: [], genres_not: [], tags_not: [],
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
    onToggleSystemExclude: noop,
    onToggleCategoryExclude: noop,
    onToggleGenreExclude: noop,
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
  it('renders system facets with counts after expanding group', () => {
    render(<FilterSidebar {...defaultProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    expect(screen.getByText('OSR')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('PbtA')).toBeInTheDocument()
  })

  it('calls onToggleSystem when system filter clicked (after expand)', () => {
    const onToggleSystem = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleSystem })} />)
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    fireEvent.click(screen.getByText('OSR'))
    expect(onToggleSystem).toHaveBeenCalledWith('OSR')
  })

  it('clicking system checkbox directly calls onToggleSystem exactly once', () => {
    const onToggleSystem = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleSystem })} />)
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'OSR' }))
    expect(onToggleSystem).toHaveBeenCalledTimes(1)
    expect(onToggleSystem).toHaveBeenCalledWith('OSR')
  })

  it('calls onToggleCategory when category clicked (after expand)', () => {
    const onToggleCategory = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleCategory })} />)
    fireEvent.click(screen.getByRole('button', { name: /categoria/i }))
    fireEvent.click(screen.getByText('Core Rulebook'))
    expect(onToggleCategory).toHaveBeenCalledWith('Core Rulebook')
  })

  it('calls onToggleGenre when genre clicked (after expand)', () => {
    const onToggleGenre = vi.fn()
    render(<FilterSidebar {...defaultProps({ onToggleGenre })} />)
    fireEvent.click(screen.getByRole('button', { name: /gênero/i }))
    fireEvent.click(screen.getByText('Fantasy'))
    expect(onToggleGenre).toHaveBeenCalledWith('Fantasy')
  })

  it('shows active system as checked (group auto-expanded)', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, systems: ['OSR'] } })} />)
    expect(screen.getByRole('checkbox', { name: /OSR/i })).toBeChecked()
  })

  it('calls onSetLanguage when language radio clicked', () => {
    const onSetLanguage = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetLanguage })} />)
    fireEvent.click(screen.getByRole('button', { name: /idioma/i }))
    fireEvent.click(screen.getByRole('radio', { name: /english/i }))
    expect(onSetLanguage).toHaveBeenCalledWith('en')
  })

  it('calls onSetFolder when folder radio clicked', () => {
    const onSetFolder = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetFolder })} />)
    fireEvent.click(screen.getByRole('button', { name: /pasta/i }))
    fireEvent.click(screen.getByRole('radio', { name: 'RPG/EN' }))
    expect(onSetFolder).toHaveBeenCalledWith('RPG/EN')
  })

  it('shows reset button only when filters are active', () => {
    const { rerender } = render(<FilterSidebar {...defaultProps()} />)
    expect(screen.queryByRole('button', { name: /limpar/i })).not.toBeInTheDocument()

    rerender(<FilterSidebar {...defaultProps({ filters: { ...filters, systems: ['OSR'] } })} />)
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument()
  })

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn()
    render(<FilterSidebar {...defaultProps({ onReset, filters: { ...filters, systems: ['OSR'] } })} />)
    fireEvent.click(screen.getByRole('button', { name: /limpar/i }))
    expect(onReset).toHaveBeenCalled()
  })
})

describe('FilterSidebar — filtro reverso (3 estados)', () => {
  it('excluded item auto-expands the group and renders checkbox', () => {
    render(<FilterSidebar {...defaultProps({
      filters: { ...filters, systems_not: ['OSR'] }
    })} />)
    // Group is auto-expanded because there's an excluded item — no click needed
    expect(screen.getByRole('checkbox', { name: /OSR/i })).toBeInTheDocument()
  })

  it('clicking an included item (active) calls onToggleSystemExclude and removes from include', () => {
    const onToggleSystem = vi.fn()
    const onToggleSystemExclude = vi.fn()
    render(<FilterSidebar {...defaultProps({
      onToggleSystem, onToggleSystemExclude,
      filters: { ...filters, systems: ['OSR'] }
    })} />)
    // OSR is active (included) — click it to go to exclude state
    fireEvent.click(screen.getByRole('checkbox', { name: 'OSR' }))
    expect(onToggleSystem).toHaveBeenCalledWith('OSR')  // removes from include
    expect(onToggleSystemExclude).toHaveBeenCalledWith('OSR')  // adds to exclude
  })

  it('clicking an excluded item calls onToggleSystemExclude to clear it', () => {
    const onToggleSystemExclude = vi.fn()
    render(<FilterSidebar {...defaultProps({
      onToggleSystemExclude,
      filters: { ...filters, systems_not: ['OSR'] }
    })} />)
    // Group is auto-expanded — no expand click needed
    fireEvent.click(screen.getByRole('checkbox', { name: 'OSR' }))
    expect(onToggleSystemExclude).toHaveBeenCalledWith('OSR')
  })

  it('excluded item label has facet-excluded CSS class', () => {
    const { container } = render(<FilterSidebar {...defaultProps({
      filters: { ...filters, systems_not: ['OSR'] }
    })} />)
    // Group is auto-expanded
    expect(container.querySelector('.facet-excluded')).toBeInTheDocument()
  })
})

describe('FilterSidebar — grupos colapsáveis', () => {
  it('filter groups are collapsed by default', () => {
    render(<FilterSidebar {...defaultProps()} />)
    // OSR is in a collapsed group and not visible
    expect(screen.queryByRole('checkbox', { name: 'OSR' })).not.toBeInTheDocument()
  })

  it('clicking group heading expands the group', () => {
    render(<FilterSidebar {...defaultProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    expect(screen.getByRole('checkbox', { name: 'OSR' })).toBeInTheDocument()
  })

  it('clicking group heading again collapses it', () => {
    render(<FilterSidebar {...defaultProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    expect(screen.getByRole('checkbox', { name: 'OSR' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /sistema/i }))
    expect(screen.queryByRole('checkbox', { name: 'OSR' })).not.toBeInTheDocument()
  })

  it('active filter group is expanded by default', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, systems: ['OSR'] } })} />)
    // Has active system filter, group should be expanded
    expect(screen.getByRole('checkbox', { name: 'OSR' })).toBeInTheDocument()
  })
})

describe('FilterSidebar — filtros pessoais', () => {
  it('renders read status options when section expanded', () => {
    render(<FilterSidebar {...defaultProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /leitura/i }))
    expect(screen.getByRole('radio', { name: 'Não lido' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lendo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lido' })).toBeInTheDocument()
  })

  it('calls onSetReadStatus when read status radio clicked', () => {
    const onSetReadStatus = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetReadStatus })} />)
    fireEvent.click(screen.getByRole('button', { name: /leitura/i }))
    fireEvent.click(screen.getByRole('radio', { name: 'Lido' }))
    expect(onSetReadStatus).toHaveBeenCalledWith('read')
  })

  it('marks active read_status as checked (section auto-expanded)', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, read_status: 'read' } })} />)
    expect(screen.getByRole('radio', { name: 'Lido' })).toBeChecked()
  })

  it('renders played status options when section expanded', () => {
    render(<FilterSidebar {...defaultProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /jogado/i }))
    expect(screen.getByRole('radio', { name: 'Não jogado' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Jogando' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Jogado' })).toBeInTheDocument()
  })

  it('calls onSetPlayedStatus when played status radio clicked', () => {
    const onSetPlayedStatus = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetPlayedStatus })} />)
    fireEvent.click(screen.getByRole('button', { name: /jogado/i }))
    fireEvent.click(screen.getByRole('radio', { name: 'Jogado' }))
    expect(onSetPlayedStatus).toHaveBeenCalledWith('played')
  })

  it('calls onSetSoloFriendly when solo friendly checkbox clicked', () => {
    const onSetSoloFriendly = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetSoloFriendly })} />)
    fireEvent.click(screen.getByRole('button', { name: /solo/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /solo friendly/i }))
    expect(onSetSoloFriendly).toHaveBeenCalled()
  })

  it('calls onSetScoreMin when star button clicked', () => {
    const onSetScoreMin = vi.fn()
    render(<FilterSidebar {...defaultProps({ onSetScoreMin })} />)
    fireEvent.click(screen.getByRole('button', { name: /score/i }))
    fireEvent.click(screen.getByRole('button', { name: /3 estrelas/i }))
    expect(onSetScoreMin).toHaveBeenCalledWith(3)
  })

  it('shows reset button when personal filter active', () => {
    render(<FilterSidebar {...defaultProps({ filters: { ...filters, read_status: 'read' } })} />)
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument()
  })
})
