<script setup>
import { ref, onMounted } from 'vue'
import PortalHeader from '@/components/Contrubuable/PortalHeader.vue'
import PortalDashboard from '@/components/Contrubuable/PortalDashboard.vue'

// Exemple de navigation (à connecter à Vue Router)
const handleNavigation = (routeName) => {
	console.log('Navigation vers :', routeName)
	// router.push({ name: routeName.toLowerCase() })
}
</script>

<template>
<!-- Classe racine pour appliquer les variables CSS -->
<div :class="isDark ? 'dark' : ''" class="min-h-screen font-sans">

<!-- 1. Header / Navigation -->
<PortalHeader 
:is-dark="isDark" 
@toggle-theme="toggleTheme"
@navigate="handleNavigation"
/>

<!-- 2. Contenu de la page (Slot pour Vue Router) -->
<main>
<!-- 
Pour Vue Router, remplacez <PortalDashboard /> par :
<router-view />
-->
<PortalDashboard />
</main>

</div>
</template>

