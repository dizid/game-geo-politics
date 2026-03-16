<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useNewsStore } from '../../stores/newsStore'
import type { CrisisEvent } from '../../types/game'

const props = defineProps<{
  crisis: CrisisEvent
}>()

const emit = defineEmits<{
  resolved: [optionId: string]
}>()

const gameStore = useGameStore()
const newsStore = useNewsStore()

const selectedOption = ref<string | null>(null)

const optionLabels = ['A', 'B', 'C', 'D']

function selectOption(id: string): void {
  selectedOption.value = id
}

function confirm(): void {
  if (!selectedOption.value) return
  const option = props.crisis.options.find(o => o.id === selectedOption.value)
  if (!option) return

  // Apply stat changes
  gameStore.applyStatChanges(gameStore.playerFactionId!, option.statChanges)

  // Apply tension change
  gameStore.worldTension = Math.max(
    0,
    Math.min(100, gameStore.worldTension + option.tensionChange),
  )

  newsStore.addCrisis(
    `CRISIS RESPONSE: ${option.label} — ${option.description}`,
    gameStore.turn,
  )

  emit('resolved', selectedOption.value)
}

function statChangeText(changes: Partial<{ mil: number; eco: number; dip: number; inf: number }>): string {
  const parts: string[] = []
  if (changes.mil) parts.push(`MIL${changes.mil > 0 ? '+' : ''}${changes.mil}`)
  if (changes.eco) parts.push(`ECO${changes.eco > 0 ? '+' : ''}${changes.eco}`)
  if (changes.dip) parts.push(`DIP${changes.dip > 0 ? '+' : ''}${changes.dip}`)
  if (changes.inf) parts.push(`INF${changes.inf > 0 ? '+' : ''}${changes.inf}`)
  return parts.join(' ')
}

function statChangeColor(changes: Partial<{ mil: number; eco: number; dip: number; inf: number }>): string {
  const net = Object.values(changes).reduce((s, v) => s + (v ?? 0), 0)
  return net >= 0 ? '#4ade80' : '#ef4444'
}
</script>

<template>
  <div class="crisis-overlay">
    <div style="
      background:var(--color-bg-panel);
      border:1px solid #f97316;
      max-width:560px;
      width:94%;
      padding:24px;
      box-shadow:0 0 60px rgba(249,115,22,0.2);
      max-height:90vh;
      overflow-y:auto;
    ">
      <!-- Crisis header -->
      <div style="font-size:7px;letter-spacing:0.35em;color:#f97316;margin-bottom:10px;">
        ⚠ CRISIS EVENT — TURN {{ crisis.turn }}
      </div>

      <!-- Crisis title (type) -->
      <div style="
        font-family:var(--font-display);
        font-size:22px;
        letter-spacing:0.12em;
        color:#f97316;
        margin-bottom:12px;
      ">
        {{ crisis.type.replace(/_/g, ' ').toUpperCase() }}
      </div>

      <!-- Narrative -->
      <div style="
        padding:12px;
        background:rgba(249,115,22,0.06);
        border-left:2px solid #f97316;
        font-size:10px;
        line-height:1.7;
        color:var(--color-text-bright);
        margin-bottom:18px;
      ">
        {{ crisis.narrative }}
      </div>

      <!-- Option cards -->
      <div style="font-size:7px;letter-spacing:0.2em;color:var(--color-text-dim);margin-bottom:8px;">
        SELECT RESPONSE:
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">
        <div
          v-for="(option, idx) in crisis.options"
          :key="option.id"
          style="
            border:1px solid var(--color-border);
            padding:10px;
            cursor:pointer;
            transition:all 0.15s;
          "
          :style="{
            borderColor: selectedOption === option.id ? '#f97316' : 'var(--color-border)',
            background: selectedOption === option.id ? 'rgba(249,115,22,0.08)' : 'var(--color-bg-panel)',
          }"
          @click="selectOption(option.id)"
        >
          <!-- Option letter badge -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="
              font-family:var(--font-display);
              font-size:16px;
              color:#f97316;
              line-height:1;
            ">
              {{ optionLabels[idx] }}
            </span>
            <span style="font-size:8px;letter-spacing:0.1em;color:var(--color-text-bright);">
              {{ option.label }}
            </span>
          </div>

          <!-- Description -->
          <div style="font-size:8px;color:var(--color-text-dim);line-height:1.5;margin-bottom:7px;">
            {{ option.description }}
          </div>

          <!-- Stat changes -->
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span
              style="font-size:8px;font-weight:bold;"
              :style="{ color: statChangeColor(option.statChanges) }"
            >
              {{ statChangeText(option.statChanges) || 'NO STAT CHANGE' }}
            </span>
            <span
              style="font-size:7px;"
              :style="{ color: option.tensionChange > 0 ? '#ef4444' : '#4ade80' }"
            >
              T{{ option.tensionChange > 0 ? '+' : '' }}{{ option.tensionChange }}
            </span>
          </div>
        </div>
      </div>

      <!-- Confirm button -->
      <button
        class="exec-btn"
        style="width:100%;"
        :disabled="!selectedOption"
        @click="confirm"
      >
        CONFIRM RESPONSE
      </button>
    </div>
  </div>
</template>
