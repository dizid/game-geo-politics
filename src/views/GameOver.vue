<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useCoalitionStore } from '../stores/coalitionStore'
import { useRelationshipStore } from '../stores/relationshipStore'
import { calculatePower } from '../data/factions'
import { checkVictory, checkDefeat } from '../engine/balance/victoryDetector'
import type { GameState } from '../types/game'
import PowerChart from '../components/charts/PowerChart.vue'
import StatBar from '../components/common/StatBar.vue'

const gameStore = useGameStore()
const coalitionStore = useCoalitionStore()
const relStore = useRelationshipStore()

const player = computed(() => gameStore.playerFaction)

// Build GameState for victory/defeat detector
const gameState = computed<GameState>(() => ({
  phase: gameStore.phase,
  turn: gameStore.turn,
  playerFactionId: gameStore.playerFactionId,
  playerAP: gameStore.playerAP,
  factions: gameStore.factions,
  selectedTargetId: gameStore.selectedTargetId,
  selectedActionId: gameStore.selectedActionId,
  worldTension: gameStore.worldTension,
  powerHistory: gameStore.powerHistory,
  cooldowns: gameStore.cooldowns,
  loading: gameStore.loading,
  apiKey: gameStore.apiKey,
  signatureUsed: gameStore.signatureUsed,
  signatureModifiers: gameStore.signatureModifiers,
  dominationStreak: gameStore.dominationStreak,
  failedStateStreak: gameStore.failedStateStreak,
  actionsUsedOnFactions: gameStore.actionsUsedOnFactions,
  tradePartners: gameStore.tradePartners,
  turnsWithoutWar: gameStore.turnsWithoutWar,
  lowStatTurns: gameStore.lowStatTurns,
  difficulty: gameStore.difficulty,
}))

// Use victoryDetector as single source of truth
const victoryResult = computed(() =>
  checkVictory(gameState.value, coalitionStore.coalitions, Object.values(relStore.relationships))
)

const defeatResult = computed(() => checkDefeat(gameState.value))

const isVictory = computed(() => victoryResult.value?.won === true)

const VICTORY_LABELS: Record<string, string> = {
  domination: 'DOMINATION VICTORY',
  diplomatic: 'DIPLOMATIC VICTORY',
  economic: 'ECONOMIC VICTORY',
  influence: 'INFLUENCE VICTORY',
  underdog: 'UNDERDOG VICTORY',
}

const DEFEAT_LABELS: Record<string, string> = {
  collapse: 'STRATEGIC COLLAPSE',
  failed_state: 'FAILED STATE',
  catastrophe: 'GLOBAL CATASTROPHE',
}

const victoryLabel = computed(() => {
  if (victoryResult.value?.won) {
    return VICTORY_LABELS[victoryResult.value.type] ?? 'STRATEGIC VICTORY'
  }
  return 'STRATEGIC VICTORY'
})

const defeatLabel = computed(() => {
  if (defeatResult.value?.lost) {
    return DEFEAT_LABELS[defeatResult.value.type] ?? 'DEFEAT'
  }
  return 'DEFEAT'
})

const outcomeNarrative = computed(() => {
  if (isVictory.value && victoryResult.value) {
    return victoryResult.value.message
  }
  if (defeatResult.value?.lost) {
    return defeatResult.value.message
  }
  return `After ${gameStore.turn} turns, ${player.value?.name}'s strategic journey has come to an end.`
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
