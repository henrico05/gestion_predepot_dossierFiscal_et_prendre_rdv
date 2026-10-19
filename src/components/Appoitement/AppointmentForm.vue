<script setup>
import { ref, computed } from 'vue';
import { fiscalServices } from '../../data/services.js';
import TimeSlotPicker from './TimeSlotPicker.vue';

const selectedService = ref('');
const selectedDate = ref(20); // Simulé pour correspondre à l'image (20 Mai)
const selectedTime = ref('09:00');

// Simulation des jours disponibles (bleu clair)
const availableDates = [22];

// Calendrier simplifié (Mai 2025)
const days = [
	{ date: 28, disabled: true }, { date: 29, disabled: true }, { date: 30, disabled: true }, 
{ date: 1, disabled: true }, { date: 2, disabled: true }, { date: 3, disabled: true }, { date: 4, disabled: true },
{ date: 5, disabled: false }, { date: 6, disabled: false }, { date: 7, disabled: false }, 
{ date: 8, disabled: false }, { date: 9, disabled: false }, { date: 10, disabled: false }, { date: 11, disabled: false },
{ date: 12, disabled: false }, { date: 13, disabled: false }, { date: 14, disabled: false }, 
{ date: 15, disabled: false }, { date: 16, disabled: false }, { date: 17, disabled: false }, { date: 18, disabled: false },
{ date: 19, disabled: false }, { date: 20, disabled: false, selected: true }, 
{ date: 21, disabled: false }, { date: 22, disabled: false, available: true }, { date: 23, disabled: false }, { date: 24, disabled: false }, { date: 25, disabled: false },
{ date: 26, disabled: false }, { date: 27, disabled: false }, { date: 28, disabled: false }, 
{ date: 29, disabled: false }, { date: 30, disabled: false }, { date: 31, disabled: false }, { date: 1, disabled: true }
];

// Émettre les données vers le parent pour le résumé
const emit = defineEmits(['update:form-data']);

const updateSummary = () => {
	emit('update:form-data', {
		service: selectedService.value,
	  date: `20 Mai 2025`, // Ici, vous devriez générer dynamiquement la date
	  time: selectedTime.value,
	  duration: '30 min'
	});
};

// Watch pour émettre dès qu'un champ change
import { watch } from 'vue';
watch([selectedService, selectedDate, selectedTime], updateSummary, { immediate: true });

</script>

<template>
<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

<!-- Étape 1 : Type de service -->
<div class="mb-8">
<div class="flex items-center gap-3 mb-4">
<div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
</div>
<h2 class="text-xl font-bold text-gray-800">Type de service fiscal</h2>
</div>

<div class="relative">
<select 
v-model="selectedService"
class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
>
<option value="" disabled>Sélectionnez un service...</option>
<option v-for="service in fiscalServices" :key="service" :value="service">{{ service }}</option>
</select>
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
</div>
<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
</div>
</div>
<p class="text-xs text-gray-500 mt-2">Choisissez le service pour lequel vous souhaitez un rendez-vous.</p>
</div>

<!-- Étape 2 : Date du rendez-vous -->
<div class="mb-8">
<div class="flex items-center gap-3 mb-4">
<div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
</div>
<h2 class="text-xl font-bold text-gray-800">Date du rendez-vous</h2>
</div>

<div class="border border-gray-300 rounded-lg p-4">
<!-- En-tête du calendrier -->
<div class="flex justify-between items-center mb-4">
<button class="text-gray-500 hover:text-gray-800">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
</button>
<p class="font-bold text-gray-800">Mai 2025</p>
<button class="text-gray-500 hover:text-gray-800">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
</button>
</div>

<!-- Jours de la semaine -->
<div class="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">
<span v-for="day in ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']" :key="day">{{ day }}</span>
</div>

<!-- Grille des jours -->
<div class="grid grid-cols-7 gap-y-2">
<div v-for="(day, index) in days" :key="index" class="flex justify-center">
<button 
:disabled="day.disabled"
:class="['w-9 h-9 rounded-full text-sm font-medium flex items-center justify-center transition',
day.disabled ? 'text-gray-300' : 
day.selected ? 'bg-blue-600 text-white' : 
day.available ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100']"
>
{{ day.date }}
</button>
</div>
</div>
</div>
<p class="text-xs text-gray-500 mt-2">Les dates disponibles sont indiquées en bleu.</p>
</div>

<!-- Étape 3 : Créneau horaire -->
<div class="mb-2">
<div class="flex items-center gap-3 mb-4">
<div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
</div>
<h2 class="text-xl font-bold text-gray-800">Créneau horaire</h2>
</div>

<p class="text-sm text-gray-600 mb-4">Sélectionnez un créneau disponible pour votre rendez-vous.</p>

<TimeSlotPicker :selected-time="selectedTime" @select-time="selectedTime = $event" />

<div class="flex items-start gap-2 mt-4 text-xs text-gray-500">
<svg class="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
<p>Les créneaux sont affichés selon le fuseau horaire de Madagascar (GMT+3).</p>
</div>
</div>
</div>
</template>
