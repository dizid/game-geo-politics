import type {
  GameAction,
  CompoundAction,
  Faction,
  FactionStats,
  ActionId,
  CompoundActionId,
} from '../../types/game'
import { applyStatChange } from './statCalculator'

// ─── Types ──────────────────────────────────────────────────────────────────

export type CritTier = 'fail' | 'partial' | 'normal' | 'enhanced' | 'crit'

export interface ActionResolution {
  statChanges: {
    selfChanges: Partial<FactionStats>
    targetChanges: Partial<FactionStats>
  }
  critResult: CritTier
  critMultiplier: number
  narrative: string
  exposed?: boolean // shadow war compound only
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Roll a d100 (1–100) and classify into crit tier.
 * A high relevant stat adds +15 to the roll.
 */
function rollCrit(relevantStatValue: number): { tier: CritTier; roll: number } {
  const base = Math.floor(Math.random() * 100) + 1
  const bonus = relevantStatValue >= 80 ? 15 : 0
  const roll = Math.min(100, base + bonus)

  let tier: CritTier
  if (roll <= 10) tier = 'fail'
  else if (roll <= 30) tier = 'partial'
  else if (roll <= 70) tier = 'normal'
  else if (roll <= 90) tier = 'enhanced'
  else tier = 'crit'

  return { tier, roll }
}

function critMultiplierFor(tier: CritTier): number {
  switch (tier) {
    case 'fail':     return 0.5
    case 'partial':  return 0.75
    case 'normal':   return 1.0
    case 'enhanced': return 1.25
    case 'crit':     return 1.5
  }
}

function narrativeFor(
  tier: CritTier,
  actionLabel: string,
  targetName: string,
): string {
  switch (tier) {
    case 'fail':
      return `${actionLabel} against ${targetName} backfired — the operation was compromised.`
    case 'partial':
      return `${actionLabel} against ${targetName} achieved limited results.`
    case 'normal':
      return `${actionLabel} against ${targetName} succeeded as planned.`
    case 'enhanced':
      return `${actionLabel} against ${targetName} exceeded expectations.`
    case 'crit':
      return `${actionLabel} against ${targetName} was a decisive masterstroke.`
  }
}

/**
 * Scale a delta by stat-based effectiveness and a crit multiplier.
 * effective = base × (1 + (relevantStat − 60) / 100) × critMultiplier
 */
function scaleDelta(base: number, relevantStat: number, critMul: number): number {
  const effectiveness = 1 + (relevantStat - 60) / 100
  return Math.round(base * effectiveness * critMul)
}

function scaleEffects(
  effects: Partial<FactionStats>,
  relevantStat: number,
  critMul: number,
): Partial<FactionStats> {
  const result: Partial<FactionStats> = {}
  for (const key of Object.keys(effects) as (keyof FactionStats)[]) {
    const val = effects[key]
    if (val !== undefined) {
      result[key] = scaleDelta(val, relevantStat, critMul)
    }
  }
  return result
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve a standard action and return stat changes, crit tier, and a
 * one-line narrative. Stat changes are computed but NOT applied to the
 * faction objects — the caller applies them via applyStatChange.
 */
export function resolveAction(
  action: GameAction | CompoundAction,
  _playerFaction: Faction,
  targetFaction: Faction,
  playerStats: FactionStats,
): ActionResolution {
  // Determine the relevant stat for scaling
  const relevantStatKey: keyof FactionStats =
    'relevantStat' in action ? action.relevantStat : 'inf'
  const relevantStatValue = playerStats[relevantStatKey]

  const { tier, roll: _roll } = rollCrit(relevantStatValue)
  const critMul = critMultiplierFor(tier)

  const scaledTarget = scaleEffects(action.effects.targetStatChanges, relevantStatValue, critMul)
  const scaledSelf = scaleEffects(action.effects.selfStatChanges, relevantStatValue, critMul)

  const resolution: ActionResolution = {
    statChanges: {
      selfChanges: scaledSelf,
      targetChanges: scaledTarget,
    },
    critResult: tier,
    critMultiplier: critMul,
    narrative: narrativeFor(tier, action.label, targetFaction.name),
  }

  // Shadow War compound: 20% exposure check
  if ('id' in action && (action.id as ActionId | CompoundActionId) === 'shadowWar') {
    resolution.exposed = Math.random() < 0.2
  }

  return resolution
}

/**
 * Convenience: apply resolution stat changes to faction copies.
 * Returns new stat objects (does not mutate inputs).
 */
export function applyResolution(
  resolution: ActionResolution,
  playerStats: FactionStats,
  targetStats: FactionStats,
): { newPlayerStats: FactionStats; newTargetStats: FactionStats } {
  const newPlayerStats: FactionStats = { ...playerStats }
  const newTargetStats: FactionStats = { ...targetStats }

  for (const key of Object.keys(resolution.statChanges.selfChanges) as (keyof FactionStats)[]) {
    const delta = resolution.statChanges.selfChanges[key]
    if (delta !== undefined) {
      newPlayerStats[key] = applyStatChange(newPlayerStats[key], delta)
    }
  }

  for (const key of Object.keys(resolution.statChanges.targetChanges) as (keyof FactionStats)[]) {
    const delta = resolution.statChanges.targetChanges[key]
    if (delta !== undefined) {
      newTargetStats[key] = applyStatChange(newTargetStats[key], delta)
    }
  }

  return { newPlayerStats, newTargetStats }
}
