import type { MapRegion } from '../types/game'

// 900x450 SVG viewBox — approx equirectangular projection
// x = (lon+180)*2.5, y = (90-lat)*2.5
export const MAP_REGIONS: Record<string, MapRegion> = {
  usa:        { pts: '90,102 288,100 292,172 252,188 130,188 90,162',                                  lx: 192, ly: 143 },
  latam:      { pts: '130,188 252,188 262,225 254,315 225,400 178,428 142,402 120,346 116,268 122,225', lx: 183, ly: 305 },
  uk:         { pts: '388,68 430,64 434,112 386,114',                                                  lx: 410, ly: 90  },
  eu:         { pts: '422,68 530,70 536,168 422,170',                                                  lx: 478, ly: 118 },
  russia:     { pts: '505,30 895,26 895,108 505,108',                                                  lx: 700, ly: 64  },
  middleeast: { pts: '505,108 610,108 614,232 505,232',                                                lx: 558, ly: 168 },
  africa:     { pts: '422,170 502,168 510,232 512,408 414,432 356,408 344,318',                        lx: 432, ly: 295 },
  india:      { pts: '610,108 706,108 703,232 614,232',                                                lx: 656, ly: 168 },
  china:      { pts: '706,108 895,108 895,232 703,232',                                                lx: 798, ly: 168 },
  asean:      { pts: '703,232 895,230 895,370 701,374',                                                lx: 797, ly: 300 },
}

export const SEED_EVENTS = [
  'Naval standoff in disputed waters escalates as both sides deploy additional vessels.',
  'Emergency UN Security Council session called after satellite imagery reveals troop buildup.',
  'Global markets tumble as trade route disruption fears grip investors worldwide.',
  'Secret back-channel negotiations reportedly underway through neutral intermediaries.',
  'Major infrastructure cyberattack attributed to state-sponsored hackers.',
  'Oil pipeline explosion raises suspicions of deliberate sabotage.',
  'Surprise military exercises near contested border unsettle neighboring nations.',
  'International court ruling on territorial dispute rejected by all key parties.',
]
