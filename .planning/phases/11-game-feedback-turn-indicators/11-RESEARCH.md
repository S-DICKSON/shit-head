# Phase 11: Game Feedback & Turn Indicators - Research

**Researched:** 2026-02-08
**Domain:** Vue 3 UI/UX, animations, audio feedback, accessibility
**Confidence:** HIGH

## Summary

This phase focuses on enhancing visual and auditory feedback for turn transitions in a multiplayer card game. The server-side infrastructure (turn tracking via `currentPlayerIndex`, timer ticks via WebSocket) already exists from Phase 8. The challenge is purely client-side: making it crystal clear whose turn it is, showing timer urgency, and providing smooth transitions.

The standard approach combines:
1. **Vue 3 `<Transition>` component** for smooth enter/leave animations on turn indicators
2. **Tailwind CSS animation utilities** with GPU-accelerated `transform` and `opacity` properties
3. **@vueuse/sound** composable for optional audio feedback on turn changes
4. **ARIA live regions** and `prefers-reduced-motion` for accessibility
5. **Vue `watch()` to trigger animations** when reactive state (`currentPlayerIndex`, `turnTimeRemaining`) changes

The existing codebase already has:
- `TurnTimer.vue` component with circular progress (SVG stroke-dashoffset animation)
- `PlayingPhase.vue` orchestrating the game view
- `OpponentCards.vue` with basic turn indicator (yellow ring + pulse dot)
- `usePlayingPhase()` composable providing `isMyTurn` computed

**Primary recommendation:** Use Vue 3 `<Transition>` with Tailwind animation utilities for turn indicators, add `@vueuse/sound` for optional audio cues, and enhance the existing timer with color/pulse urgency states. Avoid hand-rolling animation logic—leverage Vue's built-in transition system and GPU-optimized CSS properties.

## Standard Stack

The established libraries/tools for Vue 3 game feedback and animations:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 `<Transition>` | Built-in | Enter/leave animations | Native Vue component, no dependencies, GPU-optimized |
| Tailwind CSS | v4 | Animation utilities | Already in project, utility-first, `motion-reduce` variant support |
| `@vueuse/sound` | Latest | Audio feedback composable | Vue 3-native, wraps Howler.js, lazy-loads audio, excellent DX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vibration API | Native Web API | Haptic feedback on mobile | Turn changes on touch devices (note: iOS Safari doesn't support) |
| ARIA live regions | Native HTML | Screen reader announcements | Always (accessibility requirement) |
| `prefers-reduced-motion` | Native CSS | Respect motion preferences | Always (accessibility requirement) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vueuse/sound` | Raw Web Audio API | More control but much more code, no Vue reactivity integration |
| `@vueuse/sound` | `<audio>` HTML elements | Simpler but less flexible, no sprite support, harder to manage state |
| Tailwind animations | Custom CSS `@keyframes` | More flexibility but verbose, must manually handle `prefers-reduced-motion` |
| Vue `<Transition>` | JavaScript animation libraries (GSAP, Anime.js) | More powerful but overkill for simple UI transitions, larger bundle |

**Installation:**
```bash
npm install @vueuse/sound
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/
├── TurnTimer.vue           # Already exists - enhance with urgency states
├── TurnIndicator.vue       # NEW: Overlay/banner showing "Your Turn!" with animation
├── OpponentCards.vue       # Already has basic indicator - enhance transitions
└── PlayingPhase.vue        # Orchestrator - add sound triggers, ARIA announcements
```

### Pattern 1: Reactive State-Driven Animations
**What:** Use Vue `watch()` to trigger animations when `currentPlayerIndex` changes
**When to use:** Turn transitions, timer urgency thresholds
**Example:**
```vue
<script setup lang="ts">
import { watch, ref } from 'vue';
import { usePlayingPhase } from '../composables/usePlayingPhase';
import { useSound } from '@vueuse/sound';

const { gameView, isMyTurn, turnTimeRemaining } = usePlayingPhase();
const showTurnIndicator = ref(false);
const { play: playTurnSound } = useSound('/sounds/your-turn.mp3', { volume: 0.5 });

// Trigger animation and sound when turn changes
watch(isMyTurn, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Became my turn
    showTurnIndicator.value = true;
    playTurnSound();
    setTimeout(() => showTurnIndicator.value = false, 2000);
  }
});
</script>

<template>
  <Transition name="slide-fade">
    <div v-if="showTurnIndicator" class="turn-indicator">
      Your Turn!
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}
.slide-fade-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}
.slide-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: opacity 0.1s;
    transform: none;
  }
}
</style>
```
**Source:** [Vue.js Transition Component](https://vuejs.org/guide/built-ins/transition)

### Pattern 2: Timer Urgency States
**What:** Change timer appearance based on remaining time thresholds
**When to use:** Warning states at 10s, critical at 5s
**Example:**
```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const urgencyClass = computed(() => {
  if (props.timeRemaining <= 5) return 'critical';
  if (props.timeRemaining <= 10) return 'warning';
  return 'normal';
});

const strokeColor = computed(() => {
  if (props.timeRemaining <= 5) return '#ef4444'; // red-500
  if (props.timeRemaining <= 10) return '#f59e0b'; // amber-500
  return '#3b82f6'; // blue-500
});
</script>

<template>
  <div
    class="timer-container transition-transform duration-200"
    :class="{
      'animate-pulse': urgencyClass === 'critical',
      'scale-110': urgencyClass === 'warning' || urgencyClass === 'critical'
    }"
  >
    <svg>
      <circle :stroke="strokeColor" />
    </svg>
    <div class="text" :class="urgencyClass">{{ timeRemaining }}s</div>
  </div>
</template>

<style scoped>
.text.critical {
  color: #ef4444;
  font-weight: 700;
}
.text.warning {
  color: #f59e0b;
}

@media (prefers-reduced-motion: reduce) {
  .timer-container {
    animation: none !important;
    transform: none !important;
  }
}
</style>
```

### Pattern 3: ARIA Live Regions for Accessibility
**What:** Announce turn changes to screen readers
**When to use:** Always (WCAG requirement)
**Example:**
```vue
<script setup lang="ts">
import { watch, ref } from 'vue';
import { usePlayingPhase } from '../composables/usePlayingPhase';

const { gameView, isMyTurn, roomState } = usePlayingPhase();
const turnAnnouncement = ref('');

watch(() => gameView.value?.currentPlayerIndex, (newIndex) => {
  if (newIndex === undefined) return;
  const currentPlayer = roomState.value?.players[newIndex];
  if (!currentPlayer) return;

  if (isMyTurn.value) {
    turnAnnouncement.value = 'It is your turn';
  } else {
    turnAnnouncement.value = `It is ${currentPlayer.nickname}'s turn`;
  }
});
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="sr-only"
  >
    {{ turnAnnouncement }}
  </div>
</template>
```
**Source:** [ARIA Accessibility Best Practices](https://www.allaccessible.org/blog/implementing-aria-labels-for-web-accessibility)

### Pattern 4: Optional Audio Feedback
**What:** Play sounds on turn changes, respecting user preferences
**When to use:** Turn start, timer warnings, game events
**Example:**
```vue
<script setup lang="ts">
import { useSound } from '@vueuse/sound';
import { watch } from 'vue';

const { play: playTurnStart } = useSound('/sounds/turn-start.mp3', {
  volume: 0.4,
  interrupt: true // Allow overlapping if rapid turn changes
});

const { play: playWarning } = useSound('/sounds/timer-warning.mp3', {
  volume: 0.6
});

const { turnTimeRemaining, isMyTurn } = usePlayingPhase();

watch(isMyTurn, (isNowMyTurn) => {
  if (isNowMyTurn) playTurnStart();
});

watch(turnTimeRemaining, (remaining) => {
  if (remaining === 10 && isMyTurn.value) playWarning();
});
</script>
```
**Source:** [@vueuse/sound Documentation](https://sound.vueuse.org/)

### Anti-Patterns to Avoid

- **Don't animate layout-affecting properties:** Never animate `height`, `width`, `margin`, `padding` directly. Use `transform: scale()` instead. Layout animations force reflows and can't be GPU-accelerated.
- **Don't ignore `prefers-reduced-motion`:** Always provide reduced-motion alternatives. Users with vestibular disorders can become physically ill from animations.
- **Don't use `v-if` for frequently toggled elements:** Use `v-show` or `<Transition>` instead. `v-if` causes DOM creation/destruction, which is 3x slower than toggling visibility.
- **Don't hand-roll timer countdown logic:** The server already sends `turn-timer-tick` events. Use those directly; don't create client-side intervals that drift out of sync.
- **Don't use `ease-in` for entrances:** Common mistake—use `ease-out` for entrances, `ease-in` for exits. This feels more natural.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sound effect playback | Custom `AudioContext` wrapper | `@vueuse/sound` | Handles lazy-loading, browser autoplay policies, Vue reactivity integration, sound sprites |
| Animation timing | `setInterval` or `requestAnimationFrame` loops | Vue `<Transition>` + CSS transitions | Browser-optimized, handles cleanup, respects `prefers-reduced-motion` |
| Timer countdown sync | Client-side `setInterval` countdown | Server `turn-timer-tick` events | Avoids drift, handles network latency, server is source of truth |
| Vibration patterns | Raw `navigator.vibrate()` with manual patterns | Vibration API with feature detection | Browser support varies (iOS Safari doesn't support), needs graceful degradation |

**Key insight:** Vue 3's built-in `<Transition>` component handles enter/leave animations, cleanup, and edge cases better than custom JavaScript. CSS transitions with `transform` and `opacity` are GPU-accelerated and perform well on mobile.

## Common Pitfalls

### Pitfall 1: Animating Non-GPU-Accelerated Properties
**What goes wrong:** Animating `margin`, `padding`, `top`, `left`, or `height` causes layout recalculation (reflow) on every frame, leading to jank and poor performance on mobile.
**Why it happens:** These properties affect document layout, requiring the browser to recalculate positions of all affected elements.
**How to avoid:** Only animate `transform` (translate, scale, rotate) and `opacity`. These properties don't trigger reflow and are GPU-accelerated.
**Warning signs:** Animations stutter on mobile, DevTools performance profiling shows "Layout" spikes during animations.
**Source:** [CSS GPU Animation: Doing It Right](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)

### Pitfall 2: Forgetting `prefers-reduced-motion`
**What goes wrong:** Users with vestibular disorders or ADHD experience motion sickness or distraction from animations. This is a WCAG violation and can cause physical discomfort.
**Why it happens:** Developers test on their own machines without motion sensitivity and forget to test with OS accessibility settings enabled.
**How to avoid:** Always wrap animations in `@media (prefers-reduced-motion: reduce)` and provide fallbacks (instant transitions or fade-only). Tailwind's `motion-reduce:` variant makes this easy.
**Warning signs:** Users report motion sickness, accessibility audits flag animation issues, no reduced-motion fallbacks in code.
**Source:** [prefers-reduced-motion - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

### Pitfall 3: Client-Side Timer Drift
**What goes wrong:** Creating a client-side countdown with `setInterval` that decrements independently from server state leads to drift over time, especially with network latency or background tab throttling.
**Why it happens:** JavaScript timers aren't precise, especially in background tabs. Browsers throttle timers to ~1000ms in inactive tabs.
**How to avoid:** Use server-sent `turn-timer-tick` events as the single source of truth. Client displays the value from the server, not a local countdown.
**Warning signs:** Timer shows different values than server expects, turn timeouts happen at unexpected times, reconnection shows wrong timer value.

### Pitfall 4: Sound Autoplay Policy Violations
**What goes wrong:** Browsers block autoplay of audio until user interaction. Attempting to play sound before user clicks causes silent failures.
**Why it happens:** Security/UX policy—browsers prevent websites from playing audio without user consent.
**How to avoid:** `@vueuse/sound` handles this automatically by lazy-loading audio after first user interaction. Don't preload or auto-play on page load.
**Warning signs:** Sounds don't play on first page load, console shows "DOMException: play() failed because the user didn't interact with the document first."
**Source:** [@vueuse/sound Documentation](https://sound.vueuse.org/)

### Pitfall 5: Overusing `will-change`
**What goes wrong:** Adding `will-change` to many elements causes browser to create GPU layers for all of them, consuming memory and actually hurting performance.
**Why it happens:** Developers think `will-change` is a performance boost and apply it liberally.
**How to avoid:** Only use `will-change` on elements actively being animated, remove it after animation completes. For simple transitions, modern browsers optimize `transform` and `opacity` automatically without `will-change`.
**Warning signs:** Increased memory usage, poor performance on low-end devices, DevTools shows excessive compositor layers.
**Source:** [CSS GPU Acceleration Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/)

### Pitfall 6: No Visual Indicator for Opponents' Turns
**What goes wrong:** Players only see "Your Turn!" indicator but have no way to tell which opponent is currently playing, leading to confusion in 3+ player games.
**Why it happens:** Focus on local player UX, forgetting that knowing opponent turn order is important game information.
**How to avoid:** OpponentCards component should show clear visual indicator (ring, border, pulse dot, or label) for whichever opponent has the current turn. Use `isOpponentCurrentTurn(playerId)` helper.
**Warning signs:** Playtest feedback: "I don't know who's turn it is", players confused about turn order.

## Code Examples

Verified patterns from official sources:

### Tailwind Animation with Motion-Reduce Variant
```vue
<template>
  <div
    class="
      transition-all duration-300
      hover:scale-110
      motion-reduce:transition-none
      motion-reduce:hover:scale-100
    "
  >
    Turn indicator
  </div>
</template>
```
**Source:** [Tailwind CSS Animation Utilities](https://tailwindcss.com/docs/animation)

### Vue Watch for Turn Change Detection
```typescript
import { watch } from 'vue';

watch(() => gameView.value?.currentPlayerIndex, (newIndex, oldIndex) => {
  if (newIndex !== undefined && newIndex !== oldIndex) {
    // Turn changed - trigger animations/sounds
    console.log('Turn changed to player', newIndex);
  }
}, { immediate: false });
```
**Source:** [Vue 3 Watchers](https://vuejs.org/guide/essentials/watchers)

### Vibration API with Feature Detection
```typescript
function vibrateTurnChange() {
  // Check if Vibration API is supported
  if ('vibrate' in navigator) {
    // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms
    navigator.vibrate([200, 100, 200]);
  }
  // Gracefully degrade if not supported (iOS Safari)
}
```
**Source:** [Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

### Using @vueuse/sound with Sprites
```typescript
import { useSound } from '@vueuse/sound';

const { play } = useSound('/sounds/game-effects.mp3', {
  sprite: {
    turnStart: [0, 500],      // 0ms to 500ms
    turnWarning: [500, 300],  // 500ms to 800ms
    turnEnd: [800, 400]       // 800ms to 1200ms
  },
  volume: 0.5
});

// Play specific sound from sprite
play({ id: 'turnStart' });
```
**Source:** [@vueuse/sound Documentation](https://sound.vueuse.org/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery `.animate()` or direct DOM manipulation | Vue `<Transition>` component | Vue 3 (2020) | Declarative, handles cleanup, integrates with VDOM |
| CSS `transition: all` | Specific property transitions (`transition: transform, opacity`) | 2016+ | Better performance, avoids unnecessary recalculations |
| Custom audio loading/playback | Vue composables like `@vueuse/sound` | 2021+ | Handles autoplay policies, lazy-loading, Vue reactivity |
| Manual `@media` queries for motion | Tailwind `motion-reduce:` variant | Tailwind v3+ (2021) | Easier to implement, catches more cases |
| `transform: translate()` | GPU layer hinting with `transform: translate3d()` or `will-change` | 2015+ | Explicit GPU acceleration (though modern browsers auto-optimize `transform`) |

**Deprecated/outdated:**
- **`<transition>` with capital T in Vue 3:** Vue 3 uses `<Transition>` (capital T). The lowercase version was Vue 2.
- **Animating layout properties:** Still technically works but strongly discouraged. Modern best practice is `transform`/`opacity` only.
- **`navigator.vibrate()` on iOS:** Never worked, never will. iOS Safari doesn't support Vibration API for privacy/UX reasons.

## Open Questions

Things that couldn't be fully resolved:

1. **Sound effect file format and hosting**
   - What we know: @vueuse/sound supports MP3, OGG, WAV
   - What's unclear: Best practice for hosting (public folder vs CDN), file size recommendations
   - Recommendation: Start with MP3 files in `/public/sounds/`, keep under 50KB each for fast loading

2. **Vibration patterns for different events**
   - What we know: API supports patterns like `[200, 100, 200]` (vibrate-pause-vibrate)
   - What's unclear: What patterns feel good for card game events without being annoying
   - Recommendation: Start conservative (single 200ms vibration for turn start), make configurable in settings

3. **Animation timing for "juice" feel**
   - What we know: 0.3s is standard for most UI transitions
   - What's unclear: Optimal timing for game feel (more juice vs faster gameplay)
   - Recommendation: Start with 0.3s for turn indicators, 0.2s for urgency pulses, adjust based on playtesting

## Sources

### Primary (HIGH confidence)
- [Vue.js Transition Component](https://vuejs.org/guide/built-ins/transition) - Official Vue 3 documentation
- [@vueuse/sound Documentation](https://sound.vueuse.org/) - Official library documentation
- [Tailwind CSS Animation Utilities](https://tailwindcss.com/docs/animation) - Official Tailwind docs
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Web standard
- [Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) - Web standard
- [prefers-reduced-motion - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) - Accessibility standard

### Secondary (MEDIUM confidence)
- [CSS GPU Animation: Doing It Right — Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/) - Performance best practices
- [The Vue 3 Transition Component 101 - Vue School](https://vueschool.io/articles/vuejs-tutorials/the-vue-3-transition-component-101/) - Tutorial from trusted Vue resource
- [ARIA Accessibility Best Practices](https://www.allaccessible.org/blog/implementing-aria-labels-for-web-accessibility) - Accessibility patterns
- [CSS GPU Acceleration Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/) - Performance guide
- [Game Feel / "Juice" in UI Design](https://www.bloodmooninteractive.com/articles/juice.html) - Game UX principles

### Tertiary (LOW confidence)
- Various WebSearch results about turn timer UI patterns - No single authoritative source found, patterns derived from multiple game UI examples
- Vibration API browser support details - MDN provides spec, but real-world mobile browser behavior varies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vue 3 Transition and Tailwind are already in project, @vueuse/sound is well-documented and maintained
- Architecture: HIGH - Patterns are from official Vue/Tailwind documentation and existing codebase conventions
- Pitfalls: HIGH - Performance pitfalls are well-documented in MDN and performance resources, tested patterns

**Research date:** 2026-02-08
**Valid until:** ~60 days (Vue/Tailwind/web standards are stable; @vueuse/sound is stable library)
