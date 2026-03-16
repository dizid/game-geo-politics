<script setup lang="ts">
import type { NewsItem, NewsType } from '../../types/game'

const props = defineProps<{
  item: NewsItem
}>()

const typeColors: Record<NewsType, string> = {
  headline: '#fbbf24',
  outcome:  '#4ade80',
  response: '#c084fc',
  reaction: '#60a5fa',
  event:    '#1a5a1a',
  system:   '#4ade80',
  error:    '#ef4444',
  crisis:   '#f97316',
  forecast: '#2dd4bf',
}

function labelForType(type: NewsType): string {
  const labels: Record<NewsType, string> = {
    headline: 'HEADLINE',
    outcome:  'OUTCOME',
    response: 'RESPONSE',
    reaction: 'REACTION',
    event:    'EVENT',
    system:   'SYSTEM',
    error:    'ERROR',
    crisis:   'CRISIS',
    forecast: 'FORECAST',
  }
  return labels[type]
}
</script>

<template>
  <div
    class="news-item"
    :class="item.type"
  >
    <!-- Type label + turn + speaker -->
    <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
      <span
        style="font-size:7px;letter-spacing:0.2em;font-weight:bold;"
        :style="{ color: typeColors[item.type] }"
      >
        {{ item.speaker ? item.speaker.toUpperCase() : labelForType(item.type) }}
      </span>
      <span style="font-size:7px;color:var(--color-text-dim);">T{{ item.turn }}</span>
    </div>

    <!-- Text -->
    <div style="font-size:10px;line-height:1.6;" :style="{ color: typeColors[item.type] }">
      {{ item.text }}
    </div>
  </div>
</template>
