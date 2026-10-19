<script setup>
const menuItems = [
	{ name: 'File d\'attente', active: true, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
{ name: 'Dossiers', active: false, icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
{ name: 'Rendez-vous', active: false, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
{ name: 'Statistiques', active: false, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
];
</script>

<template>
<aside class="w-64 bg-[#0a1f44] text-white flex flex-col h-screen flex-shrink-0">

<!-- Logo -->
<div class="p-6 border-b border-white/10">
<div class="flex items-center gap-3">
<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
<path d="M3 21V8l9-5 9 5v13h-6v-7h-6v7H3z"/>
</svg>
<div>
<h1 class="text-2xl font-bold tracking-widest">IMPOTS</h1>
<p class="text-[10px] text-gray-400 tracking-wide">RÉPUBLIQUE FRANÇAISE</p>
</div>
</div>
<p class="text-xs text-gray-500 mt-2 tracking-wider">Liberté • Égalité • Fraternité</p>
</div>

<!-- Navigation -->
<nav class="flex-1 py-6 space-y-2">
   <a v-for="item in menuItems" :key="item.name" href="#" :class="['flex items-center gap-4 px-6 py-3 text-sm font-medium transition-colors', item.active ? 'bg-blue-600 text-white border-l-4 border-white/20' : 'text-gray-300 hover:bg-white/10']"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" /> </svg> {{ item.name }} </a>
</nav>

<!-- Déconnexion -->
<div class="p-6 border-t border-white/10">
<a href="#" class="flex items-center gap-4 text-gray-300 hover:text-white transition">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
</svg>
Déconnexion
</a>
</div>

<!-- Pied de page Agent -->
<div class="p-6 border-t border-white/10 text-xs text-gray-400">
<p class="font-medium text-gray-200 mb-1">Agent : Marie Dubois</p>
<p>Centre des Finances</p>
<p>Publiques de Lyon 2</p>
</div>
</aside>
</template>
