<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number // ms
  format?: (n: number) => string
}>(), {
  duration: 400,
  format: (n: number) => Math.round(n).toString(),
})

const displayValue = ref(props.value)
const animClass = ref('')
let animFrame: number | null = null
let classTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.value, (newVal, oldVal) => {
  if (newVal === oldVal) return

  // Apply direction class for color flash
  animClass.value = newVal > oldVal ? 'stat-up' : 'stat-down'
  if (classTimer) clearTimeout(classTimer)
  classTimer = setTimeout(() => { animClass.value = '' }, 500)

  // Animate the number smoothly
  const startVal = displayValue.value
  const delta = newVal - startVal
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = startVal + delta * eased
    if (progress < 1) {
      animFrame = requestAnimationFrame(tick)
    }
  }

  if (animFrame) cancelAnimationFrame(animFrame)
  animFrame = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  if (classTimer) clearTimeout(classTimer)
})
</script>

<template>
  <span :class="animClass" style="display:inline-block;">{{ format(displayValue) }}</span>
</template>
