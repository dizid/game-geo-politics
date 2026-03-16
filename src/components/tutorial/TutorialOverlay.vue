<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

const dismissed = ref(false)

// Tutorial steps: one per turn 1-3
const steps = [
  {
    turn: 1,
    title: 'COMMAND STATS',
    message: 'Your faction has four key stats. MIL (military) controls combat power, ECO (economy) funds operations, DIP (diplomacy) opens alliances, and INF (influence) shapes global narrative. Balance them wisely.',
    position: 'right',
  },
  {
    turn: 2,
    title: 'WORLD TENSION',
    message: 'The World Tension meter tracks global stability. Aggressive actions raise tension — if it reaches WAR (80+), the world spirals into conflict and you face catastrophic loss penalties. Keep it below 60.',
    position: 'bottom',
  },
  {
    turn: 3,
    title: 'VICTORY CONDITIONS',
    message: 'Five paths to victory: DOMINATION (maintain Power ≥85 for 5 turns), DIPLOMATIC (10 turns of peace), ECONOMIC (5 trade partners + ECO≥85), INFLUENCE (Info War 6 factions), UNDERDOG (start bottom-4, reach rank #1). Track progress in the right panel.',
    position: 'left',
  },
]

const currentStep = computed(() =>
  steps.find(s => s.turn === gameStore.turn) ?? null,
)

const isActive = computed(() =>
  !dismissed.value && gameStore.turn <= 3 && currentStep.value !== null,
)

const isTutorialComplete = ref(false)

function next(): void {
  if (gameStore.turn >= 3) {
    isTutorialComplete.value = true
    setTimeout(() => {
      dismissed.value = true
    }, 2500)
  } else {
    dismissed.value = true
    // Allow re-activation on next turn
    setTimeout(() => { dismissed.value = false }, 100)
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
        font-size:9px;
        letter-spacing:0.3em;
        color:#4ade80;
        box-shadow:0 0 20px rgba(74,222,128,0.2);
      "
    >
      TUTORIAL COMPLETE
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
        font-size:8px;
        letter-spacing:0.22em;
        color:#4ade80;
        margin-bottom:7px;
        border-bottom:1px solid var(--color-border);
        padding-bottom:5px;
      ">
        {{ currentStep.title }}
      </div>

      <!-- Message -->
      <div style="font-size:9px;line-height:1.65;color:var(--color-text-bright);margin-bottom:10px;">
        {{ currentStep.message }}
      </div>

      <!-- Turn indicator -->
      <div style="font-size:7px;color:var(--color-text-dim);margin-bottom:8px;">
        TIP {{ currentStep.turn }} OF 3
      </div>

      <!-- Next button -->
      <button
        style="
          padding:5px 14px;
          background:none;
          border:1px solid #4ade80;
          color:#4ade80;
          font-family:var(--font-mono);
          font-size:8px;
          letter-spacing:0.2em;
          cursor:pointer;
          width:100%;
        "
        @click="next"
      >
        {{ currentStep.turn >= 3 ? 'FINISH TUTORIAL' : 'NEXT ▶' }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
