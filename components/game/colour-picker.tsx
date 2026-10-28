'use client'

import { useState, useEffect } from 'react'
import { Crown, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const RAINBOW_COLOURS = [
  '#FF3B3B','#FF7A00','#FFCC00','#A8E63D','#3BDE4A',
  '#00D4B4','#00AAFF','#3D6CFF','#8844FF','#D93BFF',
  '#FF3BA8','#FF8FA0','#FFEA80','#80FFD4','#C0C8FF',
]
export const DARK_COLOURS = [
  '#4a1a1a','#1A1A4a','#0D2B0D','#2B1A00',
  '#1A002B','#001A2B','#2B2B10','#2a2a2a',
]
export const PRESTIGE_COLOURS = [
  { color: '#CC1111', label: 'CRIMSON', requiredMatches: 1 },
  { color: '#7B00CC', label: 'SHADOW PURPLE', requiredMatches: 2 },
  { color: '#111111', label: 'OBSIDIAN', requiredMatches: 3 },
]
export const MP_MATCHES_KEY = 'cog_mp_matches'
const SELECTED_COLOUR_KEY = 'cog_player_colour'

export function getStoredColour() {
  if (typeof window === 'undefined') return RAINBOW_COLOURS[6]
  return localStorage.getItem(SELECTED_COLOUR_KEY) ?? RAINBOW_COLOURS[6]
}

export function getMpMatches() {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(MP_MATCHES_KEY) ?? '0', 10)
}

export function incrementMpMatches() {
  const current = getMpMatches()
  localStorage.setItem(MP_MATCHES_KEY, String(current + 1))
}

interface ColourPickerScreenProps {
  onConfirm: (colour: string) => void
}

export function ColourPickerScreen({ onConfirm }: ColourPickerScreenProps) {
  const [selected, setSelected] = useState(RAINBOW_COLOURS[6])
  const [mpMatches, setMpMatches] = useState(0)

  useEffect(() => {
    const stored = getStoredColour()
    setSelected(stored)
    setMpMatches(getMpMatches())
  }, [])

  function pick(col: string) {
    setSelected(col)
    localStorage.setItem(SELECTED_COLOUR_KEY, col)
  }

  function handleConfirm() {
    onConfirm(selected)
  }

  return (
    <div className="colour-picker-screen">
      <div className="colour-picker-inner">
        <div className="colour-picker-header">
          <Crown size={32} color="#e9c97e" />
          <h1>CROWN OR GRAVE</h1>
          <p>Choose your colour before the match</p>
        </div>

        {/* Preview ball */}
        <div className="colour-preview">
          <div className="preview-ball" style={{ background: selected, boxShadow: `0 0 30px ${selected}80, 0 0 8px ${selected}` }} />
          <span>Your ball</span>
        </div>

        <div className="colour-section">
          <h2>RAINBOW</h2>
          <div className="colour-grid">
            {RAINBOW_COLOURS.map(col => (
              <button
                key={col}
                className={cn('colour-swatch', selected === col && 'selected')}
                style={{ background: col }}
                onClick={() => pick(col)}
                aria-label={`Select colour ${col}`}
              />
            ))}
          </div>
        </div>

        <div className="colour-section">
          <h2>DARK</h2>
          <div className="colour-grid">
            {DARK_COLOURS.map(col => (
              <button
                key={col}
                className={cn('colour-swatch', selected === col && 'selected')}
                style={{ background: col }}
                onClick={() => pick(col)}
                aria-label={`Select colour ${col}`}
              />
            ))}
          </div>
        </div>

        <div className="colour-section">
          <h2>PRESTIGE <span className="prestige-hint">— Play multiplayer to unlock</span></h2>
          <div className="colour-grid">
            {PRESTIGE_COLOURS.map(({ color, label, requiredMatches }) => {
              const unlocked = mpMatches >= requiredMatches
              return (
                <div key={color} className="prestige-wrap" title={unlocked ? label : `Play ${requiredMatches} multiplayer match${requiredMatches > 1 ? 'es' : ''} to unlock`}>
                  <button
                    className={cn('colour-swatch', selected === color && 'selected', !unlocked && 'locked')}
                    style={{ background: color }}
                    onClick={() => unlocked && pick(color)}
                    disabled={!unlocked}
                    aria-label={unlocked ? label : `${label} — locked`}
                  >
                    {!unlocked && <Lock size={13} color="#ffffff80" />}
                  </button>
                  <span className="prestige-label">{unlocked ? label : `${requiredMatches} match${requiredMatches > 1 ? 'es' : ''}`}</span>
                </div>
              )
            })}
          </div>
          <p className="mp-counter">Multiplayer matches played: <strong>{mpMatches}</strong> / 3</p>
        </div>

        <Button className="enter-button w-full" size="lg" onClick={handleConfirm}>
          Enter the grove →
        </Button>
      </div>
    </div>
  )
}
