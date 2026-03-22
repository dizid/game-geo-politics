// ─── Faction Types ─────────────────────────────────────────────────────────

export interface FactionStats {
  mil: number
  eco: number
  dip: number
  inf: number
}

export interface Faction extends FactionStats {
  id: string
  name: string
  flag: string
  color: string
  difficulty: 'Easy' | 'Medium-Easy' | 'Medium' | 'Medium-Hard' | 'Hard' | 'Very Hard'
  passive: FactionPassive
  signature: FactionSignature
  personality: FactionPersonality
}

export interface FactionPassive {
  name: string
  description: string
}

export interface FactionSignature {
  name: string
  description: string
  used: boolean
}

export interface FactionPersonality {
  aggression: number
  diplomacy: number
  economy: number
  coalitionSeeking: number
  grudgeDecayRate: number
}

// ─── Action Types ──────────────────────────────────────────────────────────

export type ActionId = 'sanctions' | 'military' | 'diplomacy' | 'alliance' | 'trade' | 'aid' | 'intel' | 'propaganda'
export type CompoundActionId = 'economicWarfare' | 'strategicPartnership' | 'shadowWar'

export interface GameAction {
  id: ActionId
  label: string
  icon: string
  desc: string
  cost: number
  cooldown: number // 0 = none
  cooldownType: 'target' | 'global' | 'none'
  relevantStat: keyof FactionStats
  effects: ActionEffects
}

export interface CompoundAction {
  id: CompoundActionId
  label: string
  icon: string
  desc: string
  cost: number
  components: ActionId[]
  requirement: string
  requirementCheck: (state: GameState) => boolean
  effects: ActionEffects
}

export interface ActionEffects {
  targetStatChanges: Partial<FactionStats>
  selfStatChanges: Partial<FactionStats>
  tensionChange: number
  relationshipChange: number
}

// ─── Map Types ─────────────────────────────────────────────────────────────

export interface MapRegion {
  pts: string
  lx: number
  ly: number
}

// ─── Coalition Types ───────────────────────────────────────────────────────

export interface Coalition {
  id: string
  name: string
  members: string[] // faction ids
  leader: string // faction id
  cohesion: number // 0-100
  formedTurn: number
  type: 'military' | 'economic' | 'diplomatic' | 'intelligence'
}

export interface CoalitionProposal {
  fromFaction: string
  toFaction: string
  coalitionId?: string // existing coalition to join, or undefined for new
  type: 'military' | 'economic' | 'diplomatic' | 'intelligence'
  turn: number
}

// ─── Relationship Types ────────────────────────────────────────────────────

export interface FactionRelationship {
  factionA: string
  factionB: string
  score: number // -100 to +100
  grudges: RelationshipEvent[]
  gratitudes: RelationshipEvent[]
  tradeDeals: number
  betrayals: number
}

export interface RelationshipEvent {
  turn: number
  actionType: string
  weight: number // decays per turn
  description: string
}

// ─── Event Types ───────────────────────────────────────────────────────────

export type EventType =
  | 'nuclear_brinkmanship'
  | 'economic_crash'
  | 'regime_change'
  | 'regional_war'
  | 'trade_dispute'
  | 'tech_breakthrough'
  | 'pandemic_climate'
  | 'diplomatic_summit'
  | 'border_incident'
  | 'protest_movement'
  | 'resource_discovery'

export type EventFrequency = 'rare' | 'low' | 'medium' | 'high'
export type CascadeRisk = 'none' | 'low' | 'medium' | 'high'

export interface GameEvent {
  type: EventType
  name: string
  description: string
  frequency: EventFrequency
  impact: 'low' | 'medium' | 'high' | 'extreme' | 'global'
  cascadeTo: { type: EventType; probability: number }[]
  affectedFactions: string[]
  statEffects: Partial<FactionStats>
}

export interface CrisisEvent {
  type: EventType
  narrative: string
  targetFaction: string
  options: CrisisOption[]
  turn: number
}

export interface CrisisOption {
  id: string
  label: string
  description: string
  statChanges: Partial<FactionStats>
  tensionChange: number
  relationshipChanges: { factionId: string; change: number }[]
}

// ─── News Types ────────────────────────────────────────────────────────────

export type NewsType = 'headline' | 'outcome' | 'response' | 'reaction' | 'event' | 'system' | 'error' | 'crisis' | 'forecast' | 'intel' | 'diplomacy' | 'covert'

export interface NewsItem {
  type: NewsType
  text: string
  turn: number
  speaker?: string
}

// ─── World Tension ─────────────────────────────────────────────────────────

export type TensionState = 'stable' | 'tense' | 'crisis' | 'brink' | 'war'

// ─── Victory Types ─────────────────────────────────────────────────────────

export type VictoryType = 'domination' | 'diplomatic' | 'economic' | 'influence' | 'underdog'
export type LossType = 'collapse' | 'failed_state' | 'catastrophe'

export interface VictoryProgress {
  type: VictoryType
  label: string
  progress: number // 0-100
  requirements: VictoryRequirement[]
  available: boolean // some are faction-specific
}

export interface VictoryRequirement {
  label: string
  met: boolean
  current: number | string
  target: number | string
}

// ─── Turn Types ────────────────────────────────────────────────────────────

export type GamePhase = 'select' | 'briefing' | 'crisis' | 'action' | 'interrupt' | 'resolution' | 'summary' | 'gameover'
export type TurnPhase = 'tutorial' | 'opening' | 'midgame' | 'endgame' | 'sudden_death'

export interface TurnAction {
  actionId: ActionId | CompoundActionId
  targetFactionId: string
  turn: number
}

// ─── AI Response Schema ────────────────────────────────────────────────────

export interface AIResponse {
  headline: string
  narrative: string
  world_reaction: string
  stat_changes: AIStatChange[]
  ai_reactions: AIReaction[]
  events_triggered: AIEvent[]
  endgame_signal: AIEndgameSignal | null
  forecast: string
}

export interface AIStatChange {
  faction_id: string
  mil_delta: number
  eco_delta: number
  dip_delta: number
  inf_delta: number
  reason: string
}

export interface AIReaction {
  faction_id: string
  action: 'retaliate' | 'condemn' | 'support' | 'opportunize' | 'none'
  narrative: string
  relationship_delta: number
}

export interface AIEvent {
  event_type: string
  affected_factions: string[]
  narrative: string
  cascade_risk: 'low' | 'medium' | 'high'
}

export interface AIEndgameSignal {
  type: 'player_winning' | 'player_losing' | 'coalition_forming_against_player'
  narrative: string
  urgency: 'subtle' | 'clear' | 'urgent'
}

// ─── Tutorial Types ────────────────────────────────────────────────────────

export interface TutorialStep {
  turn: number
  targetElement: string // CSS selector
  message: string
  position: 'top' | 'bottom' | 'left' | 'right'
  action?: string // forced action hint
}

// ─── Power History ─────────────────────────────────────────────────────────

export interface PowerHistoryEntry {
  turn: number
  [factionId: string]: number
}

// ─── Cooldown Tracking ─────────────────────────────────────────────────────

export interface ActionCooldown {
  actionId: ActionId
  targetFactionId?: string
  expiresAtTurn: number
}

// ─── Signature Modifiers ───────────────────────────────────────────────────

/** Active modifiers granted by one-time faction signature abilities */
export interface SignatureModifier {
  /** Which signature effect is active */
  type:
    | 'half_coalition_cost'    // EU: coalition proposals ignore relationship minimum
    | 'coalition_immunity'     // India: immune to hostile coalition formation
    | 'info_war_inverted'      // UK: propaganda actions grant INF instead of costing it
    | 'diplomacy_boost_25pct'  // ASEAN: DIP-tagged actions are 25% more effective
    | 'usa_blocked'            // Latin America: USA skips targeting player
    | 'crash_resistance'       // African Union: economic crashes hit at half strength
  /** Turns remaining (999 = permanent) */
  turnsRemaining: number
}

// ─── Game State (root) ─────────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase
  turn: number
  playerFactionId: string | null
  playerAP: number
  factions: Faction[]
  selectedTargetId: string | null
  selectedActionId: ActionId | CompoundActionId | null
  worldTension: number
  powerHistory: PowerHistoryEntry[]
  cooldowns: ActionCooldown[]
  loading: boolean
  apiKey: string | null
  signatureUsed: boolean
  signatureModifiers: SignatureModifier[]
  dominationStreak: number // consecutive turns at Power >= 85
  failedStateStreak: number // consecutive turns at Power < 30
  actionsUsedOnFactions: Record<string, Set<string>> // for influence victory: track info war targets
  tradePartners: Set<string>
  turnsWithoutWar: number
  lowStatTurns: number // for underdog: turns survived without stat <= 25
}
