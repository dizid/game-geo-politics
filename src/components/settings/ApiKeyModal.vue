<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const emit = defineEmits<{
  close: []
}>()

const gameStore = useGameStore()
const inputKey = ref('')
const saved = ref(false)

const STORAGE_KEY = 'geocmd_api_key'

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) inputKey.value = stored
})

function save(): void {
  const trimmed = inputKey.value.trim()
  if (!trimmed) return
  localStorage.setItem(STORAGE_KEY, trimmed)
  gameStore.apiKey = trimmed
  saved.value = true
  setTimeout(() => {
    emit('close')
  }, 800)
}
</script>

<template>
  <div class="crisis-overlay" style="z-index:1100;">
    <div style="
      background:var(--color-bg-panel);
      border:1px solid #4ade80;
      max-width:440px;
      width:92%;
      padding:24px;
      box-shadow:0 0 40px rgba(74,222,128,0.15);
    ">
      <!-- Header -->
      <div style="font-size:7px;letter-spacing:0.3em;color:var(--color-text-dim);margin-bottom:14px;">
        SYSTEM CONFIGURATION
      </div>

      <div style="font-family:var(--font-display);font-size:20px;letter-spacing:0.1em;color:var(--color-text-bright);margin-bottom:16px;">
        ANTHROPIC API KEY
      </div>

      <!-- Explanation -->
      <div style="
        font-size:9px;
        line-height:1.7;
        color:var(--color-text-dim);
        margin-bottom:16px;
        padding:10px;
        border-left:2px solid var(--color-border);
      ">
        This game uses the Claude AI to generate geopolitical narratives, faction reactions,
        and dynamic world events. Your key is stored locally in your browser and never sent
        to any server other than Anthropic.
      </div>

      <!-- Input -->
      <div style="margin-bottom:14px;">
        <label style="font-size:7px;letter-spacing:0.2em;color:var(--color-text-dim);display:block;margin-bottom:5px;">
          API KEY
        </label>
        <input
          v-model="inputKey"
          type="password"
          placeholder="sk-ant-..."
          style="
            width:100%;
            padding:8px 10px;
            background:#010a04;
            border:1px solid var(--color-border);
            color:#4ade80;
            font-family:var(--font-mono);
            font-size:10px;
            letter-spacing:0.05em;
            outline:none;
            border-radius:1px;
          "
          @keyup.enter="save"
        />
      </div>

      <!-- Get key link -->
      <div style="font-size:8px;color:var(--color-text-dim);margin-bottom:16px;">
        Need a key?
        <a
          href="https://console.anthropic.com/keys"
          target="_blank"
          style="color:#60a5fa;text-decoration:none;letter-spacing:0.05em;"
        >
          console.anthropic.com/keys ↗
        </a>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:10px;">
        <button
          class="exec-btn"
          style="flex:1;"
          :disabled="!inputKey.trim()"
          @click="save"
        >
          <span v-if="saved">SAVED ✓</span>
          <span v-else>SAVE KEY</span>
        </button>
        <button
          v-if="gameStore.apiKey"
          style="
            padding:10px;
            background:none;
            border:1px solid var(--color-border);
            color:var(--color-text-dim);
            font-family:var(--font-mono);
            font-size:10px;
            letter-spacing:0.18em;
            cursor:pointer;
          "
          @click="emit('close')"
        >
          CANCEL
        </button>
      </div>
    </div>
  </div>
</template>
