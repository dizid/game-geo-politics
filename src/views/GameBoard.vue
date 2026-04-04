<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useBreakpoint } from '../composables/useBreakpoint'
import { ACTIONS } from '../data/actions'
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
const { isMobile, isTablet } = useBreakpoint()

const phase = computed(() => gameStore.phase)
const showTutorial = ref(true)

// Mobile tab state
type MobileTab = 'map' | 'act' | 'intel' | 'status'
const activeTab = ref<MobileTab>('map')

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

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent): void {
  // Don't intercept when a modal is open
  if (showCrisis.value || showInterrupt.value) return
  // Don't intercept when typing in an input
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return

  switch (e.key) {
    case 'Enter':
      // Execute action
      if (gameStore.canExecute && !gameStore.loading) {
        e.preventDefault()
        gameStore.executeAction()
      }
      break
    case 'e':
    case 'E':
      // End turn
      if (!gameStore.loading) {
        e.preventDefault()
        gameStore.endTurn()
      }
      break
    case 'Escape':
      // Deselect current target/action
      gameStore.clearSelection()
      break
    case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': {
      // Quick action select — number maps to visible unlocked actions
      const unlocked = ACTIONS.filter(a => a.unlockTurn <= gameStore.turn)
      const idx = parseInt(e.key) - 1
      if (idx < unlocked.length && gameStore.targetFaction) {
        gameStore.setAction(unlocked[idx].id)
      }
      break
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
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

    <!-- ═══════════════════════════════════════════════════════════════
         MOBILE LAYOUT — single tab panel, bottom tab bar
    ═══════════════════════════════════════════════════════════════ -->
    <template v-if="isMobile">
      <!-- Tab content area: fills all space between header and tab bar -->
      <div style="flex:1;overflow:hidden;min-height:0;position:relative;">

        <!-- MAP tab: WorldMap + PowerChart -->
        <div v-show="activeTab === 'map'" style="height:100%;display:flex;flex-direction:column;overflow:hidden;">
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

        <!-- ACT tab: FactionList + ActionPanel -->
        <div v-show="activeTab === 'act'" style="height:100%;display:flex;flex-direction:column;overflow-y:auto;">
          <FactionList />
          <ActionPanel />
        </div>

        <!-- INTEL tab: DiplomaticInbox + IntelFeed + CovertOpsPanel -->
        <div v-show="activeTab === 'intel'" style="height:100%;display:flex;flex-direction:column;overflow-y:auto;">
          <DiplomaticInbox />
          <IntelFeed />
          <CovertOpsPanel />
        </div>

        <!-- STATUS tab: TensionMeter + VictoryTracker + CoalitionPanel + StoryThreadPanel -->
        <div v-show="activeTab === 'status'" style="height:100%;display:flex;flex-direction:column;overflow-y:auto;">
          <TensionMeter />
          <div style="padding:6px;border-bottom:1px solid var(--color-border);">
            <VictoryTracker />
          </div>
          <div style="padding:6px;border-bottom:1px solid var(--color-border);">
            <CoalitionPanel />
          </div>
          <StoryThreadPanel />
        </div>
      </div>

      <!-- CommandBar: positioned above the tab bar -->
      <CommandBar />

      <!-- Bottom tab bar (48px, CRT aesthetic) -->
      <nav class="mobile-tabs">
        <button
          v-for="tab in ([
            { id: 'map',    label: 'MAP' },
            { id: 'act',    label: 'ACT' },
            { id: 'intel',  label: 'INTEL' },
            { id: 'status', label: 'STATUS' },
          ] as { id: MobileTab; label: string }[])"
          :key="tab.id"
          class="mobile-tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         TABLET LAYOUT — 2-panel: left 55% map+factions, right 45%
    ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="isTablet">
      <div style="flex:1;display:flex;overflow:hidden;min-height:0;">

        <!-- Left 55%: map + chart + factions -->
        <div style="flex:0 0 55%;display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--color-border);">
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
          <div style="overflow-y:auto;border-top:1px solid var(--color-border);">
            <FactionList />
          </div>
        </div>

        <!-- Right 45%: actions + status + intel stacked, scrollable -->
        <div style="flex:0 0 45%;display:flex;flex-direction:column;overflow-y:auto;">
          <ActionPanel />
          <TensionMeter />
          <div style="padding:6px;border-bottom:1px solid var(--color-border);">
            <VictoryTracker />
          </div>
          <div style="padding:6px;border-bottom:1px solid var(--color-border);">
            <CoalitionPanel />
          </div>
          <CovertOpsPanel />
          <div style="flex:1;overflow:hidden;min-height:0;border-bottom:1px solid var(--color-border);">
            <DiplomaticInbox />
          </div>
          <div style="flex:1;overflow:hidden;min-height:0;border-bottom:1px solid var(--color-border);">
            <IntelFeed />
          </div>
          <StoryThreadPanel />
        </div>
      </div>

      <!-- Bottom command bar -->
      <CommandBar />
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         DESKTOP LAYOUT — original 3-panel (unchanged behaviour)
    ═══════════════════════════════════════════════════════════════ -->
    <template v-else>
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
    </template>

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
