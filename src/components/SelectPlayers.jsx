import { useState, useRef, useCallback } from 'react'
import { PLAYER_COLORS, PLAYER_EMOJIS, PLAYER_NAMES } from '../constants'

// --- Web Audio sound helpers ---
function getAudioCtx() {
  if (!window._audioCtx) {
    window._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return window._audioCtx
}

function playTone({ freq = 440, type = 'sine', duration = 0.12, volume = 0.18, decay = 0.08 } = {}) {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration + decay)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration + decay)
  } catch (_) {}
}

// Different sounds for different actions
const sounds = {
  // Soft "pop" when enabling a player
  enable:  () => playTone({ freq: 520, type: 'sine',     duration: 0.09, volume: 0.2,  decay: 0.1  }),
  // Lower "thud" when disabling
  disable: () => playTone({ freq: 260, type: 'triangle', duration: 0.08, volume: 0.15, decay: 0.07 }),
  // Typing tick
  type:    () => playTone({ freq: 900, type: 'square',   duration: 0.02, volume: 0.06, decay: 0.02 }),
  // Happy chord when pressing Start
  start:   () => {
    playTone({ freq: 523, type: 'sine', duration: 0.12, volume: 0.18, decay: 0.15 })
    setTimeout(() => playTone({ freq: 659, type: 'sine', duration: 0.12, volume: 0.18, decay: 0.15 }), 80)
    setTimeout(() => playTone({ freq: 784, type: 'sine', duration: 0.18, volume: 0.18, decay: 0.2  }), 160)
  },
  // Back button
  back:    () => playTone({ freq: 340, type: 'triangle', duration: 0.1,  volume: 0.12, decay: 0.1  }),
  // Error
  error:   () => {
    playTone({ freq: 200, type: 'sawtooth', duration: 0.08, volume: 0.15, decay: 0.05 })
    setTimeout(() => playTone({ freq: 170, type: 'sawtooth', duration: 0.1, volume: 0.15, decay: 0.08 }), 90)
  },
}

export default function SelectPlayers({ initialPlayers, onBack, onConfirm }) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      active: i < 2,
      name: initialPlayers[i]?.name || PLAYER_NAMES[i],
    }))
  )
  const typingTimer = useRef(null)

  function toggle(i) {
    if (i < 2) return
    const willActivate = !rows[i].active
    willActivate ? sounds.enable() : sounds.disable()
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, active: !r.active } : r))
  }

  function setName(i, val) {
    // Throttle typing sound — play once per 80ms burst
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => sounds.type(), 40)
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, name: val } : r))
  }

  function handleBack() {
    sounds.back()
    onBack()
  }

  function confirm() {
    const active = rows
      .map((r, i) => ({ ...r, i }))
      .filter(r => r.active)
    if (active.length < 2) {
      sounds.error()
      alert('Need at least 2 players!')
      return
    }
    sounds.start()
    const players = active.map(r => ({
      name: r.name || PLAYER_NAMES[r.i],
      color: PLAYER_COLORS[r.i],
      emoji: PLAYER_EMOJIS[r.i],
      pos: 0,
    }))
    setTimeout(() => onConfirm(players), 350) // slight delay so chord plays
  }

  return (
    <div className="screen active">
      <div className="sub-screen">
        <div className="screen-header">
          <button className="back-btn" onClick={handleBack}>← Back</button>
       <div className="screen-title">Select Players</div>
        </div>

        {rows.map((row, i) => (
          <div
            key={i}
            className={`player-row ${row.active ? 'enabled' : 'disabled'}`}
            style={{ borderColor: row.active ? PLAYER_COLORS[i] + '60' : undefined }}
          >
            <button
              className={`ptoggle ${row.active ? 'active' : ''}`}
              style={{ background: row.active ? PLAYER_COLORS[i] : undefined }}
              onClick={() => toggle(i)}
            >
              {row.active ? '✓' : '+'}
            </button>
            <span
              className="color-circle"
              style={{ background: PLAYER_COLORS[i], boxShadow: `0 0 10px ${PLAYER_COLORS[i]}80` }}
            />
            <input
              className="pname-input"
              value={row.name}
              disabled={!row.active}
              placeholder={PLAYER_NAMES[i]}
              onChange={e => setName(i, e.target.value)}
              maxLength={16}
            />
            <span className="player-emoji">{PLAYER_EMOJIS[i]}</span>
          </div>
        ))}

        <button className="confirm-btn" onClick={confirm}>
          Start Game →
        </button>
      </div>
    </div>
  )
}