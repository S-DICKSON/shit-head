<script setup lang="ts">
import { useSoundEffects } from '../composables/useSoundEffects';
const { muteState, toggleMute } = useSoundEffects();
</script>

<template>
  <button
    class="fixed top-2 right-12 z-40 px-3 py-2 text-lg bg-gray-800/70 hover:bg-gray-800/90 rounded-full backdrop-blur-sm transition-all"
    :title="muteState ? 'Unmute sounds' : 'Mute sounds'"
    :aria-label="muteState ? 'Unmute sounds' : 'Mute sounds'"
    @click="toggleMute"
  >
    <span
      v-if="muteState"
      aria-hidden="true"
    >&#128263;</span>
    <span
      v-else
      aria-hidden="true"
    >&#128266;</span>
  </button>
</template>
