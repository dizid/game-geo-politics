<script setup lang="ts">
import type { Faction } from '../../types/game'
import { MAP_REGIONS } from '../../data/mapRegions'
import MapRegion from './MapRegion.vue'

const props = defineProps<{
  factions: Faction[]
  playerFactionId: string | null
  selectedTargetId: string | null
}>()

const emit = defineEmits<{
  'select-region': [factionId: string]
}>()

function getFaction(id: string): Faction | undefined {
  return props.factions.find(f => f.id === id)
}
</script>

<template>
  <svg
    viewBox="0 0 900 450"
    width="100%"
    height="100%"
    style="display:block;background:#020e05;"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <!-- Ocean gradient -->
      <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#021a0a" />
        <stop offset="100%" stop-color="#010a04" />
      </radialGradient>

      <!-- Vignette -->
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="60%" stop-color="transparent" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.75)" />
      </radialGradient>

      <!-- Scanline filter -->
      <filter id="scanFilter" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0 0.5" numOctaves="1" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
        <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
        <feComponentTransfer in="blended">
          <feFuncA type="linear" slope="0.97" />
        </feComponentTransfer>
      </filter>

      <!-- Glow filter for player region -->
      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Ocean background -->
    <rect width="900" height="450" fill="url(#oceanGrad)" />

    <!-- Grid lines — longitude -->
    <g stroke="#0a2a0a" stroke-width="0.4" opacity="0.6">
      <line v-for="x in [90,180,270,360,450,540,630,720,810]" :key="`v${x}`"
        :x1="x" y1="0" :x2="x" y2="450" />
    </g>

    <!-- Grid lines — latitude -->
    <g stroke="#0a2a0a" stroke-width="0.4" opacity="0.6">
      <line v-for="y in [90,180,270,360]" :key="`h${y}`"
        x1="0" :y1="y" x2="900" :y2="y" />
    </g>

    <!-- Equator -->
    <line x1="0" y1="225" x2="900" y2="225"
      stroke="#1a4a1a" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.8" />

    <!-- Graticule label: equator -->
    <text x="4" y="223" fill="#0e3a14" font-size="6" font-family="'IBM Plex Mono',monospace">EQ</text>

    <!-- Map regions -->
    <g>
      <template v-for="(region, factionId) in MAP_REGIONS" :key="factionId">
        <MapRegion
          v-if="getFaction(factionId)"
          :faction="getFaction(factionId)!"
          :region="region"
          :is-player="factionId === playerFactionId"
          :is-target="factionId === selectedTargetId"
          @click="emit('select-region', factionId)"
        />
      </template>
    </g>

    <!-- Coordinate labels -->
    <g fill="#0e3a14" font-size="5.5" font-family="'IBM Plex Mono',monospace" opacity="0.7">
      <text x="4" y="10">90°N</text>
      <text x="4" y="117">45°N</text>
      <text x="4" y="230">0°</text>
      <text x="4" y="342">45°S</text>
      <text x="4" y="447">90°S</text>
      <text x="84" y="447">180°W</text>
      <text x="432" y="447">0°</text>
      <text x="875" y="447">180°E</text>
    </g>

    <!-- Vignette overlay -->
    <rect width="900" height="450" fill="url(#vignette)" style="pointer-events:none;" />

    <!-- Corner brackets — CRT aesthetic -->
    <g stroke="#1a4a1a" stroke-width="1" fill="none" opacity="0.6">
      <polyline points="0,20 0,0 20,0" />
      <polyline points="880,0 900,0 900,20" />
      <polyline points="0,430 0,450 20,450" />
      <polyline points="880,450 900,450 900,430" />
    </g>
  </svg>
</template>
