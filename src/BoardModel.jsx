import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
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

const MODEL_URL = `${import.meta.env.BASE_URL}wavy-tray.glb`

const VIEW_PRESETS = {
  board: {
    position: [0, 1.05, 2.55],
    target: [0, 0.05, 0],
  },
  side: {
    position: [2.55, 0.85, 0],
    target: [0, 0.05, 0],
  },
  eq: {
    position: [0, 2.85, 0.001],
    target: [0, 0, 0],
  },
}

function createWarmMatteMaterial() {
  return new MeshPhysicalMaterial({
    color: new Color('#fcf9f4'),
    roughness: 0.74,
    metalness: 0,
    transmission: 0.05,
    thickness: 0.28,
    ior: 1.4,
    transparent: true,
    opacity: 0.985,
    attenuationColor: new Color('#f5eee6'),
    attenuationDistance: 4.5,
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    sheen: 0.16,
    sheenRoughness: 0.62,
    sheenColor: new Color('#ffffff'),
    envMapIntensity: 0.18,
    side: DoubleSide,
    depthWrite: true,
  })
}

function TrayModel() {
  const { scene } = useGLTF(MODEL_URL)

  const prepared = useMemo(() => {
    const cloned = cloneSkinned(scene)

    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.material = createWarmMatteMaterial()
    })

    const box = new Box3().setFromObject(cloned)
    const size = new Vector3()
    box.getSize(size)
    const maxSide = Math.max(size.x, size.y, size.z) || 1
    cloned.scale.setScalar(1.12 / maxSide)
    cloned.rotation.set(-0.06, 0, 0)

    const scaledBox = new Box3().setFromObject(cloned)
    const center = new Vector3()
    scaledBox.getCenter(center)
    cloned.position.sub(center)
    cloned.position.y -= scaledBox.min.y * 0.15

    return cloned
  }, [scene])

  return <primitive object={prepared} />
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

export default function BoardModel({ view = 'board' }) {
  return (
    <div className="board-3d" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 28, near: 0.1, far: 40, position: VIEW_PRESETS.board.position }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.18
        }}
      >
        <CameraRig view={view} />
        <ambientLight intensity={0.4} color="#f7f5f2" />
        <hemisphereLight args={['#ffffff', '#ddd6cd', 0.32]} />
        <directionalLight
          castShadow
          position={[0.4, 3.2, 3.8]}
          intensity={1.55}
          color="#fffdf9"
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-2.4, 1.6, 1.2]} intensity={0.45} color="#ffffff" />
        <directionalLight position={[2.2, 0.8, -1.6]} intensity={0.35} color="#f2ebe3" />
        <Suspense fallback={null}>
          <TrayModel />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(MODEL_URL)
