<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted,onBeforeUnmount, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import gsap from 'gsap'
import api from '@/api/Axios'
import { useNotifications } from '@/composables/useNotifications'

const route  = useRoute()
const router = useRouter()
const toast  = useToast()

/* ============================================================
 * ÉTAT
 * ============================================================ */

const {
   notifications,
   unreadCount,
   isLoading,
   loadNotifications,
   lireNotification,
   marquerToutCommeLu
} = useNotifications()


const errorMessage  = ref('')

const filtreStatut  = ref('TOUS')   // TOUS | NON_LU | LU
const filtreType    = ref('TOUS')   // TOUS | RDV | DOSSIER | SYSTEME
const recherche     = ref('')

/* Détail (drawer) */
const selectedNotif = ref(null)
const isDrawerOpen  = ref(false)

/* Refs pour GSAP */
const listRef = ref(null)


async function ouvrirDetail(notif) {
   selectedNotif.value = notif
   isDrawerOpen.value = true
   
   // ⭐ Utilise la fonction partagée → décrémente le compteur global
   await lireNotification(notif)
}

/* ============================================================
 * COMPUTED
 * ============================================================ */
const totalUnread = computed(() =>
notifications.value.filter(n => n.statut_envoi !== 'LU').length
)

const filteredNotifs = computed(() => {
   const q = recherche.value.trim().toLowerCase()
   
   return notifications.value.filter(n => {
      // Filtre statut
      if (filtreStatut.value === 'NON_LU' && n.statut_envoi === 'LU') return false
         if (filtreStatut.value === 'LU'     && n.statut_envoi !== 'LU') return false
            
            // Filtre type
            if (filtreType.value !== 'TOUS') {
               const type = (n.type_notification || '').toUpperCase()
               if (!type.includes(filtreType.value)) return false
            }
            
            // Recherche
            if (q && !(n.contenu || '').toLowerCase().includes(q)) return false
               
               return true
   })
})

/* ============================================================
 * HELPERS
 * ============================================================ */
function formatDate(date) {
   if (!date) return '—'
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return '—'
         
         const now  = new Date()
         const diff = Math.floor((now - d) / 1000)
         
         if (diff < 60)          return "À l'instant"
            if (diff < 3600)        return `Il y a ${Math.floor(diff / 60)} min`
               if (diff < 86400)       return `Il y a ${Math.floor(diff / 3600)} h`
                  if (diff < 86400 * 7)   return `Il y a ${Math.floor(diff / 86400)} j`
                     
                     return d.toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                     })
}

function formatDateLong(date) {
   if (!date) return '—'
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return '—'
         return d.toLocaleString('fr-FR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
         })
}

function typeLabel(type) {
   if (!type) return 'Notification'
      const t = type.toUpperCase()
      if (t.includes('RDV'))     return 'Rendez-vous'
         if (t.includes('DOSSIER')) return 'Dossier'
            if (t.includes('TICKET'))  return 'Ticket'
               if (t.includes('SYSTEME')) return 'Système'
                  return type
}

function typePalette(type) {
   const t = (type || '').toUpperCase()
   if (t.includes('RDV'))     return { icon: 'calendar', bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',   dot: 'bg-blue-500' }
   if (t.includes('DOSSIER')) return { icon: 'folder',   bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-300', dot: 'bg-violet-500' }
   if (t.includes('TICKET'))  return { icon: 'ticket',   bg: 'bg-pink-500/10',   text: 'text-pink-600 dark:text-pink-300',   dot: 'bg-pink-500' }
   return { icon: 'bell', bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]', dot: 'bg-[var(--primary)]' }
}


function fermerDrawer() {
   isDrawerOpen.value = false
   setTimeout(() => { selectedNotif.value = null }, 250)
}

async function marquerCommeLu(notif) {
   try {
      await api.patch(`/notifications/${notif.id_notification}/lire`)
      notif.statut_envoi = 'LU'
   } catch (error) {
      console.error('❌ Erreur lecture notification :', error)
   }
}


/* ============================================================
 * ANIMATION GSAP
 * ============================================================ */
function animerListe() {
   if (!listRef.value) return
      const items = listRef.value.querySelectorAll('[data-notif-row]')
      if (!items.length) return
         
         gsap.fromTo(items,
                     { opacity: 0, y: 12 },
                     {
                        opacity: 1, y: 0,
                        duration: 0.35, stagger: 0.04,
                        ease: 'power2.out',
                        clearProps: 'transform,opacity'
                     }
         )
}



/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
   await loadNotifications()
   await nextTick()
   
   const notifId = route.query.id
   if (notifId) {
      const notif = notifications.value.find(
         n => String(n.id_notification) === String(notifId)
      )
      if (notif) {
         selectedNotif.value = notif
         isDrawerOpen.value = true
         await lireNotification(notif)
      }
   }
})

</script>

<template>
<div class="min-h-full bg-[var(--bg)] text-[var(--text)]">
<div class="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">

<!-- ============================================================
HEADER
============================================================ -->
<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
<div>
<p class="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--primary)]">
Centre de notifications
</p>
<h1 class="mt-1 text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
Notifications
<span
v-if="totalUnread"
class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold"
>
<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
{{ totalUnread }} non lue{{ totalUnread > 1 ? 's' : '' }}
</span>
</h1>
</div>

<motion.button
v-if="totalUnread > 0"
@click="marquerToutCommeLu"
:whileHover="{ scale: 1.03 }"
:whileTap="{ scale: 0.97 }"
class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M5 13l4 4L19 7"/>
</svg>
Tout marquer comme lu
</motion.button>
</div>

<!-- ============================================================
FILTRES
============================================================ -->
<div class="mb-5 grid grid-cols-1 md:grid-cols-12 gap-3">

<!-- Recherche -->
<div class="relative md:col-span-6">
<svg class="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="recherche"
type="search"
placeholder="Rechercher une notification…"
class="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-[var(--card)] border-0 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 transition"
/>
</div>

<!-- Statut -->
<div class="md:col-span-3">
<select
v-model="filtreStatut"
class="w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--card)] border-0 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 cursor-pointer"
>
<option value="TOUS">Toutes</option>
<option value="NON_LU">Non lues</option>
<option value="LU">Lues</option>
</select>
</div>

<!-- Type -->
<div class="md:col-span-3">
<select
v-model="filtreType"
class="w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--card)] border-0 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 cursor-pointer"
>
<option value="TOUS">Tous les types</option>
<option value="RDV">Rendez-vous</option>
<option value="DOSSIER">Dossiers</option>
<option value="TICKET">Tickets</option>
<option value="SYSTEME">Système</option>
</select>
</div>
</div>

<!-- ============================================================
LISTE
============================================================ -->
<div ref="listRef" class="space-y-2">

<!-- Loading -->
<div v-if="isLoading" class="space-y-2">
<div
v-for="n in 4"
:key="n"
class="h-24 rounded-2xl bg-[var(--card)] animate-pulse"
></div>
</div>

<!-- Erreur -->
<div
v-else-if="errorMessage"
class="p-12 rounded-3xl bg-red-50 dark:bg-red-500/10 text-center"
>
<p class="text-sm text-red-600 dark:text-red-300 font-medium">{{ errorMessage }}</p>
<button
@click="loadNotifications"
class="mt-3 px-4 py-2 text-sm rounded-xl bg-[var(--primary)] text-white hover:bg-blue-600 transition"
>
Réessayer
</button>
</div>

<!-- Vide -->
<div
v-else-if="filteredNotifs.length === 0"
class="p-12 rounded-3xl bg-[var(--card)] text-center"
>
<div class="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-4">
<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
</svg>
</div>
<p class="text-sm font-bold">Aucune notification</p>
<p class="text-xs text-[var(--text-muted)] mt-1">Vous êtes à jour ✨</p>
</div>

<!-- Liste des notifications -->
<motion.button
v-for="notif in filteredNotifs"
:key="notif.id_notification"
data-notif-row
type="button"
:whileHover="{ x: 3 }"
@click="ouvrirDetail(notif)"
:class="[
'group w-full text-left rounded-2xl p-4 flex items-start gap-4 transition-colors',
notif.statut_envoi !== 'LU'
? 'bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/20'
: 'bg-[var(--card)] hover:bg-[var(--hover)]'
]"
>

<!-- Icône type -->
<div
:class="[
'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
typePalette(notif.type_notification).bg
]"
>
<svg
:class="['w-5 h-5', typePalette(notif.type_notification).text]"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path v-if="typePalette(notif.type_notification).icon === 'calendar'"
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
<path v-else-if="typePalette(notif.type_notification).icon === 'folder'"
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
<path v-else-if="typePalette(notif.type_notification).icon === 'ticket'"
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
<path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
</svg>
</div>

<!-- Contenu -->
<div class="min-w-0 flex-1">
<div class="flex items-start justify-between gap-3 mb-1">
<div class="flex items-center gap-2 min-w-0 flex-1">
<span
:class="[
'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
typePalette(notif.type_notification).bg,
typePalette(notif.type_notification).text
]"
>
{{ typeLabel(notif.type_notification) }}
</span>

<span v-if="notif.statut_envoi !== 'LU'" class="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
</div>

<span class="shrink-0 text-[11px] text-[var(--text-muted)] whitespace-nowrap">
{{ formatDate(notif.date_creation || notif.date_envoi) }}
</span>
</div>

<p
:class="[
'text-sm leading-relaxed line-clamp-2',
notif.statut_envoi !== 'LU' ? 'font-semibold text-[var(--text)]' : 'text-[var(--text)]'
]"
>
{{ notif.contenu }}
</p>
</div>

<!-- Chevron -->
<div class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors self-center">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</div>
</motion.button>

</div>
</div>

<!-- ============================================================
DRAWER DÉTAIL
============================================================ -->
<AnimatePresence>
<motion.div
v-if="isDrawerOpen"
key="drawer-backdrop"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
:transition="{ duration: 0.2 }"
class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
@click="fermerDrawer"
>
<motion.aside
:initial="{ x: '100%' }"
:animate="{ x: 0 }"
:exit="{ x: '100%' }"
:transition="{ type: 'spring', stiffness: 320, damping: 32 }"
class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--card)] shadow-2xl overflow-y-auto"
@click.stop
>
<template v-if="selectedNotif">
<!-- Header drawer -->
<div class="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
<div class="flex items-center gap-2 min-w-0">
<div
:class="[
'w-8 h-8 rounded-lg flex items-center justify-center',
typePalette(selectedNotif.type_notification).bg
]"
>
<svg
:class="['w-4 h-4', typePalette(selectedNotif.type_notification).text]"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
</svg>
</div>
<span class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
Détail
</span>
</div>

<motion.button
@click="fermerDrawer"
whileHover="{ scale: 1.08, rotate: 90 }"
   whileTap="{ scale: 0.92 }"
      class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
      title="Fermer"
      >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      </motion.button>
      </div>
      
      <!-- Contenu -->
      <div class="p-5 space-y-5">
      <!-- Badge type + statut -->
      <div class="flex items-center gap-2 flex-wrap">
      <span
      :class="[
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
typePalette(selectedNotif.type_notification).bg,
typePalette(selectedNotif.type_notification).text
]"
>
<span :class="['w-1.5 h-1.5 rounded-full', typePalette(selectedNotif.type_notification).dot]"></span>
{{ typeLabel(selectedNotif.type_notification) }}
</span>

<span
:class="[
'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
selectedNotif.statut_envoi === 'LU'
? 'bg-[var(--bg)] text-[var(--text-muted)]'
: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
]"
>
{{ selectedNotif.statut_envoi === 'LU' ? 'Lue' : 'Non lue' }}
</span>
</div>

<!-- Titre / Contenu -->
<div>
<h2 class="text-lg font-bold tracking-tight leading-snug">
{{ selectedNotif.titre || 'Notification' }}
</h2>
<p class="mt-3 text-sm leading-relaxed text-[var(--text)] whitespace-pre-line">
{{ selectedNotif.contenu }}
</p>
</div>

<!-- Métadonnées -->
<div class="pt-5 border-t border-[var(--border)] space-y-3">
<div class="flex items-start gap-3 text-sm">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
<div>
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
Reçue le
</p>
<p class="font-medium mt-0.5">
{{ formatDateLong(selectedNotif.date_creation || selectedNotif.date_envoi) }}
</p>
</div>
</div>

<div v-if="selectedNotif.canal" class="flex items-start gap-3 text-sm">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
</svg>
<div>
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
Canal
</p>
<p class="font-medium mt-0.5 capitalize">{{ selectedNotif.canal }}</p>
</div>
</div>
</div>

<!-- Actions -->
<div class="pt-5 border-t border-[var(--border)]">
<motion.button
v-if="selectedNotif.statut_envoi !== 'LU'"
@click="marquerCommeLu(selectedNotif)"
:whileHover="{ scale: 1.02 }"
:whileTap="{ scale: 0.98 }"
class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
Marquer comme lue
</motion.button>

<p v-else class="text-center text-xs text-[var(--text-muted)] py-2">
Cette notification a déjà été lue
</p>
</div>
</div>
</template>
</motion.aside>
</motion.div>
</AnimatePresence>
</div>
</template>
