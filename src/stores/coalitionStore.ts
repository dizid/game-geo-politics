import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Coalition, CoalitionProposal } from '../types/game'
import { calculatePower } from '../data/factions'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'

export const useCoalitionStore = defineStore('coalition', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const coalitions = ref<Coalition[]>([])
  const proposals = ref<CoalitionProposal[]>([])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function generateId(): string {
    return `coalition_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  // ─── Proposal Management ──────────────────────────────────────────────────

  function proposeCoalition(
    targetFactionId: string,
    type: Coalition['type'],
    existingCoalitionId?: string,
  ): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    if (!gameStore.playerFactionId) return

    const proposal: CoalitionProposal = {
      fromFaction: gameStore.playerFactionId,
      toFaction: targetFactionId,
      coalitionId: existingCoalitionId,
      type,
      turn: gameStore.turn,
    }

    proposals.value.push(proposal)

    newsStore.addSystem(
      `Coalition proposal sent to ${targetFactionId} (${type})`,
      gameStore.turn,
    )
  }

  function acceptProposal(proposalId: number): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const proposal = proposals.value[proposalId]
    if (!proposal) return

    if (proposal.coalitionId) {
      // Join an existing coalition
      const coalition = coalitions.value.find(c => c.id === proposal.coalitionId)
      if (coalition && !coalition.members.includes(proposal.toFaction)) {
        coalition.members.push(proposal.toFaction)
        newsStore.addHeadline(
          `${proposal.toFaction} has joined the ${coalition.name}`,
          gameStore.turn,
        )
      }
    } else {
      // Form a new coalition
      const newCoalition: Coalition = {
        id: generateId(),
        name: `${proposal.fromFaction}-${proposal.toFaction} Pact`,
        members: [proposal.fromFaction, proposal.toFaction],
        leader: proposal.fromFaction,
        cohesion: 70,
        formedTurn: gameStore.turn,
        type: proposal.type,
      }
      coalitions.value.push(newCoalition)
      newsStore.addHeadline(
        `New ${proposal.type} coalition formed: ${newCoalition.name}`,
        gameStore.turn,
      )
    }

    // Remove accepted proposal
    proposals.value.splice(proposalId, 1)
  }

  function rejectProposal(proposalId: number): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const proposal = proposals.value[proposalId]
    if (!proposal) return

    newsStore.addSystem(
      `${proposal.toFaction} rejected coalition proposal from ${proposal.fromFaction}`,
      gameStore.turn,
    )
    proposals.value.splice(proposalId, 1)
  }

  // ─── Coalition Cohesion ───────────────────────────────────────────────────

  function updateCohesion(coalitionId: string, delta: number): void {
    const coalition = coalitions.value.find(c => c.id === coalitionId)
    if (!coalition) return
    coalition.cohesion = Math.max(0, Math.min(100, coalition.cohesion + delta))

    // Auto-dissolve if cohesion collapses
    if (coalition.cohesion === 0) {
      dissolveCoalition(coalitionId)
    }
  }

  // ─── Dissolution / Betrayal ───────────────────────────────────────────────

  function dissolveCoalition(coalitionId: string): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const idx = coalitions.value.findIndex(c => c.id === coalitionId)
    if (idx === -1) return

    const coalition = coalitions.value[idx]
    newsStore.addHeadline(
      `Coalition dissolved: ${coalition.name}`,
      gameStore.turn,
    )
    coalitions.value.splice(idx, 1)
  }

  function betrayCoalition(coalitionId: string): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const coalition = coalitions.value.find(c => c.id === coalitionId)
    if (!coalition || !gameStore.playerFactionId) return

    const playerId = gameStore.playerFactionId

    // Remove player from coalition members
    coalition.members = coalition.members.filter(m => m !== playerId)

    // Apply relationship penalties to all former coalition members
    // (relationship store handles this separately via applyBetrayalPenalty)
    const relStore = useRelationshipStore()
    relStore.applyBetrayalPenalty(playerId)

    newsStore.addHeadline(
      `BETRAYAL — ${playerId} has broken the ${coalition.name}!`,
      gameStore.turn,
    )

    // If no members remain or only one, dissolve
    if (coalition.members.length < 2) {
      dissolveCoalition(coalitionId)
    }
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  const getPlayerCoalitions = computed<Coalition[]>(() => {
    const gameStore = useGameStore()
    if (!gameStore.playerFactionId) return []
    return coalitions.value.filter(c => c.members.includes(gameStore.playerFactionId!))
  })

  function isInCoalitionWith(factionId: string): boolean {
    const gameStore = useGameStore()
    if (!gameStore.playerFactionId) return false
    return coalitions.value.some(
      c =>
        c.members.includes(gameStore.playerFactionId!) &&
        c.members.includes(factionId),
    )
  }

  function coalitionPower(coalitionId: string): number {
    const gameStore = useGameStore()
    const coalition = coalitions.value.find(c => c.id === coalitionId)
    if (!coalition) return 0

    return coalition.members.reduce((total, memberId) => {
      const faction = gameStore.factions.find(f => f.id === memberId)
      return faction ? total + calculatePower(faction) : total
    }, 0)
  }

  /**
   * Evaluate whether AI factions should form a counter-coalition against the player.
   * Triggers if the player's coalition total power exceeds 250.
   */
  function checkCounterCoalition(): boolean {
    const gameStore = useGameStore()
    if (!gameStore.playerFactionId) return false

    const playerCoalitionIds = coalitions.value
      .filter(c => c.members.includes(gameStore.playerFactionId!))
      .map(c => c.id)

    const playerCoalitionPower = playerCoalitionIds.reduce(
      (total, cid) => total + coalitionPower(cid),
      0,
    )

    return playerCoalitionPower > 250
  }

  return {
    // State
    coalitions,
    proposals,
    // Computed
    getPlayerCoalitions,
    // Actions
    proposeCoalition,
    acceptProposal,
    rejectProposal,
    updateCohesion,
    dissolveCoalition,
    betrayCoalition,
    isInCoalitionWith,
    coalitionPower,
    checkCounterCoalition,
  }
})
