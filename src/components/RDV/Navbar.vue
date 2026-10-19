<script setup>
const links = [
	{ name: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', active: false },
{ name: 'Mes rendez-vous', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', active: true },
{ name: 'Mes déclarations', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', active: false },
{ name: 'Mes paiements', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', active: false },
{ name: 'Mon profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', active: false }
];
</script>

<template>
<header class="bg-white border-b border-gray-200 sticky top-0 z-50">
<div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

<!-- Logo -->
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-green-500 flex items-center justify-center">
<span class="text-white font-bold text-xl">G</span>
</div>
<div>
<h1 class="text-xl font-bold text-gray-800 leading-none">IMPOTS</h1>
<p class="text-xs tracking-widest text-gray-500">M a n a k a r a</p>
</div>
</div>

<!-- Liens de navigation -->
<nav class="hidden lg:flex items-center gap-8">
<a v-for="link in links" :key="link.name" href="#" 
:class="['flex items-center gap-2 text-sm font-medium py-2 transition-colors border-b-2',
link.active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-blue-600']">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
</svg>
{{ link.name }}
</a>
</nav>

<!-- Droite : Drapeau et badge -->
<div class="flex items-center gap-4">
<div class="flex h-4 w-6 overflow-hidden rounded-sm shadow">
<div class="w-1/3 bg-white"></div>
<div class="w-1/3 bg-red-600"></div>
<div class="w-1/3 bg-green-600"></div>
</div>
<div class="flex items-center gap-2">
<span class="text-blue-600">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
</span>
<div class="text-xs leading-tight">
<p class="font-semibold text-gray-800">Service officiel</p>
<p class="text-gray-500">République de Madagascar</p>
</div>
</div>
</div>
</div>
</header>
</template>
