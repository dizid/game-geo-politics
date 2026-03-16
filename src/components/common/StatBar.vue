<script setup lang="ts">
defineProps<{
  label: string
  value: number  // 0-100
  color: string
  showLabel?: boolean
}>()
</script>

<template>
  <div>
    <div v-if="showLabel" style="display:flex;justify-content:space-between;font-size:8px;letter-spacing:0.1em;margin-bottom:2px;">
      <span style="color:var(--color-text-dim);">{{ label }}</span>
      <span :style="{ color }">{{ value }}</span>
    </div>
    <div class="stat-bar">
      <div
        class="stat-bar-fill"
        :style="{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }"
      />
    </div>
  </div>
</template>
