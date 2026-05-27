class HistoryManager {
  constructor(maxSteps) {
    this.stack = []
    this.ptr = -1
    this.maxSteps = maxSteps || 60
  }
  execute(cmd) {
    cmd.execute()
    this.stack.length = this.ptr + 1
    this.stack.push(cmd)
    if (this.stack.length > this.maxSteps) {
      this.stack.shift()
      this.ptr--
    }
    this.ptr = this.stack.length - 1
  }
  undo() {
    if (this.ptr >= 0) { this.stack[this.ptr].undo(); this.ptr--; return true }
    return false
  }
  redo() {
    if (this.ptr < this.stack.length - 1) { this.ptr++; this.stack[this.ptr].execute(); return true }
    return false
  }
  canUndo() { return this.ptr >= 0 }
  canRedo() { return this.ptr < this.stack.length - 1 }
}

export { HistoryManager }
