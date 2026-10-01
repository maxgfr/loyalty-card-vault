import { describe, it, expect } from 'vitest'
import { getReadableTextColor } from './color'

describe('getReadableTextColor', () => {
  it('uses white text on dark backgrounds', () => {
    expect(getReadableTextColor('#000000')).toBe('#ffffff')
    expect(getReadableTextColor('#00704A')).toBe('#ffffff')
    expect(getReadableTextColor('#CC0000')).toBe('#ffffff')
  })

  it('uses black text on light backgrounds', () => {
    expect(getReadableTextColor('#FFFFFF')).toBe('#000000')
    expect(getReadableTextColor('#FFD700')).toBe('#000000')
    expect(getReadableTextColor('#e2e8f0')).toBe('#000000')
  })

  it('falls back to white for invalid colors', () => {
    expect(getReadableTextColor('not-a-color')).toBe('#ffffff')
  })
})
