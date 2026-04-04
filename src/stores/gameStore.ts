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
  SignatureModifier,
  FactionStats,
  Difficulty,
} from '../types/game'
import { FACTIONS, calculatePower } from '../data/factions'
import { ACTIONS, COMPOUND_ACTIONS, getActionById, getCompoundActionById } from '../data/actions'
import { type TurnModifier, rollTurnModifier } from '../data/turnModifiers'
import { type PhaseInterrupt, rollPhaseInterrupt } from '../engine/events/phaseInterrupts'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'
import { useEventStore } from './eventStore'
import { useDiplomacyStore } from './diplomacyStore'
import { useAgendaStore } from './agendaStore'
import { useStoryStore } from './storyStore'
import { useCovertStore } from './covertStore'
import { saveGame } from '../engine/persistence/saveManager'

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
  const signatureModifiers = ref<SignatureModifier[]>([])
  const dominationStreak = ref<number>(0)
  const failedStateStreak = ref<number>(0)
  // Track which factions each action has been used on (for influence victory)
  const actionsUsedOnFactions = ref<Record<string, Set<string>>>({})
  const tradePartners = ref<Set<string>>(new Set())
  const turnsWithoutWar = ref<number>(0)
  const lowStatTurns = ref<number>(0)
  // Multi-action turn tracking
  const actionsThisTurn = ref<number>(0)
  // Last executed action ID (for visual/audio feedback)
  const lastExecutedAction = ref<string | null>(null)
  // Turn modifier
  const activeTurnModifier = ref<TurnModifier | null>(null)
  // Active phase interrupt
  const activeInterrupt = ref<PhaseInterrupt | null>(null)
  // Difficulty mode
  const difficulty = ref<Difficulty>('commander')

  // ─── Game Constants (vary by difficulty) ─────────────────────────────────
  const MAX_TURNS = 15
  const AP_START = computed(() => difficulty.value === 'commander' ? 60 : 80)
  const AP_RECOVERY = computed(() => difficulty.value === 'commander' ? 30 : 35)
  const AP_CAP = computed(() => difficulty.value === 'commander' ? 100 : 120)

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

    // Check compound action requirements
    if (compoundAction) {
      const state: import('../types/game').GameState = {
        phase: phase.value,
        turn: turn.value,
        playerFactionId: playerFactionId.value,
        playerAP: playerAP.value,
        factions: factions.value,
        selectedTargetId: selectedTargetId.value,
        selectedActionId: selectedActionId.value,
        worldTension: worldTension.value,
        powerHistory: powerHistory.value,
        cooldowns: cooldowns.value,
        loading: loading.value,
        apiKey: apiKey.value,
        signatureUsed: signatureUsed.value,
        signatureModifiers: signatureModifiers.value,
        dominationStreak: dominationStreak.value,
        failedStateStreak: failedStateStreak.value,
        actionsUsedOnFactions: actionsUsedOnFactions.value,
        tradePartners: tradePartners.value,
        turnsWithoutWar: turnsWithoutWar.value,
        lowStatTurns: lowStatTurns.value,
        difficulty: difficulty.value,
      }
      if (!compoundAction.requirementCheck(state)) return false
    }

    // Check if action is blocked by turn modifier
    if (activeTurnModifier.value?.effects.actionBlocked?.includes(id)) return false

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

  // ─── Signature Ability Helpers ────────────────────────────────────────────

  /** Multiply each stat delta by a multiplier (used for ASEAN diplomacy boost) */
  function boostStats(stats: Partial<FactionStats>, multiplier: number): Partial<FactionStats> {
    const result: Partial<FactionStats> = {}
    for (const [key, val] of Object.entries(stats)) {
      if (val !== undefined) result[key as keyof FactionStats] = Math.round(val * multiplier)
    }
    return result
  }

  // ─── Game Init ────────────────────────────────────────────────────────────

  function startGame(factionId: string): void {
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    // Reset all state
    phase.value = 'action'
    turn.value = 1
    playerFactionId.value = factionId
    playerAP.value = AP_START.value
    factions.value = structuredClone(FACTIONS)
    selectedTargetId.value = null
    selectedActionId.value = null
    worldTension.value = 30
    powerHistory.value = []
    cooldowns.value = []
    loading.value = false
    signatureUsed.value = false
    signatureModifiers.value = []
    dominationStreak.value = 0
    failedStateStreak.value = 0
    actionsUsedOnFactions.value = {}
    tradePartners.value = new Set()
    turnsWithoutWar.value = 0
    lowStatTurns.value = 0
    actionsThisTurn.value = 0
    lastExecutedAction.value = null
    activeTurnModifier.value = null
    activeInterrupt.value = null

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

    // Reset diplomacy, agendas, stories
    const diplomacyStore = useDiplomacyStore()
    diplomacyStore.reset()
    const agendaStore = useAgendaStore()
    agendaStore.reset()
    agendaStore.initAgendas(factionId)
    const storyStore = useStoryStore()
    storyStore.reset()
    const covertStore = useCovertStore()
    covertStore.reset()

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

  function clearSelection(): void {
    selectedTargetId.value = null
    selectedActionId.value = null
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
    lastExecutedAction.value = actionId
    const newsStore = useNewsStore()
    const relStore = useRelationshipStore()

    const baseAction = getActionById(actionId)
    const compoundAction = getCompoundActionById(actionId)

    if (!baseAction && !compoundAction) return

    let effects = baseAction ? { ...baseAction.effects } : { ...compoundAction!.effects }
    const baseCost = baseAction ? baseAction.cost : compoundAction!.cost

    // UK Soft Power: Info War generates INF instead of draining target's INF
    if (actionId === 'propaganda') {
      const invertMod = signatureModifiers.value.find(m => m.type === 'info_war_inverted')
      if (invertMod) {
        effects = {
          targetStatChanges: {},
          selfStatChanges: { inf: 5 },
          tensionChange: 0,
          relationshipChange: 0,
        }
      }
    }

    // ASEAN Quiet Diplomacy: +25% effectiveness on DIP-tagged actions
    if (baseAction?.relevantStat === 'dip') {
      const dipMod = signatureModifiers.value.find(m => m.type === 'diplomacy_boost_25pct')
      if (dipMod) {
        effects = {
          targetStatChanges: boostStats(effects.targetStatChanges, 1.25),
          selfStatChanges: boostStats(effects.selfStatChanges, 1.25),
          tensionChange: Math.round(effects.tensionChange * 1.25),
          relationshipChange: Math.round(effects.relationshipChange * 1.25),
        }
      }
    }

    // Apply turn modifier to cost
    let cost = baseCost
    const mod = activeTurnModifier.value
    if (mod?.effects.apCostMultiplier?.[actionId] !== undefined) {
      cost = Math.round(baseCost * mod.effects.apCostMultiplier[actionId])
    }

    // Deduct AP
    playerAP.value = Math.max(0, playerAP.value - cost)

    // Apply target stat changes
    applyStatChanges(targetId, effects.targetStatChanges)

    // Apply self stat changes
    if (playerFactionId.value) {
      applyStatChanges(playerFactionId.value, effects.selfStatChanges)
    }

    // Apply tension change (with modifier)
    const tensionMult = mod?.effects.tensionMultiplier ?? 1
    const tensionDelta = Math.round(effects.tensionChange * tensionMult)
    worldTension.value = Math.max(0, Math.min(100, worldTension.value + tensionDelta))

    // Update relationship (with modifier)
    const relMult = mod?.effects.relationshipMultiplier ?? 1
    const relDelta = Math.round(effects.relationshipChange * relMult)
    if (playerFactionId.value) {
      relStore.updateRelationship(
        playerFactionId.value,
        targetId,
        relDelta,
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

    // Intel Op reveals faction agenda
    if (actionId === 'intel') {
      const agendaStore = useAgendaStore()
      agendaStore.revealAgenda(targetId)
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

    // Increment multi-action counter
    actionsThisTurn.value += 1

    newsStore.addOutcome(
      `Action executed: ${actionId} → ${targetId} | AP remaining: ${playerAP.value}`,
      turn.value,
    )

    // Clear selection after execution
    selectedTargetId.value = null
    selectedActionId.value = null

    // Roll for phase interrupt between actions
    if (playerFactionId.value) {
      const interrupt = rollPhaseInterrupt(
        worldTension.value,
        actionsThisTurn.value,
        turn.value,
        factions.value,
        playerFactionId.value,
      )
      if (interrupt) {
        activeInterrupt.value = interrupt
        phase.value = 'interrupt'
      }
    }
  }

  // ─── Signature Ability Activation ─────────────────────────────────────────

  /**
   * Activate the player faction's one-time signature ability.
   * Some signatures require a target (China, Russia) — pass targetId for those.
   */
  function activateSignature(targetId?: string): void {
    const newsStore = useNewsStore()
    const agendaStore = useAgendaStore()

    if (!playerFaction.value) return
    if (playerFaction.value.signature.used) return

    const factionId = playerFactionId.value!

    // Factions that require a target
    const needsTarget = ['china', 'russia'].includes(factionId)
    if (needsTarget && !targetId) return

    switch (factionId) {
      case 'usa':
        // Global Policeman: drop world tension by 25
        worldTension.value = Math.max(0, worldTension.value - 25)
        newsStore.addEvent(
          'USA invokes GLOBAL POLICEMAN — military presence deployed globally, regional tensions suppressed.',
          turn.value,
        )
        break

      case 'china':
        // Debt Diplomacy: target ECO -10, player INF +8, tension +5
        if (targetId) {
          applyStatChanges(targetId, { eco: -10 })
          applyStatChanges(factionId, { inf: 8 })
          worldTension.value = Math.min(100, worldTension.value + 5)
          newsStore.addEvent(
            `CHINA activates DEBT DIPLOMACY against ${factions.value.find(f => f.id === targetId)?.name ?? targetId} — debt trap triggered, Beijing\'s influence surges.`,
            turn.value,
          )
        }
        break

      case 'eu':
        // Enlargement: coalition proposals ignore relationship minimum for 3 turns
        signatureModifiers.value.push({ type: 'half_coalition_cost', turnsRemaining: 3 })
        newsStore.addEvent(
          'EU activates ENLARGEMENT — coalition formation thresholds halved for 3 turns.',
          turn.value,
        )
        break

      case 'india':
        // Strategic Autonomy: immune to hostile coalition formation for 5 turns
        signatureModifiers.value.push({ type: 'coalition_immunity', turnsRemaining: 5 })
        newsStore.addEvent(
          'INDIA declares STRATEGIC AUTONOMY — immune to hostile coalition targeting for 5 turns.',
          turn.value,
        )
        break

      case 'uk':
        // Soft Power: next 3 propaganda actions grant INF instead of costing it
        signatureModifiers.value.push({ type: 'info_war_inverted', turnsRemaining: 3 })
        newsStore.addEvent(
          'UK activates SOFT POWER — Info War operations generate influence for 3 turns.',
          turn.value,
        )
        break

      case 'russia':
        // Hybrid Warfare: apply both info war and intel effects to target
        if (targetId) {
          const targetName = factions.value.find(f => f.id === targetId)?.name ?? targetId
          // Info war effect: target INF -8, player INF +5, tension +8
          applyStatChanges(targetId, { inf: -8 })
          applyStatChanges(factionId, { inf: 5 })
          worldTension.value = Math.min(100, worldTension.value + 8)
          // Intel effect: reveal target's agenda
          agendaStore.revealAgenda(targetId)
          // Track for influence victory
          if (!actionsUsedOnFactions.value['propaganda']) {
            actionsUsedOnFactions.value['propaganda'] = new Set()
          }
          actionsUsedOnFactions.value['propaganda'].add(targetId)
          const relStore = useRelationshipStore()
          relStore.updateRelationship(factionId, targetId, -15, 'Hybrid Warfare signature')
          newsStore.addEvent(
            `RUSSIA deploys HYBRID WARFARE against ${targetName} — information networks disrupted, intelligence extracted simultaneously.`,
            turn.value,
          )
        }
        break

      case 'middleeast':
        // Oil Shock: all other factions ECO -8, tension +15
        for (const faction of factions.value) {
          if (faction.id !== factionId) {
            applyStatChanges(faction.id, { eco: -8 })
          }
        }
        worldTension.value = Math.min(100, worldTension.value + 15)
        newsStore.addEvent(
          'MIDDLE EAST triggers OIL SHOCK — global energy prices spike, all economies suffer.',
          turn.value,
        )
        break

      case 'asean':
        // Quiet Diplomacy: all DIP-tagged actions +25% effective for 3 turns
        signatureModifiers.value.push({ type: 'diplomacy_boost_25pct', turnsRemaining: 3 })
        newsStore.addEvent(
          'ASEAN activates QUIET DIPLOMACY — diplomatic actions are 25% more effective for 3 turns.',
          turn.value,
        )
        break

      case 'latam':
        // Monroe Doctrine Reversal: USA skips targeting player for 5 turns
        signatureModifiers.value.push({ type: 'usa_blocked', turnsRemaining: 5 })
        newsStore.addEvent(
          'LATIN AMERICA invokes MONROE DOCTRINE REVERSAL — USA interference blocked for 5 turns.',
          turn.value,
        )
        break

      case 'africa':
        // Resource Nationalism: economic crashes hit at half strength (permanent)
        signatureModifiers.value.push({ type: 'crash_resistance', turnsRemaining: 999 })
        newsStore.addEvent(
          'AFRICAN UNION declares RESOURCE NATIONALISM — economic shocks permanently reduced by 50%.',
          turn.value,
        )
        break
    }

    // Mark signature as used
    const factionIdx = factions.value.findIndex(f => f.id === factionId)
    if (factionIdx !== -1) {
      factions.value[factionIdx].signature.used = true
    }
    signatureUsed.value = true

    recordPowerHistory()
  }

  // ─── Interrupt Resolution ───────────────────────────────────────────────

  function resolveInterrupt(accepted: boolean): void {
    const newsStore = useNewsStore()

    if (!activeInterrupt.value) {
      phase.value = 'action'
      return
    }

    const interrupt = activeInterrupt.value

    if (interrupt.choice && accepted) {
      // Apply accept effects
      const choice = interrupt.choice.accept
      if (playerFactionId.value) {
        applyStatChanges(playerFactionId.value, choice.effects)
      }
      playerAP.value = Math.max(0, playerAP.value - choice.apCost)
      worldTension.value = Math.max(0, Math.min(100, worldTension.value + choice.tensionDelta))
      newsStore.addOutcome(`${interrupt.headline}: Accepted — ${choice.label}`, turn.value)
    } else if (interrupt.choice && !accepted) {
      // Apply decline effects
      const choice = interrupt.choice.decline
      if (playerFactionId.value) {
        applyStatChanges(playerFactionId.value, choice.effects)
      }
      worldTension.value = Math.max(0, Math.min(100, worldTension.value + choice.tensionDelta))
      newsStore.addOutcome(`${interrupt.headline}: Declined`, turn.value)
    } else {
      // No choice — just acknowledge the effect
      if (playerFactionId.value && Object.keys(interrupt.effects).length > 0) {
        applyStatChanges(playerFactionId.value, interrupt.effects)
      }
      newsStore.addEvent(`${interrupt.headline}: ${interrupt.description}`, turn.value)
    }

    activeInterrupt.value = null
    phase.value = 'action'
  }

  // ─── End Turn (explicit player action) ──────────────────────────────────

  function endTurn(): void {
    nextTurn()
    phase.value = 'action'
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
    const eventStore = useEventStore()

    turn.value += 1

    // 15-turn hard cap — trigger end-of-game resolution
    if (turn.value > MAX_TURNS) {
      phase.value = 'gameover'
      return
    }

    // Reset multi-action counter
    actionsThisTurn.value = 0
    lastExecutedAction.value = null

    // Recover AP (scales with difficulty)
    playerAP.value = Math.min(AP_CAP.value, playerAP.value + AP_RECOVERY.value)

    // Roll for turn modifier
    activeTurnModifier.value = rollTurnModifier(turn.value)

    // Clear expired cooldowns
    clearExpiredCooldowns()

    // Decrement signature modifier turns (999 = permanent, never decremented)
    signatureModifiers.value = signatureModifiers.value
      .map(m => ({ ...m, turnsRemaining: m.turnsRemaining === 999 ? 999 : m.turnsRemaining - 1 }))
      .filter(m => m.turnsRemaining > 0)

    // Apply passive abilities each turn
    applyPassives()

    // Decay relationships
    relStore.decayRelationships(turn.value)

    // Process any queued cascade events
    eventStore.processCascades(turn.value)

    // Check for scripted narrative beats
    eventStore.checkScriptedBeat(turn.value)

    // Generate random world events for this turn
    eventStore.generateTurnEvents(turn.value, factions.value, tensionState.value)

    // Diplomacy: tick ultimatums, schemes, expire messages, generate new messages
    const diplomacyStore = useDiplomacyStore()
    diplomacyStore.tickUltimatums()
    diplomacyStore.tickSchemes()
    diplomacyStore.expireMessages(turn.value)
    if (playerFactionId.value) {
      diplomacyStore.generateProceduralMessages(factions.value, playerFactionId.value, turn.value)
    }

    // Tick covert operations (exposure checks)
    const covertStore = useCovertStore()
    covertStore.tickOperations()

    // Progress faction agendas and story threads
    const agendaStore = useAgendaStore()
    agendaStore.progressAgendas()
    const storyStore = useStoryStore()
    storyStore.progressThreads()
    storyStore.checkForNewThreads()

    // Track consecutive turns without war
    turnsWithoutWar.value += 1

    // Update domination/failed-state streaks based on player power
    updateStreaks()

    // Update low-stat survival counter (for underdog victory)
    updateLowStatTurns()

    // Record power snapshot at start of new turn
    recordPowerHistory()

    newsStore.addSystem(`Turn ${turn.value} begins. AP: ${playerAP.value}`, turn.value)

    // Auto-save at start of each turn
    saveGame('auto')
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

  /** Check if an action is blocked by the active turn modifier */
  function isActionBlocked(actionId: string): boolean {
    return activeTurnModifier.value?.effects.actionBlocked?.includes(actionId) ?? false
  }

  /** Get the effective AP cost for an action (after turn modifier) */
  function getEffectiveCost(actionId: string, baseCost: number): number {
    const mod = activeTurnModifier.value
    if (mod?.effects.apCostMultiplier?.[actionId] !== undefined) {
      return Math.round(baseCost * mod.effects.apCostMultiplier[actionId])
    }
    return baseCost
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
    signatureModifiers,
    dominationStreak,
    failedStateStreak,
    actionsUsedOnFactions,
    tradePartners,
    turnsWithoutWar,
    lowStatTurns,
    actionsThisTurn,
    lastExecutedAction,
    activeTurnModifier,
    activeInterrupt,
    difficulty,
    MAX_TURNS,
    AP_START,
    AP_RECOVERY,
    AP_CAP,
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
    clearSelection,
    setPhase,
    executeAction,
    activateSignature,
    resolveInterrupt,
    endTurn,
    applyStatChanges,
    applyAIStatChanges,
    nextTurn,
    isOnCooldown,
    isActionBlocked,
    getEffectiveCost,
    getAvailableActions,
    recordPowerHistory,
  }
})
