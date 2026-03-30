import { useRef, useEffect, useCallback } from 'react'
import { SNAKES, LADDERS } from '../constants'

const TILE_PALETTES = [
  ['#1e3a5f', '#16324f'],
  ['#3d1a4e', '#2d1238'],
  ['#1a4035', '#122b24'],
  ['#4a2010', '#33160b'],
  ['#1a2a4a', '#111e36'],
]

const SNAKE_COLORS = [
  '#e63946', '#c77dff', '#06d6a0',
  '#ffd166', '#f72585', '#4cc9f0',
  '#fb5607', '#8338ec', '#3a86ff', '#ff006e',
]

function cellToXY(n, CS) {
  if (n < 1 || n > 100) return { x: -999, y: -999 }
  const idx = n - 1
  const row = Math.floor(idx / 10)
  const col = idx % 10
  const gridRow = 9 - row
  const gridCol = row % 2 === 0 ? col : 9 - col
  return { x: gridCol * CS + CS / 2, y: gridRow * CS + CS / 2 }
}

function snakePathPoint(from, to, t, CS) {
  const a = cellToXY(from, CS)
  const b = cellToXY(to, CS)
  const amp = CS * 0.42
  const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 5) * amp * (1 - t * 0.3)
  const y = a.y + (b.y - a.y) * t + Math.cos(t * Math.PI * 3.5) * amp * 0.45
  return { x, y }
}

function drawBoard(ctx, CS, palette) {
  const pal = palette || TILE_PALETTES
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const row = 9 - r
      const col = r % 2 === 0 ? c : 9 - c
      const cell = row * 10 + col + 1
      const pi = Math.floor(r / 2) % pal.length
      const entry = pal[pi]
      const c0 = Array.isArray(entry) ? entry[0] : entry
      const c1 = Array.isArray(entry) ? entry[1] : adjustHex(entry, 18)
      const color = (r + c) % 2 === 0 ? c0 : c1
      ctx.fillStyle = color
      ctx.fillRect(c * CS, r * CS, CS, CS)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.8
      ctx.strokeRect(c * CS + 1, r * CS + 1, CS - 2, CS - 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(c * CS, r * CS, CS, CS)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = `bold ${Math.round(CS * 0.18)}px Nunito,sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(cell, c * CS + CS / 2, r * CS + CS * 0.06)
    }
  }
}

function adjustHex(hex, amt) {
  try {
    const r = Math.min(255, parseInt(hex.slice(1,3),16)+amt)
    const g = Math.min(255, parseInt(hex.slice(3,5),16)+amt)
    const b = Math.min(255, parseInt(hex.slice(5,7),16)+amt)
    return `rgb(${r},${g},${b})`
  } catch (_) { return hex }
}

function drawThickSnake(ctx, from, to, color, CS) {
  const a = cellToXY(from, CS)
  const b = cellToXY(to, CS)
  const segs = 40
  const amp = CS * 0.42
  const bodyW = CS * 0.16

  ctx.save()
  ctx.translate(3, 3)
  ctx.globalAlpha = 0.25
  ctx.lineWidth = bodyW + 4
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 5) * amp * (1 - t * 0.3)
    const y = a.y + (b.y - a.y) * t + Math.cos(t * Math.PI * 3.5) * amp * 0.45
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()

  ctx.lineWidth = bodyW
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash([])
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 5) * amp * (1 - t * 0.3)
    const y = a.y + (b.y - a.y) * t + Math.cos(t * Math.PI * 3.5) * amp * 0.45
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.lineWidth = bodyW * 0.35
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  for (let i = 2; i < segs - 2; i += 3) {
    const t = i / segs
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 5) * amp * (1 - t * 0.3)
    const y = a.y + (b.y - a.y) * t + Math.cos(t * Math.PI * 3.5) * amp * 0.45
    ctx.beginPath()
    ctx.arc(x, y, bodyW * 0.38, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.lineWidth = bodyW * 0.3
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 5) * amp * (1 - t * 0.3) - bodyW * 0.2
    const y = a.y + (b.y - a.y) * t + Math.cos(t * Math.PI * 3.5) * amp * 0.45 - bodyW * 0.2
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(a.x, a.y, bodyW * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const eyeOff = bodyW * 0.28
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(a.x - eyeOff, a.y - eyeOff * 0.5, bodyW * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(a.x + eyeOff, a.y - eyeOff * 0.5, bodyW * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(a.x - eyeOff + 1, a.y - eyeOff * 0.5 + 1, bodyW * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(a.x + eyeOff + 1, a.y - eyeOff * 0.5 + 1, bodyW * 0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(b.x, b.y, bodyW * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

function drawLadder(ctx, from, to, CS) {
  const a = cellToXY(from, CS)
  const b = cellToXY(to, CS)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const halfW = CS * 0.09
  const nx = (-dy / len) * halfW
  const ny = (dx / len) * halfW

  ctx.save()
  ctx.translate(2, 3)
  ctx.globalAlpha = 0.2
  ctx.strokeStyle = '#000'
  ctx.lineWidth = halfW * 1.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(a.x - nx, a.y - ny)
  ctx.lineTo(b.x - nx, b.y - ny)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(a.x + nx, a.y + ny)
  ctx.lineTo(b.x + nx, b.y + ny)
  ctx.stroke()
  ctx.restore()

  const railColor = '#8B5E3C'
  const railHighlight = '#C49A6C'
  ctx.lineCap = 'round'
  ctx.setLineDash([])

  ctx.beginPath()
  ctx.moveTo(a.x - nx, a.y - ny)
  ctx.lineTo(b.x - nx, b.y - ny)
  ctx.strokeStyle = railColor
  ctx.lineWidth = halfW * 2.2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(a.x - nx - halfW * 0.3, a.y - ny - halfW * 0.3)
  ctx.lineTo(b.x - nx - halfW * 0.3, b.y - ny - halfW * 0.3)
  ctx.strokeStyle = railHighlight
  ctx.lineWidth = halfW * 0.7
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(a.x + nx, a.y + ny)
  ctx.lineTo(b.x + nx, b.y + ny)
  ctx.strokeStyle = railColor
  ctx.lineWidth = halfW * 2.2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(a.x + nx - halfW * 0.3, a.y + ny - halfW * 0.3)
  ctx.lineTo(b.x + nx - halfW * 0.3, b.y + ny - halfW * 0.3)
  ctx.strokeStyle = railHighlight
  ctx.lineWidth = halfW * 0.7
  ctx.stroke()

  const steps = Math.max(3, Math.round(len / (CS * 0.38)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const rx = a.x + dx * t
    const ry = a.y + dy * t
    ctx.beginPath()
    ctx.moveTo(rx - nx * 1.4 + 1, ry - ny * 1.4 + 2)
    ctx.lineTo(rx + nx * 1.4 + 1, ry + ny * 1.4 + 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = halfW * 1.5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(rx - nx * 1.35, ry - ny * 1.35)
    ctx.lineTo(rx + nx * 1.35, ry + ny * 1.35)
    ctx.strokeStyle = '#6B4226'
    ctx.lineWidth = halfW * 1.8
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(rx - nx * 1.2 - halfW * 0.2, ry - ny * 1.2 - halfW * 0.2)
    ctx.lineTo(rx + nx * 1.2 - halfW * 0.2, ry + ny * 1.2 - halfW * 0.2)
    ctx.strokeStyle = '#A07850'
    ctx.lineWidth = halfW * 0.5
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(b.x, b.y, CS * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(250,163,7,0.4)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(b.x, b.y, CS * 0.07, 0, Math.PI * 2)
  ctx.fillStyle = '#faa307'
  ctx.fill()
}

function drawPieceAt(ctx, px, py, p, isActive, r, bounce) {
  const drawY = py - Math.abs(Math.sin(bounce * Math.PI)) * r * 0.6

  ctx.beginPath()
  ctx.ellipse(px + 2, drawY + r * 0.6 + 3, r * 0.9, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(px, drawY, r, 0, Math.PI * 2)
  ctx.fillStyle = p.color
  ctx.fill()

  ctx.beginPath()
  ctx.arc(px - r * 0.28, drawY - r * 0.28, r * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fill()

  if (isActive) {
    ctx.beginPath()
    ctx.arc(px, drawY, r + 3, 0, Math.PI * 2)
    ctx.strokeStyle = '#faa307'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.beginPath()
    ctx.arc(px, drawY, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.font = `${Math.round(r * 0.9)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.emoji, px, drawY + 1)
}

function drawPlayers(ctx, players, currentIdx, CS, climbAnim, snakeAnim) {
  const n = players.length
  const offsets =
    n === 2 ? [[-0.18, -0.18], [0.18, 0.18]] :
    n === 3 ? [[-0.18, -0.18], [0.18, -0.18], [0, 0.2]] :
              [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]

  players.forEach((p, i) => {
    if (p.pos < 1) return
    const r = CS * 0.21
    const ox = offsets[i][0] * CS
    const oy = offsets[i][1] * CS

    if (climbAnim && climbAnim.playerIdx === i) {
      const { fromCell, toCell, progress } = climbAnim
      const aXY = cellToXY(fromCell, CS)
      const bXY = cellToXY(toCell, CS)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      const px = aXY.x + (bXY.x - aXY.x) * eased + ox
      const py = aXY.y + (bXY.y - aXY.y) * eased + oy
      drawPieceAt(ctx, px, py, p, i === currentIdx, r, progress * 8)

    } else if (snakeAnim && snakeAnim.playerIdx === i) {
      const { fromCell, toCell, progress } = snakeAnim
      const pt = snakePathPoint(fromCell, toCell, progress, CS)
      const wobble = Math.sin(progress * Math.PI * 6) * r * 0.4
      drawPieceAt(ctx, pt.x + ox + wobble, pt.y + oy, p, i === currentIdx, r, 0)

    } else {
      const { x, y } = cellToXY(p.pos, CS)
      drawPieceAt(ctx, x + ox, y + oy, p, i === currentIdx, r, 0)
    }
  })
}

export default function Board({ players, currentIdx, climbAnim, snakeAnim, map }) {
  const canvasRef = useRef(null)
  const activeSnakes  = map?.snakes  || SNAKES
  const activeLadders = map?.ladders || LADDERS
  const activePalette = map?.theme   || TILE_PALETTES

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const size = canvas.offsetWidth
    if (!size) return
    canvas.width = size
    canvas.height = size
    const CS = size / 10
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    drawBoard(ctx, CS, activePalette)
    Object.entries(activeLadders).forEach(([f, t]) => drawLadder(ctx, +f, +t, CS))
    let si = 0
    Object.entries(activeSnakes).forEach(([f, t]) => {
      drawThickSnake(ctx, +f, +t, SNAKE_COLORS[si % SNAKE_COLORS.length], CS)
      si++
    })
    drawPlayers(ctx, players, currentIdx, CS, climbAnim, snakeAnim)
  }, [players, currentIdx, climbAnim, snakeAnim, activeSnakes, activeLadders, activePalette])

  // Always keep drawRef pointing to the latest draw function
  const drawRef = useRef(draw)
  useEffect(() => { drawRef.current = draw }, [draw])

  // Redraw every time players, positions, or animations change
  useEffect(() => { draw() }, [draw])

  // ResizeObserver: set up once, always calls latest draw via ref
  useEffect(() => {
    const ro = new ResizeObserver(() => drawRef.current())
    if (canvasRef.current) ro.observe(canvasRef.current.parentElement)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} />
}