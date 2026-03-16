import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryBeat {
  turn: number
  narrative: string
  significance: 'minor' | 'major' | 'critical'
}

export interface StoryThread {
  id: string
  title: string
  involvedFactions: string[]
  status: 'developing' | 'climax' | 'resolved'
  startTurn: number
  lastUpdatedTurn: number
  beats: StoryBeat[]
  tension: number // 0-100
}

// ─── Thread Templates ─────────────────────────────────────────────────────────

interface ThreadTrigger {
  id: string
  title: string
  check: (ctx: ThreadContext) => { fires: boolean; factions: string[]; narrative: string } | null
}

interface ThreadContext {
  turn: number
  factions: Array<{ id: string; mil: number; eco: number; dip: number; inf: number }>
  playerFactionId: string
  worldTension: number
  relationships: Record<string, number> // "a::b" → score
}

const THREAD_TRIGGERS: ThreadTrigger[] = [
  {
    id: 'superpower_rivalry',
    title: 'The New Cold War',
    check: (ctx) => {
      const usa = ctx.factions.find(f => f.id === 'usa')
      const china = ctx.factions.find(f => f.id === 'china')
      if (!usa || !china) return null
      const rel = ctx.relationships['china::usa'] ?? 0
      if (rel < -30 && ctx.turn >= 4) {
        return {
          fires: true,
          factions: ['usa', 'china'],
          narrative: 'Tensions between the US and China have escalated into a full-spectrum rivalry.',
        }
      }
      return null
    },
  },
  {
    id: 'economic_bloc_war',
    title: 'Trade War Escalation',
    check: (ctx) => {
      const topEco = [...ctx.factions].sort((a, b) => b.eco - a.eco).slice(0, 3)
      if (topEco.length < 2) return null
      const relKey = [topEco[0].id, topEco[1].id].sort().join('::')
      const rel = ctx.relationships[relKey] ?? 0
      if (rel < -20 && ctx.turn >= 5) {
        return {
          fires: true,
          factions: [topEco[0].id, topEco[1].id],
          narrative: `Economic tensions between ${topEco[0].id} and ${topEco[1].id} threaten global trade stability.`,
        }
      }
      return null
    },
  },
  {
    id: 'rising_power',
    title: 'The Rise of a New Power',
    check: (ctx) => {
      // Find any faction that has grown significantly
      for (const f of ctx.factions) {
        if (f.id === ctx.playerFactionId) continue
        const power = (f.mil + f.eco + f.dip + f.inf) / 4
        if (power > 75 && ctx.turn >= 6) {
          return {
            fires: true,
            factions: [f.id],
            narrative: `${f.id}'s rapid ascent is reshaping the global order.`,
          }
        }
      }
      return null
    },
  },
  {
    id: 'arms_race',
    title: 'Global Arms Race',
    check: (ctx) => {
      if (ctx.worldTension < 60) return null
      const highMil = ctx.factions.filter(f => f.mil > 75)
      if (highMil.length >= 3 && ctx.turn >= 7) {
        return {
          fires: true,
          factions: highMil.map(f => f.id).slice(0, 3),
          narrative: 'Multiple nations are pouring resources into military buildup. An arms race is underway.',
        }
      }
      return null
    },
  },
  {
    id: 'diplomatic_thaw',
    title: 'Diplomatic Breakthrough',
    check: (ctx) => {
      // Find two hostile factions that are improving relations
      for (const [key, score] of Object.entries(ctx.relationships)) {
        if (score > 30 && ctx.turn >= 5) {
          const [a, b] = key.split('::')
          if (a && b) {
            return {
              fires: true,
              factions: [a, b],
              narrative: `An unexpected diplomatic thaw between ${a} and ${b} opens new possibilities.`,
            }
          }
        }
      }
      return null
    },
  },
  {
    id: 'player_ascent',
    title: 'Your Rise to Power',
    check: (ctx) => {
      const player = ctx.factions.find(f => f.id === ctx.playerFactionId)
      if (!player) return null
      const power = (player.mil + player.eco + player.dip + player.inf) / 4
      if (power > 80 && ctx.turn >= 8) {
        return {
          fires: true,
          factions: [ctx.playerFactionId],
          narrative: 'Your nation\'s growing power has not gone unnoticed. The world watches with a mix of admiration and concern.',
        }
      }
      return null
    },
  },
]

export const useStoryStore = defineStore('story', () => {
  const activeThreads = ref<StoryThread[]>([])
  const completedThreads = ref<StoryThread[]>([])
  const MAX_ACTIVE = 3

  // ─── Computed ──────────────────────────────────────────────────────────────

  const climaxThreads = computed(() => activeThreads.value.filter(t => t.status === 'climax'))

  // ─── Thread Generation ──────────────────────────────────────────────────

  function checkForNewThreads(): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    if (activeThreads.value.length >= MAX_ACTIVE) return

    // Build context
    const relationships: Record<string, number> = {}
    for (const [key, rel] of Object.entries(relStore.relationships)) {
      relationships[key] = rel.score
    }

    const ctx: ThreadContext = {
      turn: gameStore.turn,
      factions: gameStore.factions.map(f => ({ id: f.id, mil: f.mil, eco: f.eco, dip: f.dip, inf: f.inf })),
      playerFactionId: gameStore.playerFactionId ?? '',
      worldTension: gameStore.worldTension,
      relationships,
    }

    // Check triggers that aren't already active
    const activeIds = new Set([...activeThreads.value.map(t => t.id), ...completedThreads.value.map(t => t.id)])

    for (const trigger of THREAD_TRIGGERS) {
      if (activeIds.has(trigger.id)) continue
      if (activeThreads.value.length >= MAX_ACTIVE) break

      const result = trigger.check(ctx)
      if (result?.fires) {
        const thread: StoryThread = {
          id: trigger.id,
          title: trigger.title,
          involvedFactions: result.factions,
          status: 'developing',
          startTurn: gameStore.turn,
          lastUpdatedTurn: gameStore.turn,
          beats: [{ turn: gameStore.turn, narrative: result.narrative, significance: 'major' }],
          tension: 20,
        }
        activeThreads.value.push(thread)
        newsStore.addHeadline(`[STORY] ${trigger.title}: ${result.narrative}`, gameStore.turn)
      }
    }
  }

  // ─── Thread Progression ─────────────────────────────────────────────────

  function progressThreads(): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    for (const thread of activeThreads.value) {
      if (thread.status === 'resolved') continue

      // Increase tension based on world state
      const tensionIncrease = Math.max(1, Math.floor(gameStore.worldTension / 20))
      thread.tension = Math.min(100, thread.tension + tensionIncrease)

      // Generate a beat every 2-3 turns
      const turnsSinceLastBeat = gameStore.turn - thread.lastUpdatedTurn
      if (turnsSinceLastBeat >= 2 && Math.random() > 0.3) {
        const beat = generateBeat(thread, gameStore.turn)
        thread.beats.push(beat)
        thread.lastUpdatedTurn = gameStore.turn

        if (beat.significance !== 'minor') {
          newsStore.addEvent(`[${thread.title}] ${beat.narrative}`, gameStore.turn)
        }
      }

      // Check for climax
      if (thread.tension >= 80 && thread.status === 'developing') {
        thread.status = 'climax'
        newsStore.addCrisis(
          `[STORY CLIMAX] ${thread.title} reaches a critical turning point!`,
          gameStore.turn,
        )
      }

      // Auto-resolve after extended climax
      if (thread.status === 'climax' && thread.tension >= 95) {
        thread.status = 'resolved'
        thread.beats.push({
          turn: gameStore.turn,
          narrative: `The ${thread.title} arc has reached its conclusion.`,
          significance: 'critical',
        })
        completedThreads.value.push(thread)
        newsStore.addHeadline(`[STORY RESOLVED] ${thread.title}`, gameStore.turn)
      }
    }

    // Remove resolved threads from active
    activeThreads.value = activeThreads.value.filter(t => t.status !== 'resolved')
  }

  function generateBeat(thread: StoryThread, turn: number): StoryBeat {
    const significance: StoryBeat['significance'] =
      thread.tension > 70 ? 'critical' :
      thread.tension > 40 ? 'major' : 'minor'

    const developingBeats = [
      `Tensions in the ${thread.title} situation continue to build.`,
      `New developments in the ${thread.title} crisis shift the balance.`,
      `The ${thread.title} situation takes an unexpected turn.`,
      `Multiple factions react to developments in ${thread.title}.`,
      `Intelligence suggests the ${thread.title} is far from over.`,
    ]

    const climaxBeats = [
      `The ${thread.title} reaches a dangerous turning point.`,
      `A critical decision point has arrived in the ${thread.title}.`,
      `The world watches as the ${thread.title} enters its most dangerous phase.`,
    ]

    const beats = thread.status === 'climax' ? climaxBeats : developingBeats
    const narrative = beats[Math.floor(Math.random() * beats.length)]

    return { turn, narrative, significance }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function reset(): void {
    activeThreads.value = []
    completedThreads.value = []
  }

  return {
    activeThreads,
    completedThreads,
    climaxThreads,
    checkForNewThreads,
    progressThreads,
    reset,
  }
})
