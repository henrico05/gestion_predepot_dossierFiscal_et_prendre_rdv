<script setup>
defineProps({
	tickets: Array,
	selectedTicketId: String
});
const emit = defineEmits(['select-ticket']);
</script>

<template>
<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
<!-- En-tête du tableau -->
<div class="p-6 border-b border-gray-200 flex justify-between items-center">
<div class="flex items-center gap-3">
<h2 class="text-xl font-bold text-gray-800">File d'attente actuelle</h2>
<span class="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">{{ tickets.length + 5 }} personnes</span>
</div>
<div class="flex items-center gap-2">
<select class="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
<option>Tous les services</option>
<option>Paiement</option>
<option>Déclaration</option>
</select>
</div>
</div>

<!-- Tableau -->
<div class="overflow-x-auto flex-1">
<table class="w-full text-left text-sm">
<thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
<tr>
<th class="px-6 py-3 font-medium">Numéro ticket</th>
<th class="px-6 py-3 font-medium">Contribuable</th>
<th class="px-6 py-3 font-medium">Service</th>
<th class="px-6 py-3 font-medium">Heure arrivée</th>
<th class="px-6 py-3 font-medium">Statut</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100">
<tr v-for="ticket in tickets" :key="ticket.id"
@click="emit('select-ticket', ticket.id)"
:class="['cursor-pointer transition-colors',
selectedTicketId === ticket.id ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50']">
<td class="px-6 py-4 font-bold text-gray-800">{{ ticket.id }}</td>
<td class="px-6 py-4 text-gray-700">{{ ticket.name }}</td>
<td class="px-6 py-4 text-gray-600">{{ ticket.service }}</td>
<td class="px-6 py-4 text-gray-500">{{ ticket.time }}</td>
<td class="px-6 py-4">
<span v-if="ticket.status === 'APPELE'" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
APPELE
</span>
<span v-else class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
EN_ATTENTE
</span>
</td>
</tr>
<!-- Lignes vides simulées -->
<tr v-for="n in 3" :key="'empty'+n" class="opacity-50">
<td class="px-6 py-4 text-gray-400">...</td>
<td class="px-6 py-4 text-gray-400">...</td>
<td class="px-6 py-4 text-gray-400">...</td>
<td class="px-6 py-4 text-gray-400">...</td>
<td class="px-6 py-4"><span class="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">EN_ATTENTE</span></td>
</tr>
</tbody>
</table>
</div>

<!-- Pagination -->
<div class="p-4 border-t border-gray-200 flex justify-between items-center bg-white">
<p class="text-sm text-gray-500">1 à 12 sur 12 dans la file</p>
<div class="flex gap-2">
<button class="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
<button class="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded font-bold">1</button>
<button class="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
</div>
</div>
</div>
</template>
