<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useAudio } from './composables/useAudio'
import ScanlineOverlay from './components/common/ScanlineOverlay.vue'
import ScreenEffectsLayer from './components/common/ScreenEffectsLayer.vue'
import ApiKeyModal from './components/settings/ApiKeyModal.vue'
import FactionSelect from './views/FactionSelect.vue'
import GameBoard from './views/GameBoard.vue'
import GameOver from './views/GameOver.vue'

const gameStore = useGameStore()
const { initOnGesture } = useAudio()

const showApiKeyModal = ref(false)
const audioInitialized = ref(false)

// Initialize audio on first user interaction (browser autoplay policy)
function handleFirstInteraction(): void {
  if (audioInitialized.value) return
  initOnGesture()
  audioInitialized.value = true
}
const phase = computed(() => gameStore.phase)

const isPlayPhase = computed(() =>
  ['briefing', 'crisis', 'action', 'interrupt', 'resolution', 'summary'].includes(phase.value),
)

const STORAGE_KEY = 'geocmd_api_key'

onMounted(() => {
  // Load API key from localStorage on boot
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    gameStore.apiKey = stored
  } else {
    showApiKeyModal.value = true
  }
})

function handleStart(factionId: string): void {
  if (!gameStore.apiKey) {
    showApiKeyModal.value = true
    return
  }
  gameStore.startGame(factionId)
}

function handleApiKeyClose(): void {
  showApiKeyModal.value = false
}
</script>

<template>
  <!-- Scanline CRT overlay — always on top -->
  <ScanlineOverlay />

  <!-- Settings gear — always accessible -->
  <button
    style="
      position:fixed;
      top:8px;
      right:8px;
      z-index:2000;
      background:none;
      border:none;
      cursor:pointer;
      font-size:14px;
      color:var(--color-text-dim);
      padding:4px;
      line-height:1;
    "
    title="API Key Settings"
    @click="showApiKeyModal = true"
  >
    ⚙
  </button>

  <!-- Screen effects (shake, flash, tension vignette, scanline wipe) -->
  <ScreenEffectsLayer @click.once="handleFirstInteraction">
    <!-- Phase router -->
    <FactionSelect
      v-if="phase === 'select'"
      @start="handleStart"
    />

    <GameBoard
      v-else-if="isPlayPhase"
    />

    <GameOver
      v-else-if="phase === 'gameover'"
    />
  </ScreenEffectsLayer>

  <!-- API key modal -->
  <ApiKeyModal
    v-if="showApiKeyModal"
    @close="handleApiKeyClose"
  />
</template>
