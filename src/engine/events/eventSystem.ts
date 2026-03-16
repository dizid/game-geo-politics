import type { Faction } from '../../types/game'
import { EVENT_TEMPLATES, type EventTemplate } from '../../data/events'

// ─── Tension helpers ─────────────────────────────────────────────────────────

/**
 * Returns a base roll probability for events based on current tension.
 *  stable  (0–20)  → 20 %
 *  tense   (21–50) → 35 %
 *  crisis  (51–70) → 55 %
 *  brink   (71–90) → 70 %
 *  war     (91+)   → 85 %
 */
function baseEventProbability(tension: number): number {
  if (tension <= 20) return 0.20
  if (tension <= 50) return 0.35
  if (tension <= 70) return 0.55
  if (tension <= 90) return 0.70
  return 0.85
}

/**
 * Scale a template's weight upward for severe events when tension is high.
 */
function adjustedWeight(template: EventTemplate, tension: number): number {
  let w = template.weight

  // High-tension events become more likely
  if (tension >= 70 && (template.impact === 'extreme' || template.impact === 'global')) {
    w *= 2.5
  } else if (tension >= 50 && template.impact === 'high') {
    w *= 1.5
  }

  // Low-tension periods favour diplomatic or economic events
  if (tension <= 30 && (template.type === 'diplomatic_summit' || template.type === 'tech_breakthrough')) {
    w *= 1.4
  }

  return w
}

/**
 * Weighted random selection from an array of { item, weight } pairs.
 */
function weightedPick<T>(entries: { item: T; weight: number }[]): T {
  const total = entries.reduce((s, e) => s + e.weight, 0)
  let roll = Math.random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry.item
  }
  // Fallback — should not reach here
  return entries[entries.length - 1].item
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to generate a random event for this turn.
 * Returns null if no event fires (most turns) or if no templates are eligible.
 *
 * @param turn       Current game turn number
 * @param tension    World tension (0–100)
 * @param factions   All factions (unused in current logic but kept for extensibility)
 */
export function rollRandomEvent(
  turn: number,
  tension: number,
  _factions: Faction[],
): EventTemplate | null {
  // First decide whether an event fires at all
  if (Math.random() > baseEventProbability(tension)) return null

  // Filter to eligible templates
  const eligible = EVENT_TEMPLATES.filter(t => t.minTurn <= turn)
  if (eligible.length === 0) return null

  const weighted = eligible.map(t => ({
    item: t,
    weight: adjustedWeight(t, tension),
  }))

  return weightedPick(weighted)
}
