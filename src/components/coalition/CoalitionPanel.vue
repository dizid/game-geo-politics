<script setup lang="ts">
import { computed } from 'vue'
import { useCoalitionStore } from '../../stores/coalitionStore'
import { useGameStore } from '../../stores/gameStore'
import type { Coalition } from '../../types/game'

const coalitionStore = useCoalitionStore()
const gameStore = useGameStore()

const playerCoalitions = computed<Coalition[]>(() => coalitionStore.getPlayerCoalitions)
const target = computed(() => gameStore.targetFaction)

function cohesionColor(cohesion: number): string {
  if (cohesion > 50) return '#4ade80'
  if (cohesion > 20) return '#fbbf24'
  return '#ef4444'
}

function typeIcon(type: Coalition['type']): string {
  const icons: Record<Coalition['type'], string> = {
    military:   '⚔️',
    economic:   '💰',
    diplomatic: '🤝',
    intelligence: '🔍',
  }
  return icons[type]
}

function getFactionFlag(factionId: string): string {
  return gameStore.factions.find(f => f.id === factionId)?.flag ?? '?'
}

function proposeAlliance(type: Coalition['type']): void {
  if (!target.value) return
  coalitionStore.proposeCoalition(target.value.id, type)
}

function betray(coalitionId: string): void {
  if (confirm('BETRAY this coalition? This will severely damage all relationships.')) {
    coalitionStore.betrayCoalition(coalitionId)
  }
}
</script>

<template>
  <div style="border:1px solid var(--color-border);border-radius:1px;margin-bottom:8px;">
    <!-- Header -->
    <div style="
      padding:6px 10px;
      border-bottom:1px solid var(--color-border);
      font-size:7px;
      letter-spacing:0.22em;
      color:var(--color-text-dim);
    ">
      COALITIONS
    </div>

    <div style="padding:8px;">
      <!-- Active coalitions -->
      <div
        v-for="coalition in playerCoalitions"
        :key="coalition.id"
        style="margin-bottom:10px;padding:8px;border:1px solid var(--color-border);"
      >
        <!-- Name + type icon -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:8px;letter-spacing:0.12em;color:var(--color-text-bright);">
            {{ typeIcon(coalition.type) }} {{ coalition.name }}
          </span>
          <span style="font-size:7px;color:var(--color-text-dim);">T{{ coalition.formedTurn }}</span>
        </div>

        <!-- Member flags -->
        <div style="display:flex;gap:4px;margin-bottom:6px;">
          <span
            v-for="memberId in coalition.members"
            :key="memberId"
            style="font-size:13px;"
            :title="memberId"
          >
            {{ getFactionFlag(memberId) }}
          </span>
        </div>

        <!-- Cohesion bar -->
        <div style="margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="font-size:7px;color:var(--color-text-dim);">COHESION</span>
            <span style="font-size:7px;" :style="{ color: cohesionColor(coalition.cohesion) }">
              {{ coalition.cohesion }}
            </span>
          </div>
          <div style="height:2px;background:#0a1f0a;border-radius:1px;">
            <div
              style="height:100%;border-radius:1px;transition:width 0.4s;"
              :style="{ width: `${coalition.cohesion}%`, background: cohesionColor(coalition.cohesion) }"
            />
          </div>
        </div>

        <!-- Betray button -->
        <button
          style="
            margin-top:4px;
            width:100%;
            padding:3px;
            background:none;
            border:1px solid #ef4444;
            color:#ef4444;
            font-family:var(--font-mono);
            font-size:7px;
            letter-spacing:0.18em;
            cursor:pointer;
          "
          @click="betray(coalition.id)"
        >
          BETRAY
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="playerCoalitions.length === 0"
        style="font-size:8px;color:var(--color-text-dim);line-height:1.6;padding:4px 0;"
      >
        NO ACTIVE COALITIONS
      </div>

      <!-- Propose alliance buttons when target selected -->
      <template v-if="target">
        <div style="font-size:7px;color:var(--color-text-dim);letter-spacing:0.15em;margin-bottom:5px;">
          PROPOSE TO {{ target.name.toUpperCase() }}:
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <button
            v-for="type in ['military', 'economic', 'diplomatic', 'intelligence'] as Coalition['type'][]"
            :key="type"
            style="
              padding:4px 2px;
              background:none;
              border:1px solid var(--color-border);
              color:var(--color-text-dim);
              font-family:var(--font-mono);
              font-size:7px;
              letter-spacing:0.1em;
              cursor:pointer;
              text-transform:uppercase;
            "
            @click="proposeAlliance(type)"
          >
            {{ typeIcon(type) }} {{ type }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
