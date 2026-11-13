import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

const TRAY_URL = `${import.meta.env.BASE_URL}wavy-tray.glb?v=pp1`
const CHIP_URL = `${import.meta.env.BASE_URL}chip-example.glb?v=1`

/** Number of horizontal grooves (rows). Multiple chips can share one row. */
export const ROW_COUNT = 6
/** @deprecated use ROW_COUNT — kept so older imports keep working */
export const SLOT_COUNT = ROW_COUNT

const VIEW_PRESETS = {
  board: {
    position: [0, 0.95, 2.25],
    target: [0, 0.28, 0],
  },
  side: {
    position: [2.4, 0.75, 0.2],
    target: [0, 0.28, 0],
  },
  eq: {
    position: [0, 2.6, 0.001],
    target: [0, 0.2, 0],
  },
}

/**
 * Groove seats (y, z). X is chosen per chip so several can sit on one row.
 * Order: bottom partition → top (row 0 = lowest).
 */
const ROW_SEATS = [
  [0.08, 0.43], // 1 맨 아래
  [0.15, 0.32], // 2
  [0.265, 0.19], // 3
  [0.35, 0.08], // 4
  [0.43, -0.05], // 5
  [0.515, -0.12], // 6 맨 위 — 살짝 앞(+Z)
]

const CHIP_BURY = [0, -0.02, -0.025]
const CHIP_SCALE = 0.24
const CHIP_Z_SQUASH = 0.72
/** How far above the seat the chip starts before dropping in. */
const INSERT_DROP = 0.42
/** Insert animation duration in seconds. */
const INSERT_DURATION = 0.55
/** Board half-width usable for chip centers (tray ~±0.54). */
export const CHIP_X_RANGE = 0.36
/** Minimum center-to-center gap on the same row. */
export const CHIP_X_GAP = 0.2

function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

export function rowSeat(index) {
  const i = Math.max(0, Math.min(ROW_COUNT - 1, index))
  return ROW_SEATS[i]
}

/** Pick an X on `row` that stays clear of existing placements when possible. */
export function pickChipX(row, placements = []) {
  const taken = placements
    .filter((item) => item.slot === row)
    .map((item) => item.x ?? 0)

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const x = (Math.random() * 2 - 1) * CHIP_X_RANGE
    if (taken.every((other) => Math.abs(other - x) >= CHIP_X_GAP)) return x
  }

  // Fallback: farthest gap from existing centers
  if (taken.length === 0) return (Math.random() * 2 - 1) * CHIP_X_RANGE
  const sorted = [...taken].sort((a, b) => a - b)
  let bestX = 0
  let bestSpan = -1
  const edges = [-CHIP_X_RANGE, ...sorted, CHIP_X_RANGE]
  for (let i = 0; i < edges.length - 1; i += 1) {
    const span = edges[i + 1] - edges[i]
    if (span > bestSpan) {
      bestSpan = span
      bestX = (edges[i] + edges[i + 1]) / 2
    }
  }
  return bestX
}

function createMatteTranslucentPP() {
  return new MeshPhysicalMaterial({
    color: new Color('#e8dfd2'),
    roughness: 0.84,
    metalness: 0,
    transmission: 0.32,
    thickness: 0.7,
    ior: 1.49,
    transparent: true,
    opacity: 0.95,
    attenuationColor: new Color('#d9cbb8'),
    attenuationDistance: 0.85,
    specularIntensity: 0.22,
    clearcoat: 0,
    clearcoatRoughness: 1,
    sheen: 0.06,
    sheenRoughness: 0.85,
    sheenColor: new Color('#f2ebe2'),
    envMapIntensity: 0.42,
    side: DoubleSide,
    depthWrite: true,
  })
}

function normalizeObject(root, targetSize) {
  const box = new Box3().setFromObject(root)
  const size = new Vector3()
  box.getSize(size)
  const maxSide = Math.max(size.x, size.y, size.z) || 1
  root.scale.setScalar(targetSize / maxSide)
  root.updateMatrixWorld(true)

  const scaledBox = new Box3().setFromObject(root)
  const center = new Vector3()
  scaledBox.getCenter(center)
  root.position.sub(center)
  root.updateMatrixWorld(true)

  const grounded = new Box3().setFromObject(root)
  root.position.y -= grounded.min.y
  return root
}

function TrayModel({ children }) {
  const { scene } = useGLTF(TRAY_URL)

  const prepared = useMemo(() => {
    const cloned = cloneSkinned(scene)
    const pp = createMatteTranslucentPP()

    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.material = pp
    })

    cloned.rotation.set(-0.06, 0, 0)
    normalizeObject(cloned, 1.12)
    cloned.position.y -= 0.02
    return cloned
  }, [scene])

  // Chips as siblings in the same normalized group as the tray mesh
  return (
    <group>
      <primitive object={prepared} />
      {children}
    </group>
  )
}

function ChipModel3D({ slot, x = 0, onRemove }) {
  const { scene } = useGLTF(CHIP_URL)
  const groupRef = useRef(null)
  const progressRef = useRef(0)
  const [seatY, seatZ] = rowSeat(slot)

  const prepared = useMemo(() => {
    const cloned = cloneSkinned(scene)
    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
    })
    // Source GLB orientation as-is — no extra rotation
    normalizeObject(cloned, CHIP_SCALE)
    cloned.scale.z *= CHIP_Z_SQUASH
    cloned.updateMatrixWorld(true)
    cloned.position.y += CHIP_BURY[1]
    cloned.position.z += CHIP_BURY[2]
    return cloned
  }, [scene])

  useLayoutEffect(() => {
    progressRef.current = 0
    const group = groupRef.current
    if (!group) return
    group.position.set(x, seatY + INSERT_DROP, seatZ)
  }, [x, seatY, seatZ])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group || progressRef.current >= 1) return

    progressRef.current = Math.min(1, progressRef.current + delta / INSERT_DURATION)
    const t = easeOutBack(progressRef.current)
    group.position.y = seatY + INSERT_DROP * (1 - t)
    group.position.x = x
    group.position.z = seatZ
  })

  return (
    <group
      ref={groupRef}
      position={[x, seatY + INSERT_DROP, seatZ]}
      onClick={(event) => {
        event.stopPropagation()
        onRemove?.()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab'
      }}
    >
      <primitive object={prepared} />
    </group>
  )
}

function CameraRig({ view }) {
  const { camera } = useThree()
  const controlsRef = useRef(null)

  useLayoutEffect(() => {
    const preset = VIEW_PRESETS[view] ?? VIEW_PRESETS.board
    camera.position.set(...preset.position)
    camera.lookAt(...preset.target)
    const controls = controlsRef.current
    if (controls) {
      controls.target.set(...preset.target)
      controls.update()
    }
  }, [camera, view])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.18}
      rotateSpeed={1.65}
      zoomSpeed={1.15}
      minDistance={1.35}
      maxDistance={4.8}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.48}
      target={VIEW_PRESETS.board.target}
    />
  )
}

function PlacedChips({ placements, onRemoveChip }) {
  return (
    <group>
      {placements.map((item) => (
        <Suspense key={item.chipId} fallback={null}>
          <ChipModel3D
            slot={item.slot}
            x={item.x ?? 0}
            onRemove={() => onRemoveChip?.(item.chipId)}
          />
        </Suspense>
      ))}
    </group>
  )
}

export default function BoardModel({
  view = 'board',
  placements = [],
  onRemoveChip,
}) {
  return (
    <div className="board-3d">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 28, near: 0.1, far: 40, position: VIEW_PRESETS.board.position }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
      >
        <CameraRig view={view} />
        <ambientLight intensity={0.28} color="#f3efe9" />
        <hemisphereLight args={['#fffaf4', '#b9aea0', 0.42]} />
        <directionalLight
          castShadow
          position={[0.55, 3.4, 3.5]}
          intensity={1.85}
          color="#fff8f0"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-2.6, 1.4, 1.0]} intensity={0.32} color="#ffffff" />
        <directionalLight position={[2.0, 0.6, -1.8]} intensity={0.22} color="#cfc3b4" />
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.28} />
          <TrayModel>
            <PlacedChips placements={placements} onRemoveChip={onRemoveChip} />
          </TrayModel>
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(TRAY_URL)
useGLTF.preload(CHIP_URL)
