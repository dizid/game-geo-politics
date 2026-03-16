<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { calculatePower } from '../../data/factions'

const gameStore = useGameStore()

const player = computed(() => gameStore.playerFaction)
const turn = computed(() => gameStore.turn)
const ap = computed(() => gameStore.playerAP)
const loading = computed(() => gameStore.loading)
const turnModifier = computed(() => gameStore.activeTurnModifier)

// Turn → year: game starts in 2025
const year = computed(() => 2025 + turn.value - 1)

const apColor = computed(() => ap.value > 30 ? '#4ade80' : '#ef4444')

const power = computed(() => player.value ? calculatePower(player.value) : 0)
</script>

<template>
  <header style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 14px;
    height:38px;
    border-bottom:1px solid var(--color-border);
    background:var(--color-bg-panel);
    flex-shrink:0;
  ">
    <!-- Left: Logo + turn info -->
    <div style="display:flex;align-items:center;gap:14px;">
      <span style="font-family:var(--font-display);font-size:18px;letter-spacing:0.12em;color:var(--color-text);">
        GEO:CMD
      </span>
      <span style="font-size:10px;color:var(--color-text-dim);letter-spacing:0.2em;">
        TURN {{ turn }} · {{ year }}
      </span>
      <!-- Loading spinner -->
      <span v-if="loading" class="spin" title="Transmitting..." />
      <!-- Turn modifier badge -->
      <span
        v-if="turnModifier"
        style="font-size:8px;letter-spacing:0.15em;padding:2px 8px;border:1px solid #f59e0b;color:#f59e0b;background:rgba(245,158,11,0.08);"
        :title="turnModifier.description"
      >
        {{ turnModifier.icon }} {{ turnModifier.name }}
      </span>
    </div>

    <!-- Right: Player faction stats -->
    <div v-if="player" style="display:flex;align-items:center;gap:14px;">
      <!-- Flag + name -->
      <span style="font-size:13px;">{{ player.flag }}</span>
      <span style="font-size:8px;letter-spacing:0.18em;color:var(--color-text-bright);">
        {{ player.name.toUpperCase() }}
      </span>

      <!-- Stat chips -->
      <div style="display:flex;gap:8px;">
        <span style="font-size:9px;color:var(--color-stat-mil);">MIL:{{ player.mil }}</span>
        <span style="font-size:9px;color:var(--color-stat-eco);">ECO:{{ player.eco }}</span>
        <span style="font-size:9px;color:var(--color-stat-dip);">DIP:{{ player.dip }}</span>
        <span style="font-size:9px;color:var(--color-stat-inf);">INF:{{ player.inf }}</span>
      </div>

      <!-- Divider -->
      <span style="color:var(--color-border);font-size:10px;">|</span>

      <!-- Power -->
      <span style="font-size:9px;color:var(--color-text);">PWR:<strong>{{ power }}</strong></span>

      <!-- AP gauge -->
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:9px;letter-spacing:0.15em;color:var(--color-text-dim);">AP</span>
        <span style="font-size:10px;font-weight:bold;" :style="{ color: apColor }">{{ ap }}</span>
        <div style="width:40px;height:3px;background:#0a1f0a;border-radius:1px;">
          <div
            style="height:100%;border-radius:1px;transition:width 0.4s ease;"
            :style="{ width: `${Math.min(100, (ap / 120) * 100)}%`, background: apColor }"
          />
        </div>
      </div>
    </div>
  </header>
</template>
