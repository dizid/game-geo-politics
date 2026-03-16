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
import InterruptModal from '../components/hud/InterruptModal.vue'
import DiplomaticInbox from '../components/diplomacy/DiplomaticInbox.vue'
import StoryThreadPanel from '../components/narrative/StoryThreadPanel.vue'
import CovertOpsPanel from '../components/covert/CovertOpsPanel.vue'
import TutorialOverlay from '../components/tutorial/TutorialOverlay.vue'
import { useEventStore } from '../stores/eventStore'

const gameStore = useGameStore()
const eventStore = useEventStore()

const phase = computed(() => gameStore.phase)
const showTutorial = ref(true)

// Crisis state — wired to eventStore's activeCrisis
const showCrisis = computed(() => phase.value === 'crisis' && eventStore.activeCrisis !== null)
const showInterrupt = computed(() => phase.value === 'interrupt' && gameStore.activeInterrupt !== null)

function handleMapSelect(factionId: string): void {
  if (factionId !== gameStore.playerFactionId) {
    gameStore.setTarget(factionId)
  }
}

function handleCrisisResolved(optionId: string): void {
  eventStore.resolveCrisis(optionId)
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

        <!-- Story threads -->
        <StoryThreadPanel />

        <!-- Covert ops panel -->
        <CovertOpsPanel />

        <!-- Diplomatic inbox -->
        <div style="flex:1;overflow:hidden;min-height:0;border-bottom:1px solid var(--color-border);">
          <DiplomaticInbox />
        </div>

        <!-- Intel feed -->
        <div style="flex:1;overflow:hidden;min-height:0;">
          <IntelFeed />
        </div>
      </div>
    </div>

    <!-- Bottom command bar -->
    <CommandBar />

    <!-- Crisis modal overlay -->
    <CrisisModal
      v-if="showCrisis && eventStore.activeCrisis"
      :crisis="eventStore.activeCrisis"
      @resolved="handleCrisisResolved"
    />

    <!-- Phase interrupt overlay -->
    <InterruptModal
      v-if="showInterrupt && gameStore.activeInterrupt"
      :interrupt="gameStore.activeInterrupt"
    />

    <!-- Coalition proposal overlay -->
    <CoalitionProposal />

    <!-- Tutorial overlay (turns 1-3) -->
    <TutorialOverlay v-if="showTutorial" />
  </div>
</template>
