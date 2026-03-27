import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSidebar } from '../../src/components/FilterSidebar.jsx'

const facets = {
  systems: [{ value: 'OSR', count: 10 }, { value: 'PbtA', count: 5 }],
  categories: [{ value: 'Core Rulebook', count: 8 }],
  genres: [{ value: 'Fantasy', count: 12 }],
  languages: [{ value: 'en', label: 'English', count: 10 }, { value: 'pt', label: 'Português', count: 3 }],
  folders: [],
}

const filters = {
  systems: [],
  categories: [],
  genres: [],
  tags: [],
  language: null,
  folder: null,
  sort: 'title_asc',
}

describe('FilterSidebar', () => {
  it('renders system facets with counts', () => {
    render(<FilterSidebar facets={facets} filters={filters} onToggleSystem={() => {}} onToggleCategory={() => {}} onToggleGenre={() => {}} onSetLanguage={() => {}} onReset={() => {}} />)
    expect(screen.getByText('OSR')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('PbtA')).toBeInTheDocument()
  })

  it('calls onToggleSystem when system filter clicked', () => {
    const onToggleSystem = vi.fn()
    render(<FilterSidebar facets={facets} filters={filters} onToggleSystem={onToggleSystem} onToggleCategory={() => {}} onToggleGenre={() => {}} onSetLanguage={() => {}} onReset={() => {}} />)
    fireEvent.click(screen.getByText('OSR'))
    expect(onToggleSystem).toHaveBeenCalledWith('OSR')
  })

  it('shows active system as checked', () => {
    const activeFilters = { ...filters, systems: ['OSR'] }
    render(<FilterSidebar facets={facets} filters={activeFilters} onToggleSystem={() => {}} onToggleCategory={() => {}} onToggleGenre={() => {}} onSetLanguage={() => {}} onReset={() => {}} />)
    const osrCheckbox = screen.getByRole('checkbox', { name: /OSR/i })
    expect(osrCheckbox).toBeChecked()
  })

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn()
    const activeFilters = { ...filters, systems: ['OSR'] }
    render(<FilterSidebar facets={facets} filters={activeFilters} onToggleSystem={() => {}} onToggleCategory={() => {}} onToggleGenre={() => {}} onSetLanguage={() => {}} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
