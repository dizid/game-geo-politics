import { SCRIPTED_BEATS, type ScriptedBeat } from '../../data/events'

/**
 * Returns the scripted beat for the given turn, or null if none is defined.
 */
export function getScriptedBeat(turn: number): ScriptedBeat | null {
  return SCRIPTED_BEATS.find(beat => beat.turn === turn) ?? null
}
