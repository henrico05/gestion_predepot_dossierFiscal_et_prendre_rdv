<template>
      <div :class="[isDark ? 'dark' : '','w-full h-full']">
      <RouterView />
      <div
      ref="btn"
      :style="{ top: `${position.y}px`, left: `${position.x}px` }"
      @mousedown.prevent="startDrag"
      class="fixed p-2 rounded-lg bg-light dark:bg-dark shadow-lg cursor-move transition-all duration-300 z-50"
      aria-label="Toggle dark mode"
      >
      <button
      @click="toggleDarkMode"
      class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
      aria-label="Toggle dark mode"
      >
      <!-- Icône lune -->
      <svg
      v-if="!isDark"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.8"
      stroke="currentColor"
      class="w-7 h-7 text-primary"
      >
      <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21 12.79A9 9 0 1 1 11.21 3
      7 7 0 0 0 21 12.79Z"
      />
      </svg>
      
      <!-- Icône soleil -->
      <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.8"
      stroke="currentColor"
      class="w-7 h-7 text-primary"
      >
      <circle cx="12" cy="12" r="4" />
      
      <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 2v2
      M12 20v2
      M4.93 4.93l1.41 1.41
      M17.66 17.66l1.41 1.41
      M2 12h2
      M20 12h2
      M4.93 19.07l1.41-1.41
      M17.66 6.34l1.41-1.41"
      />
      </svg>
      </button>
      </div>
      </div>
  
</template>
    
<script setup>

import { onBeforeUnmount, onMounted,onUnmounted, ref } from 'vue'
import { connectSocket, socket } from '@/services/socket.js'

const isDark = ref(localStorage.getItem('theme')==='dark')

const toggleDarkMode = () => {
   const html = document.documentElement;
   if (isDark.value) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
   } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
   }
   isDark.value = !isDark.value
}
const btn = ref(null)
const position = ref({ x: 0, y: 0 })
let dragging = false
let offset = { x: 0, y: 0 }

onMounted(() => {
   position.value.x = window.innerWidth - 70 // largeur bouton ~50 + marge
   position.value.y = window.innerHeight - 70 // hauteur bouton ~50 + marge
   window.addEventListener('mousemove', onDrag)
   window.addEventListener('mouseup', stopDrag)
   
   // Vérifier le thème sauvegardé ou la préférence système
   if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      isDark.value = true
   } else {
      document.documentElement.classList.remove('dark')
      isDark.value = false
   }
   
   if (localStorage.getItem('token')) {
         connectSocket()
   }
   
   // Heartbeat toutes les 30 secondes pour maintenir la présence
   const heartbeatInterval = setInterval(() => {
         if (socket.connected) {
               socket.emit('presence:heartbeat')
         }
   }, 30000)
   
   onUnmounted(() => clearInterval(heartbeatInterval))
})

onBeforeUnmount(() => {
   window.removeEventListener('mousemove', onDrag)
   window.removeEventListener('mouseup', stopDrag)
})
const startDrag = (e) => {
   dragging = true
   offset.x = e.clientX - position.value.x
   offset.y = e.clientY - position.value.y
}

const onDrag = (e) => {
   if (!dragging) return
      position.value.x = e.clientX - offset.x
      position.value.y = e.clientY - offset.y
      
      // Limiter dans la fenêtre
      position.value.x = Math.max(0, Math.min(position.value.x, window.innerWidth - 60))
      position.value.y = Math.max(0, Math.min(position.value.y, window.innerHeight - 60))
}

const stopDrag = () => {
   dragging = false
}


</script>

<style scoped>

</style>
