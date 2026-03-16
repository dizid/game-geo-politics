<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { calculatePower } from '../../data/factions'
import StatBar from '../common/StatBar.vue'

const gameStore = useGameStore()

const otherFactions = computed(() =>
  gameStore.factions.filter(f => f.id !== gameStore.playerFactionId),
)

function selectTarget(id: string): void {
  gameStore.setTarget(id)
}
</script>

<template>
  <div style="flex:1;overflow-y:auto;padding:6px;">
    <div style="font-size:9px;letter-spacing:0.25em;color:var(--color-text-dim);padding:4px 2px 6px;">
      FACTIONS
    </div>
    <div
      v-for="faction in otherFactions"
      :key="faction.id"
      class="faction-row"
      :class="{ selected: gameStore.selectedTargetId === faction.id }"
      @click="selectTarget(faction.id)"
    >
      <!-- Flag -->
      <span style="font-size:13px;flex-shrink:0;">{{ faction.flag }}</span>

      <!-- Name + bars -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:9px;letter-spacing:0.1em;color:var(--color-text-bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          {{ faction.name }}
        </div>
        <!-- Mini stat bars -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:3px;">
          <StatBar label="MIL" :value="faction.mil" color="var(--color-stat-mil)" />
          <StatBar label="ECO" :value="faction.eco" color="var(--color-stat-eco)" />
          <StatBar label="DIP" :value="faction.dip" color="var(--color-stat-dip)" />
          <StatBar label="INF" :value="faction.inf" color="var(--color-stat-inf)" />
        </div>
      </div>

      <!-- Power number -->
      <span style="font-size:9px;color:var(--color-text);flex-shrink:0;font-weight:bold;">
        {{ calculatePower(faction) }}
      </span>
    </div>
  </div>
</template>
