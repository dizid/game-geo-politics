<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import GameHeader from '../components/hud/GameHeader.vue'
import CommandBar from '../components/hud/CommandBar.vue'
import TensionMeter from '../components/hud/TensionMeter.vue'
import VictoryTracker from '../components/hud/VictoryTracker.vue'
import FactionList from '../components/panels/FactionList.vue'
import ActionPanel from '../components/panels/ActionPanel.vue'
import IntelFeed from '../components/panels/IntelFeed.vue'
import WorldMap from '../components/map/WorldMap.vue'
import PowerChart from '../components/charts/PowerChart.vue'
import CoalitionPanel from '../components/coalition/CoalitionPanel.vue'
import CoalitionProposal from '../components/coalition/CoalitionProposal.vue'
import CrisisModal from '../components/crisis/CrisisModal.vue'
import TutorialOverlay from '../components/tutorial/TutorialOverlay.vue'
import type { CrisisEvent } from '../types/game'

const gameStore = useGameStore()

const phase = computed(() => gameStore.phase)
const turn = computed(() => gameStore.turn)
const showTutorial = computed(() => turn.value <= 3)

// Crisis state — in a real game this comes from the narrative engine
// Here we expose a ref that the engine layer can populate
const activeCrisis = ref<CrisisEvent | null>(null)
const showCrisis = computed(() => phase.value === 'crisis' && activeCrisis.value !== null)

function handleMapSelect(factionId: string): void {
  if (factionId !== gameStore.playerFactionId) {
    gameStore.setTarget(factionId)
  }
}

function handleCrisisResolved(_optionId: string): void {
  activeCrisis.value = null
  gameStore.setPhase('action')
}
</script>

<template>
  <div style="
    height:100vh;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    background:var(--color-bg);
    position:relative;
  ">
    <!-- Header -->
    <GameHeader />

    <!-- 3-panel body -->
    <div style="flex:1;display:flex;overflow:hidden;min-height:0;">
      <!-- Left panel: 215px -->
      <div style="
        width:215px;
        flex-shrink:0;
        display:flex;
        flex-direction:column;
        border-right:1px solid var(--color-border);
        overflow:hidden;
      ">
        <FactionList />
        <ActionPanel />
      </div>

      <!-- Center: map + chart -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">
        <div style="flex:1;overflow:hidden;min-height:0;">
          <WorldMap
            :factions="gameStore.factions"
            :player-faction-id="gameStore.playerFactionId"
            :selected-target-id="gameStore.selectedTargetId"
            @select-region="handleMapSelect"
          />
        </div>
        <PowerChart
          :history="gameStore.powerHistory"
          :factions="gameStore.factions"
        />
      </div>

      <!-- Right panel: 272px -->
      <div style="
        width:272px;
        flex-shrink:0;
        display:flex;
        flex-direction:column;
        border-left:1px solid var(--color-border);
        overflow:hidden;
      ">
        <!-- Tension meter at top -->
        <TensionMeter />

        <!-- Victory tracker collapsible -->
        <div style="padding:6px;border-bottom:1px solid var(--color-border);">
          <VictoryTracker />
        </div>

        <!-- Coalition panel -->
        <div style="padding:6px;border-bottom:1px solid var(--color-border);">
          <CoalitionPanel />
        </div>

        <!-- Intel feed fills remainder -->
        <div style="flex:1;overflow:hidden;min-height:0;">
          <IntelFeed />
        </div>
      </div>
    </div>

    <!-- Bottom command bar -->
    <CommandBar />

    <!-- Crisis modal overlay -->
    <CrisisModal
      v-if="showCrisis && activeCrisis"
      :crisis="activeCrisis"
      @resolved="handleCrisisResolved"
    />

    <!-- Coalition proposal overlay -->
    <CoalitionProposal />

    <!-- Tutorial overlay (turns 1-3) -->
    <TutorialOverlay v-if="showTutorial" />
  </div>
</template>
