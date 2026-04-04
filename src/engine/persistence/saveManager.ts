import type {
  Faction,
  PowerHistoryEntry,
  ActionCooldown,
  FactionRelationship,
  Coalition,
  NewsItem,
  GameEvent,
  GamePhase,
  SignatureModifier,
  Difficulty,
} from '../../types/game'
import { useGameStore } from '../../stores/gameStore'
import { useRelationshipStore } from '../../stores/relationshipStore'
import { useCoalitionStore } from '../../stores/coalitionStore'
import { useNewsStore } from '../../stores/newsStore'
import { useEventStore } from '../../stores/eventStore'

// ─── Save Data Shape ──────────────────────────────────────────────────────────

interface SaveData {
  version: 1
  timestamp: number
  label: string
  game: {
    phase: string
    turn: number
    playerFactionId: string | null
    playerAP: number
    factions: Faction[]
    worldTension: number
    powerHistory: PowerHistoryEntry[]
    cooldowns: ActionCooldown[]
    signatureUsed: boolean
    signatureModifiers: SignatureModifier[]
    dominationStreak: number
    failedStateStreak: number
    actionsUsedOnFactions: Record<string, string[]>
    tradePartners: string[]
    turnsWithoutWar: number
    lowStatTurns: number
    difficulty: Difficulty
  }
  relationships: Record<string, FactionRelationship>
  coalitions: Coalition[]
  news: NewsItem[]
  events: {
    activeEvents: GameEvent[]
    eventQueue: { event: GameEvent; fireAtTurn: number }[]
  }
}

const SAVE_KEY_PREFIX = 'geocmd_save_'
const AUTO_SAVE_KEY = `${SAVE_KEY_PREFIX}auto`
const MAX_MANUAL_SLOTS = 3

// ─── Serialize Sets to arrays for JSON ────────────────────────────────────────

function serializeSets(actionsUsed: Record<string, Set<string>>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, set] of Object.entries(actionsUsed)) {
    result[key] = Array.from(set)
  }
  return result
}

function deserializeSets(data: Record<string, string[]>): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const [key, arr] of Object.entries(data)) {
    result[key] = new Set(arr)
  }
  return result
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function captureState(label: string): SaveData {
  const gameStore = useGameStore()
  const relStore = useRelationshipStore()
  const coalitionStore = useCoalitionStore()
  const newsStore = useNewsStore()
  const eventStore = useEventStore()

  return {
    version: 1,
    timestamp: Date.now(),
    label,
    game: {
      phase: gameStore.phase,
      turn: gameStore.turn,
      playerFactionId: gameStore.playerFactionId,
      playerAP: gameStore.playerAP,
      factions: JSON.parse(JSON.stringify(gameStore.factions)),
      worldTension: gameStore.worldTension,
      powerHistory: JSON.parse(JSON.stringify(gameStore.powerHistory)),
      cooldowns: JSON.parse(JSON.stringify(gameStore.cooldowns)),
      signatureUsed: gameStore.signatureUsed,
      signatureModifiers: JSON.parse(JSON.stringify(gameStore.signatureModifiers)),
      dominationStreak: gameStore.dominationStreak,
      failedStateStreak: gameStore.failedStateStreak,
      actionsUsedOnFactions: serializeSets(gameStore.actionsUsedOnFactions),
      tradePartners: Array.from(gameStore.tradePartners),
      turnsWithoutWar: gameStore.turnsWithoutWar,
      lowStatTurns: gameStore.lowStatTurns,
      difficulty: gameStore.difficulty,
    },
    relationships: JSON.parse(JSON.stringify(relStore.relationships)),
    coalitions: JSON.parse(JSON.stringify(coalitionStore.coalitions)),
    news: JSON.parse(JSON.stringify(newsStore.items)),
    events: {
      activeEvents: JSON.parse(JSON.stringify(eventStore.activeEvents)),
      eventQueue: JSON.parse(JSON.stringify(eventStore.eventQueue)),
    },
  }
}

export function saveGame(slot: 'auto' | number = 'auto'): boolean {
  const gameStore = useGameStore()
  const key = slot === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}slot_${slot}`
  const label = slot === 'auto'
    ? `Auto-save T${gameStore.turn}`
    : `Manual save T${gameStore.turn}`

  try {
    const data = captureState(label)
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export function loadGame(slot: 'auto' | number = 'auto'): boolean {
  const key = slot === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}slot_${slot}`

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false

    const data: SaveData = JSON.parse(raw)
    if (data.version !== 1) return false

    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const coalitionStore = useCoalitionStore()
    const newsStore = useNewsStore()
    const eventStore = useEventStore()

    // Restore game state
    gameStore.phase = data.game.phase as GamePhase
    gameStore.turn = data.game.turn
    gameStore.playerFactionId = data.game.playerFactionId
    gameStore.playerAP = data.game.playerAP
    gameStore.factions = data.game.factions
    gameStore.worldTension = data.game.worldTension
    gameStore.powerHistory = data.game.powerHistory
    gameStore.cooldowns = data.game.cooldowns
    gameStore.signatureUsed = data.game.signatureUsed
    gameStore.signatureModifiers = data.game.signatureModifiers ?? []
    gameStore.dominationStreak = data.game.dominationStreak
    gameStore.failedStateStreak = data.game.failedStateStreak
    gameStore.actionsUsedOnFactions = deserializeSets(data.game.actionsUsedOnFactions)
    gameStore.tradePartners = new Set(data.game.tradePartners)
    gameStore.turnsWithoutWar = data.game.turnsWithoutWar
    gameStore.lowStatTurns = data.game.lowStatTurns

    // Restore relationships
    relStore.relationships = data.relationships

    // Restore coalitions
    coalitionStore.coalitions = data.coalitions
    coalitionStore.proposals = []

    // Restore news
    newsStore.items = data.news

    // Restore events
    eventStore.activeEvents = data.events.activeEvents
    eventStore.eventQueue = data.events.eventQueue as typeof eventStore.eventQueue

    return true
  } catch {
    return false
  }
}

// ─── Slot Management ──────────────────────────────────────────────────────────

export interface SaveSlotInfo {
  slot: 'auto' | number
  label: string
  timestamp: number
  turn: number
  factionId: string | null
  exists: boolean
}

export function listSaveSlots(): SaveSlotInfo[] {
  const slots: SaveSlotInfo[] = []

  // Auto-save slot
  const autoRaw = localStorage.getItem(AUTO_SAVE_KEY)
  if (autoRaw) {
    try {
      const data: SaveData = JSON.parse(autoRaw)
      slots.push({
        slot: 'auto',
        label: data.label,
        timestamp: data.timestamp,
        turn: data.game.turn,
        factionId: data.game.playerFactionId,
        exists: true,
      })
    } catch {
      slots.push({ slot: 'auto', label: 'Auto-save', timestamp: 0, turn: 0, factionId: null, exists: false })
    }
  } else {
    slots.push({ slot: 'auto', label: 'Auto-save', timestamp: 0, turn: 0, factionId: null, exists: false })
  }

  // Manual slots
  for (let i = 1; i <= MAX_MANUAL_SLOTS; i++) {
    const key = `${SAVE_KEY_PREFIX}slot_${i}`
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const data: SaveData = JSON.parse(raw)
        slots.push({
          slot: i,
          label: data.label,
          timestamp: data.timestamp,
          turn: data.game.turn,
          factionId: data.game.playerFactionId,
          exists: true,
        })
      } catch {
        slots.push({ slot: i, label: `Slot ${i}`, timestamp: 0, turn: 0, factionId: null, exists: false })
      }
    } else {
      slots.push({ slot: i, label: `Slot ${i}`, timestamp: 0, turn: 0, factionId: null, exists: false })
    }
  }

  return slots
}

export function deleteSave(slot: 'auto' | number): void {
  const key = slot === 'auto' ? AUTO_SAVE_KEY : `${SAVE_KEY_PREFIX}slot_${slot}`
  localStorage.removeItem(key)
}

export function hasSaveData(): boolean {
  return listSaveSlots().some(s => s.exists)
}
