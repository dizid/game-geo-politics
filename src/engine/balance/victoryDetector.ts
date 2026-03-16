import type {
  GameState,
  Faction,
  Coalition,
  FactionRelationship,
  VictoryType,
  LossType,
  VictoryProgress,
  VictoryRequirement,
} from '../../types/game'
import { calculatePower } from './statCalculator'
import { UNDERDOG_FACTIONS } from '../../data/factions'

// ─── Internal helpers ────────────────────────────────────────────────────────

function getPlayer(state: GameState): Faction | null {
  if (!state.playerFactionId) return null
  return state.factions.find(f => f.id === state.playerFactionId) ?? null
}

function getPlayerCoalitions(
  playerFactionId: string,
  coalitions: Coalition[],
): Coalition[] {
  return coalitions.filter(c => c.members.includes(playerFactionId))
}

function totalCoalitionPower(
  coalition: Coalition,
  factions: Faction[],
): number {
  const members = factions.filter(f => coalition.members.includes(f.id))
  if (members.length === 0) return 0
  return Math.round(
    members.reduce((sum, f) => sum + calculatePower(f), 0) / members.length,
  )
}

function allFactionsPower(factions: Faction[]): number {
  if (factions.length === 0) return 0
  return Math.round(
    factions.reduce((sum, f) => sum + calculatePower(f), 0) / factions.length,
  )
}

function getTradeDealsCount(
  playerFactionId: string,
  relationships: FactionRelationship[],
): number {
  return relationships
    .filter(r => r.factionA === playerFactionId || r.factionB === playerFactionId)
    .reduce((sum, r) => sum + r.tradeDeals, 0)
}

// ─── Victory checks ──────────────────────────────────────────────────────────

/**
 * Domination: Power >= 85 for 3 consecutive turns, no other faction >= 70, MIL >= 80
 */
function checkDomination(
  state: GameState,
  player: Faction,
  allFactions: Faction[],
): { won: boolean; message: string } {
  const power = calculatePower(player)
  const rivals = allFactions.filter(f => f.id !== player.id && calculatePower(f) >= 70)

  if (
    power >= 85 &&
    state.dominationStreak >= 3 &&
    rivals.length === 0 &&
    player.mil >= 80
  ) {
    return {
      won: true,
      message: `${player.name} has achieved undisputed global dominance.`,
    }
  }
  return { won: false, message: '' }
}

/**
 * Diplomatic: DIP >= 85, leads coalition with >= 5 members, coalition avg power >= 60
 */
function checkDiplomatic(
  _state: GameState,
  player: Faction,
  coalitions: Coalition[],
  allFactions: Faction[],
): { won: boolean; message: string } {
  if (player.dip < 85) return { won: false, message: '' }

  const ledCoalitions = coalitions.filter(
    c => c.leader === player.id && c.members.length >= 5,
  )

  for (const coalition of ledCoalitions) {
    const power = totalCoalitionPower(coalition, allFactions)
    if (power >= 60) {
      return {
        won: true,
        message: `${player.name} has forged a world-spanning diplomatic order.`,
      }
    }
  }
  return { won: false, message: '' }
}

/**
 * Economic: ECO >= 90, 4+ trade deals, ECO has grown >= 25 points from start
 */
function checkEconomic(
  _state: GameState,
  player: Faction,
  relationships: FactionRelationship[],
): { won: boolean; message: string } {
  const tradeDeals = getTradeDealsCount(player.id, relationships)

  // We track economic growth via tradePartners count as proxy for growth
  // The actual ECO start value isn't stored, so we use tradePartners size as a
  // signal that the economy has expanded — treat 4+ trade deals as the growth proxy.
  const econGrowthProxy = tradeDeals >= 4

  if (player.eco >= 90 && tradeDeals >= 4 && econGrowthProxy) {
    return {
      won: true,
      message: `${player.name} controls the global economy through trade supremacy.`,
    }
  }
  return { won: false, message: '' }
}

/**
 * Influence: INF >= 88, info war used against 6+ factions, leads all others by 20+
 */
function checkInfluence(
  state: GameState,
  player: Faction,
  allFactions: Faction[],
): { won: boolean; message: string } {
  const infoWarTargets = state.actionsUsedOnFactions[player.id]
    ? Array.from(state.actionsUsedOnFactions[player.id]).filter(
        (entry) => entry.startsWith('propaganda:'),
      ).length
    : 0

  const maxOtherInf = allFactions
    .filter(f => f.id !== player.id)
    .reduce((max, f) => Math.max(max, f.inf), 0)

  if (
    player.inf >= 88 &&
    infoWarTargets >= 6 &&
    player.inf - maxOtherInf >= 20
  ) {
    return {
      won: true,
      message: `${player.name} has seized control of the global narrative.`,
    }
  }
  return { won: false, message: '' }
}

/**
 * Underdog: Power >= 72, coalition with 3+ bottom factions, survived 14 turns
 * without any stat falling below 25.
 */
function checkUnderdog(
  state: GameState,
  player: Faction,
  coalitions: Coalition[],
): { won: boolean; message: string } {
  const power = calculatePower(player)
  if (power < 72) return { won: false, message: '' }
  if (state.turn < 14) return { won: false, message: '' }
  if (state.lowStatTurns > 0) return { won: false, message: '' }

  const playerCoalitions = getPlayerCoalitions(player.id, coalitions)
  for (const coalition of playerCoalitions) {
    const underdogMembers = coalition.members.filter(id =>
      UNDERDOG_FACTIONS.includes(id),
    )
    if (underdogMembers.length >= 3) {
      return {
        won: true,
        message: `${player.name} rose from adversity to reshape the world order.`,
      }
    }
  }
  return { won: false, message: '' }
}

// ─── Loss checks ─────────────────────────────────────────────────────────────

/**
 * Collapse: All stats below 30 simultaneously.
 * Failed State: Power below 30 for >= 3 consecutive turns.
 * Catastrophe: World tension triggered World War and player MIL < 40.
 */
export function checkDefeat(
  state: GameState,
): { lost: boolean; type: LossType; message: string } | null {
  const player = getPlayer(state)
  if (!player) return null

  // Total collapse
  if (player.mil < 30 && player.eco < 30 && player.dip < 30 && player.inf < 30) {
    return {
      lost: true,
      type: 'collapse',
      message: `${player.name} has collapsed under the weight of its own failures.`,
    }
  }

  // Failed state — prolonged weakness
  if (state.failedStateStreak >= 3) {
    return {
      lost: true,
      type: 'failed_state',
      message: `${player.name} is no longer a viable geopolitical actor.`,
    }
  }

  // World war catastrophe — player was caught unprepared
  if (state.worldTension >= 91 && player.mil < 40) {
    return {
      lost: true,
      type: 'catastrophe',
      message: `${player.name} was swept away by the global conflagration.`,
    }
  }

  return null
}

// ─── Main exports ────────────────────────────────────────────────────────────

export function checkVictory(
  gameState: GameState,
  coalitions: Coalition[],
  relationships: FactionRelationship[],
): { won: boolean; type: VictoryType; message: string } | null {
  const player = getPlayer(gameState)
  if (!player) return null

  const allFactions = gameState.factions

  const domination = checkDomination(gameState, player, allFactions)
  if (domination.won) return { won: true, type: 'domination', message: domination.message }

  const diplomatic = checkDiplomatic(gameState, player, coalitions, allFactions)
  if (diplomatic.won) return { won: true, type: 'diplomatic', message: diplomatic.message }

  const economic = checkEconomic(gameState, player, relationships)
  if (economic.won) return { won: true, type: 'economic', message: economic.message }

  const influence = checkInfluence(gameState, player, allFactions)
  if (influence.won) return { won: true, type: 'influence', message: influence.message }

  const underdog = checkUnderdog(gameState, player, coalitions)
  if (underdog.won) return { won: true, type: 'underdog', message: underdog.message }

  return null
}

export function getVictoryProgress(
  gameState: GameState,
  coalitions: Coalition[],
  relationships: FactionRelationship[],
): VictoryProgress[] {
  const player = getPlayer(gameState)
  if (!player) return []

  const allFactions = gameState.factions
  const tradeDeals = getTradeDealsCount(player.id, relationships)
  const power = calculatePower(player)
  const playerCoalitions = getPlayerCoalitions(player.id, coalitions)

  const infoWarTargets = gameState.actionsUsedOnFactions[player.id]
    ? Array.from(gameState.actionsUsedOnFactions[player.id]).filter(
        (entry) => entry.startsWith('propaganda:'),
      ).length
    : 0

  const maxOtherInf = allFactions
    .filter(f => f.id !== player.id)
    .reduce((max, f) => Math.max(max, f.inf), 0)

  // ── Domination ──
  const rivals70 = allFactions.filter(f => f.id !== player.id && calculatePower(f) >= 70)
  const domReqs: VictoryRequirement[] = [
    { label: 'Power ≥ 85', met: power >= 85, current: power, target: 85 },
    { label: '3-turn streak at Power ≥ 85', met: gameState.dominationStreak >= 3, current: gameState.dominationStreak, target: 3 },
    { label: 'No rival Power ≥ 70', met: rivals70.length === 0, current: rivals70.length, target: 0 },
    { label: 'MIL ≥ 80', met: player.mil >= 80, current: player.mil, target: 80 },
  ]
  const domProgress = Math.round(
    (domReqs.filter(r => r.met).length / domReqs.length) * 100,
  )

  // ── Diplomatic ──
  const ledCoalitionMax = playerCoalitions
    .filter(c => c.leader === player.id)
    .reduce((max, c) => Math.max(max, c.members.length), 0)
  const bestLedPower = playerCoalitions
    .filter(c => c.leader === player.id)
    .reduce((max, c) => Math.max(max, totalCoalitionPower(c, allFactions)), 0)
  const dipReqs: VictoryRequirement[] = [
    { label: 'DIP ≥ 85', met: player.dip >= 85, current: player.dip, target: 85 },
    { label: 'Lead coalition with ≥ 5 members', met: ledCoalitionMax >= 5, current: ledCoalitionMax, target: 5 },
    { label: 'Coalition avg power ≥ 60', met: bestLedPower >= 60, current: bestLedPower, target: 60 },
  ]
  const dipProgress = Math.round(
    (dipReqs.filter(r => r.met).length / dipReqs.length) * 100,
  )

  // ── Economic ──
  const ecoReqs: VictoryRequirement[] = [
    { label: 'ECO ≥ 90', met: player.eco >= 90, current: player.eco, target: 90 },
    { label: '4+ trade deals', met: tradeDeals >= 4, current: tradeDeals, target: 4 },
  ]
  const ecoProgress = Math.round(
    (ecoReqs.filter(r => r.met).length / ecoReqs.length) * 100,
  )

  // ── Influence ──
  const infLead = player.inf - maxOtherInf
  const infReqs: VictoryRequirement[] = [
    { label: 'INF ≥ 88', met: player.inf >= 88, current: player.inf, target: 88 },
    { label: 'Info war on 6+ factions', met: infoWarTargets >= 6, current: infoWarTargets, target: 6 },
    { label: 'INF leads all by 20+', met: infLead >= 20, current: infLead, target: 20 },
  ]
  const infProgress = Math.round(
    (infReqs.filter(r => r.met).length / infReqs.length) * 100,
  )

  // ── Underdog ──
  const maxUnderdogInCoalition = playerCoalitions.reduce((max, c) => {
    const count = c.members.filter(id => UNDERDOG_FACTIONS.includes(id)).length
    return Math.max(max, count)
  }, 0)
  const udReqs: VictoryRequirement[] = [
    { label: 'Power ≥ 72', met: power >= 72, current: power, target: 72 },
    { label: 'Coalition with 3+ underdog factions', met: maxUnderdogInCoalition >= 3, current: maxUnderdogInCoalition, target: 3 },
    { label: 'Survived 14 turns', met: gameState.turn >= 14, current: gameState.turn, target: 14 },
    { label: 'No stat below 25 during run', met: gameState.lowStatTurns === 0, current: gameState.lowStatTurns, target: 0 },
  ]
  const udProgress = Math.round(
    (udReqs.filter(r => r.met).length / udReqs.length) * 100,
  )

  // Some victory paths are only available to certain faction types.
  const isUnderdogFaction = UNDERDOG_FACTIONS.includes(player.id)
  const globalAvgPower = allFactionsPower(allFactions)

  return [
    {
      type: 'domination',
      label: 'Military Domination',
      progress: domProgress,
      requirements: domReqs,
      available: true,
    },
    {
      type: 'diplomatic',
      label: 'Diplomatic Hegemony',
      progress: dipProgress,
      requirements: dipReqs,
      available: true,
    },
    {
      type: 'economic',
      label: 'Economic Supremacy',
      progress: ecoProgress,
      requirements: ecoReqs,
      available: true,
    },
    {
      type: 'influence',
      label: 'Information Dominance',
      progress: infProgress,
      requirements: infReqs,
      available: true,
    },
    {
      type: 'underdog',
      label: 'Underdog Coalition',
      progress: udProgress,
      requirements: udReqs,
      // Available when player starts below global average or is a known underdog faction
      available: isUnderdogFaction || power < globalAvgPower,
    },
  ]
}
