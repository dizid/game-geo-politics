<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'
import { useNewsStore } from '../../stores/newsStore'
import { useGameStore } from '../../stores/gameStore'
import NewsFeedItem from './NewsFeedItem.vue'

const newsStore = useNewsStore()
const gameStore = useGameStore()

const scrollEl = ref<HTMLElement | null>(null)

const items = computed(() => newsStore.items)
const loading = computed(() => gameStore.loading)

// Auto-scroll to bottom when new items arrive
watch(
  () => items.value.length,
  async () => {
    await nextTick()
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    }
  },
)
</script>

<template>
  <div
    style="
      display:flex;
      flex-direction:column;
      height:100%;
      border-left:1px solid var(--color-border);
    "
  >
    <!-- Header -->
    <div style="
      padding:6px 10px;
      border-bottom:1px solid var(--color-border);
      font-size:7px;
      letter-spacing:0.25em;
      color:var(--color-text-dim);
      flex-shrink:0;
    ">
      INTEL FEED
    </div>

    <!-- Scrollable feed -->
    <div
      ref="scrollEl"
      style="flex:1;overflow-y:auto;padding:6px;"
    >
      <NewsFeedItem
        v-for="(item, idx) in items"
        :key="idx"
        :item="item"
      />

      <!-- Loading spinner when waiting for AI -->
      <div v-if="loading" style="padding:8px 11px;display:flex;align-items:center;gap:8px;">
        <span class="spin" />
        <span style="font-size:9px;letter-spacing:0.18em;color:var(--color-text-dim);">PROCESSING...</span>
      </div>

      <!-- Empty state -->
      <div
        v-if="items.length === 0 && !loading"
        style="padding:12px 11px;font-size:9px;color:var(--color-text-dim);letter-spacing:0.12em;line-height:1.7;"
      >
        INTEL FEED INITIALISED.<br />AWAITING FIRST ACTION.
      </div>
    </div>
  </div>
</template>
