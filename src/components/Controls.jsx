import { useEffect, useRef, useState } from 'react'
import { A } from '../assets.js'

export function Checkbox({ checked }) {
  return <span className={`check${checked ? ' on' : ''}`}>{checked && <img src={A.icCheck} alt="" />}</span>
}

export function Radio({ checked }) {
  return <span className={`radio${checked ? ' on' : ''}`}>{checked && <img src={A.icRadioOn} alt="" />}</span>
}

export function Dropdown({ value, options, onChange, width, height = 32, className = '', icon = A.icChevronDown }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <button ref={ref} type="button" className={`dropdown ${className}`.trim()} style={{ width, height }} onClick={() => setOpen((o) => !o)}>
      <span>{value}</span>
      <img src={icon} alt="" />
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

export function SearchField({ placeholder, value, onChange, icon = A.icSearch, height = 44, iconSize = 20, fontSize = 14 }) {
  return (
    <label className="search" style={{ height }}>
      <img src={icon} alt="" style={{ width: iconSize, height: iconSize }} />
      <input placeholder={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} style={{ fontSize }} />
    </label>
  )
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [message, onDone])
  return message ? <div className="toast">{message}</div> : null
}
