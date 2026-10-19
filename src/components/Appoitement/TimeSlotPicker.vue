<script setup>
import { ref } from 'vue';

const props = defineProps({
	selectedTime: String
});
const emit = defineEmits(['select-time']);

const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
</script>

<template>
<div class="grid grid-cols-3 lg:grid-cols-6 gap-3">
<button 
v-for="slot in slots" 
:key="slot"
@click="emit('select-time', slot)"
:class="['py-3 rounded-lg border text-sm font-semibold transition-all',
props.selectedTime === slot 
? 'bg-blue-600 text-white border-blue-600 shadow-md' 
: 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600']"
>
{{ slot }}
</button>
</div>
</template>
