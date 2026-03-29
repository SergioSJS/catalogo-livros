import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnrichingPanel } from '../../src/components/EnrichingPanel.jsx'

function makeEnricher(overrides = {}) {
  return {
    isEnriching: false,
    progress: null,
    error: null,
    failedCount: 0,
    startEnrich: vi.fn(),
    startEnrichRetry: vi.fn(),
    ...overrides,
  }
}

describe('EnrichingPanel', () => {
  it('renders enrich button when idle', () => {
    render(<EnrichingPanel enricher={makeEnricher()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /enriquecer com ia/i })).toBeInTheDocument()
  })

  it('enrich button is disabled while enriching', () => {
    render(<EnrichingPanel enricher={makeEnricher({ isEnriching: true, progress: {} })} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /enriquecer com ia/i })).toBeDisabled()
  })

  it('shows progress bar when enriching', () => {
    const enricher = makeEnricher({ isEnriching: true, progress: { total: 10, processed: 4, current_file: 'book.pdf' } })
    render(<EnrichingPanel enricher={enricher} onStart={vi.fn()} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('4/10')).toBeInTheDocument()
  })

  it('shows retry button when failedCount > 0 and not enriching', () => {
    render(<EnrichingPanel enricher={makeEnricher({ failedCount: 3 })} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /retry 3 failed/i })).toBeInTheDocument()
  })

  it('does not show retry button when failedCount is 0', () => {
    render(<EnrichingPanel enricher={makeEnricher({ failedCount: 0 })} onStart={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('does not show retry button while enriching even if failedCount > 0', () => {
    render(<EnrichingPanel enricher={makeEnricher({ isEnriching: true, progress: {}, failedCount: 2 })} onStart={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('retry button calls startEnrichRetry', () => {
    const enricher = makeEnricher({ failedCount: 2 })
    render(<EnrichingPanel enricher={enricher} onStart={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /retry 2 failed/i }))
    expect(enricher.startEnrichRetry).toHaveBeenCalledOnce()
  })

  it('shows error message when error is set', () => {
    const enricher = makeEnricher({ error: new Error('LLM timeout') })
    render(<EnrichingPanel enricher={enricher} onStart={vi.fn()} />)
    expect(screen.getByText('LLM timeout')).toBeInTheDocument()
  })
})
