import type {
  GameState,
  Coalition,
  FactionRelationship,
  VictoryProgress,
  Faction,
} from '../../types/game'
import { ACTIONS } from '../../data/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorHint {
  priority: number         // 1 = critical, 7 = low
  message: string          // Short display text
  detail: string           // Expanded explanation
  suggestedTarget?: string // faction ID to suggest selecting
  suggestedAction?: string // action ID to suggest
  category: 'danger' | 'tension' | 'expiring' | 'victory' | 'opportunity' | 'reminder' | 'suggestion'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayerFaction(gameState: GameState): Faction | null {
  if (!gameState.playerFactionId) return null
  return gameState.factions.find(f => f.id === gameState.playerFactionId) ?? null
}

/**
 * Returns the relationship score between player and a given faction.
 * Returns 0 if no record found.
 */
function getRelScore(
  playerId: string,
  otherId: string,
  relationships: FactionRelationship[],
): number {
  const rel = relationships.find(
    r =>
      (r.factionA === playerId && r.factionB === otherId) ||
      (r.factionA === otherId && r.factionB === playerId),
  )
  return rel?.score ?? 0
}

/**
 * Find the cheapest available action cost.
 */
function cheapestActionCost(): number {
  return Math.min(...ACTIONS.map(a => a.cost))
}

// ─── Hint builders ────────────────────────────────────────────────────────────

/**
 * Priority 1: Any player stat < 35 → suggest recovery action.
 */
function buildDangerHints(
  player: Faction,
  gameState: GameState,
  relationships: FactionRelationship[],
): AdvisorHint[] {
  const hints: AdvisorHint[] = []
  const others = gameState.factions.filter(f => f.id !== player.id)

  // Find the most friendly faction as a recovery partner
  const friendlyFaction = others
    .map(f => ({ faction: f, score: getRelScore(player.id, f.id, relationships) }))
    .sort((a, b) => b.score - a.score)[0]?.faction

  if (player.mil < 35) {
    hints.push({
      priority: 1,
      category: 'danger',
      message: `MIL CRITICAL (${player.mil}) — Reinforce military`,
      detail: 'Military below 35. Use Military Posture or Form Alliance to stabilize.',
      suggestedAction: 'military',
      suggestedTarget: friendlyFaction?.id,
    })
  }

  if (player.eco < 35) {
    hints.push({
      priority: 1,
      category: 'danger',
      message: `ECO CRITICAL (${player.eco}) — Seek trade`,
      detail: 'Economy below 35. A Trade Deal or Foreign Aid can restore it quickly.',
      suggestedAction: 'trade',
      suggestedTarget: friendlyFaction?.id,
    })
  }

  if (player.dip < 35) {
    // Suggest diplomacy with the faction we have the best relationship with
    hints.push({
      priority: 1,
      category: 'danger',
      message: `DIP CRITICAL (${player.dip}) — Open dialogue`,
      detail: 'Diplomacy below 35. Negotiate with a friendly faction to recover.',
      suggestedAction: 'diplomacy',
      suggestedTarget: friendlyFaction?.id,
    })
  }

  if (player.inf < 35) {
    hints.push({
      priority: 1,
      category: 'danger',
      message: `INF CRITICAL (${player.inf}) — Run Intel Op`,
      detail: 'Influence below 35. An Intel Op can rebuild your information advantage.',
      suggestedAction: 'intel',
      suggestedTarget: others[0]?.id,
    })
  }

  return hints
}

/**
 * Priority 2: World tension > 65 — suggest diplomacy.
 */
function buildTensionHint(
  gameState: GameState,
  relationships: FactionRelationship[],
  player: Faction,
): AdvisorHint | null {
  if (gameState.worldTension <= 65) return null

  const others = gameState.factions.filter(f => f.id !== player.id)
  const friendlyFaction = others
    .map(f => ({ faction: f, score: getRelScore(player.id, f.id, relationships) }))
    .sort((a, b) => b.score - a.score)[0]?.faction

  return {
    priority: 2,
    category: 'tension',
    message: `TENSION CRITICAL (${gameState.worldTension}) — Diplomacy needed`,
    detail: 'World tension is critically high. Diplomacy reduces tension and prevents a global catastrophe.',
    suggestedAction: 'diplomacy',
    suggestedTarget: friendlyFaction?.id,
  }
}

/**
 * Priority 4: Suggest actions aligned with the closest victory path.
 */
function buildVictoryHint(
  victoryProgress: VictoryProgress[],
  gameState: GameState,
  relationships: FactionRelationship[],
  player: Faction,
): AdvisorHint | null {
  const available = victoryProgress.filter(v => v.available)
  if (available.length === 0) return null

  // Find the path with the highest progress
  const closest = available.slice().sort((a, b) => b.progress - a.progress)[0]
  if (!closest || closest.progress === 100) return null

  const others = gameState.factions.filter(f => f.id !== player.id)
  const friendlyFaction = others
    .map(f => ({ faction: f, score: getRelScore(player.id, f.id, relationships) }))
    .sort((a, b) => b.score - a.score)[0]?.faction

  const victoryActionMap: Record<string, { action: string; detail: string }> = {
    domination: {
      action: 'military',
      detail: `Domination path is closest (${closest.progress}% complete). Military actions increase MIL and project power.`,
    },
    diplomatic: {
      action: 'alliance',
      detail: `Diplomatic path is closest (${closest.progress}% complete). Forming alliances grows your coalition.`,
    },
    economic: {
      action: 'trade',
      detail: `Economic path is closest (${closest.progress}% complete). Trade deals build your economic dominance.`,
    },
    influence: {
      action: 'propaganda',
      detail: `Influence path is closest (${closest.progress}% complete). Info War campaigns expand your narrative reach.`,
    },
    underdog: {
      action: 'diplomacy',
      detail: `Underdog path is closest (${closest.progress}% complete). Diplomacy with weaker factions builds your coalition.`,
    },
  }

  const suggestion = victoryActionMap[closest.type]
  if (!suggestion) return null

  return {
    priority: 4,
    category: 'victory',
    message: `${closest.label} at ${closest.progress}% — advance it`,
    detail: suggestion.detail,
    suggestedAction: suggestion.action,
    suggestedTarget: friendlyFaction?.id,
  }
}

/**
 * Priority 5: Any faction with relationship > 40 — suggest alliance or trade.
 */
function buildOpportunityHint(
  gameState: GameState,
  relationships: FactionRelationship[],
  player: Faction,
): AdvisorHint | null {
  const others = gameState.factions.filter(f => f.id !== player.id)

  const bestPair = others
    .map(f => ({ faction: f, score: getRelScore(player.id, f.id, relationships) }))
    .filter(x => x.score > 40)
    .sort((a, b) => b.score - a.score)[0]

  if (!bestPair) return null

  return {
    priority: 5,
    category: 'opportunity',
    message: `Strong ties with ${bestPair.faction.name} — capitalize`,
    detail: `Relationship score is ${bestPair.score}. Form an alliance or trade deal to lock in this partnership.`,
    suggestedAction: 'alliance',
    suggestedTarget: bestPair.faction.id,
  }
}

/**
 * Priority 6: Signature ability not yet used.
 */
function buildSignatureHint(
  gameState: GameState,
  player: Faction,
): AdvisorHint | null {
  if (gameState.signatureUsed) return null

  return {
    priority: 6,
    category: 'reminder',
    message: `Signature: ${player.signature.name} is available`,
    detail: `Your signature ability "${player.signature.name}" has not been used yet. ${player.signature.description}`,
  }
}

/**
 * Priority 7: Player has AP but hasn't acted this turn.
 */
function buildApHint(
  gameState: GameState,
  actionsThisTurn: number,
): AdvisorHint | null {
  const cheapest = cheapestActionCost()
  if (gameState.playerAP < cheapest) return null
  if (actionsThisTurn > 0) return null

  return {
    priority: 7,
    category: 'suggestion',
    message: `${gameState.playerAP} AP available — make a move`,
    detail: 'You have action points to spend this turn. Select a faction and an action to act.',
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Analyzes game state and returns up to 3 prioritized advisor hints.
 * Pure function — no store imports, no side effects.
 *
 * @param actionsThisTurn  Number of actions the player has taken this turn.
 *                         Pass 0 if none have been taken yet.
 */
export function getAdvisorHints(
  gameState: GameState,
  _coalitions: Coalition[],
  relationships: FactionRelationship[],
  victoryProgress: VictoryProgress[],
  actionsThisTurn: number = 0,
): AdvisorHint[] {
  const player = getPlayerFaction(gameState)
  // No player selected yet — nothing to advise
  if (!player) return []

  const hints: AdvisorHint[] = []

  // Priority 1 — Danger (may produce multiple hints, take the first one)
  const dangerHints = buildDangerHints(player, gameState, relationships)
  if (dangerHints.length > 0) hints.push(dangerHints[0])

  // Priority 2 — Tension
  const tensionHint = buildTensionHint(gameState, relationships, player)
  if (tensionHint) hints.push(tensionHint)

  // Priority 3 — Expiring ultimatums skipped (requires store access; handled in store layer)

  // Priority 4 — Victory path
  const victoryHint = buildVictoryHint(victoryProgress, gameState, relationships, player)
  if (victoryHint) hints.push(victoryHint)

  // Priority 5 — Opportunity
  const opportunityHint = buildOpportunityHint(gameState, relationships, player)
  if (opportunityHint) hints.push(opportunityHint)

  // Priority 6 — Signature reminder
  const signatureHint = buildSignatureHint(gameState, player)
  if (signatureHint) hints.push(signatureHint)

  // Priority 7 — AP suggestion
  const apHint = buildApHint(gameState, actionsThisTurn)
  if (apHint) hints.push(apHint)

  // Sort by priority ascending (1 = most critical) and return top 3
  return hints
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
}
