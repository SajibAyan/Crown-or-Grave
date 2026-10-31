// One distinctive computer per solo map; the other three keep normal AI.
// These profiles never change who a bot targets: the nearest opponent always wins.
export const SOLO_RIVALS = [
  { kind: 'dodger', name: 'Grove Strider', ability: 0, orbit: 145,
    hint: 'Zigzags into fights, circles its nearest opponent, and dodges incoming shots.' },
  { kind: 'phoenix', name: 'Frost Phoenix', ability: 7, orbit: 140,
    hint: 'Retreats to heal, pushes after reviving, and can rise three times.' },
  { kind: 'artillery', name: 'Ashcaller', ability: 15, orbit: 185,
    hint: 'Marks the ground with meteors, sidesteps, then advances during cooldowns.' },
  { kind: 'warden', name: 'Temple Warden', ability: 18, orbit: 110,
    hint: 'Saves Iron Skin for danger, then advances while armored.' },
  { kind: 'stalker', name: 'Veil Stalker', ability: 2, orbit: 145,
    hint: 'Flanks, turns invisible, and closes in for a short-range ambush.' },
] as const
