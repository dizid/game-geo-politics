// ─── Turn Modifiers ───────────────────────────────────────────────────────────
// Random per-turn conditions that change the rules for one turn.

export interface TurnModifier {
  id: string
  name: string
  description: string
  icon: string
  effects: {
    apCostMultiplier?: Record<string, number> // action ID → multiplier
    actionBlocked?: string[]                  // action IDs unavailable this turn
    tensionMultiplier?: number                // multiplier for tension changes
    statMultiplier?: number                   // multiplier for stat change deltas
    apRecoveryBonus?: number                  // extra AP recovered this turn
    relationshipMultiplier?: number           // multiplier for relationship changes
  }
}

export const TURN_MODIFIERS: TurnModifier[] = [
  {
    id: 'arms_race',
    name: 'ARMS RACE',
    description: 'Military actions cheaper, diplomacy costs more',
    icon: '🚀',
    effects: {
      apCostMultiplier: { military: 0.6, shadowWar: 0.7, diplomacy: 1.5, alliance: 1.5 },
    },
  },
  {
    id: 'global_recession',
    name: 'GLOBAL RECESSION',
    description: 'Economic gains halved, sanctions hit harder',
    icon: '📉',
    effects: {
      statMultiplier: 0.5, // general stat changes reduced
      apCostMultiplier: { sanctions: 0.7, economicWarfare: 0.7 },
    },
  },
  {
    id: 'media_frenzy',
    name: 'MEDIA FRENZY',
    description: 'Info War and propaganda effects doubled',
    icon: '📺',
    effects: {
      apCostMultiplier: { propaganda: 0.5 },
      statMultiplier: 1.5,
    },
  },
  {
    id: 'diplomatic_window',
    name: 'DIPLOMATIC WINDOW',
    description: 'Diplomacy and alliance actions cost 0 AP',
    icon: '🕊️',
    effects: {
      apCostMultiplier: { diplomacy: 0, alliance: 0, strategicPartnership: 0.5 },
    },
  },
  {
    id: 'intel_blackout',
    name: 'INTEL BLACKOUT',
    description: 'All intelligence operations unavailable',
    icon: '🔇',
    effects: {
      actionBlocked: ['intel', 'shadowWar'],
    },
  },
  {
    id: 'summit_season',
    name: 'SUMMIT SEASON',
    description: 'All relationship changes amplified +50%',
    icon: '🏛️',
    effects: {
      relationshipMultiplier: 1.5,
    },
  },
  {
    id: 'calm_before_storm',
    name: 'CALM BEFORE STORM',
    description: 'No random events, but tension rises automatically',
    icon: '⏳',
    effects: {
      tensionMultiplier: 0, // no tension from actions
    },
  },
  {
    id: 'resource_boom',
    name: 'RESOURCE BOOM',
    description: 'Trade deals give +50% ECO bonus',
    icon: '💰',
    effects: {
      apCostMultiplier: { trade: 0.7, aid: 0.5 },
      statMultiplier: 1.5,
    },
  },
  {
    id: 'power_vacuum',
    name: 'POWER VACUUM',
    description: 'All actions cost less AP, but tension rises faster',
    icon: '⚡',
    effects: {
      apCostMultiplier: {
        sanctions: 0.7, military: 0.7, diplomacy: 0.7, alliance: 0.7,
        trade: 0.7, aid: 0.7, intel: 0.7, propaganda: 0.7,
      },
      tensionMultiplier: 2.0,
    },
  },
  {
    id: 'election_cycle',
    name: 'ELECTION CYCLE',
    description: 'Domestic pressure — military actions blocked',
    icon: '🗳️',
    effects: {
      actionBlocked: ['military'],
      apCostMultiplier: { diplomacy: 0.5, trade: 0.5 },
    },
  },
  {
    id: 'tech_race',
    name: 'TECH RACE',
    description: 'Intel and Info War actions boosted',
    icon: '🔬',
    effects: {
      apCostMultiplier: { intel: 0.5, propaganda: 0.5 },
    },
  },
  {
    id: 'humanitarian_crisis',
    name: 'HUMANITARIAN CRISIS',
    description: 'Foreign aid costs nothing, sanctions blocked',
    icon: '🏥',
    effects: {
      apCostMultiplier: { aid: 0 },
      actionBlocked: ['sanctions', 'economicWarfare'],
    },
  },
]

/** Roll for a turn modifier. Returns null if no modifier fires this turn. */
export function rollTurnModifier(turn: number): TurnModifier | null {
  // No modifiers in first 2 turns (tutorial)
  if (turn <= 2) return null

  // 40% chance of a modifier
  if (Math.random() > 0.4) return null

  // Weighted random selection — all equal weight for now
  const idx = Math.floor(Math.random() * TURN_MODIFIERS.length)
  return TURN_MODIFIERS[idx]
}
