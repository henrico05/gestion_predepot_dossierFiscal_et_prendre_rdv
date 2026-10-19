<script setup>
import { ref } from 'vue';

const isDragging = ref(false);

// Logique simplifiée de drag & drop
const onDrop = (e) => {
	isDragging.value = false;
	const files = e.dataTransfer.files;
	if (files.length > 0) {
		console.log('Fichiers déposés:', files);
		// Ici, vous appelleriez une fonction parent pour ajouter les fichiers
	}
};
</script>

<template>
<div 
@dragover.prevent="isDragging = true"
@dragleave.prevent="isDragging = false"
@drop.prevent="onDrop"
:class="['border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-400 bg-blue-50/30 hover:bg-blue-50/60']"
>
<svg class="w-12 h-12 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6h.1a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
</svg>
<p class="text-base font-bold text-gray-800">Glissez vos fichiers ici ou cliquez pour sélectionner</p>
<p class="text-sm text-gray-500 mt-1">Formats acceptés : PDF, JPG, PNG, TIF – Taille maximale : 10 Mo par fichier</p>
</div>
</template>
