const BASE_URL = '/api'

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, options)
  const data = await res.json()

  if (!data.success) throw new Error(data.error || 'Unknown error')
  return data.data
}

export const canvasApi = {
  executeCommand(commands, canvasState = { entities: [], layers: [] }) {
    return request('POST', '/canvas/command', { commands, canvas_state: canvasState })
  },
  logCommand(cmd) {
    return request('POST', '/canvas/command', { commands: [cmd] })
  },
  undoCommand(session = 'default') {
    return request('POST', '/canvas/commands/undo', { session })
  },
  redoCommand(session = 'default') {
    return request('POST', '/canvas/commands/redo', { session })
  },
  replaySession(session) {
    return request('GET', `/canvas/commands/replay/${session}`)
  },
}

export const layerApi = {
  list() { return request('GET', '/layers') },
  create(name, color) { return request('POST', '/layers', { name, color }) },
  delete(id) { return request('DELETE', `/layers/${id}`) },
  update(id, data) { return request('PATCH', `/layers/${id}`, data) },
}

export const fileApi = {
  save(data) { return request('POST', '/file/save', data) },
  load() { return request('POST', '/file/load') },
  importDXF(file) {
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${BASE_URL}/file/import-dxf`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json()).then(d => {
      if (!d.success) throw new Error(d.error)
      return d.data
    })
  },
}

export const llmApi = {
  parse(text, entities = []) { return request('POST', '/llm/parse', { text, entities }) },
}

export const commandLogApi = {
  getCommands(session, limit = 100, offset = 0) {
    const params = new URLSearchParams()
    if (session) params.set('session', session)
    params.set('limit', limit)
    params.set('offset', offset)
    return request('GET', `/canvas/commands?${params}`)
  },
  getSessions() {
    return request('GET', '/canvas/commands/sessions')
  },
}

export const healthApi = {
  check() { return request('GET', '/health') },
}

export default { canvasApi, layerApi, fileApi, llmApi, commandLogApi, healthApi }
