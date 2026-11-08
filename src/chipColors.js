export const chipColors = {
  '001': '#2a2a32',
  '002': '#2a2a32',
  '003': '#2a2a32',
  '004': '#a88758',
  '005': '#a88758',
  '006': '#a87d58',
  '007': '#6f9a55',
  '008': '#6f9a55',
  '009': '#2a2a32',
  '010': '#2a2a32',
  '011': '#2a2a32',
  '012': '#2a2a32',
  '013': '#5d8238',
  '014': '#5d8238',
  '015': '#5d8238',
  '016': '#2a2a32',
  '017': '#2a2a32',
  '018': '#2a2a32',
  '019': '#2a2a32',
  '020': '#2a2a32',
  '021': '#2a2a32',
  '022': '#2a2a32',
  '023': '#2a2a32',
  '024': '#2a2a32',
  '025': '#a81c38',
  '026': '#a80034',
  '027': '#a80034',
}

export function parseHex(hex) {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

/** Full-stage fill color — rich enough to replace black entirely. */
export function colorForBackground(hex) {
  let { r, g, b } = parseHex(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min

  if (chroma < 18) {
    // Dark/stone chips still become a readable solid field.
    r = Math.min(255, Math.round(r * 1.8 + 36))
    g = Math.min(255, Math.round(g * 1.8 + 36))
    b = Math.min(255, Math.round(b * 1.8 + 44))
  } else {
    r = Math.min(255, Math.round(r * 1.15 + 18))
    g = Math.min(255, Math.round(g * 1.15 + 18))
    b = Math.min(255, Math.round(b * 1.15 + 18))
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function mixHex(colors) {
  if (!colors.length) return '#000000'
  let r = 0
  let g = 0
  let b = 0
  colors.forEach((hex) => {
    const c = parseHex(hex)
    r += c.r
    g += c.g
    b += c.b
  })
  const n = colors.length
  return `#${Math.round(r / n)
    .toString(16)
    .padStart(2, '0')}${Math.round(g / n)
    .toString(16)
    .padStart(2, '0')}${Math.round(b / n)
    .toString(16)
    .padStart(2, '0')}`
}
