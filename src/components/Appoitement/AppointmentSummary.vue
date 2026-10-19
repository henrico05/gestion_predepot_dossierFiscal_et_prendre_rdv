<script setup>
defineProps({
	formData: Object
});
</script>

<template>
<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">

<!-- En-tête bleu -->
<div class="bg-[#0b2a5b] text-white p-6 flex items-center gap-3">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
<h2 class="text-xl font-bold">Résumé de votre rendez-vous</h2>
</div>

<!-- Contenu du résumé -->
<div class="p-6 space-y-6">

<!-- Service -->
<div class="flex gap-4">
<svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
<div>
<p class="text-sm font-bold text-gray-500 uppercase text-xs tracking-wide mb-1">Service sélectionné</p>
<p class="text-gray-800 font-medium">{{ formData.service || '—' }}</p>
</div>
</div>

<div class="border-t border-gray-200"></div>

<!-- Date -->
<div class="flex gap-4">
<svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
<div>
<p class="text-sm font-bold text-gray-500 uppercase text-xs tracking-wide mb-1">Date</p>
<p class="text-gray-800 font-medium">{{ formData.date || '—' }}</p>
</div>
</div>

<div class="border-t border-gray-200"></div>

<!-- Horaire -->
<div class="flex gap-4">
<svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
<div>
<p class="text-sm font-bold text-gray-500 uppercase text-xs tracking-wide mb-1">Horaire</p>
<p class="text-gray-800 font-medium">{{ formData.time || '—' }}</p>
</div>
</div>

<div class="border-t border-gray-200"></div>

<!-- Durée estimée -->
<div class="flex gap-4">
<svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
<div>
<p class="text-sm font-bold text-gray-500 uppercase text-xs tracking-wide mb-1">Durée estimée</p>
<p class="text-gray-800 font-medium">{{ formData.duration || '—' }}</p>
</div>
</div>

<!-- Bouton Confirmer -->
<button 
class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-md mt-4"
:disabled="!formData.service || !formData.time"
:class="!formData.service || !formData.time ? 'opacity-50 cursor-not-allowed' : ''"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
Confirmer le rendez-vous
</button>

<!-- Note de sécurité -->
<p class="flex items-center gap-2 text-xs text-gray-500 justify-center mt-4">
<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
Vos données sont sécurisées et confidentielles.
</p>
</div>
</div>
</template>
