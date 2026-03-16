<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { calculatePower } from '../data/factions'
import PowerChart from '../components/charts/PowerChart.vue'
import StatBar from '../components/common/StatBar.vue'

const gameStore = useGameStore()

const player = computed(() => gameStore.playerFaction)

// Determine win/loss and type from final state
const isVictory = computed(() => {
  if (!player.value) return false
  const power = calculatePower(player.value)
  const ds = gameStore.dominationStreak
  const p = player.value
  return (
    (ds >= 5 && power >= 85) ||
    (gameStore.turnsWithoutWar >= 10 && p.dip >= 80) ||
    (gameStore.tradePartners.size >= 5 && p.eco >= 85) ||
    (gameStore.actionsUsedOnFactions['propaganda']?.size >= 6 && p.inf >= 80)
  )
})

const victoryLabel = computed(() => {
  if (!player.value) return ''
  const p = player.value
  if (gameStore.dominationStreak >= 5) return 'DOMINATION VICTORY'
  if (gameStore.turnsWithoutWar >= 10 && p.dip >= 80) return 'DIPLOMATIC VICTORY'
  if (gameStore.tradePartners.size >= 5 && p.eco >= 85) return 'ECONOMIC VICTORY'
  if ((gameStore.actionsUsedOnFactions['propaganda']?.size ?? 0) >= 6 && p.inf >= 80) return 'INFLUENCE VICTORY'
  return 'STRATEGIC VICTORY'
})

const defeatLabel = computed(() => {
  if (!player.value) return 'DEFEAT'
  if (gameStore.failedStateStreak >= 3) return 'FAILED STATE'
  if (gameStore.worldTension >= 100) return 'GLOBAL CATASTROPHE'
  return 'STRATEGIC COLLAPSE'
})

const outcomeNarrative = computed(() => {
  if (isVictory.value) {
    return `After ${gameStore.turn} turns of relentless strategic manoeuvring, ${player.value?.name} has emerged as the dominant force on the world stage. Your decisions have reshaped global alliances, redefined power balances, and etched your name into the annals of geopolitical history.`
  }
  return `Despite your best efforts, ${player.value?.name} could not withstand the pressures of an unforgiving world. Internal weaknesses, international opposition, and a rapidly deteriorating global order brought your strategic vision to an early end after ${gameStore.turn} turns.`
})

const power = computed(() => player.value ? calculatePower(player.value) : 0)

function restart(): void {
  gameStore.setPhase('select')
}
</script>

<template>
  <div style="
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:40px 20px;
    background:var(--color-bg);
  ">
    <!-- Main outcome title -->
    <div style="
      font-family:var(--font-display);
      font-size:clamp(56px, 10vw, 96px);
      letter-spacing:0.15em;
      margin-bottom:8px;
      text-shadow:0 0 40px currentColor;
      animation:flicker 6s infinite;
    "
    :style="{ color: isVictory ? '#4ade80' : '#ef4444' }"
    >
      {{ isVictory ? 'VICTORY' : 'DEFEAT' }}
    </div>

    <!-- Victory/defeat type -->
    <div style="
      font-size:11px;
      letter-spacing:0.35em;
      margin-bottom:32px;
    "
    :style="{ color: isVictory ? '#4ade80' : '#ef4444' }"
    >
      {{ isVictory ? victoryLabel : defeatLabel }}
    </div>

    <!-- Content card -->
    <div style="
      max-width:680px;
      width:100%;
      border:1px solid var(--color-border);
      background:var(--color-bg-panel);
      padding:28px;
    ">
      <!-- Player faction identity -->
      <div v-if="player" style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--color-border);">
        <span style="font-size:36px;">{{ player.flag }}</span>
        <div>
          <div style="font-family:var(--font-display);font-size:22px;letter-spacing:0.1em;color:var(--color-text-bright);">
            {{ player.name.toUpperCase() }}
          </div>
          <div style="font-size:8px;letter-spacing:0.18em;color:var(--color-text-dim);">
            {{ player.difficulty.toUpperCase() }} DIFFICULTY · {{ gameStore.turn }} TURNS
          </div>
        </div>
      </div>

      <!-- Narrative -->
      <div style="
        font-size:11px;
        line-height:1.8;
        color:var(--color-text-bright);
        margin-bottom:22px;
        padding:14px;
        background:#01100501;
        border-left:2px solid var(--color-border);
      ">
        {{ outcomeNarrative }}
      </div>

      <!-- Final stats -->
      <div v-if="player" style="margin-bottom:22px;">
        <div style="font-size:7px;letter-spacing:0.25em;color:var(--color-text-dim);margin-bottom:10px;">
          FINAL STATS — POWER: {{ power }}
        </div>
        <div style="display:grid;gap:6px;">
          <StatBar label="MIL" :value="player.mil" color="var(--color-stat-mil)" :show-label="true" />
          <StatBar label="ECO" :value="player.eco" color="var(--color-stat-eco)" :show-label="true" />
          <StatBar label="DIP" :value="player.dip" color="var(--color-stat-dip)" :show-label="true" />
          <StatBar label="INF" :value="player.inf" color="var(--color-stat-inf)" :show-label="true" />
        </div>
      </div>

      <!-- Power chart full history -->
      <div style="margin-bottom:24px;border:1px solid var(--color-border);">
        <div style="padding:6px 10px;font-size:7px;letter-spacing:0.22em;color:var(--color-text-dim);border-bottom:1px solid var(--color-border);">
          POWER HISTORY
        </div>
        <PowerChart
          :history="gameStore.powerHistory"
          :factions="gameStore.factions"
        />
      </div>

      <!-- Restart -->
      <button class="exec-btn" style="width:100%;font-size:11px;" @click="restart">
        NEW GAME
      </button>
    </div>
  </div>
</template>
