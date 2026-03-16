import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GamePhase,
  TurnPhase,
  TensionState,
  ActionId,
  CompoundActionId,
  Faction,
  ActionCooldown,
  PowerHistoryEntry,
} from '../types/game'
import { FACTIONS, calculatePower } from '../data/factions'
import { ACTIONS, COMPOUND_ACTIONS, getActionById, getCompoundActionById } from '../data/actions'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'

export const useGameStore = defineStore('game', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const phase = ref<GamePhase>('select')
  const turn = ref<number>(0)
  const playerFactionId = ref<string | null>(null)
  const playerAP = ref<number>(80)
  const factions = ref<Faction[]>(structuredClone(FACTIONS))
  const selectedTargetId = ref<string | null>(null)
  const selectedActionId = ref<ActionId | CompoundActionId | null>(null)
  const worldTension = ref<number>(30)
  const powerHistory = ref<PowerHistoryEntry[]>([])
  const cooldowns = ref<ActionCooldown[]>([])
  const loading = ref<boolean>(false)
  const apiKey = ref<string | null>(null)
  const signatureUsed = ref<boolean>(false)
  const dominationStreak = ref<number>(0)
  const failedStateStreak = ref<number>(0)
  // Track which factions each action has been used on (for influence victory)
  const actionsUsedOnFactions = ref<Record<string, Set<string>>>({})
  const tradePartners = ref<Set<string>>(new Set())
  const turnsWithoutWar = ref<number>(0)
  const lowStatTurns = ref<number>(0)

  // ─── Getters ─────────────────────────────────────────────────────────────

  const playerFaction = computed<Faction | null>(() => {
    if (!playerFactionId.value) return null
    return factions.value.find(f => f.id === playerFactionId.value) ?? null
  })

  const targetFaction = computed<Faction | null>(() => {
    if (!selectedTargetId.value) return null
    return factions.value.find(f => f.id === selectedTargetId.value) ?? null
  })

  /** Which narrative phase of the game we're in based on turn count */
  const turnPhase = computed<TurnPhase>(() => {
    const t = turn.value
    if (t <= 2) return 'tutorial'
    if (t <= 6) return 'opening'
    if (t <= 14) return 'midgame'
    if (t <= 19) return 'endgame'
    return 'sudden_death'
  })

  /** Qualitative tension state derived from worldTension (0–100) */
  const tensionState = computed<TensionState>(() => {
    const w = worldTension.value
    if (w < 20) return 'stable'
    if (w < 40) return 'tense'
    if (w < 60) return 'crisis'
    if (w < 80) return 'brink'
    return 'war'
  })

  /** Whether the player can execute the currently selected action */
  const canExecute = computed<boolean>(() => {
    if (!selectedTargetId.value || !selectedActionId.value) return false
    if (loading.value) return false

    const id = selectedActionId.value

    // Find action cost
    const baseAction = getActionById(id)
    const compoundAction = getCompoundActionById(id)
    const action = baseAction ?? compoundAction
    if (!action) return false

    if (playerAP.value < action.cost) return false

    // Check cooldown
    return !isOnCooldown(id, selectedTargetId.value)
  })

  // ─── Cooldown Helpers ─────────────────────────────────────────────────────

  function isOnCooldown(actionId: ActionId | CompoundActionId, targetId: string): boolean {
    const baseAction = getActionById(actionId)
    if (!baseAction || baseAction.cooldownType === 'none') return false

    return cooldowns.value.some(cd => {
      if (cd.actionId !== actionId) return false
      if (cd.expiresAtTurn <= turn.value) return false
      if (baseAction.cooldownType === 'target') return cd.targetFactionId === targetId
      if (baseAction.cooldownType === 'global') return true
      return false
    })
  }

  function registerCooldown(actionId: ActionId, targetId: string): void {
    const baseAction = getActionById(actionId)
    if (!baseAction || baseAction.cooldownType === 'none' || baseAction.cooldown === 0) return

    cooldowns.value.push({
      actionId,
      targetFactionId: baseAction.cooldownType === 'target' ? targetId : undefined,
      expiresAtTurn: turn.value + baseAction.cooldown,
    })
  }

  function clearExpiredCooldowns(): void {
    cooldowns.value = cooldowns.value.filter(cd => cd.expiresAtTurn > turn.value)
  }

  // ─── Game Init ────────────────────────────────────────────────────────────

  function startGame(factionId: string): void {
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    // Reset all state
    phase.value = 'briefing'
    turn.value = 1
    playerFactionId.value = factionId
    playerAP.value = 80
    factions.value = structuredClone(FACTIONS)
    selectedTargetId.value = null
    selectedActionId.value = null
    worldTension.value = 30
    powerHistory.value = []
    cooldowns.value = []
    loading.value = false
    signatureUsed.value = false
    dominationStreak.value = 0
    failedStateStreak.value = 0
    actionsUsedOnFactions.value = {}
    tradePartners.value = new Set()
    turnsWithoutWar.value = 0
    lowStatTurns.value = 0

    // Record initial power history
    recordPowerHistory()

    // Init relationships
    relStore.initRelationships()

    // UK passive: starts at 60 with USA
    if (factionId === 'uk') {
      relStore.updateRelationship('uk', 'usa', 60, 'Special Relationship passive')
    }

    // Middle East passive: +2 ECO/turn — applied at startGame
    const meIndex = factions.value.findIndex(f => f.id === 'middleeast')
    if (meIndex !== -1) {
      factions.value[meIndex].eco = Math.min(100, factions.value[meIndex].eco + 2)
    }

    newsStore.clearAll()
    newsStore.addSystem('GEOPOLITICAL COMMAND INITIALISED — Turn 1 begins.', 1)
  }

  // ─── Targeting / Selection ────────────────────────────────────────────────

  function setTarget(factionId: string): void {
    selectedTargetId.value = factionId
  }

  function setAction(actionId: ActionId | CompoundActionId): void {
    selectedActionId.value = actionId
  }

  function setPhase(newPhase: GamePhase): void {
    phase.value = newPhase
  }

  // ─── Execute Action ───────────────────────────────────────────────────────

  /**
   * Main turn execution. Applies action effects directly (without LLM).
   * The narrative engine integration point is here — callers can also invoke
   * the narrative engine separately, then call this to commit the stat changes.
   */
  function executeAction(): void {
    if (!canExecute.value) return

    const actionId = selectedActionId.value!
    const targetId = selectedTargetId.value!
    const newsStore = useNewsStore()
    const relStore = useRelationshipStore()

    const baseAction = getActionById(actionId)
    const compoundAction = getCompoundActionById(actionId)

    if (!baseAction && !compoundAction) return

    const effects = baseAction ? baseAction.effects : compoundAction!.effects
    const cost = baseAction ? baseAction.cost : compoundAction!.cost

    // Deduct AP
    playerAP.value = Math.max(0, playerAP.value - cost)

    // Apply target stat changes
    applyStatChanges(targetId, effects.targetStatChanges)

    // Apply self stat changes
    if (playerFactionId.value) {
      applyStatChanges(playerFactionId.value, effects.selfStatChanges)
    }

    // Update world tension
    worldTension.value = Math.max(0, Math.min(100, worldTension.value + effects.tensionChange))

    // Update relationship
    if (playerFactionId.value) {
      relStore.updateRelationship(
        playerFactionId.value,
        targetId,
        effects.relationshipChange,
        `${actionId} action on turn ${turn.value}`,
      )
    }

    // Register cooldown for base actions only
    if (baseAction && baseAction.cooldownType !== 'none') {
      registerCooldown(baseAction.id, targetId)
    }

    // Track actions used on factions (for influence victory tracking)
    if (actionId === 'propaganda' || actionId === 'intel') {
      if (!actionsUsedOnFactions.value[actionId]) {
        actionsUsedOnFactions.value[actionId] = new Set()
      }
      actionsUsedOnFactions.value[actionId].add(targetId)
    }

    // Track trade partners
    if (actionId === 'trade' || actionId === 'strategicPartnership') {
      tradePartners.value.add(targetId)
    }

    // Update war tracking — military action breaks the streak
    if (actionId === 'military' || actionId === 'shadowWar') {
      turnsWithoutWar.value = 0
    }

    // Record power snapshot after action
    recordPowerHistory()

    newsStore.addOutcome(
      `Action executed: ${actionId} → ${targetId} | AP remaining: ${playerAP.value}`,
      turn.value,
    )

    // Clear selection after execution
    selectedTargetId.value = null
    selectedActionId.value = null
  }

  // ─── Stat Application ─────────────────────────────────────────────────────

  function applyStatChanges(
    factionId: string,
    changes: Partial<{ mil: number; eco: number; dip: number; inf: number }>,
  ): void {
    const idx = factions.value.findIndex(f => f.id === factionId)
    if (idx === -1) return

    const faction = factions.value[idx]

    if (changes.mil !== undefined) {
      faction.mil = Math.max(0, Math.min(100, faction.mil + changes.mil))
    }
    if (changes.eco !== undefined) {
      faction.eco = Math.max(0, Math.min(100, faction.eco + changes.eco))
    }
    if (changes.dip !== undefined) {
      faction.dip = Math.max(0, Math.min(100, faction.dip + changes.dip))
    }
    if (changes.inf !== undefined) {
      faction.inf = Math.max(0, Math.min(100, faction.inf + changes.inf))
    }
  }

  // ─── Apply AI Stat Changes ────────────────────────────────────────────────

  /**
   * Apply stat changes from AI/narrative engine response.
   * Called by the narrative integration layer after LLM resolves.
   */
  function applyAIStatChanges(changes: {
    factionId: string
    milDelta: number
    ecoDelta: number
    dipDelta: number
    infDelta: number
  }[]): void {
    for (const change of changes) {
      applyStatChanges(change.factionId, {
        mil: change.milDelta,
        eco: change.ecoDelta,
        dip: change.dipDelta,
        inf: change.infDelta,
      })
    }
    recordPowerHistory()
  }

  // ─── Next Turn ────────────────────────────────────────────────────────────

  function nextTurn(): void {
    const newsStore = useNewsStore()
    const relStore = useRelationshipStore()

    turn.value += 1

    // Recover AP: +35 per turn, hard cap at 120
    playerAP.value = Math.min(120, playerAP.value + 35)

    // Clear expired cooldowns
    clearExpiredCooldowns()

    // Apply passive abilities each turn
    applyPassives()

    // Decay relationships
    relStore.decayRelationships(turn.value)

    // Track consecutive turns without war
    turnsWithoutWar.value += 1

    // Update domination/failed-state streaks based on player power
    updateStreaks()

    // Update low-stat survival counter (for underdog victory)
    updateLowStatTurns()

    // Record power snapshot at start of new turn
    recordPowerHistory()

    newsStore.addSystem(`Turn ${turn.value} begins. AP: ${playerAP.value}`, turn.value)
  }

  // ─── Passive Abilities ────────────────────────────────────────────────────

  function applyPassives(): void {
    // Middle East: Energy Broker — +2 ECO/turn
    const meIdx = factions.value.findIndex(f => f.id === 'middleeast')
    if (meIdx !== -1) {
      factions.value[meIdx].eco = Math.min(100, factions.value[meIdx].eco + 2)
    }

    // Africa: Demographic Dividend — +1 ECO/turn
    const afIdx = factions.value.findIndex(f => f.id === 'africa')
    if (afIdx !== -1) {
      factions.value[afIdx].eco = Math.min(100, factions.value[afIdx].eco + 1)
    }

    // USA passive: Dollar Reserve — Trade Deals give +2 ECO passively
    // Applied per trade deal in executeAction when player is USA
    if (playerFactionId.value === 'usa' && tradePartners.value.size > 0) {
      const usaIdx = factions.value.findIndex(f => f.id === 'usa')
      if (usaIdx !== -1) {
        const bonus = Math.min(tradePartners.value.size * 2, 10) // cap passive bonus at 10
        factions.value[usaIdx].eco = Math.min(100, factions.value[usaIdx].eco + bonus)
      }
    }
  }

  // ─── Streak Tracking ──────────────────────────────────────────────────────

  function updateStreaks(): void {
    if (!playerFaction.value) return
    const power = calculatePower(playerFaction.value)

    if (power >= 85) {
      dominationStreak.value += 1
    } else {
      dominationStreak.value = 0
    }

    if (power < 30) {
      failedStateStreak.value += 1
    } else {
      failedStateStreak.value = 0
    }
  }

  function updateLowStatTurns(): void {
    if (!playerFaction.value) return
    const f = playerFaction.value
    const hasLowStat = f.mil <= 25 || f.eco <= 25 || f.dip <= 25 || f.inf <= 25
    if (!hasLowStat) {
      lowStatTurns.value += 1
    }
  }

  // ─── Power History ────────────────────────────────────────────────────────

  function recordPowerHistory(): void {
    const entry: PowerHistoryEntry = { turn: turn.value }
    for (const faction of factions.value) {
      entry[faction.id] = calculatePower(faction)
    }
    powerHistory.value.push(entry)
  }

  // ─── Expose compound action list for UI ──────────────────────────────────

  function getAvailableActions() {
    return [...ACTIONS, ...COMPOUND_ACTIONS]
  }

  return {
    // State refs
    phase,
    turn,
    playerFactionId,
    playerAP,
    factions,
    selectedTargetId,
    selectedActionId,
    worldTension,
    powerHistory,
    cooldowns,
    loading,
    apiKey,
    signatureUsed,
    dominationStreak,
    failedStateStreak,
    actionsUsedOnFactions,
    tradePartners,
    turnsWithoutWar,
    lowStatTurns,
    // Computed
    playerFaction,
    targetFaction,
    turnPhase,
    tensionState,
    canExecute,
    // Actions
    startGame,
    setTarget,
    setAction,
    setPhase,
    executeAction,
    applyStatChanges,
    applyAIStatChanges,
    nextTurn,
    isOnCooldown,
    getAvailableActions,
    recordPowerHistory,
  }
})
