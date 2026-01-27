import type { Route } from '../../types'
import './BottomNav.css'

interface BottomNavProps {
  currentPage: string
  onNavigate: (route: Route) => void
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentPage === 'home' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate({ page: 'home' })}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Cards</span>
      </button>

      <button
        className={`nav-item ${currentPage === 'scan' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate({ page: 'scan' })}
      >
        <span className="nav-icon">📷</span>
        <span className="nav-label">Scan</span>
      </button>

      <button
        className={`nav-item ${currentPage === 'add' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate({ page: 'add' })}
      >
        <span className="nav-icon">➕</span>
        <span className="nav-label">Add</span>
      </button>

      <button
        className={`nav-item ${currentPage === 'settings' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate({ page: 'settings' })}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
      </button>
    </nav>
  )
}
