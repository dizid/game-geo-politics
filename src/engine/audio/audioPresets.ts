// audioPresets.ts
// Named presets mapping game events to SoundParams.
// All sounds target a CRT/terminal aesthetic: square waves, filtered noise,
// beeps, sweeps — no audio files.
//
// A preset can be a single SoundParams object or an array of them.
// Arrays are played simultaneously to produce chords and layered effects.

import type { SoundParams } from './SoundDefinitions'

export const SOUND_PRESETS: Record<string, SoundParams | SoundParams[]> = {
  // ─── UI Feedback ──────────────────────────────────────────────────────────

  /** Sharp micro-beep — button press confirmation */
  uiClick: {
    type: 'square',
    frequency: 800,
    duration: 0.04,
    attack: 0.002,
    decay: 0.01,
    sustain: 0.3,
    release: 0.02,
    volume: 0.4,
  },

  /** Soft tick — hover feedback */
  uiHover: {
    type: 'sine',
    frequency: 600,
    duration: 0.02,
    attack: 0.002,
    decay: 0.008,
    sustain: 0.1,
    release: 0.008,
    volume: 0.2,
  },

  /** Rising radar lock — target selected */
  targetSelect: {
    type: 'square',
    frequency: 440,
    frequencyEnd: 880,
    duration: 0.08,
    attack: 0.005,
    decay: 0.02,
    sustain: 0.5,
    release: 0.03,
    volume: 0.45,
  },

  /** Buzzy confirmation — action chosen */
  actionSelect: {
    type: 'sawtooth',
    frequency: 660,
    duration: 0.06,
    attack: 0.003,
    decay: 0.02,
    sustain: 0.4,
    release: 0.03,
    volume: 0.4,
  },

  // ─── Action Executions ────────────────────────────────────────────────────

  /** Low thud with static — sanctions imposed */
  executeSanctions: [
    {
      type: 'square',
      frequency: 200,
      duration: 0.3,
      attack: 0.01,
      decay: 0.05,
      sustain: 0.6,
      release: 0.18,
      volume: 0.6,
    },
    {
      type: 'noise',
      frequency: 0,
      duration: 0.15,
      attack: 0.005,
      decay: 0.04,
      sustain: 0.2,
      release: 0.08,
      filterType: 'highpass',
      filterFreq: 3000,
      filterQ: 0.8,
      volume: 0.35,
    },
  ],

  /** Deep descending rumble — military action */
  executeMilitary: {
    type: 'sawtooth',
    frequency: 100,
    frequencyEnd: 50,
    duration: 0.4,
    attack: 0.02,
    decay: 0.08,
    sustain: 0.7,
    release: 0.22,
    volume: 0.7,
  },

  /** Ascending two-tone chime — diplomacy */
  executeDiplomacy: {
    type: 'sine',
    frequency: 440,
    frequencyEnd: 660,
    duration: 0.2,
    attack: 0.01,
    decay: 0.04,
    sustain: 0.6,
    release: 0.1,
    volume: 0.55,
  },

  /** Major triad chord — alliance formed */
  executeAlliance: [
    {
      type: 'sine',
      frequency: 440, // A4 — root
      duration: 0.3,
      attack: 0.015,
      decay: 0.05,
      sustain: 0.7,
      release: 0.15,
      volume: 0.5,
    },
    {
      type: 'sine',
      frequency: 554, // C#5 — major third
      duration: 0.3,
      attack: 0.015,
      decay: 0.05,
      sustain: 0.7,
      release: 0.15,
      volume: 0.45,
    },
    {
      type: 'sine',
      frequency: 660, // E5 — fifth
      duration: 0.3,
      attack: 0.015,
      decay: 0.05,
      sustain: 0.7,
      release: 0.15,
      volume: 0.4,
    },
  ],

  /** Cash register blip — trade agreement */
  executeTrade: {
    type: 'square',
    frequency: 880,
    frequencyEnd: 1320,
    duration: 0.15,
    attack: 0.005,
    decay: 0.04,
    sustain: 0.4,
    release: 0.08,
    volume: 0.5,
  },

  /** Gentle rising tone — humanitarian aid */
  executeAid: {
    type: 'sine',
    frequency: 523, // C5
    frequencyEnd: 784, // G5
    duration: 0.25,
    attack: 0.02,
    decay: 0.05,
    sustain: 0.65,
    release: 0.13,
    volume: 0.5,
  },

  /** Encrypted static hiss — intelligence gathering */
  executeIntel: {
    type: 'noise',
    frequency: 0,
    duration: 0.2,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.1,
    filterType: 'lowpass',
    filterFreq: 2000,
    filterQ: 1.2,
    volume: 0.45,
  },

  /** Descending warble — propaganda broadcast */
  executePropaganda: {
    type: 'sawtooth',
    frequency: 300,
    frequencyEnd: 100,
    duration: 0.25,
    attack: 0.01,
    decay: 0.06,
    sustain: 0.5,
    release: 0.14,
    volume: 0.55,
  },

  /** Layered dramatic tone — compound action */
  executeCompound: [
    {
      type: 'square',
      frequency: 200,
      frequencyEnd: 400,
      duration: 0.5,
      attack: 0.02,
      decay: 0.08,
      sustain: 0.65,
      release: 0.25,
      volume: 0.6,
    },
    {
      type: 'sawtooth',
      frequency: 200,
      frequencyEnd: 400,
      duration: 0.5,
      attack: 0.02,
      decay: 0.08,
      sustain: 0.55,
      release: 0.25,
      detune: 7, // slight chorusing
      volume: 0.4,
    },
  ],

  // ─── Turn Signals ─────────────────────────────────────────────────────────

  /** V-sweep confirmation — turn complete */
  turnEnd: {
    type: 'sine',
    frequency: 440,
    frequencyEnd: 220, // falls then rises handled by two-part layering
    duration: 0.6,
    attack: 0.02,
    decay: 0.1,
    sustain: 0.6,
    release: 0.3,
    volume: 0.55,
  },

  /** Three-pip time signal — turn begins */
  turnStart: {
    type: 'square',
    frequency: 660,
    duration: 0.1,
    attack: 0.005,
    decay: 0.02,
    sustain: 0.5,
    release: 0.04,
    volume: 0.5,
    repeat: 2,
    repeatInterval: 0.13,
  },

  /** Urgent klaxon — four-rapid blips */
  crisisAlert: {
    type: 'square',
    frequency: 880,
    duration: 0.1,
    attack: 0.003,
    decay: 0.02,
    sustain: 0.6,
    release: 0.04,
    volume: 0.65,
    repeat: 3,
    repeatInterval: 0.18,
  },

  /** Notification ping — diplomatic message received */
  diplomaticMessage: {
    type: 'sine',
    frequency: 523,
    duration: 0.12,
    attack: 0.01,
    decay: 0.03,
    sustain: 0.55,
    release: 0.06,
    volume: 0.45,
    repeat: 1,
    repeatInterval: 0.15,
  },

  // ─── End States ───────────────────────────────────────────────────────────

  /** Triumphant ascending triad sweep — victory */
  victory: [
    {
      type: 'sine',
      frequency: 440,
      frequencyEnd: 880,
      duration: 1.5,
      attack: 0.04,
      decay: 0.1,
      sustain: 0.75,
      release: 0.6,
      volume: 0.6,
    },
    {
      type: 'sine',
      frequency: 554,
      frequencyEnd: 1108,
      duration: 1.5,
      attack: 0.04,
      decay: 0.1,
      sustain: 0.65,
      release: 0.6,
      volume: 0.5,
    },
    {
      type: 'sine',
      frequency: 660,
      frequencyEnd: 1320,
      duration: 1.5,
      attack: 0.04,
      decay: 0.1,
      sustain: 0.55,
      release: 0.6,
      volume: 0.45,
    },
  ],

  /** Slow descending fade — defeat */
  defeat: {
    type: 'sawtooth',
    frequency: 440,
    frequencyEnd: 110,
    duration: 1.2,
    attack: 0.05,
    decay: 0.15,
    sustain: 0.5,
    release: 0.7,
    volume: 0.6,
  },

  // ─── Events ───────────────────────────────────────────────────────────────

  /** Brief static burst — tension escalation */
  tensionEscalation: {
    type: 'noise',
    frequency: 0,
    duration: 0.15,
    attack: 0.005,
    decay: 0.04,
    sustain: 0.3,
    release: 0.08,
    filterType: 'highpass',
    filterFreq: 4000,
    filterQ: 0.8,
    volume: 0.5,
  },

  /** Alarm with static — covert op exposed */
  covertExposed: [
    {
      type: 'square',
      frequency: 880,
      duration: 0.5,
      attack: 0.005,
      decay: 0.04,
      sustain: 0.7,
      release: 0.2,
      volume: 0.6,
      repeat: 1,
      repeatInterval: 0.25,
    },
    {
      type: 'noise',
      frequency: 0,
      duration: 0.5,
      attack: 0.005,
      decay: 0.06,
      sustain: 0.4,
      release: 0.2,
      filterType: 'bandpass',
      filterFreq: 2500,
      filterQ: 1.5,
      volume: 0.35,
    },
  ],

  /** Somber notification — world event */
  worldEvent: [
    {
      type: 'sine',
      frequency: 330,
      duration: 0.4,
      attack: 0.03,
      decay: 0.08,
      sustain: 0.55,
      release: 0.2,
      volume: 0.5,
    },
    {
      type: 'noise',
      frequency: 0,
      duration: 0.25,
      attack: 0.01,
      decay: 0.06,
      sustain: 0.2,
      release: 0.12,
      filterType: 'lowpass',
      filterFreq: 1200,
      filterQ: 0.8,
      volume: 0.2,
    },
  ],

  /** Dramatic power-up — faction signature activated */
  signatureActivate: [
    {
      type: 'sine',
      frequency: 220,
      frequencyEnd: 880,
      duration: 0.8,
      attack: 0.03,
      decay: 0.1,
      sustain: 0.7,
      release: 0.35,
      volume: 0.55,
    },
    {
      type: 'sawtooth',
      frequency: 220,
      frequencyEnd: 880,
      duration: 0.8,
      attack: 0.03,
      decay: 0.1,
      sustain: 0.5,
      release: 0.35,
      detune: 12,
      volume: 0.35,
    },
    {
      type: 'square',
      frequency: 330,
      frequencyEnd: 1320,
      duration: 0.8,
      attack: 0.04,
      decay: 0.12,
      sustain: 0.4,
      release: 0.35,
      detune: -12,
      volume: 0.3,
    },
  ],
}
