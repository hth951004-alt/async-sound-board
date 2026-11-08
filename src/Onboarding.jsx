import letterA from '../image/async-a.svg'
import letterS from '../image/async-s.svg'
import letterY from '../image/async-y.svg'
import letterN from '../image/async-n.svg'
import letterC from '../image/async-c.svg'

const letters = [
  { name: 'A', letter: letterA, width: '20.47%' },
  { name: 'S', letter: letterS, width: '15.97%' },
  { name: 'Y', letter: letterY, width: '19%' },
  { name: 'N', letter: letterN, width: '17.84%' },
  { name: 'C', letter: letterC, width: '20.77%' },
]

export default function Onboarding() {
  return (
    <section
      className="onboarding"
      aria-label="ASYNC"
      data-node-id="1142:2"
    >
      <div className="onboarding-canvas">
        <div className="onboarding-mark" data-node-id="1270:9545">
          {letters.map((item, index) => (
            <span
              key={item.name}
              className="onboarding-letter"
              style={{
                '--letter-width': item.width,
                '--letter-delay': `${500 + index * 120}ms`,
              }}
            >
              <img
                className="onboarding-letter-image"
                src={item.letter}
                alt={item.name}
                draggable={false}
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
