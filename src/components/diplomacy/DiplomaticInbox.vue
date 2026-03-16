<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDiplomacyStore } from '../../stores/diplomacyStore'
import { useGameStore } from '../../stores/gameStore'
import { FACTIONS } from '../../data/factions'
import type { DiplomaticMessage, PlayerResponse } from '../../types/diplomacy'

const diplomacyStore = useDiplomacyStore()
const gameStore = useGameStore()

const expandedId = ref<string | null>(null)

const messages = computed(() =>
  [...diplomacyStore.inbox]
    .filter(m => m.turn >= gameStore.turn - 3) // Show last 3 turns of messages
    .sort((a, b) => b.turn - a.turn)
)

const schemes = computed(() => diplomacyStore.activeSchemesList)
const ultimatums = computed(() => diplomacyStore.unresolvedUltimatums)

function getFactionFlag(id: string): string {
  return FACTIONS.find(f => f.id === id)?.flag ?? '🏳️'
}

function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id
}

function respond(msg: DiplomaticMessage, response: PlayerResponse): void {
  diplomacyStore.respondToMessage(msg.id, response)
  expandedId.value = null
}

const urgencyColor: Record<string, string> = {
  routine: 'var(--color-text-dim)',
  priority: '#f59e0b',
  flash: '#f97316',
  critical: '#ef4444',
}

const categoryLabel: Record<string, string> = {
  threat: 'THREAT',
  proposal: 'PROPOSAL',
  warning: 'WARNING',
  praise: 'PRAISE',
  ultimatum: 'ULTIMATUM',
  demand: 'DEMAND',
  secret_deal: 'SECRET DEAL',
}
</script>

<template>
  <div style="height:100%;display:flex;flex-direction:column;overflow:hidden;">
    <!-- Header -->
    <div style="
      padding:6px 8px;
      border-bottom:1px solid var(--color-border);
      display:flex;
      justify-content:space-between;
      align-items:center;
    ">
      <span style="font-size:8px;letter-spacing:0.22em;color:var(--color-text-dim);">
        SECURE CHANNEL
      </span>
      <span
        v-if="diplomacyStore.unreadCount > 0"
        style="
          font-size:8px;
          padding:1px 5px;
          background:#ef4444;
          color:#000;
          font-weight:bold;
        "
      >
        {{ diplomacyStore.unreadCount }}
      </span>
    </div>

    <!-- Ultimatum banner -->
    <div
      v-for="ult in ultimatums"
      :key="ult.id"
      style="
        padding:5px 8px;
        background:rgba(239,68,68,0.1);
        border-bottom:1px solid #ef4444;
        font-size:8px;
        color:#ef4444;
        letter-spacing:0.1em;
      "
    >
      <span class="pulse">⚠</span> ULTIMATUM: {{ ult.demand }} — EXPIRES T+{{ ult.turnsRemaining }}
    </div>

    <!-- Message list -->
    <div style="flex:1;overflow-y:auto;padding:4px;">
      <!-- No messages -->
      <div
        v-if="messages.length === 0 && schemes.length === 0"
        style="padding:16px 8px;text-align:center;font-size:9px;color:var(--color-text-dim);letter-spacing:0.15em;"
      >
        NO TRANSMISSIONS
      </div>

      <!-- Scheme alerts -->
      <div
        v-for="scheme in schemes"
        :key="scheme.id"
        style="
          padding:6px 8px;
          margin-bottom:4px;
          border-left:2px solid #6366f1;
          background:rgba(99,102,241,0.05);
        "
      >
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:7px;letter-spacing:0.15em;color:#6366f1;">INTEL REPORT</span>
          <span style="font-size:7px;color:var(--color-text-dim);">{{ Math.round(scheme.confidence * 100) }}%</span>
        </div>
        <div style="font-size:9px;color:var(--color-text-bright);margin-top:3px;line-height:1.5;">
          {{ scheme.description }}
        </div>
        <div style="font-size:7px;color:var(--color-text-dim);margin-top:2px;">
          EST. EXECUTION: {{ scheme.turnsUntilExecution }} TURNS
        </div>
      </div>

      <!-- Messages -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        style="
          margin-bottom:4px;
          border:1px solid var(--color-border);
          cursor:pointer;
        "
        :style="{
          borderLeftColor: urgencyColor[msg.urgency],
          borderLeftWidth: '2px',
          opacity: msg.status === 'responded' || msg.status === 'expired' ? 0.5 : 1,
        }"
        @click="toggleExpand(msg.id)"
      >
        <!-- Header row -->
        <div style="padding:5px 8px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:5px;min-width:0;">
            <span style="font-size:11px;flex-shrink:0;">{{ getFactionFlag(msg.fromFactionId) }}</span>
            <span style="font-size:8px;letter-spacing:0.1em;color:var(--color-text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              {{ msg.subject }}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span
              style="font-size:6px;letter-spacing:0.1em;padding:1px 4px;border:1px solid;"
              :style="{ color: urgencyColor[msg.urgency], borderColor: urgencyColor[msg.urgency] }"
            >
              {{ categoryLabel[msg.category] }}
            </span>
          </div>
        </div>

        <!-- Expanded content -->
        <div v-if="expandedId === msg.id" style="padding:0 8px 8px;">
          <div style="font-size:9px;line-height:1.7;color:var(--color-text-bright);padding:6px;background:rgba(0,15,0,0.3);border-left:1px solid var(--color-border);margin-bottom:6px;">
            {{ msg.body }}
          </div>

          <!-- Response buttons -->
          <div v-if="msg.status !== 'responded' && msg.status !== 'expired' && msg.responseOptions.length > 0" style="display:flex;flex-direction:column;gap:3px;">
            <button
              v-for="opt in msg.responseOptions"
              :key="opt.id"
              class="exec-btn"
              style="font-size:8px;padding:4px 8px;text-align:left;"
              @click.stop="respond(msg, opt.id)"
            >
              {{ opt.label }}
              <span style="color:var(--color-text-dim);margin-left:6px;">{{ opt.description }}</span>
            </button>
          </div>

          <!-- Status -->
          <div v-else-if="msg.status === 'responded'" style="font-size:8px;color:#4ade80;letter-spacing:0.1em;margin-top:4px;">
            RESPONDED
          </div>
          <div v-else-if="msg.status === 'expired'" style="font-size:8px;color:#ef4444;letter-spacing:0.1em;margin-top:4px;">
            EXPIRED
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
