import type { ActionId, TensionState } from '../../types/game'
import { ACTIONS } from '../../data/actions'

/**
 * Returns the tension delta for a given action.
 * Falls back to 0 for unknown action IDs.
 */
export function calculateTensionChange(actionId: ActionId, currentTension: number): number {
  const action = ACTIONS.find(a => a.id === actionId)
  if (!action) return 0

  const base = action.effects.tensionChange

  // At high tension levels, aggressive actions compound more
  if (currentTension >= 70 && base > 0) {
    return Math.round(base * 1.5)
  }

  // At low tension, de-escalation actions are more effective
  if (currentTension <= 30 && base < 0) {
    return Math.round(base * 1.5)
  }

  return base
}

/**
 * Map a numeric tension value to a named TensionState.
 *
 *   0–20   → stable
 *  21–50   → tense
 *  51–70   → crisis
 *  71–90   → brink
 *  91–100  → war
 */
export function getTensionState(tension: number): TensionState {
  if (tension <= 20) return 'stable'
  if (tension <= 50) return 'tense'
  if (tension <= 70) return 'crisis'
  if (tension <= 90) return 'brink'
  return 'war'
}

/**
 * Returns gameplay modifiers that scale with world tension.
 *
 * militaryCostMod    – multiplier on military action AP cost  (>1 = more expensive)
 * diplomacyEffectMod – multiplier on diplomacy relationship gain (>1 = more effective)
 */
export function getTensionModifiers(tension: number): {
  militaryCostMod: number
  diplomacyEffectMod: number
} {
  const state = getTensionState(tension)

  switch (state) {
    case 'stable':
      return { militaryCostMod: 1.0, diplomacyEffectMod: 1.2 }
    case 'tense':
      return { militaryCostMod: 1.1, diplomacyEffectMod: 1.0 }
    case 'crisis':
      return { militaryCostMod: 1.2, diplomacyEffectMod: 0.8 }
    case 'brink':
      return { militaryCostMod: 1.4, diplomacyEffectMod: 0.6 }
    case 'war':
      return { militaryCostMod: 1.6, diplomacyEffectMod: 0.4 }
  }
}

/**
 * Returns true when world tension has crossed the World War threshold (>= 91).
 */
export function checkWorldWar(tension: number): boolean {
  return tension >= 91
}
