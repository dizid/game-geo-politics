// ─── Covert Operation Types ───────────────────────────────────────────────────

export type CovertOpType = 'regime_destabilization' | 'economic_sabotage' | 'intelligence_network' | 'proxy_influence' | 'tech_theft'

export interface CovertOpTemplate {
  type: CovertOpType
  name: string
  description: string
  duration: number // turns to complete
  apPerInvestment: number
  progressPerInvestment: number
  baseExposurePerTurn: number // 0-1 probability per turn
  payoff: {
    targetStatChanges: Partial<{ mil: number; eco: number; dip: number; inf: number }>
    selfStatChanges: Partial<{ mil: number; eco: number; dip: number; inf: number }>
    tensionDelta: number
    relationshipDelta: number
  }
  exposurePenalty: {
    relationshipDelta: number
    tensionDelta: number
    selfStatChanges: Partial<{ mil: number; eco: number; dip: number; inf: number }>
  }
}

export const COVERT_OP_TEMPLATES: CovertOpTemplate[] = [
  {
    type: 'regime_destabilization',
    name: 'Regime Destabilization',
    description: 'Fund opposition groups and foment unrest in the target nation',
    duration: 3,
    apPerInvestment: 10,
    progressPerInvestment: 35,
    baseExposurePerTurn: 0.15,
    payoff: {
      targetStatChanges: { dip: -15, inf: -10 },
      selfStatChanges: { inf: 3 },
      tensionDelta: 5,
      relationshipDelta: -30,
    },
    exposurePenalty: {
      relationshipDelta: -40,
      tensionDelta: 8,
      selfStatChanges: { dip: -8, inf: -5 },
    },
  },
  {
    type: 'economic_sabotage',
    name: 'Economic Sabotage',
    description: 'Disrupt supply chains and financial infrastructure covertly',
    duration: 2,
    apPerInvestment: 12,
    progressPerInvestment: 50,
    baseExposurePerTurn: 0.20,
    payoff: {
      targetStatChanges: { eco: -12 },
      selfStatChanges: { eco: 3 },
      tensionDelta: 3,
      relationshipDelta: -25,
    },
    exposurePenalty: {
      relationshipDelta: -35,
      tensionDelta: 6,
      selfStatChanges: { eco: -5, dip: -5 },
    },
  },
  {
    type: 'intelligence_network',
    name: 'Intelligence Network',
    description: 'Build a deep intelligence network inside the target nation',
    duration: 4,
    apPerInvestment: 8,
    progressPerInvestment: 25,
    baseExposurePerTurn: 0.10,
    payoff: {
      targetStatChanges: {},
      selfStatChanges: { inf: 8 },
      tensionDelta: 1,
      relationshipDelta: -10,
    },
    exposurePenalty: {
      relationshipDelta: -20,
      tensionDelta: 4,
      selfStatChanges: { inf: -3 },
    },
  },
  {
    type: 'proxy_influence',
    name: 'Proxy Influence',
    description: 'Secretly cultivate political allies within the target government',
    duration: 3,
    apPerInvestment: 10,
    progressPerInvestment: 33,
    baseExposurePerTurn: 0.18,
    payoff: {
      targetStatChanges: { dip: -8 },
      selfStatChanges: { dip: 5, inf: 3 },
      tensionDelta: 2,
      relationshipDelta: -20,
    },
    exposurePenalty: {
      relationshipDelta: -30,
      tensionDelta: 5,
      selfStatChanges: { dip: -6 },
    },
  },
  {
    type: 'tech_theft',
    name: 'Tech Theft',
    description: 'Steal advanced technology and research data from the target',
    duration: 2,
    apPerInvestment: 12,
    progressPerInvestment: 50,
    baseExposurePerTurn: 0.25,
    payoff: {
      targetStatChanges: { inf: -5 },
      selfStatChanges: { mil: 4, eco: 4 },
      tensionDelta: 2,
      relationshipDelta: -20,
    },
    exposurePenalty: {
      relationshipDelta: -35,
      tensionDelta: 7,
      selfStatChanges: { dip: -8, inf: -3 },
    },
  },
]

export function getCovertOpTemplate(type: CovertOpType): CovertOpTemplate | undefined {
  return COVERT_OP_TEMPLATES.find(t => t.type === type)
}
