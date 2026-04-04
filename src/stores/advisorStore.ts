import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GameState } from '../types/game'
import { useGameStore } from './gameStore'
import { useCoalitionStore } from './coalitionStore'
import { useRelationshipStore } from './relationshipStore'
import { getVictoryProgress } from '../engine/balance/victoryDetector'
import { getAdvisorHints, type AdvisorHint } from '../engine/ai/advisorEngine'

export const useAdvisorStore = defineStore('advisor', () => {
  // ─── State ────────────────────────────────────────────────────────────────

  const enabled = ref<boolean>(true)
  /** True when the player has dismissed the current top hint */
  const dismissed = ref<boolean>(false)

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build a GameState snapshot from the game store, matching the same pattern
   * used in GameOver.vue and VictoryTracker.vue.
   */
  function buildGameState(gameStore: ReturnType<typeof useGameStore>): GameState {
    return {
      phase: gameStore.phase,
      turn: gameStore.turn,
      playerFactionId: gameStore.playerFactionId,
      playerAP: gameStore.playerAP,
      factions: gameStore.factions,
      selectedTargetId: gameStore.selectedTargetId,
      selectedActionId: gameStore.selectedActionId,
      worldTension: gameStore.worldTension,
      powerHistory: gameStore.powerHistory,
      cooldowns: gameStore.cooldowns,
      loading: gameStore.loading,
      apiKey: gameStore.apiKey,
      signatureUsed: gameStore.signatureUsed,
      signatureModifiers: gameStore.signatureModifiers,
      dominationStreak: gameStore.dominationStreak,
      failedStateStreak: gameStore.failedStateStreak,
      actionsUsedOnFactions: gameStore.actionsUsedOnFactions,
      tradePartners: gameStore.tradePartners,
      turnsWithoutWar: gameStore.turnsWithoutWar,
      lowStatTurns: gameStore.lowStatTurns,
      difficulty: gameStore.difficulty,
    }
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  /**
   * Reactively computes advisor hints from current game state.
   * Auto-updates whenever any store value changes.
   */
  const hints = computed<AdvisorHint[]>(() => {
    if (!enabled.value) return []

    const gameStore = useGameStore()
    const coalitionStore = useCoalitionStore()
    const relStore = useRelationshipStore()

    // Only provide hints during the action phase
    if (gameStore.phase !== 'action') return []
    // No player faction selected yet
    if (!gameStore.playerFactionId) return []

    const gameState = buildGameState(gameStore)
    const relationships = Object.values(relStore.relationships)
    const progress = getVictoryProgress(gameState, coalitionStore.coalitions, relationships)

    return getAdvisorHints(
      gameState,
      coalitionStore.coalitions,
      relationships,
      progress,
      gameStore.actionsThisTurn,
    )
  })

  /** The single most urgent hint for display in the HUD. */
  const topHint = computed<AdvisorHint | null>(() => hints.value[0] ?? null)

  // ─── Turn watch ───────────────────────────────────────────────────────────

  /**
   * Reset dismissed state when the turn advances so fresh hints are shown
   * at the start of each new turn.
   */
  const gameStore = useGameStore()
  watch(
    () => gameStore.turn,
    () => { dismissed.value = false },
  )

  // ─── Actions ──────────────────────────────────────────────────────────────

  function dismiss(): void {
    dismissed.value = true
  }

  function resetDismiss(): void {
    dismissed.value = false
  }

  function toggle(): void {
    enabled.value = !enabled.value
  }

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    enabled,
    dismissed,
    hints,
    topHint,
    dismiss,
    resetDismiss,
    toggle,
  }
})
