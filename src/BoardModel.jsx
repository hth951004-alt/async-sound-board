import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import {
  ACESFilmicToneMapping,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import {
  SILVER_BASE_RATIO,
  chipModelUrl,
  createSilverBaseMaterial,
  createTopMaterial,
  lookIdForChip,
  needsPlanarUVs,
} from './chipLooks.js'

const TRAY_URL = `${import.meta.env.BASE_URL}wavy-tray.glb?v=pp1`
const CHIP_STONE_URL = `${import.meta.env.BASE_URL}chip-example.glb?v=1`
const CHIP_WHALE_URL = `${import.meta.env.BASE_URL}chip-whale.glb?v=1`
const CHIP_WHALE_GLASS_URL = `${import.meta.env.BASE_URL}chip-whale-glass.glb?v=glass1`
const CHIP_BAMBOO_URL = `${import.meta.env.BASE_URL}chip-bamboo.glb?v=bamboo1`
const CHIP_WAVE_URL = `${import.meta.env.BASE_URL}chip-wave.glb?v=wave1`
const CHIP_LEAF_URL = `${import.meta.env.BASE_URL}chip-leaf.glb?v=leaf1`
const CHIP_SOIL_URL = `${import.meta.env.BASE_URL}chip-soil.glb?v=soil1`
const CHIP_GRASS_URL = `${import.meta.env.BASE_URL}chip-grass.glb?v=grass1`
const CHIP_SHARD_URL = `${import.meta.env.BASE_URL}chip-shard.glb?v=shard1`
const CHIP_SNOW_URL = `${import.meta.env.BASE_URL}chip-snow.glb?v=snow1`

/** Number of horizontal grooves (rows). Multiple chips can share one row. */
export const ROW_COUNT = 6
/** @deprecated use ROW_COUNT — kept so older imports keep working */
export const SLOT_COUNT = ROW_COUNT

const VIEW_PRESETS = {
  board: {
    // slightly smaller in frame, gentle side angle
    position: [0.95, 0.88, 2.85],
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

/** 1·3·5층만 미세하게 앞(+Z)으로. */
const ODD_ROW_FORWARD = 0.018
const CHIP_BURY = [0, -0.02, -0.025]
/** Whale chips (1–3) sit slightly higher in the groove. */
const WHALE_Y_LIFT = 0.014
/** Soil chips (16–18) sit slightly higher in the groove. */
const SOIL_Y_LIFT = 0.014
const CHIP_SCALE = 0.24
const CHIP_Z_SQUASH = 0.72
/** How far above the seat the chip travels on insert / eject. */
const INSERT_DROP = 0.42
const INSERT_DURATION = 0.55
const EJECT_DURATION = 0.42
/** Board half-width usable for chip centers (tray ~±0.54). */
export const CHIP_X_RANGE = 0.36
/** Minimum center-to-center gap on the same row. */
export const CHIP_X_GAP = 0.2

function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

function easeInCubic(t) {
  return t * t * t
}

export function rowSeat(index) {
  const i = Math.max(0, Math.min(ROW_COUNT - 1, index))
  const [y, z] = ROW_SEATS[i]
  // 1·3·5층 (0-based even indices from bottom)
  const forward = i % 2 === 0 ? ODD_ROW_FORWARD : 0
  return [y, z + forward]
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

/** Split one baked Tripo mesh into silver tip (low Y) + swappable top body. */
function splitChipBaseAndBody(sourceMesh) {
  const geometry = sourceMesh.geometry.index
    ? sourceMesh.geometry.toNonIndexed()
    : sourceMesh.geometry.clone()

  const pos = geometry.attributes.position
  const nor = geometry.attributes.normal
  const uv = geometry.attributes.uv
  let ymin = Infinity
  let ymax = -Infinity
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    if (y < ymin) ymin = y
    if (y > ymax) ymax = y
  }
  const cutY = ymin + (ymax - ymin) * SILVER_BASE_RATIO

  const buckets = {
    base: { pos: [], nor: [], uv: [] },
    body: { pos: [], nor: [], uv: [] },
  }

  for (let i = 0; i < pos.count; i += 3) {
    const y0 = pos.getY(i)
    const y1 = pos.getY(i + 1)
    const y2 = pos.getY(i + 2)
    const key = (y0 + y1 + y2) / 3 < cutY ? 'base' : 'body'
    const bucket = buckets[key]
    for (let k = 0; k < 3; k += 1) {
      const idx = i + k
      bucket.pos.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx))
      if (nor) bucket.nor.push(nor.getX(idx), nor.getY(idx), nor.getZ(idx))
      if (uv) bucket.uv.push(uv.getX(idx), uv.getY(idx))
    }
  }

  const makeGeo = (bucket) => {
    if (bucket.pos.length === 0) return null
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(bucket.pos), 3))
    if (bucket.nor.length) {
      geo.setAttribute('normal', new BufferAttribute(new Float32Array(bucket.nor), 3))
    } else {
      geo.computeVertexNormals()
    }
    if (bucket.uv.length) {
      geo.setAttribute('uv', new BufferAttribute(new Float32Array(bucket.uv), 2))
    }
    return geo
  }

  return {
    baseGeo: makeGeo(buckets.base),
    bodyGeo: makeGeo(buckets.body),
  }
}

const chipPartsCache = new Map()

function getChipParts(scene, cacheKey) {
  if (chipPartsCache.has(cacheKey)) return chipPartsCache.get(cacheKey)

  let sourceMesh = null
  scene.traverse((node) => {
    if (node.isMesh && !sourceMesh) sourceMesh = node
  })
  if (!sourceMesh) {
    const empty = { baseGeo: null, bodyGeo: null, sourceMaterial: null }
    chipPartsCache.set(cacheKey, empty)
    return empty
  }

  const { baseGeo, bodyGeo } = splitChipBaseAndBody(sourceMesh)
  const parts = {
    baseGeo,
    bodyGeo,
    sourceMaterial: sourceMesh.material,
  }
  chipPartsCache.set(cacheKey, parts)
  return parts
}

/** Map texture left→right onto the chip face (smooth | porous). */
function applyPlanarFrontUVs(geometry) {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const pos = geometry.attributes.position
  const uvs = new Float32Array(pos.count * 2)
  const spanX = max.x - min.x || 1
  const spanY = max.y - min.y || 1
  for (let i = 0; i < pos.count; i += 1) {
    uvs[i * 2] = (pos.getX(i) - min.x) / spanX
    uvs[i * 2 + 1] = (pos.getY(i) - min.y) / spanY
  }
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
}

function buildChipRoot(scene, lookId, cacheKey) {
  const { baseGeo, bodyGeo, sourceMaterial } = getChipParts(scene, cacheKey)
  const group = new Group()
  group.name = 'chip-root'

  const silver = createSilverBaseMaterial(sourceMaterial)
  const topMat = createTopMaterial(lookId, sourceMaterial)

  if (baseGeo) {
    const base = new Mesh(baseGeo, silver)
    base.castShadow = true
    base.receiveShadow = true
    base.name = 'chip-silver-base'
    group.add(base)
  }
  if (bodyGeo) {
    const usePlanar = needsPlanarUVs(lookId)
    const smoothShell =
      lookId === 'whale-gradient' ||
      lookId === 'whale-frost' ||
      lookId === 'bamboo-frost' ||
      lookId === 'bamboo-gloss' ||
      lookId === 'wave-swirl' ||
      lookId === 'wave-clear' ||
      lookId === 'leaf-jade' ||
      lookId === 'leaf-grain' ||
      lookId === 'soil-clay' ||
      lookId === 'soil-crack' ||
      lookId === 'grass-glow' ||
      lookId === 'grass-frost' ||
      lookId === 'shard-rose' ||
      lookId === 'shard-iris' ||
      lookId === 'snow-glow' ||
      lookId === 'snow-clear'
    const geo = usePlanar || smoothShell ? bodyGeo.clone() : bodyGeo
    if (usePlanar) applyPlanarFrontUVs(geo)
    if (smoothShell) {
      // Soften Tripo facet noise on the outer shell
      geo.deleteAttribute('normal')
      geo.computeVertexNormals()
    }
    const body = new Mesh(geo, topMat)
    body.castShadow = true
    body.receiveShadow = true
    body.name = 'chip-top-body'
    group.add(body)
  }

  normalizeObject(group, CHIP_SCALE)
  group.scale.z *= CHIP_Z_SQUASH
  group.updateMatrixWorld(true)
  group.position.y += CHIP_BURY[1]
  group.position.z += CHIP_BURY[2]
  return group
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

function ChipModel3D({
  chipId,
  slot,
  x = 0,
  exiting = false,
  onRequestRemove,
  onExited,
}) {
  const modelUrl = chipModelUrl(chipId)
  const { scene } = useGLTF(modelUrl)
  const groupRef = useRef(null)
  const phaseRef = useRef('insert') // insert | seated | eject
  const progressRef = useRef(0)
  const ejectFromYRef = useRef(0)
  const exitedRef = useRef(false)
  const [seatY0, seatZ] = rowSeat(slot)
  const lookId = lookIdForChip(chipId)
  const seatY =
    seatY0 +
    (lookId === 'whale'
      ? WHALE_Y_LIFT
      : lookId === 'soil' || lookId === 'soil-clay' || lookId === 'soil-crack'
        ? SOIL_Y_LIFT
        : 0)

  const prepared = useMemo(
    () => buildChipRoot(scene, lookId, modelUrl),
    [scene, lookId, modelUrl],
  )

  useLayoutEffect(() => {
    phaseRef.current = 'insert'
    progressRef.current = 0
    exitedRef.current = false
    const group = groupRef.current
    if (!group) return
    group.position.set(x, seatY + INSERT_DROP, seatZ)
  }, [x, seatY, seatZ])

  useLayoutEffect(() => {
    if (!exiting) return
    if (phaseRef.current === 'eject') return
    const group = groupRef.current
    ejectFromYRef.current = group?.position.y ?? seatY
    phaseRef.current = 'eject'
    progressRef.current = 0
    exitedRef.current = false
  }, [exiting, seatY])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    if (phaseRef.current === 'insert') {
      progressRef.current = Math.min(1, progressRef.current + delta / INSERT_DURATION)
      const t = easeOutBack(progressRef.current)
      group.position.set(x, seatY + INSERT_DROP * (1 - t), seatZ)
      if (progressRef.current >= 1) phaseRef.current = 'seated'
      return
    }

    if (phaseRef.current === 'eject') {
      progressRef.current = Math.min(1, progressRef.current + delta / EJECT_DURATION)
      const t = easeInCubic(progressRef.current)
      const endY = seatY + INSERT_DROP
      group.position.set(
        x,
        ejectFromYRef.current + (endY - ejectFromYRef.current) * t,
        seatZ,
      )
      if (progressRef.current >= 1 && !exitedRef.current) {
        exitedRef.current = true
        onExited?.()
      }
    }
  })

  return (
    <group
      ref={groupRef}
      position={[x, seatY + INSERT_DROP, seatZ]}
      onClick={(event) => {
        event.stopPropagation()
        if (exiting || phaseRef.current === 'eject') return
        onRequestRemove?.()
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

function PlacedChips({ placements, onRequestRemove, onExited }) {
  return (
    <group>
      {placements.map((item) => (
        <Suspense key={item.chipId} fallback={null}>
          <ChipModel3D
            chipId={item.chipId}
            slot={item.slot}
            x={item.x ?? 0}
            exiting={Boolean(item.exiting)}
            onRequestRemove={() => onRequestRemove?.(item.chipId)}
            onExited={() => onExited?.(item.chipId)}
          />
        </Suspense>
      ))}
    </group>
  )
}

export default function BoardModel({
  view = 'board',
  placements = [],
  onRequestRemove,
  onExited,
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
            <PlacedChips
              placements={placements}
              onRequestRemove={onRequestRemove}
              onExited={onExited}
            />
          </TrayModel>
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(TRAY_URL)
useGLTF.preload(CHIP_STONE_URL)
useGLTF.preload(CHIP_WHALE_URL)
useGLTF.preload(CHIP_WHALE_GLASS_URL)
useGLTF.preload(CHIP_BAMBOO_URL)
useGLTF.preload(CHIP_WAVE_URL)
useGLTF.preload(CHIP_LEAF_URL)
useGLTF.preload(CHIP_SOIL_URL)
useGLTF.preload(CHIP_GRASS_URL)
useGLTF.preload(CHIP_SHARD_URL)
useGLTF.preload(CHIP_SNOW_URL)
