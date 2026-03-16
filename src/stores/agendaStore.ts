import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getRandomAgenda } from '../data/agendas'
import { useGameStore } from './gameStore'
import { useNewsStore } from './newsStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FactionAgenda {
  id: string
  factionId: string
  name: string
  description: string
  targetStat: 'mil' | 'eco' | 'dip' | 'inf'
  targetValue: number
  progress: number // 0-100
  turnsActive: number
  revealed: boolean // whether player has uncovered this via intel
  milestones: { threshold: number; narrative: string; triggered: boolean }[]
}

export const useAgendaStore = defineStore('agenda', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const agendas = ref<FactionAgenda[]>([])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const revealedAgendas = computed(() => agendas.value.filter(a => a.revealed))
  const classifiedAgendas = computed(() => agendas.value.filter(a => !a.revealed))

  // ─── Init ────────────────────────────────────────────────────────────────

  function initAgendas(playerFactionId: string): void {
    const gameStore = useGameStore()
    agendas.value = []

    for (const faction of gameStore.factions) {
      if (faction.id === playerFactionId) continue

      const template = getRandomAgenda(faction.id)
      if (!template) continue

      agendas.value.push({
        id: template.id,
        factionId: faction.id,
        name: template.name,
        description: template.description,
        targetStat: template.targetStat,
        targetValue: template.targetValue,
        progress: 0,
        turnsActive: 0,
        revealed: false,
        milestones: template.milestones.map(m => ({ ...m, triggered: false })),
      })
    }
  }

  // ─── Progress (called each turn) ────────────────────────────────────────

  function progressAgendas(): void {
    const gameStore = useGameStore()
    const newsStore = useNewsStore()

    for (const agenda of agendas.value) {
      agenda.turnsActive += 1

      // Find the faction
      const faction = gameStore.factions.find(f => f.id === agenda.factionId)
      if (!faction) continue

      // Calculate progress based on current stat vs target
      const currentStat = faction[agenda.targetStat]
      const startingStat = agenda.targetValue * 0.5 // approximate starting point
      const range = agenda.targetValue - startingStat
      agenda.progress = Math.max(0, Math.min(100, ((currentStat - startingStat) / range) * 100))

      // Passive stat boost toward agenda goal (AI factions working toward their agenda)
      const boost = Math.random() < 0.4 ? 1 : 0
      if (boost > 0 && currentStat < agenda.targetValue) {
        gameStore.applyStatChanges(agenda.factionId, { [agenda.targetStat]: boost })
      }

      // Check milestones
      for (const milestone of agenda.milestones) {
        if (!milestone.triggered && agenda.progress >= milestone.threshold) {
          milestone.triggered = true
          newsStore.addEvent(
            `${agenda.revealed ? `[${agenda.name}]` : '[CLASSIFIED AGENDA]'} ${milestone.narrative}`,
            gameStore.turn,
          )
        }
      }
    }
  }

  // ─── Reveal (via Intel Op) ──────────────────────────────────────────────

  function revealAgenda(factionId: string): boolean {
    const agenda = agendas.value.find(a => a.factionId === factionId)
    if (!agenda || agenda.revealed) return false

    agenda.revealed = true
    const newsStore = useNewsStore()
    const gameStore = useGameStore()
    newsStore.addHeadline(
      `[INTEL BREAKTHROUGH] ${factionId.toUpperCase()} agenda revealed: ${agenda.name} — ${agenda.description}`,
      gameStore.turn,
    )
    return true
  }

  function getAgenda(factionId: string): FactionAgenda | null {
    return agendas.value.find(a => a.factionId === factionId) ?? null
  }

  function reset(): void {
    agendas.value = []
  }

  return {
    agendas,
    revealedAgendas,
    classifiedAgendas,
    initAgendas,
    progressAgendas,
    revealAgenda,
    getAgenda,
    reset,
  }
})
