'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Crown, Egg, Flame, Heart, LogOut, Radio, RotateCcw, Shield, Skull, Sparkles, Swords, Trophy, Users, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { abilities } from '@/lib/game/abilities'
import { PracticeEngine } from '@/lib/game/engine'
import { renderArena } from '@/lib/game/renderer'
import { GameSound } from '@/lib/game/sound'
import { distance, emptyInput, WORLD_CX, WORLD_CY, type ArenaState, type GameInput, type GameSession, type RoomSnapshot } from '@/lib/game/types'
import { pickRandomMap, type MapTheme } from '@/lib/game/maps'
import { cn } from '@/lib/utils'

export function GameArena({ session, server, sound, playerColour, onExit, onReplay }: {
  session: GameSession; server: string; sound: boolean; playerColour: string;
  onExit: () => void; onReplay: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef<ArenaState | null>(null)
  const input = useRef<GameInput>(emptyInput())
  const soundEngine = useRef<GameSound | null>(null)
  const touchMode = useRef(false)
  const mouseDown = useRef(false)
  const tRef = useRef(0)
  const mapTheme = useRef<MapTheme>(pickRandomMap())
  const [hud, setHud] = useState<ArenaState | null>(session.mode === 'online' ? session.snapshot.state : null)
  const [exitOpen, setExitOpen] = useState(false)
  const [disconnected, setDisconnected] = useState('')
  const [copied, setCopied] = useState(false)
  const you = session.mode === 'online' ? session.snapshot.you : 'you'
  const code = session.mode === 'online' ? session.snapshot.code : ''

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const ctx = element.getContext('2d')
    if (!ctx) return
    const engine = session.mode === 'practice' ? new PracticeEngine(session.mode === 'practice' ? session.name : 'Wanderer') : null
    state.current = engine ? engine.state : session.mode === 'online' ? session.snapshot.state : null
    setDisconnected(''); input.current = emptyInput()
    const audio = new GameSound(); soundEngine.current = audio
    const keys = new Set<string>()
    let frame = 0, previousTime = 0, lastHud = 0, lastSend = 0, w = 750, h = 525, oldHp = 100, wasHatched = false, oldCooldown = 0, oldShot = 0
    const resize = () => {
      const rect = element.getBoundingClientRect(); w = rect.width; h = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = w * dpr; element.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize); observer.observe(element); resize()
    const updateMovement = () => {
      input.current.dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      input.current.dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
    }
    const controlledKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','q',' ','j','r']
    const keyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || document.querySelector('[data-slot="dialog-content"]')) return
      const key = event.key.toLowerCase()
      if (!controlledKeys.includes(key)) return
      event.preventDefault(); audio.unlock(); keys.add(key); updateMovement()
      if (key === 'e') input.current.hatch = true
      if (key === ' ' || key === 'q') input.current.ability = true
      if (key === 'j') input.current.attack = true
      if (key === 'r') input.current.cycle = true
    }
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); keys.delete(key); updateMovement()
      if (key === 'e') input.current.hatch = false
      if (key === ' ' || key === 'q') input.current.ability = false
      if (key === 'j') input.current.attack = false
      if (key === 'r') input.current.cycle = false
    }
    const clear = () => { keys.clear(); input.current = emptyInput(); mouseDown.current = false }
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear)
    window.addEventListener('pointerup', () => { mouseDown.current = false; if (!touchMode.current) input.current.attack = false })
    const receive = (event: MessageEvent) => {
      try { const msg = JSON.parse(event.data); if (msg.type === 'state') state.current = (msg as RoomSnapshot).state; else if (msg.type === 'error') toast.error(msg.message) } catch { setDisconnected('The server sent an invalid game update.') }
    }
    const lost = () => setDisconnected('Connection lost. Return to the lobby to reconnect.')
    if (session.mode === 'online') { session.socket.addEventListener('message', receive); session.socket.addEventListener('close', lost); session.socket.addEventListener('error', lost) }
    const tick = (now: number) => {
      const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : .016; previousTime = now
      tRef.current += dt
      const s = state.current
      if (s) {
        const player = s.players.find(p => p.id === you)
        if (touchMode.current && player) {
          // Touch: always auto-aim at nearest visible enemy
          const target = s.players.filter(p => p.id !== you && p.alive && p.visible && (p.invisibleUntil <= s.time || (player.revealUntil > s.time && distance(player, p) < 200))).sort((a, b) => distance(player, a) - distance(player, b))[0]
          if (target) { input.current.aimX = target.x; input.current.aimY = target.y }
        } else if (!touchMode.current && player && mouseDown.current) {
          // PC left-click: auto-aim at nearest visible enemy and fire
          const nearest = s.players.filter(p => p.id !== you && p.alive && p.visible && p.invisibleUntil <= s.time).sort((a, b) => distance(player, a) - distance(player, b))[0]
          if (nearest) { input.current.aimX = nearest.x; input.current.aimY = nearest.y; input.current.attack = true }
        }
        if (engine) engine.update(dt, input.current)
        else if (session.mode === 'online' && now - lastSend >= 50 && session.socket.readyState === WebSocket.OPEN && session.socket.bufferedAmount < 8192) { session.socket.send(JSON.stringify({ type: 'input', ...input.current })); lastSend = now }
        renderArena(ctx, s, you, w, h, { x: input.current.aimX, y: input.current.aimY }, mapTheme.current, tRef.current, playerColour)
        if (player && sound) {
          if (player.hatched && !wasHatched) audio.play('hatch')
          if (player.cooldown > oldCooldown + 1) audio.play('ability')
          if (player.shotCooldown > oldShot + .1) audio.play('shoot')
          if (player.hp < oldHp - 3) audio.play('hit')
          wasHatched = player.hatched; oldCooldown = player.cooldown; oldHp = player.hp; oldShot = player.shotCooldown
        }
        if (now - lastHud > 100) { setHud({ ...s, players: s.players.map(p => ({ ...p })) }); lastHud = now }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); audio.dispose()
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear)
      if (session.mode === 'online') { session.socket.removeEventListener('message', receive); session.socket.removeEventListener('close', lost); session.socket.removeEventListener('error', lost) }
    }
  }, [session, you, sound, playerColour])

  const me = hud?.players.find(p => p.id === you)
  const currentAbility = me?.hatched ? abilities[me.ability === 4 && me.selectedCopy >= 0 ? me.copies[me.selectedCopy] ?? me.ability : me.ability] : null
  const alive = hud?.players.filter(p => p.alive).length ?? 5
  const winner = hud?.players.find(p => p.id === hud.winner)

  function onCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') { touchMode.current = true; return }
    touchMode.current = false
    // Only update manual aim when mouse button is NOT held (when held, we auto-aim in tick)
    if (!mouseDown.current) {
      const r = event.currentTarget.getBoundingClientRect()
      const scale = Math.min(r.width / 750, r.height / 525)
      input.current.aimX = (event.clientX - r.left - (r.width - 750 * scale) / 2) / scale
      input.current.aimY = (event.clientY - r.top - (r.height - 525 * scale) / 2) / scale
    }
  }

  function onCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') { touchMode.current = true; return }
    touchMode.current = false
    soundEngine.current?.unlock()
    mouseDown.current = true
    // Auto-aim fires immediately on click — handled in tick loop
    event.currentTarget.focus()
  }

  // D-pad direction buttons
  function dpadDown(event: React.PointerEvent, dx: number, dy: number) {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId)
    touchMode.current = true; soundEngine.current?.unlock()
    input.current.dx = dx; input.current.dy = dy
  }
  function dpadUp(event: React.PointerEvent, dx: number, dy: number) {
    if (input.current.dx === dx) input.current.dx = 0
    if (input.current.dy === dy) input.current.dy = 0
  }

  function touchAction(event: React.PointerEvent, key: 'ability' | 'hatch' | 'attack' | 'cycle') {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId)
    touchMode.current = true; soundEngine.current?.unlock()
    Object.assign(input.current, { [key]: true })
  }

  async function copyInvite() {
    const url = new URL(window.location.href); url.search = ''; url.searchParams.set('room', code); url.searchParams.set('server', server)
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); toast.success('Invite link copied.'); setTimeout(() => setCopied(false), 2500) } catch { toast.error('Clipboard access is blocked.') }
  }

  return <main className="arena-screen">
    <header className="arena-header">
      <button className="brand" onClick={() => { input.current = emptyInput(); setExitOpen(true) }}>
        <span className="brand-mark"><Crown /></span>CROWN OR GRAVE
      </button>
      <div className="arena-location">
        <span className="live-dot" />
        {mapTheme.current.name}
        <span>{session.mode === 'practice' ? 'SOLO PRACTICE · 4 COMPUTERS' : `PRIVATE ROOM · ${code}`}</span>
      </div>
      <Button variant="outline" onClick={() => { input.current = emptyInput(); setExitOpen(true) }}><LogOut data-icon="inline-start" />Leave</Button>
    </header>
    <div className="arena-layout">
      <section className="arena-play-area" aria-label="Survival game">
        <div className="arena-top-stats">
          <span><Users size={16} /><strong>{alive}</strong> / 5 alive</span>
          <span><Radio size={13} />{hud && hud.time > 25 ? 'The circle is closing' : 'Find your egg. Awaken your power.'}</span>
          <time>{String(Math.floor((hud?.time ?? 0) / 60)).padStart(2, '0')}:{String(Math.floor((hud?.time ?? 0) % 60)).padStart(2, '0')}</time>
        </div>
        <div className="canvas-wrap">
          <canvas ref={canvas} tabIndex={0}
            aria-label="Game arena. WASD to move, E to hatch, left click to auto-fire, Space for ability."
            onPointerMove={onCanvasPointerMove}
            onPointerDown={onCanvasPointerDown}
            onContextMenu={e => e.preventDefault()}
          />
          {hud?.status === 'playing' && hud.time < 3 && <div className="countdown-overlay"><span>THE GROVE IS WAKING</span><strong>{Math.ceil(3 - hud.time)}</strong><p>Five enter. One remains.</p></div>}
          {hud?.status === 'waiting' && <div className="arena-overlay"><div className="waiting-card"><Egg size={40} /><span className="eyebrow">YOUR ARENA IS READY</span><h1>Gather your rivals.</h1><p>You need 4 more people to start. The match begins when all five players arrive.</p><div className="waiting-slots">{Array.from({ length: 5 }, (_, i) => <div key={i} className={cn(hud.players[i] && 'occupied')}><Users size={20} /><span>{hud.players[i]?.name ?? 'Waiting…'}</span></div>)}</div><div className="room-code"><span>ROOM CODE</span><strong>{code}</strong></div><Button onClick={copyInvite}>{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? 'Link copied' : 'Copy invite link'}</Button><p className="muted-footnote">{hud.players.length} of 5 players connected.</p></div></div>}
          {hud?.status === 'finished' && <div className="arena-overlay"><div className="result-card"><Trophy size={46} /><span className="eyebrow">{hud.winner === you ? 'THE CROWN IS YOURS' : 'ONLY THE GRAVE AWAITS'}</span><h1>{hud.winner === you ? 'YOU WIN THE CROWN.' : winner ? `${winner.name.toUpperCase()} CLAIMS THE CROWN.` : 'THE GROVE WINS.'}</h1><p>{hud.winner === you ? 'Five entered. You remained.' : 'A different egg. A different story.'}</p><div className="result-stats"><span><strong>{me?.kills ?? 0}</strong>Eliminations</span><span><strong>{Math.floor(hud.time)}s</strong>Match duration</span><span><strong>{me?.hatched ? abilities[me.ability]?.name ?? 'Unknown' : 'Unawakened'}</strong>Your power</span></div><div className="result-actions">{session.mode === 'practice' && <Button size="lg" onClick={onReplay}><RotateCcw data-icon="inline-start" />Play again</Button>}<Button variant="outline" size="lg" onClick={onExit}>Back to lobby<ArrowRight data-icon="inline-end" /></Button></div></div></div>}
          {disconnected && <div className="arena-overlay"><div className="result-card"><WifiOff size={38} /><h1>CONNECTION LOST</h1><p>{disconnected}</p><Button onClick={onExit}>Return to lobby</Button></div></div>}
        </div>
        <div className="arena-bottom-hud">
          <div className="player-health">
            <div><Heart size={15} /><strong>{me?.name ?? 'Wanderer'}</strong><span>{Math.ceil(me?.hp ?? 100)} / 100</span></div>
            <div className="health-track" role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.ceil(me?.hp ?? 100)}><div style={{ width: `${me?.hp ?? 100}%` }} /></div>
          </div>
          <div className="equipped-ability">
            {currentAbility ? <currentAbility.icon size={26} /> : <Egg size={26} />}
            <div><small>{me?.hatched ? 'YOUR ABILITY' : 'YOUR POWER IS WAITING'}</small><strong>{currentAbility?.name ?? 'Hatch your egg'}</strong></div>
            <button className="ability-key"
              onPointerDown={e => touchAction(e, me?.hatched ? 'ability' : 'hatch')}
              onPointerUp={() => { input.current.ability = false; input.current.hatch = false }}
              onPointerCancel={() => { input.current.ability = false; input.current.hatch = false }}
              disabled={!!me?.hatched && (me.cooldown > 0 || !me.alive)}
              aria-label={me?.hatched ? 'Activate ability' : 'Hatch egg'}>
              {me?.hatched ? me.cooldown > 0 ? `${Math.ceil(me.cooldown)}s` : 'SPACE' : 'E'}
            </button>
          </div>
        </div>

        {/* Mobile controls: circular D-pad left, action buttons right */}
        <div className="touch-controls">
          <div className="dpad-ring">
            {/* Up */}
            <button className="dpad-btn dpad-up" aria-label="Move up"
              onPointerDown={e => dpadDown(e, 0, -1)} onPointerUp={e => dpadUp(e, 0, -1)} onPointerCancel={e => dpadUp(e, 0, -1)}>
              ▲
            </button>
            {/* Left */}
            <button className="dpad-btn dpad-left" aria-label="Move left"
              onPointerDown={e => dpadDown(e, -1, 0)} onPointerUp={e => dpadUp(e, -1, 0)} onPointerCancel={e => dpadUp(e, -1, 0)}>
              ◄
            </button>
            <div className="dpad-center" />
            {/* Right */}
            <button className="dpad-btn dpad-right" aria-label="Move right"
              onPointerDown={e => dpadDown(e, 1, 0)} onPointerUp={e => dpadUp(e, 1, 0)} onPointerCancel={e => dpadUp(e, 1, 0)}>
              ►
            </button>
            {/* Down */}
            <button className="dpad-btn dpad-down" aria-label="Move down"
              onPointerDown={e => dpadDown(e, 0, 1)} onPointerUp={e => dpadUp(e, 0, 1)} onPointerCancel={e => dpadUp(e, 0, 1)}>
              ▼
            </button>
          </div>
          <div className="touch-actions">
            <button aria-label="Use ability / hatch"
              onPointerDown={e => touchAction(e, me?.hatched ? 'ability' : 'hatch')}
              onPointerUp={() => { input.current.ability = false; input.current.hatch = false }}
              onPointerCancel={() => { input.current.ability = false; input.current.hatch = false }}>
              <Sparkles size={15} />
            </button>
            <button className="touch-fire" aria-label="Fire"
              onPointerDown={e => touchAction(e, 'attack')}
              onPointerUp={() => { input.current.attack = false }}
              onPointerCancel={() => { input.current.attack = false }}>
              🎯 FIRE
            </button>
          </div>
        </div>

        <div className="arena-controls-hint">
          <span><kbd>W A S D</kbd> Move</span>
          <span><kbd>CLICK</kbd> Auto-fire nearest</span>
          <span><kbd>E</kbd> Hatch</span>
          <span><kbd>SPACE</kbd> Ability</span>
        </div>
      </section>

      <aside className="match-sidebar">
        <div className="match-roster-heading"><Swords size={17} /><h2>The contenders</h2><span>{alive}/5</span></div>
        <div className="match-roster">
          {hud?.players.map((p, i) => (
            <div key={p.id} className={cn('roster-player', !p.alive && 'eliminated')}>
              <div className={`roster-avatar player-${i}`}>{p.alive ? p.id === you ? <Flame size={15} /> : <Shield size={15} /> : <Skull size={15} />}</div>
              <div><strong>{p.name}{p.id === you && <span>YOU</span>}</strong><small>{!p.alive ? 'Eliminated' : p.bot ? '🧠 Computer' : 'Contender'}</small></div>
              <span className={cn('roster-status', p.alive && 'alive')} />
            </div>
          ))}
        </div>
        <div className="match-power-info">
          <Sparkles size={19} />
          <h3>{currentAbility?.name ?? 'A power of your own.'}</h3>
          <p>{currentAbility?.description ?? 'A mysterious egg is waiting at your spawn. Move close and press E to reveal what is inside.'}</p>
          {currentAbility?.passive && <div className="power-passive"><span>PASSIVE</span>{currentAbility.passive}</div>}
          {me?.hatched && me.ability === 7 && <p className="revive-counter">{3 - me.revives} revives remaining</p>}
          {me?.hatched && me.ability === 4 && <p className="revive-counter">{me.copies.length} powers stored · Press R to switch</p>}
        </div>
        <div className="match-feed">
          <h3>FROM THE GROVE</h3>
          {hud?.events.map((event, i) => <p key={`${event}-${i}`}><span />{event}</p>)}
        </div>
        {me && !me.alive && hud?.status !== 'finished' && <div className="spectating-note"><Skull size={24} /><strong>You have been eliminated.</strong><p>Watch the remaining contenders fight for the crown.</p></div>}
        <div className="match-mode-label">
          <span className="live-dot" />
          {session.mode === 'practice' ? 'LOCAL PRACTICE · NOT ONLINE' : 'LIVE C# MULTIPLAYER'}
        </div>
      </aside>
    </div>
    <Dialog open={exitOpen} onOpenChange={setExitOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave the grove?</DialogTitle>
          <DialogDescription>{session.mode === 'online' ? 'Leaving removes you from this match.' : 'Your current practice match will end.'}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setExitOpen(false)}>Keep playing</Button>
          <Button onClick={onExit}>Leave match</Button>
        </div>
      </DialogContent>
    </Dialog>
  </main>
}
