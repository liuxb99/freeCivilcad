import React from 'react'

/**
 * WelcomePage — 首頁歡迎畫面
 *
 * 使用 Catppuccin Mocha 暗色主題，
 * 提供 FreeCivilCAD 軟體說明、功能列表、快捷鍵一覽與操作指引。
 */
export default function WelcomePage({ onStart }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* 標題區 */}
        <header style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>🛠️</span>{' '}
            FreeCivilCAD
          </h1>
          <p style={styles.subtitle}>
            一個完全在 <strong>Chrome 瀏覽器</strong> 中運行的土木工程 CAD 軟體
          </p>
          <p style={styles.description}>
            無需安裝、無需註冊，打開瀏覽器即可開始繪製工程圖。
            支援常見的 2D 繪圖與編輯工具，搭配智慧捕捉系統、
            圖層管理與 AI 命令輸入，讓您在瀏覽器中享受專業級的 CAD 體驗。
          </p>
        </header>

        {/* 功能列表 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>✨ 功能特色</h2>
          <div style={styles.featureGrid}>
            <FeatureCard
              icon="✏️"
              title="繪圖工具"
              items={['LINE (直線)', 'CIRCLE (圓)', 'ARC (弧)', 'POLYGON (多邊形)', 'POLYLINE (多段線)', 'TEXT (文字)']}
            />
            <FeatureCard
              icon="🔧"
              title="編輯工具"
              items={['MOVE (移動)', 'COPY (複製)', 'ROTATE (旋轉)', 'MIRROR (鏡像)', 'OFFSET (偏移)', 'TRIM (修剪)']}
            />
            <FeatureCard
              icon="📏"
              title="進階功能"
              items={['尺寸標註 (DIM)', '圖層管理 (Layer)', '捕捉系統 (Snap)', 'AI 命令輸入']}
            />
          </div>
        </section>

        {/* 快捷鍵一覽表 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⌨️ 快捷鍵一覽</h2>
          <div style={styles.shortcutGrid}>
            <ShortcutTable
              title="工具快捷鍵"
              rows={[
                { key: 'V', desc: '選取 (SELECT)' },
                { key: 'L', desc: '直線 (LINE)' },
                { key: 'C', desc: '圓形 (CIRCLE)' },
                { key: 'A', desc: '弧 (ARC)' },
                { key: 'P', desc: '多段線 (POLYLINE)' },
                { key: 'R', desc: '矩形 (RECTANGLE)' },
                { key: 'T', desc: '文字 (TEXT)' },
                { key: 'D', desc: '尺寸標註 (DIM)' },
              ]}
            />
            <ShortcutTable
              title="編輯快捷鍵"
              rows={[
                { key: 'X', desc: '複製 (COPY)' },
                { key: 'M', desc: '移動 (MOVE)' },
                { key: 'O', desc: '偏移 (OFFSET)' },
                { key: 'Delete', desc: '刪除所選' },
                { key: 'Ctrl+Z', desc: '復原 (UNDO)' },
                { key: 'Ctrl+Y', desc: '重做 (REDO)' },
                { key: 'Ctrl+S', desc: '儲存 JSON' },
                { key: 'Ctrl+O', desc: '載入 JSON' },
              ]}
            />
          </div>
        </section>

        {/* 操作說明 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🚀 開始畫圖</h2>
          <div style={styles.instructions}>
            <InstructionStep number={1} text="點擊下方「開始使用」按鈕進入繪圖介面" />
            <InstructionStep number={2} text="按 L 鍵切換到直線工具，在畫布上按一下設定起點，再按一下設定終點" />
            <InstructionStep number={3} text="按 V 鍵切回選取工具，點選圖元後可按 M 移動、X 複製或 Delete 刪除" />
            <InstructionStep number={4} text="右下角面板可管理圖層與檢視圖元屬性" />
            <InstructionStep number={5} text="底部命令列支援 AI 輸入，試試輸入「畫一條從 (0,0) 到 (100,100) 的線」" />
          </div>
        </section>

        {/* 開始使用按鈕 */}
        <div style={styles.startArea}>
          <button style={styles.startBtn} onClick={onStart}>
            開始使用 →
          </button>
          <p style={styles.hint}>
            點擊後進入 CAD 繪圖介面 • 之後可透過左上角 ☰ 選單回到此頁
          </p>
        </div>

        {/* 版本資訊 */}
        <footer style={styles.footer}>
          <span>FreeCivilCAD v0.1.0</span>
          <span style={styles.footerSep}>•</span>
          <span>Catppuccin Mocha 主題</span>
        </footer>
      </div>
    </div>
  )
}

// ─── 子元件 ────────────────────────────────────────────

function FeatureCard({ icon, title, items }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>{icon}</span>
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
      <ul style={styles.cardList}>
        {items.map((item, i) => (
          <li key={i} style={styles.cardListItem}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function ShortcutTable({ title, rows }) {
  return (
    <div style={styles.shortcutCol}>
      <h4 style={styles.shortcutColTitle}>{title}</h4>
      <table style={styles.shortcutTable}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={styles.shortcutKeyCell}>
                <kbd style={styles.kbd}>{row.key}</kbd>
              </td>
              <td style={styles.shortcutDescCell}>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InstructionStep({ number, text }) {
  return (
    <div style={styles.instructionStep}>
      <span style={styles.stepBadge}>{number}</span>
      <span style={styles.stepText}>{text}</span>
    </div>
  )
}

// ─── 主題色彩 (Catppuccin Mocha) ───────────────────────

const colors = {
  crust: '#11111b',
  mantle: '#181825',
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  overlay0: '#6c7086',
  overlay1: '#7f849c',
  subtext0: '#a6adc8',
  text: '#cdd6f4',
  blue: '#89b4fa',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  mauve: '#cba6f7',
  red: '#f38ba8',
  teal: '#94e2d5',
  peach: '#fab387',
}

// ─── 樣式 ──────────────────────────────────────────────

const styles = {
  wrapper: {
    width: '100vw',
    height: '100vh',
    overflow: 'auto',
    backgroundColor: colors.base,
    color: colors.text,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  container: {
    maxWidth: '880px',
    margin: '0 auto',
    padding: '48px 24px 64px',
  },

  // 標題
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '42px',
    fontWeight: 700,
    color: colors.text,
    margin: '0 0 12px',
    letterSpacing: '-1px',
  },
  titleIcon: {
    fontSize: '40px',
  },
  subtitle: {
    fontSize: '18px',
    color: colors.subtext0,
    margin: '0 0 8px',
  },
  description: {
    fontSize: '15px',
    color: colors.overlay0,
    lineHeight: '1.7',
    maxWidth: '600px',
    margin: '0 auto',
  },

  // 區塊
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: colors.blue,
    margin: '0 0 16px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${colors.surface0}`,
  },

  // 功能卡
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: colors.mantle,
    border: `1px solid ${colors.surface0}`,
    borderRadius: '12px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
    margin: 0,
  },
  cardList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  cardListItem: {
    fontSize: '13px',
    color: colors.subtext0,
    padding: '4px 0',
    paddingLeft: '8px',
    borderLeft: `2px solid ${colors.surface1}`,
    marginBottom: '4px',
  },

  // 快捷鍵
  shortcutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  shortcutCol: {},
  shortcutColTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.peach,
    margin: '0 0 10px',
  },
  shortcutTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  shortcutKeyCell: {
    width: '110px',
    padding: '4px 8px 4px 0',
    verticalAlign: 'middle',
  },
  shortcutDescCell: {
    padding: '4px 0',
    fontSize: '13px',
    color: colors.subtext0,
    verticalAlign: 'middle',
  },
  kbd: {
    display: 'inline-block',
    backgroundColor: colors.surface0,
    color: colors.text,
    border: `1px solid ${colors.surface2}`,
    borderRadius: '5px',
    padding: '2px 8px',
    fontSize: '12px',
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
  },

  // 操作步驟
  instructions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  instructionStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  stepBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: colors.blue,
    color: colors.crust,
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0,
  },
  stepText: {
    fontSize: '14px',
    color: colors.subtext0,
    lineHeight: '1.6',
    paddingTop: '3px',
  },

  // 開始按鈕
  startArea: {
    textAlign: 'center',
    margin: '48px 0 32px',
  },
  startBtn: {
    display: 'inline-block',
    backgroundColor: colors.blue,
    color: colors.crust,
    border: 'none',
    borderRadius: '12px',
    padding: '16px 48px',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: `0 4px 16px ${colors.blue}40`,
    letterSpacing: '0.5px',
  },
  hint: {
    marginTop: '12px',
    fontSize: '12px',
    color: colors.overlay0,
  },

  // 頁尾
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: colors.overlay0,
    borderTop: `1px solid ${colors.surface0}`,
    paddingTop: '20px',
    marginTop: '16px',
  },
  footerSep: {
    margin: '0 8px',
  },
}
