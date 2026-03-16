<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

const dismissed = ref(false)
const currentStepIndex = ref(0)

const steps = [
  {
    title: 'WELCOME TO GEO:CMD',
    message: `You control ${gameStore.playerFaction?.name ?? 'your faction'}. Each turn you get Action Points (AP) to spend on actions. Select a target faction on the left, choose an action, then hit EXECUTE at the bottom.`,
    position: 'right',
  },
  {
    title: 'COMMAND STATS',
    message: 'Your faction has four key stats. MIL (military) controls combat power, ECO (economy) funds operations, DIP (diplomacy) opens alliances, and INF (influence) shapes global narrative. Balance them wisely — neglecting any stat makes you vulnerable.',
    position: 'right',
  },
  {
    title: 'WORLD TENSION',
    message: 'The World Tension meter (top-right) tracks global stability. Aggressive actions like Sanctions and Military Posture raise tension. If it reaches WAR (80+), everyone suffers catastrophic losses. Use Diplomacy and Trade Deals to keep it in check.',
    position: 'bottom',
  },
  {
    title: 'VICTORY CONDITIONS',
    message: 'Five paths to victory — track progress in the right panel. DOMINATION (Power ≥85 for 5 turns), DIPLOMATIC (10 turns of peace), ECONOMIC (5 trade partners + ECO≥85), INFLUENCE (Info War 6 factions), UNDERDOG (bottom-4 faction reaches #1). Pick a strategy and commit.',
    position: 'left',
  },
]

const currentStep = computed(() =>
  currentStepIndex.value < steps.length ? steps[currentStepIndex.value] : null,
)

const isActive = computed(() =>
  !dismissed.value && currentStep.value !== null,
)

const isTutorialComplete = ref(false)

function next(): void {
  const nextIndex = currentStepIndex.value + 1
  if (nextIndex >= steps.length) {
    isTutorialComplete.value = true
    setTimeout(() => {
      dismissed.value = true
    }, 2500)
  } else {
    currentStepIndex.value = nextIndex
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
        padding:8px 20px;
        font-size:10px;
        letter-spacing:0.3em;
        color:#4ade80;
        box-shadow:0 0 20px rgba(74,222,128,0.2);
      "
    >
      TUTORIAL COMPLETE — GOOD LUCK, COMMANDER
    </div>
  </Transition>

  <!-- Active tooltip -->
  <Transition name="fade">
    <div
      v-if="isActive && currentStep"
      class="tutorial-tooltip"
      :style="{
        top: currentStep.position === 'bottom' ? '80px' : '50%',
        left: currentStep.position === 'right' ? '230px' : currentStep.position === 'left' ? 'auto' : '50%',
        right: currentStep.position === 'left' ? '285px' : 'auto',
        transform: currentStep.position === 'bottom' || currentStep.position === 'right' || currentStep.position === 'left'
          ? 'none'
          : 'translate(-50%, -50%)',
      }"
    >
      <!-- Title -->
      <div style="
        font-size:10px;
        letter-spacing:0.22em;
        color:#4ade80;
        margin-bottom:7px;
        border-bottom:1px solid var(--color-border);
        padding-bottom:5px;
      ">
        {{ currentStep.title }}
      </div>

      <!-- Message -->
      <div style="font-size:10px;line-height:1.65;color:var(--color-text-bright);margin-bottom:10px;">
        {{ currentStep.message }}
      </div>

      <!-- Step indicator -->
      <div style="font-size:9px;color:var(--color-text-dim);margin-bottom:8px;">
        TIP {{ currentStepIndex + 1 }} OF {{ steps.length }}
      </div>

      <!-- Next button -->
      <button
        style="
          padding:6px 14px;
          background:none;
          border:1px solid #4ade80;
          color:#4ade80;
          font-family:var(--font-mono);
          font-size:9px;
          letter-spacing:0.2em;
          cursor:pointer;
          width:100%;
        "
        @click="next"
      >
        {{ currentStepIndex >= steps.length - 1 ? 'START PLAYING ▶' : 'NEXT ▶' }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
