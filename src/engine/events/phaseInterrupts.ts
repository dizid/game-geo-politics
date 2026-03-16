// ─── Phase Interrupts ─────────────────────────────────────────────────────────
// Lightweight events that fire BETWEEN actions within a single turn.
// Unlike crises, these are quick decision moments or info flashes.

import type { Faction, FactionStats } from '../../types/game'

export type InterruptType = 'opportunity' | 'setback' | 'intel_flash' | 'faction_move' | 'market_shift'

export interface PhaseInterrupt {
  type: InterruptType
  headline: string
  description: string
  icon: string
  effects: Partial<FactionStats>
  affectedFactionId?: string
  choice?: {
    accept: { label: string; apCost: number; effects: Partial<FactionStats>; tensionDelta: number }
    decline: { label: string; effects: Partial<FactionStats>; tensionDelta: number }
  }
}

// ─── Interrupt Templates ──────────────────────────────────────────────────────

interface InterruptTemplate {
  type: InterruptType
  weight: number
  minTurn: number
  generate: (factions: Faction[], playerFactionId: string) => PhaseInterrupt
}

function randomOther(factions: Faction[], playerId: string): Faction {
  const others = factions.filter(f => f.id !== playerId)
  return others[Math.floor(Math.random() * others.length)]
}

const INTERRUPT_TEMPLATES: InterruptTemplate[] = [
  {
    type: 'opportunity',
    weight: 20,
    minTurn: 2,
    generate: (factions, playerId) => {
      const target = randomOther(factions, playerId)
      return {
        type: 'opportunity',
        headline: 'DEFECTOR INTELLIGENCE',
        description: `A senior official from ${target.name} is offering classified intelligence. This is a rare opportunity.`,
        icon: '🕵️',
        effects: {},
        affectedFactionId: target.id,
        choice: {
          accept: { label: 'ACQUIRE INTEL [8 AP]', apCost: 8, effects: { inf: 5 }, tensionDelta: 1 },
          decline: { label: 'DECLINE', effects: {}, tensionDelta: 0 },
        },
      }
    },
  },
  {
    type: 'opportunity',
    weight: 15,
    minTurn: 4,
    generate: (factions, playerId) => {
      const target = randomOther(factions, playerId)
      return {
        type: 'opportunity',
        headline: 'BACK-CHANNEL OFFER',
        description: `${target.name} is proposing a secret bilateral trade agreement outside normal diplomatic channels.`,
        icon: '🤝',
        effects: {},
        affectedFactionId: target.id,
        choice: {
          accept: { label: 'ACCEPT DEAL [6 AP]', apCost: 6, effects: { eco: 4 }, tensionDelta: -1 },
          decline: { label: 'REFUSE', effects: { dip: -2 }, tensionDelta: 0 },
        },
      }
    },
  },
  {
    type: 'setback',
    weight: 18,
    minTurn: 3,
    generate: (_factions, _playerId) => ({
      type: 'setback',
      headline: 'MARKET VOLATILITY',
      description: 'International markets react negatively to recent geopolitical developments. Your economy takes a hit.',
      icon: '📉',
      effects: { eco: -3 },
    }),
  },
  {
    type: 'setback',
    weight: 12,
    minTurn: 5,
    generate: (_factions, _playerId) => ({
      type: 'setback',
      headline: 'INTELLIGENCE LEAK',
      description: 'Classified documents have been leaked to the press. Your influence credibility is damaged.',
      icon: '📋',
      effects: { inf: -4 },
    }),
  },
  {
    type: 'intel_flash',
    weight: 25,
    minTurn: 2,
    generate: (factions, playerId) => {
      const target = randomOther(factions, playerId)
      const actions = ['mobilizing forces near its border', 'expanding its intelligence network', 'conducting secret trade negotiations', 'building military infrastructure']
      const action = actions[Math.floor(Math.random() * actions.length)]
      return {
        type: 'intel_flash',
        headline: 'INTELLIGENCE FLASH',
        description: `Satellite imagery indicates ${target.name} is ${action}. Monitor closely.`,
        icon: '📡',
        effects: {},
        affectedFactionId: target.id,
      }
    },
  },
  {
    type: 'faction_move',
    weight: 20,
    minTurn: 3,
    generate: (factions, playerId) => {
      const actors = factions.filter(f => f.id !== playerId)
      const a = actors[Math.floor(Math.random() * actors.length)]
      const remaining = actors.filter(f => f.id !== a.id)
      const b = remaining[Math.floor(Math.random() * remaining.length)]
      return {
        type: 'faction_move',
        headline: 'DIPLOMATIC SHIFT',
        description: `${a.name} has signed a cooperation agreement with ${b.name}. The balance of power may be shifting.`,
        icon: '🔄',
        effects: {},
        affectedFactionId: a.id,
      }
    },
  },
  {
    type: 'market_shift',
    weight: 15,
    minTurn: 4,
    generate: (_factions, _playerId) => {
      const positive = Math.random() > 0.4
      return {
        type: 'market_shift',
        headline: positive ? 'COMMODITY SURGE' : 'SUPPLY CHAIN DISRUPTION',
        description: positive
          ? 'Global commodity prices surge. Resource-rich nations benefit.'
          : 'A major supply chain disruption affects global trade routes.',
        icon: positive ? '💰' : '🚫',
        effects: positive ? { eco: 3 } : { eco: -2 },
      }
    },
  },
  {
    type: 'opportunity',
    weight: 10,
    minTurn: 6,
    generate: (_factions, _playerId) => ({
      type: 'opportunity',
      headline: 'DIPLOMATIC SUMMIT INVITE',
      description: 'You have been invited to host a major international summit. This could boost your diplomatic standing.',
      icon: '🏛️',
      effects: {},
      choice: {
        accept: { label: 'HOST SUMMIT [10 AP]', apCost: 10, effects: { dip: 6, inf: 3 }, tensionDelta: -3 },
        decline: { label: 'DECLINE INVITATION', effects: { dip: -2 }, tensionDelta: 0 },
      },
    }),
  },
  {
    type: 'setback',
    weight: 10,
    minTurn: 7,
    generate: (_factions, _playerId) => ({
      type: 'setback',
      headline: 'CYBER ATTACK',
      description: 'A sophisticated cyber attack has targeted your critical infrastructure. Influence networks compromised.',
      icon: '💻',
      effects: { inf: -3, mil: -2 },
    }),
  },
]

// ─── Roll Logic ───────────────────────────────────────────────────────────────

/**
 * Roll for a phase interrupt between actions.
 * Probability increases with tension and number of actions taken this turn.
 */
export function rollPhaseInterrupt(
  tension: number,
  actionsThisTurn: number,
  turn: number,
  factions: Faction[],
  playerFactionId: string,
): PhaseInterrupt | null {
  // Base chance: 20% + 2% per tension point above 30 + 5% per extra action
  const baseChance = 0.20
  const tensionBonus = Math.max(0, (tension - 30) * 0.005)
  const actionBonus = Math.max(0, (actionsThisTurn - 1) * 0.08)
  const chance = Math.min(0.65, baseChance + tensionBonus + actionBonus)

  if (Math.random() > chance) return null

  // Filter eligible templates
  const eligible = INTERRUPT_TEMPLATES.filter(t => t.minTurn <= turn)
  if (eligible.length === 0) return null

  // Weighted selection
  const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0)
  let cursor = Math.random() * totalWeight

  const selected = eligible.find(t => {
    cursor -= t.weight
    return cursor <= 0
  })

  if (!selected) return null

  return selected.generate(factions, playerFactionId)
}
