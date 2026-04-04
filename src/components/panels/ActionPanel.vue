<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { ACTIONS, COMPOUND_ACTIONS, POSTURE_CONFIG, POSTURE_ORDER, COMPOUND_UNLOCK_TURN } from '../../data/actions'
import type { ActionId, CompoundActionId, ActionPosture } from '../../types/game'
import ActionPreview from './ActionPreview.vue'

const gameStore = useGameStore()

const target = computed(() => gameStore.targetFaction)
const turn = computed(() => gameStore.turn)
const ap = computed(() => gameStore.playerAP)
const selectedActionId = computed(() => gameStore.selectedActionId)

// Track which posture group is expanded (null = none)
const expandedPosture = ref<ActionPosture | 'compound' | null>(null)

function togglePosture(posture: ActionPosture | 'compound'): void {
  expandedPosture.value = expandedPosture.value === posture ? null : posture
}

// Signature ability
const playerFaction = computed(() => gameStore.playerFaction)
const signature = computed(() => playerFaction.value?.signature ?? null)
const sigUsed = computed(() => signature.value?.used ?? true)
const sigNeedsTarget = computed(() => ['china', 'russia'].includes(gameStore.playerFactionId ?? ''))
const sigCanActivate = computed(() => {
  if (sigUsed.value) return false
  if (sigNeedsTarget.value && !target.value) return false
  return true
})

// Active signature modifier labels
const activeModifierLabels = computed(() => {
  return gameStore.signatureModifiers.map(m => {
    const turns = m.turnsRemaining === 999 ? '\u221E' : `${m.turnsRemaining}T`
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

// Actions grouped by posture, filtered by unlock turn
function actionsForPosture(posture: ActionPosture) {
  return ACTIONS.filter(a => a.posture === posture)
}

// Check if a posture has any unlocked actions
function postureUnlocked(posture: ActionPosture): boolean {
  return ACTIONS.some(a => a.posture === posture && a.unlockTurn <= turn.value)
}

// Next unlock turn for a posture (for teaser text)
function nextUnlockTurn(posture: ActionPosture): number | null {
  const locked = ACTIONS.filter(a => a.posture === posture && a.unlockTurn > turn.value)
  if (locked.length === 0) return null
  return Math.min(...locked.map(a => a.unlockTurn))
}

// Compound actions available after COMPOUND_UNLOCK_TURN
const compoundActions = computed(() => {
  return turn.value >= COMPOUND_UNLOCK_TURN ? COMPOUND_ACTIONS : []
})

const compoundUnlocked = computed(() => turn.value >= COMPOUND_UNLOCK_TURN)

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
  // Check unlock turn for base actions
  const baseAction = ACTIONS.find(a => a.id === actionId)
  if (baseAction && baseAction.unlockTurn > turn.value) return true
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

function costColor(actionId: string, baseCost: number): string {
  if (isBlocked(actionId)) return 'var(--color-text-dim)'
  const cost = effectiveCost(actionId, baseCost)
  return ap.value >= cost ? '#4ade80' : '#ef4444'
}

function hasCostModifier(actionId: string, baseCost: number): boolean {
  return effectiveCost(actionId, baseCost) !== baseCost
}

// Auto-expand posture when an action in it is selected
const autoExpandedPosture = computed(() => {
  if (!selectedActionId.value) return null
  const action = ACTIONS.find(a => a.id === selectedActionId.value)
  if (action) return action.posture
  if (COMPOUND_ACTIONS.find(a => a.id === selectedActionId.value)) return 'compound' as const
  return null
})

// Effective expanded posture (manual override or auto from selection)
const effectiveExpanded = computed(() => {
  return expandedPosture.value ?? autoExpandedPosture.value
})
</script>

<template>
  <div style="padding:6px;border-top:1px solid var(--color-border);overflow-y:auto;">
    <!-- Header -->
    <div style="font-size:9px;letter-spacing:0.22em;padding:4px 2px 6px;">
      <span v-if="target" style="color:var(--color-text-dim);">\u2461 PICK ACTION vs {{ target.name.toUpperCase() }}</span>
      <span v-else style="color:var(--color-text-dim);opacity:0.5;">\u2461 PICK ACTION \u2014 select target first</span>
    </div>

    <!-- Signature Ability -->
    <div v-if="signature" style="margin-bottom:8px;">
      <div style="font-size:8px;letter-spacing:0.2em;padding:4px 2px;color:#f59e0b;opacity:0.7;">\u25C6 SIGNATURE ABILITY</div>
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
            \u25C6 {{ signature.name }}
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
        >\u25B6 {{ label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div style="border-top:1px solid var(--color-border);margin-bottom:6px;opacity:0.4;"></div>

    <!-- Posture Groups -->
    <div v-for="posture in POSTURE_ORDER" :key="posture" style="margin-bottom:4px;">
      <!-- Posture header (always visible) -->
      <button
        style="
          width:100%;
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:5px 8px;
          background:none;
          border:1px solid;
          cursor:pointer;
          font-family:var(--font-mono);
          font-size:9px;
          letter-spacing:0.18em;
          transition:all 0.15s;
        "
        :style="{
          borderColor: postureUnlocked(posture) ? POSTURE_CONFIG[posture].color + '60' : 'var(--color-border)',
          color: postureUnlocked(posture) ? POSTURE_CONFIG[posture].color : 'var(--color-text-dim)',
          opacity: postureUnlocked(posture) ? 1 : 0.4,
          cursor: postureUnlocked(posture) ? 'pointer' : 'default',
          background: effectiveExpanded === posture ? POSTURE_CONFIG[posture].color + '0a' : 'transparent',
        }"
        :disabled="!postureUnlocked(posture)"
        @click="postureUnlocked(posture) && togglePosture(posture)"
      >
        <span>
          {{ POSTURE_CONFIG[posture].icon }} {{ POSTURE_CONFIG[posture].label }}
        </span>
        <span v-if="!postureUnlocked(posture)" style="font-size:7px;letter-spacing:0.1em;opacity:0.6;">
          TURN {{ nextUnlockTurn(posture) }}
        </span>
        <span v-else style="font-size:8px;">
          {{ effectiveExpanded === posture ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <!-- Expanded actions for this posture -->
      <div v-if="effectiveExpanded === posture && postureUnlocked(posture)" style="padding:2px 0;">
        <div
          v-for="action in actionsForPosture(posture)"
          :key="action.id"
          class="action-btn"
          :class="{
            selected: selectedActionId === action.id,
            disabled: isDisabled(action.id),
          }"
          :style="{
            opacity: action.unlockTurn > turn ? 0.3 : 1,
            cursor: action.unlockTurn > turn ? 'default' : isDisabled(action.id) ? 'not-allowed' : 'pointer',
          }"
          @click="action.unlockTurn <= turn && selectAction(action.id)"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;">{{ action.icon }}</span>
              <span style="font-size:9px;letter-spacing:0.12em;color:var(--color-text-bright);">
                {{ action.label }}
              </span>
              <!-- Locked badge -->
              <span
                v-if="action.unlockTurn > turn"
                style="font-size:7px;letter-spacing:0.1em;color:var(--color-text-dim);border:1px solid var(--color-border);padding:1px 4px;"
              >
                TURN {{ action.unlockTurn }}
              </span>
              <!-- Blocked badge -->
              <span
                v-else-if="isBlocked(action.id)"
                style="font-size:7px;letter-spacing:0.1em;color:#ef4444;border:1px solid #ef4444;padding:1px 4px;"
              >
                BLOCKED
              </span>
            </div>

            <!-- Cost + cooldown -->
            <div v-if="action.unlockTurn <= turn" style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span
                v-if="cooldownRemaining(action.id) > 0"
                style="font-size:8px;color:var(--color-accent-danger);"
              >
                CD:{{ cooldownRemaining(action.id) }}
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
          </div>
        </div>
      </div>
    </div>

    <!-- Compound Actions (unlocks later) -->
    <div style="margin-top:2px;">
      <button
        style="
          width:100%;
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:5px 8px;
          background:none;
          border:1px solid;
          cursor:pointer;
          font-family:var(--font-mono);
          font-size:9px;
          letter-spacing:0.18em;
          transition:all 0.15s;
        "
        :style="{
          borderColor: compoundUnlocked ? '#c084fc60' : 'var(--color-border)',
          color: compoundUnlocked ? '#c084fc' : 'var(--color-text-dim)',
          opacity: compoundUnlocked ? 1 : 0.4,
          cursor: compoundUnlocked ? 'pointer' : 'default',
          background: effectiveExpanded === 'compound' ? '#c084fc0a' : 'transparent',
        }"
        :disabled="!compoundUnlocked"
        @click="compoundUnlocked && togglePosture('compound')"
      >
        <span>\u26A1 ADVANCED</span>
        <span v-if="!compoundUnlocked" style="font-size:7px;letter-spacing:0.1em;opacity:0.6;">
          TURN {{ COMPOUND_UNLOCK_TURN }}
        </span>
        <span v-else style="font-size:8px;">
          {{ effectiveExpanded === 'compound' ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="effectiveExpanded === 'compound' && compoundUnlocked" style="padding:2px 0;">
        <div
          v-for="action in compoundActions"
          :key="action.id"
          class="action-btn"
          :class="{
            selected: selectedActionId === action.id,
            disabled: isDisabled(action.id),
          }"
          @click="selectAction(action.id)"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;">{{ action.icon }}</span>
              <span style="font-size:9px;letter-spacing:0.12em;color:var(--color-text-bright);">
                {{ action.label }}
              </span>
              <span
                style="font-size:8px;letter-spacing:0.1em;color:var(--color-accent-warn);border:1px solid var(--color-accent-warn);padding:1px 4px;"
              >
                COMPOUND
              </span>
              <span
                v-if="isBlocked(action.id)"
                style="font-size:7px;letter-spacing:0.1em;color:#ef4444;border:1px solid #ef4444;padding:1px 4px;"
              >
                BLOCKED
              </span>
            </div>

            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span
                v-if="cooldownRemaining(action.id) > 0"
                style="font-size:8px;color:var(--color-accent-danger);"
              >
                CD:{{ cooldownRemaining(action.id) }}
              </span>
              <span style="font-size:8px;font-weight:bold;" :style="{ color: costColor(action.id, action.cost) }">
                <span v-if="hasCostModifier(action.id, action.cost)" style="text-decoration:line-through;opacity:0.5;margin-right:3px;">
                  {{ action.cost }}
                </span>
                {{ effectiveCost(action.id, action.cost) }}AP
              </span>
            </div>
          </div>

          <div style="font-size:9px;color:var(--color-text-dim);margin-top:3px;line-height:1.5;">
            {{ action.desc }}
            <span style="color:var(--color-accent-warn);font-size:8px;">
              · {{ action.requirement }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Preview: shows predicted consequences before executing -->
    <ActionPreview v-if="target && selectedActionId" />
  </div>
</template>
