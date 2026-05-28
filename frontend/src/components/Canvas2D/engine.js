// engine.js — 入口模組，匯入並彙整 4 個子模組後轉發 Engine
import { Engine } from './engine-core.js'
import './engine-render.js'
import './engine-input.js'
import './engine-commands.js'

export { Engine }
