import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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

const MODEL_URL = `${import.meta.env.BASE_URL}wavy-tray.glb?v=pp1`

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

function createMatteTranslucentPP() {
  // Polypropylene: IOR ~1.49, matte, softly translucent, slight beige
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

function TrayModel() {
  const { scene } = useGLTF(MODEL_URL)

  const prepared = useMemo(() => {
    const cloned = cloneSkinned(scene)
    const pp = createMatteTranslucentPP()

    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.material = pp
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
          {/* Soft studio light so PP transmission doesn't wash out */}
          <Environment preset="studio" environmentIntensity={0.28} />
          <TrayModel />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(MODEL_URL)
