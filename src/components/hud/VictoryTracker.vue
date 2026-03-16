<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { calculatePower, UNDERDOG_FACTIONS } from '../../data/factions'
import type { VictoryProgress } from '../../types/game'

const gameStore = useGameStore()
const collapsed = ref(false)

const player = computed(() => gameStore.playerFaction)

const victoryPaths = computed<VictoryProgress[]>(() => {
  if (!player.value) return []
  const p = player.value
  const power = calculatePower(p)
  const factions = gameStore.factions
  const sortedByPower = [...factions].sort(
    (a, b) => calculatePower(b) - calculatePower(a),
  )
  const rank = sortedByPower.findIndex(f => f.id === p.id) + 1
  const tradeCount = gameStore.tradePartners.size
  const infoWarTargets = gameStore.actionsUsedOnFactions['propaganda']?.size ?? 0
  const isUnderdog = UNDERDOG_FACTIONS.includes(p.id)

  return [
    {
      type: 'domination',
      label: 'DOMINATION',
      progress: Math.min(100, (gameStore.dominationStreak / 5) * 100),
      available: true,
      requirements: [
        { label: 'Power ≥ 85', met: power >= 85, current: power, target: 85 },
        { label: 'Maintain 5 turns', met: gameStore.dominationStreak >= 5, current: gameStore.dominationStreak, target: 5 },
      ],
    },
    {
      type: 'diplomatic',
      label: 'DIPLOMATIC',
      progress: Math.min(100, (gameStore.turnsWithoutWar / 10) * 100),
      available: true,
      requirements: [
        { label: '10 turns peace', met: gameStore.turnsWithoutWar >= 10, current: gameStore.turnsWithoutWar, target: 10 },
        { label: 'Rank #1 DIP', met: p.dip >= 80, current: p.dip, target: 80 },
      ],
    },
    {
      type: 'economic',
      label: 'ECONOMIC',
      progress: Math.min(100, (tradeCount / 5) * 100),
      available: true,
      requirements: [
        { label: '5 trade partners', met: tradeCount >= 5, current: tradeCount, target: 5 },
        { label: 'ECO ≥ 85', met: p.eco >= 85, current: p.eco, target: 85 },
      ],
    },
    {
      type: 'influence',
      label: 'INFLUENCE',
      progress: Math.min(100, (infoWarTargets / 6) * 100),
      available: true,
      requirements: [
        { label: 'Info War on 6 factions', met: infoWarTargets >= 6, current: infoWarTargets, target: 6 },
        { label: 'INF ≥ 80', met: p.inf >= 80, current: p.inf, target: 80 },
      ],
    },
    {
      type: 'underdog',
      label: 'UNDERDOG',
      progress: isUnderdog ? Math.min(100, (gameStore.lowStatTurns / 12) * 100) : 0,
      available: isUnderdog,
      requirements: [
        { label: 'Start as bottom-4 faction', met: isUnderdog, current: isUnderdog ? 'YES' : 'NO', target: 'YES' },
        { label: 'Survive 12 turns (no stat ≤25)', met: gameStore.lowStatTurns >= 12, current: gameStore.lowStatTurns, target: 12 },
        { label: 'Reach rank #1 power', met: rank === 1, current: `#${rank}`, target: '#1' },
      ],
    },
  ]
})

const bestPath = computed(() => {
  return [...victoryPaths.value]
    .filter(p => p.available)
    .sort((a, b) => b.progress - a.progress)[0]
})
</script>

<template>
  <div style="border:1px solid var(--color-border);border-radius:1px;">
    <!-- Header toggle -->
    <button
      style="
        width:100%;
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:6px 10px;
        background:none;
        border:none;
        cursor:pointer;
        border-bottom:1px solid var(--color-border);
        font-family:var(--font-mono);
        font-size:9px;
        letter-spacing:0.22em;
        color:var(--color-text-dim);
      "
      @click="collapsed = !collapsed"
    >
      <span>VICTORY PATHS</span>
      <span>{{ collapsed ? '▶' : '▼' }}</span>
    </button>

    <div v-if="!collapsed" style="padding:8px;">
      <template v-for="path in victoryPaths" :key="path.type">
        <div
          style="margin-bottom:8px;"
          :style="{ opacity: path.available ? 1 : 0.35 }"
        >
          <!-- Label + progress % -->
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span
              style="font-size:9px;letter-spacing:0.2em;"
              :style="{ color: path.type === bestPath?.type ? '#fbbf24' : 'var(--color-text-dim)' }"
            >
              {{ path.label }}
              <span v-if="path.type === bestPath?.type" style="color:#fbbf24;"> ★</span>
            </span>
            <span style="font-size:9px;color:var(--color-text-dim);">{{ Math.round(path.progress) }}%</span>
          </div>

          <!-- Progress bar -->
          <div style="height:2px;background:#0a1f0a;border-radius:1px;margin-bottom:4px;">
            <div
              style="height:100%;border-radius:1px;transition:width 0.5s ease;"
              :style="{
                width: `${path.progress}%`,
                background: path.type === bestPath?.type ? '#fbbf24' : '#4ade80',
              }"
            />
          </div>

          <!-- Requirements checklist -->
          <div v-for="req in path.requirements" :key="req.label" style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
            <span style="font-size:9px;" :style="{ color: req.met ? '#4ade80' : 'var(--color-text-dim)' }">
              {{ req.met ? '✓' : '○' }}
            </span>
            <span style="font-size:9px;color:var(--color-text-dim);">
              {{ req.label }} ({{ req.current }}/{{ req.target }})
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
