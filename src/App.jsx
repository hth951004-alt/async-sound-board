import { useEffect, useRef, useState } from 'react'
import Onboarding from './Onboarding.jsx'
import { chipColors, colorForBackground, mixHex } from './chipColors.js'
import boardBase from './assets/board-layers/base.svg'
import boardLayer01 from './assets/board-layers/layer-01.png'
import boardLayer02 from './assets/board-layers/layer-02.png'
import boardLayer03 from './assets/board-layers/layer-03.png'
import boardLayer04 from './assets/board-layers/layer-04.png'
import boardLayer05 from './assets/board-layers/layer-05.png'
import boardLayer06 from './assets/board-layers/layer-06.png'

const chipModules = import.meta.glob('../image/chip-reed-*.svg', {
  eager: true,
  import: 'default',
})

const boardLayers = [
  boardLayer01,
  boardLayer02,
  boardLayer03,
  boardLayer04,
  boardLayer05,
  boardLayer06,
]

const chips = Object.entries(chipModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src], index) => {
    const number = path.match(/(\d+)\.svg$/)?.[1] ?? String(index + 1)
    const direction = index % 2 === 0 ? 1 : -1

    return {
      id: `chip-${number}`,
      src,
      alt: `Sound chip ${number}`,
      spin: direction * (1.1 + (index % 5) * 0.45),
      rotation: ((index * 37) % 70) - 35,
      width: 14 + (index % 5) * 1.6,
      color: colorForBackground(chipColors[number] ?? '#242428'),
    }
  })

export default function App() {
  const stageRef = useRef(null)
  const chipRefs = useRef([])
  const [showOnboarding, setShowOnboarding] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowOnboarding(false), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let animationFrame = 0
    let previousTime = performance.now()
    let previousWidth = 0
    let previousHeight = 0
    let nextSpawnAt = previousTime + 120
    let reducedInitialized = false
    const maxActive = 10
    const states = chips.map((chip) => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rotation: chip.rotation,
      active: false,
      entering: false,
      entryEdge: 0,
      exiting: false,
      age: 0,
      life: 0,
      fade: 0,
      dragging: false,
      inserted: false,
      slotIndex: -1,
      targetX: 0,
      targetY: 0,
      scale: 1,
      targetScale: 1,
    }))
    const slotCenters = [0.255, 0.342, 0.425, 0.505, 0.586, 0.682]
    const slotBands = [
      [0.18, 0.3],
      [0.3, 0.385],
      [0.385, 0.465],
      [0.465, 0.545],
      [0.545, 0.635],
      [0.635, 0.84],
    ]
    let drag = null
    let hoverSlot = -1

    const limitVelocity = (state, maxSpeed = 190) => {
      const speed = Math.hypot(state.vx, state.vy)
      if (speed <= maxSpeed || speed === 0) return
      const scale = maxSpeed / speed
      state.vx *= scale
      state.vy *= scale
    }

    const setHoverSlot = (slotIndex) => {
      if (hoverSlot === slotIndex) return
      hoverSlot = slotIndex
      const stack = stageRef.current?.querySelector('.board-stack')
      if (!stack) return
      if (slotIndex < 0) {
        stack.removeAttribute('data-hover-slot')
      } else {
        stack.setAttribute('data-hover-slot', String(slotIndex))
      }
    }

    const slotFromPoint = (x, y, width, height) => {
      const yRatio = y / height
      const insideBoard =
        x >= width * 0.2 &&
        x <= width * 0.8 &&
        yRatio >= slotBands[0][0] &&
        yRatio <= slotBands[slotBands.length - 1][1]
      if (!insideBoard) return -1

      const last = slotBands.length - 1
      const bandIndex = slotBands.findIndex(([top, bottom], index) => {
        if (index === last) return yRatio >= top && yRatio <= bottom
        return yRatio >= top && yRatio < bottom
      })
      if (bandIndex >= 0) return bandIndex

      let slotIndex = 0
      let closestDistance = Number.POSITIVE_INFINITY
      slotCenters.forEach((center, candidateIndex) => {
        const distance = Math.abs(yRatio - center)
        if (distance < closestDistance) {
          closestDistance = distance
          slotIndex = candidateIndex
        }
      })
      return slotIndex
    }

    const clampInsertedX = (x, width, chipWidth, scale) => {
      const half = chipWidth * scale * 0.42
      const minX = width * 0.305 + half
      const maxX = width * 0.695 - half
      return Math.max(minX, Math.min(maxX, x))
    }

    const getDropSlot = (state, width, height, _ignoreIndex = -1, pointerX, pointerY) => {
      const fromChip = slotFromPoint(state.x, state.y, width, height)
      if (fromChip >= 0) return fromChip

      if (Number.isFinite(pointerX) && Number.isFinite(pointerY)) {
        const fromPointer = slotFromPoint(pointerX, pointerY, width, height)
        if (fromPointer >= 0) return fromPointer
      }

      // Sticky hover only while still near the board so chips can be pulled out.
      if (hoverSlot >= 0) {
        const nearBoard =
          state.x >= width * 0.18 &&
          state.x <= width * 0.82 &&
          state.y / height >= slotBands[0][0] - 0.04 &&
          state.y / height <= slotBands[slotBands.length - 1][1] + 0.04
        if (nearBoard) return hoverSlot
      }
      return -1
    }

    const syncStageBackground = () => {
      const wash = stageRef.current?.querySelector('.stage-wash')
      if (!wash) return

      const colors = states
        .map((state, index) => ({ state, index }))
        .filter(({ state }) => state.active && state.inserted)
        .sort(
          (a, b) =>
            a.state.slotIndex - b.state.slotIndex || a.index - b.index,
        )
        .map(({ index }) => chips[index].color)

      if (!colors.length) {
        wash.style.background = '#000000'
        return
      }

      const unique = []
      colors.forEach((color) => {
        if (!unique.includes(color)) unique.push(color)
      })

      if (unique.length === 1) {
        wash.style.background = unique[0]
        return
      }

      // Full-color field only — soft two-tone blend, never falling back to black.
      const a = unique[0]
      const b = unique[unique.length - 1]
      const mid = mixHex(unique)
      wash.style.background =
        `linear-gradient(145deg, ${a} 0%, ${mid} 48%, ${b} 100%)`
    }

    const activateChip = (index, width, height) => {
      const state = states[index]
      const element = chipRefs.current[index]
      if (!element) return

      element.style.display = 'block'
      const radius =
        Math.max(element.offsetWidth, element.offsetHeight) * 0.34
      const edge = Math.floor(Math.random() * 4)
      const speed = 58 + Math.random() * 42
      const tangent = (Math.random() - 0.5) * speed * 0.8

      if (edge === 0) {
        state.x = -radius
        state.y = radius + Math.random() * Math.max(1, height - radius * 2)
        state.vx = speed
        state.vy = tangent
      } else if (edge === 1) {
        state.x = width + radius
        state.y = radius + Math.random() * Math.max(1, height - radius * 2)
        state.vx = -speed
        state.vy = tangent
      } else if (edge === 2) {
        state.x = radius + Math.random() * Math.max(1, width - radius * 2)
        state.y = -radius
        state.vx = tangent
        state.vy = speed
      } else {
        state.x = radius + Math.random() * Math.max(1, width - radius * 2)
        state.y = height + radius
        state.vx = tangent
        state.vy = -speed
      }

      state.active = true
      state.entering = true
      state.entryEdge = edge
      state.exiting = false
      state.age = 0
      state.life = 9 + Math.random() * 9
      state.fade = 1
      state.inserted = false
      state.slotIndex = -1
      state.scale = 1
      state.targetScale = 1
    }

    const startExit = (state, width, height) => {
      const distances = [
        state.x,
        width - state.x,
        state.y,
        height - state.y,
      ]
      const edge = distances.indexOf(Math.min(...distances))
      const speed = 100 + Math.random() * 45
      const tangent = (Math.random() - 0.5) * 38

      state.exiting = true
      if (edge === 0) {
        state.vx = -speed
        state.vy = tangent
      } else if (edge === 1) {
        state.vx = speed
        state.vy = tangent
      } else if (edge === 2) {
        state.vx = tangent
        state.vy = -speed
      } else {
        state.vx = tangent
        state.vy = speed
      }
    }

    const onPointerDown = (event) => {
      const target = event.target.closest?.('.chip')
      if (!target) return

      const index = Number(target.dataset.index)
      const state = states[index]
      if (!state?.active) return

      event.preventDefault()
      const rect = stageRef.current.getBoundingClientRect()
      const fromInserted = state.inserted
      state.dragging = true
      state.inserted = false
      state.slotIndex = -1
      state.scale = 1
      state.targetScale = 1
      state.entering = false
      state.exiting = false
      state.age = 0
      target.classList.add('is-dragging')
      target.classList.remove('is-inserted')

      drag = {
        index,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left - state.x,
        offsetY: event.clientY - rect.top - state.y,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: performance.now(),
        vx: state.vx,
        vy: state.vy,
        fromInserted,
      }

      try {
        target.setPointerCapture(event.pointerId)
      } catch {
        // Window listeners keep the drag active when capture is unavailable.
      }
    }

    const onPointerMove = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      const state = states[drag.index]
      const element = chipRefs.current[drag.index]
      const stage = stageRef.current
      if (!state || !element || !stage) return

      event.preventDefault()
      const now = performance.now()
      const dt = Math.max(0.008, (now - drag.lastTime) / 1000)
      const rect = stage.getBoundingClientRect()
      const radius =
        Math.max(element.offsetWidth, element.offsetHeight) * 0.34
      const nextX = Math.max(
        radius,
        Math.min(rect.width - radius, event.clientX - rect.left - drag.offsetX),
      )
      const nextY = Math.max(
        radius,
        Math.min(rect.height - radius, event.clientY - rect.top - drag.offsetY),
      )

      const measuredVx = (nextX - state.x) / dt
      const measuredVy = (nextY - state.y) / dt
      drag.vx = drag.vx * 0.35 + measuredVx * 0.65
      drag.vy = drag.vy * 0.35 + measuredVy * 0.65
      const dragSpeed = Math.hypot(drag.vx, drag.vy)
      if (dragSpeed > 180) {
        const scale = 180 / dragSpeed
        drag.vx *= scale
        drag.vy *= scale
      }
      state.vx = drag.vx
      state.vy = drag.vy
      state.x = nextX
      state.y = nextY
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      drag.lastTime = now
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      setHoverSlot(
        getDropSlot(state, rect.width, rect.height, drag.index, pointerX, pointerY),
      )
    }

    const finishDrag = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      const state = states[drag.index]
      const element = chipRefs.current[drag.index]
      if (state) {
        const stage = stageRef.current
        const { width, height } = stage.getBoundingClientRect()
        const pointerX = event.clientX - stage.getBoundingClientRect().left
        const pointerY = event.clientY - stage.getBoundingClientRect().top
        const slotIndex = getDropSlot(
          state,
          width,
          height,
          drag.index,
          pointerX,
          pointerY,
        )

        if (slotIndex >= 0) {
          state.inserted = true
          state.slotIndex = slotIndex
          const sameSlotCount = states.filter(
            (candidate) =>
              candidate.active &&
              candidate.inserted &&
              candidate.slotIndex === slotIndex,
          ).length
          const stackOffset = ((sameSlotCount % 5) - 2) * (width * 0.012)
          state.targetScale = 0.64 + slotIndex * 0.02
          state.targetX = clampInsertedX(
            state.x + stackOffset,
            width,
            element.offsetWidth,
            state.targetScale,
          )
          // Smaller chips sit higher so the board lip hides less of them.
          const scaledHeight = element.offsetHeight * state.targetScale
          const sizeRatio = Math.min(1, scaledHeight / (height * 0.26))
          const depth = scaledHeight * (0.02 + sizeRatio * 0.08)
          const lift = (1 - sizeRatio) * scaledHeight * 0.55
          state.targetY = height * slotCenters[slotIndex] + depth - lift
          state.rotation = ((state.rotation + 180) % 360) - 180
          state.vx = 0
          state.vy = 0
          state.life = Number.POSITIVE_INFINITY
          element.classList.add('is-inserted')
        } else {
          state.targetScale = 1
          state.scale = 1
          element?.classList.remove('is-inserted')

          if (drag.fromInserted) {
            // Return to behind-board roaming instead of throwing out front.
            const roamSpeed = 48 + Math.random() * 36
            const angle = Math.random() * Math.PI * 2
            state.vx = Math.cos(angle) * roamSpeed
            state.vy = Math.sin(angle) * roamSpeed
            state.life = 9 + Math.random() * 9
            state.entering = false
            state.exiting = false
          } else {
            const maxThrowSpeed = 180
            const speed = Math.hypot(drag.vx, drag.vy)
            const limiter = speed > maxThrowSpeed ? maxThrowSpeed / speed : 1
            state.vx = drag.vx * limiter
            state.vy = drag.vy * limiter
            state.life = 7 + Math.random() * 7
          }
        }
        state.dragging = false
        state.age = 0
        syncStageBackground()
      }
      element?.classList.remove('is-dragging')
      setHoverSlot(-1)
      drag = null
    }

    const stageElement = stageRef.current
    stageElement?.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)

    const render = (time) => {
      const stage = stageRef.current
      if (!stage) return

      const delta = Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const { width, height } = stage.getBoundingClientRect()

      if (
        previousWidth > 0 &&
        previousHeight > 0 &&
        (width !== previousWidth || height !== previousHeight)
      ) {
        states.forEach((state) => {
          if (!state.active) return
          state.x *= width / previousWidth
          state.y *= height / previousHeight
        })
      }
      previousWidth = width
      previousHeight = height

      if (reducedMotion && !reducedInitialized) {
        reducedInitialized = true
        states.slice(0, 8).forEach((state, index) => {
          const element = chipRefs.current[index]
          if (!element) return
          element.style.display = 'block'
          state.active = true
          state.x = width * ((index + 1) / 9)
          state.y = height * (index % 2 === 0 ? 0.18 : 0.82)
          state.fade = 1
        })
      }

      if (!reducedMotion) {
        const activeCount = states.filter((state) => state.active).length
        if (activeCount < maxActive && time >= nextSpawnAt) {
          const inactive = states
            .map((state, index) => (!state.active ? index : -1))
            .filter((index) => index >= 0)

          if (inactive.length) {
            const randomIndex =
              inactive[Math.floor(Math.random() * inactive.length)]
            activateChip(randomIndex, width, height)
          }
          nextSpawnAt = time + 450 + Math.random() * 1050
        }

        // Integrate positions and bounce against the viewport boundary.
        states.forEach((state, index) => {
          const element = chipRefs.current[index]
          if (!element || !state.active) return

          if (state.inserted && !state.dragging) {
            const settleAmount = Math.min(1, delta * 11)
            state.x += (state.targetX - state.x) * settleAmount
            state.y += (state.targetY - state.y) * settleAmount
            state.rotation += (0 - state.rotation) * settleAmount
            state.scale +=
              (state.targetScale - state.scale) * settleAmount
            state.vx = 0
            state.vy = 0
          } else if (!state.dragging) {
            state.x += state.vx * delta
            state.y += state.vy * delta
            state.rotation += chips[index].spin * delta
            state.scale += (1 - state.scale) * Math.min(1, delta * 10)
          }
          state.fade = Math.min(1, state.fade + delta * 2.2)

          const radius =
            Math.max(element.offsetWidth, element.offsetHeight) * 0.34

          if (state.dragging) return
          if (state.inserted) return

          if (state.entering) {
            const fullyInside =
              (state.entryEdge === 0 && state.x >= radius) ||
              (state.entryEdge === 1 && state.x <= width - radius) ||
              (state.entryEdge === 2 && state.y >= radius) ||
              (state.entryEdge === 3 && state.y <= height - radius)
            if (fullyInside) state.entering = false
            return
          }

          state.age += delta

          if (!state.exiting && state.age >= state.life) {
            startExit(state, width, height)
          }

          if (state.exiting) {
            const outside =
              state.x < -radius * 1.5 ||
              state.x > width + radius * 1.5 ||
              state.y < -radius * 1.5 ||
              state.y > height + radius * 1.5

            if (outside) {
              state.active = false
              state.exiting = false
              state.fade = 0
              element.style.display = 'none'
            }
            return
          }

          if (state.x < radius) {
            state.x = radius
            state.vx = Math.abs(state.vx) * 0.82
          } else if (state.x > width - radius) {
            state.x = width - radius
            state.vx = -Math.abs(state.vx) * 0.82
          }

          if (state.y < radius) {
            state.y = radius
            state.vy = Math.abs(state.vy) * 0.82
          } else if (state.y > height - radius) {
            state.y = height - radius
            state.vy = -Math.abs(state.vy) * 0.82
          }
        })

        // Equal-mass elastic collision between every pair of chips.
        for (let i = 0; i < states.length; i += 1) {
          for (let j = i + 1; j < states.length; j += 1) {
            const a = states[i]
            const b = states[j]
            const aElement = chipRefs.current[i]
            const bElement = chipRefs.current[j]
            if (
              !aElement ||
              !bElement ||
              !a.active ||
              !b.active ||
              a.inserted ||
              b.inserted ||
              a.entering ||
              b.entering ||
              a.exiting ||
              b.exiting
            ) {
              continue
            }

            const aRadius =
              Math.max(aElement.offsetWidth, aElement.offsetHeight) * 0.34
            const bRadius =
              Math.max(bElement.offsetWidth, bElement.offsetHeight) * 0.34
            const minDistance = aRadius + bRadius
            const dx = b.x - a.x
            const dy = b.y - a.y
            const distance = Math.hypot(dx, dy)

            if (distance >= minDistance) continue

            const safeDistance = distance || 0.001
            const nx = dx / safeDistance
            const ny = dy / safeDistance
            const overlap = minDistance - safeDistance

            if (a.dragging && !b.dragging) {
              const separation = Math.min(overlap, 4)
              b.x += nx * separation
              b.y += ny * separation
              const impact = Math.max(
                0,
                (a.vx - b.vx) * nx + (a.vy - b.vy) * ny,
              )
              const softenedImpact = Math.min(impact, 120) * 0.45
              b.vx += nx * softenedImpact
              b.vy += ny * softenedImpact
              limitVelocity(b)
              continue
            }

            if (b.dragging && !a.dragging) {
              const separation = Math.min(overlap, 4)
              a.x -= nx * separation
              a.y -= ny * separation
              const impact = Math.max(
                0,
                (b.vx - a.vx) * -nx + (b.vy - a.vy) * -ny,
              )
              const softenedImpact = Math.min(impact, 120) * 0.45
              a.vx -= nx * softenedImpact
              a.vy -= ny * softenedImpact
              limitVelocity(a)
              continue
            }

            // Separate overlap first so objects never stick together.
            const separation = Math.min(overlap * 0.5, 8)
            a.x -= nx * separation
            a.y -= ny * separation
            b.x += nx * separation
            b.y += ny * separation

            const relativeNormalVelocity =
              (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
            if (relativeNormalVelocity >= 0) continue

            const restitution = 0.72
            const impulse =
              (-(1 + restitution) * relativeNormalVelocity) / 2
            a.vx -= impulse * nx
            a.vy -= impulse * ny
            b.vx += impulse * nx
            b.vy += impulse * ny
            limitVelocity(a)
            limitVelocity(b)
          }
        }
      }

      states.forEach((state, index) => {
        const chip = chips[index]
        const element = chipRefs.current[index]
        if (!element || !state.active) {
          if (element) element.style.display = 'none'
          return
        }

        element.style.transform =
          `translate3d(${state.x}px, ${state.y}px, 0) ` +
          'translate(-50%, -50%) ' +
          `rotate(${state.rotation}deg) ` +
          `scale(${state.scale})`
        element.style.opacity = String(state.fade)
        element.style.filter =
          'drop-shadow(0 8px 18px rgb(0 0 0 / 28%))'

        if (state.dragging) {
          element.style.zIndex = '80'
          element.classList.remove('is-inserted')
        } else if (state.inserted) {
          element.style.zIndex = String(15 + state.slotIndex * 10)
          element.classList.add('is-inserted')
        } else {
          element.style.zIndex = '2'
          element.classList.remove('is-inserted')
        }
      })

      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(render)
      }
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationFrame)
      stageElement?.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [])

  return (
    <main className="viewport">
      <section
        ref={stageRef}
        className="figma-stage"
        aria-label="ASYNC sound board collection"
        data-node-id="1258:9085"
      >
        <div className="stage-wash" aria-hidden="true" />
        <div
          className="board-stack"
          role="img"
          aria-label="ASYNC layered sound board"
          data-node-id="1277:9607"
        >
          <img
            className="board-base"
            src={boardBase}
            alt=""
            draggable={false}
          />
          {boardLayers.map((layer, index) => (
            <img
              key={layer}
              className="board-layer"
              src={layer}
              alt=""
              draggable={false}
              data-layer={index + 1}
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((slotIndex) => (
            <div
              key={`slot-highlight-${slotIndex}`}
              className="slot-highlight"
              data-slot={slotIndex}
              aria-hidden="true"
            />
          ))}
          <img
            className="board-edge-overlay board-edge-overlay--front"
            src={boardLayer01}
            alt=""
            draggable={false}
          />
        </div>

        {chips.map((chip, index) => (
          <img
            key={chip.id}
            className="chip"
            src={chip.src}
            alt={chip.alt}
            draggable={false}
            data-index={index}
            style={{ '--chip-width': `${chip.width}%` }}
            ref={(element) => {
              chipRefs.current[index] = element
            }}
          />
        ))}
      </section>
      {showOnboarding && <Onboarding />}
    </main>
  )
}
