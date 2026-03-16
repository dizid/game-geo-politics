import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FactionRelationship, RelationshipEvent } from '../types/game'
import { FACTIONS } from '../data/factions'
import { useGameStore } from './gameStore'

// Canonical pair key — always sorted so A < B lexicographically
function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

function emptyRelationship(a: string, b: string): FactionRelationship {
  return {
    factionA: a < b ? a : b,
    factionB: a < b ? b : a,
    score: 0,
    grudges: [],
    gratitudes: [],
    tradeDeals: 0,
    betrayals: 0,
  }
}

export const useRelationshipStore = defineStore('relationship', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  // Keyed by canonical pair key ("a::b" where a < b lexicographically)
  const relationships = ref<Record<string, FactionRelationship>>({})

  // ─── Init ─────────────────────────────────────────────────────────────────

  /** Initialise all faction pairs at 0. Must be called at game start. */
  function initRelationships(): void {
    relationships.value = {}

    for (let i = 0; i < FACTIONS.length; i++) {
      for (let j = i + 1; j < FACTIONS.length; j++) {
        const a = FACTIONS[i].id
        const b = FACTIONS[j].id
        relationships.value[pairKey(a, b)] = emptyRelationship(a, b)
      }
    }
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  function getRelationship(factionA: string, factionB: string): number {
    const key = pairKey(factionA, factionB)
    return relationships.value[key]?.score ?? 0
  }

  function getRelationshipRecord(
    factionA: string,
    factionB: string,
  ): FactionRelationship | null {
    return relationships.value[pairKey(factionA, factionB)] ?? null
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  function updateRelationship(
    factionA: string,
    factionB: string,
    delta: number,
    reason: string,
  ): void {
    const key = pairKey(factionA, factionB)

    if (!relationships.value[key]) {
      relationships.value[key] = emptyRelationship(factionA, factionB)
    }

    const rel = relationships.value[key]
    rel.score = Math.max(-100, Math.min(100, rel.score + delta))

    // Auto-add grudge or gratitude event based on direction
    const gameStore = useGameStore()
    const event: RelationshipEvent = {
      turn: gameStore.turn,
      actionType: reason,
      weight: Math.abs(delta),
      description: reason,
    }

    if (delta < 0) {
      rel.grudges.push(event)
    } else if (delta > 0) {
      rel.gratitudes.push(event)
    }
  }

  function addGrudge(
    factionA: string,
    factionB: string,
    event: RelationshipEvent,
  ): void {
    const key = pairKey(factionA, factionB)
    if (!relationships.value[key]) {
      relationships.value[key] = emptyRelationship(factionA, factionB)
    }
    relationships.value[key].grudges.push(event)
    relationships.value[key].score = Math.max(
      -100,
      relationships.value[key].score - event.weight,
    )
  }

  function addGratitude(
    factionA: string,
    factionB: string,
    event: RelationshipEvent,
  ): void {
    const key = pairKey(factionA, factionB)
    if (!relationships.value[key]) {
      relationships.value[key] = emptyRelationship(factionA, factionB)
    }
    relationships.value[key].gratitudes.push(event)
    relationships.value[key].score = Math.min(
      100,
      relationships.value[key].score + event.weight,
    )
  }

  // ─── Decay ────────────────────────────────────────────────────────────────

  /**
   * Apply grudge/gratitude weight decay for each faction pair.
   * Uses the grudgeDecayRate from the faction with the lower rate (more persistent).
   */
  function decayRelationships(turn: number): void {
    const factionMap = new Map(FACTIONS.map(f => [f.id, f]))

    for (const key of Object.keys(relationships.value)) {
      const rel = relationships.value[key]

      // Determine decay rate as the average of both factions' grudge decay rates
      const fA = factionMap.get(rel.factionA)
      const fB = factionMap.get(rel.factionB)
      const decayRate = fA && fB
        ? (fA.personality.grudgeDecayRate + fB.personality.grudgeDecayRate) / 2
        : 0.1

      // Decay grudge weights
      rel.grudges = rel.grudges
        .map(g => ({ ...g, weight: g.weight * (1 - decayRate) }))
        .filter(g => g.weight > 0.5) // prune negligible grudges

      // Decay gratitude weights
      rel.gratitudes = rel.gratitudes
        .map(g => ({ ...g, weight: g.weight * (1 - decayRate) }))
        .filter(g => g.weight > 0.5)

      // Gently nudge the relationship score toward 0 over time
      if (rel.score > 0) {
        rel.score = Math.max(0, rel.score - decayRate * 5)
      } else if (rel.score < 0) {
        rel.score = Math.min(0, rel.score + decayRate * 5)
      }

      // Suppress unused variable warning — turn is used for context in callers
      void turn
    }
  }

  // ─── Betrayal Penalty ─────────────────────────────────────────────────────

  /**
   * Apply betrayal penalty:
   * - Floor relationship with betrayed faction at -50
   * - -8 with all other factions
   */
  function applyBetrayalPenalty(factionId: string): void {
    const gameStore = useGameStore()

    for (const key of Object.keys(relationships.value)) {
      const rel = relationships.value[key]
      const isInvolved = rel.factionA === factionId || rel.factionB === factionId

      if (!isInvolved) continue

      if (
        (rel.factionA === factionId && rel.factionB === gameStore.playerFactionId) ||
        (rel.factionB === factionId && rel.factionA === gameStore.playerFactionId)
      ) {
        // Direct betrayal target — floor at -50
        rel.score = Math.min(rel.score, -50)
      } else {
        // All others learn of the betrayal — -8 reputation
        rel.score = Math.max(-100, rel.score - 8)
      }

      // Increment betrayal counter
      rel.betrayals += 1

      // Record the event
      const event: RelationshipEvent = {
        turn: gameStore.turn,
        actionType: 'betrayal',
        weight: 30,
        description: `${factionId} betrayed a coalition`,
      }
      rel.grudges.push(event)
    }
  }

  return {
    // State
    relationships,
    // Actions
    initRelationships,
    getRelationship,
    getRelationshipRecord,
    updateRelationship,
    addGrudge,
    addGratitude,
    decayRelationships,
    applyBetrayalPenalty,
  }
})
