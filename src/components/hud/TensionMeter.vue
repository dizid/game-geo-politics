<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import type { TensionState } from '../../types/game'

const gameStore = useGameStore()

const tension = computed(() => gameStore.worldTension)
const state = computed<TensionState>(() => gameStore.tensionState)

const stateConfig: Record<TensionState, { label: string; color: string; cssClass: string }> = {
  stable:  { label: 'STABLE',  color: '#4ade80', cssClass: 'tension-stable' },
  tense:   { label: 'TENSE',   color: '#fbbf24', cssClass: 'tension-tense' },
  crisis:  { label: 'CRISIS',  color: '#f97316', cssClass: 'tension-crisis' },
  brink:   { label: 'BRINK',   color: '#ef4444', cssClass: 'tension-brink' },
  war:     { label: 'WAR',     color: '#dc2626', cssClass: 'tension-war' },
}

const cfg = computed(() => stateConfig[state.value])
</script>

<template>
  <div style="padding:6px 10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span style="font-size:9px;letter-spacing:0.2em;color:var(--color-text-dim);">WORLD TENSION</span>
      <span :class="cfg.color" style="font-size:9px;letter-spacing:0.15em;" :style="{ color: cfg.color }">
        {{ tension }}
      </span>
    </div>
    <!-- Bar track -->
    <div style="height:3px;background:#0a1f0a;border-radius:1px;position:relative;">
      <div
        style="height:100%;border-radius:1px;transition:width 0.5s ease;"
        :style="{ width: `${tension}%`, background: cfg.color }"
      />
    </div>
    <!-- State label -->
    <div style="margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
      <span
        :class="cfg.cssClass"
        style="font-size:8px;letter-spacing:0.25em;"
      >
        {{ cfg.label }}
      </span>
      <span style="font-size:9px;color:var(--color-text-dim);">{{ tension }}/100</span>
    </div>
  </div>
</template>
