<script setup>
import { onMounted } from 'vue';
import gsap from 'gsap';
import PublicHeader from '@/components/Login/PublicHeader.vue';
import LoginCard from '@/components/Login/LoginCard.vue';
import PublicFooter from '@/components/Login/PublicFooter.vue';

onMounted(() => {
	// Animation d'apparition de la carte de connexion
	gsap.from('.login-card-wrapper', {
		y: 50,
		opacity: 0,
		duration: 0.8,
		ease: 'power3.out'
	});
});
</script>

<template>
<div class="flex flex-col min-h-screen bg-[var(--bg)] overflow-hidden relative">

<!-- Header -->
<PublicHeader />

<!-- Contenu principal avec fond géométrique -->
<main class="flex-1 flex items-center justify-center p-6 relative z-0">

<!-- Motif de fond (Carte de Madagascar stylisée + losanges) -->
<div class="absolute inset-0 pointer-events-none opacity-10">
<!-- Losanges en arrière-plan -->
<div class="absolute top-1/4 left-10 w-64 h-64 bg-[var(--primary)] transform rotate-45 rounded-3xl"></div>
<div class="absolute bottom-1/4 right-10 w-96 h-96 bg-[var(--titlebar)] transform rotate-45 rounded-3xl"></div>

<!-- Carte de Madagascar simplifiée (SVG) -->
<svg class="absolute right-0 top-0 h-full w-1/2 object-cover text-[var(--primary)]" viewBox="0 0 200 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path d="M100,20 C130,30 140,80 130,120 C120,160 140,200 160,240 C180,280 190,320 180,360 C170,400 140,400 120,380 C100,360 80,380 60,370 C40,360 30,340 40,300 C50,260 40,220 50,180 C60,140 70,100 80,70 C90,40 80,20 100,20 Z" />
</svg>
</div>

<!-- Carte de connexion animée -->
<div class="login-card-wrapper w-full max-w-lg relative z-10">
<LoginCard />
</div>

</main>

<!-- Footer -->
<PublicFooter />
</div>
</template>
