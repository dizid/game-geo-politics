import type { Faction } from '../types/game'

export const FACTIONS: Faction[] = [
  {
    id: 'usa',
    name: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    color: '#4f9eff',
    mil: 95, eco: 90, dip: 80, inf: 88,
    difficulty: 'Easy',
    passive: { name: 'Dollar Reserve', description: 'Trade Deals give +2 ECO passively' },
    signature: { name: 'Global Policeman', description: 'Force any Regional War to end', used: false },
    personality: { aggression: 0.7, diplomacy: 0.6, economy: 0.8, coalitionSeeking: 0.5, grudgeDecayRate: 0.10 },
  },
  {
    id: 'china',
    name: 'China',
    flag: '\u{1F1E8}\u{1F1F3}',
    color: '#ff5555',
    mil: 85, eco: 88, dip: 65, inf: 75,
    difficulty: 'Medium-Easy',
    passive: { name: 'Belt & Road', description: 'Foreign Aid costs -3 AP' },
    signature: { name: 'Debt Diplomacy', description: 'Convert enemy Trade Deal into Influence drain', used: false },
    personality: { aggression: 0.6, diplomacy: 0.4, economy: 0.9, coalitionSeeking: 0.3, grudgeDecayRate: 0.08 },
  },
  {
    id: 'eu',
    name: 'European Union',
    flag: '\u{1F1EA}\u{1F1FA}',
    color: '#00d4ff',
    mil: 65, eco: 85, dip: 88, inf: 72,
    difficulty: 'Medium-Easy',
    passive: { name: 'Collective Weight', description: 'Coalition members add +1 to all EU stats' },
    signature: { name: 'Enlargement', description: 'Recruit to coalition at half relationship cost', used: false },
    personality: { aggression: 0.2, diplomacy: 0.9, economy: 0.7, coalitionSeeking: 0.9, grudgeDecayRate: 0.20 },
  },
  {
    id: 'india',
    name: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    color: '#ff8c42',
    mil: 72, eco: 75, dip: 70, inf: 65,
    difficulty: 'Medium',
    passive: { name: 'Non-Alignment', description: 'Can join competing coalitions simultaneously' },
    signature: { name: 'Strategic Autonomy', description: 'Immune to counter-coalition for 5 turns', used: false },
    personality: { aggression: 0.4, diplomacy: 0.7, economy: 0.8, coalitionSeeking: 0.6, grudgeDecayRate: 0.12 },
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    color: '#a5b4fc',
    mil: 70, eco: 72, dip: 78, inf: 68,
    difficulty: 'Medium',
    passive: { name: 'Special Relationship', description: 'USA starts at 60 relationship' },
    signature: { name: 'Soft Power', description: 'Info War generates INF instead of costing it', used: false },
    personality: { aggression: 0.3, diplomacy: 0.8, economy: 0.6, coalitionSeeking: 0.7, grudgeDecayRate: 0.15 },
  },
  {
    id: 'russia',
    name: 'Russia',
    flag: '\u{1F1F7}\u{1F1FA}',
    color: '#bf7fff',
    mil: 82, eco: 58, dip: 52, inf: 72,
    difficulty: 'Medium-Hard',
    passive: { name: 'Energy Leverage', description: 'Sanctions against Russia cost +3 AP' },
    signature: { name: 'Hybrid Warfare', description: 'Info War + Intel Op combined in one action', used: false },
    personality: { aggression: 0.9, diplomacy: 0.3, economy: 0.5, coalitionSeeking: 0.4, grudgeDecayRate: 0.05 },
  },
  {
    id: 'middleeast',
    name: 'Middle East',
    flag: '\u{262A}\u{FE0F}',
    color: '#ffd700',
    mil: 68, eco: 74, dip: 50, inf: 62,
    difficulty: 'Hard',
    passive: { name: 'Energy Broker', description: 'Passive +2 ECO/turn' },
    signature: { name: 'Oil Shock', description: 'All non-allied factions -10 ECO', used: false },
    personality: { aggression: 0.7, diplomacy: 0.4, economy: 0.8, coalitionSeeking: 0.3, grudgeDecayRate: 0.10 },
  },
  {
    id: 'asean',
    name: 'ASEAN',
    flag: '\u{1F30F}',
    color: '#2dd4bf',
    mil: 55, eco: 72, dip: 68, inf: 58,
    difficulty: 'Hard',
    passive: { name: 'ASEAN Centrality', description: 'Host crisis summits for free' },
    signature: { name: 'Quiet Diplomacy', description: 'All DIP actions +25% effectiveness', used: false },
    personality: { aggression: 0.3, diplomacy: 0.7, economy: 0.8, coalitionSeeking: 0.7, grudgeDecayRate: 0.15 },
  },
  {
    id: 'latam',
    name: 'Latin America',
    flag: '\u{1F30E}',
    color: '#f472b6',
    mil: 52, eco: 62, dip: 65, inf: 55,
    difficulty: 'Hard',
    passive: { name: 'Regional Solidarity', description: 'Aid to LA factions costs 0 AP' },
    signature: { name: 'Monroe Doctrine Reversal', description: 'USA cannot target LA for 5 turns', used: false },
    personality: { aggression: 0.3, diplomacy: 0.6, economy: 0.6, coalitionSeeking: 0.6, grudgeDecayRate: 0.12 },
  },
  {
    id: 'africa',
    name: 'African Union',
    flag: '\u{1F30D}',
    color: '#4ade80',
    mil: 48, eco: 52, dip: 62, inf: 55,
    difficulty: 'Very Hard',
    passive: { name: 'Demographic Dividend', description: 'Passive +1 ECO/turn growth' },
    signature: { name: 'Resource Nationalism', description: 'Economic crashes hit AU at half strength', used: false },
    personality: { aggression: 0.2, diplomacy: 0.6, economy: 0.5, coalitionSeeking: 0.8, grudgeDecayRate: 0.15 },
  },
]

export function calculatePower(stats: { mil: number; eco: number; dip: number; inf: number }): number {
  return Math.round((stats.mil + stats.eco + stats.dip + stats.inf) / 4)
}

export function getFactionById(factions: Faction[], id: string): Faction | undefined {
  return factions.find(f => f.id === id)
}

// Bottom 4 factions eligible for underdog victory
export const UNDERDOG_FACTIONS = ['middleeast', 'asean', 'latam', 'africa']
