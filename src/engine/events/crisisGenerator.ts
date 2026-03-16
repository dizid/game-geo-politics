import type { EventType, CrisisOption, FactionStats } from '../../types/game'

// ─── Option builders ─────────────────────────────────────────────────────────

/**
 * Every crisis produces exactly 4 options: Military, Economic, Diplomatic, Ignore.
 * Stat/tension/relationship values are scaled to the severity of the event type.
 */
export function generateCrisisOptions(
  eventType: EventType,
  targetFactionId: string,
): CrisisOption[] {
  return [
    buildMilitaryOption(eventType, targetFactionId),
    buildEconomicOption(eventType, targetFactionId),
    buildDiplomaticOption(eventType, targetFactionId),
    buildIgnoreOption(eventType),
  ]
}

// ─── Per-option builders ─────────────────────────────────────────────────────

function buildMilitaryOption(eventType: EventType, targetFactionId: string): CrisisOption {
  const { milSelf, tension, relationship } = militaryParams(eventType)

  const statChanges: Partial<FactionStats> = { mil: milSelf }

  return {
    id: 'military',
    label: 'Military Response',
    description: militaryDescription(eventType),
    statChanges,
    tensionChange: tension,
    relationshipChanges: [{ factionId: targetFactionId, change: relationship }],
  }
}

function buildEconomicOption(eventType: EventType, targetFactionId: string): CrisisOption {
  const { ecoSelf, tension, relationship } = economicParams(eventType)

  const statChanges: Partial<FactionStats> = { eco: ecoSelf }

  return {
    id: 'economic',
    label: 'Economic Response',
    description: economicDescription(eventType),
    statChanges,
    tensionChange: tension,
    relationshipChanges: [{ factionId: targetFactionId, change: relationship }],
  }
}

function buildDiplomaticOption(eventType: EventType, targetFactionId: string): CrisisOption {
  const { dipSelf, tension, relationship } = diplomaticParams(eventType)

  const statChanges: Partial<FactionStats> = { dip: dipSelf }

  return {
    id: 'diplomatic',
    label: 'Diplomatic Response',
    description: diplomaticDescription(eventType),
    statChanges,
    tensionChange: tension,
    relationshipChanges: [{ factionId: targetFactionId, change: relationship }],
  }
}

function buildIgnoreOption(eventType: EventType): CrisisOption {
  const { statPenalty, tension } = ignoreParams(eventType)

  const statChanges: Partial<FactionStats> = { inf: statPenalty }

  return {
    id: 'ignore',
    label: 'Ignore Crisis',
    description: ignoreDescription(eventType),
    statChanges,
    tensionChange: tension,
    relationshipChanges: [],
  }
}

// ─── Parameter tables ─────────────────────────────────────────────────────────

interface MilitaryParams { milSelf: number; tension: number; relationship: number }
interface EconomicParams { ecoSelf: number; tension: number; relationship: number }
interface DiplomaticParams { dipSelf: number; tension: number; relationship: number }
interface IgnoreParams { statPenalty: number; tension: number }

function militaryParams(type: EventType): MilitaryParams {
  switch (type) {
    case 'nuclear_brinkmanship': return { milSelf: 5, tension: 12, relationship: -30 }
    case 'regional_war':          return { milSelf: 4, tension: 8,  relationship: -20 }
    case 'border_incident':       return { milSelf: 3, tension: 6,  relationship: -15 }
    case 'economic_crash':        return { milSelf: 1, tension: 4,  relationship: -10 }
    case 'regime_change':         return { milSelf: 3, tension: 5,  relationship: -12 }
    case 'protest_movement':      return { milSelf: 2, tension: 3,  relationship: -8  }
    case 'trade_dispute':         return { milSelf: 1, tension: 3,  relationship: -10 }
    default:                      return { milSelf: 2, tension: 4,  relationship: -10 }
  }
}

function economicParams(type: EventType): EconomicParams {
  switch (type) {
    case 'economic_crash':        return { ecoSelf: 5,  tension: 2,  relationship: -15 }
    case 'trade_dispute':         return { ecoSelf: 4,  tension: 1,  relationship: -10 }
    case 'resource_discovery':    return { ecoSelf: 6,  tension: 2,  relationship: -5  }
    case 'tech_breakthrough':     return { ecoSelf: 5,  tension: -1, relationship: 5   }
    case 'regional_war':          return { ecoSelf: -3, tension: 2,  relationship: -8  }
    case 'pandemic_climate':      return { ecoSelf: -2, tension: 1,  relationship: 5   }
    default:                      return { ecoSelf: 2,  tension: 1,  relationship: -5  }
  }
}

function diplomaticParams(type: EventType): DiplomaticParams {
  switch (type) {
    case 'diplomatic_summit':     return { dipSelf: 5,  tension: -5, relationship: 20  }
    case 'nuclear_brinkmanship':  return { dipSelf: 3,  tension: -8, relationship: 10  }
    case 'regional_war':          return { dipSelf: 2,  tension: -4, relationship: 8   }
    case 'border_incident':       return { dipSelf: 2,  tension: -3, relationship: 8   }
    case 'trade_dispute':         return { dipSelf: 3,  tension: -2, relationship: 12  }
    case 'regime_change':         return { dipSelf: 4,  tension: -3, relationship: 15  }
    case 'protest_movement':      return { dipSelf: 2,  tension: -2, relationship: 5   }
    case 'pandemic_climate':      return { dipSelf: 3,  tension: -3, relationship: 10  }
    default:                      return { dipSelf: 2,  tension: -2, relationship: 8   }
  }
}

function ignoreParams(type: EventType): IgnoreParams {
  switch (type) {
    case 'nuclear_brinkmanship': return { statPenalty: -5, tension: 6  }
    case 'regional_war':         return { statPenalty: -3, tension: 4  }
    case 'economic_crash':       return { statPenalty: -3, tension: 3  }
    case 'pandemic_climate':     return { statPenalty: -4, tension: 3  }
    case 'border_incident':      return { statPenalty: -2, tension: 3  }
    case 'trade_dispute':        return { statPenalty: -2, tension: 1  }
    default:                     return { statPenalty: -2, tension: 2  }
  }
}

// ─── Description copy ────────────────────────────────────────────────────────

function militaryDescription(type: EventType): string {
  switch (type) {
    case 'nuclear_brinkmanship': return 'Deploy strategic assets and issue ultimatum, risking escalation.'
    case 'regional_war':         return 'Intervene with military force to impose resolution.'
    case 'border_incident':      return 'Respond with a show of force along contested borders.'
    case 'economic_crash':       return 'Impose martial law to stabilise the situation.'
    default:                     return 'Respond with military pressure and deterrence.'
  }
}

function economicDescription(type: EventType): string {
  switch (type) {
    case 'economic_crash':    return 'Inject emergency stimulus and coordinate with allied markets.'
    case 'trade_dispute':     return 'Counter with targeted tariffs and trade renegotiations.'
    case 'resource_discovery': return 'Aggressively secure resource rights through economic leverage.'
    case 'tech_breakthrough':  return 'Invest in rapid adoption and strategic licensing deals.'
    default:                   return 'Deploy economic tools — sanctions, aid, or stimulus.'
  }
}

function diplomaticDescription(type: EventType): string {
  switch (type) {
    case 'nuclear_brinkmanship': return 'Open back-channel negotiations to defuse the standoff.'
    case 'diplomatic_summit':    return 'Host the summit and drive the agenda for maximum influence.'
    case 'regional_war':         return 'Lead a multilateral peace initiative with all parties.'
    case 'trade_dispute':        return 'Propose a binding mediation framework with concessions.'
    default:                     return 'Engage through diplomatic channels to de-escalate.'
  }
}

function ignoreDescription(type: EventType): string {
  switch (type) {
    case 'nuclear_brinkmanship': return 'Maintain strategic ambiguity — risky, but avoids entanglement.'
    case 'economic_crash':       return 'Let the crisis burn out without committing resources.'
    case 'regional_war':         return 'Stay neutral and let the conflict resolve itself.'
    default:                     return 'Do nothing and watch the situation develop.'
  }
}
