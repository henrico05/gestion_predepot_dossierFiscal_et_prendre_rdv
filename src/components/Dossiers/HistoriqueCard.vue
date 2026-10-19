<script setup>
import { ref } from 'vue';
import { historique, initialComments } from '../../data/dossierData.js';

const comments = ref(initialComments);
const newComment = ref('');

const addComment = () => {
	if (!newComment.value.trim()) return;
	comments.value.push({
		id: Date.now(),
						auteur: 'Agent Vérificateur',
						date: new Date().toLocaleString('fr-FR').slice(0, 16),
						texte: newComment.value,
						interne: false
	});
	newComment.value = '';
};
</script>

<template>
<div class="space-y-6">
<!-- Historique -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
<div class="p-6 border-b border-gray-200">
<h2 class="font-bold text-gray-800 flex items-center gap-2">
<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
Historique des traitements
</h2>
</div>

<div class="p-6">
<ol class="relative border-l border-gray-200 ml-3 space-y-6">
<li v-for="(item, index) in historique" :key="index" class="ml-6">
<span :class="['absolute -left-2.25 top-1.5 w-4 h-4 rounded-full border-2 border-white', item.error ? 'bg-red-500' : 'bg-blue-500']"></span>
<div class="flex flex-wrap items-center gap-2 text-xs mb-1">
<span class="text-gray-500 font-medium">{{ item.date }}</span>
</div>
<p class="text-sm font-medium text-gray-800">{{ item.action }}</p>
<p class="text-xs text-gray-500 mb-1">Par {{ item.auteur }}</p>
<p v-if="item.detail" :class="['text-xs px-2 py-1 rounded inline-block', item.error ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700']">
{{ item.detail }}
</p>
</li>
</ol>

<button class="w-full mt-6 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded flex justify-center items-center gap-2 text-sm font-medium">
Voir tout l'historique
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
</button>
</div>
</div>

<!-- Commentaires -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200">
<div class="p-6 border-b border-gray-200">
<h2 class="font-bold text-gray-800 flex items-center gap-2">
<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
Commentaires
</h2>
</div>

<div class="p-6 space-y-4">
<div v-for="comment in comments" :key="comment.id" class="text-sm">
<div class="flex items-center gap-2 mb-1">
<span class="font-semibold text-gray-800">{{ comment.auteur }}</span>
<span class="text-xs text-gray-400">{{ comment.date }}</span>
</div>
<p class="text-gray-600 leading-relaxed">{{ comment.texte }}</p>
<span v-if="comment.interne" class="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Interne</span>
</div>

<div class="pt-4 border-t border-gray-100 mt-4">
<textarea 
v-model="newComment"
@keydown.enter.exact.prevent="addComment"
class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
rows="2"
placeholder="Ajoutez un commentaire interne..."
></textarea>
<div class="flex justify-end mt-2">
<button @click="addComment" class="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
</button>
</div>
</div>
</div>
</div>
</div>
</template>
