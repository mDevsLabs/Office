import React, { useEffect, useRef } from 'react'
import { IconEnter, IconSend, IconStop } from './icons'
import { formatModelDisplayName, DEFAULT_AI_MODELS } from './models'

// Keep in sync with the CSS `max-height` on `.ai-input-box textarea` (7 lines à 21px)
const MAX_TEXTAREA_HEIGHT = 147

/**
 * The AI panel input box shared by docs and sheets: auto-growing textarea
 * (Enter sends, Shift+Enter newline, Esc stops) plus a footer with optional
 * app-specific controls, a shortcut hint, and the send/stop button.
 * Renders the `.ai-input-box` class family; each app themes it in its own CSS.
 */
export function AiComposer({
  value,
  busy,
  placeholder,
  hintIdle,
  hintBusy,
  hintIdleTitle,
  sendLabel,
  stopLabel,
  ariaLabel,
  footerStart,
  iconOnly = false,
  sendIconEnabled,
  sendIconDisabled,
  stopIcon,
  textareaRef,
  onChange,
  onSend,
  onStop,
  onPasteFiles,
  models,
  selectedModel,
  onModelChange,
}: {
  readonly value: string
  readonly busy: boolean
  readonly placeholder: string
  readonly hintIdle: string
  readonly hintBusy: string
  readonly hintIdleTitle?: string | undefined
  readonly sendLabel: string
  readonly stopLabel: string
  readonly ariaLabel?: string | undefined
  /** extra controls at the left of the footer (attach button, toggles, …) */
  readonly footerStart?: React.ReactNode
  /** Models data to display the model selector */
  readonly models?: { id: string; name: string }[] | undefined
  /** Currently selected model */
  readonly selectedModel?: string | undefined
  /** Callback when the selected model changes */
  readonly onModelChange?: ((modelId: string) => void) | undefined
  /** compact variant: no hint text, icon-only enter/stop button (mAI Office composer style) */
  readonly iconOnly?: boolean | undefined
  /** custom art for the icon-only send button (e.g. brand-supplied PNGs); falls back to IconEnter */
  readonly sendIconEnabled?: React.ReactNode
  readonly sendIconDisabled?: React.ReactNode
  /** custom art for the icon-only stop button while busy; falls back to IconStop */
  readonly stopIcon?: React.ReactNode
  /** pass a ref to focus the textarea from outside */
  readonly textareaRef?: React.RefObject<HTMLTextAreaElement | null> | undefined
  readonly onChange: (next: string) => void
  readonly onSend: () => void
  readonly onStop: () => void
  /** clipboard files pasted into the textarea (screenshots, copied files); text paste stays native */
  readonly onPasteFiles?: ((files: File[]) => void) | undefined
}): React.JSX.Element {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const ref = textareaRef ?? innerRef
  const canSend = value.trim().length > 0 && !busy

  const [internalModels, setInternalModels] = React.useState<{ id: string; name: string }[]>(DEFAULT_AI_MODELS)
  const [internalSelectedModel, setInternalSelectedModel] = React.useState(
    () => localStorage.getItem('mai_default_model') || localStorage.getItem('mai_model') || 'google/gemma-4-26b-a4b-it:free',
  )
  const displayModels = models && models.length > 0 ? models : internalModels
  const currentModel = selectedModel || internalSelectedModel || 'google/gemma-4-26b-a4b-it:free'

  // Listen for model changes across windows / components
  React.useEffect(() => {
    const handleModelUpdate = () => {
      const saved = localStorage.getItem('mai_default_model') || localStorage.getItem('mai_model')
      if (saved && saved !== internalSelectedModel) {
        setInternalSelectedModel(saved)
        if (onModelChange) onModelChange(saved)
      }
    }
    window.addEventListener('mai_model_updated', handleModelUpdate)
    window.addEventListener('storage', handleModelUpdate)
    return () => {
      window.removeEventListener('mai_model_updated', handleModelUpdate)
      window.removeEventListener('storage', handleModelUpdate)
    }
  }, [internalSelectedModel, onModelChange])

  React.useEffect(() => {
    async function fetchModels() {
      try {
        const apiKey = localStorage.getItem('mai_api_key') || localStorage.getItem('mai_token') || ''
        const headers: Record<string, string> = {}
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }

        const modelsRes = await fetch('https://mai.val.run/v1/models', { headers })
        const modelsData = await modelsRes.json()
        if (modelsData && modelsData.data && modelsData.data.length > 0) {
          const list = modelsData.data.map((m: any) => ({
            id: m.id,
            name: formatModelDisplayName(m.id, m.name),
          }))
          setInternalModels(list)
          const savedModel = localStorage.getItem('mai_default_model') || localStorage.getItem('mai_model')
          const isValidSaved = list.some((m: any) => m.id === savedModel)
          const nextModel = isValidSaved && savedModel ? savedModel : (selectedModel || list[0].id)
          setInternalSelectedModel(nextModel)
          localStorage.setItem('mai_model', nextModel)
          if (onModelChange) onModelChange(nextModel)
        }
      } catch (err) {
        console.error('Failed to fetch mAI models', err)
      }
    }
    fetchModels()
  }, [])

  // auto-grow up to ~6 lines; empty clears the inline height outright so the
  // CSS min-height governs (a hidden-at-measure pass can leave a stale value).
  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    if (value === '') {
      ta.style.height = ''
      return
    }
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [value, ref])

  return (
    <div className="ai-input-box">
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (canSend) onSend()
          } else if (e.key === 'Escape' && busy) {
            e.preventDefault()
            onStop()
          }
        }}
        onPaste={(e) => {
          if (!onPasteFiles) return
          const files = Array.from(e.clipboardData.files)
          if (files.length === 0) return
          e.preventDefault()
          onPasteFiles(files)
        }}
      />
      <div
        className="ai-input-footer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '6px 10px 8px',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          className="ai-input-footer-left"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            flex: '1 1 auto',
            overflow: 'hidden',
          }}
        >
          {footerStart}
          {displayModels && displayModels.length > 0 && (
            <div
              className="ai-model-select-wrapper"
              style={{
                minWidth: 0,
                maxWidth: '140px',
                flex: '0 1 auto',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <select
                className="ai-model-select"
                value={currentModel}
                onChange={(e) => {
                  const val = e.target.value
                  setInternalSelectedModel(val)
                  localStorage.setItem('mai_model', val)
                  window.dispatchEvent(new Event('mai_model_updated'))
                  if (onModelChange) onModelChange(val)
                }}
                disabled={busy}
                title={`Modèle sélectionné : ${displayModels.find((m) => m.id === currentModel)?.name || formatModelDisplayName(currentModel)}`}
                style={{
                  width: '100%',
                  maxWidth: '140px',
                  minWidth: '60px',
                  height: '24px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(128,128,128,0.25)',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: 'rgba(128,128,128,0.08)',
                  color: 'inherit',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {displayModels.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: '#222', color: '#fff' }}>
                    {m.name || formatModelDisplayName(m.id)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          className="ai-input-footer-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            marginLeft: 'auto',
          }}
        >
          {!iconOnly && (
            <span className="ai-input-hint" title={busy ? undefined : hintIdleTitle}>
              {busy ? hintBusy : hintIdle}
            </span>
          )}
          {busy ? (
            <button
              className="ai-send-btn ai-stop-btn"
              onClick={onStop}
              title={stopLabel}
              aria-label={stopLabel}
            >
              {iconOnly ? (stopIcon ?? <IconStop size={16} />) : <IconStop size={16} />}
              {!iconOnly && stopLabel}
            </button>
          ) : (
            <button
              className="ai-send-btn"
              onClick={onSend}
              disabled={!canSend}
              title={sendLabel}
              aria-label={sendLabel}
            >
              {iconOnly ? (
                ((canSend ? sendIconEnabled : (sendIconDisabled ?? sendIconEnabled)) ?? (
                  <IconEnter size={16} />
                ))
              ) : (
                <IconSend size={16} />
              )}
              {!iconOnly && sendLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
