<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  code: string;
}>();

const copyButtonText = ref('Copy');
const shareLinkButtonText = ref('Copy Link');

// Generate shareable URL
const shareUrl = `${window.location.origin}/#/room/${props.code}`;

// Copy code to clipboard
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copyButtonText.value = 'Copied!';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy code:', err);
  }
};

// Copy share link to clipboard
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl);
    shareLinkButtonText.value = 'Copied!';
    setTimeout(() => {
      shareLinkButtonText.value = 'Copy Link';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy link:', err);
  }
};
</script>

<template>
  <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
    <!-- Room Code Section -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-600 mb-2">Room Code</label>
      <div class="flex items-center gap-3">
        <div class="flex-1 font-mono text-3xl md:text-4xl font-bold text-gray-900 tracking-widest text-center py-2">
          {{ code }}
        </div>
        <button
          class="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors whitespace-nowrap"
          @click="copyCode"
        >
          {{ copyButtonText }}
        </button>
      </div>
    </div>

    <!-- Share Link Section -->
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-2">Share Link</label>
      <div class="flex items-center gap-3">
        <div class="flex-1 text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 truncate font-mono">
          {{ shareUrl }}
        </div>
        <button
          class="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors whitespace-nowrap"
          @click="copyShareLink"
        >
          {{ shareLinkButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>
