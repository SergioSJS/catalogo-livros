import { useState } from 'react'

const READ_OPTIONS = [
  { value: 'unread', label: 'Não lido' },
  { value: 'reading', label: 'Lendo' },
  { value: 'read', label: 'Lido' },
]
const PLAYED_OPTIONS = [
  { value: 'unplayed', label: 'Não jogado' },
  { value: 'playing', label: 'Jogando' },
  { value: 'played', label: 'Jogado' },
]

const PERSONAL_ACTIONS = [
  { value: 'read_status', label: 'Leitura', valueOptions: READ_OPTIONS },
  { value: 'played_status', label: 'Jogado', valueOptions: PLAYED_OPTIONS },
  { value: 'score', label: 'Score', valueOptions: [1, 2, 3, 4, 5].map(n => ({ value: String(n), label: `${n} ★` })) },
  { value: 'solo_friendly', label: 'Solo friendly', valueOptions: [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }] },
]

const TAG_FIELDS = [
  { value: 'system_tags', label: 'Sistema' },
  { value: 'category_tags', label: 'Categoria' },
  { value: 'genre_tags', label: 'Gênero' },
  { value: 'custom_tags', label: 'Tag custom' },
]

export function BulkActionBar({ selectedCount, onApply, onClearSelection, onExitBulk, saving }) {
  const [mode, setMode] = useState('personal')  // 'personal' | 'add_tags' | 'remove_tags'
  const [action, setAction] = useState('read_status')
  const [value, setValue] = useState('unread')
  const [tagField, setTagField] = useState('system_tags')
  const [tagValue, setTagValue] = useState('')

  function handleActionChange(v) {
    setAction(v)
    setValue(PERSONAL_ACTIONS.find(o => o.value === v)?.valueOptions[0]?.value ?? '')
  }

  function handleApply() {
    if (mode === 'personal') {
      let parsed = value
      if (action === 'score') parsed = Number(value)
      else if (action === 'solo_friendly') parsed = value === 'true'
      onApply({ fields: { [action]: parsed } })
    } else if (mode === 'add_tags') {
      const tags = tagValue.split(',').map(t => t.trim()).filter(Boolean)
      if (!tags.length) return
      onApply({ add_tags: { [tagField]: tags } })
      setTagValue('')
    } else if (mode === 'remove_tags') {
      const tags = tagValue.split(',').map(t => t.trim()).filter(Boolean)
      if (!tags.length) return
      onApply({ remove_tags: { [tagField]: tags } })
      setTagValue('')
    }
  }

  const currentPersonal = PERSONAL_ACTIONS.find(o => o.value === action)
  const canApply = selectedCount > 0 && (mode === 'personal' || tagValue.trim().length > 0)

  return (
    <div className="bulk-bar" role="toolbar" aria-label="Edição em massa">
      <span className="bulk-count">{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>
      <button className="bulk-clear" onClick={onClearSelection} aria-label="Limpar seleção">✕</button>

      <div className="bulk-mode-tabs">
        <button className={`bulk-tab${mode === 'personal' ? ' bulk-tab-active' : ''}`} onClick={() => setMode('personal')}>Campos</button>
        <button className={`bulk-tab${mode === 'add_tags' ? ' bulk-tab-active' : ''}`} onClick={() => setMode('add_tags')}>+ Tags</button>
        <button className={`bulk-tab${mode === 'remove_tags' ? ' bulk-tab-active' : ''}`} onClick={() => setMode('remove_tags')}>− Tags</button>
      </div>

      <div className="bulk-controls">
        {mode === 'personal' && (
          <>
            <select className="bulk-select" value={action} onChange={e => handleActionChange(e.target.value)} aria-label="Campo">
              {PERSONAL_ACTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="bulk-select" value={value} onChange={e => setValue(e.target.value)} aria-label="Valor">
              {currentPersonal?.valueOptions.map(o => (
                <option key={String(o.value)} value={o.value}>{o.label}</option>
              ))}
            </select>
          </>
        )}
        {(mode === 'add_tags' || mode === 'remove_tags') && (
          <>
            <select className="bulk-select" value={tagField} onChange={e => setTagField(e.target.value)} aria-label="Tipo de tag">
              {TAG_FIELDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              className="bulk-tag-input"
              value={tagValue}
              onChange={e => setTagValue(e.target.value)}
              placeholder="tag1, tag2, …"
              aria-label="Tags (separadas por vírgula)"
              onKeyDown={e => e.key === 'Enter' && canApply && !saving && handleApply()}
            />
          </>
        )}

        <button
          className="bulk-apply-btn"
          onClick={handleApply}
          disabled={saving || !canApply}
          aria-label="Aplicar"
        >
          {saving ? 'Salvando…' : 'Aplicar'}
        </button>
      </div>

      <button className="bulk-exit" onClick={onExitBulk} aria-label="Sair da seleção">Sair</button>
    </div>
  )
}
