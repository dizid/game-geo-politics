// SoundDefinitions.ts
// Type definitions for the procedural audio synthesis system.
// All sounds are generated via Web Audio API — no audio files.

/** Oscillator types plus 'noise' for white-noise synthesis */
export type OscType = OscillatorType | 'noise'

/**
 * Full parameter set for a single synthesized sound.
 * Envelope follows ADSR: attack → decay → sustain → release.
 */
export interface SoundParams {
  /** Waveform type. 'noise' uses a white-noise AudioBuffer. */
  type: OscType

  /** Starting frequency in Hz (ignored for 'noise' type) */
  frequency: number

  /** End frequency in Hz — if set, a linear sweep is applied */
  frequencyEnd?: number

  /** Total sound duration in seconds (attack + decay + sustain + release) */
  duration: number

  /** Attack ramp time in seconds (0 → peak) */
  attack: number

  /** Decay ramp time in seconds (peak → sustain level) */
  decay: number

  /** Sustain level, 0–1 (held after decay until release begins) */
  sustain: number

  /** Release ramp time in seconds (sustain → 0) */
  release: number

  /** Optional biquad filter type */
  filterType?: BiquadFilterType

  /** Filter cutoff/centre frequency in Hz */
  filterFreq?: number

  /** Filter Q (resonance) */
  filterQ?: number

  /** Oscillator detune in cents */
  detune?: number

  /** Output volume scalar, 0–1. Defaults to 1 if omitted. */
  volume?: number

  /** Number of times to repeat (total plays = repeat + 1) */
  repeat?: number

  /** Gap between repetitions in seconds */
  repeatInterval?: number
}
