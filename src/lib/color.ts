/**
 * Pick black or white text, whichever reads best on the given hex background
 */
export function getReadableTextColor(hex: string): '#000000' | '#ffffff' {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) {
    return '#ffffff'
  }

  const value = parseInt(match[1], 16)
  const [r, g, b] = [value >> 16, (value >> 8) & 0xff, value & 0xff].map(channel => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  // Above this threshold black text has more contrast than white (WCAG contrast ratio)
  return luminance > 0.179 ? '#000000' : '#ffffff'
}
