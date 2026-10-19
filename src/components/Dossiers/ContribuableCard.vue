<script setup>
import { contribuableInfo } from '../../data/dossierData.js';
</script>

<template>
<div class="bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
<div class="p-6">
<h2 class="font-bold text-gray-800 flex items-center gap-2 mb-6">
<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
Informations contribuable
</h2>

<div class="space-y-4 text-sm">
<div>
<p class="text-gray-500 mb-1">NIF</p>
<p class="font-medium text-gray-800">{{ contribuableInfo.nif }}</p>
</div>
<div>
<p class="text-gray-500 mb-1">Nom / Raison sociale</p>
<p class="font-medium text-gray-800">{{ contribuableInfo.nom }}</p>
</div>
<div class="flex gap-4">
<div>
<p class="text-gray-500 mb-1">Téléphone</p>
<p class="font-medium text-gray-800">{{ contribuableInfo.telephone }}</p>
</div>
</div>
<div class="flex gap-4">
<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
<div>
<p class="text-gray-500 mb-1">Adresse</p>
<p class="font-medium text-gray-800">{{ contribuableInfo.adresse }}</p>
</div>
</div>
<div class="flex gap-4">
<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
<div>
<p class="text-gray-500 mb-1">Période concernée</p>
<p class="font-medium text-gray-800">{{ contribuableInfo.periode }}</p>
</div>
</div>
</div>
</div>

<div class="p-6 pt-0">
<button class="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 rounded flex justify-between items-center px-4 font-medium text-sm transition">
Voir la fiche contribuable
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
</button>
</div>
</div>
</template>
