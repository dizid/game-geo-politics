<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { PowerHistoryEntry, Faction } from '../../types/game'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const props = defineProps<{
  history: PowerHistoryEntry[]
  factions: Faction[]
}>()

const TOP_N = 6

// Determine top-6 factions by their latest power value
const topFactions = computed<Faction[]>(() => {
  if (props.history.length === 0) return props.factions.slice(0, TOP_N)
  const latest = props.history[props.history.length - 1]
  return [...props.factions]
    .sort((a, b) => (latest[b.id] ?? 0) - (latest[a.id] ?? 0))
    .slice(0, TOP_N)
})

const hasData = computed(() => props.history.length >= 2)

const chartData = computed(() => {
  const labels = props.history.map(h => `T${h.turn}`)
  const datasets = topFactions.value.map(faction => ({
    label: faction.name,
    data: props.history.map(h => h[faction.id] ?? 0),
    borderColor: faction.color,
    backgroundColor: faction.color + '18',
    borderWidth: 1.5,
    pointRadius: 2,
    pointBackgroundColor: faction.color,
    tension: 0.3,
  }))
  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: '#4ade80',
        font: { family: "'IBM Plex Mono', monospace", size: 7 },
        boxWidth: 8,
        padding: 8,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(2,10,5,0.95)',
      borderColor: '#0e2a14',
      borderWidth: 1,
      titleColor: '#4ade80',
      bodyColor: '#4ade80',
      titleFont: { family: "'IBM Plex Mono', monospace", size: 9 },
      bodyFont: { family: "'IBM Plex Mono', monospace", size: 9 },
    },
  },
  scales: {
    x: {
      grid: { color: '#0a1f0a', lineWidth: 0.5 },
      ticks: {
        color: '#0e3a14',
        font: { family: "'IBM Plex Mono', monospace", size: 7 },
        maxRotation: 0,
      },
    },
    y: {
      min: 30,
      max: 100,
      grid: { color: '#0a1f0a', lineWidth: 0.5 },
      ticks: {
        color: '#0e3a14',
        font: { family: "'IBM Plex Mono', monospace", size: 7 },
        stepSize: 10,
      },
    },
  },
}))
</script>

<template>
  <div style="
    height:138px;
    border-top:1px solid var(--color-border);
    background:var(--color-bg-panel);
    position:relative;
    flex-shrink:0;
  ">
    <!-- Header -->
    <div style="
      position:absolute;
      top:4px;left:8px;
      font-size:6px;
      letter-spacing:0.22em;
      color:var(--color-text-dim);
      z-index:1;
    ">
      POWER INDEX
    </div>

    <!-- No-data message -->
    <div
      v-if="!hasData"
      style="
        display:flex;
        align-items:center;
        justify-content:center;
        height:100%;
        font-size:8px;
        letter-spacing:0.15em;
        color:var(--color-text-dim);
      "
    >
      DATA ACCUMULATES AFTER TURN 2
    </div>

    <!-- Chart -->
    <div v-else style="height:100%;padding:4px 4px 0;">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
