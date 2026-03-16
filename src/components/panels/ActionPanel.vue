<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { ACTIONS, COMPOUND_ACTIONS } from '../../data/actions'
import type { ActionId, CompoundActionId } from '../../types/game'

const gameStore = useGameStore()

const target = computed(() => gameStore.targetFaction)
const turn = computed(() => gameStore.turn)
const ap = computed(() => gameStore.playerAP)
const selectedActionId = computed(() => gameStore.selectedActionId)

// Show compound actions after turn 8
const visibleActions = computed(() => {
  const base = ACTIONS
  const compound = turn.value >= 8 ? COMPOUND_ACTIONS : []
  return [...base, ...compound]
})

function isDisabled(actionId: ActionId | CompoundActionId): boolean {
  const action = ACTIONS.find(a => a.id === actionId) ?? COMPOUND_ACTIONS.find(a => a.id === actionId)
  if (!action) return true
  if (ap.value < action.cost) return true
  if (!target.value) return true
  return gameStore.isOnCooldown(actionId as ActionId, target.value.id)
}

function cooldownRemaining(actionId: ActionId | CompoundActionId): number {
  if (!target.value) return 0
  const cd = gameStore.cooldowns.find(c => {
    if (c.actionId !== actionId) return false
    if (c.expiresAtTurn <= gameStore.turn) return false
    return true
  })
  return cd ? cd.expiresAtTurn - gameStore.turn : 0
}

function selectAction(id: ActionId | CompoundActionId): void {
  if (isDisabled(id)) return
  gameStore.setAction(id)
}

// Cost color: affordable = green, too expensive = red
function costColor(cost: number): string {
  return ap.value >= cost ? '#4ade80' : '#ef4444'
}
</script>

<template>
  <div style="padding:6px;border-top:1px solid var(--color-border);">
    <!-- Header -->
    <div style="font-size:7px;letter-spacing:0.22em;color:var(--color-text-dim);padding:4px 2px 6px;">
      <span v-if="target">ACTIONS vs {{ target.name.toUpperCase() }}</span>
      <span v-else>SELECT TARGET FIRST</span>
    </div>

    <!-- Action list -->
    <div
      v-for="action in visibleActions"
      :key="action.id"
      class="action-btn"
      :class="{
        selected: selectedActionId === action.id,
        disabled: isDisabled(action.id as ActionId | CompoundActionId),
      }"
      @click="selectAction(action.id as ActionId | CompoundActionId)"
    >
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <!-- Icon + label -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;">{{ action.icon }}</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:var(--color-text-bright);">
            {{ action.label }}
          </span>
          <!-- Compound badge -->
          <span
            v-if="'components' in action"
            style="font-size:6px;letter-spacing:0.1em;color:var(--color-accent-warn);border:1px solid var(--color-accent-warn);padding:1px 4px;"
          >
            COMPOUND
          </span>
        </div>

        <!-- Cost + cooldown -->
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span
            v-if="cooldownRemaining(action.id as ActionId | CompoundActionId) > 0"
            style="font-size:7px;color:var(--color-accent-danger);"
          >
            CD:{{ cooldownRemaining(action.id as ActionId | CompoundActionId) }}
          </span>
          <span style="font-size:8px;font-weight:bold;" :style="{ color: costColor(action.cost) }">
            {{ action.cost }}AP
          </span>
        </div>
      </div>

      <!-- Description -->
      <div style="font-size:7px;color:var(--color-text-dim);margin-top:3px;line-height:1.5;">
        {{ action.desc }}
      </div>
    </div>
  </div>
</template>
