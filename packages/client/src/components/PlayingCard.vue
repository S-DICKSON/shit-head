<script setup lang="ts">
import { ref } from 'vue'

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

interface StandardCard {
  kind: 'standard'
  rank: string
  suit: Suit
}

interface JokerCard {
  kind: 'joker'
}

type Card = StandardCard | JokerCard

interface Props {
  card: Card
  selected?: boolean
  disabled?: boolean
  fanRotation?: number
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false,
  fanRotation: 0,
})

const emit = defineEmits<{
  click: []
}>()

// --- Tilt state ---
const sceneRef = ref<HTMLDivElement | null>(null)
const tiltX = ref(0)
const tiltY = ref(0)
const glareX = ref(50)
const glareY = ref(50)
const isHovered = ref(false)

function onMouseMove(e: MouseEvent) {
  if (props.disabled || !sceneRef.value) return
  const rect = sceneRef.value.getBoundingClientRect()
  const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
  const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)

  tiltX.value = -dy * 20
  tiltY.value = dx * 20
  glareX.value = ((e.clientX - rect.left) / rect.width) * 100
  glareY.value = ((e.clientY - rect.top) / rect.height) * 100
}

function onMouseEnter() {
  if (!props.disabled) isHovered.value = true
}

function onMouseLeave() {
  isHovered.value = false
  tiltX.value = 0
  tiltY.value = 0
  glareX.value = 50
  glareY.value = 50
}

// --- Card display helpers ---
const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const RED_SUITS: Suit[] = ['hearts', 'diamonds']

function suitColor(card: Card): string {
  if (card.kind !== 'standard') return 'text-purple-500'
  return RED_SUITS.includes(card.suit) ? 'text-red-500' : 'text-gray-900'
}

function rankLabel(card: Card): string {
  return card.kind === 'standard' ? card.rank : 'JKR'
}

function symbolLabel(card: Card): string {
  if (card.kind === 'joker') return '★'
  return SUIT_SYMBOLS[card.suit]
}
</script>

<template>
  <!--
    Scene div: owns the CSS perspective camera.
    The card (button) lives as a child in that 3-D space and gets rotated.
  -->
  <div
    ref="sceneRef"
    class="card-scene"
    :style="{
      transform: `rotate(${isHovered ? 0 : props.fanRotation}deg)`,
      transition: isHovered ? 'transform 0.15s ease' : 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
      transformOrigin: '50% 100%',
    }"
    @mousemove="onMouseMove"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="!disabled && emit('click')"
  >
    <button
      class="card-face"
      :class="{ selected, disabled }"
      :style="{
        transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${isHovered ? 1.15 : 1})${selected ? ' translateY(-10px)' : ''}`,
        transition: isHovered
          ? 'transform 0.05s linear'
          : 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
      }"
    >
      <!-- Glare overlay tracks cursor across the mesh surface -->
      <span
        class="glare"
        :style="{
          opacity: isHovered && !disabled ? 1 : 0,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.42) 0%, transparent 68%)`,
          transition: isHovered ? 'opacity 0.1s' : 'opacity 0.4s',
        }"
      />

      <!-- Top-left pip -->
      <span class="pip pip-tl">
        <span class="pip-rank">{{ rankLabel(card) }}</span>
        <span :class="['pip-suit', suitColor(card)]">{{ symbolLabel(card) }}</span>
      </span>

      <!-- Centre symbol -->
      <span :class="['centre-suit', suitColor(card)]">{{ symbolLabel(card) }}</span>

      <!-- Bottom-right pip (rotated 180°) -->
      <span class="pip pip-br">
        <span class="pip-rank">{{ rankLabel(card) }}</span>
        <span :class="['pip-suit', suitColor(card)]">{{ symbolLabel(card) }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
/* ─── Scene: the perspective camera ─────────────────────────── */
.card-scene {
  /* 500px is a comfortable focal length; go lower for more extreme warp */
  perspective: 500px;
  perspective-origin: 50% 50%;

  display: inline-block;
  width: 3.5rem;   /* w-14 */
  height: 5.25rem; /* ~h-21 */
  cursor: pointer;

  /* Allow the scaled card to overflow its fixed footprint */
  overflow: visible;
  /* Lift above siblings when hovered so the grown card isn't obscured */
  position: relative;
  z-index: 0;
}

.card-scene:hover {
  z-index: 10;
}

@media (min-width: 640px) {
  .card-scene {
    width: 4rem;  /* sm:w-16 */
    height: 6rem; /* sm:h-24 */
  }
}

/* ─── Card face: rotates inside the scene ────────────────────── */
.card-face {
  width: 100%;
  height: 100%;
  position: relative;

  background: #fff;
  color: #111;
  border-radius: 0.375rem;
  border: 2px solid #d1d5db;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  font-size: 0.75rem;
  user-select: none;
  outline: none;

  /* preserve-3d keeps children co-planar with the card mesh */
  transform-style: preserve-3d;
  will-change: transform;

  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.3s ease, border-color 0.2s ease;
}

@media (min-width: 640px) {
  .card-face { font-size: 0.875rem; }
}

.card-face:not(.disabled):hover {
  border-color: #9ca3af;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
}

/* Selected ring */
.card-face.selected {
  border-color: #facc15;
  box-shadow:
    0 0 0 2px #facc15,
    0 8px 20px rgba(250, 204, 21, 0.35);
}

/* Disabled */
.card-face.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* ─── Glare ──────────────────────────────────────────────────── */
.glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
}

/* ─── Corner pips ────────────────────────────────────────────── */
.pip {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  gap: 1px;
}

.pip-tl { top: 4px; left: 5px; }
.pip-br { bottom: 4px; right: 5px; transform: rotate(180deg); }

.pip-rank {
  font-weight: 700;
  font-size: 0.65rem;
}

.pip-suit { font-size: 0.55rem; }

@media (min-width: 640px) {
  .pip-rank { font-size: 0.7rem; }
  .pip-suit { font-size: 0.6rem; }
}

/* ─── Centre symbol ──────────────────────────────────────────── */
.centre-suit {
  font-size: 1.1rem;
  line-height: 1;
}

@media (min-width: 640px) {
  .centre-suit { font-size: 1.25rem; }
}
</style>