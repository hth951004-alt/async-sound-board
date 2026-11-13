import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
} from 'three'

/** Relative height of the silver tip (bottom of chip mesh). */
export const SILVER_BASE_RATIO = 0.12

/** Which top look to use (silver tip stays original). */
export const CHIP_LOOKS = {
  'chip-001': 'whale',
  'chip-002': 'whale', // pink-gradient glass GLB (baked)
  'chip-003': 'whale-frost', // same GLB, frosted pastel pink
  'chip-004': 'stone',
  'chip-005': 'terrazzo',
  'chip-006': 'sand',
  'chip-007': 'bamboo', // glass tile panel baked
  'chip-008': 'bamboo-frost', // pale sage frosted (Bamboo 002)
  'chip-009': 'bamboo-gloss', // deep emerald glossy (Bamboo 003)
  'chip-010': 'wave-swirl', // blue wave glass photo left
  'chip-011': 'wave', // blue glass wave GLB baked
  'chip-012': 'wave-clear', // pale blue glass photo right
  'chip-013': 'leaf', // iridescent leaf plate GLB baked
  'chip-014': 'leaf-jade', // cream/sage marble photo left
  'chip-015': 'leaf-grain', // olive pebbled photo right
  'chip-016': 'soil', // cloud soil GLB baked
  'chip-017': 'soil-clay', // smooth reddish clay photo left
  'chip-018': 'soil-crack', // cracked dry earth photo right
  'chip-019': 'grass-glow', // lime glass photo left
  'chip-020': 'grass-frost', // lime glass photo right
  'chip-021': 'grass', // green glass logo GLB baked
  'chip-022': 'snow', // snowman light GLB baked
  'chip-023': 'snow-glow', // deep blue frost photo left
  'chip-024': 'snow-clear', // icy blue glass photo right
  'chip-025': 'shard-rose', // frosted rose pink photo left
  'chip-026': 'shard', // pink glass shard GLB baked
  'chip-027': 'shard-iris', // iridescent pink photo right
}

/** Per-chip GLB (defaults to stone example). */
export const CHIP_MODELS = {
  'chip-001': 'chip-whale.glb',
  'chip-002': 'chip-whale-glass.glb',
  'chip-003': 'chip-whale-glass.glb',
  'chip-007': 'chip-bamboo.glb',
  'chip-008': 'chip-bamboo.glb',
  'chip-009': 'chip-bamboo.glb',
  'chip-010': 'chip-wave.glb',
  'chip-011': 'chip-wave.glb',
  'chip-012': 'chip-wave.glb',
  'chip-013': 'chip-leaf.glb',
  'chip-014': 'chip-leaf.glb',
  'chip-015': 'chip-leaf.glb',
  'chip-016': 'chip-soil.glb',
  'chip-017': 'chip-soil.glb',
  'chip-018': 'chip-soil.glb',
  'chip-019': 'chip-grass.glb',
  'chip-020': 'chip-grass.glb',
  'chip-021': 'chip-grass.glb',
  'chip-022': 'chip-snow.glb',
  'chip-023': 'chip-snow.glb',
  'chip-024': 'chip-snow.glb',
  'chip-025': 'chip-shard.glb',
  'chip-026': 'chip-shard.glb',
  'chip-027': 'chip-shard.glb',
}

const textureLoader = new TextureLoader()
const textureCache = new Map()

function loadColorMap(path, { clamp = false } = {}) {
  const url = `${import.meta.env.BASE_URL}${path}`
  const key = `${url}|clamp:${clamp}`
  if (textureCache.has(key)) return textureCache.get(key)
  const tex = textureLoader.load(url)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (clamp) {
    tex.wrapS = ClampToEdgeWrapping
    tex.wrapT = ClampToEdgeWrapping
  }
  textureCache.set(key, tex)
  return tex
}

/** Vertical pink→white map for Whale 002 (UV.y via planar front). */
function makeWhaleGradientMap() {
  const key = 'whale-gradient-canvas'
  if (textureCache.has(key)) return textureCache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, canvas.height, 0, 0)
  g.addColorStop(0, '#ff4fa8')
  g.addColorStop(0.35, '#ff8fc8')
  g.addColorStop(0.7, '#ffe6f3')
  g.addColorStop(1, '#ffffff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  textureCache.set(key, tex)
  return tex
}

export function lookIdForChip(chipId) {
  return CHIP_LOOKS[chipId] ?? 'stone'
}

export function modelFileForChip(chipId) {
  return CHIP_MODELS[chipId] ?? 'chip-example.glb'
}

export function chipModelUrl(chipId) {
  const file = modelFileForChip(chipId)
  let ver = 'v=1'
  if (file.includes('whale-glass')) ver = 'v=glass1'
  else if (file.includes('bamboo')) ver = 'v=bamboo1'
  else if (file.includes('wave')) ver = 'v=wave1'
  else if (file.includes('leaf')) ver = 'v=leaf1'
  else if (file.includes('soil')) ver = 'v=soil1'
  else if (file.includes('grass')) ver = 'v=grass1'
  else if (file.includes('shard')) ver = 'v=shard1'
  else if (file.includes('snow')) ver = 'v=snow1'
  return `${import.meta.env.BASE_URL}${file}?${ver}`
}

/** Looks that need planar front UVs (gradient / photo / stripe maps). */
export function needsPlanarUVs(lookId) {
  return (
    lookId === 'sand' ||
    lookId === 'terrazzo' ||
    lookId === 'whale-gradient' ||
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
  )
}

function mixHex(a, b, k) {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * k)
  const g = Math.round(ag + (bg - ag) * k)
  const bch = Math.round(ab + (bb - ab) * k)
  return `rgb(${r},${g},${bch})`
}

/** Vertical slat / flute albedo (U = across ribs). */
function makeBambooStripeMap({
  base,
  groove,
  highlight,
  ribs = 10,
  rounded = false,
  verticalGradient = false,
} = {}) {
  const key = `bamboo-stripe-${base}-${groove}-${highlight}-${ribs}-${rounded}-${verticalGradient}`
  if (textureCache.has(key)) return textureCache.get(key)

  const w = 512
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const ribW = w / ribs

  for (let i = 0; i < ribs; i += 1) {
    const x0 = i * ribW
    for (let x = 0; x < ribW; x += 1) {
      const t = x / ribW
      let shade
      if (rounded) {
        const d = Math.abs(t - 0.5) * 2
        const ridge = (1 - d) ** 1.6
        const mid = mixHex(groove, base, 0.55 + ridge * 0.35)
        shade = mixHex(mid, highlight, ridge * ridge * 0.85)
      } else {
        const edge = t < 0.06 || t > 0.94
        shade = edge ? groove : mixHex(base, highlight, 0.15 + Math.sin(t * Math.PI) * 0.25)
      }

      if (verticalGradient) {
        for (let y = 0; y < h; y += 1) {
          const vy = y / (h - 1)
          // soft top→bottom green wash mixed with slat color
          const wash = mixHex('#eaf6e2', '#8fbc78', vy)
          const out = mixHex(
            shade.startsWith('#') ? shade : (() => {
              // shade is rgb(...) — approximate via wash only on channels
              return base
            })(),
            wash,
            0.35,
          )
          // blend rgb shade with wash by drawing twice
          ctx.fillStyle = shade
          ctx.fillRect(x0 + x, y, 1, 1)
          ctx.fillStyle = wash
          ctx.globalAlpha = 0.28 + vy * 0.22
          ctx.fillRect(x0 + x, y, 1, 1)
          ctx.globalAlpha = 1
        }
      } else {
        ctx.fillStyle = shade
        ctx.fillRect(x0 + x, 0, 1, h)
      }
    }
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.needsUpdate = true
  textureCache.set(key, tex)
  return tex
}

/** Keep the baked Tripo look on the tip — do not recolor the silver base. */
export function createSilverBaseMaterial(sourceMaterial) {
  if (sourceMaterial) {
    const mat = sourceMaterial.clone()
    if (mat.map) mat.map.colorSpace = SRGBColorSpace
    return mat
  }
  return new MeshStandardMaterial({
    color: new Color('#c8ccd2'),
    metalness: 0.85,
    roughness: 0.32,
    envMapIntensity: 1.0,
  })
}

function cloneSourceTop(sourceMaterial, { metalness = 0.05, roughness = 0.82, env = 0.55 } = {}) {
  if (sourceMaterial) {
    const mat = sourceMaterial.clone()
    if (mat.map) mat.map.colorSpace = SRGBColorSpace
    mat.metalness = metalness
    mat.roughness = roughness
    mat.envMapIntensity = env
    return mat
  }
  return new MeshStandardMaterial({
    color: new Color('#b7aea3'),
    roughness,
    metalness,
  })
}

export function createTopMaterial(lookId, sourceMaterial) {
  switch (lookId) {
    case 'whale':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.08,
        roughness: 0.35,
        env: 0.75,
      })
    case 'whale-gradient':
      // Whale 002 — smooth glossy pink→clear glass
      return new MeshPhysicalMaterial({
        map: makeWhaleGradientMap(),
        color: new Color('#ffffff'),
        roughness: 0.04,
        metalness: 0.02,
        transmission: 0.62,
        thickness: 0.4,
        ior: 1.48,
        transparent: true,
        opacity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 1,
        envMapIntensity: 1.25,
        flatShading: false,
        attenuationColor: new Color('#ff9ec8'),
        attenuationDistance: 0.5,
      })
    case 'whale-frost':
      // Whale 003 — smooth milky pastel pink (satin, not chalky)
      return new MeshPhysicalMaterial({
        color: new Color('#f7c0db'),
        roughness: 0.22,
        metalness: 0.01,
        transmission: 0.38,
        thickness: 0.5,
        ior: 1.42,
        transparent: true,
        opacity: 0.94,
        clearcoat: 0.65,
        clearcoatRoughness: 0.12,
        sheen: 0.2,
        sheenRoughness: 0.4,
        sheenColor: new Color('#ffe0f0'),
        envMapIntensity: 0.7,
        flatShading: false,
        attenuationColor: new Color('#f0a8cc'),
        attenuationDistance: 0.65,
      })
    case 'bamboo':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.05,
        roughness: 0.28,
        env: 0.85,
      })
    case 'wave':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.06,
        roughness: 0.22,
        env: 0.95,
      })
    case 'leaf':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.08,
        roughness: 0.2,
        env: 1.0,
      })
    case 'soil':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.02,
        roughness: 0.78,
        env: 0.4,
      })
    case 'grass':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.05,
        roughness: 0.18,
        env: 1.05,
      })
    case 'shard':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.04,
        roughness: 0.16,
        env: 1.1,
      })
    case 'snow':
      return cloneSourceTop(sourceMaterial, {
        metalness: 0.05,
        roughness: 0.2,
        env: 1.05,
      })
    case 'snow-glow': {
      // Snow 023 — deep blue frost glow from photo left panel
      const map = loadColorMap('chip-textures/snow-023.jpg?v=2', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.28,
        metalness: 0.02,
        emissive: new Color('#1a4cff'),
        emissiveMap: map,
        emissiveIntensity: 0.45,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
        envMapIntensity: 0.85,
        flatShading: false,
      })
    }
    case 'snow-clear': {
      // Snow 024 — icy clear blue glass from photo right panel
      const map = loadColorMap('chip-textures/snow-024.jpg?v=2', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.1,
        metalness: 0.03,
        emissive: new Color('#6eb6ff'),
        emissiveMap: map,
        emissiveIntensity: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.15,
        flatShading: false,
      })
    }
    case 'shard-rose': {
      // Shard 025 — frosted rose pink from photo left panel
      const map = loadColorMap('chip-textures/shard-025.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.22,
        metalness: 0.02,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.0,
        flatShading: false,
      })
    }
    case 'shard-iris': {
      // Shard 027 — iridescent pink from photo right panel
      const map = loadColorMap('chip-textures/shard-027.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.14,
        metalness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.15,
        flatShading: false,
      })
    }
    case 'grass-glow': {
      // Grass 019 — glossy lime glass (left panel photo when provided)
      const map = loadColorMap('chip-textures/grass-019.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.08,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.15,
        flatShading: false,
      })
    }
    case 'grass-frost': {
      // Grass 020 — soft frosted lime (right panel photo when provided)
      const map = loadColorMap('chip-textures/grass-020.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.26,
        metalness: 0.01,
        clearcoat: 0.75,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.9,
        flatShading: false,
      })
    }
    case 'soil-clay': {
      // Soil 017 — smooth reddish clay from photo left panel
      const map = loadColorMap('chip-textures/soil-017.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.82,
        metalness: 0.02,
        envMapIntensity: 0.3,
        flatShading: false,
      })
    }
    case 'soil-crack': {
      // Soil 018 — cracked dry earth from photo right panel
      const map = loadColorMap('chip-textures/soil-018.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.9,
        metalness: 0.01,
        envMapIntensity: 0.28,
        flatShading: false,
      })
    }
    case 'leaf-jade': {
      // Leaf 014 — cream/sage marble from photo left panel
      const map = loadColorMap('chip-textures/leaf-014.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.18,
        metalness: 0.02,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.95,
        flatShading: false,
      })
    }
    case 'leaf-grain': {
      // Leaf 015 — olive pebbled grain from photo right panel
      const map = loadColorMap('chip-textures/leaf-015.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.72,
        metalness: 0.02,
        envMapIntensity: 0.4,
        flatShading: false,
      })
    }
    case 'wave-swirl': {
      // Wave 010 — blue/white swirl from photo left panel
      const map = loadColorMap('chip-textures/wave-010.jpg?v=2', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.14,
        metalness: 0.02,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.05,
        flatShading: false,
      })
    }
    case 'wave-clear': {
      // Wave 012 — pale translucent blue from photo right panel
      const map = loadColorMap('chip-textures/wave-012.jpg?v=1', { clamp: true })
      map.flipY = true
      return new MeshPhysicalMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.12,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.1,
        flatShading: false,
      })
    }
    case 'bamboo-frost': {
      // Bamboo 002 — photo crop colors (pale sage + vertical bands)
      const map = loadColorMap('chip-textures/bamboo-002.jpg?v=2', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.52,
        metalness: 0.02,
        envMapIntensity: 0.4,
        flatShading: false,
      })
    }
    case 'bamboo-gloss': {
      // Bamboo 003 — photo crop colors (deep emerald flutes)
      const map = loadColorMap('chip-textures/bamboo-003.jpg?v=2', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.16,
        metalness: 0.04,
        envMapIntensity: 0.85,
        flatShading: false,
      })
    }
    case 'terrazzo':
      return new MeshStandardMaterial({
        map: loadColorMap('chip-textures/terrazzo.jpg'),
        roughness: 0.7,
        metalness: 0.02,
        envMapIntensity: 0.45,
      })
    case 'sand': {
      const map = loadColorMap('chip-textures/sand.jpg?v=stone003', { clamp: true })
      map.flipY = true
      return new MeshStandardMaterial({
        map,
        color: new Color('#ffffff'),
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.35,
      })
    }
    case 'stone':
    default:
      return cloneSourceTop(sourceMaterial)
  }
}
