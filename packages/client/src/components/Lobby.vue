<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const roomCode = route.params.code as string;
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">Room {{ roomCode }}</h1>
      <p class="text-gray-600">Lobby component - to be implemented in next plan</p>
    </div>
  </div>
</template>
