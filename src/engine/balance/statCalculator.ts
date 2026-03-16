import type { FactionStats } from '../../types/game'

/**
 * Apply a stat delta with diminishing returns at high values,
 * accelerated gains at low values, and a hard clamp to [10, 99].
 *
 * Gain multipliers:
 *   value >= 90  → 0.4×
 *   value >= 80  → 0.7×
 *   value <  40  → 1.5×
 *   otherwise    → 1.0×
 *
 * Loss multipliers are always 1.0× (diminishing returns only apply to gains).
 */
export function applyStatChange(currentValue: number, delta: number): number {
  if (delta === 0) return currentValue

  let adjusted: number

  if (delta > 0) {
    // Diminishing returns on gains
    if (currentValue >= 90) {
      adjusted = currentValue + delta * 0.4
    } else if (currentValue >= 80) {
      adjusted = currentValue + delta * 0.7
    } else if (currentValue < 40) {
      adjusted = currentValue + delta * 1.5
    } else {
      adjusted = currentValue + delta
    }
  } else {
    // Losses always apply at full strength
    adjusted = currentValue + delta
  }

  return Math.max(10, Math.min(99, Math.round(adjusted)))
}

/**
 * Calculate overall power as the average of all four stats.
 */
export function calculatePower(stats: FactionStats): number {
  return Math.round((stats.mil + stats.eco + stats.dip + stats.inf) / 4)
}
