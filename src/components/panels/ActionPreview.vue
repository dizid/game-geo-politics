<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useRelationshipStore } from '../../stores/relationshipStore'
import { getActionById, getCompoundActionById } from '../../data/actions'
import { applyStatChange } from '../../engine/balance/statCalculator'
import type { Faction, FactionStats } from '../../types/game'

const gameStore = useGameStore()
const relStore = useRelationshipStore()

// ─── Resolved action and factions ─────────────────────────────────────────

const target = computed(() => gameStore.targetFaction)
const player = computed(() => gameStore.playerFaction)

const selectedAction = computed(() => {
  const id = gameStore.selectedActionId
  if (!id) return null
  return getActionById(id) ?? getCompoundActionById(id) ?? null
})

// ─── Turn modifier effects on this action ─────────────────────────────────

const modifierNote = computed((): string | null => {
  const mod = gameStore.activeTurnModifier
  if (!mod || !selectedAction.value) return null

  const id = selectedAction.value.id
  const hasAPMod = mod.effects.apCostMultiplier?.[id] !== undefined
  const hasTensionMod = mod.effects.tensionMultiplier !== undefined && mod.effects.tensionMultiplier !== 1
  const hasRelMod = mod.effects.relationshipMultiplier !== undefined && mod.effects.relationshipMultiplier !== 1
  const isBlocked = mod.effects.actionBlocked?.includes(id)

  if (isBlocked) return `${mod.name}: ACTION BLOCKED`
  if (hasAPMod || hasTensionMod || hasRelMod) return `MODIFIER: ${mod.name}`
  return null
})

// ─── Effective effects (after turn modifier, before stat clamp) ───────────

const effectiveEffects = computed(() => {
  if (!selectedAction.value) return null

  const action = selectedAction.value
  let effects = { ...action.effects }

  const mod = gameStore.activeTurnModifier
  if (mod) {
    const tensionMult = mod.effects.tensionMultiplier ?? 1
    const relMult = mod.effects.relationshipMultiplier ?? 1

    effects = {
      targetStatChanges: { ...effects.targetStatChanges },
      selfStatChanges: { ...effects.selfStatChanges },
      tensionChange: Math.round(effects.tensionChange * tensionMult),
      relationshipChange: Math.round(effects.relationshipChange * relMult),
    }
  }

  return effects
})

// ─── Stat delta rows ───────────────────────────────────────────────────────

type StatKey = keyof FactionStats

interface StatDeltaRow {
  stat: string
  before: number
  after: number
  delta: number
}

function buildStatRows(
  faction: Faction | null,
  changes: Partial<FactionStats>,
): StatDeltaRow[] {
  if (!faction) return []

  const keys = Object.keys(changes) as StatKey[]
  return keys
    .filter(k => changes[k] !== 0 && changes[k] !== undefined)
    .map(k => {
      const before = faction[k]
      const delta = changes[k] as number
      const after = applyStatChange(before, delta)
      return {
        stat: k.toUpperCase(),
        before,
        after,
        delta: after - before,
      }
    })
}

const targetStatRows = computed((): StatDeltaRow[] => {
  if (!target.value || !effectiveEffects.value) return []
  return buildStatRows(target.value, effectiveEffects.value.targetStatChanges)
})

const selfStatRows = computed((): StatDeltaRow[] => {
  if (!player.value || !effectiveEffects.value) return []
  return buildStatRows(player.value, effectiveEffects.value.selfStatChanges)
})

// ─── Tension preview ───────────────────────────────────────────────────────

const tensionPreview = computed(() => {
  if (!effectiveEffects.value) return null
  const before = gameStore.worldTension
  const delta = effectiveEffects.value.tensionChange
  const after = Math.max(0, Math.min(100, before + delta))
  return { before, after, delta: after - before }
})

// ─── Relationship preview ──────────────────────────────────────────────────

const relationshipPreview = computed(() => {
  if (!effectiveEffects.value || !player.value || !target.value) return null
  const before = relStore.getRelationship(player.value.id, target.value.id)
  const delta = effectiveEffects.value.relationshipChange
  const after = Math.max(-100, Math.min(100, before + delta))
  return { before, after, delta: after - before }
})

// ─── Retaliation warning ───────────────────────────────────────────────────

const retaliationRisk = computed((): boolean => {
  if (!target.value) return false
  return target.value.personality.aggression > 0.6
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function deltaColor(delta: number): string {
  if (delta > 0) return '#4ade80'
  if (delta < 0) return '#ef4444'
  return 'var(--color-text-dim)'
}

function tensionDeltaColor(delta: number): string {
  if (delta > 0) return '#f59e0b'
  if (delta < 0) return '#4ade80'
  return 'var(--color-text-dim)'
}

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`
}
</script>

<template>
  <div
    v-if="target && selectedAction && effectiveEffects"
    style="
      margin-top:8px;
      border:1px solid var(--color-border);
      padding:6px 8px;
      background:rgba(0,10,4,0.6);
    "
  >
    <!-- Header -->
    <div style="font-size:8px;letter-spacing:0.22em;color:#4ade80;margin-bottom:6px;display:flex;align-items:center;gap:4px;">
      <span style="color:#f59e0b;">&#9670;</span>
      <span>ACTION PREVIEW</span>
    </div>

    <!-- Target stat deltas -->
    <div v-if="targetStatRows.length">
      <div style="font-size:8px;letter-spacing:0.18em;color:var(--color-text-dim);margin-bottom:3px;">
        TARGET: {{ target.name.toUpperCase() }}
      </div>
      <div
        v-for="row in targetStatRows"
        :key="'tgt-' + row.stat"
        style="display:flex;justify-content:space-between;align-items:center;font-size:9px;margin-bottom:2px;padding:0 4px;"
      >
        <span style="color:var(--color-text-dim);letter-spacing:0.12em;width:32px;">{{ row.stat }}</span>
        <span style="color:var(--color-text-mid);">{{ row.before }}</span>
        <span style="color:var(--color-text-dim);margin:0 3px;">&#8594;</span>
        <span :style="{ color: deltaColor(row.delta) }">{{ row.after }}</span>
        <span
          style="font-size:8px;letter-spacing:0.1em;margin-left:6px;min-width:30px;text-align:right;"
          :style="{ color: deltaColor(row.delta) }"
        >({{ formatDelta(row.delta) }})</span>
        <span
          style="margin-left:4px;font-size:9px;"
          :style="{ color: deltaColor(row.delta) }"
        >{{ row.delta < 0 ? '&#9660;' : '&#9650;' }}</span>
      </div>
    </div>

    <!-- Self stat deltas -->
    <div v-if="selfStatRows.length" :style="{ marginTop: targetStatRows.length ? '6px' : '0' }">
      <div style="font-size:8px;letter-spacing:0.18em;color:var(--color-text-dim);margin-bottom:3px;">
        SELF:
      </div>
      <div
        v-for="row in selfStatRows"
        :key="'self-' + row.stat"
        style="display:flex;justify-content:space-between;align-items:center;font-size:9px;margin-bottom:2px;padding:0 4px;"
      >
        <span style="color:var(--color-text-dim);letter-spacing:0.12em;width:32px;">{{ row.stat }}</span>
        <span style="color:var(--color-text-mid);">{{ row.before }}</span>
        <span style="color:var(--color-text-dim);margin:0 3px;">&#8594;</span>
        <span :style="{ color: deltaColor(row.delta) }">{{ row.after }}</span>
        <span
          style="font-size:8px;letter-spacing:0.1em;margin-left:6px;min-width:30px;text-align:right;"
          :style="{ color: deltaColor(row.delta) }"
        >({{ formatDelta(row.delta) }})</span>
        <span
          style="margin-left:4px;font-size:9px;"
          :style="{ color: deltaColor(row.delta) }"
        >{{ row.delta < 0 ? '&#9660;' : '&#9650;' }}</span>
      </div>
    </div>

    <!-- Divider before global stats -->
    <div
      v-if="targetStatRows.length || selfStatRows.length"
      style="border-top:1px solid var(--color-border);margin:6px 0;opacity:0.4;"
    ></div>

    <!-- Tension impact -->
    <div
      v-if="tensionPreview && tensionPreview.delta !== 0"
      style="display:flex;justify-content:space-between;align-items:center;font-size:9px;margin-bottom:3px;padding:0 4px;"
    >
      <span style="color:var(--color-text-dim);letter-spacing:0.12em;width:68px;">TENSION</span>
      <span style="color:var(--color-text-mid);">{{ tensionPreview.before }}</span>
      <span style="color:var(--color-text-dim);margin:0 3px;">&#8594;</span>
      <span :style="{ color: tensionDeltaColor(tensionPreview.delta) }">{{ tensionPreview.after }}</span>
      <span
        style="font-size:8px;letter-spacing:0.1em;margin-left:6px;min-width:30px;text-align:right;"
        :style="{ color: tensionDeltaColor(tensionPreview.delta) }"
      >({{ formatDelta(tensionPreview.delta) }})</span>
      <span
        style="margin-left:4px;font-size:9px;"
        :style="{ color: tensionDeltaColor(tensionPreview.delta) }"
      >{{ tensionPreview.delta < 0 ? '&#9660;' : '&#9650;' }}</span>
    </div>

    <!-- Relationship change -->
    <div
      v-if="relationshipPreview && relationshipPreview.delta !== 0"
      style="display:flex;justify-content:space-between;align-items:center;font-size:9px;margin-bottom:3px;padding:0 4px;"
    >
      <span style="color:var(--color-text-dim);letter-spacing:0.12em;width:68px;">RELATION</span>
      <span style="color:var(--color-text-mid);">{{ relationshipPreview.before }}</span>
      <span style="color:var(--color-text-dim);margin:0 3px;">&#8594;</span>
      <span :style="{ color: deltaColor(relationshipPreview.delta) }">{{ relationshipPreview.after }}</span>
      <span
        style="font-size:8px;letter-spacing:0.1em;margin-left:6px;min-width:30px;text-align:right;"
        :style="{ color: deltaColor(relationshipPreview.delta) }"
      >({{ formatDelta(relationshipPreview.delta) }})</span>
      <span
        style="margin-left:4px;font-size:9px;"
        :style="{ color: deltaColor(relationshipPreview.delta) }"
      >{{ relationshipPreview.delta < 0 ? '&#9660;' : '&#9650;' }}</span>
    </div>

    <!-- Turn modifier note -->
    <div
      v-if="modifierNote"
      style="
        margin-top:4px;
        font-size:8px;
        letter-spacing:0.14em;
        color:#f59e0b;
        padding:0 4px;
        opacity:0.85;
      "
    >
      &#9658; {{ modifierNote }}
    </div>

    <!-- Retaliation warning -->
    <div
      v-if="retaliationRisk"
      style="
        margin-top:4px;
        font-size:8px;
        letter-spacing:0.14em;
        color:#ef4444;
        padding:2px 4px;
        border:1px solid #ef444440;
      "
    >
      &#9888; HIGH RETALIATION RISK
    </div>
  </div>
</template>
