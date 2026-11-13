import { useMemo, useState } from 'react'
import BoardModel, { ROW_COUNT, pickChipX } from './BoardModel.jsx'

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

export default function App() {
  const [placements, setPlacements] = useState([])

  const usedIds = useMemo(
    () => new Set(placements.map((item) => item.chipId)),
    [placements],
  )

  /** Prefer the least-filled row so several chips can share a line with random X. */
  const nextRow = (current) => {
    const active = current.filter((item) => !item.exiting)
    const counts = Array.from({ length: ROW_COUNT }, () => 0)
    for (const item of active) counts[item.slot] += 1
    let best = 0
    for (let row = 1; row < ROW_COUNT; row += 1) {
      if (counts[row] < counts[best]) best = row
    }
    return best
  }

  const requestRemove = (chipId) => {
    setPlacements((current) =>
      current.map((item) =>
        item.chipId === chipId && !item.exiting ? { ...item, exiting: true } : item,
      ),
    )
  }

  const finishRemove = (chipId) => {
    setPlacements((current) => current.filter((item) => item.chipId !== chipId))
  }

  const onGalleryClick = (chipId) => {
    if (usedIds.has(chipId)) {
      requestRemove(chipId)
      return
    }

    setPlacements((current) => {
      const active = current.filter((item) => !item.exiting)
      const slot = nextRow(current)
      const x = pickChipX(slot, active)
      return [...current, { chipId, slot, x }]
    })
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
                  className={`chip-card${used ? ' is-used' : ''}`}
                  aria-label={used ? `Remove ${chip.label}` : `Insert ${chip.label}`}
                  aria-pressed={used}
                  onClick={() => onGalleryClick(chip.id)}
                >
                  <img src={chip.src} alt="" draggable={false} />
                </button>
              )
            })}
          </div>
        </aside>

        <section className="main-panel">
          <p className="section-title section-title--board">board</p>

          <div className="board-stage" aria-label="Board">
            <BoardModel
              view="board"
              placements={placements}
              onRequestRemove={requestRemove}
              onExited={finishRemove}
            />
            <p className="drop-hint drop-hint--idle">
              칩 사진을 클릭하면 3D로 보드에 꽂혀요 · 보드의 칩을 클릭하면 빠져요
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
