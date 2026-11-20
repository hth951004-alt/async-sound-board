import { Link } from 'react-router-dom'
import { useGLTF } from '@react-three/drei'
import ChipSlot3D from './ChipSlot3D.jsx'
import { chipModelUrl } from '../chipLooks.js'
import './speak.css'

/** Nine hero chips mapped to existing GLB looks (Figma placeholders → 3D). */
const ROW_A = [
  { chipId: 'chip-011', label: '01', phase: 0.2 },
  { chipId: 'chip-002', label: '02', phase: 0.8 },
  { chipId: 'chip-021', label: '03', phase: 1.4 },
]
const ROW_B = [
  { chipId: 'chip-009', label: '01', phase: 0.5 },
  { chipId: 'chip-005', label: '02', phase: 1.1 },
  { chipId: 'chip-016', label: '03', phase: 1.7 },
]
const ROW_C = [
  { chipId: 'chip-014', label: '01', phase: 0.3 },
  { chipId: 'chip-023', label: '02', phase: 0.9 },
  { chipId: 'chip-025', label: '03', phase: 1.5 },
]

for (const chip of [...ROW_A, ...ROW_B, ...ROW_C]) {
  useGLTF.preload(chipModelUrl(chip.chipId))
}

function ChipRun({ chips }) {
  return (
    <span className="speak-chip-run">
      {chips.map((chip) => (
        <ChipSlot3D key={`${chip.chipId}-${chip.label}`} {...chip} />
      ))}
    </span>
  )
}

export default function SpeakPage() {
  const logoSrc = `${import.meta.env.BASE_URL}landing/async-logo.svg`

  return (
    <main className="speak-page" data-node-id="1645:26">
      <header className="speak-header">
        <div className="speak-header__brand">
          <Link to="/" className="speak-logo" aria-label="ASYNC home">
            <img src={logoSrc} alt="" width={80} height={19} />
          </Link>
          <div className="speak-nav">
            <p className="speak-eyebrow">Menu</p>
            <a href="#about" className="speak-nav__link">
              about
            </a>
            <Link to="/board" className="speak-nav__link">
              Collection
            </Link>
          </div>
        </div>

        <div className="speak-header__center">
          <p>MODULAR SOUND SYSTEM</p>
          <p className="speak-header__muted">SEOUL, KR © 2026</p>
        </div>

        <div className="speak-header__contact">
          <p className="speak-eyebrow speak-eyebrow--right">contact us</p>
          <div className="speak-contact-links">
            <a href="mailto:hello@async.sound">email</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              instagram
            </a>
            <a href="mailto:hello@async.sound">inquiries</a>
          </div>
        </div>
      </header>

      <section className="speak-hero" id="about" aria-label="ASYNC manifesto">
        <h1 className="speak-headline">
          <span className="speak-line">
            <span className="speak-word">If</span>
            <ChipRun chips={ROW_A} />
          </span>
          <span className="speak-line">
            <span className="speak-word">the world</span>
            <ChipRun chips={ROW_B} />
          </span>
          <span className="speak-line">
            <ChipRun chips={ROW_C} />
            <span className="speak-word speak-word--serif">feels silent,</span>
          </span>
          <span className="speak-line speak-line--end">
            <span className="speak-word">let ASYNC speak.</span>
            <p className="speak-aside">
              What if we could hear the world differently?
              <br />
              Let&apos;s make sounds that bring us closer to nature.
            </p>
          </span>
        </h1>
      </section>

      <p className="speak-cta">
        <Link to="/board" className="speak-cta__link">
          Open the sound board →
        </Link>
      </p>
    </main>
  )
}
