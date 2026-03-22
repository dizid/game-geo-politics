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

// Signature ability
const playerFaction = computed(() => gameStore.playerFaction)
const signature = computed(() => playerFaction.value?.signature ?? null)
const sigUsed = computed(() => signature.value?.used ?? true)
// Factions whose signature requires a target
const sigNeedsTarget = computed(() => ['china', 'russia'].includes(gameStore.playerFactionId ?? ''))
const sigCanActivate = computed(() => {
  if (sigUsed.value) return false
  if (sigNeedsTarget.value && !target.value) return false
  return true
})

// Active signature modifier labels for display
const activeModifierLabels = computed(() => {
  return gameStore.signatureModifiers.map(m => {
    const turns = m.turnsRemaining === 999 ? '∞' : `${m.turnsRemaining}T`
    const labels: Record<string, string> = {
      half_coalition_cost: `ENLARGEMENT (${turns})`,
      coalition_immunity: `AUTONOMY (${turns})`,
      info_war_inverted: `SOFT POWER (${turns})`,
      diplomacy_boost_25pct: `QUIET DIPLOMACY (${turns})`,
      usa_blocked: `MONROE REVERSAL (${turns})`,
      crash_resistance: `RESOURCE NATIONALISM (${turns})`,
    }
    return labels[m.type] ?? m.type
  })
})

function activateSig(): void {
  if (!sigCanActivate.value) return
  gameStore.activateSignature(target.value?.id)
}

// Show compound actions after turn 8
const visibleActions = computed(() => {
  const base = ACTIONS
  const compound = turn.value >= 8 ? COMPOUND_ACTIONS : []
  return [...base, ...compound]
})

function isBlocked(actionId: string): boolean {
  return gameStore.isActionBlocked(actionId)
}

function effectiveCost(actionId: string, baseCost: number): number {
  return gameStore.getEffectiveCost(actionId, baseCost)
}

function isDisabled(actionId: ActionId | CompoundActionId): boolean {
  if (isBlocked(actionId)) return true
  const action = ACTIONS.find(a => a.id === actionId) ?? COMPOUND_ACTIONS.find(a => a.id === actionId)
  if (!action) return true
  const cost = effectiveCost(actionId, action.cost)
  if (ap.value < cost) return true
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

// Cost color: affordable = green, too expensive = red, blocked = dim
function costColor(actionId: string, baseCost: number): string {
  if (isBlocked(actionId)) return 'var(--color-text-dim)'
  const cost = effectiveCost(actionId, baseCost)
  return ap.value >= cost ? '#4ade80' : '#ef4444'
}

function hasCostModifier(actionId: string, baseCost: number): boolean {
  return effectiveCost(actionId, baseCost) !== baseCost
}
</script>

<template>
  <div style="padding:6px;border-top:1px solid var(--color-border);overflow-y:auto;">
    <!-- Header -->
    <div style="font-size:9px;letter-spacing:0.22em;padding:4px 2px 6px;">
      <span v-if="target" style="color:var(--color-text-dim);">② PICK ACTION vs {{ target.name.toUpperCase() }}</span>
      <span v-else style="color:var(--color-text-dim);opacity:0.5;">② PICK ACTION — select target first</span>
    </div>

    <!-- Signature Ability -->
    <div v-if="signature" style="margin-bottom:8px;">
      <div style="font-size:8px;letter-spacing:0.2em;padding:4px 2px;color:#f59e0b;opacity:0.7;">◆ SIGNATURE ABILITY</div>
      <div
        style="border:1px solid #f59e0b;padding:6px 8px;cursor:pointer;transition:opacity 0.15s;"
        :style="{
          opacity: sigUsed ? 0.4 : 1,
          borderColor: sigUsed ? '#666' : '#f59e0b',
          cursor: sigCanActivate ? 'pointer' : 'not-allowed',
        }"
        @click="activateSig"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:9px;letter-spacing:0.12em;color:#fbbf24;font-weight:bold;">
            ◆ {{ signature.name }}
          </span>
          <span
            v-if="sigUsed"
            style="font-size:7px;letter-spacing:0.12em;padding:1px 5px;border:1px solid #666;color:#666;"
          >USED</span>
          <span
            v-else-if="sigNeedsTarget && !target"
            style="font-size:7px;letter-spacing:0.1em;color:#f59e0b;opacity:0.7;"
          >SELECT TARGET</span>
          <span
            v-else
            style="font-size:7px;letter-spacing:0.12em;padding:1px 5px;border:1px solid #f59e0b;color:#f59e0b;"
          >ACTIVATE</span>
        </div>
        <div style="font-size:9px;color:var(--color-text-dim);margin-top:3px;line-height:1.5;">
          {{ signature.description }}
        </div>
      </div>
      <!-- Active modifier status -->
      <div v-if="activeModifierLabels.length" style="margin-top:4px;">
        <span
          v-for="label in activeModifierLabels"
          :key="label"
          style="display:inline-block;font-size:7px;letter-spacing:0.1em;padding:2px 5px;border:1px solid #f59e0b;color:#f59e0b;margin-right:4px;margin-bottom:2px;"
        >▶ {{ label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div style="border-top:1px solid var(--color-border);margin-bottom:6px;opacity:0.4;"></div>

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
          <span style="font-size:9px;letter-spacing:0.12em;color:var(--color-text-bright);">
            {{ action.label }}
          </span>
          <!-- Compound badge -->
          <span
            v-if="'components' in action"
            style="font-size:8px;letter-spacing:0.1em;color:var(--color-accent-warn);border:1px solid var(--color-accent-warn);padding:1px 4px;"
          >
            COMPOUND
          </span>
          <!-- Blocked badge -->
          <span
            v-if="isBlocked(action.id)"
            style="font-size:7px;letter-spacing:0.1em;color:#ef4444;border:1px solid #ef4444;padding:1px 4px;"
          >
            BLOCKED
          </span>
        </div>

        <!-- Cost + cooldown -->
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span
            v-if="cooldownRemaining(action.id as ActionId | CompoundActionId) > 0"
            style="font-size:8px;color:var(--color-accent-danger);"
          >
            CD:{{ cooldownRemaining(action.id as ActionId | CompoundActionId) }}
          </span>
          <span style="font-size:8px;font-weight:bold;" :style="{ color: costColor(action.id, action.cost) }">
            <span v-if="hasCostModifier(action.id, action.cost)" style="text-decoration:line-through;opacity:0.5;margin-right:3px;">
              {{ action.cost }}
            </span>
            {{ effectiveCost(action.id, action.cost) }}AP
          </span>
        </div>
      </div>

      <!-- Description -->
      <div style="font-size:9px;color:var(--color-text-dim);margin-top:3px;line-height:1.5;">
        {{ action.desc }}
        <span v-if="'requirement' in action" style="color:var(--color-accent-warn);font-size:8px;">
          · {{ action.requirement }}
        </span>
      </div>
    </div>
  </div>
</template>
