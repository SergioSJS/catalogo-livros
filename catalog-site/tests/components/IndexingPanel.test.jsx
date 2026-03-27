import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IndexingPanel } from '../../src/components/IndexingPanel.jsx'

const progressIdle = { status: 'idle', isIndexing: false, progress: {}, error: null }
const progressIndexing = {
  status: 'indexing',
  isIndexing: true,
  progress: { phase: 'extracting', total_files: 10, processed: 3, new_files: 3, skipped: 0, errors: 0, elapsed_seconds: 5 },
  error: null,
}

describe('IndexingPanel', () => {
  it('renders reindex button when idle', () => {
    render(<IndexingPanel indexer={progressIdle} onStart={() => {}} />)
    expect(screen.getByRole('button', { name: /reindex/i })).toBeInTheDocument()
  })

  it('button is disabled while indexing', () => {
    render(<IndexingPanel indexer={progressIndexing} onStart={() => {}} />)
    expect(screen.getByRole('button', { name: /reindex/i })).toBeDisabled()
  })

  it('shows progress bar while indexing', () => {
    render(<IndexingPanel indexer={progressIndexing} onStart={() => {}} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('calls onStart when button clicked', () => {
    const onStart = vi.fn()
    render(<IndexingPanel indexer={progressIdle} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /reindex/i }))
    expect(onStart).toHaveBeenCalled()
  })

  it('shows error message when error is set', () => {
    const withError = { ...progressIdle, error: new Error('Connection failed') }
    render(<IndexingPanel indexer={withError} onStart={() => {}} />)
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument()
  })
})
