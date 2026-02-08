<template>
  <div class="flex flex-col items-center">
    <div class="relative">
      <!-- Card back when cards remain -->
      <div
        v-if="count > 0"
        class="w-14 h-21 sm:w-16 sm:h-24 bg-blue-800 rounded border-2 border-blue-600 flex items-center justify-center shadow-md"
      >
        <!-- Card back pattern -->
        <div class="w-10 h-16 sm:w-12 sm:h-18 border border-blue-400 rounded-sm" />

        <!-- Count badge -->
        <span
          class="absolute -top-2 -right-2 bg-blue-700 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
        >
          {{ count }}
        </span>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="w-14 h-21 sm:w-16 sm:h-24 border-2 border-dashed border-green-600 rounded flex items-center justify-center text-green-500 text-xs"
      >
        Empty
      </div>
    </div>

    <!-- Label -->
    <div class="text-center text-xs text-green-300 mt-1">
      Draw
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  count: number;
}

defineProps<Props>();
</script>
