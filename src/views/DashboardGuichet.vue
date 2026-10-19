<script setup>
import { ref } from 'vue';
import AppSidebar from '../components/Dashboard/AppSidebar.vue';
import QueueTable from '../components/Dashboard/QueueTable.vue';
import TicketDetailsPanel from '../components/Dashboard/TicketDetailsPanel.vue';
import { queueData, currentTicket } from '../data/queueData.js';

const tickets = ref(queueData);
const selectedTicket = ref(currentTicket);

// Fonction de sélection de ticket
const handleSelectTicket = (id) => {
	const found = tickets.value.find(t => t.id === id);
	if (found) {
		selectedTicket.value = { 
			...found, 
			nif: '1 78 05 024 567', // Données statiques pour la démo
			dossierNumber: 'DOS-2024-01782',
			dossierType: 'Déclaration de revenus 2023',
			depositDate: '12/05/2024',
			pieces: '2 pièces'
		};
	}
};
</script>

<template>
<div class="flex h-screen bg-gray-100 overflow-hidden font-sans">

<AppSidebar />

<main class="flex-1 flex flex-col overflow-hidden">

<!-- Barre supérieure -->
<header class="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
<div>
<h1 class="text-2xl font-bold text-gray-900">File d'attente en temps réel</h1>
<div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
<span class="w-2 h-2 rounded-full bg-green-500"></span>
Mise à jour automatique
</div>
</div>

<div class="flex items-center gap-4 text-sm text-gray-500">
<div class="flex items-center gap-2">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
Actualisé à 10:24:37
</div>
<button class="p-1 hover:bg-gray-100 rounded-full">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
</button>
</div>
</header>

<!-- Contenu principal -->
<div class="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">

<!-- Tableau (Colonne gauche) -->
<div class="col-span-8 h-full">
<QueueTable 
:tickets="tickets" 
:selected-ticket-id="selectedTicket.id"
@select-ticket="handleSelectTicket" 
/>
</div>

<!-- Panneau de droite -->
<div class="col-span-4 h-full">
<TicketDetailsPanel :ticket="selectedTicket" />
</div>

</div>

<!-- Barre d'actions (en bas) -->
<div class="p-6 bg-white border-t border-gray-200 grid grid-cols-12 gap-8">
<div class="col-span-8 flex gap-6">
<button class="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-md transition">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
Appeler le prochain
<span class="block text-xs font-normal opacity-80">Prochain ticket : T1525 - Petit, Jean</span>
</button>

<button class="px-8 border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
Mettre en pause la file
</button>
</div>
<div class="col-span-4"></div>
</div>

</main>
</div>
</template>
