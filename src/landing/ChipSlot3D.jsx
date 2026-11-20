import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { buildChipRoot } from '../BoardModel.jsx'
import { chipModelUrl, lookIdForChip } from '../chipLooks.js'

function FloatingChip({ chipId, phase = 0 }) {
  const groupRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const modelUrl = chipModelUrl(chipId)
  const lookId = lookIdForChip(chipId)
  const { scene } = useGLTF(modelUrl)

  const prepared = useMemo(
    () => buildChipRoot(scene, lookId, `preview:${modelUrl}:${lookId}`, {
      bury: false,
      scale: 0.9,
    }),
    [scene, lookId, modelUrl],
  )

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime + phase
    const hover = hovered ? 1 : 0
    g.rotation.y = Math.sin(t * 0.55) * 0.28 + hover * 0.35
    g.rotation.x = Math.sin(t * 0.4) * 0.08
    g.position.y = Math.sin(t * 0.9) * 0.045 + hover * 0.06
    const s = 1 + hover * 0.12 + Math.sin(t * 1.2) * 0.02
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor =
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpolygon points='8,1 15,15 1,15' fill='%23000'/%3E%3C/svg%3E\") 8 1, pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor =
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpolygon points='8,1 15,15 1,15' fill='%23fff'/%3E%3C/svg%3E\") 8 1, auto"
      }}
    >
      <primitive object={prepared} />
    </group>
  )
}

/** Small isolated 3D viewport for one chip inside the hero parentheses. */
export default function ChipSlot3D({ chipId, label, phase = 0 }) {
  return (
    <span className="speak-chip" data-label={label}>
      <span className="speak-chip__paren" aria-hidden="true">
        (
      </span>
      <span className="speak-chip__stage" aria-label={chipId}>
        <Canvas
          className="speak-chip__canvas"
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0.55, 0.35, 1.35], fov: 32, near: 0.05, far: 20 }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.setClearColor(0x000000, 0)
          }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[2.2, 3.4, 2]} intensity={1.15} />
          <directionalLight position={[-2, 1.2, -1]} intensity={0.35} color="#cfd8ff" />
          <Suspense fallback={null}>
            <FloatingChip chipId={chipId} phase={phase} />
            <Environment preset="city" environmentIntensity={0.45} />
          </Suspense>
        </Canvas>
      </span>
      <span className="speak-chip__paren" aria-hidden="true">
        )
      </span>
      <span className="speak-chip__index">({label})</span>
    </span>
  )
}
