import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CovertOpType } from '../data/covertOps'
import { getCovertOpTemplate } from '../data/covertOps'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'
import { useRelationshipStore } from './relationshipStore'
import { useAgendaStore } from './agendaStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CovertOperation {
  id: string
  type: CovertOpType
  targetFactionId: string
  progress: number // 0-100
  apInvested: number
  turnsActive: number
  exposureRisk: number // 0-100
  exposed: boolean
  status: 'active' | 'completed' | 'exposed' | 'aborted'
}

export const useCovertStore = defineStore('covert', () => {
  const MAX_CONCURRENT = 2

  // ─── State ───────────────────────────────────────────────────────────────

  const activeOps = ref<CovertOperation[]>([])
  const completedOps = ref<CovertOperation[]>([])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const canStartNew = computed(() => activeOps.value.filter(o => o.status === 'active').length < MAX_CONCURRENT)

  const activeOpsList = computed(() => activeOps.value.filter(o => o.status === 'active'))

  // ─── Start Operation ────────────────────────────────────────────────────

  function startOperation(type: CovertOpType, targetFactionId: string): boolean {
    if (!canStartNew.value) return false

    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const template = getCovertOpTemplate(type)
    if (!template) return false

    // Initial cost: 15 AP to launch
    if (gameStore.playerAP < 15) return false
    gameStore.playerAP = Math.max(0, gameStore.playerAP - 15)

    const op: CovertOperation = {
      id: `covert_${gameStore.turn}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      targetFactionId,
      progress: 15,
      apInvested: 15,
      turnsActive: 0,
      exposureRisk: Math.round(template.baseExposurePerTurn * 100),
      exposed: false,
      status: 'active',
    }

    activeOps.value.push(op)
    newsStore.addSystem(`COVERT OP LAUNCHED: ${template.name} targeting ${targetFactionId}`, gameStore.turn)
    return true
  }

  // ─── Invest in Operation ────────────────────────────────────────────────

  function investInOperation(opId: string): boolean {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()
    const op = activeOps.value.find(o => o.id === opId)
    if (!op || op.status !== 'active') return false

    const template = getCovertOpTemplate(op.type)
    if (!template) return false

    if (gameStore.playerAP < template.apPerInvestment) return false
    gameStore.playerAP = Math.max(0, gameStore.playerAP - template.apPerInvestment)

    op.progress = Math.min(100, op.progress + template.progressPerInvestment)
    op.apInvested += template.apPerInvestment

    newsStore.addSystem(
      `Invested ${template.apPerInvestment} AP in ${template.name}. Progress: ${op.progress}%`,
      gameStore.turn,
    )

    // Check for completion
    if (op.progress >= 100) {
      completeOperation(op)
    }

    return true
  }

  // ─── Abort ──────────────────────────────────────────────────────────────

  function abortOperation(opId: string): void {
    const op = activeOps.value.find(o => o.id === opId)
    if (!op || op.status !== 'active') return

    const newsStore = useNewsStore()
    const gameStore = useGameStore()

    op.status = 'aborted'
    completedOps.value.push(op)
    activeOps.value = activeOps.value.filter(o => o.id !== opId)

    newsStore.addSystem(`Covert operation aborted: ${op.type}`, gameStore.turn)
  }

  // ─── Complete ───────────────────────────────────────────────────────────

  function completeOperation(op: CovertOperation): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    const template = getCovertOpTemplate(op.type)
    if (!template) return

    op.status = 'completed'

    // Apply payoff
    gameStore.applyStatChanges(op.targetFactionId, template.payoff.targetStatChanges)
    if (gameStore.playerFactionId) {
      gameStore.applyStatChanges(gameStore.playerFactionId, template.payoff.selfStatChanges)
      relStore.updateRelationship(
        gameStore.playerFactionId,
        op.targetFactionId,
        template.payoff.relationshipDelta,
        `Covert op completed: ${template.name}`,
      )
    }
    gameStore.worldTension = Math.max(0, Math.min(100, gameStore.worldTension + template.payoff.tensionDelta))

    newsStore.addHeadline(
      `COVERT OP SUCCESS: ${template.name} against ${op.targetFactionId} achieved its objectives`,
      gameStore.turn,
    )

    completedOps.value.push(op)
    activeOps.value = activeOps.value.filter(o => o.id !== op.id)

    // If intelligence_network, reveal target's agenda
    if (op.type === 'intelligence_network') {
      const agendaStore = useAgendaStore()
      agendaStore.revealAgenda(op.targetFactionId)
    }
  }

  // ─── Exposure Check (called each turn) ──────────────────────────────────

  function tickOperations(): void {
    const gameStore = useGameStore()
    const relStore = useRelationshipStore()
    const newsStore = useNewsStore()

    for (const op of activeOps.value) {
      if (op.status !== 'active') continue

      op.turnsActive += 1

      const template = getCovertOpTemplate(op.type)
      if (!template) continue

      // Increase exposure risk each turn
      op.exposureRisk = Math.min(95, op.exposureRisk + Math.round(template.baseExposurePerTurn * 100))

      // Roll for exposure
      if (Math.random() * 100 < op.exposureRisk) {
        // EXPOSED!
        op.status = 'exposed'
        op.exposed = true

        // Apply exposure penalty
        if (gameStore.playerFactionId) {
          gameStore.applyStatChanges(gameStore.playerFactionId, template.exposurePenalty.selfStatChanges)
          relStore.updateRelationship(
            gameStore.playerFactionId,
            op.targetFactionId,
            template.exposurePenalty.relationshipDelta,
            `Covert op exposed: ${template.name}`,
          )
        }
        gameStore.worldTension = Math.max(0, Math.min(100, gameStore.worldTension + template.exposurePenalty.tensionDelta))

        newsStore.addCrisis(
          `COVERT OP EXPOSED: Your ${template.name} operation against ${op.targetFactionId} has been discovered!`,
          gameStore.turn,
        )

        completedOps.value.push(op)
        activeOps.value = activeOps.value.filter(o => o.id !== op.id)
      }
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function reset(): void {
    activeOps.value = []
    completedOps.value = []
  }

  return {
    activeOps,
    completedOps,
    canStartNew,
    activeOpsList,
    startOperation,
    investInOperation,
    abortOperation,
    tickOperations,
    reset,
  }
})
