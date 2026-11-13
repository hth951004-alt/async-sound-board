import { useMemo, useRef, useState } from 'react'
import boardImage from './assets/figma/board.png'
import toolSide from './assets/figma/tool-side.png'
import toolEq from './assets/figma/tool-eq.png'
import BoardModel from './BoardModel.jsx'

const chipModules = import.meta.glob('../image/chip-reed-*.svg', {
  eager: true,
  import: 'default',
})

const GALLERY_CHIPS = Object.entries(chipModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src], index) => {
    const number = path.match(/(\d+)\.svg$/)?.[1] ?? String(index + 1).padStart(3, '0')
    return {
      id: `chip-${number}`,
      src,
      label: `Chip ${number}`,
    }
  })

const BOARD_TOOLS = [
  { id: 'board', src: boardImage, label: 'Board view' },
  { id: 'side', src: toolSide, label: 'Side view' },
  { id: 'eq', src: toolEq, label: 'Control view' },
]

const SLOT_COUNT = 6

export default function App() {
  const boardRef = useRef(null)
  const [placements, setPlacements] = useState([])
  const [dragChipId, setDragChipId] = useState(null)
  const [activeTool, setActiveTool] = useState('board')

  const usedIds = useMemo(
    () => new Set(placements.map((item) => item.chipId)),
    [placements],
  )

  const slotFromPoint = (clientX, clientY) => {
    const board = boardRef.current
    if (!board) return -1
    const rect = board.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    if (x < 0.18 || x > 0.82 || y < 0.22 || y > 0.82) return -1
    return Math.min(SLOT_COUNT - 1, Math.max(0, Math.floor((y - 0.22) / 0.1)))
  }

  const onGalleryPointerDown = (chipId, event) => {
    if (usedIds.has(chipId)) return
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    setDragChipId(chipId)

    const onUp = (upEvent) => {
      target.releasePointerCapture?.(upEvent.pointerId)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)

      const slot = slotFromPoint(upEvent.clientX, upEvent.clientY)
      setDragChipId(null)
      if (slot < 0) return

      setPlacements((current) => {
        const withoutChip = current.filter((item) => item.chipId !== chipId)
        return [...withoutChip, { chipId, slot }]
      })
    }

    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const removePlacement = (chipId) => {
    setPlacements((current) => current.filter((item) => item.chipId !== chipId))
  }

  return (
    <main className="page" data-node-id="1437:231">
      <div className="canvas">
        <aside className="chips-panel" aria-label="Sound Control">
          <p className="section-title section-title--chips">Sound Control</p>
          <div className="chip-grid">
            {GALLERY_CHIPS.map((chip) => {
              const used = usedIds.has(chip.id)
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`chip-card${used ? ' is-used' : ''}${
                    dragChipId === chip.id ? ' is-dragging' : ''
                  }`}
                  aria-label={chip.label}
                  disabled={used}
                  onPointerDown={(event) => onGalleryPointerDown(chip.id, event)}
                >
                  <img src={chip.src} alt="" draggable={false} />
                </button>
              )
            })}
          </div>
        </aside>

        <section className="main-panel">
          <p className="section-title section-title--board">board</p>

          <div className="board-tools" role="toolbar" aria-label="Board tools">
            {BOARD_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`board-tool${activeTool === tool.id ? ' is-active' : ''}`}
                aria-label={tool.label}
                aria-pressed={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id)}
              >
                <img src={tool.src} alt="" draggable={false} />
              </button>
            ))}
          </div>

          <div className="board-stage" ref={boardRef} aria-label="Board">
            <BoardModel view={activeTool} />
            {placements.map((item) => {
              const chip = GALLERY_CHIPS.find((entry) => entry.id === item.chipId)
              if (!chip) return null
              return (
                <button
                  key={item.chipId}
                  type="button"
                  className="board-chip"
                  style={{ top: `${28 + item.slot * 9.2}%` }}
                  aria-label={`Remove ${chip.label}`}
                  onClick={() => removePlacement(item.chipId)}
                >
                  <img src={chip.src} alt="" draggable={false} />
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
