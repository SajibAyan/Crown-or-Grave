import { Crown, Egg, Footprints, MousePointer2, ShieldCheck, Swords, Trophy } from 'lucide-react'

export const gameSteps = [
  { icon: Footprints, title: 'Enter the unknown', text: 'Five players. Five different spawn points. A level playing field.' },
  { icon: Egg, title: 'Awaken your ability', text: 'Hatch your egg. Discover a unique power. Make it your own.' },
  { icon: Trophy, title: 'Be the last one standing', text: 'Outsmart your opponents. Survive the closing arena. Win. You need 4 more people to start.' },
]
export function GameSteps() {
  return <div className="game-steps">{gameSteps.map((step, index) => <div className="game-step" key={step.title}><div className="step-icon"><step.icon size={22} strokeWidth={1.5} /></div><div><span className="step-index">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div></div>)}</div>
}
export function GameGuide() {
  return <section className="guide-page">
    <div className="section-heading"><div><span className="eyebrow">A LITTLE KNOWLEDGE GOES A LONG WAY</span><h2>Fortune favors the prepared.</h2><p>Simple rules. Unexpected powers. No two matches the same.</p></div></div>
    <GameSteps />
    <div className="guide-columns">
      <section className="guide-panel">
        <MousePointer2 size={24} /><h3>Know your controls</h3>
        {[
          ['W A S D / ↑ ↓ ← →', 'Move through the arena'],
          ['Left Click (PC)', 'Auto-aim and fire at the nearest enemy'],
          ['E', 'Hatch your nearby egg'],
          ['Space / Q', 'Activate your ability'],
          ['R', 'Cycle copied powers'],
        ].map(([key, label]) => <div className="control-row" key={key}><span>{label}</span><kbd>{key}</kbd></div>)}
        <p className="muted-footnote">On mobile: use the D-pad to move and the action buttons to fire and use abilities. Attacks auto-aim at the nearest visible opponent.</p>
      </section>
      <section className="guide-panel">
        <ShieldCheck size={24} /><h3>The rules of survival</h3>
        <ul className="rules-list">
          <li><strong>Five is the limit.</strong> Online matches need all five players. You need 4 more people to start a multiplayer match. Practice fills the other four slots with computers.</li>
          <li><strong>Your egg is yours alone.</strong> Everyone starts in a different place. Press E near your egg to reveal one of 15 randomly assigned powers.</li>
          <li><strong>No duplicates.</strong> Starting abilities never repeat in the same match. Copycat can borrow active powers, but not passives.</li>
          <li><strong>Keep moving.</strong> After 25 seconds, the safe zone starts shrinking. Staying outside it steadily drains your health.</li>
          <li><strong>One survives.</strong> The last player alive wins the crown.</li>
        </ul>
      </section>
    </div>
    <div className="guide-panel" style={{ marginTop: '18px' }}>
      <Crown size={22} /><h3>Unlocking prestige colours</h3>
      <ul className="rules-list">
        <li><strong>Crimson</strong> — play <strong>1</strong> multiplayer match to unlock.</li>
        <li><strong>Shadow Purple</strong> — play <strong>2</strong> multiplayer matches to unlock.</li>
        <li><strong>Obsidian</strong> — play <strong>3</strong> multiplayer matches to unlock.</li>
        <li>Tap the <strong>?</strong> next to any locked colour to see how to unlock it.</li>
      </ul>
    </div>
    <div className="guide-tip"><Swords size={22} /><div><h3>A good power is only the beginning.</h3><p>Use the ruins as cover, save your ability for the right moment, and keep an eye on the edge of the arena.</p></div></div>
  </section>
}
