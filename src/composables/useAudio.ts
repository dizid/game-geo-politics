// useAudio.ts
// Vue composable wrapping AudioEngine for easy use inside components.
// Handles init-on-gesture, category routing, action-to-preset mapping,
// and reactive volume sync from the settings store.

import { watch } from 'vue'
import { audioEngine, type AudioCategory } from '../engine/audio/AudioEngine'
import { useSettingsStore } from '../stores/settingsStore'

/** Map from action ID strings (as used in gameStore) to audio preset names */
const ACTION_PRESET_MAP: Record<string, string> = {
  sanctions: 'executeSanctions',
  military: 'executeMilitary',
  diplomacy: 'executeDiplomacy',
  alliance: 'executeAlliance',
  trade: 'executeTrade',
  aid: 'executeAid',
  intel: 'executeIntel',
  propaganda: 'executePropaganda',
}

export function useAudio() {
  const settings = useSettingsStore()

  // ─── Init on First Gesture ────────────────────────────────────────────────

  /**
   * Initialise the AudioContext and apply stored volume levels.
   * Call this once inside a user-gesture handler (click, keydown, touchstart).
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  function initOnGesture(): void {
    audioEngine.init()
    _applyAllVolumes()
  }

  // ─── Playback Helpers ─────────────────────────────────────────────────────

  /** Play a UI feedback sound by preset name */
  function playUI(preset: string): void {
    if (settings.reducedMotion) return
    audioEngine.playPreset(preset, 'ui')
  }

  /**
   * Play the audio for a game action.
   * Compound actions (anything not in ACTION_PRESET_MAP) use 'executeCompound'.
   */
  function playAction(actionId: string): void {
    if (settings.reducedMotion) return
    const preset = ACTION_PRESET_MAP[actionId] ?? 'executeCompound'
    audioEngine.playPreset(preset, 'action')
  }

  /** Play an event notification sound by preset name */
  function playEvent(eventType: string): void {
    if (settings.reducedMotion) return
    audioEngine.playPreset(eventType, 'event')
  }

  // ─── Reactive Volume Sync ─────────────────────────────────────────────────

  // Keep engine volume in sync with settings store changes
  watch(
    () => settings.muted,
    (muted) => {
      audioEngine.setMuted(muted)
    },
  )

  watch(
    () => settings.masterVolume,
    (v) => {
      audioEngine.setMasterVolume(v)
    },
  )

  watch(
    () => settings.uiVolume,
    (v) => {
      audioEngine.setCategoryVolume('ui', v)
    },
  )

  watch(
    () => settings.actionVolume,
    (v) => {
      audioEngine.setCategoryVolume('action', v)
    },
  )

  watch(
    () => settings.eventVolume,
    (v) => {
      audioEngine.setCategoryVolume('event', v)
    },
  )

  watch(
    () => settings.ambientVolume,
    (v) => {
      audioEngine.setCategoryVolume('ambient', v)
    },
  )

  // ─── Internal ─────────────────────────────────────────────────────────────

  /** Push all current settings values into the engine after init */
  function _applyAllVolumes(): void {
    audioEngine.setMuted(settings.muted)
    audioEngine.setMasterVolume(settings.masterVolume)

    const cats: { key: keyof typeof settings; cat: AudioCategory }[] = [
      { key: 'uiVolume', cat: 'ui' },
      { key: 'actionVolume', cat: 'action' },
      { key: 'eventVolume', cat: 'event' },
      { key: 'ambientVolume', cat: 'ambient' },
    ]
    for (const { key, cat } of cats) {
      audioEngine.setCategoryVolume(cat, settings[key] as number)
    }
  }

  return {
    initOnGesture,
    playUI,
    playAction,
    playEvent,
  }
}
