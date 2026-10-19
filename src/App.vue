<template>
<RouterView />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { connectSocket, socket } from '@/services/socket.js'

let heartbeatInterval = null

onMounted(() => {
   console.log('🚀 App.vue monté')
   
   // Connexion Socket.IO si l'utilisateur est connecté
   if (localStorage.getItem('token')) {
      console.log('🔌 Connexion Socket.IO depuis App.vue...')
      connectSocket()
   }
   
   // Heartbeat toutes les 30 secondes
   heartbeatInterval = setInterval(() => {
      if (socket.connected) {
         socket.emit('presence:heartbeat')
         console.log('💓 Heartbeat envoyé')
      }
   }, 30000)
})

onUnmounted(() => {
   console.log('🧹 App.vue démonté')
   
   if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
   }
})
</script>
