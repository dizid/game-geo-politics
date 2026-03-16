import type { AIResponse, AIStatChange, AIReaction, AIEvent, AIEndgameSignal } from '../../types/game'

// ─── Phase delta limits ───────────────────────────────────────────────────────

function getAllowedDelta(turn: number): number {
  if (turn <= 2)  return 4
  if (turn <= 6)  return 6
  if (turn <= 12) return 8
  if (turn <= 18) return 10
  return 12
}

function clampDelta(value: unknown, maxAbs: number): number {
  if (typeof value !== 'number' || !isFinite(value)) return 0
  return Math.max(-maxAbs, Math.min(maxAbs, Math.round(value)))
}

function clampRelDelta(value: unknown): number {
  if (typeof value !== 'number' || !isFinite(value)) return 0
  return Math.max(-20, Math.min(20, Math.round(value)))
}

// ─── Field validators ─────────────────────────────────────────────────────────

function parseString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function parseStatChanges(raw: unknown, maxDelta: number): AIStatChange[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => ({
      faction_id: parseString(item['faction_id'], 'unknown'),
      mil_delta:  clampDelta(item['mil_delta'], maxDelta),
      eco_delta:  clampDelta(item['eco_delta'], maxDelta),
      dip_delta:  clampDelta(item['dip_delta'], maxDelta),
      inf_delta:  clampDelta(item['inf_delta'], maxDelta),
      reason:     parseString(item['reason'], 'No reason provided.'),
    }))
}

function parseAIReactions(raw: unknown): AIReaction[] {
  if (!Array.isArray(raw)) return []

  const validActions = ['retaliate', 'condemn', 'support', 'opportunize', 'none'] as const
  type ValidAction = typeof validActions[number]

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => {
      const action = validActions.includes(item['action'] as ValidAction)
        ? (item['action'] as ValidAction)
        : 'none'

      return {
        faction_id:         parseString(item['faction_id'], 'unknown'),
        action,
        narrative:          parseString(item['narrative'], ''),
        relationship_delta: clampRelDelta(item['relationship_delta']),
      }
    })
}

function parseAIEvents(raw: unknown): AIEvent[] {
  if (!Array.isArray(raw)) return []

  const validRisks = ['low', 'medium', 'high'] as const
  type ValidRisk = typeof validRisks[number]

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => {
      const cascadeRisk = validRisks.includes(item['cascade_risk'] as ValidRisk)
        ? (item['cascade_risk'] as ValidRisk)
        : 'low'

      const affectedFactions = Array.isArray(item['affected_factions'])
        ? (item['affected_factions'] as unknown[]).filter((v): v is string => typeof v === 'string')
        : []

      return {
        event_type:         parseString(item['event_type'], 'unknown'),
        affected_factions:  affectedFactions,
        narrative:          parseString(item['narrative'], ''),
        cascade_risk:       cascadeRisk,
      }
    })
}

function parseEndgameSignal(raw: unknown): AIEndgameSignal | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object') return null

  const item = raw as Record<string, unknown>

  const validTypes = ['player_winning', 'player_losing', 'coalition_forming_against_player'] as const
  type ValidType = typeof validTypes[number]

  const validUrgencies = ['subtle', 'clear', 'urgent'] as const
  type ValidUrgency = typeof validUrgencies[number]

  if (!validTypes.includes(item['type'] as ValidType)) return null

  return {
    type:      item['type'] as ValidType,
    narrative: parseString(item['narrative'], ''),
    urgency:   validUrgencies.includes(item['urgency'] as ValidUrgency)
      ? (item['urgency'] as ValidUrgency)
      : 'subtle',
  }
}

// ─── Strip markdown fences ────────────────────────────────────────────────────

function stripFences(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a raw string from the Claude API into a validated AIResponse.
 * All stat deltas are clamped. Missing fields receive safe defaults.
 *
 * @param raw   Raw API response string
 * @param turn  Current game turn (used to derive max allowed delta)
 */
export function validateResponse(raw: string, turn: number = 10): AIResponse {
  const maxDelta = getAllowedDelta(turn)
  const cleaned = stripFences(raw)

  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    // Return a safe fallback if JSON is invalid
    return {
      headline:       'Global events continue to unfold.',
      narrative:      'The world watches as events develop.',
      world_reaction: 'Global leaders monitor the situation.',
      stat_changes:   [],
      ai_reactions:   [],
      events_triggered: [],
      endgame_signal: null,
      forecast:       'Further developments expected.',
    }
  }

  return {
    headline:         parseString(parsed['headline'], 'Global events continue to unfold.'),
    narrative:        parseString(parsed['narrative'], 'The world watches as events develop.'),
    world_reaction:   parseString(parsed['world_reaction'], 'Global leaders monitor the situation.'),
    stat_changes:     parseStatChanges(parsed['stat_changes'], maxDelta),
    ai_reactions:     parseAIReactions(parsed['ai_reactions']),
    events_triggered: parseAIEvents(parsed['events_triggered']),
    endgame_signal:   parseEndgameSignal(parsed['endgame_signal']),
    forecast:         parseString(parsed['forecast'], 'Further developments expected.'),
  }
}
