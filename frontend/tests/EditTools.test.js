import { describe, it, expect } from 'vitest'
import { isEditCommand, getEditToolCursor } from '../src/components/Canvas2D/EditTools.js'

describe('EditTools', () => {
  describe('isEditCommand', () => {
    it('should return true for copy', () => expect(isEditCommand('copy')).toBe(true))
    it('should return true for rotate', () => expect(isEditCommand('rotate')).toBe(true))
    it('should return true for mirror', () => expect(isEditCommand('mirror')).toBe(true))
    it('should return true for offset', () => expect(isEditCommand('offset')).toBe(true))
    it('should return true for trim', () => expect(isEditCommand('trim')).toBe(true))
    it('should return true for rect', () => expect(isEditCommand('rect')).toBe(true))
    it('should return false for select', () => expect(isEditCommand('select')).toBe(false))
    it('should return false for unknown', () => expect(isEditCommand('line')).toBe(false))
  })

  describe('getEditToolCursor', () => {
    it('should return copy cursor for copy', () => expect(getEditToolCursor('copy')).toBe('copy'))
    it('should return default cursor for unknown', () => expect(getEditToolCursor('select')).toBe('default'))
  })

  describe('handleEditMouseDown', () => {
    it('should be an exported function', () => {
      const mod = require('../src/components/Canvas2D/EditTools.js')
      expect(typeof mod.handleEditMouseDown).toBe('function')
    })
  })

  describe('handleEditMouseMove', () => {
    it('should be an exported function', () => {
      const mod = require('../src/components/Canvas2D/EditTools.js')
      expect(typeof mod.handleEditMouseMove).toBe('function')
    })
  })

  describe('handleEditMouseUp', () => {
    it('should be an exported function', () => {
      const mod = require('../src/components/Canvas2D/EditTools.js')
      expect(typeof mod.handleEditMouseUp).toBe('function')
    })
  })

  describe('drawEditPreview', () => {
    it('should be an exported function', () => {
      const mod = require('../src/components/Canvas2D/EditTools.js')
      expect(typeof mod.drawEditPreview).toBe('function')
    })
  })

  describe('isEditCommand integration', () => {
    it('should handle all edit tools in one group', () => {
      const editTools = ['copy', 'rotate', 'mirror', 'offset', 'trim', 'rect']
      for (const t of editTools) {
        expect(isEditCommand(t)).toBe(true)
      }
    })
  })
})
