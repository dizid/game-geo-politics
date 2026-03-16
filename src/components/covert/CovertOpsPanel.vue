<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCovertStore } from '../../stores/covertStore'
import { useGameStore } from '../../stores/gameStore'
import { COVERT_OP_TEMPLATES } from '../../data/covertOps'
import type { CovertOpType } from '../../data/covertOps'

const covertStore = useCovertStore()
const gameStore = useGameStore()

const showLaunchMenu = ref(false)

const ops = computed(() => covertStore.activeOpsList)
const canStart = computed(() => covertStore.canStartNew && gameStore.turn >= 5)
const hasTarget = computed(() => !!gameStore.selectedTargetId)

function toggleLaunchMenu(): void {
  showLaunchMenu.value = !showLaunchMenu.value
}

function launchOp(type: CovertOpType): void {
  if (!gameStore.selectedTargetId) return
  covertStore.startOperation(type, gameStore.selectedTargetId)
  showLaunchMenu.value = false
}

function invest(opId: string): void {
  covertStore.investInOperation(opId)
}

function abort(opId: string): void {
  covertStore.abortOperation(opId)
}

function exposureColor(risk: number): string {
  if (risk > 70) return '#ef4444'
  if (risk > 40) return '#f59e0b'
  return '#4ade80'
}
</script>

<template>
  <div v-if="gameStore.turn >= 5" style="padding:6px;border-bottom:1px solid var(--color-border);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:8px;letter-spacing:0.22em;color:var(--color-text-dim);">COVERT OPS</span>
      <button
        v-if="canStart && hasTarget"
        class="exec-btn"
        style="font-size:7px;padding:2px 6px;"
        @click="toggleLaunchMenu"
      >
        {{ showLaunchMenu ? 'CANCEL' : 'LAUNCH [15 AP]' }}
      </button>
    </div>

    <!-- Launch menu -->
    <div v-if="showLaunchMenu" style="margin-bottom:6px;">
      <div
        v-for="template in COVERT_OP_TEMPLATES"
        :key="template.type"
        class="action-btn"
        style="padding:4px 6px;margin-bottom:2px;"
        @click="launchOp(template.type)"
      >
        <div style="font-size:8px;color:var(--color-text-bright);letter-spacing:0.08em;">
          {{ template.name }}
        </div>
        <div style="font-size:7px;color:var(--color-text-dim);margin-top:2px;">
          {{ template.description }} · {{ template.duration }} turns · {{ Math.round(template.baseExposurePerTurn * 100) }}% exposure/turn
        </div>
      </div>
    </div>

    <!-- Active operations -->
    <div v-if="ops.length === 0 && !showLaunchMenu" style="font-size:8px;color:var(--color-text-dim);padding:4px 0;letter-spacing:0.1em;">
      {{ gameStore.turn >= 5 ? 'NO ACTIVE OPERATIONS' : 'UNLOCKS AT TURN 5' }}
    </div>

    <div v-for="op in ops" :key="op.id" style="border:1px solid var(--color-border);padding:6px;margin-bottom:4px;">
      <!-- Op header -->
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;letter-spacing:0.1em;color:var(--color-text-bright);">
          {{ COVERT_OP_TEMPLATES.find(t => t.type === op.type)?.name ?? op.type }}
        </span>
        <span style="font-size:7px;color:var(--color-text-dim);">
          → {{ op.targetFactionId }}
        </span>
      </div>

      <!-- Progress bar -->
      <div style="margin-top:4px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="font-size:7px;color:var(--color-text-dim);">PROGRESS</span>
          <span style="font-size:7px;color:#4ade80;">{{ op.progress }}%</span>
        </div>
        <div style="height:3px;background:#1a1a1a;">
          <div style="height:100%;background:#4ade80;transition:width 0.3s;" :style="{ width: `${op.progress}%` }" />
        </div>
      </div>

      <!-- Exposure bar -->
      <div style="margin-top:4px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="font-size:7px;color:var(--color-text-dim);">EXPOSURE RISK</span>
          <span style="font-size:7px;" :style="{ color: exposureColor(op.exposureRisk) }">{{ op.exposureRisk }}%</span>
        </div>
        <div style="height:3px;background:#1a1a1a;">
          <div
            style="height:100%;transition:width 0.3s;"
            :style="{ width: `${op.exposureRisk}%`, background: exposureColor(op.exposureRisk) }"
          />
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:4px;margin-top:6px;">
        <button
          class="exec-btn"
          style="flex:1;font-size:7px;padding:3px;"
          :disabled="gameStore.playerAP < (COVERT_OP_TEMPLATES.find(t => t.type === op.type)?.apPerInvestment ?? 10)"
          @click="invest(op.id)"
        >
          INVEST {{ COVERT_OP_TEMPLATES.find(t => t.type === op.type)?.apPerInvestment ?? 10 }}AP
        </button>
        <button
          class="exec-btn"
          style="flex:1;font-size:7px;padding:3px;background:transparent;border-color:#ef4444;color:#ef4444;"
          @click="abort(op.id)"
        >
          ABORT
        </button>
      </div>
    </div>
  </div>
</template>
