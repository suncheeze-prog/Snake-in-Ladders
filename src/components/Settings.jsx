import { LANGUAGES, useT } from '../i18n'

// ─── Audio ────────────────────────────────────────────────────────────────────
function getACtx() {
  if (!window._ac) window._ac = new (window.AudioContext || window.webkitAudioContext)()
  return window._ac
}
function tone({ freq=440, type='sine', vol=0.18, dur=0.12, decay=0.1, delay=0 }={}) {
  try {
    const ctx = getACtx(), t = ctx.currentTime + delay
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = type; osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + decay)
    osc.start(t); osc.stop(t + dur + decay)
  } catch(_) {}
}
const sfx = {
  toggleOn:   () => tone({ freq: 540, type: 'sine',     vol: 0.18, dur: 0.08, decay: 0.10 }),
  toggleOff:  () => tone({ freq: 270, type: 'triangle', vol: 0.14, dur: 0.07, decay: 0.07 }),
  sliderTick: (s) => tone({ freq: [260,360,480,620][s]??480, type:'sine', vol:0.12, dur:0.03, decay:0.05 }),
  langPick:   () => { tone({ freq:440,dur:0.06 }); tone({ freq:660,dur:0.08,decay:0.12,delay:0.07 }) },
  back:       () => tone({ freq: 340, type: 'triangle', vol: 0.12, dur: 0.10, decay: 0.10 }),
}

export const SPEED_LEVELS = [
  { value:0, moveDelay:400, climbDuration:2200 },
  { value:1, moveDelay:220, climbDuration:1400 },
  { value:2, moveDelay:120, climbDuration:900  },
  { value:3, moveDelay:55,  climbDuration:450  },
]

export default function Settings({ settings, onChange, onBack }) {
  const t = useT(settings.lang || 'en')

  function toggle(key) {
    const next = !settings[key]
    next ? sfx.toggleOn() : sfx.toggleOff()
    onChange({ ...settings, [key]: next })
  }
  function setSpeed(val) {
    const n = Number(val); sfx.sliderTick(n)
    onChange({ ...settings, speed: n })
  }
  function setLang(code) {
    sfx.langPick()
    onChange({ ...settings, lang: code })
  }
  function handleBack() { sfx.back(); onBack() }

  const SPEED_LABELS = [t.superSlow, t.slow, t.medium, t.fast]
  const SPEED_EMOJIS = ['🐢','🚶','🚴','🚀']
  const curSpeed = settings.speed ?? 2

  const toggleRows = [
    { key:'anim',  label: t.animations, desc: t.animDesc  },
    { key:'hints', label: t.showHints,  desc: t.hintsDesc },
  ]

  return (
    <div className="screen active">
      <div className="sub-screen">
        <div className="screen-header">
          <button className="back-btn" onClick={handleBack}>{t.back}</button>
          <div className="screen-title">{t.settingsTitle}</div>
        </div>

        {/* ── Speed Slider ── */}
        <div className="setting-row" style={{ flexDirection:'column', alignItems:'stretch', gap:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="setting-info">
              <div className="setting-label">{t.gameSpeed}</div>
              <div className="setting-desc">{t.speedDesc}</div>
            </div>
            <div className="speed-badge">
              <span style={{ fontSize:'18px' }}>{SPEED_EMOJIS[curSpeed]}</span>
              <span style={{ fontSize:'12px', fontWeight:700, color:'var(--gold)' }}>{SPEED_LABELS[curSpeed]}</span>
            </div>
          </div>
          <div className="speed-slider-wrap">
            <input type="range" min="0" max="3" step="1" value={curSpeed}
              onChange={e => setSpeed(e.target.value)} className="speed-slider" />
            <div className="speed-labels">
              {SPEED_LABELS.map((lbl, i) => (
                <span key={i} className={`speed-tick ${curSpeed===i?'active':''}`}
                  onClick={() => setSpeed(i)}>{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Toggle rows ── */}
        {toggleRows.map(r => (
          <div key={r.key} className="setting-row">
            <div className="setting-info">
              <div className="setting-label">{r.label}</div>
              <div className="setting-desc">{r.desc}</div>
            </div>
            <button className={`toggle ${settings[r.key]?'on':'off'}`} onClick={() => toggle(r.key)}>
              <div className="toggle-knob" />
            </button>
          </div>
        ))}

        {/* ── Language picker ── */}
        <div className="setting-row" style={{ flexDirection:'column', alignItems:'stretch', gap:'10px' }}>
          <div className="setting-info">
            <div className="setting-label">{t.language}</div>
            <div className="setting-desc">{t.langDesc}</div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {LANGUAGES.map(lng => {
              const active = (settings.lang || 'en') === lng.code
              return (
                <button
                  key={lng.code}
                  onClick={() => setLang(lng.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '10px',
                    border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                    background: active ? 'rgba(250,163,7,0.12)' : 'var(--surface)',
                    color: active ? 'var(--gold)' : 'var(--text2)',
                    fontFamily: "'Nunito',sans-serif",
                    fontWeight: active ? 700 : 400,
                    fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize:'18px' }}>{lng.flag}</span>
                  {lng.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}