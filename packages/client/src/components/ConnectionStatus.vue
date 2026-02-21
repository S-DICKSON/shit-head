<script setup lang="ts">
import { computed } from 'vue';
import { useGameSocket } from '../composables/useGameSocket';

const { connectionState, connectionError, retryConnection } = useGameSocket();

const showOverlay = computed(() =>
  connectionState.value === 'reconnecting' || connectionState.value === 'failed'
);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="showOverlay"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
    >
      <!-- Reconnecting state -->
      <div
        v-if="connectionState === 'reconnecting'"
        class="bg-gray-800 rounded-xl p-8 text-center shadow-2xl max-w-sm mx-4"
      >
        <div class="flex justify-center mb-4">
          <div class="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 class="text-xl font-bold text-white mb-2">
          Reconnecting...
        </h2>
        <p class="text-gray-300 text-sm">
          Connection lost. Attempting to reconnect.
        </p>
      </div>

      <!-- Failed state -->
      <div
        v-if="connectionState === 'failed'"
        class="bg-gray-800 rounded-xl p-8 text-center shadow-2xl max-w-sm mx-4"
      >
        <div class="flex justify-center mb-4">
          <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <span class="text-red-400 text-2xl font-bold">!</span>
          </div>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">
          Connection Failed
        </h2>
        <p class="text-gray-300 text-sm mb-6">
          {{ connectionError?.message || 'Unable to connect to server.' }}
        </p>
        <button
          class="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors"
          @click="retryConnection()"
        >
          Retry Connection
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
