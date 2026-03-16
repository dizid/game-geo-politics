import type {
  GameState,
  Faction,
  FactionRelationship,
  Coalition,
  NewsItem,
  TurnPhase,
  ActionId,
  CompoundActionId,
} from '../../types/game'
import { calculatePower } from '../balance/statCalculator'

// ─── Phase helpers ────────────────────────────────────────────────────────────

function getTurnPhase(turn: number): TurnPhase {
  if (turn <= 2)  return 'tutorial'
  if (turn <= 6)  return 'opening'
  if (turn <= 12) return 'midgame'
  if (turn <= 18) return 'endgame'
  return 'sudden_death'
}

function getAllowedDelta(phase: TurnPhase): number {
  switch (phase) {
    case 'tutorial':     return 4
    case 'opening':      return 6
    case 'midgame':      return 8
    case 'endgame':      return 10
    case 'sudden_death': return 12
  }
}

function getSystemTone(phase: TurnPhase): string {
  switch (phase) {
    case 'tutorial':
      return 'You are a geopolitical analyst guiding a new world leader. Keep consequences clear, educational, and fair. Stakes are moderate.'
    case 'opening':
      return 'You are a seasoned geopolitical strategist. The world order is still forming. Actions have meaningful but contained consequences.'
    case 'midgame':
      return 'You are a cold-eyed global power analyst. Alliances are fracturing. Every action triggers countermoves. Consequences are sharp.'
    case 'endgame':
      return 'You are a crisis-room intelligence director. The world is on the knife-edge. Actions cascade rapidly. Victory or defeat is imminent.'
    case 'sudden_death':
      return 'You are the voice of history. This is the final reckoning. Every move is decisive. The world watches. Make it count.'
  }
}

// ─── Compression helpers ──────────────────────────────────────────────────────

function compressFaction(f: Faction): string {
  const power = calculatePower(f)
  return `${f.id}(MIL:${f.mil} ECO:${f.eco} DIP:${f.dip} INF:${f.inf} PWR:${power})`
}

function compressRelationship(rel: FactionRelationship): string {
  return `${rel.factionA}<->${rel.factionB}:${rel.score}`
}

function compressCoalition(c: Coalition): string {
  return `[${c.name}|leader:${c.leader}|members:${c.members.join(',')}|cohesion:${c.cohesion}]`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the full prompt string to send to the Claude API for a game turn.
 */
export function buildTurnPrompt(
  gameState: GameState,
  action: ActionId | CompoundActionId,
  target: Faction,
  recentNews: NewsItem[],
  relationships: FactionRelationship[],
  coalitions: Coalition[],
): string {
  const turn = gameState.turn
  const phase = getTurnPhase(turn)
  const maxDelta = getAllowedDelta(phase)
  const systemTone = getSystemTone(phase)

  const playerFaction = gameState.factions.find(f => f.id === gameState.playerFactionId)
  const playerName = playerFaction?.name ?? 'Unknown'

  // Compressed faction stats (all factions)
  const factionSummary = gameState.factions.map(compressFaction).join('\n')

  // Recent 3 turns of news
  const relevantNews = recentNews
    .filter(n => n.turn >= turn - 3)
    .slice(-9) // at most 9 items
    .map(n => `[T${n.turn}] ${n.text}`)
    .join('\n')

  // Top 5 most extreme relationships (most impactful)
  const topRelationships = [...relationships]
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 5)
    .map(compressRelationship)
    .join(', ')

  // Active coalitions
  const coalitionSummary = coalitions.length > 0
    ? coalitions.map(compressCoalition).join('\n')
    : 'None'

  const prompt = `${systemTone}

GAME STATE — Turn ${turn} (Phase: ${phase})
World Tension: ${gameState.worldTension}/100
Player: ${playerName} (${gameState.playerFactionId})

FACTION STATS:
${factionSummary}

RECENT HISTORY (last 3 turns):
${relevantNews || 'No recent news.'}

KEY RELATIONSHIPS (top 5 by magnitude):
${topRelationships || 'None established.'}

ACTIVE COALITIONS:
${coalitionSummary}

PLAYER ACTION THIS TURN:
Action: ${action}
Target: ${target.name} (${target.id})

INSTRUCTIONS:
Generate a geopolitical turn resolution. All stat deltas MUST be within [-${maxDelta}, +${maxDelta}].
Produce exactly this JSON (no markdown fences, no extra keys):

{
  "headline": "<15-word news headline>",
  "narrative": "<2-3 sentence narrative of what happened>",
  "world_reaction": "<1-2 sentence global reaction>",
  "stat_changes": [
    {
      "faction_id": "<id>",
      "mil_delta": <integer>,
      "eco_delta": <integer>,
      "dip_delta": <integer>,
      "inf_delta": <integer>,
      "reason": "<short reason>"
    }
  ],
  "ai_reactions": [
    {
      "faction_id": "<id>",
      "action": "<retaliate|condemn|support|opportunize|none>",
      "narrative": "<1 sentence>",
      "relationship_delta": <integer between -20 and 20>
    }
  ],
  "events_triggered": [
    {
      "event_type": "<type>",
      "affected_factions": ["<id>"],
      "narrative": "<1 sentence>",
      "cascade_risk": "<low|medium|high>"
    }
  ],
  "endgame_signal": null,
  "forecast": "<1-sentence forecast for next turn>"
}

Rules:
- stat_changes: include the player faction and at least 1–3 affected factions.
- All mil_delta, eco_delta, dip_delta, inf_delta values must be integers in [-${maxDelta}, +${maxDelta}].
- events_triggered may be an empty array if nothing notable occurred.
- endgame_signal: if one player is near victory or defeat, set this field; otherwise null.
- Keep all text concise and realistic.`

  return prompt
}
