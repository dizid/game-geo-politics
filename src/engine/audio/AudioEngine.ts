// AudioEngine.ts
// Singleton that manages all procedural audio synthesis via Web Audio API.
// Zero audio files — every sound is computed from oscillators and noise buffers.
//
// Browser constraint: AudioContext requires a user gesture before audio plays.
// Call audioEngine.init() inside a click/keydown/touchstart handler.

import type { SoundParams } from './SoundDefinitions'
import { SOUND_PRESETS } from './audioPresets'

/** Audio category names used for per-category volume control */
export type AudioCategory = 'ui' | 'action' | 'event' | 'ambient'

class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private categoryGains: Map<AudioCategory, GainNode> = new Map()

  /** Muted by default — unmuted only after user gesture + explicit toggle */
  private muted = true

  /** Tracks nodes currently scheduled (active oscillators / buffer sources) */
  private activeNodes = 0
  private static readonly MAX_CONCURRENT = 8

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Lazy-initialise the AudioContext.
   * Must be called inside a user-gesture event handler (click, keydown, etc.)
   * to satisfy browser autoplay policy. Safe to call multiple times.
   */
  init(): void {
    if (this.ctx) return

    this.ctx = new AudioContext()

    // Master gain — controls overall output volume
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.muted ? 0 : 0.5
    this.masterGain.connect(this.ctx.destination)

    // Per-category gains feed into masterGain
    const categories: AudioCategory[] = ['ui', 'action', 'event', 'ambient']
    for (const cat of categories) {
      const node = this.ctx.createGain()
      node.gain.value = 1.0 // full pass-through by default
      node.connect(this.masterGain)
      this.categoryGains.set(cat, node)
    }
  }

  /** Release all resources. Call on app teardown. */
  dispose(): void {
    this.ctx?.close()
    this.ctx = null
    this.masterGain = null
    this.categoryGains.clear()
    this.activeNodes = 0
  }

  // ─── Core Playback ────────────────────────────────────────────────────────

  /**
   * Synthesise and play a single sound described by SoundParams.
   * Silently no-ops when muted, context unavailable, or node cap reached.
   */
  playSound(params: SoundParams, category: AudioCategory = 'ui'): void {
    if (this.muted || !this.ctx || !this.masterGain) return
    if (this.activeNodes >= AudioEngine.MAX_CONCURRENT) return

    // Handle repeat scheduling: play once now, then recurse
    if (params.repeat && params.repeat > 0) {
      this._playSingle(params, category)
      const remaining = params.repeat - 1
      const interval = params.repeatInterval ?? 0.15
      const reduced: SoundParams = { ...params, repeat: remaining }
      setTimeout(() => this.playSound(reduced, category), interval * 1000)
      return
    }

    this._playSingle(params, category)
  }

  /**
   * Play a named preset from SOUND_PRESETS.
   * Array presets (chords, layered sounds) are all played simultaneously.
   */
  playPreset(name: string, category: AudioCategory = 'ui'): void {
    const preset = SOUND_PRESETS[name]
    if (!preset) return

    if (Array.isArray(preset)) {
      for (const p of preset) {
        this.playSound(p, category)
      }
    } else {
      this.playSound(preset, category)
    }
  }

  // ─── Volume Control ───────────────────────────────────────────────────────

  /** Set master output volume, 0–1 */
  setMasterVolume(level: number): void {
    if (!this.masterGain) return
    this.masterGain.gain.value = this.muted ? 0 : Math.max(0, Math.min(1, level))
  }

  /** Set volume for a specific category, 0–1 */
  setCategoryVolume(category: AudioCategory, level: number): void {
    const node = this.categoryGains.get(category)
    if (!node) return
    node.gain.value = Math.max(0, Math.min(1, level))
  }

  // ─── Mute Control ─────────────────────────────────────────────────────────

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.masterGain) {
      // Smooth mute/unmute over 30 ms to avoid clicks
      const now = this.ctx?.currentTime ?? 0
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(
        muted ? 0 : (this.masterGain.gain.value || 0.5),
        now + 0.03,
      )
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /** Actually schedule one sound onto the audio graph */
  private _playSingle(params: SoundParams, category: AudioCategory): void {
    const ctx = this.ctx!
    const catGain = this.categoryGains.get(category) ?? this.masterGain!

    const now = ctx.currentTime
    const {
      type,
      frequency,
      frequencyEnd,
      duration,
      attack,
      decay,
      sustain,
      release,
      filterType,
      filterFreq,
      filterQ,
      detune,
      volume = 1,
    } = params

    // ── Gain (ADSR envelope) ──────────────────────────────────────────────
    const envGain = ctx.createGain()
    envGain.gain.setValueAtTime(0, now)

    const attackEnd = now + attack
    const decayEnd = attackEnd + decay
    // Hold sustain until release begins
    const releaseStart = now + duration - release
    const end = now + duration

    envGain.gain.linearRampToValueAtTime(volume, attackEnd)
    envGain.gain.linearRampToValueAtTime(volume * sustain, decayEnd)
    envGain.gain.setValueAtTime(volume * sustain, Math.max(decayEnd, releaseStart))
    envGain.gain.linearRampToValueAtTime(0, end)

    // ── Optional filter ────────────────────────────────────────────────────
    let outputNode: AudioNode = envGain
    if (filterType && filterFreq !== undefined) {
      const filter = ctx.createBiquadFilter()
      filter.type = filterType
      filter.frequency.value = filterFreq
      if (filterQ !== undefined) filter.Q.value = filterQ
      envGain.connect(filter)
      filter.connect(catGain)
      outputNode = filter // used only for disconnection reference below
      void outputNode // suppress unused-variable warning
    } else {
      envGain.connect(catGain)
    }

    this.activeNodes++

    if (type === 'noise') {
      // ── White noise source ───────────────────────────────────────────────
      const buffer = this._createNoiseBuffer(duration)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(envGain)
      source.start(now)
      source.stop(end)
      source.onended = () => {
        source.disconnect()
        envGain.disconnect()
        this.activeNodes--
      }
    } else {
      // ── Oscillator source ────────────────────────────────────────────────
      const osc = ctx.createOscillator()
      osc.type = type as OscillatorType
      osc.frequency.setValueAtTime(frequency, now)

      if (detune !== undefined) {
        osc.detune.setValueAtTime(detune, now)
      }

      if (frequencyEnd !== undefined) {
        // Linear sweep from frequency to frequencyEnd over full duration
        osc.frequency.linearRampToValueAtTime(frequencyEnd, end)
      }

      osc.connect(envGain)
      osc.start(now)
      osc.stop(end)
      osc.onended = () => {
        osc.disconnect()
        envGain.disconnect()
        this.activeNodes--
      }
    }
  }

  /**
   * Create a mono white-noise buffer of the given duration.
   * Each call generates fresh random samples (no caching needed at this scale).
   */
  private _createNoiseBuffer(durationSeconds: number): AudioBuffer {
    const ctx = this.ctx!
    const sampleRate = ctx.sampleRate
    const frameCount = Math.ceil(sampleRate * durationSeconds)
    const buffer = ctx.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1 // uniform white noise, range [-1, 1]
    }
    return buffer
  }
}

// Export singleton — one engine for the entire app lifetime
export const audioEngine = new AudioEngine()
