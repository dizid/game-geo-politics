import type { GameAction, CompoundAction, GameState, ActionPosture } from '../types/game'

// Posture definitions for UI grouping
export const POSTURE_CONFIG: Record<ActionPosture, { label: string; color: string; icon: string }> = {
  cooperate: { label: 'COOPERATE', color: '#4ade80', icon: '\u{1F91D}' },
  compete: { label: 'COMPETE', color: '#f59e0b', icon: '\u{1F3AF}' },
  confront: { label: 'CONFRONT', color: '#ef4444', icon: '\u2694\uFE0F' },
}

// Ordered posture list for rendering
export const POSTURE_ORDER: ActionPosture[] = ['cooperate', 'compete', 'confront']

export const ACTIONS: GameAction[] = [
  {
    id: 'diplomacy',
    label: 'Diplomacy',
    icon: '\u{1F91D}',
    desc: 'Formal negotiation',
    cost: 12,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'dip',
    posture: 'cooperate',
    unlockTurn: 1,
    effects: {
      targetStatChanges: { dip: 4 },
      selfStatChanges: { dip: 2 },
      tensionChange: -2,
      relationshipChange: 15,
    },
  },
  {
    id: 'trade',
    label: 'Trade Deal',
    icon: '\u{1F4B9}',
    desc: 'Beneficial trade offer',
    cost: 14,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'eco',
    posture: 'cooperate',
    unlockTurn: 1,
    effects: {
      targetStatChanges: { eco: 5 },
      selfStatChanges: { eco: 5 },
      tensionChange: -1,
      relationshipChange: 10,
    },
  },
  {
    id: 'aid',
    label: 'Foreign Aid',
    icon: '\u{1F3E5}',
    desc: 'Humanitarian support',
    cost: 10,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'inf',
    posture: 'cooperate',
    unlockTurn: 2,
    effects: {
      targetStatChanges: { eco: 6 },
      selfStatChanges: { inf: 2 },
      tensionChange: -3,
      relationshipChange: 10,
    },
  },
  {
    id: 'sanctions',
    label: 'Sanctions',
    icon: '\u26A0\uFE0F',
    desc: 'Economic pressure',
    cost: 18,
    cooldown: 2,
    cooldownType: 'target',
    relevantStat: 'eco',
    posture: 'compete',
    unlockTurn: 3,
    effects: {
      targetStatChanges: { eco: -8 },
      selfStatChanges: { eco: -2 },
      tensionChange: 2,
      relationshipChange: -20,
    },
  },
  {
    id: 'intel',
    label: 'Intel Op',
    icon: '\u{1F575}\uFE0F',
    desc: 'Covert operation',
    cost: 15,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'inf',
    posture: 'compete',
    unlockTurn: 3,
    effects: {
      targetStatChanges: {},
      selfStatChanges: { inf: 1 },
      tensionChange: 0,
      relationshipChange: -5,
    },
  },
  {
    id: 'propaganda',
    label: 'Info War',
    icon: '\u{1F4E1}',
    desc: 'Narrative control',
    cost: 14,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'inf',
    posture: 'compete',
    unlockTurn: 4,
    effects: {
      targetStatChanges: { inf: -6 },
      selfStatChanges: { inf: 2 },
      tensionChange: 1,
      relationshipChange: -10,
    },
  },
  {
    id: 'military',
    label: 'Military Posture',
    icon: '\u2694\uFE0F',
    desc: 'Show of force',
    cost: 22,
    cooldown: 1,
    cooldownType: 'global',
    relevantStat: 'mil',
    posture: 'confront',
    unlockTurn: 5,
    effects: {
      targetStatChanges: { mil: -5 },
      selfStatChanges: { mil: 3 },
      tensionChange: 3,
      relationshipChange: -15,
    },
  },
  {
    id: 'alliance',
    label: 'Form Alliance',
    icon: '\u{1F517}',
    desc: 'Propose coalition membership',
    cost: 28,
    cooldown: 0,
    cooldownType: 'none',
    relevantStat: 'dip',
    posture: 'confront',
    unlockTurn: 6,
    effects: {
      targetStatChanges: {},
      selfStatChanges: {},
      tensionChange: -4,
      relationshipChange: 20,
    },
  },
]

export const COMPOUND_ACTIONS: CompoundAction[] = [
  {
    id: 'economicWarfare',
    label: 'Economic Warfare',
    icon: '\u{1F4A3}',
    desc: 'Sanctions + Info War combined strike',
    cost: 26,
    components: ['sanctions', 'propaganda'],
    requirement: 'Intel used on target previously',
    requirementCheck: (state: GameState) => {
      // Requires intel to have been used on the selected target at some point
      const targetId = state.selectedTargetId
      if (!targetId) return false
      const intelTargets = state.actionsUsedOnFactions['intel']
      return intelTargets ? intelTargets.has(targetId) : false
    },
    effects: {
      targetStatChanges: { eco: -8, inf: -6, dip: -5 },
      selfStatChanges: { eco: -2 },
      tensionChange: 3,
      relationshipChange: -30,
    },
  },
  {
    id: 'strategicPartnership',
    label: 'Strategic Partnership',
    icon: '\u{1F91D}',
    desc: 'Diplomacy + Trade combined deal',
    cost: 20,
    components: ['diplomacy', 'trade'],
    requirement: 'Player DIP ≥ 60',
    requirementCheck: (state: GameState) => {
      // Requires player DIP >= 60
      const player = state.factions.find(f => f.id === state.playerFactionId)
      return player ? player.dip >= 60 : false
    },
    effects: {
      targetStatChanges: { eco: 6, dip: 4 },
      selfStatChanges: { eco: 6, dip: 4 },
      tensionChange: -3,
      relationshipChange: 25,
    },
  },
  {
    id: 'shadowWar',
    label: 'Shadow War',
    icon: '\u{1F5E1}\uFE0F',
    desc: 'Intel + Military covert strike',
    cost: 30,
    components: ['intel', 'military'],
    requirement: 'Player MIL ≥ 50, 20% exposure risk',
    requirementCheck: (state: GameState) => {
      // Requires player MIL >= 50
      const player = state.factions.find(f => f.id === state.playerFactionId)
      return player ? player.mil >= 50 : false
    },
    effects: {
      targetStatChanges: { mil: -12, inf: -6 },
      selfStatChanges: {},
      tensionChange: 1,
      relationshipChange: -25,
    },
  },
]

export function getActionById(id: string): GameAction | undefined {
  return ACTIONS.find(a => a.id === id)
}

export function getCompoundActionById(id: string): CompoundAction | undefined {
  return COMPOUND_ACTIONS.find(a => a.id === id)
}

// Get base actions grouped by posture
export function getActionsByPosture(posture: ActionPosture): GameAction[] {
  return ACTIONS.filter(a => a.posture === posture)
}

// Compound actions unlock turn (used by ActionPanel)
export const COMPOUND_UNLOCK_TURN = 6
