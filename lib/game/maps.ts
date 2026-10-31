export type MapTheme = {
  id: number
  name: string
  bg: string
  floor: string
  t1: string
  t2: string
  wTop: string
  wSide: string
  wShad: string
  acc: string
  fog: string
  det: 'forest' | 'ice' | 'lava' | 'stone' | 'void'
}

export const MAP_THEMES: MapTheme[] = [
  { id: 0, name: 'THE FORGOTTEN GROVE', bg: '#0d1511', floor: '#1c2b20', t1: '#253225', t2: '#202e22', wTop: '#4a5c3a', wSide: '#2a3520', wShad: '#0a0f08', acc: '#6f8c52', fog: '#07110b', det: 'forest' },
  { id: 1, name: 'THE FROZEN TUNDRA',   bg: '#080d14', floor: '#0d1825', t1: '#142035', t2: '#111c2e', wTop: '#9bbfdd', wSide: '#3a6080', wShad: '#050b12', acc: '#4a9aba', fog: '#050e1a', det: 'ice' },
  { id: 2, name: 'VOLCANIC DEPTHS',     bg: '#120700', floor: '#2a0f00', t1: '#3a1500', t2: '#310d00', wTop: '#c04a10', wSide: '#5c1c00', wShad: '#0a0200', acc: '#e06020', fog: '#120500', det: 'lava' },
  { id: 3, name: 'THE ANCIENT TEMPLE',  bg: '#0e0c08', floor: '#1e1a0f', t1: '#2a2415', t2: '#251f12', wTop: '#c9a84c', wSide: '#6a5820', wShad: '#080600', acc: '#d4a84c', fog: '#0e0a04', det: 'stone' },
  { id: 4, name: 'THE SHADOW REALM',    bg: '#05000e', floor: '#0d0020', t1: '#130028', t2: '#0f001e', wTop: '#7c40c8', wSide: '#2c0058', wShad: '#020005', acc: '#9050e0', fog: '#04000c', det: 'void' },
]

export function pickRandomMap(previousMapId?: number): MapTheme {
  const choices = MAP_THEMES.filter(map => map.id !== previousMapId)
  return choices[Math.floor(Math.random() * choices.length)]
}
