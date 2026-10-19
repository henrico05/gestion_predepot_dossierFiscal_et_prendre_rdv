<script setup>
defineProps({
	documents: Array
});

const getStatusStyles = (status) => {
	if (status === 'DEPOSE') return 'bg-green-100 text-green-700 border-green-200';
	if (status === 'EN_ATTENTE') return 'bg-blue-100 text-blue-700 border-blue-200';
	return 'bg-red-50 text-red-600 border-red-200'; // MANQUANT par défaut
};
</script>

<template>
<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
<div class="p-6 border-b border-gray-200">
<h2 class="text-xl font-bold text-gray-800">Pièces justificatives requises</h2>
<p class="text-sm text-gray-500 mt-1">Veuillez fournir les documents suivants pour compléter votre dossier.</p>
</div>

<div class="divide-y divide-gray-100">
<div v-for="doc in documents" :key="doc.id" class="flex items-center p-4 hover:bg-gray-50 transition">

<!-- Icône Document -->
<div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
</div>

<!-- Nom et Description -->
<div class="flex-1 min-w-0">
<p class="font-medium text-gray-800">{{ doc.nom }}</p>
<p class="text-sm text-gray-500">{{ doc.description }}</p>
</div>

<!-- Statut -->
<div :class="['flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border', getStatusStyles(doc.statut)]">
<svg v-if="doc.statut === 'DEPOSE'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
{{ doc.statut === 'DEPOSE' ? 'Déposé' : 'Manquant' }}
</div>
</div>
</div>
</div>
</template>
