import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NewsItem, NewsType } from '../types/game'

export const useNewsStore = defineStore('news', () => {
  // ─── State ───────────────────────────────────────────────────────────────

  const items = ref<NewsItem[]>([])

  // ─── Core Add ─────────────────────────────────────────────────────────────

  function addNews(item: NewsItem): void {
    items.value.push(item)
  }

  // Internal helper — avoids repeating the push pattern
  function add(type: NewsType, text: string, turn: number, speaker?: string): void {
    items.value.push({ type, text, turn, speaker })
  }

  // ─── Typed Convenience Methods ────────────────────────────────────────────

  function addHeadline(text: string, turn: number): void {
    add('headline', text, turn)
  }

  function addOutcome(text: string, turn: number): void {
    add('outcome', text, turn)
  }

  // speaker is first to match the spec: addResponse(speaker, text, turn)
  function addResponse(speaker: string, text: string, turn: number): void {
    add('response', text, turn, speaker)
  }

  function addReaction(speaker: string, text: string, turn: number): void {
    add('reaction', text, turn, speaker)
  }

  function addEvent(text: string, turn: number): void {
    add('event', text, turn)
  }

  function addSystem(text: string, turn: number): void {
    add('system', text, turn)
  }

  function addError(text: string, turn: number): void {
    add('error', text, turn)
  }

  function addCrisis(text: string, turn: number): void {
    add('crisis', text, turn)
  }

  function addForecast(text: string, turn: number): void {
    add('forecast', text, turn)
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  function clearAll(): void {
    items.value = []
  }

  /** Get the last N news items, most recent last */
  const recentNews = computed(() => (count: number): NewsItem[] => {
    return items.value.slice(-count)
  })

  /** Filter items by type for targeted feeds */
  function getByType(type: NewsType): NewsItem[] {
    return items.value.filter(i => i.type === type)
  }

  return {
    // State
    items,
    // Computed
    recentNews,
    // Actions
    addNews,
    addHeadline,
    addOutcome,
    addResponse,
    addReaction,
    addEvent,
    addSystem,
    addError,
    addCrisis,
    addForecast,
    clearAll,
    getByType,
  }
})
