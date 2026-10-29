'use client'

import { useState, useEffect, useRef } from 'react'
import { Crown, Lock } from 'lucide-react'
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
  { color: '#CC1111', label: 'Crimson',       requiredMatches: 1 },
  { color: '#7B00CC', label: 'Shadow Purple', requiredMatches: 2 },
  { color: '#111111', label: 'Obsidian',      requiredMatches: 3 },
]
export const MP_MATCHES_KEY = 'cog_mp_matches'
const SELECTED_COLOUR_KEY   = 'cog_player_colour'

export function getStoredColour() {
  if (typeof window === 'undefined') return RAINBOW_COLOURS[6]
  return localStorage.getItem(SELECTED_COLOUR_KEY) ?? RAINBOW_COLOURS[6]
}
export function getMpMatches() {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(MP_MATCHES_KEY) ?? '0', 10)
}
export function incrementMpMatches() {
  localStorage.setItem(MP_MATCHES_KEY, String(getMpMatches() + 1))
}

export function InlineColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [mpMatches, setMpMatches] = useState(0)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMpMatches(getMpMatches()) }, [])

  function pick(col: string) {
    onChange(col)
    localStorage.setItem(SELECTED_COLOUR_KEY, col)
  }

  function showTooltip(msg: string) {
    if (tooltipRef.current) clearTimeout(tooltipRef.current)
    setTooltip(msg)
    tooltipRef.current = setTimeout(() => setTooltip(null), 3000)
  }

  return (
    <div className="inline-colour-picker">
      <div className="icp-header">
        <div className="icp-preview" style={{ background: value, boxShadow: `0 0 10px ${value}60` }} />
        <span className="icp-label">YOUR BALL COLOUR</span>
      </div>

      <div className="icp-section">
        <span className="icp-section-label">RAINBOW</span>
        <div className="icp-grid">
          {RAINBOW_COLOURS.map(col => (
            <button key={col} onClick={() => pick(col)}
              className={cn('icp-swatch', value === col && 'icp-selected')}
              style={{ background: col }} aria-label={col} />
          ))}
        </div>
      </div>

      <div className="icp-section">
        <span className="icp-section-label">DARK</span>
        <div className="icp-grid">
          {DARK_COLOURS.map(col => (
            <button key={col} onClick={() => pick(col)}
              className={cn('icp-swatch', value === col && 'icp-selected')}
              style={{ background: col }} aria-label={col} />
          ))}
        </div>
      </div>

      <div className="icp-section">
        <span className="icp-section-label">PRESTIGE</span>
        <div className="icp-grid icp-prestige-row">
          {PRESTIGE_COLOURS.map(({ color, label, requiredMatches }) => {
            const unlocked = mpMatches >= requiredMatches
            return (
              <div key={color} className="icp-prestige-wrap">
                <button
                  className={cn('icp-swatch', value === color && 'icp-selected', !unlocked && 'icp-locked')}
                  style={{ background: color }}
                  onClick={() => unlocked ? pick(color) : showTooltip(`Play ${requiredMatches} multiplayer match${requiredMatches > 1 ? 'es' : ''} to unlock ${label}`)}
                  aria-label={unlocked ? label : `${label} — locked`}
                >
                  {!unlocked && <Lock size={11} color="#ffffff90" />}
                </button>
                {!unlocked && (
                  <button className="icp-question" onClick={() => showTooltip(`Play ${requiredMatches} multiplayer match${requiredMatches > 1 ? 'es' : ''} to unlock ${label}`)} aria-label="How to unlock">?</button>
                )}
              </div>
            )
          })}
        </div>
        {tooltip && <div className="icp-tooltip">{tooltip}</div>}
        <p className="icp-mp-note">Multiplayer matches: <strong>{mpMatches}</strong> / 3</p>
      </div>
    </div>
  )
}
