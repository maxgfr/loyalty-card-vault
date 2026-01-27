import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { useHashRouter } from '../../hooks/useHashRouter'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { route, navigate } = useHashRouter()

  return (
    <div className="app-layout">
      <main className="main-content">{children}</main>
      <BottomNav currentPage={route.page} onNavigate={navigate} />
    </div>
  )
}
