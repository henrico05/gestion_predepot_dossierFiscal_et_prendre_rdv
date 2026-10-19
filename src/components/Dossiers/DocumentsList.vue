<script setup>
import { documents } from '../../data/dossierData.js';

const getStatusClass = (status) => {
	if (status === 'CONFORME') return 'bg-green-100 text-green-700';
	if (status === 'NON_CONFORME') return 'bg-red-100 text-red-700';
	return 'bg-orange-100 text-orange-700'; // EN_ATTENTE
};

// Icônes SVG par type de fichier
const fileIcons = {
	id: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5l-2-2H8l-2 2z', // user
	pdf: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z', // file
	xl: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', // chart
	eur: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', // currency
	bank: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z', // bank
	home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', // home
	contract: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' // doc
};
</script>

<template>
<div class="bg-white rounded-lg shadow-sm border border-gray-200">
<div class="p-6 border-b border-gray-200 flex justify-between items-center">
<h2 class="font-bold text-gray-800 flex items-center gap-2">
<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Pièces déposées
</h2>
<button class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
Tout télécharger
</button>
</div>

<div class="p-2 text-sm text-gray-500 bg-gray-50 border-b border-gray-200">
<span class="font-medium text-gray-700">7 pièces</span> • 5 conformes • 1 non conforme • 1 en attente
</div>

<div class="divide-y divide-gray-100">
<div v-for="doc in documents" :key="doc.id" class="flex items-center p-4 hover:bg-gray-50 transition">

<div class="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-4 text-gray-500">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="fileIcons[doc.type]"></path></svg>
</div>

<div class="flex-1 min-w-0">
<p class="font-medium text-gray-800 truncate">{{ doc.nom }}</p>
<p class="text-xs text-gray-500 mt-1">{{ doc.fichier }} • {{ doc.taille }} • {{ doc.date }}</p>
</div>

<div class="flex items-center gap-4 flex-shrink-0 ml-4">
<span :class="['px-3 py-1 rounded-full text-xs font-semibold', getStatusClass(doc.statut)]">
{{ doc.statut.replace('_', ' ') }}
</span>
<button class="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
Vérifier
</button>
</div>
</div>
</div>

<div class="p-6 bg-blue-50 border-t border-blue-100 text-sm text-gray-700 flex items-start gap-3">
<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
<p>Cliquez sur "Vérifier" pour ouvrir la prévisualisation et contrôler la pièce.</p>
</div>
</div>
</template>
