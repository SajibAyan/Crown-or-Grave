'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, CircleHelp, Crosshair, Crown, Egg, Gamepad2, Globe2, Headphones, Menu, Play, Plus, Settings2, Shield, Sparkles, Swords, Trophy, UserRound, Users, Volume2, VolumeX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AbilityCodex } from './ability-codex'
import { GameGuide, GameSteps } from './game-guide'
import { OnlineDialog } from './online-dialog'
import { InlineColourPicker, getStoredColour, incrementMpMatches } from './colour-picker'
import { cn } from '@/lib/utils'
import type { GameSession } from '@/lib/game/types'
import { pickRandomMap } from '@/lib/game/maps'

const GameArena = dynamic(() => import('./game-arena').then(m => m.GameArena), { ssr: false, loading: () => <div className="arena-loading"><Egg size={36} /><h2>Entering the grove…</h2></div> })
type Section = 'arena' | 'abilities' | 'guide'
const navItems = [
  { id: 'arena' as const, icon: Swords, label: 'The arena' },
  { id: 'abilities' as const, icon: Sparkles, label: 'Abilities', tag: '20' },
  { id: 'guide' as const, icon: BookOpen, label: 'How to play' },
]

export function GameShell() {
  const [section, setSection] = useState<Section>('arena')
  const [name, setName] = useState('Wanderer')
  const [sound, setSound] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onlineOpen, setOnlineOpen] = useState(false)
  const [server, setServer] = useState(() => process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? '')
  const [initialCode, setInitialCode] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [session, setSession] = useState<GameSession | null>(null)
  const [ready, setReady] = useState(false)
  const [playerColour, setPlayerColour] = useState('#00AAFF')

  useEffect(() => {
    setReady(true)
    setPlayerColour(getStoredColour())
    const savedName = localStorage.getItem('cor_player_name')
    if (savedName && savedName.trim()) setName(savedName.trim())
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    const endpoint = params.get('server')
    if (code && /^[A-Z0-9]{6}$/.test(code)) { setInitialCode(code); setOnlineOpen(true); if (endpoint) setServer(endpoint.slice(0, 300)) }
  }, [])

  function navigate(value: Section) { setSection(value); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }) }

  function startPractice() {
    setSession({ mode: 'practice', name: name.trim() || 'Wanderer', mapId: pickRandomMap().id })
  }
  function startOnline() {
    setOnlineOpen(true)
  }

  function handleOnlineConnected(s: GameSession) {
    if (s.mode === 'online') incrementMpMatches()
    setSession(s)
  }

  if (session) return <>
    <GameArena
      key={session.mode === 'practice' ? `practice-${session.mapId}` : `online-${session.snapshot.code}`}
      session={session} server={server} sound={sound} playerColour={playerColour}
      onExit={() => { if (session.mode === 'online') session.socket.close(); setSession(null) }}
      onReplay={() => setSession({ mode: 'practice', name: name.trim() || 'Wanderer', mapId: pickRandomMap(session.mode === 'practice' ? session.mapId : undefined).id })}
    />
    <Toaster theme="dark" />
  </>

  return <div className="game-shell" data-ready={ready}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="mobile-topbar">
      <button className="brand" onClick={() => navigate('arena')}><span className="brand-mark"><Crown /></span>CROWN OR GRAVE</button>
      <Button size="icon" variant="ghost" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</Button>
    </div>
    <aside className={cn('sidebar', mobileMenu && 'sidebar-open')}>
      <button className="brand desktop-brand" onClick={() => navigate('arena')} aria-label="Crown or Grave home">
        <span className="brand-mark"><Crown strokeWidth={1.8} /></span>
        <span className="brand-copy"><span className="brand-title"><span>CROWN</span><span className="brand-or">OR</span><span>GRAVE</span></span><small>SURVIVE THE UNKNOWN</small></span>
      </button>
      <div className="sidebar-nav">
        <span className="nav-label">THE PLAYGROUND</span>
        <nav aria-label="Main navigation">
          {navItems.map(item => (
            <button key={item.id} className={cn('nav-item', section === item.id && 'active')} onClick={() => navigate(item.id)} aria-current={section === item.id ? 'page' : undefined}>
              <item.icon size={18} strokeWidth={1.65} /><span>{item.label}</span>
              {item.tag && <span className="nav-count">{item.tag}</span>}
              {section === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-invite">
        <div className="invite-icon"><Users size={21} strokeWidth={1.5} /><span>+</span></div>
        <h3>Better with rivals.</h3>
        <p>Bring four friends.<br />Leave with bragging rights.</p>
        <button onClick={startOnline}>Create a private room <ArrowUpRight size={14} /></button>
      </div>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /><span>Settings</span></button>
        <button className="nav-item" onClick={() => navigate('guide')}><CircleHelp size={17} /><span>Help &amp; controls</span></button>
        <div className="profile-row">
          <div className="profile-avatar"><UserRound size={20} /></div>
          <div><strong>{name.trim() || 'Wanderer'}</strong><span>Ready for the unknown</span></div>
          <button aria-label="Edit player settings" onClick={() => setSettingsOpen(true)}><ChevronRight size={16} /></button>
        </div>
        <div className="sidebar-version"><span className="live-dot" /> ALPHA BUILD <span>v0.2.0</span></div>
      </div>
    </aside>

    <div className="main-wrap">
      <header className="topbar">
        <nav className="topbar-title" aria-label="Breadcrumb">
          <ol className="topbar-trail">
            <li>
              <button className="topbar-parent" onClick={() => navigate('arena')}>
                <Gamepad2 size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>Play</span>
              </button>
            </li>
            <li className="topbar-separator" aria-hidden="true">
              <ChevronRight size={14} strokeWidth={1.6} />
            </li>
            <li className="topbar-current" aria-current="page">
              {section === 'arena' ? 'The Arena' : section === 'abilities' ? 'Abilities' : 'How to play'}
            </li>
          </ol>
        </nav>
        <div className="topbar-right">
          <div className="topbar-tagline">
            <span className="topbar-chapter">The Awakening</span>
            <span className="topbar-motto">&ldquo;Five enters. King remains.&rdquo;</span>
          </div>
          <span className="practice-status"><span className="live-dot" /> Practice ready</span>
          <span className="topbar-divider" />
          <div className="colour-preview-dot" style={{ background: playerColour, boxShadow: `0 0 8px ${playerColour}90` }} title="Ball colour" />
          <Button variant="ghost" size="icon" aria-label={sound ? 'Mute' : 'Enable sound'} onClick={() => setSound(!sound)}>{sound ? <Volume2 /> : <VolumeX />}</Button>
          <span className="header-avatar">{(name.trim() || 'W')[0].toUpperCase()}</span>
        </div>
      </header>

      <main id="main-content" className="main-content">
        {section === 'arena' && <>
          <div className="page-heading">
            <div><span className="eyebrow">NO SECOND PLACE. ONLY SURVIVAL.</span><h1>The arena awaits.</h1></div>
            <Button variant="outline" onClick={() => navigate('guide')}><BookOpen data-icon="inline-start" />First time here?<ArrowUpRight data-icon="inline-end" /></Button>
          </div>
          <div className="lobby-grid">
            <section className="hero-panel" aria-label="Crown or Grave survival arena">
              <Image src="/images/lastlight-arena.png" fill priority sizes="(max-width: 900px) 100vw, 65vw" alt="A cracked egg glows with arcane power above an ancient stone altar" className="hero-image" />
              <div className="hero-shade" />
              <div className="hero-topline"><span><span className="tiny-diamond" /> THE AWAKENING</span><Badge variant="outline">ALPHA 02</Badge></div>
              <div className="hero-copy">
                <h2>FIVE ENTER.<br /><span>ONE REMAINS.</span></h2>
                <p>A mysterious egg. An unexpected power.<br />What you do next is up to you.</p>
                <div className="hero-facts">
                  <span><Users size={14} />5 players</span><i />
                  <span><Sparkles size={14} />20 abilities</span><i />
                  <span><Trophy size={14} />1 survivor</span>
                </div>
              </div>
              <div className="hero-bottom">
                <div><span className="map-dot" /><span>5 UNIQUE MAPS</span></div>
                <span>RANDOM EACH MATCH</span>
              </div>
            </section>

            <section className="play-panel">
              <div className="play-panel-heading">
                <div className="play-title"><Crosshair size={19} /><h2>Make your move.</h2></div>
                <p>Every legend starts somewhere.</p>
              </div>
              <Field><FieldLabel htmlFor="player-name">YOUR NAME</FieldLabel>
                <div className="name-input-wrap"><UserRound size={15} /><Input id="player-name" value={name} maxLength={18} onChange={e => { setName(e.target.value); localStorage.setItem('cor_player_name', e.target.value) }} placeholder="Enter your name" /></div>
              </Field>

              {/* Inline colour picker — always visible */}
              <InlineColourPicker value={playerColour} onChange={setPlayerColour} />

              <Tabs defaultValue="practice" className="play-tabs">
                <TabsList className="w-full">
                  <TabsTrigger value="practice"><Gamepad2 size={14} />Solo practice</TabsTrigger>
                  <TabsTrigger value="friends"><Users size={14} />With friends</TabsTrigger>
                </TabsList>
                <TabsContent value="practice">
                  <div className="mode-info">
                    <div className="mode-info-icon"><Swords size={23} strokeWidth={1.5} /></div>
                    <div><h3>You vs. computers</h3><p>Sharpen your instincts against 4 computer opponents.</p></div>
                  </div>
                  <div className="match-details">
                    <span>Mode<strong>Last player standing</strong></span>
                    <span>Players<strong>1 you + 4 computers</strong></span>
                    <span>Ability<strong>Random &amp; unique <Sparkles size={11} /></strong></span>
                  </div>
                  <Button className="enter-button w-full" size="lg" onClick={startPractice} disabled={!ready}>
                    <Play fill="currentColor" data-icon="inline-start" />Enter the grove<ArrowRight data-icon="inline-end" />
                  </Button>
                  <p className="play-note"><Shield size={11} /> No download. No account. Just play.</p>
                </TabsContent>
                <TabsContent value="friends">
                  <div className="mode-info">
                    <div className="mode-info-icon"><Globe2 size={23} strokeWidth={1.5} /></div>
                    <div><h3>Settle it in the grove</h3><p>A private arena for you and four rivals.</p></div>
                  </div>
                  <div className="match-details">
                    <span>Mode<strong>Online multiplayer</strong></span>
                    <span>Players<strong>5 friends — you need 4 more to start</strong></span>
                    <span>Connection<strong>C# game server</strong></span>
                  </div>
                  <Button className="enter-button w-full" size="lg" onClick={startOnline}>
                    <Plus data-icon="inline-start" />Create online room<ArrowRight data-icon="inline-end" />
                  </Button>
                  <p className="play-note"><Globe2 size={11} /> Requires a hosted game server.</p>
                </TabsContent>
              </Tabs>
              <div className="play-panel-footer">
                <span className="small-egg"><Egg size={17} /></span>
                <p>Your power is a surprise.<br /><strong>Your strategy doesn&apos;t have to be.</strong></p>
              </div>
            </section>
          </div>
          <GameSteps />
          <section className="abilities-preview">
            <div className="section-heading">
              <div>
                <div className="heading-with-badge"><h2>One egg. Endless possibilities.</h2><Badge variant="secondary">20 UNIQUE ABILITIES</Badge></div>
                <p>You don&apos;t choose your power. You choose what to do with it.</p>
              </div>
              <button className="text-link" onClick={() => navigate('abilities')}>Explore all abilities <ArrowRight size={15} /></button>
            </div>
            <AbilityCodex />
          </section>
          <div className="bottom-note"><Egg size={17} /><p>Same arena. Different powers. <span>A new story every match.</span></p><span>BUILT FOR THE LAST ONE STANDING</span></div>
        </>}
        {section === 'abilities' && <>
          <div className="page-heading">
            <div><span className="eyebrow">THE ABILITY CODEX</span><h1>Discover your edge.</h1><p>Twenty powers. Five eggs. No duplicates. Meet your next advantage.</p></div>
            <Badge variant="outline">BALANCE v0.3</Badge>
          </div>
          <div className="codex-notice"><Egg size={22} /><p>Your ability is randomly assigned when the match starts, and revealed when you hatch your egg.</p></div>
          <AbilityCodex full />
          <div className="codex-footer"><p>All current rules are shown in each power&apos;s details.</p><Button onClick={startPractice}><Play data-icon="inline-start" />Try your luck</Button></div>
        </>}
        {section === 'guide' && <GameGuide />}
        <footer className="page-footer"><span>CROWN OR GRAVE <i /> A little luck. A lot of survival.</span><span><Headphones size={13} /> Best experienced with headphones</span></footer>
      </main>
    </div>

    <OnlineDialog open={onlineOpen} onOpenChange={setOnlineOpen} name={name} server={server} setServer={setServer} initialCode={initialCode} onConnected={handleOnlineConnected} />
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Your setup</DialogTitle><DialogDescription>Make yourself at home before entering the unknown.</DialogDescription></DialogHeader>
        <Field><FieldLabel htmlFor="settings-name">Player name</FieldLabel><Input id="settings-name" maxLength={18} value={name} onChange={e => { setName(e.target.value); localStorage.setItem('cor_player_name', e.target.value) }} /></Field>
        <Field orientation="horizontal"><FieldLabel htmlFor="game-sound">Game sound effects</FieldLabel><Switch id="game-sound" checked={sound} onCheckedChange={setSound} /></Field>
        <p className="muted-footnote">Settings apply to this visit. No accounts or tracking are needed to play.</p>
        <Button onClick={() => setSettingsOpen(false)}>Back to the arena <ArrowRight data-icon="inline-end" /></Button>
      </DialogContent>
    </Dialog>
    <Toaster theme="dark" />
  </div>
}
