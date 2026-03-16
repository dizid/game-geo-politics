import type { EventType, EventFrequency, CascadeRisk } from '../types/game'

export interface EventTemplate {
  type: EventType
  name: string
  description: string
  frequency: EventFrequency
  impact: 'low' | 'medium' | 'high' | 'extreme' | 'global'
  cascadeRisk: CascadeRisk
  cascadeTo: { type: EventType; probability: number; delayTurns: number }[]
  minTurn: number // earliest turn this can fire
  weight: number // relative probability weight
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'nuclear_brinkmanship',
    name: 'Nuclear Brinkmanship',
    description: 'Two nuclear powers in a dangerous standoff',
    frequency: 'rare',
    impact: 'extreme',
    cascadeRisk: 'medium',
    cascadeTo: [],
    minTurn: 8,
    weight: 5,
  },
  {
    type: 'economic_crash',
    name: 'Economic Crash',
    description: 'Major financial crisis rocks global markets',
    frequency: 'low',
    impact: 'high',
    cascadeRisk: 'high',
    cascadeTo: [
      { type: 'protest_movement', probability: 0.65, delayTurns: 1 },
      { type: 'regime_change', probability: 0.25, delayTurns: 2 },
    ],
    minTurn: 4,
    weight: 10,
  },
  {
    type: 'regime_change',
    name: 'Regime Change',
    description: 'New leadership dramatically shifts a nation\'s direction',
    frequency: 'low',
    impact: 'high',
    cascadeRisk: 'medium',
    cascadeTo: [
      { type: 'border_incident', probability: 0.40, delayTurns: 1 },
    ],
    minTurn: 5,
    weight: 10,
  },
  {
    type: 'regional_war',
    name: 'Regional War',
    description: 'Armed conflict erupts between rival factions',
    frequency: 'medium',
    impact: 'high',
    cascadeRisk: 'low',
    cascadeTo: [
      { type: 'economic_crash', probability: 0.20, delayTurns: 2 },
    ],
    minTurn: 6,
    weight: 15,
  },
  {
    type: 'trade_dispute',
    name: 'Trade Dispute',
    description: 'Major trade disagreement threatens economic ties',
    frequency: 'medium',
    impact: 'medium',
    cascadeRisk: 'low',
    cascadeTo: [],
    minTurn: 3,
    weight: 20,
  },
  {
    type: 'tech_breakthrough',
    name: 'Tech Breakthrough',
    description: 'Revolutionary technology shifts the balance of power',
    frequency: 'medium',
    impact: 'medium',
    cascadeRisk: 'low',
    cascadeTo: [],
    minTurn: 4,
    weight: 18,
  },
  {
    type: 'pandemic_climate',
    name: 'Global Crisis',
    description: 'Pandemic or climate disaster hits multiple regions',
    frequency: 'low',
    impact: 'global',
    cascadeRisk: 'high',
    cascadeTo: [
      { type: 'economic_crash', probability: 0.50, delayTurns: 1 },
      { type: 'protest_movement', probability: 0.40, delayTurns: 1 },
    ],
    minTurn: 6,
    weight: 8,
  },
  {
    type: 'diplomatic_summit',
    name: 'Diplomatic Summit',
    description: 'Major powers convene for high-stakes negotiations',
    frequency: 'high',
    impact: 'low',
    cascadeRisk: 'none',
    cascadeTo: [],
    minTurn: 2,
    weight: 30,
  },
  {
    type: 'border_incident',
    name: 'Border Incident',
    description: 'Military clash at a contested border',
    frequency: 'high',
    impact: 'medium',
    cascadeRisk: 'medium',
    cascadeTo: [
      { type: 'regional_war', probability: 0.30, delayTurns: 2 },
    ],
    minTurn: 3,
    weight: 25,
  },
  {
    type: 'protest_movement',
    name: 'Protest Movement',
    description: 'Mass unrest challenges internal stability',
    frequency: 'high',
    impact: 'low',
    cascadeRisk: 'none',
    cascadeTo: [],
    minTurn: 3,
    weight: 25,
  },
  {
    type: 'resource_discovery',
    name: 'Resource Discovery',
    description: 'Major natural resource deposit found',
    frequency: 'medium',
    impact: 'medium',
    cascadeRisk: 'medium',
    cascadeTo: [
      { type: 'trade_dispute', probability: 0.35, delayTurns: 1 },
    ],
    minTurn: 4,
    weight: 18,
  },
]

// Scripted narrative beats — guaranteed events at specific turns
export interface ScriptedBeat {
  turn: number
  name: string
  description: string
  narrative: string
}

export const SCRIPTED_BEATS: ScriptedBeat[] = [
  {
    turn: 3,
    name: 'New Order Summit',
    description: 'All factions declare their strategic goals',
    narrative: 'CLASSIFIED SUMMIT — The world\'s major powers have gathered for an unprecedented declaration of strategic intent. Each faction has laid bare its ambitions for the coming decade. The era of ambiguity is over.',
  },
  {
    turn: 10,
    name: 'Mid-Game Crisis',
    description: 'Mandatory high-stakes event targeting the current leader',
    narrative: 'EMERGENCY BROADCAST — A cascading series of events threatens to upend the current world order. The leading power faces unprecedented challenges on multiple fronts. The balance of power hangs by a thread.',
  },
  {
    turn: 17,
    name: 'World on the Brink',
    description: 'Forces cooperation or final confrontation',
    narrative: 'DEFCON 2 — Global tensions have reached a critical threshold. Every nation must now choose: unite against the gathering storm, or seize the chaos for final advantage. There is no middle ground.',
  },
]
