<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useCoalitionStore } from '../../stores/coalitionStore'
import { useRelationshipStore } from '../../stores/relationshipStore'
import { getVictoryProgress } from '../../engine/balance/victoryDetector'
import type { GameState } from '../../types/game'

const gameStore = useGameStore()
const coalitionStore = useCoalitionStore()
const relStore = useRelationshipStore()
const collapsed = ref(false)

// Build GameState for victoryDetector (single source of truth)
const gameState = computed<GameState>(() => ({
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
}))

// Use victoryDetector as single source of truth — matches actual win conditions
const victoryPaths = computed(() =>
  getVictoryProgress(gameState.value, coalitionStore.coalitions, Object.values(relStore.relationships))
)

const bestPath = computed(() => {
  return [...victoryPaths.value]
    .filter(p => p.available)
    .sort((a, b) => b.progress - a.progress)[0]
})
</script>

<template>
  <div style="border:1px solid var(--color-border);border-radius:1px;">
    <!-- Header toggle -->
    <button
      style="
        width:100%;
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:6px 10px;
        background:none;
        border:none;
        cursor:pointer;
        border-bottom:1px solid var(--color-border);
        font-family:var(--font-mono);
        font-size:9px;
        letter-spacing:0.22em;
        color:var(--color-text-dim);
      "
      @click="collapsed = !collapsed"
    >
      <span>VICTORY PATHS</span>
      <span>{{ collapsed ? '▶' : '▼' }}</span>
    </button>

    <div v-if="!collapsed" style="padding:8px;">
      <template v-for="path in victoryPaths" :key="path.type">
        <div
          style="margin-bottom:8px;"
          :style="{ opacity: path.available ? 1 : 0.35 }"
        >
          <!-- Label + progress % -->
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span
              style="font-size:9px;letter-spacing:0.2em;"
              :style="{ color: path.type === bestPath?.type ? '#fbbf24' : 'var(--color-text-dim)' }"
            >
              {{ path.label }}
              <span v-if="path.type === bestPath?.type" style="color:#fbbf24;"> ★</span>
            </span>
            <span style="font-size:9px;color:var(--color-text-dim);">{{ Math.round(path.progress) }}%</span>
          </div>

          <!-- Progress bar -->
          <div style="height:2px;background:#0a1f0a;border-radius:1px;margin-bottom:4px;">
            <div
              style="height:100%;border-radius:1px;transition:width 0.5s ease;"
              :style="{
                width: `${path.progress}%`,
                background: path.type === bestPath?.type ? '#fbbf24' : '#4ade80',
              }"
            />
          </div>

          <!-- Requirements checklist -->
          <div v-for="req in path.requirements" :key="req.label" style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
            <span style="font-size:9px;" :style="{ color: req.met ? '#4ade80' : 'var(--color-text-dim)' }">
              {{ req.met ? '✓' : '○' }}
            </span>
            <span style="font-size:9px;color:var(--color-text-dim);">
              {{ req.label }} ({{ req.current }}/{{ req.target }})
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
