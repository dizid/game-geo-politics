<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

const dismissed = ref(false)
const currentStepIndex = ref(0)

// Track player actions to advance tutorial automatically
const hasSelectedTarget = computed(() => !!gameStore.selectedTargetId)
const hasSelectedAction = computed(() => !!gameStore.selectedActionId)
const hasExecuted = computed(() => gameStore.actionsThisTurn > 0)

const steps = computed(() => [
  {
    id: 'welcome',
    title: 'MISSION BRIEFING',
    message: `Commander, you lead ${gameStore.playerFaction?.name ?? 'your nation'}. Your goal: achieve global dominance through one of five victory paths. Each turn you have ${gameStore.playerAP} Action Points to spend. You can take MULTIPLE actions per turn — as many as your AP allows.`,
    hint: 'Read this briefing, then click NEXT to learn how to play.',
    position: 'center' as const,
    autoAdvance: false,
    number: '01',
  },
  {
    id: 'pick_target',
    title: 'STEP 1: PICK A TARGET',
    message: 'Look at the LEFT panel — those are your rival factions. Click on any faction to select them as your target. You can also click a region on the world map in the center.',
    hint: hasSelectedTarget.value
      ? `✓ Target selected: ${gameStore.targetFaction?.name}. Click NEXT.`
      : '← Click a faction name on the left panel now.',
    position: 'left-guide' as const,
    autoAdvance: false,
    number: '02',
  },
  {
    id: 'pick_action',
    title: 'STEP 2: CHOOSE AN ACTION',
    message: 'Below the faction list, you\'ll see your available ACTIONS. Each action costs AP and has different effects. Green cost = you can afford it. Try DIPLOMACY (cheap, builds relations) or TRADE DEAL (boosts both economies).',
    hint: hasSelectedAction.value
      ? `✓ Action selected. Click NEXT.`
      : '← Select an action from the action list below the factions.',
    position: 'left-guide' as const,
    autoAdvance: false,
    number: '03',
  },
  {
    id: 'execute',
    title: 'STEP 3: EXECUTE',
    message: 'Look at the bottom bar — it shows your selected action and target. Hit the green EXECUTE button to carry out the action. Your AP will be deducted and the world will react.',
    hint: hasExecuted.value
      ? '✓ Action executed! You can take more actions or END TURN. Click NEXT.'
      : '↓ Click EXECUTE at the bottom to carry out your action.',
    position: 'bottom-guide' as const,
    autoAdvance: false,
    number: '04',
  },
  {
    id: 'multi_action',
    title: 'MULTIPLE ACTIONS PER TURN',
    message: 'You don\'t have to stop at one action. Select another target and action, then EXECUTE again. Keep going until you run out of AP or want to save some for next turn. When you\'re done, click END TURN.',
    hint: 'Take more actions or click END TURN when ready. Click NEXT to continue.',
    position: 'center' as const,
    autoAdvance: false,
    number: '05',
  },
  {
    id: 'right_panel',
    title: 'YOUR INTELLIGENCE DASHBOARD',
    message: 'The RIGHT panel is your command center: WORLD TENSION shows how close the world is to war. VICTORY TRACKER shows your progress. SECURE CHANNEL shows diplomatic messages from other factions — READ and RESPOND to them. INTEL FEED shows world events.',
    hint: 'Explore the right panel. Messages from other nations will appear as you play.',
    position: 'right-guide' as const,
    autoAdvance: false,
    number: '06',
  },
  {
    id: 'victory',
    title: 'HOW TO WIN',
    message: 'Five paths to victory:\n• DOMINATION — Power ≥85 for 3 turns, no rival above 70\n• DIPLOMATIC — DIP ≥85, lead a 5-member coalition\n• ECONOMIC — ECO ≥90, 4+ trade deals\n• INFLUENCE — INF ≥88, info war 6+ factions\n• UNDERDOG — Rise from bottom-4 faction to power 72+\n\nYou LOSE if all stats drop below 30, or if World War erupts while your MIL is below 40.',
    hint: 'Pick a strategy and commit. Good luck, Commander.',
    position: 'center' as const,
    autoAdvance: false,
    number: '07',
  },
])

const currentStep = computed(() =>
  currentStepIndex.value < steps.value.length ? steps.value[currentStepIndex.value] : null,
)

const isActive = computed(() =>
  !dismissed.value && currentStep.value !== null,
)

const isTutorialComplete = ref(false)

function next(): void {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex >= steps.value.length) {
    isTutorialComplete.value = true
    setTimeout(() => {
      dismissed.value = true
    }, 2500)
  } else {
    currentStepIndex.value = nextIndex
  }
}

function skip(): void {
  isTutorialComplete.value = true
  setTimeout(() => {
    dismissed.value = true
  }, 1500)
}

// Position styles for different guide positions
function getPositionStyle(position: string) {
  switch (position) {
    case 'center':
      return {
        top: '50%',
        left: '50%',
        right: 'auto',
        transform: 'translate(-50%, -50%)',
        maxWidth: '480px',
      }
    case 'left-guide':
      return {
        top: '120px',
        left: '230px',
        right: 'auto',
        transform: 'none',
        maxWidth: '360px',
      }
    case 'right-guide':
      return {
        top: '120px',
        left: 'auto',
        right: '290px',
        transform: 'none',
        maxWidth: '360px',
      }
    case 'bottom-guide':
      return {
        bottom: '60px',
        top: 'auto',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        maxWidth: '420px',
      }
    default:
      return {
        top: '50%',
        left: '50%',
        right: 'auto',
        transform: 'translate(-50%, -50%)',
        maxWidth: '480px',
      }
  }
}
</script>

<template>
  <!-- Tutorial complete banner -->
  <Transition name="fade">
    <div
      v-if="isTutorialComplete"
      style="
        position:fixed;
        top:60px;
        left:50%;
        transform:translateX(-50%);
        z-index:600;
        background:var(--color-bg-panel);
        border:1px solid #4ade80;
        padding:10px 24px;
        font-size:11px;
        letter-spacing:0.3em;
        color:#4ade80;
        box-shadow:0 0 30px rgba(74,222,128,0.3);
      "
    >
      BRIEFING COMPLETE — YOU HAVE COMMAND
    </div>
  </Transition>

  <!-- Semi-transparent backdrop for center modals -->
  <div
    v-if="isActive && currentStep && (currentStep.position === 'center')"
    style="
      position:fixed;
      inset:0;
      z-index:499;
      background:rgba(0,0,0,0.6);
    "
  />

  <!-- Active tooltip -->
  <Transition name="fade">
    <div
      v-if="isActive && currentStep"
      class="tutorial-tooltip"
      :style="getPositionStyle(currentStep.position)"
      style="z-index:500;width:90%;"
    >
      <!-- Step number badge -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="
            font-size:18px;
            font-family:var(--font-display);
            color:#4ade80;
            letter-spacing:0.1em;
          ">
            {{ currentStep.number }}
          </span>
          <span style="
            font-size:11px;
            letter-spacing:0.2em;
            color:#4ade80;
          ">
            {{ currentStep.title }}
          </span>
        </div>
        <span style="font-size:8px;color:var(--color-text-dim);letter-spacing:0.12em;">
          {{ currentStepIndex + 1 }}/{{ steps.length }}
        </span>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid var(--color-border);margin-bottom:10px;" />

      <!-- Message -->
      <div style="font-size:11px;line-height:1.75;color:var(--color-text-bright);margin-bottom:12px;white-space:pre-line;">
        {{ currentStep.message }}
      </div>

      <!-- Hint -->
      <div style="
        font-size:10px;
        line-height:1.6;
        color:#f59e0b;
        padding:6px 10px;
        border-left:2px solid #f59e0b;
        background:rgba(245,158,11,0.05);
        margin-bottom:12px;
      ">
        {{ currentStep.hint }}
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:8px;">
        <button
          style="
            flex:1;
            padding:8px 14px;
            background:none;
            border:1px solid #4ade80;
            color:#4ade80;
            font-family:var(--font-mono);
            font-size:10px;
            letter-spacing:0.18em;
            cursor:pointer;
          "
          @click="next"
        >
          {{ currentStepIndex >= steps.length - 1 ? 'BEGIN COMMAND ▶' : 'NEXT ▶' }}
        </button>
        <button
          v-if="currentStepIndex < steps.length - 1"
          style="
            padding:8px 14px;
            background:none;
            border:1px solid var(--color-text-dim);
            color:var(--color-text-dim);
            font-family:var(--font-mono);
            font-size:9px;
            letter-spacing:0.15em;
            cursor:pointer;
          "
          @click="skip"
        >
          SKIP
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
