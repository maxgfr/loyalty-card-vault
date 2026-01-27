import type { InputHTMLAttributes } from 'react'
import './Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

export function Input({ label, error, fullWidth = false, className = '', ...props }: InputProps) {
  return (
    <div className={`input-wrapper ${fullWidth ? 'input-wrapper--full' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <input className={`input ${error ? 'input--error' : ''} ${className}`} {...props} />
      {error && <span className="input-error">{error}</span>}
    </div>
  )
}
