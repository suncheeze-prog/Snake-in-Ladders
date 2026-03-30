import { useState } from 'react'
import { useT } from '../i18n'

// ─── Audio helpers ─────────────────────────────────────────────────────────────
function getACtx() {
  if (!window._ac) window._ac = new (window.AudioContext || window.webkitAudioContext)()
  return window._ac
}
function tone({ freq=440, type='sine', vol=0.18, dur=0.12, decay=0.1, delay=0 }={}) {
  try {
    const ctx = getACtx(), t = ctx.currentTime + delay
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + decay)
    osc.start(t); osc.stop(t + dur + decay)
  } catch(_) {}
}
const sfx = {
  click:  () => tone({ freq: 500, type: 'sine',     vol: 0.18, dur: 0.06, decay: 0.08 }),
  select: () => { tone({ freq: 440, dur: 0.08 }); tone({ freq: 660, dur: 0.1, decay: 0.15, delay: 0.08 }) },
  back:   () => tone({ freq: 340, type: 'triangle', vol: 0.12, dur: 0.10, decay: 0.10 }),
}

export default function ModeSelect({ onBack, onConfirmPvP, onConfirmPvB, lang }) {
  const t = useT(lang)
  const [mode, setMode] = useState(null)   // null | 'pvp' | 'pvb'
  const [diff, setDiff] = useState('normal')

  const DIFFS = [
    { key: 'easy',   label: t.easy,   color: '#2d6a4f' },
    { key: 'normal', label: t.normal, color: '#faa307' },
    { key: 'hard',   label: t.hard,   color: '#c1121f' },
  ]

 function selectMode(m) {
  sfx.select()
  if (m === 'pvp') {
    // Pumunta agad sa SelectPlayers, wala nang Step 2
    setTimeout(() => onConfirmPvP(), 200) // slight delay para may tunog
  } else {
    setMode(m)
  }
}
  function selectDiff(d) { sfx.click(); setDiff(d) }
  function handleBack() { sfx.back(); if (mode) setMode(null); else onBack() }

  function confirm() {
    sfx.select()
    if (mode === 'pvp') onConfirmPvP()
    else onConfirmPvB(diff)
  }

  const card = (content) => (
    <div style={{
      background: 'rgba(15,14,30,0.6)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '28px 24px',
      width: '100%',
      maxWidth: '340px',
      animation: 'cardIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both',
    }}>{content}</div>
  )

  return (
    <div className="screen active menu-screen" style={{ position: 'relative' }}>
      {/* Dim bg */}
      <div style={{ position:'absolute', inset:0, background:'#0f0e17', zIndex:0 }} />

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'24px 20px', width:'100%' }}>

        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'24px', color:'#faa307', marginBottom:'4px' }}>
          {t.modeTitle}
        </div>

        {/* ── Step 1: pick mode ── */}
        {!mode && card(
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {/* PvP card */}
            <button
              onClick={() => selectMode('pvp')}
              style={{
                background: 'rgba(45,106,79,0.2)', border: '1px solid #2d6a4f',
                borderRadius: '14px', padding: '16px', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(45,106,79,0.35)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(45,106,79,0.2)'}
            >
              <div style={{ fontSize:'28px', marginBottom:'4px' }}>👥</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'18px', color:'#fff' }}>{t.modePvP}</div>
              <div style={{ fontSize:'12px', color:'#a7a3c2', marginTop:'2px' }}>{t.modePvPdesc}</div>
            </button>

            {/* PvB card */}
            <button
              onClick={() => selectMode('pvb')}
              style={{
                background: 'rgba(193,18,31,0.15)', border: '1px solid #c1121f',
                borderRadius: '14px', padding: '16px', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(193,18,31,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(193,18,31,0.15)'}
            >
              <div style={{ fontSize:'28px', marginBottom:'4px' }}>🤖</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'18px', color:'#fff' }}>{t.modePvB}</div>
              <div style={{ fontSize:'12px', color:'#a7a3c2', marginTop:'2px' }}>{t.modePvBdesc}</div>
            </button>

            <button className="back-btn" onClick={handleBack} style={{ marginTop:'4px' }}>{t.back}</button>
          </div>
        )}

        {/* ── Step 2: PvP → go straight to SelectPlayers ── */}
        {/* (handled by confirm immediately) */}

        {/* ── Step 2: PvB → pick difficulty ── */}
        {mode === 'pvb' && card(
          <div>
            <div style={{ fontSize:'32px', textAlign:'center', marginBottom:'4px' }}>🤖</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'18px', color:'#faa307', textAlign:'center', marginBottom:'16px' }}>
              {t.botDiff}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
              {DIFFS.map(d => (
                <button
                  key={d.key}
                  onClick={() => selectDiff(d.key)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${diff === d.key ? d.color : 'rgba(255,255,255,0.1)'}`,
                    background: diff === d.key ? d.color + '33' : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontFamily: "'Fredoka One',cursive",
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: diff === d.key ? d.color : 'rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }} />
                  {d.label}
                  {diff === d.key && <span style={{ marginLeft:'auto', color: d.color }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="back-btn" onClick={handleBack} style={{ flex:1 }}>{t.back}</button>
              <button
                onClick={confirm}
                style={{
                  flex: 2, padding: '10px', borderRadius: '12px', border: 'none',
                  background: '#c1121f', color: '#fff',
                  fontFamily: "'Fredoka One',cursive", fontSize: '16px', cursor: 'pointer',
                  boxShadow: '0 4px 0 #870000',
                }}
              >
                {t.startBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}