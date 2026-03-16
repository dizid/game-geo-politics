<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { ACTIONS, COMPOUND_ACTIONS } from '../../data/actions'

const gameStore = useGameStore()

const target = computed(() => gameStore.targetFaction)
const loading = computed(() => gameStore.loading)
const ap = computed(() => gameStore.playerAP)
const canExecute = computed(() => gameStore.canExecute)
const selectedActionId = computed(() => gameStore.selectedActionId)

const selectedAction = computed(() => {
  if (!selectedActionId.value) return null
  return (
    ACTIONS.find(a => a.id === selectedActionId.value) ??
    COMPOUND_ACTIONS.find(a => a.id === selectedActionId.value) ??
    null
  )
})

const summaryText = computed(() => {
  if (loading.value) return 'TRANSMITTING...'
  if (!target.value) return 'SELECT TARGET FACTION ON MAP'
  if (!selectedAction.value) return `TARGET: ${target.value.name.toUpperCase()} — SELECT ACTION`
  return `${selectedAction.value.label.toUpperCase()} → ${target.value.name.toUpperCase()} [${selectedAction.value.cost} AP]`
})

function handleExecute(): void {
  if (!canExecute.value || loading.value) return
  gameStore.executeAction()
}
</script>

<template>
  <div style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 14px;
    height:42px;
    border-top:1px solid var(--color-border);
    background:var(--color-bg-panel);
    flex-shrink:0;
    gap:12px;
  ">
    <!-- Summary text -->
    <div style="flex:1;font-size:10px;letter-spacing:0.18em;color:var(--color-text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
      <span v-if="loading" class="pulse">{{ summaryText }}</span>
      <span v-else>{{ summaryText }}</span>
    </div>

    <!-- Turn + AP display -->
    <div style="display:flex;gap:12px;flex-shrink:0;">
      <span style="font-size:9px;color:var(--color-text-dim);letter-spacing:0.12em;">
        T{{ gameStore.turn }}
      </span>
      <span style="font-size:8px;letter-spacing:0.12em;" :style="{ color: ap > 30 ? '#4ade80' : '#ef4444' }">
        AP:{{ ap }}
      </span>
    </div>

    <!-- Execute button -->
    <button
      class="exec-btn"
      :disabled="!canExecute || loading"
      @click="handleExecute"
    >
      <span v-if="loading">TRANSMITTING</span>
      <span v-else>EXECUTE</span>
    </button>
  </div>
</template>
