export const SNAKES  = { 17:7, 54:34, 62:19, 64:60, 87:24, 93:73, 95:75, 99:8, 56:53, 47:26 }
export const LADDERS = { 3:22, 8:30, 20:38, 28:76, 32:68, 40:59, 51:67, 63:81, 71:91, 80:99 }

// ── Maps ─────────────────────────────────────────────────────────────────────
export const MAPS = [
  {
    id: 0,
    name: 'Classic',
    emoji: '🏛️',
    desc: 'The original layout',
    theme: ['#1e3a5f','#3d1a4e','#1a4035','#4a2010','#1a2a4a'],
    snakes:  { 17:7, 54:34, 62:19, 64:60, 87:24, 93:73, 95:75, 99:8, 56:53, 47:26 },
    ladders: { 3:22, 8:30, 20:38, 28:76, 32:68, 40:59, 51:67, 63:81, 71:91, 80:99 },
  },
  {
    id: 1,
    name: 'Jungle',
    emoji: '🌴',
    desc: 'Longer snakes, fewer ladders',
    theme: ['#1a4035','#122b24','#0d3320','#1e4d1a','#163315'],
    snakes:  { 14:2, 35:8, 58:18, 67:22, 75:32, 84:41, 91:55, 96:68, 98:45, 49:12 },
    ladders: { 6:25, 19:60, 37:72, 53:88, 77:96 },
  },
  {
    id: 2,
    name: 'Blizzard',
    emoji: '❄️',
    desc: 'Short snakes, extra ladders',
    theme: ['#1a2a4a','#162040','#0f1a38','#1e2d5a','#131e47'],
    snakes:  { 21:3, 33:11, 44:26, 52:38, 71:63, 82:70, 88:74, 94:80, 97:85, 99:76 },
    ladders: { 4:18, 13:46, 29:50, 42:77, 55:91, 65:98, 73:92, 83:97 },
  },
  {
    id: 3,
    name: 'Chaos',
    emoji: '🔥',
    desc: 'Extreme snakes & ladders!',
    theme: ['#4a1a0a','#3d1205','#5a200a','#2d0a0a','#400f0f'],
    snakes:  { 16:4, 25:6, 46:22, 53:31, 61:19, 72:44, 85:57, 90:48, 95:13, 98:78 },
    ladders: { 2:38, 7:50, 12:60, 23:76, 36:85, 45:92, 58:97, 69:88, 79:96, 87:99 },
  },
]

export const PLAYER_COLORS = ['#e63946', '#2a9d8f', '#e9c46a', '#9b5de5']
export const PLAYER_DARK   = ['#9b0012', '#1a6b62', '#b07d00', '#5a1fa0']
export const PLAYER_EMOJIS = ['🔴', '🟢', '🟡', '🟣']
export const PLAYER_NAMES  = ['Player 1', 'Player 2', 'Player 3', 'Player 4']

export const DICE_ROTATIONS = [
  { rx: -25, ry: 30  },
  { rx: -25, ry: -90 },
  { rx: 90,  ry: 0   },
  { rx: -90, ry: 0   },
  { rx: -25, ry: 90  },
  { rx: -25, ry: 210 },
];