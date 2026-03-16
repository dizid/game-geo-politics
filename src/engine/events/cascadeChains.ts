import type { EventType } from '../../types/game'
import { EVENT_TEMPLATES, type EventTemplate } from '../../data/events'

export interface CascadeEntry {
  type: EventType
  delayTurns: number
}

// Maximum depth prevents infinite cascades
const MAX_CASCADE_DEPTH = 3

/**
 * Given a triggered event, roll each of its cascadeTo entries and return
 * the ones that fire (based on their probability).
 *
 * @param triggeredEvent  The event that just fired
 * @param _turn           Current turn (available for future depth tracking)
 * @param depth           Internal recursion depth guard — callers should omit this
 */
export function processCascade(
  triggeredEvent: EventTemplate,
  _turn: number,
  depth: number = 0,
): CascadeEntry[] {
  if (depth >= MAX_CASCADE_DEPTH) return []
  if (triggeredEvent.cascadeTo.length === 0) return []

  const fired: CascadeEntry[] = []

  for (const cascade of triggeredEvent.cascadeTo) {
    if (Math.random() < cascade.probability) {
      fired.push({ type: cascade.type, delayTurns: cascade.delayTurns })

      // Recursively process second-order cascades from the newly triggered event
      const nextTemplate = EVENT_TEMPLATES.find(t => t.type === cascade.type)
      if (nextTemplate) {
        const deeper = processCascade(nextTemplate, _turn, depth + 1)
        fired.push(...deeper)
      }
    }
  }

  return fired
}
