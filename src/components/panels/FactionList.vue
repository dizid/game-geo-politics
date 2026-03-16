<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useAgendaStore } from '../../stores/agendaStore'
import { calculatePower } from '../../data/factions'
import StatBar from '../common/StatBar.vue'

const gameStore = useGameStore()
const agendaStore = useAgendaStore()

const otherFactions = computed(() =>
  gameStore.factions.filter(f => f.id !== gameStore.playerFactionId),
)

function selectTarget(id: string): void {
  gameStore.setTarget(id)
}

function getAgendaInfo(factionId: string) {
  return agendaStore.getAgenda(factionId)
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
        <!-- Agenda info -->
        <div v-if="getAgendaInfo(faction.id)" style="margin-top:3px;">
          <div v-if="getAgendaInfo(faction.id)!.revealed" style="font-size:7px;letter-spacing:0.1em;color:#f59e0b;">
            {{ getAgendaInfo(faction.id)!.name }}
            <div style="height:2px;background:#1a1a1a;margin-top:2px;">
              <div
                style="height:100%;background:#f59e0b;transition:width 0.4s;"
                :style="{ width: `${getAgendaInfo(faction.id)!.progress}%` }"
              />
            </div>
          </div>
          <div v-else style="font-size:7px;letter-spacing:0.12em;color:var(--color-text-dim);">
            AGENDA: CLASSIFIED
          </div>
        </div>
      </div>

      <!-- Power number -->
      <span style="font-size:9px;color:var(--color-text);flex-shrink:0;font-weight:bold;">
        {{ calculatePower(faction) }}
      </span>
    </div>
  </div>
</template>
