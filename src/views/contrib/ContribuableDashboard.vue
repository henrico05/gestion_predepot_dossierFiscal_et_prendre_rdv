<script setup>
import { ref, onMounted } from 'vue'
import PortalHeader from '@/components/Contrubuable/PortalHeader.vue'
import PortalDashboard from '@/components/Contrubuable/PortalDashboard.vue'


</script>

<template>
<div  class="flex flex-col h-screen overflow-y-auto font-sans scrollbar-hidden">

<!-- 1. Header / Navigation -->
<PortalHeader
:is-dark="isDark"
@toggle-theme="toggleTheme"
/>

<!-- 2. Contenu de la page -->
<main class="">
<RouterView />

<!--<PortalDashboard  />
</router-view>-->
</main>

</div>
</template>

<style>
  
  /* ============================================================
   * SCROLLBAR INVISIBLE
   * Cache la barre tout en gardant le scroll fonctionnel
   * ============================================================ */
  .scrollbar-hidden {
	  /* Firefox */
	  scrollbar-width: none;
	  /* IE / Edge anciens */
	  -ms-overflow-style: none;
  }
  
  /* Chrome / Safari / Edge (WebKit) */
  .scrollbar-hidden::-webkit-scrollbar {
	  width: 0;
	  height: 0;
	  display: none;
  }
  
  /* Pour les navigateurs modernes qui supportent scrollbar-gutter */
  .scrollbar-hidden::-webkit-scrollbar-track {
	  background: transparent;
	  backface-visibility : hidden;
  }
  
  .scrollbar-hidden::-webkit-scrollbar-thumb {
	  background: transparent;
  }

</style>
