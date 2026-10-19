<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useElectron } from '../../composables/useElectron.js'
import api from '@/api/Axios'
import { socket } from '@/services/socket'

defineProps({
	isDark: Boolean
})

const emit = defineEmits(['toggle-theme'])
const { isMaximized, minimize, maximize, close } = useElectron()

/* ============================================================
 * INFOS AGENT
 * ============================================================ */
const user  = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
const agent = user ? JSON.parse(user) : {}

const matricule = ref(agent?.matricule || '—')

const watchRoleAgent = computed(() => {
	switch (agent?.role) {
		case 'CHEF_CENTRE':  return 'Chef de service'
		case 'GUICHETIER':   return 'Agent de guichet'
		case 'VERIFICATEUR': return 'Agent Vérificateur'
		default:             return 'Rôle vide'
	}
})

const getLogo = computed(() => {
	switch (agent?.role) {
		case 'CHEF_CENTRE':  return 'CS'
		case 'GUICHETIER':   return 'AG'
		case 'VERIFICATEUR': return 'AV'
		default:             return '?'
	}
})

const nomComplet = computed(() => {
	const parts = [agent?.prenom, agent?.nom].filter(Boolean)
	return parts.join(' ') || 'Utilisateur'
})

const initiales = computed(() => {
	const p = (agent?.prenom || '').charAt(0).toUpperCase()
	const n = (agent?.nom || '').charAt(0).toUpperCase()
	return `${p}${n}` || '?'
})

const photoAgent = computed(() => {
	const base64 = agent?.photo || agent?.photo_base64
	if (!base64) return null
		
		/* Détection automatique du type MIME depuis la signature base64 */
		let mime = 'image/jpeg'   /* par défaut */
		
		if (base64.startsWith('/9j/'))       mime = 'image/jpeg'
			else if (base64.startsWith('iVBOR')) mime = 'image/png'
				else if (base64.startsWith('R0lGO')) mime = 'image/gif'
					else if (base64.startsWith('UklGR')) mime = 'image/webp'
						
						return `data:${mime};base64,${base64}`
})

/* ============================================================
 * ⭐ HORLOGE — Heure exacte Madagascar (GMT+3)
 * ============================================================ */
const heureActuelle = ref('')
let clockInterval = null

/* Récupère l'heure à Indian/Antananarivo (GMT+3) */
function mettreAJourHeure() {
	heureActuelle.value = new Date().toLocaleTimeString('fr-FR', {
		timeZone: 'Indian/Antananarivo',
		hour:   '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
}

/* Découpe "14:23:45" en blocs */
const heureParts = computed(() => {
	const parts = (heureActuelle.value || '00:00:00').split(':')
	return {
		h: parts[0] || '00',
		m: parts[1] || '00',
		s: parts[2] || '00'
	}
})

//=====================================================================
// GESTION DE NOTIFICATIONS
//=====================================================================

const estChef = computed(() => agent?.role === 'CHEF_CENTRE')

const notifs = ref([])
const unread = ref(0)
const panneauOuvert = ref(false)
const chargementNotif = ref(false)

async function chargerNotifications() {
	if (!estChef.value) return
		chargementNotif.value = true
		try {
			const { data } = await api.get('/notifications/chef')
			notifs.value = data.data || []
			unread.value = data.unread || 0
		} catch (e) {
			console.error('Notifs chef :', e)
		} finally {
			chargementNotif.value = false
		}
}

async function marquerLue(n) {
	if (n.lu) return
		try {
			await api.patch(`/notifications/chef/${n.id_notification}/lire`)
			n.lu = true
			unread.value = Math.max(0, unread.value - 1)
		} catch {}
}

async function toutLire() {
	try {
		await api.patch('/notifications/chef/lire-toutes')
		notifs.value.forEach((n) => { n.lu = true })
		unread.value = 0
	} catch {}
}

function iconeActeur(type) {
	if (type === 'CONTRIBUABLE') return 'C'
		if (type === 'SYSTEME') return 'S'
			return 'A'
}

function tempsRelatif(date) {
	if (!date) return ''
		const diff = (Date.now() - new Date(date).getTime()) / 1000
		if (diff < 60) return 'à l’instant'
			if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
				if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
					return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function onClickOutside(e) {
	if (!e.target.closest('.notif-wrap')) panneauOuvert.value = false
}


onMounted(() => {
	
	if (estChef.value) {
		chargerNotifications()
		socket.on('chef:notification', (n) => {
			notifs.value.unshift({ ...n, lu: false })
			unread.value += 1
		})
	}
	document.addEventListener('click', onClickOutside)
	
	mettreAJourHeure()
	clockInterval = setInterval(mettreAJourHeure, 1000)
	
})

onUnmounted(() => {
		socket.off('chef:notification')
		document.removeEventListener('click', onClickOutside)
		if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
<header class="bg-[#0B2559] text-white flex flex-col gap-y-2">

<!-- ============================================================
* BARRE SUPÉRIEURE (déplaçable)
* ============================================================ -->
<div
class="w-full h-9 px-3 my-2 relative flex justify-between items-center select-none"
style="-webkit-app-region: drag;"
>
<div class="mt-2.5 px-5 py-8 flex items-center gap-2" style="-webkit-app-region: no-drag;">
<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
</svg>
<div class="text-sm leading-tight">
<p class="font-semibold">République de Madagascar</p>
<p class="text-xs text-gray-300 mb-1">Impôts - Service Public</p>
<div class="flex h-1.5 w-20 overflow-hidden rounded-sm">
<div class="w-1/3 bg-white"></div>
<div class="w-1/3 bg-red-600"></div>
<div class="w-1/3 bg-green-600"></div>
</div>
</div>
</div>

<div class="window-controls right-4 top-8" style="-webkit-app-region: no-drag;">
<button class="control-btn theme-btn hover:bg-white/10" @click="emit('toggle-theme')"
:title="isDark ? 'Mode clair' : 'Mode sombre'">
<svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<circle cx="12" cy="12" r="5"/>
<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>
<svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>
</button>

<button class="control-btn" @click="minimize" title="Réduire">
<svg width="12" height="12" viewBox="0 0 12 12">
<rect y="5" width="12" height="1.5" fill="currentColor"/>
</svg>
</button>

<button class="control-btn" @click="maximize" title="Agrandir">
<svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
<rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<svg v-else width="12" height="12" viewBox="0 0 12 12">
<path d="M3.5 1.5h7v7h-1.5v-5.5h-5.5z" fill="currentColor"/>
<rect x="1.5" y="3.5" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
</button>

<button class="control-btn close" @click="close" title="Fermer">
<svg width="12" height="12" viewBox="0 0 12 12">
<path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>
</button>
</div>
</div>

<!-- ============================================================
* BARRE PRINCIPALE
* ============================================================ -->
<div class="flex justify-between items-center px-6 py-4 border-t border-b border-white/10">

<!-- GAUCHE : Logo -->
<div class="flex items-center gap-3">
<svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 18l10-5-5-2.5-5 2.5z"/>
</svg>
<div class="leading-tight">
<h1 class="text-2xl font-serif font-bold tracking-widest">IMPOTS</h1>
<p class="text-xs tracking-widest text-gray-300 -mt-1">— MANAKARA —</p>
</div>
</div>

<!-- DROITE : Horloge + Notif + Agent -->
<div class="flex items-center gap-6 text-sm">

<!-- ⭐ HORLOGE MADAGASCAR GMT+3 — style calculatrice -->
<div class="flex items-center gap-1 px-3 py-1.5">

<!-- HH -->
<span class="font-calculator-dots text-3xl  font-bold tabular-nums
tracking-widest leading-none">
{{ heureParts.h }}
</span>


<span class="font-calculator-dots text-4xl leading-none ">:</span>

<!-- MM -->
<span class=" font-calculator-dots text-3xl tabular-nums
tracking-widest leading-none">
{{ heureParts.m }}
</span>


<span class="font-calculator-dots text-3xl leading-none">:</span>

<!-- SS -->
<span class=" font-calculator-dots text-3xl tabular-nums 
tracking-widest leading-none">
{{ heureParts.s }}
</span>
</div>

<!-- Notifications -->
<div v-if="estChef" class="notif-wrap relative" style="-webkit-app-region: no-drag;">
<button class="p-2 hover:bg-white/10 rounded-full relative" @click.stop="panneauOuvert = !panneauOuvert">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
</svg>
<span
v-if="unread > 0"
class="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center"
>{{ unread > 99 ? '99+' : unread }}</span>
</button>

<div
v-if="panneauOuvert"
class="notif-panel"
>
<div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
<p class="text-sm font-semibold">Activité du centre</p>
<button
v-if="unread > 0"
class="text-[11px] text-cyan-300 hover:underline"
@click="toutLire"
>Tout marquer lu</button>
</div>

<div class="max-h-80 overflow-y-auto">
<p v-if="chargementNotif" class="px-4 py-6 text-xs text-gray-400 text-center">Chargement…</p>
<p v-else-if="!notifs.length" class="px-4 py-6 text-xs text-gray-400 text-center">Aucune notification</p>

<button
v-for="n in notifs"
:key="n.id_notification"
class="notif-item"
:class="{ 'is-unread': !n.lu }"
@click="marquerLue(n)"
>
<span class="acteur-badge" :data-type="n.type_acteur">{{ iconeActeur(n.type_acteur) }}</span>
<div class="min-w-0 flex-1 text-left">
<p class="text-[12px] leading-snug text-white/90">{{ n.contenu }}</p>
<p class="text-[10px] text-gray-400 mt-0.5">
{{ n.type_acteur }} · {{ tempsRelatif(n.date_creation) }}
</p>
</div>
</button>
</div>
</div>
</div>

<!-- Bloc agent -->
<div class="flex items-center gap-2 cursor-pointer">
<div class="relative shrink-0">
<img
v-if="photoAgent"
:src="photoAgent"
alt="Photo agent"
class="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
/>
<div
v-else
class="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600
flex items-center justify-center font-bold text-xs text-white
border border-cyan-400/40"
>
{{ initiales }}
</div>
<span class="absolute -bottom-0 -right-0 status-dot"></span>
</div>

<div class="text-left leading-tight">
<p class="font-medium text-[13px] truncate max-w-[140px]">
{{ nomComplet }}
</p>
<p class="text-[10px] text-cyan-300 truncate max-w-[140px]">
{{ watchRoleAgent }}
</p>
<p class="text-[10px] text-gray-400 font-mono">
{{ matricule }}
</p>
</div>
</div>
</div>
</div>
</header>
</template>

<style>
   
   .status-dot {
	   width: 8px;
	   height: 8px;
	   background: #22c55e;
	   border-radius: 50%;
	   box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
   }
   
   .notif-wrap { position: relative; }
   .notif-panel {
	   position: absolute;
	   right: 0;
	   top: calc(100% + 8px);
	   width: 360px;
	   max-width: min(360px, 90vw);
	   background: #0f2748;
	   border: 1px solid rgba(255,255,255,0.12);
	   border-radius: 12px;
	   box-shadow: 0 18px 40px rgba(0,0,0,0.35);
	   z-index: 80;
   }
   .notif-item {
	   width: 100%;
	   display: flex;
	   gap: 10px;
	   padding: 10px 14px;
	   border-bottom: 1px solid rgba(255,255,255,0.06);
   }
   .notif-item.is-unread { background: rgba(34, 211, 238, 0.08); }
   .notif-item:hover { background: rgba(255,255,255,0.06); }
   .acteur-badge {
	   width: 22px; height: 22px; border-radius: 6px;
	   display: grid; place-items: center;
	   font-size: 10px; font-weight: 800; flex-shrink: 0;
	   background: #334155; color: #fff;
   }
   .acteur-badge[data-type="CONTRIBUABLE"] { background: #0369a1; }
   .acteur-badge[data-type="AGENT"] { background: #7c3aed; }
   .acteur-badge[data-type="SYSTEME"] { background: #b45309; }

</style>
