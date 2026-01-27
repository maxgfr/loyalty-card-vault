import type { HTMLAttributes } from 'react'
import './Card.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'low' | 'medium' | 'high'
}

export function Card({ elevation = 'medium', className = '', children, ...props }: CardProps) {
  return (
    <div className={`card card--${elevation} ${className}`} {...props}>
      {children}
    </div>
  )
}
