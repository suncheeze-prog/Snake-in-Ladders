import { useRef, useState, useCallback, useEffect } from 'react'
import Board from './Board'
import Dice3D from './Dice3D'
import { SNAKES, LADDERS } from '../constants'
import { SPEED_LEVELS } from './Settings'
import { useT } from '../i18n'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Web Audio ────────────────────────────────────────────────────────────────
function getACtx() {
  if (!window._ac) window._ac = new (window.AudioContext || window.webkitAudioContext)()
  return window._ac
}
function tone({ freq=440,type='sine',vol=0.18,dur=0.12,decay=0.1,delay=0 }={}) {
  try {
    const ctx=getACtx(),t=ctx.currentTime+delay
    const osc=ctx.createOscillator(),gain=ctx.createGain()
    osc.connect(gain);gain.connect(ctx.destination)
    osc.type=type;osc.frequency.setValueAtTime(freq,t)
    gain.gain.setValueAtTime(vol,t)
    gain.gain.exponentialRampToValueAtTime(0.0001,t+dur+decay)
    osc.start(t);osc.stop(t+dur+decay)
  } catch(_){}
}
function noise({ vol=0.15,dur=0.06,delay=0 }={}) {
  try {
    const ctx=getACtx(),t=ctx.currentTime+delay
    const buf=ctx.createBuffer(1,ctx.sampleRate*(dur+0.04),ctx.sampleRate)
    const data=buf.getChannelData(0)
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)
    const src=ctx.createBufferSource(),gain=ctx.createGain()
    src.buffer=buf;src.connect(gain);gain.connect(ctx.destination)
    gain.gain.setValueAtTime(vol,t)
    gain.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.03)
    src.start(t);src.stop(t+dur+0.05)
  } catch(_){}
}
const sfx = {
  rollClick:  () => { tone({freq:300,type:'triangle',vol:0.25,dur:0.04,decay:0.05}); noise({vol:0.12,dur:0.03}) },
  diceRolling:() => {
    const p=[0,0.08,0.15,0.21,0.26,0.30,0.33,0.355,0.375,0.39,0.40]
    p.forEach(d=>{ noise({vol:0.13,dur:0.04,delay:d}); tone({freq:160+Math.random()*90,type:'triangle',vol:0.09,dur:0.03,decay:0.02,delay:d}) })
    tone({freq:130,type:'triangle',vol:0.28,dur:0.07,decay:0.14,delay:0.42})
    noise({vol:0.2,dur:0.06,delay:0.42})
  },
  step:  (i) => { tone({freq:i%2===0?500:440,type:'triangle',vol:0.09,dur:0.022,decay:0.035}); noise({vol:0.055,dur:0.018}) },
  snakeBite: () => {
    tone({freq:80,type:'sawtooth',vol:0.35,dur:0.06,decay:0.08}); noise({vol:0.28,dur:0.07})
    tone({freq:140,type:'sawtooth',vol:0.22,dur:0.10,decay:0.06,delay:0.04})
    noise({vol:0.18,dur:0.55,delay:0.12})
    tone({freq:320,type:'sawtooth',vol:0.18,dur:0.20,decay:0.15,delay:0.15})
    tone({freq:240,type:'sawtooth',vol:0.16,dur:0.20,decay:0.12,delay:0.32})
    tone({freq:170,type:'sawtooth',vol:0.14,dur:0.22,decay:0.14,delay:0.50})
    tone({freq:110,type:'sawtooth',vol:0.12,dur:0.25,decay:0.18,delay:0.68})
    tone({freq:70,type:'triangle',vol:0.22,dur:0.12,decay:0.20,delay:0.90})
    noise({vol:0.14,dur:0.08,delay:0.90})
  },
  ladder: () => [330,392,494,587,698].forEach((f,i)=>tone({freq:f,type:'sine',vol:0.17,dur:0.1,decay:0.15,delay:i*0.1})),
  win: () => {
    tone({freq:523,type:'sine',vol:0.20,dur:0.25,decay:0.3})
    tone({freq:659,type:'sine',vol:0.18,dur:0.25,decay:0.3,delay:0.10})
    tone({freq:784,type:'sine',vol:0.18,dur:0.25,decay:0.3,delay:0.20})
    tone({freq:1047,type:'sine',vol:0.22,dur:0.40,decay:0.50,delay:0.35})
  },
  toofar: () => { tone({freq:220,type:'sawtooth',vol:0.18,dur:0.09,decay:0.05}); tone({freq:185,type:'sawtooth',vol:0.15,dur:0.09,decay:0.05,delay:0.10}) },
}

// ─── Bot AI ───────────────────────────────────────────────────────────────────
// Bot "thinks" for a moment then returns a dice value
// difficulty affects thinking time and whether it "cheats" slightly
function botRoll(difficulty) {
  // Easy: random, Normal: random, Hard: biased toward useful rolls
  return Math.floor(Math.random() * 6) + 1
}
function botThinkTime(difficulty) {
  return { easy: 600, normal: 1000, hard: 1400 }[difficulty] || 1000
}

// ─── Ladder climb hook ────────────────────────────────────────────────────────
function useLadderClimb() {
  const [climbAnim, setClimbAnim] = useState(null)
  const rafRef = useRef(null)
  const animateClimb = useCallback((playerIdx, fromCell, toCell, durationMs=900) => {
    return new Promise(resolve => {
      const start = performance.now()
      function frame(now) {
        const elapsed = now - start
        const progress = Math.min(elapsed / durationMs, 1)
        setClimbAnim({ playerIdx, fromCell, toCell, progress })
        if (progress < 1) { rafRef.current = requestAnimationFrame(frame) }
        else { setClimbAnim(null); resolve() }
      }
      rafRef.current = requestAnimationFrame(frame)
    })
  }, [])
  return { climbAnim, animateClimb }
}

// ─── Snake slide hook ─────────────────────────────────────────────────────────
function snakeEase(t) { return 1 - Math.pow(1 - t, 2.8) }
function useSnakeSlide() {
  const [snakeAnim, setSnakeAnim] = useState(null)
  const rafRef = useRef(null)
  const animateSnake = useCallback((playerIdx, fromCell, toCell, durationMs=1400) => {
    return new Promise(resolve => {
      const start = performance.now()
      function frame(now) {
        const raw = Math.min((now - start) / durationMs, 1)
        const progress = snakeEase(raw)
        setSnakeAnim({ playerIdx, fromCell, toCell, progress })
        if (raw < 1) { rafRef.current = requestAnimationFrame(frame) }
        else { setSnakeAnim(null); resolve() }
      }
      rafRef.current = requestAnimationFrame(frame)
    })
  }, [])
  return { snakeAnim, animateSnake }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameScreen({ players: initPlayers, settings, map, botConfig, onMenu, lang }) {
  const t = useT(lang)
  const activeSnakes  = map?.snakes  || SNAKES
  const activeLadders = map?.ladders || LADDERS

  const [players, setPlayers]   = useState(() => initPlayers.map(p => ({ ...p, pos: 0 })))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rolling, setRolling]   = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner]     = useState(null)
  const [toast, setToast]       = useState(null)
  const [botThinking, setBotThinking] = useState(false)
  const [log, setLog] = useState([`${t.gameStarted} ${initPlayers[0].emoji} ${initPlayers[0].name} ${t.goesFirst}`])
  const stepCountRef = useRef(0)

  const diceRef = useRef(null)
  const { climbAnim, animateClimb } = useLadderClimb()
  const { snakeAnim, animateSnake } = useSnakeSlide()

  const addLog = useCallback((msg) => setLog(prev => [msg, ...prev].slice(0, 30)), [])
  const showToast = useCallback((msg, type='info') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2600)
  }, [])

  const animateMove = useCallback(async (playerIdx, from, to, playersList) => {
    if (!settings.anim) {
      const updated = playersList.map((p,i) => i===playerIdx ? {...p, pos:to} : p)
      setPlayers(updated); return updated
    }
    const speedLevel = SPEED_LEVELS[settings.speed ?? 2]
    const delay = speedLevel.moveDelay
    let updated = [...playersList]
    for (let cur = from + 1; cur <= to; cur++) {
      sfx.step(stepCountRef.current++)
      updated = updated.map((p,i) => i===playerIdx ? {...p, pos:cur} : p)
      setPlayers([...updated])
      await sleep(delay)
    }
    return updated
  }, [settings])

  // Core turn logic — shared between human and bot
  const executeTurn = useCallback(async (val, currentPlayers, idx) => {
    const p = currentPlayers[idx]
    const from = p.pos
    let np = from + val

    if (np > 100) {
      np = from
      sfx.toofar()
      addLog(`${p.emoji} ${p.name} ${t.rolled} ${val} — ${t.tooFar} ${from}`)
      showToast(t.tooFarToast, 'warn')
    } else {
      addLog(`${p.emoji} ${p.name} ${t.rolled} ${val} → ${np}`)
    }

    let updated = await animateMove(idx, from, np, currentPlayers)
    const speedLevel = SPEED_LEVELS[settings.speed ?? 2]

    if (activeSnakes[np] !== undefined) {
      const s = activeSnakes[np]
      await sleep(180); sfx.snakeBite()
      addLog(`🐍 ${p.name} ${t.bitten} ${np} → ${s}`)
      showToast(`🐍 ${t.bittenToast} ${s}…`, 'danger')
      updated = updated.map((pl,i) => i===idx ? {...pl, pos:s} : pl)
      await animateSnake(idx, np, s, speedLevel.climbDuration * 1.4)
      setPlayers([...updated])

    } else if (activeLadders[np] !== undefined) {
      const l = activeLadders[np]
      await sleep(150); sfx.ladder()
      addLog(`🪜 ${p.name} ${t.ladder} ${np} → ${l}`)
      showToast(`🪜 ${t.ladderToast} ${l}!`, 'success')
      updated = updated.map((pl,i) => i===idx ? {...pl, pos:l} : pl)
      await animateClimb(idx, np, l, speedLevel.climbDuration)
      setPlayers([...updated])
    }

    return updated
  }, [animateMove, animateSnake, animateClimb, activeSnakes, activeLadders, addLog, showToast, settings, t])

  const doRoll = useCallback(async () => {
    if (rolling || gameOver) return
    setRolling(true)
    sfx.rollClick(); await sleep(60); sfx.diceRolling()

    const val = Math.floor(Math.random() * 6) + 1
    await new Promise(resolve => diceRef.current?.roll(val, resolve))

    const updated = await executeTurn(val, players, currentIdx)

    const finalPos = updated[currentIdx].pos
    if (finalPos === 100) {
      await sleep(200); sfx.win()
      setGameOver(true); setWinner(updated[currentIdx])
      setRolling(false); return
    }

    const next = (currentIdx + 1) % players.length
    setCurrentIdx(next); setPlayers(updated); setRolling(false)
  }, [rolling, gameOver, players, currentIdx, executeTurn])

  // Auto-trigger bot turn
  useEffect(() => {
    const currentPlayer = players[currentIdx]
    if (!currentPlayer?.isBot || rolling || gameOver) return

    let cancelled = false
    const diff = botConfig?.difficulty || 'normal'
    const thinkTime = botThinkTime(diff)

    setBotThinking(true)
    addLog(`${t.botThinking}`)

    const timer = setTimeout(async () => {
      if (cancelled) return
      setBotThinking(false)
      setRolling(true)
      sfx.rollClick(); await sleep(40); sfx.diceRolling()

      const val = botRoll(diff)
      await new Promise(resolve => diceRef.current?.roll(val, resolve))

      const updated = await executeTurn(val, players, currentIdx)

      const finalPos = updated[currentIdx].pos
      if (finalPos === 100) {
        await sleep(200); sfx.win()
        setGameOver(true); setWinner(updated[currentIdx])
        setRolling(false); return
      }

      const next = (currentIdx + 1) % players.length
      setCurrentIdx(next); setPlayers(updated); setRolling(false)
    }, thinkTime)

    return () => { cancelled = true; clearTimeout(timer); setBotThinking(false) }
  }, [currentIdx, players, rolling, gameOver, botConfig, executeTurn, addLog, t])

  function restart() {
    setPlayers(initPlayers.map(p => ({ ...p, pos: 0 })))
    setCurrentIdx(0); setRolling(false); setGameOver(false)
    setWinner(null); setToast(null); setBotThinking(false)
    stepCountRef.current = 0
    setLog([`${t.newGame} ${initPlayers[0].emoji} ${initPlayers[0].name} ${t.goesFirst}`])
  }

  const current = players[currentIdx]
  const isMyTurn = current?.isHuman || !botConfig

  return (
    <div className="screen active game-screen">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="game-topbar">
        <span className="game-logo">🐍 {t.gameTitle} 🪜</span>
        <button className="back-btn" onClick={onMenu}>{t.menu}</button>
      </div>

      <div className="players-strip">
        {players.map((p, i) => (
          <div key={i} className={`pchip ${i===currentIdx?'active':''}`}
            style={{ borderColor: i===currentIdx ? p.color : 'transparent' }}>
            <span className="pdot" style={{ background: p.color }} />
            <span className="pchip-name">{p.emoji} {p.name}</span>
            {p.isBot && <span style={{ fontSize:'9px', color:'var(--text2)', marginLeft:'2px' }}>BOT</span>}
            <span className="ppos"> #{p.pos}</span>
          </div>
        ))}
      </div>

      <div className="board-perspective">
        <div className="board-3d-wrap">
          <div className="board-canvas-wrap">
            <Board players={players} currentIdx={currentIdx}
              climbAnim={climbAnim} snakeAnim={snakeAnim} map={map} />
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <div className="info-box">
          <div className="info-turn" style={{ color: current.color }}>
            {current.emoji} {current.name}{t.yourTurn}
            {botThinking && <span style={{ fontSize:'11px', color:'var(--text2)', marginLeft:'6px' }}>🤖</span>}
          </div>
          <div className="info-pos">
            {t.square} {current.pos===0 ? t.start : current.pos} / 100
          </div>
        </div>

        <div className="dice-area">
          <Dice3D ref={diceRef} />
          <button className="roll-btn" onClick={doRoll}
            disabled={rolling || gameOver || botThinking || !isMyTurn}>
            {rolling || botThinking ? t.rolling : t.rollBtn}
          </button>
        </div>

        <div className="log-box">
          {log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)}
        </div>
      </div>

      {gameOver && winner && (
        <div className="win-overlay">
          <div className="win-box">
            <div className="win-emoji">{winner.emoji}</div>
            <div className="win-title" style={{ color: winner.color }}>
              {winner.name} {t.wins}
            </div>
            <div className="win-msg">{t.reached100}</div>
            <div className="win-actions">
              <button className="win-again" onClick={restart}>{t.playAgain}</button>
              <button className="win-menu" onClick={onMenu}>{t.mainMenu}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}