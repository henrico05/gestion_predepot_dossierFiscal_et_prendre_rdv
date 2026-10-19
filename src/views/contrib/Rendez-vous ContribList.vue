<script setup>
import { ref } from 'vue';
import AppNavbar from '../components/Appoitement/AppNavbar.vue';
import StepperIndicator from '../components/Appoitement/StepperIndicator.vue';
import AppointmentForm from '../components/Appoitement/AppointmentForm.vue';
import AppointmentSummary from '../components/Appoitement/AppointmentSummary.vue';

// État centralisé du formulaire
const formData = ref({
	service: '',
	date: '',
	time: '',
	duration: ''
});

const handleFormUpdate = (data) => {
	formData.value = data;
};
</script>

<template>
<div class="min-h-screen bg-gray-50">
<AppNavbar />

<main class="max-w-7xl mx-auto px-6 py-8">

<!-- Titre de la page -->
<div class="mb-2">
<h1 class="text-3xl font-bold text-gray-900">Prendre un rendez-vous fiscal</h1>
<p class="text-gray-500 mt-1">Réservez facilement votre rendez-vous en quelques étapes.</p>
</div>

<!-- Étapes 1-2-3 -->
<StepperIndicator />

<!-- Layout 2 colonnes -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

<!-- Colonne Gauche (2/3) : Formulaire -->
<div class="lg:col-span-2">
<AppointmentForm @update:form-data="handleFormUpdate" />
</div>

<!-- Colonne Droite (1/3) : Récapitulatif -->
<div class="lg:col-span-1">
<AppointmentSummary :form-data="formData" />
</div>

</div>
</main>
</div>
</template>
