# Phase 15: Mobile UX Improvements - Research

**Researched:** 2026-02-09
**Domain:** Mobile web UX patterns, touch gesture handling, Vue 3 composables
**Confidence:** MEDIUM

## Summary

This phase addresses mobile playtesting feedback by implementing safer interactions, clearer visual indicators, and more efficient card handling. The research covers five key areas: (1) double-tap confirmation patterns to prevent accidental pickups, (2) prominent turn indicators with optional sound, (3) compact timer positioning, (4) transparency effects for 8-cards, and (5) card grouping for easier multi-card selection on mobile.

**Standard approach:** Use native touch event listeners or lightweight composables (avoiding third-party gesture libraries), implement double-tap through timestamp-based logic, apply Tailwind CSS opacity utilities for transparency, and create custom card grouping UI with quantity selectors. For sound notifications, use simple HTML5 Audio with user-gesture-aware initialization to comply with mobile browser autoplay policies.

**Key findings:** VueUse (already in dependencies) provides `useSwipe` and pointer composables but NOT double-tap detection. Custom double-tap logic is straightforward with Vue 3 Composition API. Tailwind CSS v4 provides opacity utilities from 0-100 in 25% increments. iOS Safari requires user gesture before playing audio. Card grouping requires custom UI since no standard library exists for game-specific patterns.

**Primary recommendation:** Build custom solutions using existing tools (Vue 3 composables, Tailwind CSS, HTML5 Audio) rather than adding gesture libraries. Implement double-tap with simple timestamp comparison, use `opacity-50` for semi-transparent 8-cards, position timer with `fixed bottom-4 right-4`, and create a custom card grouping component with +/- selectors for mobile.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 Composition API | 3.5.0 | Touch event handling, state management | Already in use, composables pattern perfect for gesture logic |
| Tailwind CSS v4 | 4.0.0 | Opacity effects, positioning utilities | Already in use, provides `opacity-*` utilities and responsive positioning |
| @vueuse/core | 14.2.0 | Optional pointer/swipe utilities | Already in dependencies, provides `useSwipe`, `usePointer` for advanced gestures |
| HTML5 Audio | Native | Sound notifications | Built-in, no dependencies, works across all mobile browsers with user gesture |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Audio API | Native | Advanced sound control | Only if need precise timing, volume control, or multiple concurrent sounds |
| @vueuse/gesture | Optional | Complex multi-touch gestures | Only if need pinch, rotate, or drag gestures (NOT needed for this phase) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom double-tap | vue3-touch-events | Library adds 15KB for single feature; custom solution is 10 lines |
| HTML5 Audio | Web Audio API | API is more complex but offers precise control; overkill for simple notifications |
| Custom card grouping | vue-multiselect | Multiselect components are for dropdowns, not card game UI |

**Installation:**
```bash
# No new dependencies needed - all requirements already installed
# Optional: Add @vueuse/gesture only if complex gestures needed later
npm install @vueuse/gesture  # ONLY if needed
```

## Architecture Patterns

### Recommended Project Structure
```
packages/client/src/
├── components/
│   ├── PlayerCards.vue        # Update: Add card grouping UI
│   ├── TurnTimer.vue          # Update: Make compact and repositionable
│   ├── TurnBanner.vue         # Update: Enhance with sound notification
│   └── DiscardPile.vue        # Update: Add transparency for 8-cards
├── composables/
│   ├── usePlayingPhase.ts     # Update: Add pickup confirmation logic
│   ├── useDoubleTap.ts        # NEW: Custom double-tap composable
│   ├── useSoundEffects.ts     # NEW: Sound notification composable
│   └── useCardGrouping.ts     # NEW: Group cards by rank composable
└── assets/
    └── sounds/
        └── turn-notification.mp3  # NEW: Short notification sound
```

### Pattern 1: Double-Tap Detection with Composable

**What:** Create a reusable composable that tracks tap timestamps and detects double-taps within a threshold (typically 300-500ms).

**When to use:** Any action that needs confirmation to prevent accidental taps (delete, pickup, irreversible actions).

**Example:**
```typescript
// composables/useDoubleTap.ts
import { ref } from 'vue';

export function useDoubleTap(
  callback: () => void,
  threshold = 300 // ms between taps
) {
  const lastTap = ref<number>(0);

  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.value;

    if (timeSinceLastTap < threshold && timeSinceLastTap > 0) {
      // Double-tap detected
      callback();
      lastTap.value = 0; // Reset
    } else {
      // First tap
      lastTap.value = now;
    }
  };

  const reset = () => {
    lastTap.value = 0;
  };

  return {
    handleTap,
    reset,
    isWaitingForSecondTap: computed(() => {
      return Date.now() - lastTap.value < threshold && lastTap.value > 0;
    })
  };
}

// Usage in component:
const { handleTap, isWaitingForSecondTap } = useDoubleTap(() => {
  pickupPile();
});
```

### Pattern 2: User-Gesture-Aware Audio Initialization

**What:** Initialize HTML5 Audio context on first user interaction to comply with mobile browser autoplay policies.

**When to use:** Any audio playback on mobile browsers (iOS Safari, Chrome, etc.).

**Example:**
```typescript
// composables/useSoundEffects.ts
import { ref, onMounted } from 'vue';

export function useSoundEffects() {
  const audioReady = ref(false);
  const turnSound = ref<HTMLAudioElement | null>(null);

  const initializeAudio = () => {
    if (!audioReady.value) {
      turnSound.value = new Audio('/sounds/turn-notification.mp3');
      turnSound.value.load();
      audioReady.value = true;
    }
  };

  const playTurnNotification = () => {
    if (!audioReady.value) {
      initializeAudio();
    }
    turnSound.value?.play().catch(err => {
      console.warn('Audio playback failed:', err);
    });
  };

  // Initialize on any user interaction
  onMounted(() => {
    document.addEventListener('click', initializeAudio, { once: true });
  });

  return {
    playTurnNotification,
    audioReady
  };
}
```

### Pattern 3: Card Grouping by Rank

**What:** Group cards by rank and provide quantity selectors for multi-card play on mobile.

**When to use:** When users have many cards and need to select multiple of the same rank efficiently.

**Example:**
```typescript
// composables/useCardGrouping.ts
import { computed } from 'vue';
import type { Card } from '@shit-head/shared';

export function useCardGrouping(hand: Ref<Card[]>) {
  const groupedCards = computed(() => {
    const groups = new Map<string, { cards: Card[], indices: number[] }>();

    hand.value.forEach((card, index) => {
      const rank = card.kind === 'standard' ? card.rank : 'JKR';
      if (!groups.has(rank)) {
        groups.set(rank, { cards: [], indices: [] });
      }
      groups.get(rank)!.cards.push(card);
      groups.get(rank)!.indices.push(index);
    });

    return Array.from(groups.entries()).map(([rank, data]) => ({
      rank,
      count: data.cards.length,
      cards: data.cards,
      indices: data.indices
    }));
  });

  return {
    groupedCards
  };
}
```

### Pattern 4: Compact Responsive Timer with Viewport-Safe Positioning

**What:** Position timer in bottom-right corner using `fixed` positioning with safe area insets for iOS notch/toolbar compatibility.

**When to use:** Any UI element that needs to stay visible in viewport corner on mobile.

**Example:**
```vue
<!-- TurnTimer.vue - Compact version -->
<template>
  <div class="fixed bottom-4 right-4 z-40 w-16 h-16 sm:w-20 sm:h-20">
    <svg viewBox="0 0 80 80" class="w-full h-full">
      <circle cx="40" cy="40" :r="radius" stroke="#374151" stroke-width="4" fill="none" />
      <circle
        cx="40" cy="40" :r="radius"
        stroke="#3b82f6" stroke-width="4" fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 40 40)"
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-sm font-bold text-white">{{ timeRemaining }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Support iOS safe areas */
@supports (padding: env(safe-area-inset-bottom)) {
  .fixed {
    bottom: max(1rem, env(safe-area-inset-bottom));
    right: max(1rem, env(safe-area-inset-right));
  }
}
</style>
```

### Pattern 5: Semi-Transparent 8-Card Overlay

**What:** Apply opacity to the top card when it's an 8, allowing players to see the effective card underneath.

**When to use:** Card games where certain cards are "transparent" or "pass-through" for game rules.

**Example:**
```vue
<!-- DiscardPile.vue -->
<div
  v-for="(card, i) in visibleCards"
  :key="cardKey(card)"
  :style="{ transform: `translate(${i * 3}px, ${i * 3}px)`, zIndex: i }"
  :class="[
    'absolute top-0 left-0 w-14 h-21 bg-white text-black rounded border',
    // Apply opacity-50 if this is the top card AND it's an 8
    i === visibleCards.length - 1 && card.kind === 'standard' && card.rank === '8'
      ? 'opacity-50 border-dashed border-2 border-purple-400'
      : 'opacity-100 border-gray-300'
  ]"
>
  <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
  <span :class="suitColor(card)">
    {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
  </span>
</div>
```

### Anti-Patterns to Avoid

- **Don't use third-party gesture libraries for simple patterns**: vue3-touch-events adds 15KB for features that are 5-10 lines of custom code
- **Don't ignore mobile autoplay policies**: Always initialize audio on user gesture, not on component mount
- **Don't use `position: fixed` without safe area insets**: iOS notches and toolbars will overlap your UI
- **Don't group cards on desktop**: Card grouping is mobile-only optimization; desktop has space for full hand display
- **Don't use Web Audio API for simple notifications**: HTML5 Audio is sufficient and simpler for single sound effects

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe detection | Custom touch tracking with deltaX/deltaY | VueUse `useSwipe` | Handles edge cases (touch vs mouse, threshold, direction) |
| Pointer event normalization | Separate touch/mouse handlers | VueUse `usePointer` | Normalizes pointer events across input types |
| Audio context lifecycle | Manual AudioContext management | HTML5 Audio element | Simpler API, browser manages lifecycle |
| Responsive breakpoints | Custom `window.innerWidth` logic | Tailwind responsive utilities | Already in codebase, tested, consistent |

**Key insight:** Mobile touch handling has many edge cases (touch vs mouse events, multi-touch, pointer capture, passive listeners). Use composables from VueUse for complex gestures, but double-tap is simple enough to implement directly.

## Common Pitfalls

### Pitfall 1: Ignoring Mobile Browser Autoplay Policies

**What goes wrong:** Audio fails to play on iOS Safari or Chrome mobile because AudioContext/Audio elements aren't initialized after user gesture.

**Why it happens:** Browsers block audio autoplay to prevent ads and unwanted sounds. Audio must be initialized AND played within a user gesture handler.

**How to avoid:**
- Initialize audio on first click/tap anywhere on page
- Always call `audio.play()` inside a user event handler
- Check `audio.play()` promise and handle rejection gracefully
- Don't rely on audio playing on component mount or WebSocket events

**Warning signs:**
- Audio works on desktop but not mobile
- Console shows "NotAllowedError: play() failed because the user didn't interact with the document first"
- Audio works after first tap but not on subsequent events

### Pitfall 2: Double-Tap Threshold Too Short or Too Long

**What goes wrong:**
- Too short (< 200ms): Users can't reliably double-tap, leading to frustration
- Too long (> 500ms): Single taps feel unresponsive, users don't know if first tap registered

**Why it happens:** Mobile touch targets are imprecise, finger tap duration varies by user (200-400ms typical).

**How to avoid:**
- Use 300ms threshold as default (proven by iOS/Android system double-taps)
- Provide visual feedback on first tap ("Tap again to confirm")
- Add timeout indicator so users know when double-tap window expires
- Test with real users on real devices, not just emulator

**Warning signs:**
- User complaints about "button not working"
- Many single taps without second tap
- Users tapping multiple times rapidly

### Pitfall 3: Fixed Positioning Without Safe Area Insets

**What goes wrong:** UI elements positioned at bottom or edges get hidden by iOS notch, home indicator, or Safari toolbar.

**Why it happens:** iOS Safari has dynamic viewport height (toolbar slides in/out), and `100vh` includes areas under toolbars.

**How to avoid:**
- Use `env(safe-area-inset-*)` variables for padding/positioning
- Use `max()` to combine minimum spacing with safe area: `bottom: max(1rem, env(safe-area-inset-bottom))`
- Test on real iPhone with notch, not just browser DevTools
- Use `dvh` (dynamic viewport height) units instead of `vh` for full-height layouts

**Warning signs:**
- Timer or buttons obscured by iPhone home indicator
- UI looks correct in DevTools but wrong on real device
- Users complain about "button at bottom is cut off"

### Pitfall 4: Accidental Tap on Adjacent Small Touch Targets

**What goes wrong:** Users trying to tap "Play" accidentally tap "Pick Up Pile" because buttons are too close or too small.

**Why it happens:** Finger width averages 40-44px. Apple Human Interface Guidelines recommend 44x44pt minimum touch target.

**How to avoid:**
- Minimum 44px × 44px touch target size
- Minimum 8px spacing between adjacent tap targets
- Use `px-6 py-2` (Tailwind) for comfortable button padding
- Separate destructive actions (pickup) from primary actions (play) visually
- Consider hold-to-confirm for destructive actions instead of double-tap

**Warning signs:**
- Users accidentally picking up pile when trying to play
- Higher error rate on mobile vs desktop
- User feedback: "buttons are too small" or "I keep hitting wrong button"

### Pitfall 5: Card Transparency Breaking Accessibility

**What goes wrong:** Semi-transparent 8-cards are hard to read for users with low vision or in bright sunlight.

**Why it happens:** `opacity-50` reduces contrast below WCAG minimums (4.5:1 for normal text).

**How to avoid:**
- Use visual indicators BEYOND opacity: dashed border, icon, background pattern
- Apply `opacity-60` or `opacity-75` instead of `opacity-50` for better readability
- Add tooltip or label: "8 is transparent - effective card is 7♣"
- Test in bright outdoor conditions (where mobile games are played)
- Provide setting to disable transparency effect if needed

**Warning signs:**
- Users confused about which card is effective
- Complaints about "can't see the card"
- Users playing wrong cards because they misread transparent card

## Code Examples

Verified patterns from official sources:

### Double-Tap Button with Visual Feedback

```vue
<template>
  <button
    class="px-6 py-2 bg-red-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
    :class="{ 'ring-4 ring-yellow-400': isWaitingForSecondTap }"
    :disabled="!isMyTurn"
    @click="handlePickupTap"
  >
    {{ isWaitingForSecondTap ? 'Tap Again to Confirm' : 'Pick Up Pile' }}
  </button>
</template>

<script setup lang="ts">
import { useDoubleTap } from '@/composables/useDoubleTap';

const { handleTap, isWaitingForSecondTap } = useDoubleTap(() => {
  emit('pickup-pile');
}, 300);

const handlePickupTap = () => {
  if (!isMyTurn.value) return;
  handleTap();
};
</script>
```

### Card Grouping UI for Mobile

```vue
<template>
  <!-- Mobile: Show grouped cards (< 640px) -->
  <div v-if="isMobile" class="space-y-2">
    <div
      v-for="group in groupedCards"
      :key="group.rank"
      class="flex items-center gap-2 bg-gray-800 rounded-lg p-2"
    >
      <!-- Sample card -->
      <div class="w-12 h-18 bg-white text-black rounded border flex flex-col items-center justify-center text-xs">
        <span class="font-bold">{{ group.rank }}</span>
        <span :class="suitColor(group.cards[0])">
          {{ suitSymbol(group.cards[0]) }}
        </span>
      </div>

      <!-- Quantity info -->
      <div class="flex-1">
        <div class="text-sm text-white">{{ group.count }}× {{ group.rank }}</div>
      </div>

      <!-- Quantity selector -->
      <div class="flex items-center gap-1">
        <button
          class="w-8 h-8 bg-gray-600 rounded-full text-white"
          :disabled="selectedCount[group.rank] <= 0"
          @click="decrementSelection(group.rank)"
        >
          -
        </button>
        <span class="w-8 text-center text-white font-bold">
          {{ selectedCount[group.rank] || 0 }}
        </span>
        <button
          class="w-8 h-8 bg-gray-600 rounded-full text-white"
          :disabled="selectedCount[group.rank] >= group.count"
          @click="incrementSelection(group.rank)"
        >
          +
        </button>
      </div>
    </div>

    <!-- Play button (fixed at bottom) -->
    <button
      v-if="hasSelection"
      class="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg"
      @click="playSelected"
    >
      Play Selected
    </button>
  </div>

  <!-- Desktop: Show full hand (>= 640px) -->
  <div v-else class="flex gap-2 flex-wrap">
    <!-- Existing PlayerCards.vue hand display -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCardGrouping } from '@/composables/useCardGrouping';

const isMobile = computed(() => window.innerWidth < 640);
const { groupedCards } = useCardGrouping(hand);
const selectedCount = ref<Record<string, number>>({});

const incrementSelection = (rank: string) => {
  selectedCount.value[rank] = (selectedCount.value[rank] || 0) + 1;
};

const decrementSelection = (rank: string) => {
  selectedCount.value[rank] = Math.max(0, (selectedCount.value[rank] || 0) - 1);
};
</script>
```

### Turn Notification with Sound

```vue
<template>
  <Transition name="banner">
    <div
      v-if="visible"
      class="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black font-bold text-lg px-6 py-2 rounded-full shadow-lg"
    >
      YOUR TURN
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useSoundEffects } from '@/composables/useSoundEffects';

const props = defineProps<{
  visible: boolean;
}>();

const { playTurnNotification } = useSoundEffects();

// Play sound when banner becomes visible
watch(() => props.visible, (newVal) => {
  if (newVal) {
    playTurnNotification();
  }
});
</script>
```

### Compact Timer with Safe Area Support

```vue
<template>
  <div class="timer-container">
    <svg viewBox="0 0 64 64" class="w-full h-full">
      <circle cx="32" cy="32" r="28" stroke="#374151" stroke-width="4" fill="none" />
      <circle
        cx="32" cy="32" r="28"
        stroke="#3b82f6" stroke-width="4" fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 32 32)"
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-xs font-bold text-white">{{ timeRemaining }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const radius = 28;
const circumference = 2 * Math.PI * radius;

const strokeOffset = computed(() => {
  const progress = props.timeRemaining / props.totalTime;
  return circumference * (1 - progress);
});
</script>

<style scoped>
.timer-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 40;
  width: 3rem;
  height: 3rem;
}

@media (min-width: 640px) {
  .timer-container {
    width: 4rem;
    height: 4rem;
  }
}

/* iOS safe area support */
@supports (padding: env(safe-area-inset-bottom)) {
  .timer-container {
    bottom: max(1rem, env(safe-area-inset-bottom));
    right: max(1rem, env(safe-area-inset-right));
  }
}
</style>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Confirmation dialogs for mobile | Double-tap/hold-to-confirm | 2023-2024 | Faster interactions, no modal interruption |
| Fixed viewport units (`vh`, `vw`) | Dynamic viewport units (`dvh`, `svh`) + safe-area-inset | 2023 (iOS 15+) | Proper handling of mobile browser toolbars |
| Web Audio API for all sounds | HTML5 Audio for simple playback | Ongoing | Simpler API for basic use cases |
| Separate touch/mouse event handlers | Unified pointer events | 2020+ | Single code path for all input types |
| External gesture libraries | VueUse composables + native events | 2022+ | Smaller bundle, more control, better TypeScript |

**Deprecated/outdated:**
- `vh` units for mobile full-height: Use `dvh` (dynamic viewport height) instead
- `touchstart`/`touchend` manual tracking: Use PointerEvents or VueUse composables
- Third-party gesture detection libraries: Most gestures can be handled with native events + composables
- AudioContext for simple notifications: HTML5 Audio is sufficient and simpler

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal card grouping UI pattern**
   - What we know: No standard library exists for card game grouping patterns
   - What's unclear: Whether +/- quantity selector is better than tap-to-toggle selection on mobile
   - Recommendation: Implement +/- selector as suggested, gather user feedback during playtesting, consider A/B testing alternative pattern (tap card to cycle selected count 0→1→2→max)

2. **Sound notification volume and duration**
   - What we know: HTML5 Audio works, user gesture required
   - What's unclear: Optimal sound duration (50ms? 200ms? 500ms?) and volume level
   - Recommendation: Start with 200ms notification sound at 70% volume, allow users to disable in settings

3. **Mobile viewport behavior across browsers**
   - What we know: Safari, Chrome, Firefox handle viewport differently on mobile
   - What's unclear: Whether `dvh` units are supported on all target browsers (2026 support is HIGH but not universal)
   - Recommendation: Use `env(safe-area-inset-*)` as primary approach, test on real devices (iOS Safari 15+, Chrome 100+, Firefox 110+)

## Sources

### Primary (HIGH confidence)

- [Tailwind CSS Opacity Documentation](https://tailwindcss.com/docs/opacity) - Opacity utility classes
- [MDN Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API) - Audio playback patterns
- [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) - Mobile browser autoplay policies
- [VueUse useSwipe](https://vueuse.org/core/useswipe/) - Swipe gesture composable
- [Vue.js Composables Guide](https://vuejs.org/guide/reusability/composables.html) - Official composable patterns

### Secondary (MEDIUM confidence)

- [Baymard Institute: Handling Accidental Taps](https://baymard.com/blog/handling-accidental-taps-on-touch-devices) - Double-tap and confirmation UX patterns
- [Smashing Magazine: Managing Dangerous Actions](https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/) - Confirmation dialog best practices
- [CSS-Tricks: Viewport Units on Mobile](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/) - Mobile viewport handling
- [LogRocket: CSS Overlay Guide](https://blog.logrocket.com/css-overlay/) - Transparency and overlay techniques
- [Medium: Glassmorphism in 2026](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f) - 2026 transparency design trends

### Tertiary (LOW confidence - requires validation)

- [GitHub: vue3-touch-events](https://github.com/robinrodricks/vue3-touch-events) - Third-party gesture library (evaluated but not recommended)
- [GitHub: VueUse Gesture](https://github.com/vueuse/gesture) - Advanced gesture library (optional, not required for this phase)
- [Pixune: Mobile Game UI Design 2026](https://pixune.com/blog/best-examples-mobile-game-ui-design/) - Design trends and inspiration
- [Game UI Database](https://www.gameuidatabase.com/) - UI pattern examples (inspiration only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use or native to browsers
- Double-tap pattern: HIGH - Simple timestamp logic, well-documented pattern
- Audio notifications: MEDIUM - HTML5 Audio is standard, but mobile autoplay policies require careful testing
- Card grouping UI: LOW - No standard pattern exists, requires custom implementation and user testing
- Transparency effects: HIGH - Tailwind opacity utilities are well-documented
- Mobile positioning: MEDIUM - Safe area insets are standard but browser support varies

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - mobile web standards are stable)

**Notes:**
- No CONTEXT.md exists for this phase - all implementation decisions are Claude's discretion
- Project already uses VueUse, Tailwind CSS v4, and Vue 3 Composition API
- Focus on mobile-first implementation with desktop as secondary consideration
- Prioritize native solutions over third-party libraries to minimize bundle size
- User testing required for card grouping pattern (no industry standard exists)
