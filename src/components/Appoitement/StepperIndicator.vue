<script setup>
// Les étapes sont statiques pour cette vue
const steps = ['Service', 'Date', 'Créneau'];
</script>

<template>
<div class="flex items-center gap-4 mt-6 mb-10">
<div v-for="(step, index) in steps" :key="step" class="flex items-center gap-4">
<div 
:class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600']"
>
{{ index + 1 }}
</div>
<!-- Ligne de connexion -->
<div v-if="index < steps.length - 1" class="w-16 h-1 bg-gray-300 rounded"></div>
</div>
</div>
</template>
