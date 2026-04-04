import { ref, computed, onMounted, onUnmounted } from 'vue'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

// Breakpoint boundaries:
//   mobile:  < 768px
//   tablet:  768px – 1023px
//   desktop: >= 1024px

function detectBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile'
  if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet'
  return 'desktop'
}

export function useBreakpoint() {
  const breakpoint = ref<Breakpoint>(detectBreakpoint())

  const isMobile = computed(() => breakpoint.value === 'mobile')
  const isTablet = computed(() => breakpoint.value === 'tablet')
  const isDesktop = computed(() => breakpoint.value === 'desktop')

  // Use matchMedia listeners — more efficient than resize events
  const mobileQuery = window.matchMedia('(max-width: 767px)')
  const tabletQuery = window.matchMedia('(max-width: 1023px)')

  function updateBreakpoint(): void {
    breakpoint.value = detectBreakpoint()
  }

  onMounted(() => {
    mobileQuery.addEventListener('change', updateBreakpoint)
    tabletQuery.addEventListener('change', updateBreakpoint)
    // Re-detect on mount in case SSR value was wrong
    breakpoint.value = detectBreakpoint()
  })

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', updateBreakpoint)
    tabletQuery.removeEventListener('change', updateBreakpoint)
  })

  return { breakpoint, isMobile, isTablet, isDesktop }
}
