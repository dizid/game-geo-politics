<script setup lang="ts">
import { computed } from 'vue'
import { useCoalitionStore } from '../../stores/coalitionStore'
import { useGameStore } from '../../stores/gameStore'
import type { CoalitionProposal } from '../../types/game'

// This component displays the first pending AI-to-player proposal
const coalitionStore = useCoalitionStore()
const gameStore = useGameStore()

const proposal = computed<CoalitionProposal | null>(() =>
  coalitionStore.proposals.find(p => p.toFaction === gameStore.playerFactionId) ?? null,
)

const proposalIndex = computed(() =>
  coalitionStore.proposals.findIndex(p => p.toFaction === gameStore.playerFactionId),
)

const proposer = computed(() =>
  proposal.value ? gameStore.factions.find(f => f.id === proposal.value!.fromFaction) : null,
)

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    military: '⚔️', economic: '💰', diplomatic: '🤝', intelligence: '🔍',
  }
  return icons[type] ?? '🤝'
}

function typeBenefit(type: string): string {
  const benefits: Record<string, string> = {
    military: 'Joint deterrence — both factions +5 MIL; shared military intel',
    economic: 'Trade framework — both factions +5 ECO; reduced sanction exposure',
    diplomatic: 'Diplomatic bloc — both factions +5 DIP; reduced tension on joint actions',
    intelligence: 'Intel-sharing network — both factions +5 INF; shared covert operations',
  }
  return benefits[type] ?? 'Mutual benefit from cooperation'
}

function accept(): void {
  if (proposalIndex.value >= 0) {
    coalitionStore.acceptProposal(proposalIndex.value)
  }
}

function reject(): void {
  if (proposalIndex.value >= 0) {
    coalitionStore.rejectProposal(proposalIndex.value)
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="proposal && proposer"
      class="crisis-overlay"
      style="z-index:900;"
    >
      <div style="
        background:var(--color-bg-panel);
        border:1px solid #4ade80;
        max-width:420px;
        width:90%;
        padding:24px;
        box-shadow:0 0 40px rgba(74,222,128,0.15);
      ">
        <!-- Header -->
        <div style="font-size:7px;letter-spacing:0.3em;color:var(--color-text-dim);margin-bottom:12px;">
          INCOMING COALITION PROPOSAL
        </div>

        <!-- Proposer identity -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="font-size:28px;">{{ proposer.flag }}</span>
          <div>
            <div style="font-size:14px;font-family:var(--font-display);letter-spacing:0.1em;color:var(--color-text-bright);">
              {{ proposer.name.toUpperCase() }}
            </div>
            <div style="font-size:8px;color:var(--color-text-dim);">PROPOSES COALITION</div>
          </div>
        </div>

        <!-- Coalition type -->
        <div style="
          display:flex;
          align-items:center;
          gap:8px;
          padding:10px;
          border:1px solid var(--color-border);
          margin-bottom:14px;
        ">
          <span style="font-size:20px;">{{ typeIcon(proposal.type) }}</span>
          <span style="font-size:11px;font-family:var(--font-display);letter-spacing:0.12em;color:var(--color-text-bright);">
            {{ proposal.type.toUpperCase() }} COALITION
          </span>
        </div>

        <!-- Expected benefits -->
        <div style="
          padding:10px;
          background:#0a1f0a;
          border-left:2px solid #4ade80;
          margin-bottom:20px;
          font-size:9px;
          color:var(--color-text-dim);
          line-height:1.6;
        ">
          {{ typeBenefit(proposal.type) }}
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:10px;">
          <button
            class="exec-btn"
            style="flex:1;"
            @click="accept"
          >
            ACCEPT
          </button>
          <button
            style="
              flex:1;
              padding:10px;
              background:none;
              border:1px solid var(--color-accent-danger);
              color:var(--color-accent-danger);
              font-family:var(--font-mono);
              font-size:10px;
              letter-spacing:0.22em;
              cursor:pointer;
            "
            @click="reject"
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
