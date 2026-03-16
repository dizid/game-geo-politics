import type { Faction, FactionPersonality, ActionId, Coalition } from '../../types/game'
import { calculatePower } from '../balance/statCalculator'

// ─── Preferred Action ────────────────────────────────────────────────────────

/**
 * Map personality weights to concrete action IDs.
 * Returns the action type most consistent with the faction's personality.
 */
export function getPreferredAction(personality: FactionPersonality): ActionId {
  const scores: { action: ActionId; score: number }[] = [
    { action: 'military',   score: personality.aggression },
    { action: 'diplomacy',  score: personality.diplomacy },
    { action: 'trade',      score: personality.economy },
    { action: 'alliance',   score: personality.coalitionSeeking },
    { action: 'propaganda', score: personality.aggression * 0.7 },
    { action: 'sanctions',  score: personality.aggression * 0.6 + (1 - personality.diplomacy) * 0.4 },
    { action: 'aid',        score: personality.diplomacy * 0.5 + personality.coalitionSeeking * 0.5 },
    { action: 'intel',      score: personality.aggression * 0.4 + (1 - personality.diplomacy) * 0.4 },
  ]

  scores.sort((a, b) => b.score - a.score)
  return scores[0].action
}

// ─── Coalition formation ─────────────────────────────────────────────────────

/**
 * Decide whether a faction should propose or accept a coalition with another.
 *
 * @param faction        The faction considering forming a coalition
 * @param targetFaction  The potential coalition partner
 * @param sharedThreat   Perceived threat from a common enemy (0–100)
 * @param relationship   Current relationship score between the two (-100 to +100)
 */
export function shouldFormCoalition(
  faction: Faction,
  targetFaction: Faction,
  sharedThreat: number,
  relationship: number,
): boolean {
  // Need at least a neutral relationship to form a coalition
  if (relationship < -20) return false

  // High coalition-seeking factions are more willing
  const willingnessThreshold = 1.0 - faction.personality.coalitionSeeking

  // Shared threat lowers the threshold
  const threatBonus = sharedThreat / 200 // 0–0.5

  // Compatibility: similar economic/diplomatic outlooks make coalitions easier
  const compatibility =
    (1 - Math.abs(faction.personality.diplomacy - targetFaction.personality.diplomacy)) * 0.3

  const score = faction.personality.coalitionSeeking + threatBonus + compatibility
  return score > willingnessThreshold
}

// ─── Betrayal ────────────────────────────────────────────────────────────────

/**
 * Decide whether a faction will betray a coalition.
 *
 * @param faction            The faction considering betrayal
 * @param coalitionCohesion  Current coalition cohesion (0–100)
 * @param opportunityGain    Expected power gain from betrayal (0–100)
 */
export function shouldBetray(
  faction: Faction,
  coalitionCohesion: number,
  opportunityGain: number,
): boolean {
  // High aggression factions betray more readily
  // High coalition-seeking factions are more loyal
  const loyaltyBase = faction.personality.coalitionSeeking - faction.personality.aggression * 0.5

  // Low cohesion makes betrayal easier
  const cohesionFactor = (100 - coalitionCohesion) / 200 // 0–0.5

  // Big potential gains are tempting
  const gainTemptation = opportunityGain / 200 // 0–0.5

  // Slow grudge decay = more principled (less betrayal-prone)
  const principledBonus = (1 - faction.personality.grudgeDecayRate) * 0.2

  const betrayalScore = cohesionFactor + gainTemptation - loyaltyBase - principledBonus
  return betrayalScore > 0.3
}

// ─── Near-Victory detection ───────────────────────────────────────────────────

export interface NearVictoryResult {
  isNear: boolean
  victoryType: string
  progress: number // 0–100
}

/**
 * Estimate how close a faction is to any win condition.
 * Returns the closest path and its progress percentage.
 */
export function isNearVictory(
  faction: Faction,
  allFactions: Faction[],
  coalitions: Coalition[],
): NearVictoryResult {
  const power = calculatePower(faction)

  // ── Domination progress ──
  const rivals = allFactions.filter(f => f.id !== faction.id && calculatePower(f) >= 70)
  const domProgress = Math.round(
    (Math.min(power, 85) / 85) * 0.4 +
    (Math.max(0, 1 - rivals.length * 0.2)) * 0.4 +
    (Math.min(faction.mil, 80) / 80) * 0.2,
  ) * 100

  // ── Diplomatic progress ──
  const ledCoalition = coalitions.find(c => c.leader === faction.id)
  const memberCount = ledCoalition ? ledCoalition.members.length : 0
  const dipProgress = Math.round(
    (Math.min(faction.dip, 85) / 85) * 0.5 +
    (Math.min(memberCount, 5) / 5) * 0.5,
  ) * 100

  // ── Economic progress ──
  const ecoProgress = Math.round((Math.min(faction.eco, 90) / 90) * 100)

  // ── Influence progress ──
  const maxOtherInf = allFactions
    .filter(f => f.id !== faction.id)
    .reduce((max, f) => Math.max(max, f.inf), 0)
  const infLead = Math.max(0, faction.inf - maxOtherInf)
  const infProgress = Math.round(
    (Math.min(faction.inf, 88) / 88) * 0.6 +
    (Math.min(infLead, 20) / 20) * 0.4,
  ) * 100

  const paths = [
    { type: 'domination', progress: domProgress },
    { type: 'diplomatic', progress: dipProgress },
    { type: 'economic',   progress: ecoProgress },
    { type: 'influence',  progress: infProgress },
  ]

  paths.sort((a, b) => b.progress - a.progress)
  const best = paths[0]

  return {
    isNear: best.progress >= 70,
    victoryType: best.type,
    progress: best.progress,
  }
}
