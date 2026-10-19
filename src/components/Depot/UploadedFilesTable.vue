<script setup>
defineProps({
	files: Array
});

const emit = defineEmits(['delete-file']);
</script>

<template>
<div class="mt-6">
<h3 class="text-lg font-bold text-gray-800 mb-2">Fichiers déposés ({{ files.length }})</h3>
<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
<table class="w-full text-left text-sm">
<thead class="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
<tr>
<th class="px-6 py-3 font-semibold">Nom du fichier</th>
<th class="px-6 py-3 font-semibold">Taille</th>
<th class="px-6 py-3 font-semibold">Statut</th>
<th class="px-6 py-3 font-semibold text-right">Action</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100">
<tr v-for="(file, index) in files" :key="file.id">
<td class="px-6 py-4 flex items-center gap-2 text-gray-700 font-medium">
<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2v6h6M16 13H8m8 4H8"></path></svg>
{{ file.name }}
</td>
<td class="px-6 py-4 text-gray-500">{{ file.size }}</td>
<td class="px-6 py-4">
<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">
<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
EN_ATTENTE
</span>
</td>
<td class="px-6 py-4 text-right">
<button @click="emit('delete-file', file.id)" class="text-red-500 hover:text-red-700">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</template>
