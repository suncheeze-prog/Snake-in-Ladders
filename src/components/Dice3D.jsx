import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { DICE_ROTATIONS } from '../constants'

// Pip layouts for each face value
const PIP_LAYOUTS = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
}

function DiceFace({ value }) {
  const pips = PIP_LAYOUTS[value] || []
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: '52px',
        height: '52px',
        padding: '4px',
        gap: '2px',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const hasPip = pips.some(([r, c]) => r === row && c === col)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasPip && (
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#1a1a2e',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const Dice3D = forwardRef(function Dice3D({ onRollComplete }, ref) {
  const cubeRef = useRef(null)
  const [currentValue, setCurrentValue] = useState(1)
  const [rolling, setRolling] = useState(false)
  const timeoutRef = useRef(null)

  useImperativeHandle(ref, () => ({
    roll(finalValue, cb) {
      if (rolling) return
      setRolling(true)

      const cube = cubeRef.current
      if (!cube) return

      // Set CSS custom properties for final rotation
      const finalRot = DICE_ROTATIONS[finalValue - 1]
      cube.style.setProperty('--final-rx', `${finalRot.rx}deg`)
      cube.style.setProperty('--final-ry', `${finalRot.ry}deg`)

      // Trigger animation by re-adding class
      cube.classList.remove('rolling')
      void cube.offsetWidth // reflow
      cube.classList.add('rolling')

      timeoutRef.current = setTimeout(() => {
        cube.classList.remove('rolling')
        cube.style.transform = `rotateX(${finalRot.rx}deg) rotateY(${finalRot.ry}deg)`
        setCurrentValue(finalValue)
        setRolling(false)
        if (cb) cb()
      }, 850)
    },
  }))

  const faceStyle = {
    position: 'absolute',
    width: '64px',
    height: '64px',
    borderRadius: '10px',
    background: '#ffffff',
    border: '2px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)',
  }

  return (
    <div style={{ width: '64px', height: '64px', perspective: '400px' }}>
      <div
        ref={cubeRef}
        className="dice-cube"
        style={{
          width: '64px',
          height: '64px',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${DICE_ROTATIONS[currentValue - 1].rx}deg) rotateY(${DICE_ROTATIONS[currentValue - 1].ry}deg)`,
        }}
      >
        {/* Front = 1 */}
        <div className="face face-front" style={faceStyle}>
          <DiceFace value={1} />
        </div>
        {/* Back = 6 */}
        <div className="face face-back" style={faceStyle}>
          <DiceFace value={6} />
        </div>
        {/* Right = 2 */}
        <div className="face face-right" style={faceStyle}>
          <DiceFace value={2} />
        </div>
        {/* Left = 5 */}
        <div className="face face-left" style={faceStyle}>
          <DiceFace value={5} />
        </div>
        {/* Top = 4 */}
        <div className="face face-top" style={{ ...faceStyle, background: '#f8f8f8' }}>
          <DiceFace value={4} />
        </div>
        {/* Bottom = 3 */}
        <div className="face face-bottom" style={{ ...faceStyle, background: '#f0f0f0' }}>
          <DiceFace value={3} />
        </div>
      </div>
    </div>
  )
})

export default Dice3D
