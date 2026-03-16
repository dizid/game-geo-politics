// ─── Diplomatic Message Types ─────────────────────────────────────────────

export type MessageCategory = 'threat' | 'proposal' | 'warning' | 'praise' | 'ultimatum' | 'demand' | 'secret_deal'

export type MessageUrgency = 'routine' | 'priority' | 'flash' | 'critical'

export type MessageStatus = 'unread' | 'read' | 'requires_response' | 'expired' | 'responded'

export type PlayerResponse = 'accept' | 'reject' | 'counter' | 'ignore'

export interface DiplomaticMessage {
  id: string
  fromFactionId: string
  category: MessageCategory
  urgency: MessageUrgency
  status: MessageStatus
  subject: string
  body: string
  turn: number
  expiresAtTurn: number | null
  responseOptions: ResponseOption[]
  consequences: MessageConsequence | null
}

export interface ResponseOption {
  id: PlayerResponse
  label: string
  description: string
  effects: ResponseEffects
}

export interface ResponseEffects {
  relationshipDelta: number
  tensionDelta: number
  statChanges: Partial<{ mil: number; eco: number; dip: number; inf: number }>
}

export interface MessageConsequence {
  description: string
  relationshipDelta: number
  tensionDelta: number
  statChanges: Partial<{ mil: number; eco: number; dip: number; inf: number }>
}

// ─── Ultimatum Types ──────────────────────────────────────────────────────

export interface Ultimatum {
  id: string
  fromFactionId: string
  demand: string
  consequence: string
  turnsRemaining: number
  issuedTurn: number
  resolved: boolean
  escalationLevel: number
  consequenceEffects: MessageConsequence
}

// ─── AI Scheming Types ────────────────────────────────────────────────────

export type SchemeType = 'alliance_formation' | 'economic_warfare' | 'arms_transfer' | 'propaganda_campaign' | 'espionage'

export interface FactionScheme {
  id: string
  factionId: string
  type: SchemeType
  targetFactionId: string
  description: string
  detectedTurn: number
  confidence: number
  isReal: boolean
  turnsUntilExecution: number
  effects: Partial<{ mil: number; eco: number; dip: number; inf: number }>
}

// ─── AI Diplomacy API Response ────────────────────────────────────────────

export interface AIDiplomacyResponse {
  messages: Array<{
    from_faction_id: string
    category: MessageCategory
    urgency: MessageUrgency
    subject: string
    body: string
    expires_in_turns: number | null
    response_options: Array<{
      id: PlayerResponse
      label: string
      description: string
      relationship_delta: number
      tension_delta: number
      stat_changes?: Partial<{ mil: number; eco: number; dip: number; inf: number }>
    }>
    ignore_consequence: {
      description: string
      relationship_delta: number
      tension_delta: number
      stat_changes?: Partial<{ mil: number; eco: number; dip: number; inf: number }>
    } | null
  }>
  schemes: Array<{
    faction_id: string
    type: SchemeType
    target_faction_id: string
    description: string
    turns_until_execution: number
    confidence: number
    is_real: boolean
  }>
}
