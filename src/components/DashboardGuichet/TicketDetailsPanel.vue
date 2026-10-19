<script setup>
defineProps({
	ticket: Object
});
</script>

<template>
<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">

<!-- En-tête Ticket -->
<div class="p-6 border-b border-gray-200">
<div class="flex justify-between items-start mb-4">
<h2 class="text-xl font-bold text-gray-800">Ticket en cours</h2>
<span class="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Appelé</span>
</div>

<p class="text-3xl font-bold text-green-600 mb-4">{{ ticket.id }}</p>

<div class="space-y-2 text-sm">
<p class="text-gray-500">Contribuable <span class="float-right font-medium text-gray-800">{{ ticket.name }}</span></p>
<p class="text-xs text-gray-400 text-right">(N° contribuable : {{ ticket.nif }})</p>
<p class="text-gray-500">Service <span class="float-right font-medium text-gray-800">{{ ticket.service }}</span></p>
<p class="text-gray-500">Heure d'arrivée <span class="float-right font-medium text-gray-800">{{ ticket.time }}</span></p>
<p class="text-gray-500">Statut 
<span class="float-right font-bold text-green-600 flex items-center gap-1">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
APPELE
</span>
</p>
</div>
</div>

<!-- Détails du dossier -->
<div class="p-6 border-b border-gray-200 flex-1">
<div class="flex items-center gap-2 mb-4 text-gray-700 font-medium">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
Dossier lié
<button class="ml-auto text-blue-600 hover:underline text-sm">Consulter le dossier</button>
</div>

<div class="space-y-3 text-sm">
<p class="text-gray-500">N° dossier <span class="float-right font-medium text-gray-800">{{ ticket.dossierNumber }}</span></p>
<p class="text-gray-500">Type <span class="float-right font-medium text-gray-800">{{ ticket.dossierType }}</span></p>
<p class="text-gray-500">Statut dossier 
<span class="float-right bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">A TRAITER</span>
</p>
<p class="text-gray-500">Date de dépôt <span class="float-right font-medium text-gray-800">{{ ticket.depositDate }}</span></p>
<p class="text-gray-500">Pièces jointes <span class="float-right font-medium text-gray-800">{{ ticket.pieces }}</span></p>
</div>
</div>

<!-- Boutons du panneau -->
<div class="p-6 space-y-3">
<button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition font-medium">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
Voir le profil contribuable
</button>
<button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition font-medium">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
Ouvrir le dossier
</button>
</div>
</div>
</template>
