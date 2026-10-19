<script setup>
import { onMounted } from 'vue';
import gsap from 'gsap';

import AppHeader from '@/components/Login/PublicHeader.vue';
import RegisterForm from '@/components/Register/RegisterForm.vue';

onMounted(() => {
	// Animation de la carte du formulaire
	gsap.from('.register-card', { 
		y: 50, 
		opacity: 0, 
		duration: 0.8, 
		ease: 'power3.out' 
	});
	
	// Animation des inputs en cascade
	gsap.from('.grid > *', { 
		x: -20, 
		opacity: 0, 
		duration: 0.5, 
		stagger: 0.1, 
		delay: 0.3 
	});
});

</script>

<template>
<div class="flex flex-col min-h-screen bg-[var(--bg)]">
<AppHeader />

<main class="flex-1 flex items-center justify-center p-6">
<RegisterForm />
</main>

<!-- Optionnel : un footer discret -->
<footer class="text-center text-xs text-[var(--text-muted)] pb-4">
© 2026 IMPOTS Manakara. Tous droits réservés.
</footer>
</div>
</template>
