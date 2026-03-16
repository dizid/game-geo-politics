<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore'
import type { PhaseInterrupt } from '../../engine/events/phaseInterrupts'

defineProps<{
  interrupt: PhaseInterrupt
}>()

const gameStore = useGameStore()

function handleAccept(): void {
  gameStore.resolveInterrupt(true)
}

function handleDecline(): void {
  gameStore.resolveInterrupt(false)
}

function handleAcknowledge(): void {
  gameStore.resolveInterrupt(false)
}
</script>

<template>
  <div style="
    position:fixed;
    inset:0;
    z-index:200;
    display:flex;
    align-items:center;
    justify-content:center;
    background:rgba(0,0,0,0.75);
  ">
    <div style="
      max-width:420px;
      width:90%;
      border:1px solid var(--color-border);
      background:var(--color-bg-panel);
      padding:20px;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <span style="font-size:18px;">{{ interrupt.icon }}</span>
        <div>
          <div style="font-family:var(--font-display);font-size:16px;letter-spacing:0.12em;color:#f59e0b;">
            {{ interrupt.headline }}
          </div>
          <div style="font-size:7px;letter-spacing:0.2em;color:var(--color-text-dim);">
            PHASE INTERRUPT — TURN {{ gameStore.turn }}
          </div>
        </div>
      </div>

      <!-- Description -->
      <div style="
        font-size:11px;
        line-height:1.7;
        color:var(--color-text-bright);
        margin-bottom:16px;
        padding:10px;
        border-left:2px solid var(--color-border);
        background:rgba(0,15,0,0.3);
      ">
        {{ interrupt.description }}
      </div>

      <!-- Stat effects preview (for setbacks/market shifts with no choice) -->
      <div
        v-if="!interrupt.choice && Object.keys(interrupt.effects).length > 0"
        style="margin-bottom:14px;font-size:9px;color:var(--color-text-dim);letter-spacing:0.1em;"
      >
        EFFECT:
        <span v-for="(val, key) in interrupt.effects" :key="key" style="margin-left:6px;">
          <span :style="{ color: (val as number) > 0 ? '#4ade80' : '#ef4444' }">
            {{ key.toString().toUpperCase() }} {{ (val as number) > 0 ? '+' : '' }}{{ val }}
          </span>
        </span>
      </div>

      <!-- Buttons -->
      <div v-if="interrupt.choice" style="display:flex;gap:8px;">
        <button
          class="exec-btn"
          style="flex:1;font-size:10px;"
          @click="handleAccept"
        >
          {{ interrupt.choice.accept.label }}
        </button>
        <button
          class="exec-btn"
          style="flex:1;font-size:10px;background:transparent;border-color:var(--color-text-dim);"
          @click="handleDecline"
        >
          {{ interrupt.choice.decline.label }}
        </button>
      </div>
      <div v-else>
        <button
          class="exec-btn"
          style="width:100%;font-size:10px;"
          @click="handleAcknowledge"
        >
          ACKNOWLEDGED
        </button>
      </div>
    </div>
  </div>
</template>
