import { useEffect, useRef, useState } from 'react'
import { MAPS } from '../constants'

// ─── Web Audio Context ────────────────────────────────────────────────────────
const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext : window.AudioContext
let actx = null
function getCtx() {
  if (!actx) actx = new AudioCtx()
  return actx
}

function playClick() {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(600, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.start(); osc.stop(ctx.currentTime + 0.1)
}

// Arrow sound — slightly different pitch
function playArrow(dir) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(dir > 0 ? 440 : 360, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(dir > 0 ? 560 : 280, ctx.currentTime + 0.07)
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
  osc.start(); osc.stop(ctx.currentTime + 0.1)
}

// ─── Background Music ─────────────────────────────────────────────────────────
let bgInterval = null
let bgStarted = false

function playBgNote(freq, time, duration, vol = 0.06) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.connect(gain); gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(freq, time)
  gain.gain.setValueAtTime(vol, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
  osc.start(time); osc.stop(time + duration)
}

function startBgMusic() {
  if (bgStarted) return
  bgStarted = true
  const ctx = getCtx()
  const melody = [261, 293, 329, 349, 392, 349, 329, 293]
  const bass   = [130, 130, 164, 164, 196, 196, 174, 174]
  let beat = 0
  function playBeat() {
    const now = ctx.currentTime
    const note = melody[beat % melody.length]
    const b    = bass[beat % bass.length]
    playBgNote(note, now, 0.4, 0.05)
    playBgNote(b,    now, 0.45, 0.04)
    playBgNote(note * 1.25, now, 0.35, 0.02)
    beat++
  }
  playBeat()
  bgInterval = setInterval(playBeat, 480)
}

function stopBgMusic() {
  if (bgInterval) { clearInterval(bgInterval); bgInterval = null; bgStarted = false }
}

// ─── Mini Board Preview (canvas) ─────────────────────────────────────────────
function cellToXY(n, CS) {
  if (n < 1 || n > 100) return { x: -99, y: -99 }
  const idx = n - 1
  const row = Math.floor(idx / 10)
  const col = idx % 10
  const gr = 9 - row
  const gc = row % 2 === 0 ? col : 9 - col
  return { x: gc * CS + CS / 2, y: gr * CS + CS / 2 }
}

function drawMiniBoard(canvas, map) {
  const size = canvas.offsetWidth || canvas.width
  canvas.width = size
  canvas.height = size
  const CS = size / 10
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)

  // Tiles
  const palette = map.theme
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const pi = Math.floor(r / 2) % palette.length
      ctx.fillStyle = (r + c) % 2 === 0 ? palette[pi] : adjustBrightness(palette[pi], 20)
      ctx.fillRect(c * CS, r * CS, CS, CS)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 0.4
      ctx.strokeRect(c * CS, r * CS, CS, CS)
    }
  }

  // Ladders (green lines)
  Object.entries(map.ladders).forEach(([f, t]) => {
    const a = cellToXY(+f, CS), b = cellToXY(+t, CS)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = '#52b788'
    ctx.lineWidth = CS * 0.15
    ctx.lineCap = 'round'
    ctx.stroke()
    // rungs
    const steps = Math.max(2, Math.round(Math.hypot(b.x-a.x,b.y-a.y)/(CS*0.4)))
    const dx = b.x-a.x, dy = b.y-a.y
    const len = Math.hypot(dx,dy)
    const nx = -dy/len * CS*0.07, ny = dx/len * CS*0.07
    for (let i = 1; i < steps; i++) {
      const tp = i/steps
      const rx = a.x+dx*tp, ry = a.y+dy*tp
      ctx.beginPath()
      ctx.moveTo(rx-nx, ry-ny); ctx.lineTo(rx+nx, ry+ny)
      ctx.strokeStyle = '#2d6a4f'
      ctx.lineWidth = CS * 0.08
      ctx.stroke()
    }
    // gold dot at top
    ctx.beginPath()
    ctx.arc(b.x, b.y, CS*0.09, 0, Math.PI*2)
    ctx.fillStyle = '#faa307'
    ctx.fill()
  })

  // Snakes (red wavy lines)
  Object.entries(map.snakes).forEach(([f, t]) => {
    const a = cellToXY(+f, CS), b = cellToXY(+t, CS)
    const segs = 20, amp = CS * 0.3
    ctx.beginPath()
    for (let i = 0; i <= segs; i++) {
      const tp = i / segs
      const x = a.x + (b.x-a.x)*tp + Math.sin(tp*Math.PI*4)*amp*(1-tp*0.3)
      const y = a.y + (b.y-a.y)*tp + Math.cos(tp*Math.PI*3)*amp*0.4
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
    }
    ctx.strokeStyle = '#e63946'
    ctx.lineWidth = CS * 0.13
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    // head dot
    ctx.beginPath()
    ctx.arc(a.x, a.y, CS*0.1, 0, Math.PI*2)
    ctx.fillStyle = '#ff6b6b'
    ctx.fill()
  })

  // Number 1 and 100 markers
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `bold ${Math.round(CS*0.18)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const p1  = cellToXY(1, CS)
  const p100= cellToXY(100, CS)
  ctx.fillText('1',   p1.x,   p1.y)
  ctx.fillText('100', p100.x, p100.y)
}

function adjustBrightness(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16)+amount)
  const g = Math.min(255, parseInt(hex.slice(3,5),16)+amount)
  const b = Math.min(255, parseInt(hex.slice(5,7),16)+amount)
  return `rgb(${r},${g},${b})`
}

// ─── Map Preview Card ─────────────────────────────────────────────────────────
function MapPreview({ map }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current) return
    drawMiniBoard(canvasRef.current, map)
    const ro = new ResizeObserver(() => drawMiniBoard(canvasRef.current, map))
    ro.observe(canvasRef.current.parentElement)
    return () => ro.disconnect()
  }, [map])

  return (
    <div style={{
      width: '100%',
      aspectRatio: '1',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '2px solid rgba(250,163,7,0.5)',
      boxShadow: '0 0 24px rgba(250,163,7,0.15)',
      position: 'relative',
    }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,8,25,0.75)',
        padding: '4px 8px',
        display: 'flex', gap: '10px', justifyContent: 'center',
        fontSize: '10px', color: '#fff',
      }}>
        <span><span style={{ color:'#ff6b6b' }}>●</span> Snakes: {Object.keys(map.snakes).length}</span>
        <span><span style={{ color:'#52b788' }}>●</span> Ladders: {Object.keys(map.ladders).length}</span>
      </div>
    </div>
  )
}

// ─── Animated Background Canvas ──────────────────────────────────────────────
function BackgroundCanvas() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const EMOJIS = ['🐍','🪜','🎲','⭐','🔴','🟢','🟡','🟣','🎯','🏆']
    const pieces = Array.from({ length: 20 }, (_, i) => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      emoji: EMOJIS[i % EMOJIS.length],
      size: 28 + Math.random() * 52,
      sx: (Math.random() - 0.5) * 0.55, sy: (Math.random() - 0.5) * 0.55,
      rot: Math.random() * Math.PI * 2, rs: (Math.random() - 0.5) * 0.018,
      op: 0.12 + Math.random() * 0.32,
    }))

    const COLORS = [['#1e3a5f','#16324f'],['#3d1a4e','#2d1238'],['#1a4035','#122b24'],['#4a2010','#33160b'],['#1a2a4a','#111e36']]
    let sx = 0, sy = 0, tx = 0, ty = 0, t = 0

    function draw() {
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      if (++t > 200) { t = 0; tx = (Math.random()-0.5)*160; ty = (Math.random()-0.5)*160 }
      sx += (tx-sx)*0.004; sy += (ty-sy)*0.004
      const CS = Math.min(w,h)/7
      const cols = Math.ceil(w/CS)+4, rows = Math.ceil(h/CS)+4
      const sc = Math.floor(-sx/CS)-1, sr = Math.floor(-sy/CS)-1
      for (let r = sr; r < sr+rows; r++) for (let c = sc; c < sc+cols; c++) {
        const pi = Math.abs(Math.floor(r/2)+Math.floor(c/2)) % COLORS.length
        ctx.fillStyle = COLORS[pi][Math.abs(r+c)%2]
        ctx.fillRect(c*CS+sx, r*CS+sy, CS, CS)
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.8
        ctx.strokeRect(c*CS+sx, r*CS+sy, CS, CS)
      }
      ctx.fillStyle = 'rgba(10,8,25,0.58)'; ctx.fillRect(0,0,w,h)
      pieces.forEach(p => {
        p.x += p.sx; p.y += p.sy; p.rot += p.rs
        if (p.x < -80) p.x = w+40; if (p.x > w+80) p.x = -40
        if (p.y < -80) p.y = h+40; if (p.y > h+80) p.y = -40
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot)
        ctx.globalAlpha = p.op; ctx.font = `${p.size}px serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(p.emoji, 0, 0); ctx.restore()
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', filter:'blur(4px)', transform:'scale(1.05)' }} />
}

// ─── Main Menu ────────────────────────────────────────────────────────────────
export default function MainMenu({ onStart, onSelectPlayers, onSettings, selectedMap, onSelectMap }) {
  const [showMap, setShowMap] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(selectedMap)

  useEffect(() => {
    const start = () => { startBgMusic(); window.removeEventListener('click', start) }
    window.addEventListener('click', start)
    return () => window.removeEventListener('click', start)
  }, [])

  const withSfx = (fn) => (...args) => { playClick(); fn?.(...args) }

  const handleExit = () => {
    playClick()
    setTimeout(() => {
      if (window.confirm('Exit the game?')) {
        stopBgMusic()
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Nunito,sans-serif;color:#a7a3c2;font-size:20px;background:#0f0e17">Thanks for playing! Refresh to restart. 🐍🪜</div>'
      }
    }, 80)
  }

  function prev() {
    playArrow(-1)
    setPreviewIdx(i => (i - 1 + MAPS.length) % MAPS.length)
  }
  function next() {
    playArrow(1)
    setPreviewIdx(i => (i + 1) % MAPS.length)
  }
  function confirmMap() {
    playClick()
    onSelectMap(previewIdx)
    setShowMap(false)
  }
  function openMap() {
    playClick()
    setPreviewIdx(selectedMap)
    setShowMap(true)
  }

  const currentMap = MAPS[selectedMap]
  const previewMap = MAPS[previewIdx]

  return (
    <div className="screen active menu-screen" style={{ position:'relative', overflow:'hidden' }}>
      <BackgroundCanvas />

      {/* ── Map Selector Overlay ── */}
      {showMap && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(10,8,25,0.88)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.2s ease',
        }}>
          {/* Title */}
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'22px', color:'#faa307', marginBottom:'14px', letterSpacing:'1px' }}>
            Choose Map
          </div>

          {/* Arrow + Preview row */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', maxWidth:'360px' }}>
            {/* Left arrow */}
            <button onClick={prev} className="map-arrow-btn">&#8592;</button>

            {/* Preview square */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
              <MapPreview map={previewMap} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:'20px', color:'#fff' }}>
                  {previewMap.emoji} {previewMap.name}
                </div>
                <div style={{ fontSize:'12px', color:'#a7a3c2', marginTop:'2px' }}>
                  {previewMap.desc}
                </div>
                {/* Dot indicators */}
                <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginTop:'8px' }}>
                  {MAPS.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => { playArrow(i > previewIdx ? 1 : -1); setPreviewIdx(i) }}
                      style={{
                        width: i === previewIdx ? '18px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: i === previewIdx ? '#faa307' : 'rgba(255,255,255,0.25)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right arrow */}
            <button onClick={next} className="map-arrow-btn">&#8594;</button>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
            <button
              onClick={confirmMap}
              style={{
                fontFamily:"'Fredoka One',cursive", fontSize:'16px',
                padding:'10px 28px', borderRadius:'12px', border:'none',
                background:'#c1121f', color:'#fff', cursor:'pointer',
                boxShadow:'0 4px 0 #870000',
              }}
            >
              Select Map ✓
            </button>
            <button
              onClick={() => { playClick(); setShowMap(false) }}
              style={{
                fontFamily:"'Fredoka One',cursive", fontSize:'16px',
                padding:'10px 20px', borderRadius:'12px',
                background:'rgba(255,255,255,0.08)', color:'#a7a3c2',
                border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="menu-card">
        <div className="menu-logo">🐍🪜</div>
        <div className="menu-title">SNAKES &amp; LADDERS</div>
        <div className="menu-sub">3D Edition · Up to 4 Players</div>
        <div className="menu-buttons">
          <button className="mbtn mbtn-start"    onClick={withSfx(onStart)}>▶ Start Game</button>
          <button className="mbtn mbtn-players"  onClick={withSfx(onSelectPlayers)}>👥 Select Players</button>

          {/* Map picker button — shows currently selected map */}
          <button
            className="mbtn mbtn-map"
            onClick={openMap}
            style={{ position:'relative' }}
          >
            <span style={{ fontSize:'16px' }}>{currentMap.emoji}</span>
            {' '}{currentMap.name}
            <span style={{
              position:'absolute', top:'4px', right:'10px',
              fontSize:'9px', color:'rgba(255,255,255,0.5)',
              textTransform:'uppercase', letterSpacing:'1px',
            }}>map</span>
          </button>

          <button className="mbtn mbtn-settings" onClick={withSfx(onSettings)}>⚙ Settings</button>
          <button className="mbtn mbtn-exit"     onClick={handleExit}>✕ Exit</button>
        </div>
        <div className="menu-footer">Roll the dice. Climb the ladder. Avoid the snakes.</div>
      </div>
    </div>
  )
}