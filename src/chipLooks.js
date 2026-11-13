import {
  ClampToEdgeWrapping,
  Color,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
} from 'three'

/** Relative height of the silver tip (bottom of chip mesh). */
export const SILVER_BASE_RATIO = 0.12

/** Gallery chips that use the shared example GLB with a swappable top look. */
export const CHIP_LOOKS = {
  // 2번째 줄 우측 — 현재 스톤 칩
  'chip-004': 'stone',
  // 3번째 줄
  'chip-005': 'terrazzo',
  'chip-006': 'sand',
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

export function lookIdForChip(chipId) {
  return CHIP_LOOKS[chipId] ?? 'stone'
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

export function createTopMaterial(lookId, sourceMaterial) {
  switch (lookId) {
    case 'terrazzo':
      return new MeshStandardMaterial({
        map: loadColorMap('chip-textures/terrazzo.jpg'),
        roughness: 0.7,
        metalness: 0.02,
        envMapIntensity: 0.45,
      })
    case 'sand': {
      // Product photo crop (Stone 003): smooth left → porous right on the chip face.
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
    default: {
      // Keep Tripo albedo on the body when available; silver base is separate.
      if (sourceMaterial) {
        const mat = sourceMaterial.clone()
        if (mat.map) mat.map.colorSpace = SRGBColorSpace
        mat.metalness = 0.05
        mat.roughness = 0.82
        mat.envMapIntensity = 0.55
        return mat
      }
      return new MeshStandardMaterial({
        color: new Color('#b7aea3'),
        roughness: 0.85,
        metalness: 0.05,
      })
    }
  }
}
