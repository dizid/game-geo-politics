// settingsStore.ts
// Pinia store for persistent user settings, including audio volume controls.
// Persisted to localStorage under the key 'geocmd_settings'.

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'geocmd_settings'

interface AudioSettings {
  masterVolume: number   // 0–1
  uiVolume: number       // 0–1
  actionVolume: number   // 0–1
  eventVolume: number    // 0–1
  ambientVolume: number  // 0–1
  muted: boolean
  reducedMotion: boolean
}

/** Default values applied on first run or when localStorage has no data */
const DEFAULTS: AudioSettings = {
  masterVolume: 0.5,
  uiVolume: 0.7,
  actionVolume: 0.8,
  eventVolume: 0.9,
  ambientVolume: 0.3,
  muted: true, // muted by default — audio only enabled after user opts in
  reducedMotion: false,
}

function load(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    // Merge stored values over defaults so new keys survive upgrades
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AudioSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(settings: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage may be unavailable in private-browsing edge cases — ignore
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const saved = load()

  const masterVolume = ref<number>(saved.masterVolume)
  const uiVolume = ref<number>(saved.uiVolume)
  const actionVolume = ref<number>(saved.actionVolume)
  const eventVolume = ref<number>(saved.eventVolume)
  const ambientVolume = ref<number>(saved.ambientVolume)
  const muted = ref<boolean>(saved.muted)

  // Auto-detect OS-level reduced motion preference
  const systemReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  const reducedMotion = ref<boolean>(saved.reducedMotion || systemReducedMotion)

  // ─── Persistence ──────────────────────────────────────────────────────────

  // Watch all reactive refs and persist whenever any changes
  watch(
    [masterVolume, uiVolume, actionVolume, eventVolume, ambientVolume, muted, reducedMotion],
    () => {
      save({
        masterVolume: masterVolume.value,
        uiVolume: uiVolume.value,
        actionVolume: actionVolume.value,
        eventVolume: eventVolume.value,
        ambientVolume: ambientVolume.value,
        muted: muted.value,
        reducedMotion: reducedMotion.value,
      })
    },
    { deep: false },
  )

  // ─── Actions ──────────────────────────────────────────────────────────────

  function toggleMute(): void {
    muted.value = !muted.value
  }

  function setMasterVolume(v: number): void {
    masterVolume.value = Math.max(0, Math.min(1, v))
  }

  function setUiVolume(v: number): void {
    uiVolume.value = Math.max(0, Math.min(1, v))
  }

  function setActionVolume(v: number): void {
    actionVolume.value = Math.max(0, Math.min(1, v))
  }

  function setEventVolume(v: number): void {
    eventVolume.value = Math.max(0, Math.min(1, v))
  }

  function setAmbientVolume(v: number): void {
    ambientVolume.value = Math.max(0, Math.min(1, v))
  }

  return {
    masterVolume,
    uiVolume,
    actionVolume,
    eventVolume,
    ambientVolume,
    muted,
    reducedMotion,
    toggleMute,
    setMasterVolume,
    setUiVolume,
    setActionVolume,
    setEventVolume,
    setAmbientVolume,
  }
})
