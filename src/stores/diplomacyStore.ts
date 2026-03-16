import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DiplomaticMessage,
  Ultimatum,
  FactionScheme,
  PlayerResponse,
  AIDiplomacyResponse,
  MessageConsequence,
} from '../types/diplomacy'
import type { Faction } from '../types/game'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'

export const useDiplomacyStore = defineStore('diplomacy', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const inbox = ref<DiplomaticMessage[]>([])
  const activeUltimatums = ref<Ultimatum[]>([])
  const detectedSchemes = ref<FactionScheme[]>([])
  const lastMessageTurn = ref<Record<string, number>>({}) // factionId → last turn they messaged

  // ─── Computed ──────────────────────────────────────────────────────────────

  const unreadCount = computed(() => inbox.value.filter(m => m.status === 'unread').length)

  const pendingMessages = computed(() =>
    inbox.value.filter(m => m.status === 'unread' || m.status === 'requires_response')
  )

  const unresolvedUltimatums = computed(() =>
    activeUltimatums.value.filter(u => !u.resolved)
  )

  const activeSchemesList = computed(() =>
    detectedSchemes.value.filter(s => s.turnsUntilExecution > 0)
  )

  // ─── Generate Messages (procedural fallback) ───────────────────────────

  /**
   * Generate diplomatic messages based on game state.
   * Called each turn to create AI faction communications.
   * Can be overridden by Claude API response via processAIResponse.
   */
  function generateProceduralMessages(factions: Faction[], playerFactionId: string, turn: number): void {
    const relStore = useRelationshipStore()
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    const messages: DiplomaticMessage[] = []
    const maxMessages = turn <= 3 ? 1 : Math.min(3, Math.floor(turn / 3))

    // Candidate factions sorted by relationship extremity
    const candidates = factions
      .filter(f => f.id !== playerFactionId)
      .map(f => ({
        faction: f,
        relationship: relStore.getRelationship(playerFactionId, f.id),
      }))
      .sort((a, b) => Math.abs(b.relationship) - Math.abs(a.relationship))

    for (const candidate of candidates) {
      if (messages.length >= maxMessages) break

      const { faction, relationship } = candidate
      // Don't message if this faction messaged last turn
      if ((lastMessageTurn.value[faction.id] ?? 0) >= turn - 1) continue

      // Only 40% chance per candidate
      if (Math.random() > 0.4) continue

      const msg = buildMessage(faction, relationship, turn, gameStore.worldTension)
      if (msg) {
        messages.push(msg)
        lastMessageTurn.value[faction.id] = turn
      }
    }

    inbox.value.push(...messages)

    // Generate schemes from aggressive factions
    generateSchemes(factions, playerFactionId, turn)

    // Add news for received messages
    for (const msg of messages) {
      const factionName = factions.find(f => f.id === msg.fromFactionId)?.name ?? msg.fromFactionId
      newsStore.addHeadline(`INCOMING: ${msg.subject} — from ${factionName}`, turn)
    }
  }

  function buildMessage(
    faction: Faction,
    relationship: number,
    turn: number,
    tension: number,
  ): DiplomaticMessage | null {
    const id = `msg_${turn}_${faction.id}_${Math.random().toString(36).slice(2, 6)}`

    // Negative relationship = threats/demands
    if (relationship < -30) {
      return {
        id,
        fromFactionId: faction.id,
        category: relationship < -60 ? 'threat' : 'demand',
        urgency: relationship < -50 ? 'critical' : 'priority',
        status: 'unread',
        subject: relationship < -60
          ? `${faction.name.toUpperCase()} WARNS OF CONSEQUENCES`
          : `${faction.name.toUpperCase()} DEMANDS CHANGE IN POLICY`,
        body: relationship < -60
          ? `Your aggressive posture has not gone unnoticed. ${faction.name} considers your recent actions a direct provocation. Continue this course and there will be consequences.`
          : `${faction.name} formally objects to your recent policies. We demand that you reconsider your approach or face diplomatic isolation.`,
        turn,
        expiresAtTurn: turn + 2,
        responseOptions: [
          {
            id: 'accept',
            label: 'CONCEDE',
            description: 'Back down and improve relations',
            effects: { relationshipDelta: 15, tensionDelta: -2, statChanges: { dip: -3 } },
          },
          {
            id: 'reject',
            label: 'STAND FIRM',
            description: 'Reject the demand at the cost of relations',
            effects: { relationshipDelta: -10, tensionDelta: 2, statChanges: { inf: 2 } },
          },
          {
            id: 'counter',
            label: 'COUNTER-PROPOSE',
            description: 'Offer a diplomatic alternative',
            effects: { relationshipDelta: 5, tensionDelta: -1, statChanges: { dip: 2 } },
          },
        ],
        consequences: {
          description: `${faction.name} escalates pressure`,
          relationshipDelta: -15,
          tensionDelta: 3,
          statChanges: { inf: -3 },
        },
      }
    }

    // Positive relationship = proposals/praise
    if (relationship > 20) {
      return {
        id,
        fromFactionId: faction.id,
        category: relationship > 50 ? 'proposal' : 'praise',
        urgency: 'routine',
        status: 'unread',
        subject: relationship > 50
          ? `${faction.name.toUpperCase()} PROPOSES COOPERATION`
          : `${faction.name.toUpperCase()} COMMENDS YOUR LEADERSHIP`,
        body: relationship > 50
          ? `${faction.name} sees an opportunity for deeper collaboration. We propose a joint initiative that would strengthen both our positions on the world stage.`
          : `${faction.name} recognizes and appreciates your constructive approach to international relations. Your leadership has been noted.`,
        turn,
        expiresAtTurn: relationship > 50 ? turn + 3 : null,
        responseOptions: relationship > 50 ? [
          {
            id: 'accept',
            label: 'AGREE',
            description: 'Accept the cooperation proposal',
            effects: { relationshipDelta: 10, tensionDelta: -1, statChanges: { eco: 3, dip: 2 } },
          },
          {
            id: 'reject',
            label: 'DECLINE POLITELY',
            description: 'Turn down the offer gracefully',
            effects: { relationshipDelta: -5, tensionDelta: 0, statChanges: {} },
          },
        ] : [],
        consequences: null,
      }
    }

    // High tension = urgent warnings from neutral factions
    if (tension > 60 && Math.abs(relationship) < 20) {
      return {
        id,
        fromFactionId: faction.id,
        category: 'warning',
        urgency: tension > 80 ? 'flash' : 'priority',
        status: 'unread',
        subject: `${faction.name.toUpperCase()} CALLS FOR DE-ESCALATION`,
        body: `The rising global tensions concern ${faction.name} deeply. We urge all parties, including your nation, to exercise restraint before it's too late.`,
        turn,
        expiresAtTurn: null,
        responseOptions: [
          {
            id: 'accept',
            label: 'PLEDGE RESTRAINT',
            description: 'Commit to de-escalation',
            effects: { relationshipDelta: 8, tensionDelta: -3, statChanges: { dip: 2 } },
          },
          {
            id: 'reject',
            label: 'DISMISS',
            description: 'Ignore the warning',
            effects: { relationshipDelta: -5, tensionDelta: 1, statChanges: {} },
          },
        ],
        consequences: null,
      }
    }

    return null
  }

  // ─── Scheme Generation ──────────────────────────────────────────────────

  function generateSchemes(factions: Faction[], playerFactionId: string, turn: number): void {
    // Only 25% chance of detecting a scheme each turn
    if (Math.random() > 0.25) return
    if (turn < 4) return

    const aggressors = factions
      .filter(f => f.id !== playerFactionId && f.personality.aggression > 0.5)
    if (aggressors.length === 0) return

    const schemer = aggressors[Math.floor(Math.random() * aggressors.length)]
    const targets = factions.filter(f => f.id !== schemer.id)
    const target = targets[Math.floor(Math.random() * targets.length)]

    const schemeTypes: Array<FactionScheme['type']> = [
      'alliance_formation', 'economic_warfare', 'arms_transfer', 'propaganda_campaign', 'espionage',
    ]
    const type = schemeTypes[Math.floor(Math.random() * schemeTypes.length)]

    const descriptions: Record<string, string> = {
      alliance_formation: `${schemer.name} is negotiating a secret alliance with ${target.name}`,
      economic_warfare: `${schemer.name} is preparing economic sanctions against ${target.name}`,
      arms_transfer: `${schemer.name} is covertly transferring weapons to ${target.name}`,
      propaganda_campaign: `${schemer.name} is launching a disinformation campaign targeting ${target.name}`,
      espionage: `${schemer.name} is conducting espionage operations against ${target.name}`,
    }

    const scheme: FactionScheme = {
      id: `scheme_${turn}_${Math.random().toString(36).slice(2, 6)}`,
      factionId: schemer.id,
      type,
      targetFactionId: target.id,
      description: descriptions[type],
      detectedTurn: turn,
      confidence: 0.4 + Math.random() * 0.5,
      isReal: Math.random() > 0.3,
      turnsUntilExecution: 2 + Math.floor(Math.random() * 3),
      effects: type === 'economic_warfare'
        ? { eco: -6 }
        : type === 'arms_transfer'
          ? { mil: 5 }
          : type === 'propaganda_campaign'
            ? { inf: -5 }
            : {},
    }

    detectedSchemes.value.push(scheme)

    const newsStore = useNewsStore()
    newsStore.addHeadline(
      `[INTEL] ${Math.round(scheme.confidence * 100)}% confidence — ${scheme.description}`,
      turn,
    )
  }

  // ─── Process AI Response ────────────────────────────────────────────────

  function processAIResponse(response: AIDiplomacyResponse, turn: number): void {
    const newsStore = useNewsStore()

    // Process messages
    for (const msg of response.messages) {
      const diplomatic: DiplomaticMessage = {
        id: `msg_${turn}_${msg.from_faction_id}_${Math.random().toString(36).slice(2, 6)}`,
        fromFactionId: msg.from_faction_id,
        category: msg.category,
        urgency: msg.urgency,
        status: msg.response_options.length > 0 ? 'requires_response' : 'unread',
        subject: msg.subject,
        body: msg.body,
        turn,
        expiresAtTurn: msg.expires_in_turns ? turn + msg.expires_in_turns : null,
        responseOptions: msg.response_options.map(opt => ({
          id: opt.id,
          label: opt.label,
          description: opt.description,
          effects: {
            relationshipDelta: opt.relationship_delta,
            tensionDelta: opt.tension_delta,
            statChanges: opt.stat_changes ?? {},
          },
        })),
        consequences: msg.ignore_consequence ? {
          description: msg.ignore_consequence.description,
          relationshipDelta: msg.ignore_consequence.relationship_delta,
          tensionDelta: msg.ignore_consequence.tension_delta,
          statChanges: msg.ignore_consequence.stat_changes ?? {},
        } : null,
      }

      inbox.value.push(diplomatic)
      lastMessageTurn.value[msg.from_faction_id] = turn
      newsStore.addHeadline(`INCOMING: ${msg.subject}`, turn)

      // Convert ultimatums
      if (msg.category === 'ultimatum' && msg.ignore_consequence) {
        activeUltimatums.value.push({
          id: diplomatic.id,
          fromFactionId: msg.from_faction_id,
          demand: msg.subject,
          consequence: msg.ignore_consequence.description,
          turnsRemaining: msg.expires_in_turns ?? 2,
          issuedTurn: turn,
          resolved: false,
          escalationLevel: 1,
          consequenceEffects: {
            description: msg.ignore_consequence.description,
            relationshipDelta: msg.ignore_consequence.relationship_delta,
            tensionDelta: msg.ignore_consequence.tension_delta,
            statChanges: msg.ignore_consequence.stat_changes ?? {},
          },
        })
      }
    }

    // Process schemes
    for (const scheme of response.schemes) {
      detectedSchemes.value.push({
        id: `scheme_${turn}_${Math.random().toString(36).slice(2, 6)}`,
        factionId: scheme.faction_id,
        type: scheme.type,
        targetFactionId: scheme.target_faction_id,
        description: scheme.description,
        detectedTurn: turn,
        confidence: scheme.confidence,
        isReal: scheme.is_real,
        turnsUntilExecution: scheme.turns_until_execution,
        effects: {},
      })
    }
  }

  // ─── Player Response ────────────────────────────────────────────────────

  function respondToMessage(messageId: string, response: PlayerResponse): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    const msg = inbox.value.find(m => m.id === messageId)
    if (!msg) return

    msg.status = 'responded'

    const option = msg.responseOptions.find(o => o.id === response)
    if (!option) return

    // Apply effects
    if (gameStore.playerFactionId) {
      gameStore.applyStatChanges(gameStore.playerFactionId, option.effects.statChanges)
      relStore.updateRelationship(
        gameStore.playerFactionId,
        msg.fromFactionId,
        option.effects.relationshipDelta,
        `Diplomatic response: ${option.label}`,
      )
    }
    gameStore.worldTension = Math.max(0, Math.min(100, gameStore.worldTension + option.effects.tensionDelta))

    // Resolve associated ultimatum
    const ult = activeUltimatums.value.find(u => u.id === messageId)
    if (ult) {
      ult.resolved = true
    }

    newsStore.addOutcome(`Diplomatic response to ${msg.fromFactionId}: ${option.label}`, gameStore.turn)
  }

  // ─── Tick Logic (called each turn) ──────────────────────────────────────

  function tickUltimatums(): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    for (const ult of activeUltimatums.value) {
      if (ult.resolved) continue

      ult.turnsRemaining -= 1

      if (ult.turnsRemaining <= 0) {
        // Fire consequences
        ult.resolved = true
        const effects = ult.consequenceEffects

        if (gameStore.playerFactionId) {
          gameStore.applyStatChanges(gameStore.playerFactionId, effects.statChanges)
          relStore.updateRelationship(
            gameStore.playerFactionId,
            ult.fromFactionId,
            effects.relationshipDelta,
            `Ultimatum expired: ${ult.demand}`,
          )
        }
        gameStore.worldTension = Math.max(0, Math.min(100, gameStore.worldTension + effects.tensionDelta))

        newsStore.addCrisis(
          `ULTIMATUM EXPIRED — ${ult.consequence}`,
          gameStore.turn,
        )
      }
    }

    // Clean up old resolved ultimatums
    activeUltimatums.value = activeUltimatums.value.filter(
      u => !u.resolved || u.issuedTurn > gameStore.turn - 5,
    )
  }

  function tickSchemes(): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    for (const scheme of detectedSchemes.value) {
      if (scheme.turnsUntilExecution <= 0) continue

      scheme.turnsUntilExecution -= 1

      if (scheme.turnsUntilExecution <= 0 && scheme.isReal) {
        // Scheme executes
        gameStore.applyStatChanges(scheme.targetFactionId, scheme.effects)
        newsStore.addEvent(
          `${scheme.factionId} executed ${scheme.type} against ${scheme.targetFactionId}`,
          gameStore.turn,
        )
      }
    }

    // Clean up old schemes
    detectedSchemes.value = detectedSchemes.value.filter(s => s.turnsUntilExecution > -3)
  }

  function expireMessages(turn: number): void {
    const gameStore = useGameStore()

    for (const msg of inbox.value) {
      if (msg.status !== 'unread' && msg.status !== 'requires_response') continue
      if (msg.expiresAtTurn !== null && msg.expiresAtTurn <= turn) {
        msg.status = 'expired'

        // Apply ignore consequences
        if (msg.consequences && gameStore.playerFactionId) {
          applyConsequences(msg.consequences, msg.fromFactionId)
        }
      }
    }
  }

  function applyConsequences(consequences: MessageConsequence, fromFactionId: string): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()

    if (gameStore.playerFactionId) {
      gameStore.applyStatChanges(gameStore.playerFactionId, consequences.statChanges)
      relStore.updateRelationship(
        gameStore.playerFactionId,
        fromFactionId,
        consequences.relationshipDelta,
        `Ignored diplomatic message: ${consequences.description}`,
      )
    }
    gameStore.worldTension = Math.max(0, Math.min(100, gameStore.worldTension + consequences.tensionDelta))
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function reset(): void {
    inbox.value = []
    activeUltimatums.value = []
    detectedSchemes.value = []
    lastMessageTurn.value = {}
  }

  return {
    // State
    inbox,
    activeUltimatums,
    detectedSchemes,
    // Computed
    unreadCount,
    pendingMessages,
    unresolvedUltimatums,
    activeSchemesList,
    // Actions
    generateProceduralMessages,
    processAIResponse,
    respondToMessage,
    tickUltimatums,
    tickSchemes,
    expireMessages,
    reset,
  }
})
