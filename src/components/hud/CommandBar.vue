<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useAdvisorStore } from '../../stores/advisorStore'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { ACTIONS, COMPOUND_ACTIONS } from '../../data/actions'

const gameStore = useGameStore()
const advisorStore = useAdvisorStore()
const { isMobile } = useBreakpoint()

const target = computed(() => gameStore.targetFaction)
const loading = computed(() => gameStore.loading)
const ap = computed(() => gameStore.playerAP)
const canExecute = computed(() => gameStore.canExecute)
const selectedActionId = computed(() => gameStore.selectedActionId)
const actionsThisTurn = computed(() => gameStore.actionsThisTurn)

const selectedAction = computed(() => {
  if (!selectedActionId.value) return null
  return (
    ACTIONS.find(a => a.id === selectedActionId.value) ??
    COMPOUND_ACTIONS.find(a => a.id === selectedActionId.value) ??
    null
  )
})

const effectiveCost = computed(() => {
  if (!selectedAction.value) return 0
  return gameStore.getEffectiveCost(selectedAction.value.id, selectedAction.value.cost)
})

const summaryText = computed(() => {
  if (loading.value) return 'TRANSMITTING...'
  if (!target.value && actionsThisTurn.value === 0) return '① CLICK A FACTION ON THE LEFT TO TARGET THEM'
  if (!target.value && actionsThisTurn.value > 0) return 'SELECT ANOTHER TARGET OR CLICK END TURN →'
  if (!selectedAction.value) return `② TARGET: ${target.value!.name.toUpperCase()} — NOW PICK AN ACTION BELOW`
  return `③ ${selectedAction.value.label.toUpperCase()} → ${target.value!.name.toUpperCase()} [${effectiveCost.value} AP] — HIT EXECUTE`
})

function handleExecute(): void {
  if (!canExecute.value || loading.value) return
  gameStore.executeAction()
}

function handleEndTurn(): void {
  if (loading.value) return
  gameStore.endTurn()
}

function handleDoIt(): void {
  const hint = advisorStore.topHint
  if (!hint) return
  if (hint.suggestedTarget) gameStore.setTarget(hint.suggestedTarget)
  if (hint.suggestedAction) gameStore.setAction(hint.suggestedAction as import('../../types/game').ActionId)
  advisorStore.dismiss()
}
</script>

<template>
  <div style="display:flex;flex-direction:column;flex-shrink:0;">

    <!-- ── Advisor hint bar ─────────────────────────────────────────────── -->
    <div
      v-if="advisorStore.enabled && !advisorStore.dismissed && advisorStore.topHint"
      style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        padding:4px 14px;
        border-top:1px solid var(--color-accent-info, #38bdf8);
        background:rgba(56,189,248,0.05);
        flex-shrink:0;
      "
    >
      <!-- Hint message -->
      <span style="
        font-size:9px;
        letter-spacing:0.12em;
        color:var(--color-accent-info, #38bdf8);
        flex:1;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      ">
        ADV: {{ advisorStore.topHint.message }}
      </span>

      <!-- DO IT button — only shown when an action can be suggested -->
      <button
        v-if="advisorStore.topHint.suggestedAction || advisorStore.topHint.suggestedTarget"
        style="
          font-size:8px;
          letter-spacing:0.1em;
          padding:2px 6px;
          background:transparent;
          border:1px solid var(--color-accent-info, #38bdf8);
          color:var(--color-accent-info, #38bdf8);
          cursor:pointer;
          flex-shrink:0;
        "
        @click="handleDoIt"
      >
        DO IT
      </button>

      <!-- Dismiss button -->
      <button
        style="
          font-size:10px;
          line-height:1;
          padding:2px 5px;
          background:transparent;
          border:1px solid var(--color-text-dim, #555);
          color:var(--color-text-dim, #555);
          cursor:pointer;
          flex-shrink:0;
        "
        @click="advisorStore.dismiss()"
      >
        ×
      </button>
    </div>

    <!-- ── Main command bar ─────────────────────────────────────────────── -->
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
      <!-- Summary text: hidden on mobile (not enough space) -->
      <div
        v-if="!isMobile"
        style="flex:1;font-size:10px;letter-spacing:0.18em;color:var(--color-text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;"
      >
        <span v-if="loading" class="pulse">{{ summaryText }}</span>
        <span v-else>{{ summaryText }}</span>
      </div>

      <!-- Turn + AP + Actions display -->
      <div style="display:flex;gap:12px;flex-shrink:0;align-items:center;">
        <span style="font-size:9px;color:var(--color-text-dim);letter-spacing:0.12em;">
          T{{ gameStore.turn }}
        </span>
        <span v-if="actionsThisTurn > 0" style="font-size:8px;letter-spacing:0.1em;color:#f59e0b;">
          ACT:{{ actionsThisTurn }}
        </span>
        <span style="font-size:8px;letter-spacing:0.12em;" :style="{ color: ap > 30 ? '#4ade80' : '#ef4444' }">
          AP:{{ ap }}
        </span>
      </div>

      <!-- Buttons: execute is full-width on mobile -->
      <div
        :style="isMobile
          ? 'display:flex;flex:1;gap:6px;'
          : 'display:flex;gap:6px;flex-shrink:0;'"
      >
        <!-- Execute button -->
        <button
          class="exec-btn"
          :class="{ pulse: canExecute && !loading }"
          :disabled="!canExecute || loading"
          :style="[
            canExecute && !loading ? 'box-shadow:0 0 12px rgba(74,222,128,0.3);' : '',
            isMobile ? 'flex:1;' : '',
          ]"
          @click="handleExecute"
        >
          <span v-if="loading">TRANSMITTING</span>
          <span v-else>③ EXECUTE</span>
        </button>

        <!-- End Turn button -->
        <button
          class="exec-btn"
          :style="actionsThisTurn > 0 ? 'background:transparent;border-color:#f59e0b;color:#f59e0b;' : 'background:transparent;border-color:var(--color-text-dim);'"
          :disabled="loading"
          @click="handleEndTurn"
        >
          END TURN
        </button>
      </div>
    </div>
  </div>
</template>
