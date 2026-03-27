import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from '../../src/components/SearchBar.jsx'

describe('SearchBar', () => {
  it('renders input', () => {
    render(<SearchBar value="" onChange={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('shows current value', () => {
    render(<SearchBar value="mausritter" onChange={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('searchbox')).toHaveValue('mausritter')
  })

  it('calls onChange on input', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} onClear={() => {}} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cairn' } })
    expect(onChange).toHaveBeenCalledWith('cairn')
  })

  it('shows clear button when value is not empty', () => {
    render(<SearchBar value="maus" onChange={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<SearchBar value="" onChange={() => {}} onClear={() => {}} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('calls onClear when clear button clicked', () => {
    const onClear = vi.fn()
    render(<SearchBar value="maus" onChange={() => {}} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalled()
  })
})
