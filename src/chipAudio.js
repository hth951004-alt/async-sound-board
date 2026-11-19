/** Chip id → audio file under public/chip-audio. */
const AUDIO_FILES = {
  'chip-001': 'chip-001.mp3',
  'chip-002': 'chip-002.mp3',
  'chip-003': 'chip-003.mp3',
  'chip-004': 'chip-004.mp3',
  'chip-005': 'chip-005.mp3',
  'chip-006': 'chip-006.mp3',
  'chip-007': 'chip-007.mp3',
  'chip-008': 'chip-008.mp3',
  'chip-009': 'chip-009.mp3',
  'chip-010': 'chip-010.mp3',
  'chip-011': 'chip-011.mp3',
  'chip-012': 'chip-012.mp3',
  'chip-013': 'chip-013.mp3',
  'chip-014': 'chip-014.mp3',
  'chip-015': 'chip-015.mp3',
  'chip-016': 'chip-016.mp3',
  'chip-017': 'chip-017.mp3',
  'chip-018': 'chip-018.mp3',
  'chip-019': 'chip-019.mp3',
  'chip-020': 'chip-020.mp3',
  'chip-021': 'chip-021.mp3',
  'chip-022': 'chip-022.wav',
  'chip-023': 'chip-023.wav',
  'chip-024': 'chip-024.mp3',
  'chip-025': 'chip-025.wav',
  'chip-026': 'chip-026.mp3',
  'chip-027': 'chip-027.mp3',
}

/** @type {Map<string, HTMLAudioElement>} */
const players = new Map()

/** @type {AudioContext | null} */
let audioCtx = null

function urlForChip(chipId) {
  const file = AUDIO_FILES[chipId]
  if (!file) return null
  return `${import.meta.env.BASE_URL}chip-audio/${file}`
}

function getOrCreatePlayer(chipId) {
  const existing = players.get(chipId)
  if (existing) return existing
  const url = urlForChip(chipId)
  if (!url) return null
  const audio = new Audio(url)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 1
  players.set(chipId, audio)
  return audio
}

/** Must run inside a user-gesture handler (click). */
export function unlockChipAudio() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
  }
}

export function startChipAudio(chipId) {
  unlockChipAudio()
  const audio = getOrCreatePlayer(chipId)
  if (!audio) return
  if (!audio.paused && !audio.ended) return
  const play = audio.play()
  if (play?.catch) play.catch(() => {})
}

export function stopChipAudio(chipId) {
  const audio = players.get(chipId)
  if (!audio) return
  audio.pause()
  try {
    audio.currentTime = 0
  } catch {
    /* ignore */
  }
}

/** Keep looping audio in sync with chips currently seated on the board. */
export function syncChipAudio(activeChipIds) {
  const active = new Set(activeChipIds)
  for (const id of players.keys()) {
    if (!active.has(id)) stopChipAudio(id)
  }
  for (const id of active) startChipAudio(id)
}

export function stopAllChipAudio() {
  for (const id of players.keys()) stopChipAudio(id)
}

export function hasChipAudio(chipId) {
  return Boolean(AUDIO_FILES[chipId])
}
