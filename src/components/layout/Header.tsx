import './Header.css'

interface HeaderProps {
  title: string
  onBack?: () => void
  actions?: React.ReactNode
}

export function Header({ title, onBack, actions }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        {onBack && (
          <button className="header-back" onClick={onBack} aria-label="Go back">
            ←
          </button>
        )}
        <h1 className="header-title">{title}</h1>
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </header>
  )
}
