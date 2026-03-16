import type {
  Faction,
  ActionId,
  FactionRelationship,
  Coalition,
} from '../../types/game'
import { calculatePower } from '../balance/statCalculator'
import { getPreferredAction, isNearVictory } from './factionArchetypes'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIDecision {
  actionId: ActionId
  targetFactionId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelationship(
  factionA: string,
  factionB: string,
  relationships: FactionRelationship[],
): number {
  const rel = relationships.find(
    r =>
      (r.factionA === factionA && r.factionB === factionB) ||
      (r.factionA === factionB && r.factionB === factionA),
  )
  return rel?.score ?? 0
}

function pickTarget(
  faction: Faction,
  candidates: Faction[],
  relationships: FactionRelationship[],
  preferHostile: boolean,
): Faction {
  if (candidates.length === 0) return faction // fallback self-target (caller should handle)

  if (preferHostile) {
    // Sort by most negative relationship first
    const sorted = [...candidates].sort(
      (a, b) =>
        getRelationship(faction.id, a.id, relationships) -
        getRelationship(faction.id, b.id, relationships),
    )
    return sorted[0]
  }

  // Prefer the faction with highest relationship (ally-supporting)
  const sorted = [...candidates].sort(
    (a, b) =>
      getRelationship(faction.id, b.id, relationships) -
      getRelationship(faction.id, a.id, relationships),
  )
  return sorted[0]
}

// ─── Recovery actions ─────────────────────────────────────────────────────────

/**
 * When any stat is below 30, choose a defensive recovery action.
 */
function recoveryAction(faction: Faction, allFactions: Faction[]): AIDecision | null {
  const others = allFactions.filter(f => f.id !== faction.id)

  if (faction.mil < 30) {
    // Military recovery — posture against weakest rival
    const target = [...others].sort((a, b) => calculatePower(a) - calculatePower(b))[0]
    return { actionId: 'military', targetFactionId: target?.id ?? faction.id }
  }

  if (faction.eco < 30) {
    // Economic recovery — seek a trade deal with a strong economy
    const target = [...others].sort((a, b) => b.eco - a.eco)[0]
    return { actionId: 'trade', targetFactionId: target?.id ?? faction.id }
  }

  if (faction.dip < 30) {
    return { actionId: 'diplomacy', targetFactionId: others[0]?.id ?? faction.id }
  }

  if (faction.inf < 30) {
    return { actionId: 'intel', targetFactionId: others[0]?.id ?? faction.id }
  }

  return null
}

// ─── Main decision function ───────────────────────────────────────────────────

/**
 * Rule-based AI decision for a single faction.
 *
 * Priority:
 *  1. Any stat below 30 → recovery
 *  2. Rival MIL exceeds faction MIL by 20+ → Military Posture against that rival
 *  3. Player near victory → target player's winning stat
 *  4. Coalition obligation → fulfill with diplomacy/aid
 *  5. Default → highest personality weight action
 */
export function decideAIAction(
  faction: Faction,
  allFactions: Faction[],
  _turn: number,
  playerFactionId: string,
  relationships: FactionRelationship[],
  coalitions: Coalition[],
): AIDecision {
  const others = allFactions.filter(f => f.id !== faction.id)
  const playerFaction = allFactions.find(f => f.id === playerFactionId)

  // ── Priority 1: Recovery ──────────────────────────────────────────────────
  const recovery = recoveryAction(faction, allFactions)
  if (recovery) return recovery

  // ── Priority 2: Counter military threat ──────────────────────────────────
  const militaryThreat = others.find(
    rival => rival.mil - faction.mil >= 20,
  )
  if (militaryThreat) {
    return { actionId: 'military', targetFactionId: militaryThreat.id }
  }

  // ── Priority 3: Stop player near victory ────────────────────────────────
  if (playerFaction) {
    const nearVictory = isNearVictory(playerFaction, allFactions, coalitions)
    if (nearVictory.isNear) {
      // Target the player's strongest path
      const actionMap: Record<string, ActionId> = {
        domination: 'military',
        diplomatic: 'propaganda',
        economic:   'sanctions',
        influence:  'propaganda',
      }
      const counterAction = actionMap[nearVictory.victoryType] ?? 'sanctions'
      return { actionId: counterAction, targetFactionId: playerFactionId }
    }
  }

  // ── Priority 4: Coalition obligation (reinforce ally) ────────────────────
  const myCoalitions = coalitions.filter(c => c.members.includes(faction.id))
  if (myCoalitions.length > 0) {
    // Find a coalition ally with the lowest power and support them
    const alliedIds = new Set<string>()
    for (const coalition of myCoalitions) {
      for (const memberId of coalition.members) {
        if (memberId !== faction.id) alliedIds.add(memberId)
      }
    }
    const allies = others.filter(f => alliedIds.has(f.id))
    if (allies.length > 0) {
      const neediest = [...allies].sort((a, b) => calculatePower(a) - calculatePower(b))[0]
      const rel = getRelationship(faction.id, neediest.id, relationships)
      // Diplomatic if relations are warm, aid if they need economic help
      if (rel >= 20) {
        return { actionId: 'aid', targetFactionId: neediest.id }
      }
    }
  }

  // ── Priority 5: Default — personality-driven ─────────────────────────────
  const preferredAction = getPreferredAction(faction.personality)

  // Aggressive actions target hostile factions; cooperative ones target allies/neutral
  const isAggressive = ['military', 'sanctions', 'propaganda', 'intel'].includes(preferredAction)

  const target = pickTarget(faction, others, relationships, isAggressive)
  return { actionId: preferredAction, targetFactionId: target.id }
}
