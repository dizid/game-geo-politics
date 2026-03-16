<script setup lang="ts">
import { ref } from 'vue'
import { FACTIONS, calculatePower } from '../data/factions'
import WorldMap from '../components/map/WorldMap.vue'
import StatBar from '../components/common/StatBar.vue'
import type { Faction } from '../types/game'

const emit = defineEmits<{
  start: [factionId: string]
}>()

const hovered = ref<string | null>(null)

const difficultyColor: Record<Faction['difficulty'], string> = {
  'Easy':        '#4ade80',
  'Medium-Easy': '#86efac',
  'Medium':      '#fbbf24',
  'Medium-Hard': '#f97316',
  'Hard':        '#ef4444',
  'Very Hard':   '#dc2626',
}

function selectFaction(id: string): void {
  emit('start', id)
}
</script>

<template>
  <div
    class="crt-flicker"
    style="
      min-height:100vh;
      background:var(--color-bg);
      display:flex;
      flex-direction:column;
      align-items:center;
      padding:32px 20px 48px;
      overflow-y:auto;
    "
  >
    <!-- Title block -->
    <div style="text-align:center;margin-bottom:16px;">
      <div style="
        font-family:var(--font-display);
        font-size:clamp(36px, 7vw, 72px);
        letter-spacing:0.18em;
        color:var(--color-text);
        text-shadow:0 0 30px rgba(74,222,128,0.4);
        line-height:1;
        margin-bottom:6px;
      ">
        GEOPOLITICAL COMMAND
      </div>
      <div style="
        font-size:9px;
        letter-spacing:0.3em;
        color:var(--color-text-dim);
        padding:4px 0;
        border-top:1px solid var(--color-border);
        border-bottom:1px solid var(--color-border);
      ">
        EYES ONLY — GLOBAL STRATEGIC COMMAND SYSTEM v4.1
      </div>
    </div>

    <!-- World map preview -->
    <div style="
      width:100%;
      max-width:800px;
      height:200px;
      border:1px solid var(--color-border);
      margin-bottom:28px;
      overflow:hidden;
    ">
      <WorldMap
        :factions="FACTIONS"
        :player-faction-id="null"
        :selected-target-id="hovered"
      />
    </div>

    <!-- Game description -->
    <div style="
      max-width:640px;
      text-align:center;
      margin-bottom:20px;
      padding:12px 16px;
      border:1px solid var(--color-border);
      background:var(--color-bg-panel);
    ">
      <div style="font-size:10px;line-height:1.7;color:var(--color-text-bright);margin-bottom:8px;">
        Lead a world power through 20 turns of diplomacy, warfare, and intrigue.
        Each turn, spend Action Points to sanction rivals, forge alliances, launch covert ops, or wage info war.
        AI-driven opponents scheme, threaten, and betray.
      </div>
      <div style="font-size:9px;color:var(--color-text-dim);letter-spacing:0.12em;">
        5 VICTORY PATHS · 10 FACTIONS · AI-GENERATED NARRATIVE · ~30 MIN PER GAME
      </div>
    </div>

    <!-- Select prompt -->
    <div style="
      font-size:9px;
      letter-spacing:0.28em;
      color:#f59e0b;
      margin-bottom:18px;
    ">
      ▼ SELECT YOUR FACTION TO BEGIN ▼
    </div>

    <!-- Faction grid -->
    <div style="
      width:100%;
      max-width:1100px;
      display:grid;
      grid-template-columns:repeat(auto-fill, minmax(190px, 1fr));
      gap:12px;
    ">
      <div
        v-for="faction in FACTIONS"
        :key="faction.id"
        class="faction-card"
        :style="{ '--fc': faction.color, '--fg': `${faction.color}28` }"
        @mouseenter="hovered = faction.id"
        @mouseleave="hovered = null"
        @click="selectFaction(faction.id)"
      >
        <!-- Flag + name row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:22px;">{{ faction.flag }}</span>
            <span style="
              font-size:9px;
              letter-spacing:0.12em;
              color:var(--color-text-bright);
              line-height:1.3;
            ">
              {{ faction.name.toUpperCase() }}
            </span>
          </div>
          <!-- Power badge -->
          <span style="
            font-size:12px;
            font-weight:bold;
          "
          :style="{ color: faction.color }"
          >
            {{ calculatePower(faction) }}
          </span>
        </div>

        <!-- Difficulty badge -->
        <div style="margin-bottom:10px;">
          <span style="
            font-size:7px;
            letter-spacing:0.18em;
            padding:2px 7px;
            border:1px solid currentColor;
          "
          :style="{ color: difficultyColor[faction.difficulty] }"
          >
            {{ faction.difficulty.toUpperCase() }}
          </span>
        </div>

        <!-- Stat bars -->
        <div style="display:grid;gap:5px;margin-bottom:10px;">
          <StatBar label="MIL" :value="faction.mil" color="var(--color-stat-mil)" :show-label="true" />
          <StatBar label="ECO" :value="faction.eco" color="var(--color-stat-eco)" :show-label="true" />
          <StatBar label="DIP" :value="faction.dip" color="var(--color-stat-dip)" :show-label="true" />
          <StatBar label="INF" :value="faction.inf" color="var(--color-stat-inf)" :show-label="true" />
        </div>

        <!-- Passive ability -->
        <div style="
          padding:6px 8px;
          background:#01100502;
          border-left:2px solid var(--color-border);
          font-size:7px;
          line-height:1.55;
        ">
          <div style="color:var(--color-text-dim);letter-spacing:0.15em;margin-bottom:2px;">
            PASSIVE: {{ faction.passive.name.toUpperCase() }}
          </div>
          <div style="color:var(--color-text-mid);">{{ faction.passive.description }}</div>
        </div>
      </div>
    </div>

    <!-- Bottom system text -->
    <div style="
      margin-top:32px;
      font-size:7px;
      letter-spacing:0.2em;
      color:var(--color-text-dim);
      text-align:center;
      line-height:2;
    ">
      GEOPOLITICAL COMMAND SYSTEM · CLASSIFIED · 20 TURNS · AI-DRIVEN NARRATIVE
    </div>
  </div>
</template>
