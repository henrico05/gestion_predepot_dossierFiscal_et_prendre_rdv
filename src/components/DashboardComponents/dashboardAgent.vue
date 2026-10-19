<script setup>
import { computed } from 'vue'

import ChefCentreDashboard from './ChefCentreDashboard.vue'
import GuichetierDashboard from './Dashboard.vue'
import VerificateurDashboard from './VerificateurDashboard.vue'

const currentUser = computed(() => {
	const raw = localStorage.getItem('currentUser')
	return raw ? JSON.parse(raw) : null
})

const dashboardComponent = computed(() => {
	switch (currentUser.value?.role) {
		case 'CHEF_CENTRE':
			return ChefCentreDashboard
			
		case 'GUICHETIER':
			return GuichetierDashboard
			
		case 'VERIFICATEUR':
			return VerificateurDashboard
			
		default:
			return null
	}
})
</script>

<template>
<component
v-if="dashboardComponent"
:is="dashboardComponent"
/>

<div v-else>
Accès non autorisé
</div>
</template>
