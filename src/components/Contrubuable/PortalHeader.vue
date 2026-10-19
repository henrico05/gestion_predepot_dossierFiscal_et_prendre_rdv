<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useToast } from 'vue-toastification'
import { disconnectSocket, socket, connectSocket } from '@/services/socket'
import DeconnectModal from '@/components/DeconnectModal.vue'
import axios from '@/api/Axios'
import { playSound } from '@/services/sonnerie.js'
import { useNotifications } from '@/composables/useNotifications'

const route  = useRoute()
const router = useRouter()
const toast  = useToast()

/* ============================================================
 * UTILISATEUR
 * ============================================================ */
const currentUser = ref(null)

try {
	const storedUser = localStorage.getItem('currentUser')
	if (storedUser) currentUser.value = JSON.parse(storedUser)
} catch (error) {
	console.error('❌ Erreur lecture currentUser :', error)
}

const {
	notifications,
	unreadCount,
	loadNotifications,
	lireNotification,
	ajouterNotification
} = useNotifications()



const nomUtilisateur = computed(() =>
currentUser.value?.nom_raison_sociale || 'Contribuable'
)

const initialesUtilisateur = computed(() => {
	const nom = nomUtilisateur.value.trim()
	if (!nom) return 'C'
		
		const mots = nom.split(/\s+/).filter(Boolean)
		if (mots.length === 1) return mots[0].substring(0, 2).toUpperCase()
			return (mots[0][0] + mots[1][0]).toUpperCase()
})

/* ============================================================
 * NAVIGATION
 * ============================================================ */
const links = [
	{ name: 'Accueil',       path: '/dashboard',      icon: 'home' },
{ name: 'Rendez-vous',   path: '/rendez-vous',    icon: 'calendar' },
{ name: 'Mes Dossiers',  path: '/dossiers',       icon: 'folder' },
{ name: 'Statistiques',  path: '/stat',           icon: 'chart' },
{ name: 'Notifications', path: '/notifications',  icon: 'bell' },
{ name: 'Mon Compte',    path: '/mon-compte',     icon: 'user' }
]

const isActive = (link) => route.path === link.path

/* ============================================================
 * MENU PROFIL
 * ============================================================ */
const isProfileMenuOpen = ref(false)
const profileMenuRef    = ref(null)

const toggleProfileMenu = () => {
	isProfileMenuOpen.value = !isProfileMenuOpen.value
}

const closeProfileMenu = (event) => {
	if (profileMenuRef.value && !profileMenuRef.value.contains(event.target)) {
		isProfileMenuOpen.value = false
	}
}

const goToSettings = () => {
	isProfileMenuOpen.value = false
	toast.info('Paramètres bientôt disponibles')
}

/* ============================================================
 * DÉCONNEXION
 * ============================================================ */
const ismodalDeconnectShow = ref(false)

const showModalDeconnect = () => {
	isProfileMenuOpen.value = false
	ismodalDeconnectShow.value = true
}

const closeModalDeconnect = () => {
	ismodalDeconnectShow.value = false
}

const handleLogout = () => {
	try {
		const raw  = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
		const user = raw ? JSON.parse(raw) : null
		
		ismodalDeconnectShow.value = false
		
		const label = [user?.nom_raison_sociale, user?.prenom].filter(Boolean).join(' ')
		
		toast.success(label ? `${label} a été déconnecté` : 'Déconnexion réussie')
		
		disconnectSocket()
		localStorage.removeItem('token')
		localStorage.removeItem('currentUser')
		sessionStorage.removeItem('currentUser')
		
		router.push({ name: 'Login' })
	} catch (err) {
		toast.error(err?.message || 'Erreur de déconnexion')
	}
}

/* ============================================================
 * NOTIFICATIONS
 * ============================================================ */
const isNotificationOpen = ref(false)


const handleNewNotification = (notification) => {
	const nouvelleNotification = {
		...notification,
		date_creation:
		notification.date_creation ||
		notification.date_envoi ||
		new Date().toISOString(),
		statut_envoi: 'ENVOYE'
	}
	
	// ⭐ Utilise la fonction du composable — incrémente le compteur global
	ajouterNotification(nouvelleNotification)
	
	playSound('notification')
	toast.info(notification.contenu, { timeout: 6000 })
}

const setupNotificationSocket = () => {
	socket.off('notification:new', handleNewNotification)
	socket.on('notification:new', handleNewNotification)
}


const formatDate = (date) => {
	if (!date) return 'Date inconnue'
		const parsedDate = new Date(date)
		if (Number.isNaN(parsedDate.getTime())) return 'Date inconnue'
			return parsedDate.toLocaleString('fr-FR', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			})
}


const ouvrirNotification = (notification) => {
	lireNotification(notification)   // marque comme lu
	isNotificationOpen.value = false
	setTimeout(() => {
		router.push({
			name: 'ContribuableNotifications',
			query: { id: notification.id_notification }
		})
	}, 150)
}

/* ============================================================
 * MENU MOBILE
 * ============================================================ */
const isMobileMenuOpen = ref(false)

/* ============================================================
 * DATE DU JOUR
 * ============================================================ */
const todayLabel = new Date().toLocaleDateString('fr-FR', {
	weekday: 'long', day: 'numeric', month: 'long'
})

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	document.addEventListener('click', closeProfileMenu)
	await loadNotifications()
	setupNotificationSocket()
	connectSocket()
})

onUnmounted(() => {
	document.removeEventListener('click', closeProfileMenu)
	socket.off('notification:new', handleNewNotification)
})
</script>

<template>
<motion.header
:initial="{ y: -80, opacity: 0 }"
:animate="{ y: 0, opacity: 1 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
class="sticky top-0 z-40 border-b border-white/10 bg-[#0b2a5b]/95 backdrop-blur-md"
>
<div class="mx-auto max-w-[1600px] px-3 sm:px-6">
<div class="flex h-16 items-center justify-between gap-4">

<!-- ============================================================
LOGO
============================================================ -->
<RouterLink
to="/dashboard"
class="flex items-center gap-3 flex-shrink-0 group"
>
<motion.div
whileHover="{ scale: 1.05, rotate: 3 }"
	whileTap="{ scale: 0.95 }"
		:transition="{ type: 'spring', stiffness: 300, damping: 20 }"
		class="grid h-10 w-10 place-items-center rounded-xl font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25"
		>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
		</svg>
		</motion.div>
		
		<div class="hidden sm:block">
		<h1 class="text-sm font-bold leading-none text-white tracking-tight">
		SERVICES FISCAUX
		</h1>
		<p class="text-[11px] mt-0.5 text-blue-200/80">Portail Contribuable</p>
		</div>
		</RouterLink>
		
		<!-- ============================================================
		NAVIGATION DESKTOP
		============================================================ -->
		<nav class="hidden lg:flex items-center gap-1">
		<RouterLink
		v-for="link in links"
		:key="link.name"
		:to="link.path"
		class="relative px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
		:class="{ 'text-white bg-white/10': isActive(link) }"
		>
		{{ link.name }}
		
		<!-- Indicateur actif animé -->
		<motion.div
		v-if="isActive(link)"
		layout-id="header-active-pill"
		:transition="{ type: 'spring', stiffness: 400, damping: 30 }"
		class="absolute inset-0 rounded-lg bg-white/15 -z-10"
		></motion.div>
		</RouterLink>
		</nav>
		
		<!-- ============================================================
		ACTIONS DROITE
		============================================================ -->
		<div class="flex items-center gap-1.5 sm:gap-2">
		
		<!-- Date (desktop only) -->
		<div class="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-xs font-medium text-blue-100 capitalize">
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
		</svg>
		{{ todayLabel }}
		</div>
		
		<!-- ============================================================
		NOTIFICATIONS
		============================================================ -->
		<div class="relative flex-shrink-0">
		<motion.button
		@click="isNotificationOpen = !isNotificationOpen"
		:whileHover="{ scale: 1.05 }"
		:whileTap="{ scale: 0.95 }"
		class="relative grid h-10 w-10 place-items-center rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
		aria-label="Notifications"
		>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
		</svg>
		
		<!-- Badge -->
		<AnimatePresence>
		<motion.span
		v-if="unreadCount > 0"
		:initial="{ scale: 0 }"
		:animate="{ scale: 1 }"
		:exit="{ scale: 0 }"
		:transition="{ type: 'spring', stiffness: 400, damping: 18 }"
		class="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0b2a5b]"
		>
		{{ unreadCount > 99 ? '99+' : unreadCount }}
		</motion.span>
		</AnimatePresence>
		</motion.button>
		
		<!-- Dropdown notifications -->
		<AnimatePresence>
		<motion.div
		v-if="isNotificationOpen"
		:initial="{ opacity: 0, y: -8, scale: 0.97 }"
		:animate="{ opacity: 1, y: 0, scale: 1 }"
		:exit="{ opacity: 0, y: -8, scale: 0.97 }"
		:transition="{ duration: 0.18, ease: 'easeOut' }"
		class="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/10 overflow-hidden z-50"
		>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
		<div>
		<h3 class="text-sm font-bold text-[var(--text)]">Notifications</h3>
		<p class="text-[11px] text-[var(--text-muted)] mt-0.5">
		    <template v-if="unreadCount > 0">
		{{ unreadCount }} non lue{{ unreadCount > 1 ? 's' : '' }}
		</template>
		<template v-else>
		Vous êtes à jour ✨
		</template>
		</p>
		</div>
		
		<button
		@click="router.push('/notifications'); isNotificationOpen = false"
		class="text-xs font-semibold text-[var(--primary)] hover:underline"
		>
		Voir tout
		</button>
		</div>
		
		<!-- Liste -->
		<div class="max-h-[360px] overflow-y-auto">
		<div v-if="notifications.length === 0" class="px-5 py-10 text-center">
		<div class="w-12 h-12 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-3">
		<svg class="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
		d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
		</svg>
		</div>
		<p class="text-sm text-[var(--text-muted)]">Aucune notification</p>
		</div>
		
		<button
		v-for="notification in notifications.slice(0, 5)"
		:key="notification.id_notification"
		@click="ouvrirNotification(notification)"
		class="w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--hover)] transition-colors"
		:class="{ 'bg-[var(--primary)]/5': notification.statut_envoi !== 'LU' }"
		>
		<div class="flex gap-3">
		<!-- Icône -->
		<div
		class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
		:class="
		notification.type_notification?.includes('RDV')
		? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
		: 'bg-[var(--bg)] text-[var(--text-muted)]'
		"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
		</svg>
		</div>
		
		<div class="flex-1 min-w-0">
		<div class="flex items-start justify-between gap-2">
		<p
		class="text-sm text-[var(--text)] line-clamp-2"
		:class="notification.statut_envoi !== 'LU' ? 'font-semibold' : 'font-normal'"
		>
		{{ notification.contenu }}
		</p>
		
		<!-- Pastille non-lu -->
		<span
		v-if="notification.statut_envoi !== 'LU'"
		class="shrink-0 w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5"
		></span>
		</div>
		
		<p class="text-[11px] mt-1 text-[var(--text-muted)]">
		{{ formatDate(notification.date_creation) }}
		</p>
		</div>
		</div>
		</button>
		</div>
		</motion.div>
		</AnimatePresence>
		</div>
		
		<!-- ============================================================
		PROFIL
		============================================================ -->
		<div ref="profileMenuRef" class="relative flex-shrink-0">
		<motion.button
		@click="toggleProfileMenu"
		:whileHover="{ scale: 1.02 }"
		:whileTap="{ scale: 0.98 }"
		class="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-white/10"
		:class="isProfileMenuOpen ? 'bg-white/10' : ''"
		>
		<div
		class="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-md shadow-black/10"
		style="background: linear-gradient(135deg, var(--primary), #1d4ed8);"
		>
		{{ initialesUtilisateur }}
		</div>
		
		<span class="text-sm text-white font-medium hidden md:block max-w-[140px] truncate">
		{{ nomUtilisateur }}
		</span>
		
		<svg
		class="hidden md:block transition-transform text-blue-200"
		:class="{ 'rotate-180': isProfileMenuOpen }"
		width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
		>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
		</svg>
		</motion.button>
		
		<AnimatePresence>
		<motion.div
		v-if="isProfileMenuOpen"
		:initial="{ opacity: 0, y: -8, scale: 0.97 }"
		:animate="{ opacity: 1, y: 0, scale: 1 }"
		:exit="{ opacity: 0, y: -8, scale: 0.97 }"
		:transition="{ duration: 0.15, ease: 'easeOut' }"
		class="absolute right-0 mt-2 w-60 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/10 overflow-hidden origin-top-right z-50"
		>
		<!-- En-tête -->
		<div class="px-4 py-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50">
		<div class="flex items-center gap-3">
		<div
		class="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
		style="background: linear-gradient(135deg, var(--primary), #1d4ed8);"
		>
		{{ initialesUtilisateur }}
		</div>
		<div class="min-w-0">
		<p class="text-sm font-bold text-[var(--text)] truncate">
		{{ nomUtilisateur }}
		</p>
		<p class="text-[11px] mt-0.5 text-[var(--text-muted)] truncate">
		{{ currentUser?.email || 'Email non renseigné' }}
		</p>
		</div>
		</div>
		</div>
		
		<!-- Actions -->
		<div class="p-1.5">
		<button
		@click="goToSettings"
		class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-left text-[var(--text)] rounded-lg hover:bg-[var(--hover)] transition-colors"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
		</svg>
		Paramètres
		</button>
		</div>
		
		<!-- Déconnexion -->
		<div class="p-1.5 border-t border-[var(--border)]">
		<button
		@click="showModalDeconnect"
		class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-left text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
		</svg>
		Déconnexion
		</button>
		</div>
		</motion.div>
		</AnimatePresence>
		</div>
		
		<!-- ============================================================
		BURGER MOBILE
		============================================================ -->
		<motion.button
		@click="isMobileMenuOpen = !isMobileMenuOpen"
		:whileHover="{ scale: 1.05 }"
		:whileTap="{ scale: 0.95 }"
		class="grid h-10 w-10 place-items-center rounded-lg text-white lg:hidden hover:bg-white/10 transition-colors flex-shrink-0"
		aria-label="Menu"
		>
		<svg v-if="!isMobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
		</svg>
		<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
		</svg>
		</motion.button>
		</div>
		</div>
		</div>
		
		<!-- ============================================================
		MENU MOBILE
		============================================================ -->
		<AnimatePresence>
		<motion.nav
		v-if="isMobileMenuOpen"
		:initial="{ opacity: 0, height: 0 }"
		:animate="{ opacity: 1, height: 'auto' }"
		:exit="{ opacity: 0, height: 0 }"
		:transition="{ duration: 0.22, ease: 'easeOut' }"
		class="lg:hidden border-t border-white/10 bg-[#0b2a5b] overflow-hidden"
		>
		<div class="px-3 py-2 space-y-0.5">
		<RouterLink
		v-for="(link, i) in links"
		:key="link.name"
		:to="link.path"
		@click="isMobileMenuOpen = false"
		:class="[
		'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
isActive(link)
? 'bg-white/15 text-white'
: 'text-blue-100 hover:bg-white/10 hover:text-white'
]"
>
{{ link.name }}
</RouterLink>
</div>
</motion.nav>
</AnimatePresence>
</motion.header>

<!-- ============================================================
MODAL DÉCONNEXION
============================================================ -->
<DeconnectModal
:isOpen="ismodalDeconnectShow"
@close="closeModalDeconnect"
@deconnect="handleLogout"
/>
</template>
