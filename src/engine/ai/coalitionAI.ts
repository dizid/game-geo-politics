import type {
  Faction,
  Coalition,
  CoalitionProposal,
  FactionRelationship,
} from '../../types/game'
import { calculatePower } from '../balance/statCalculator'
import { shouldFormCoalition, shouldBetray, isNearVictory } from './factionArchetypes'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelScore(
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

/**
 * Estimate how much of a shared threat a potential ally represents against a
 * third faction (e.g. the player) using power delta as a proxy.
 */
function sharedThreatLevel(
  faction: Faction,
  ally: Faction,
  threatSource: Faction,
): number {
  const factionDelta = calculatePower(threatSource) - calculatePower(faction)
  const allyDelta = calculatePower(threatSource) - calculatePower(ally)
  // Both factions threatened → higher shared threat
  return Math.max(0, (factionDelta + allyDelta) / 2)
}

// ─── Coalition Formation ──────────────────────────────────────────────────────

/**
 * Evaluate which AI-to-AI and AI-to-AI coalition proposals should fire this turn.
 *
 * @param aiFactions    All non-player factions
 * @param playerFaction The player's faction (used as common threat reference)
 * @param relationships All faction relationships
 * @param turn          Current game turn
 */
export function evaluateCoalitionFormation(
  aiFactions: Faction[],
  playerFaction: Faction,
  relationships: FactionRelationship[],
  turn: number,
): CoalitionProposal[] {
  const proposals: CoalitionProposal[] = []

  // Each AI faction considers forming a coalition with each other AI faction
  for (let i = 0; i < aiFactions.length; i++) {
    const faction = aiFactions[i]
    for (let j = i + 1; j < aiFactions.length; j++) {
      const target = aiFactions[j]

      const rel = getRelScore(faction.id, target.id, relationships)
      const threat = sharedThreatLevel(faction, target, playerFaction)

      if (shouldFormCoalition(faction, target, threat, rel)) {
        // Pick coalition type based on combined personality
        const avgAggression =
          (faction.personality.aggression + target.personality.aggression) / 2
        const avgDiplomacy =
          (faction.personality.diplomacy + target.personality.diplomacy) / 2
        const avgEconomy =
          (faction.personality.economy + target.personality.economy) / 2

        let coalitionType: CoalitionProposal['type']
        if (avgAggression >= 0.6) coalitionType = 'military'
        else if (avgDiplomacy >= 0.7) coalitionType = 'diplomatic'
        else if (avgEconomy >= 0.7) coalitionType = 'economic'
        else coalitionType = 'intelligence'

        proposals.push({
          fromFaction: faction.id,
          toFaction: target.id,
          type: coalitionType,
          turn,
        })
      }
    }
  }

  return proposals
}

// ─── Counter-Coalition ────────────────────────────────────────────────────────

/**
 * Evaluate whether AI factions should form a counter-coalition against the player.
 *
 * Returns a recommendation with members if a counter-coalition is warranted.
 */
export function evaluateCounterCoalition(
  playerFaction: Faction,
  aiFactions: Faction[],
  relationships: FactionRelationship[],
): { shouldForm: boolean; members: string[] } {
  const playerPower = calculatePower(playerFaction)
  const avgAIPower =
    aiFactions.reduce((sum, f) => sum + calculatePower(f), 0) / aiFactions.length

  // Only trigger when player is significantly ahead
  if (playerPower < avgAIPower + 15) {
    return { shouldForm: false, members: [] }
  }

  // Factions most threatened by the player (lowest power, most hostile relationship)
  const motivated = aiFactions.filter(f => {
    const rel = getRelScore(playerFaction.id, f.id, relationships)
    const powerGap = playerPower - calculatePower(f)
    // Threatened if player is stronger AND relationship is neutral-to-hostile
    return powerGap >= 10 && rel < 30
  })

  if (motivated.length < 2) {
    return { shouldForm: false, members: [] }
  }

  // Willing members — respect coalition personality
  const willing = motivated.filter(f =>
    f.personality.coalitionSeeking >= 0.3,
  )

  if (willing.length < 2) {
    return { shouldForm: false, members: [] }
  }

  return {
    shouldForm: true,
    members: willing.map(f => f.id),
  }
}

// ─── Betrayal Evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate which coalitions AI factions might dissolve (betray) this turn.
 *
 * @param coalitions    All active coalitions
 * @param factions      All factions
 * @param relationships All faction relationships
 * @param turn          Current game turn (earlier = less betrayal)
 * @returns Coalition IDs to dissolve
 */
export function evaluateBetrayals(
  coalitions: Coalition[],
  factions: Faction[],
  relationships: FactionRelationship[],
  turn: number,
): string[] {
  const toDissolve: string[] = []

  for (const coalition of coalitions) {
    // Betrayals become more plausible after turn 6
    if (turn < 6) continue

    const leader = factions.find(f => f.id === coalition.leader)
    if (!leader) continue

    // Non-leaders evaluate betrayal
    const potentialBetrayors = coalition.members
      .filter(id => id !== coalition.leader)
      .map(id => factions.find(f => f.id === id))
      .filter((f): f is Faction => f !== undefined)

    for (const betrayor of potentialBetrayors) {
      // Estimate opportunity gain from leaving: power gap vs leader
      const opportunityGain = Math.max(
        0,
        calculatePower(leader) - calculatePower(betrayor),
      )

      // Relationship with leader — betrayal is more likely against cold leaders
      const leaderRel = getRelScore(betrayor.id, leader.id, relationships)
      const relFactor = Math.max(0, 50 - leaderRel) // 0 when rel=50, 50 when rel=0

      const effectiveCohesion = Math.max(
        0,
        coalition.cohesion - relFactor * 0.5,
      )

      if (shouldBetray(betrayor, effectiveCohesion, opportunityGain)) {
        // One betrayal can dissolve the whole coalition
        if (!toDissolve.includes(coalition.id)) {
          toDissolve.push(coalition.id)
        }
        break
      }
    }
  }

  return toDissolve
}

// Re-export for use in stores
export { isNearVictory }
