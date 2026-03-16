import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  GameEvent,
  CrisisEvent,
  CrisisOption,
  EventType,
  Faction,
  TensionState,
} from '../types/game'
import { EVENT_TEMPLATES, SCRIPTED_BEATS } from '../data/events'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'

// ─── Internal queue entry type ──────────────────────────────────────────────

interface QueuedEvent {
  event: GameEvent
  fireAtTurn: number
}

export const useEventStore = defineStore('event', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const eventQueue = ref<QueuedEvent[]>([])
  const activeEvents = ref<GameEvent[]>([])
  const activeCrisis = ref<CrisisEvent | null>(null)

  // ─── Event Queue ──────────────────────────────────────────────────────────

  function addToQueue(event: GameEvent, delayTurns: number): void {
    const gameStore = useGameStore()
    eventQueue.value.push({
      event,
      fireAtTurn: gameStore.turn + delayTurns,
    })
  }

  // ─── Turn Event Generation ────────────────────────────────────────────────

  /**
   * Roll random events for the current turn.
   * Uses weighted selection — higher weight = more likely to fire.
   * High world tension increases the probability of negative events.
   */
  function generateTurnEvents(
    turn: number,
    factions: Faction[],
    tension: TensionState,
  ): GameEvent[] {
    const newsStore = useNewsStore()
    const gameStore = useGameStore()

    // Filter eligible templates by minTurn
    const eligible = EVENT_TEMPLATES.filter(t => t.minTurn <= turn)
    if (eligible.length === 0) return []

    // Tension multiplier: more events fire during crisis/war
    const tensionMultiplier: Record<TensionState, number> = {
      stable: 0.3,
      tense: 0.5,
      crisis: 0.7,
      brink: 0.9,
      war: 1.0,
    }
    const fireChance = tensionMultiplier[tension]

    // Roll once per turn — pick one event based on weighted random
    const roll = Math.random()
    if (roll > fireChance) return []

    // Weighted selection
    const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0)
    let cursor = Math.random() * totalWeight

    const selected = eligible.find(t => {
      cursor -= t.weight
      return cursor <= 0
    })

    if (!selected) return []

    // Build GameEvent from template
    const affectedFactions = pickAffectedFactions(factions, selected.type)
    const statEffects = deriveStatEffects(selected.impact)

    const event: GameEvent = {
      type: selected.type,
      name: selected.name,
      description: selected.description,
      frequency: selected.frequency,
      impact: selected.impact,
      cascadeTo: selected.cascadeTo.map(c => ({ type: c.type, probability: c.probability })),
      affectedFactions: affectedFactions.map(f => f.id),
      statEffects,
    }

    activeEvents.value.push(event)

    // Apply stat effects to affected factions
    for (const faction of affectedFactions) {
      gameStore.applyStatChanges(faction.id, statEffects)
    }

    newsStore.addEvent(`${event.name}: ${event.description}`, turn)

    // Schedule cascades
    for (const cascade of selected.cascadeTo) {
      if (Math.random() < cascade.probability) {
        const cascadeTemplate = EVENT_TEMPLATES.find(t => t.type === cascade.type)
        if (cascadeTemplate) {
          const cascadeEvent: GameEvent = {
            type: cascadeTemplate.type,
            name: cascadeTemplate.name,
            description: cascadeTemplate.description,
            frequency: cascadeTemplate.frequency,
            impact: cascadeTemplate.impact,
            cascadeTo: cascadeTemplate.cascadeTo.map(c => ({
              type: c.type,
              probability: c.probability,
            })),
            affectedFactions: affectedFactions.map(f => f.id),
            statEffects: deriveStatEffects(cascadeTemplate.impact),
          }
          addToQueue(cascadeEvent, cascade.delayTurns)
        }
      }
    }

    return [event]
  }

  // ─── Scripted Beats ───────────────────────────────────────────────────────

  /**
   * Check whether a scripted narrative beat fires this turn.
   * Returns the beat if it fires, null otherwise.
   */
  function checkScriptedBeat(turn: number): typeof SCRIPTED_BEATS[number] | null {
    const newsStore = useNewsStore()
    const beat = SCRIPTED_BEATS.find(b => b.turn === turn)
    if (!beat) return null

    newsStore.addHeadline(`[SCRIPTED] ${beat.name}: ${beat.narrative}`, turn)
    return beat
  }

  // ─── Crisis Generation ────────────────────────────────────────────────────

  /**
   * Generate a crisis event targeting a specific faction.
   * Always produces 4 response options for the player.
   */
  function generateCrisis(targetFaction: Faction, turn: number): CrisisEvent {
    const newsStore = useNewsStore()

    // Pick a crisis-appropriate event type based on faction stats
    const crisisType = pickCrisisType(targetFaction)

    const options: CrisisOption[] = buildCrisisOptions(crisisType, targetFaction)

    const crisis: CrisisEvent = {
      type: crisisType,
      narrative: buildCrisisNarrative(crisisType, targetFaction),
      targetFaction: targetFaction.id,
      options,
      turn,
    }

    activeCrisis.value = crisis
    newsStore.addCrisis(
      `CRISIS ALERT — ${crisis.narrative}`,
      turn,
    )

    return crisis
  }

  function resolveCrisis(optionId: string): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const relStore = useRelationshipStore()

    if (!activeCrisis.value) return

    const option = activeCrisis.value.options.find(o => o.id === optionId)
    if (!option) return

    // Apply player stat changes
    if (gameStore.playerFactionId) {
      gameStore.applyStatChanges(gameStore.playerFactionId, option.statChanges)
    }

    // Apply tension change
    gameStore.worldTension = Math.max(
      0,
      Math.min(100, gameStore.worldTension + option.tensionChange),
    )

    // Apply relationship changes
    for (const rc of option.relationshipChanges) {
      if (gameStore.playerFactionId) {
        relStore.updateRelationship(
          gameStore.playerFactionId,
          rc.factionId,
          rc.change,
          `Crisis resolution: ${option.label}`,
        )
      }
    }

    newsStore.addOutcome(
      `Crisis resolved via "${option.label}": ${option.description}`,
      gameStore.turn,
    )

    activeCrisis.value = null
  }

  // ─── Cascade Processing ───────────────────────────────────────────────────

  /**
   * Fire any queued events that are scheduled for the current turn.
   */
  function processCascades(turn: number): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    const due = eventQueue.value.filter(q => q.fireAtTurn <= turn)
    eventQueue.value = eventQueue.value.filter(q => q.fireAtTurn > turn)

    for (const queued of due) {
      const event = queued.event
      activeEvents.value.push(event)

      // Apply stat effects to affected factions
      for (const factionId of event.affectedFactions) {
        gameStore.applyStatChanges(factionId, event.statEffects)
      }

      newsStore.addEvent(
        `[CASCADE] ${event.name}: ${event.description}`,
        gameStore.turn,
      )
    }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  /** Pick 1–3 factions most relevant to the given event type */
  function pickAffectedFactions(factions: Faction[], type: EventType): Faction[] {
    const all = [...factions]

    // Some events target high-stat factions; others target weaker ones
    const adversarialTypes: EventType[] = [
      'economic_crash',
      'nuclear_brinkmanship',
      'regional_war',
      'regime_change',
    ]

    if (adversarialTypes.includes(type)) {
      // Prefer high-power factions for dramatic events
      all.sort((a, b) => (b.mil + b.eco) - (a.mil + a.eco))
    } else {
      // Shuffle for neutral/positive events
      all.sort(() => Math.random() - 0.5)
    }

    return all.slice(0, Math.floor(Math.random() * 2) + 1)
  }

  /** Derive numeric stat effects from impact level */
  function deriveStatEffects(
    impact: GameEvent['impact'],
  ): Partial<{ mil: number; eco: number; dip: number; inf: number }> {
    const magnitude: Record<typeof impact, number> = {
      low: 2,
      medium: 5,
      high: 10,
      extreme: 18,
      global: 12,
    }

    const m = magnitude[impact]
    // Negative effects — most world events are destabilising
    return { eco: -m, dip: -Math.floor(m / 2) }
  }

  /** Pick a crisis type appropriate for the target faction's weak stats */
  function pickCrisisType(faction: Faction): EventType {
    const minStat = Math.min(faction.mil, faction.eco, faction.dip, faction.inf)

    if (minStat === faction.mil) return 'regional_war'
    if (minStat === faction.eco) return 'economic_crash'
    if (minStat === faction.dip) return 'diplomatic_summit'
    return 'protest_movement'
  }

  function buildCrisisNarrative(type: EventType, faction: Faction): string {
    const narratives: Record<EventType, string> = {
      nuclear_brinkmanship: `A dangerous nuclear standoff has emerged involving ${faction.name}. The world holds its breath.`,
      economic_crash: `${faction.name}'s economy is on the verge of collapse. Markets are in freefall.`,
      regime_change: `Internal upheaval threatens to topple the government of ${faction.name}.`,
      regional_war: `Armed conflict has erupted near ${faction.name}'s borders. Intervention may be required.`,
      trade_dispute: `A major trade rupture with ${faction.name} threatens global supply chains.`,
      tech_breakthrough: `${faction.name} has made a technological leap that could shift the balance of power.`,
      pandemic_climate: `A global health and climate crisis is hammering ${faction.name} and its neighbours.`,
      diplomatic_summit: `${faction.name} is hosting an emergency summit — your response will define the agenda.`,
      border_incident: `A military clash at ${faction.name}'s border risks escalation. Every minute counts.`,
      protest_movement: `Mass protests are erupting inside ${faction.name}. The regime's stability is uncertain.`,
      resource_discovery: `A major resource discovery in ${faction.name}'s territory is drawing rival powers in.`,
    }
    return narratives[type]
  }

  /** Build 4 distinct response options for a crisis */
  function buildCrisisOptions(type: EventType, faction: Faction): CrisisOption[] {
    // Generic option templates scaled by crisis type
    const options: CrisisOption[] = [
      {
        id: 'intervene',
        label: 'Intervene Militarily',
        description: 'Deploy force to stabilise the situation — costly but decisive.',
        statChanges: { mil: -5, inf: 3 },
        tensionChange: 8,
        relationshipChanges: [
          { factionId: faction.id, change: -15 },
        ],
      },
      {
        id: 'diplomatic',
        label: 'Lead Diplomatic Effort',
        description: 'Convene talks and apply pressure through dialogue.',
        statChanges: { dip: 3, inf: 2 },
        tensionChange: -5,
        relationshipChanges: [
          { factionId: faction.id, change: 10 },
        ],
      },
      {
        id: 'sanction',
        label: 'Impose Sanctions',
        description: 'Economic pressure without direct confrontation.',
        statChanges: { eco: -3, inf: 1 },
        tensionChange: 3,
        relationshipChanges: [
          { factionId: faction.id, change: -10 },
        ],
      },
      {
        id: 'abstain',
        label: 'Stay Out of It',
        description: 'Let events unfold — preserve resources but lose influence.',
        statChanges: { inf: -4 },
        tensionChange: -2,
        relationshipChanges: [],
      },
    ]

    // Adjust options based on crisis type
    if (type === 'economic_crash') {
      options[0].label = 'Emergency Bailout'
      options[0].description = 'Flood liquidity to prevent contagion.'
      options[0].statChanges = { eco: -8, inf: 4 }
      options[0].tensionChange = -3
      options[0].relationshipChanges = [{ factionId: faction.id, change: 20 }]
    }

    if (type === 'regional_war') {
      options[1].label = 'Broker Ceasefire'
      options[1].description = 'Negotiate a stop to the fighting.'
      options[1].statChanges = { dip: 5 }
      options[1].tensionChange = -8
    }

    return options
  }

  return {
    // State
    eventQueue,
    activeEvents,
    activeCrisis,
    // Actions
    addToQueue,
    generateTurnEvents,
    checkScriptedBeat,
    generateCrisis,
    resolveCrisis,
    processCascades,
  }
})
