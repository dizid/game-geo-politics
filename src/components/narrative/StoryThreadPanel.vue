<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStoryStore } from '../../stores/storyStore'

const storyStore = useStoryStore()
const expandedId = ref<string | null>(null)

const threads = computed(() => [
  ...storyStore.activeThreads,
  ...storyStore.completedThreads.slice(-2),
])

function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id
}

const statusColor: Record<string, string> = {
  developing: '#4ade80',
  climax: '#ef4444',
  resolved: 'var(--color-text-dim)',
}

const statusLabel: Record<string, string> = {
  developing: 'DEVELOPING',
  climax: 'CLIMAX',
  resolved: 'DECLASSIFIED',
}
</script>

<template>
  <div v-if="threads.length > 0" style="padding:6px;border-bottom:1px solid var(--color-border);">
    <div style="font-size:8px;letter-spacing:0.22em;color:var(--color-text-dim);margin-bottom:6px;">
      STORY THREADS
    </div>

    <div
      v-for="thread in threads"
      :key="thread.id"
      style="margin-bottom:4px;border:1px solid var(--color-border);cursor:pointer;"
      :style="{
        borderLeftColor: statusColor[thread.status],
        borderLeftWidth: '2px',
      }"
      @click="toggleExpand(thread.id)"
    >
      <div style="padding:4px 6px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;letter-spacing:0.1em;color:var(--color-text-bright);">
          {{ thread.title }}
        </span>
        <span
          style="font-size:6px;letter-spacing:0.1em;padding:1px 4px;border:1px solid;"
          :style="{ color: statusColor[thread.status], borderColor: statusColor[thread.status] }"
          :class="{ pulse: thread.status === 'climax' }"
        >
          {{ statusLabel[thread.status] }}
        </span>
      </div>

      <!-- Tension bar -->
      <div v-if="thread.status !== 'resolved'" style="padding:0 6px 4px;">
        <div style="height:2px;background:#1a1a1a;">
          <div
            style="height:100%;transition:width 0.4s;"
            :style="{
              width: `${thread.tension}%`,
              background: thread.tension > 70 ? '#ef4444' : thread.tension > 40 ? '#f59e0b' : '#4ade80',
            }"
          />
        </div>
      </div>

      <!-- Expanded beats -->
      <div v-if="expandedId === thread.id" style="padding:2px 6px 6px;">
        <div
          v-for="(beat, i) in thread.beats.slice(-4)"
          :key="i"
          style="font-size:8px;color:var(--color-text);line-height:1.6;padding:3px 0;border-top:1px solid var(--color-border);"
        >
          <span style="color:var(--color-text-dim);margin-right:4px;">T{{ beat.turn }}</span>
          {{ beat.narrative }}
        </div>
      </div>
    </div>
  </div>
</template>
