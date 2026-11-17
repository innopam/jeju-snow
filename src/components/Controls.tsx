import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEventHandler } from 'react'
import { A } from '../assets'
import Icon from './Icon'

export function Checkbox({ checked }: { checked: boolean }) {
  return <span className={`check${checked ? ' on' : ''}`}>{checked && <img src={A.icCheck} alt="" />}</span>
}

export function Radio({ checked }: { checked: boolean }) {
  return <span className={`radio${checked ? ' on' : ''}`}>{checked && <img src={A.icRadioOn} alt="" />}</span>
}

// Select (component library) — 기본 Medium 42, size="sm" 이면 Small 34
interface DropdownProps {
  value: string
  options: string[]
  onChange?: (value: string) => void
  width?: number | string
  size?: 'sm'
  className?: string
}
export function Dropdown({ value, options, onChange, width, size, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <button ref={ref} type="button" className={`dropdown${size === 'sm' ? ' dropdown--sm' : ''} ${className}`.trim()} style={{ width }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      <span>{value}</span>
      <Icon name="chevron-down" />
      {open && (
        <ul className="dropdown__list">
          {options.map((o) => (
            <li
              key={o}
              className={o === value ? 'sel' : ''}
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(o)
                setOpen(false)
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}

// Search (component library) — 앞쪽 돋보기, 기본 Medium 42, size="sm" 이면 Small 34
interface SearchFieldProps {
  placeholder?: string
  value: string
  onChange?: (value: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  size?: 'sm'
  className?: string
  style?: CSSProperties
}
export function SearchField({ placeholder, value, onChange, onKeyDown, size, className = '', style }: SearchFieldProps) {
  return (
    <label className={`search${size === 'sm' ? ' search--sm' : ''} ${className}`.trim()} style={style}>
      <Icon name="search" />
      <input placeholder={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} onKeyDown={onKeyDown} />
    </label>
  )
}

// Calendar (component library) — YYYY.MM.DD(W) 표시, 오른쪽 달력 아이콘. 누르면 브라우저 날짜 선택 창
const DOW = ['일', '월', '화', '수', '목', '금', '토']
export const fmtDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return `${iso.replaceAll('-', '.')}(${DOW[d.getDay()]})`
}
interface CalendarFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  min?: string
  max?: string
  width?: number | string
}
export function CalendarField({ value, onChange, label, min, max, width = 160 }: CalendarFieldProps) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    try { ref.current?.showPicker() } catch { ref.current?.focus() }
  }
  return (
    <label className="calendar" style={{ width }} onClick={(e) => { e.preventDefault(); open() }}>
      <span className={value ? '' : 'ph'}>{value ? fmtDate(value) : 'YYYY.MM.DD(W)'}</span>
      <Icon name="calendar" />
      <input ref={ref} type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} aria-label={label} tabIndex={-1} />
    </label>
  )
}

// Feedback · Empty (component library)
export function EmptyState({ title = '데이터 없음', message }: { title?: string; message?: string }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__symbol" aria-hidden="true">□</span>
      <div><b>{title}</b>{message && <small>{message}</small>}</div>
    </div>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [message, onDone])
  return message ? <div className="toast">{message}</div> : null
}
