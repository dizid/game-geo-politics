<script setup lang="ts">
import type { Faction, MapRegion } from '../../types/game'

const props = defineProps<{
  faction: Faction
  region: MapRegion
  isPlayer: boolean
  isTarget: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <g
    class="map-region"
    style="cursor:pointer"
    @click="emit('click')"
  >
    <!-- Region polygon -->
    <polygon
      :points="region.pts"
      :fill="faction.color"
      :fill-opacity="isPlayer ? 0.55 : isTarget ? 0.45 : 0.25"
      :stroke="isPlayer ? faction.color : isTarget ? '#ffffff' : faction.color"
      :stroke-width="isPlayer ? 1.5 : isTarget ? 1.2 : 0.5"
      :stroke-opacity="isPlayer ? 1 : isTarget ? 0.9 : 0.6"
    >
      <animate
        v-if="isPlayer"
        attributeName="fill-opacity"
        values="0.55;0.7;0.55"
        dur="3s"
        repeatCount="indefinite"
      />
    </polygon>

    <!-- Target crosshair reticle -->
    <g v-if="isTarget">
      <line
        :x1="region.lx - 8" :y1="region.ly"
        :x2="region.lx + 8" :y2="region.ly"
        stroke="#ff4444" stroke-width="0.8" stroke-opacity="0.9"
      />
      <line
        :x1="region.lx" :y1="region.ly - 8"
        :x2="region.lx" :y2="region.ly + 8"
        stroke="#ff4444" stroke-width="0.8" stroke-opacity="0.9"
      />
      <circle
        :cx="region.lx" :cy="region.ly" r="5"
        fill="none" stroke="#ff4444" stroke-width="0.7" stroke-opacity="0.8"
      >
        <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- Player beacon -->
    <g v-if="isPlayer">
      <circle
        :cx="region.lx" :cy="region.ly" r="4"
        :fill="faction.color" fill-opacity="0.9"
      />
      <circle
        :cx="region.lx" :cy="region.ly" r="4"
        fill="none" :stroke="faction.color" stroke-width="1"
      >
        <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- Region label -->
    <text
      :x="region.lx"
      :y="region.ly + (isPlayer || isTarget ? 18 : 14)"
      text-anchor="middle"
      :fill="isPlayer ? faction.color : isTarget ? '#ff8888' : faction.color"
      :fill-opacity="isPlayer || isTarget ? 1 : 0.75"
      font-size="7"
      font-family="'IBM Plex Mono', monospace"
      letter-spacing="0.15em"
      style="pointer-events:none;text-transform:uppercase;"
    >
      {{ faction.flag }}
    </text>
  </g>
</template>
