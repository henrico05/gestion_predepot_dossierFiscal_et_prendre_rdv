<script setup>
// Navigation statique
</script>

<template>
<header class="bg-[#0b2a5b] text-white h-20 flex items-center px-8">
<div class="w-full max-w-7xl mx-auto flex justify-between items-center">

<!-- Logo -->
<div class="flex items-center gap-3">
<svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
<path d="M3 21V8l9-5 9 5v13h-6v-7h-6v7H3z" />
</svg>
<div class="leading-tight">
<h1 class="text-2xl font-bold tracking-wider">IMPOTS</h1>
<p class="text-xs text-gray-300 tracking-[0.2em]">MADAGASIKARA</p>
<p class="text-[10px] text-gray-400">Service digital des Impôts</p>
</div>
</div>

<!-- Liens -->
<div class="flex items-center gap-8 text-sm font-medium">
<!-- Lien actif -->
<a href="#" class="flex items-center gap-2 border-b-2 border-white pb-1">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
Mes rendez-vous
</a>
<a href="#" class="flex items-center gap-2 text-gray-300 hover:text-white transition">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
Mes dossiers
</a>
<div class="w-px h-6 bg-white/30"></div>
<a href="#" class="flex items-center gap-2 text-gray-300 hover:text-white transition">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
Déconnexion
</a>
</div>
</div>
</header>
</template>
