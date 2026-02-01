import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadBackup } from './backup'

describe('backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('downloadBackup', () => {
    it('triggers download with correct filename', () => {
      const blob = new Blob(['test'], { type: 'application/json' })
      const mockClick = vi.fn()
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

      const mockAnchor = {
        click: mockClick,
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return mockAnchor
        }
        return originalCreateElement(tag)
      })

      document.body.appendChild = mockAppendChild
      document.body.removeChild = mockRemoveChild

      downloadBackup(blob, 'test-backup.json')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
      expect(mockAnchor.download).toBe('test-backup.json')
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor)
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')
    })

    it('uses default filename when not provided', () => {
      const blob = new Blob(['test'], { type: 'application/json' })
      const mockClick = vi.fn()
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      const mockAnchor = {
        click: mockClick,
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return mockAnchor
        }
        return originalCreateElement(tag)
      })

      document.body.appendChild = vi.fn()
      document.body.removeChild = vi.fn()

      downloadBackup(blob)

      expect(mockAnchor.download).toMatch(/^loyalty-cards-backup-\d+\.json$/)
    })
  })
})
