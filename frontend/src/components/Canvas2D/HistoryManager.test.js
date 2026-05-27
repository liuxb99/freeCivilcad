import { describe, it, expect } from 'vitest'
import { HistoryManager } from './HistoryManager'

describe('HistoryManager', () => {
  it('constructor sets maxSteps default to 60', () => {
    const hm = new HistoryManager()
    expect(hm.maxSteps).toBe(60)
  })

  it('execute() adds a command, canUndo/canRedo works', () => {
    const hm = new HistoryManager(10)
    let executed = false
    const cmd = { execute() { executed = true }, undo() {} }
    hm.execute(cmd)
    expect(executed).toBe(true)
    expect(hm.canUndo()).toBe(true)
    expect(hm.canRedo()).toBe(false)
  })

  it('undo() reverses the command', () => {
    const hm = new HistoryManager(10)
    let undone = false
    const cmd = { execute() {}, undo() { undone = true } }
    hm.execute(cmd)
    hm.undo()
    expect(undone).toBe(true)
    expect(hm.canUndo()).toBe(false)
    expect(hm.canRedo()).toBe(true)
  })

  it('redo() re-executes after undo', () => {
    const hm = new HistoryManager(10)
    let count = 0
    const cmd = { execute() { count++ }, undo() {} }
    hm.execute(cmd)
    hm.undo()
    hm.redo()
    expect(count).toBe(2)
    expect(hm.canUndo()).toBe(true)
    expect(hm.canRedo()).toBe(false)
  })

  it('maxSteps overflow trimming works', () => {
    const hm = new HistoryManager(3)
    const cmds = []
    for (let i = 0; i < 5; i++) {
      const cmd = { execute() {}, undo() {}, id: i }
      cmds.push(cmd)
      hm.execute(cmd)
    }
    expect(hm.stack.length).toBe(3)
    expect(hm.stack[0].id).toBe(2)
    expect(hm.stack[1].id).toBe(3)
    expect(hm.stack[2].id).toBe(4)
    expect(hm.ptr).toBe(2)
    expect(hm.canUndo()).toBe(true)
    expect(hm.canRedo()).toBe(false)
  })

  it('undo returns false when nothing to undo', () => {
    const hm = new HistoryManager(10)
    expect(hm.undo()).toBe(false)
    expect(hm.canUndo()).toBe(false)
  })

  it('redo returns false when nothing to redo', () => {
    const hm = new HistoryManager(10)
    const cmd = { execute() {}, undo() {} }
    hm.execute(cmd)
    expect(hm.redo()).toBe(false)
  })
})
