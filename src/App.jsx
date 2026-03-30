import { useState } from 'react'
import MainMenu from './components/MainMenu'
import ModeSelect from './components/ModeSelect'
import SelectPlayers from './components/SelectPlayers'
import Settings from './components/Settings'
import GameScreen from './components/GameScreen'
import { PLAYER_COLORS, PLAYER_EMOJIS, PLAYER_NAMES, MAPS } from './constants'

const DEFAULT_PLAYERS = [
  { name: PLAYER_NAMES[0], color: PLAYER_COLORS[0], emoji: PLAYER_EMOJIS[0], pos: 0 },
  { name: PLAYER_NAMES[1], color: PLAYER_COLORS[1], emoji: PLAYER_EMOJIS[1], pos: 0 },
]
const DEFAULT_SETTINGS = { anim: true, hints: true, speed: 2, lang: 'en' }

export default function App() {
  const [screen, setScreen]       = useState('menu')
  const [players, setPlayers]     = useState(DEFAULT_PLAYERS)
  const [settings, setSettings]   = useState(DEFAULT_SETTINGS)
  const [gameKey, setGameKey]     = useState(0)
  const [selectedMap, setSelectedMap] = useState(0)
  const [botConfig, setBotConfig] = useState(null)  // null = PvP, else { difficulty }

  const lang = settings.lang || 'en'

  function goGame(newPlayers, bot = null) {
    setPlayers(newPlayers)
    setBotConfig(bot)
    setGameKey(k => k + 1)
    setScreen('game')
  }

  // PvP: go to player select screen
  function handlePvP() { setScreen('select') }

  // PvB: build 1 human + 1 bot player, skip select screen
  function handlePvB(difficulty) {
    const humanNames = { en:'You', fil:'Ikaw', es:'Tú', ja:'あなた', ko:'나' }
    const humanName = humanNames[lang] || 'You'
    const botNames  = { en:'Bot 🤖', fil:'Bot 🤖', es:'Bot 🤖', ja:'ボット 🤖', ko:'봇 🤖' }
    const botName   = botNames[lang] || 'Bot 🤖'
    const ps = [
      { name: humanName, color: PLAYER_COLORS[0], emoji: PLAYER_EMOJIS[0], pos: 0, isHuman: true },
      { name: botName,   color: PLAYER_COLORS[1], emoji: '🤖',             pos: 0, isBot: true },
    ]
    goGame(ps, { difficulty })
  }

  function handleConfirmPlayers(newPlayers) {
    goGame(newPlayers.map(p => ({ ...p, isHuman: true })), null)
  }

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onStart={() => setScreen('mode')}
          onSelectPlayers={() => setScreen('mode')}
          onSettings={() => setScreen('settings')}
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
          lang={lang}
        />
      )}

      {screen === 'mode' && (
        <ModeSelect
          onBack={() => setScreen('menu')}
          onConfirmPvP={handlePvP}
          onConfirmPvB={handlePvB}
          lang={lang}
        />
      )}

      {screen === 'select' && (
        <SelectPlayers
          initialPlayers={players}
          onBack={() => setScreen('mode')}
          onConfirm={handleConfirmPlayers}
          lang={lang}
        />
      )}

      {screen === 'settings' && (
        <Settings
          settings={settings}
          onChange={setSettings}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          key={gameKey}
          players={players}
          settings={settings}
          map={MAPS[selectedMap]}
          botConfig={botConfig}
          onMenu={() => setScreen('menu')}
          lang={lang}
        />
      )}
    </>
  )
}