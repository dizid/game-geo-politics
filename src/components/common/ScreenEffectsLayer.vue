<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useAudio } from '../../composables/useAudio'

const gameStore = useGameStore()
const { playAction, playEvent } = useAudio()

// ─── Screen Shake ──────────────────────────────────────────────────────────
const shakeClass = ref('')
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function shake(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeClass.value = `shake-${intensity}`
  const durations = { light: 200, medium: 300, heavy: 400 }
  shakeTimer = setTimeout(() => { shakeClass.value = '' }, durations[intensity])
}

// ─── Flash Overlay ─────────────────────────────────────────────────────────
const flashClass = ref('')
let flashTimer: ReturnType<typeof setTimeout> | null = null

function flash(color: 'red' | 'green' | 'orange' | 'blue' | 'purple'): void {
  if (flashTimer) clearTimeout(flashTimer)
  flashClass.value = `flash-overlay flash-${color}`
  flashTimer = setTimeout(() => { flashClass.value = '' }, 250)
}

// ─── Scanline Wipe (turn transition) ───────────────────────────────────────
const showWipe = ref(false)
let wipeTimer: ReturnType<typeof setTimeout> | null = null

function triggerWipe(): void {
  if (wipeTimer) clearTimeout(wipeTimer)
  showWipe.value = true
  wipeTimer = setTimeout(() => { showWipe.value = false }, 400)
}

// ─── Tension Vignette ──────────────────────────────────────────────────────
// Maps 0-100 tension to 0-0.15 opacity on a red vignette around edges
const tensionOpacity = ref(0)

watch(() => gameStore.worldTension, (tension) => {
  // Start showing at tension 30, max at tension 90
  if (tension < 30) {
    tensionOpacity.value = 0
  } else {
    tensionOpacity.value = Math.min(0.15, ((tension - 30) / 60) * 0.15)
  }
}, { immediate: true })

// ─── Watch game events to trigger effects ──────────────────────────────────

// Track actions for feedback
let prevActionsThisTurn = 0
watch(() => gameStore.actionsThisTurn, (count) => {
  if (count > prevActionsThisTurn) {
    // An action was just executed — determine feedback by action type
    const actionId = gameStore.lastExecutedAction
    // Play action sound
    if (actionId) playAction(actionId)
    // Visual feedback per action category
    if (actionId === 'military' || actionId === 'shadowWar') {
      shake('medium')
      flash('red')
    } else if (actionId === 'sanctions' || actionId === 'propaganda') {
      flash('orange')
    } else if (actionId === 'diplomacy' || actionId === 'trade' || actionId === 'aid' || actionId === 'alliance') {
      flash('green')
    } else if (actionId === 'intel') {
      flash('purple')
    } else if (actionId === 'economicWarfare') {
      shake('light')
      flash('orange')
    } else if (actionId === 'strategicPartnership') {
      flash('blue')
    } else {
      flash('green')
    }
  }
  prevActionsThisTurn = count
})

// Turn transitions
watch(() => gameStore.turn, (newTurn, oldTurn) => {
  if (newTurn > oldTurn) {
    triggerWipe()
    playEvent('turnEnd')
    setTimeout(() => playEvent('turnStart'), 500)
  }
})

// Crisis events — heavy shake + red flash + alarm sound
watch(() => gameStore.phase, (phase) => {
  if (phase === 'crisis') {
    shake('heavy')
    flash('red')
    playEvent('crisisAlert')
  } else if (phase === 'gameover') {
    // Victory or defeat sound
    const player = gameStore.playerFaction
    if (player) {
      const power = (player.mil + player.eco + player.dip + player.inf) / 4
      playEvent(power >= 60 ? 'victory' : 'defeat')
    }
  }
})

// Expose methods for external use (e.g., from useGameFeel composable)
defineExpose({ shake, flash, triggerWipe })

onUnmounted(() => {
  if (shakeTimer) clearTimeout(shakeTimer)
  if (flashTimer) clearTimeout(flashTimer)
  if (wipeTimer) clearTimeout(wipeTimer)
})
</script>

<template>
  <!-- Shake wrapper — wraps the entire app content via slot -->
  <div :class="shakeClass">
    <slot />
  </div>

  <!-- Flash overlay -->
  <div v-if="flashClass" :class="flashClass" />

  <!-- Scanline wipe (turn transition) -->
  <div v-if="showWipe" class="scanline-wipe" />

  <!-- Tension vignette -->
  <div
    class="tension-vignette"
    :style="{ '--tension-opacity': tensionOpacity, opacity: tensionOpacity > 0 ? 1 : 0 }"
  />
</template>
