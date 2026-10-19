<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'
import { socket } from '@/services/socket'

const router = useRouter()
const toast = useToast()

/* ============================================================
 * ÉTAT
 * ============================================================ */
const isLoading    = ref(true)
const isRefreshing = ref(false)
const stats        = ref(null)
const showAlertes  = ref(false)
const lastUpdate   = ref(null)

let refreshInterval = null
let debounceTimer   = null

/* ============================================================
 * CHARGEMENT
 * ============================================================ */
async function chargerStats() {
	const isFirstLoad = !stats.value
	if (isFirstLoad) isLoading.value = true
		else isRefreshing.value = true
			
			try {
				const { data } = await api.get('/stats/dashboard')
				stats.value = data?.data || null
				lastUpdate.value = new Date()
			} catch (error) {
				console.error('❌ Erreur stats :', error)
				if (isFirstLoad) {
					toast.error(
						error.response?.data?.message ||
						'Impossible de charger les statistiques.'
					)
				}
			} finally {
				if (isFirstLoad) isLoading.value = false
					isRefreshing.value = false
			}
}

/* ============================================================
 * POLLING
 * ============================================================ */
function demarrerPolling() {
	arreterPolling()   /* ⭐ évite les doublons */
	refreshInterval = setInterval(chargerStats, 30000)
}

function arreterPolling() {
	if (refreshInterval) {
		clearInterval(refreshInterval)
		refreshInterval = null
	}
}

function onVisibilityChange() {
	if (document.hidden) {
		arreterPolling()
	} else {
		chargerStats()
		demarrerPolling()
	}
}

/* ============================================================
 * SOCKET — temps réel avec debounce
 * ============================================================ */
function rechargerStatsDebounced() {
	if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			chargerStats()
		}, 500)
}

function onFileRefresh()   { rechargerStatsDebounced() }
function onDossierUpdated(){ rechargerStatsDebounced() }
function onAgentStatus()   { rechargerStatsDebounced() }

/* ============================================================
 * COMPUTED
 * ============================================================ */
const kpis = computed(() => {
	if (!stats.value) return []
		const s = stats.value
		
		return [
			{
				key: 'tickets',
				label: 'Tickets du jour',
				value: s.tickets.total,
				sub: `${s.tickets.termines} terminés · ${s.tickets.enAttente} en attente`,
				icon: 'ticket',
				tone: 'primary'
			},
			{
				key: 'attente',
				label: 'Temps d\'attente moyen',
				value: `${s.tempsAttenteMoyen} min`,
				sub: s.tempsAttenteMoyen > 20 ? 'Au-dessus de la cible' : 'Dans les normes',
				icon: 'clock',
				tone: s.tempsAttenteMoyen > 20 ? 'danger' : 'success'
			},
			{
				key: 'dossiers',
				label: 'Dossiers à vérifier',
				value: s.dossiers.soumis + s.dossiers.enVerification,
				sub: `${s.dossiers.aCompleter} à compléter`,
				icon: 'dossier',
				tone: 'warning'
			},
			{
				key: 'agents',
				label: 'Agents en ligne',
				value: `${s.agents.enLigne}/${s.agents.total}`,
				sub: `${s.agents.total - s.agents.enLigne} hors ligne`,
				icon: 'users',
				tone: 'success'
			}
		]
})

const maxAffluence = computed(() => {
	if (!stats.value?.affluence?.length) return 1
		return Math.max(...stats.value.affluence.map(a => a.count), 1)
})

const heuresRange = computed(() => {
	const map = new Map(
		(stats.value?.affluence || []).map(a => [a.heure, a.count])
	)
	const out = []
	for (let h = 8; h <= 17; h++) {
		out.push({ heure: h, count: map.get(h) || 0 })
	}
	return out
})

const alertesCount = computed(() => stats.value?.alertes?.length || 0)
const pendingCount = computed(() => stats.value?.pending?.total || 0)

/* ============================================================
 * NAVIGATION
 * ============================================================ */
function naviguer(route) {
	router.push(route)
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	await chargerStats()
	
	/* ⭐ Socket */
	
	socket.on('file:refresh', onFileRefresh)
	socket.on('dossier:updated', onDossierUpdated)
	socket.on('agent:online', onAgentStatus)
	socket.on('agent:offline', onAgentStatus)
	
	/* ⭐ Polling */
	demarrerPolling()
	document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
	if (debounceTimer) clearTimeout(debounceTimer)
		
		socket.off('file:refresh', onFileRefresh)
		socket.off('dossier:updated', onDossierUpdated)
		socket.off('agent:online', onAgentStatus)
		socket.off('agent:offline', onAgentStatus)
		
		arreterPolling()
		document.removeEventListener('visibilitychange', onVisibilityChange)
})

/* ============================================================
 * HELPERS
 * ============================================================ */
function initiales(a) {
	return `${(a.nom || '').charAt(0)}${(a.prenom || '').charAt(0)}`.toUpperCase() || '?'
}

function roleLabel(role) {
	return {
		CHEF_CENTRE: 'Chef de centre',
		GUICHETIER: 'Guichetier',
		VERIFICATEUR: 'Vérificateur'
	}[role] || role
}

function heureActuelle() {
	return new Date().toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit'
	})
}

function dateAujourdhui() {
	return new Date().toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	})
}

const TONE_CLASSES = {
	primary: {
		bg: 'bg-blue-500/10 dark:bg-blue-500/15',
		text: 'text-blue-600 dark:text-blue-400',
		ring: 'ring-blue-500/20'
	},
	success: {
		bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
		text: 'text-emerald-600 dark:text-emerald-400',
		ring: 'ring-emerald-500/20'
	},
	warning: {
		bg: 'bg-orange-500/10 dark:bg-orange-500/15',
		text: 'text-orange-600 dark:text-orange-400',
		ring: 'ring-orange-500/20'
	},
	danger: {
		bg: 'bg-red-500/10 dark:bg-red-500/15',
		text: 'text-red-600 dark:text-red-400',
		ring: 'ring-red-500/20'
	}
}

function toneClass(tone) {
	return TONE_CLASSES[tone] || TONE_CLASSES.primary
}
</script>

<template>
<div class="min-h-screen bg-[var(--bg)] text-[var(--text)]">

<!-- ============================================================
* CONTENU
* ============================================================ -->
<main class="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 space-y-6">

<!-- Loading -->
<div v-if="isLoading && !stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div v-for="n in 4" :key="n" class="h-32 rounded-2xl bg-[var(--card)] animate-pulse"></div>
</div>

<template v-else-if="stats">

<!-- ============================================================
* KPI
* ============================================================ -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<motion.div
v-for="(kpi, i) in kpis"
:key="kpi.key"
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.35, delay: i * 0.06 }"
:whileHover="{ y: -3 }"
class="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-lg hover:shadow-black/5"
>
<div
:class="[
'absolute -right-6 -top-6 w-24 h-24 rounded-full pointer-events-none',
toneClass(kpi.tone).bg
]"
></div>

<div class="relative flex items-start justify-between gap-3">
<div class="min-w-0">
<p class="text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
{{ kpi.label }}
</p>
<p class="text-3xl font-black text-[var(--text)] mt-2 tabular-nums leading-none">
{{ kpi.value }}
</p>
<p class="text-[11px] text-[var(--text-muted)] mt-2 truncate">
{{ kpi.sub }}
</p>
</div>

<div
:class="[
'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1',
toneClass(kpi.tone).bg,
toneClass(kpi.tone).text,
toneClass(kpi.tone).ring
]"
>
<svg v-if="kpi.icon === 'ticket'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
</svg>
<svg v-else-if="kpi.icon === 'clock'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<svg v-else-if="kpi.icon === 'dossier'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
<svg v-else-if="kpi.icon === 'users'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
</svg>
</div>
</div>
</motion.div>
</div>

<!-- ============================================================
* GRILLE PRINCIPALE
* ============================================================ -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

<!-- Colonne principale (2/3) -->
<div class="lg:col-span-2 space-y-6">

<!-- Graphique d'affluence -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.25 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
>
<div class="flex items-start justify-between gap-3 mb-6">
<div>
<h3 class="text-base font-bold text-[var(--text)]">Affluence par heure</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Tickets générés aujourd'hui · {{ stats.tickets.total }} au total
</p>
</div>
<div class="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
<span class="flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
Heure normale
</span>
<span class="flex items-center gap-1.5">
<span class="w-2 h-2 rounded-full bg-orange-500"></span>
Pic
</span>
</div>
</div>

<div class="flex items-end justify-between h-48 gap-1.5">
<div
v-for="(h, i) in heuresRange"
:key="h.heure"
class="flex flex-col items-center gap-2 flex-1 group"
>
<div class="relative w-full flex justify-center h-full items-end">
<span
class="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-[var(--card)] border border-[var(--border)] px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10 text-[var(--text)]"
>
{{ h.count }} tickets
</span>
<motion.div
:initial="{ height: 0 }"
:animate="{ height: `${(h.count / maxAffluence) * 100}%` }"
:transition="{ duration: 0.8, delay: 0.3 + i * 0.04, ease: 'easeOut' }"
:class="[
'w-full max-w-[32px] rounded-t-lg transition-colors',
h.count === maxAffluence && h.count > 0
? 'bg-gradient-to-t from-orange-500 to-orange-400'
: 'bg-gradient-to-t from-[var(--primary)] to-blue-400'
]"
:style="{ minHeight: h.count > 0 ? '8px' : '2px' }"
></motion.div>
</div>
<span class="text-[10px] text-[var(--text-muted)] font-medium tabular-nums">
{{ String(h.heure).padStart(2, '0') }}h
</span>
</div>
</div>
</motion.div>

<!-- Activité des agents -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.35 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
>
<div class="p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between gap-3">
<div>
<h3 class="text-base font-bold text-[var(--text)]">Activité des agents</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Aujourd'hui · classement par tickets traités
</p>
</div>
<button
@click="naviguer('/dashAgent/user_space')"
class="text-xs font-bold text-[var(--primary)] hover:underline"
>
Voir tout →
</button>
</div>

<div v-if="!stats.activiteAgents?.length" class="p-8 text-center text-sm text-[var(--text-muted)]">
Aucune activité enregistrée pour le moment.
</div>

<div v-else class="divide-y divide-[var(--border)]">
<div
v-for="a in stats.activiteAgents"
:key="a.id"
class="flex items-center gap-3 p-4 hover:bg-[var(--hover)] transition"
>
<div class="relative shrink-0">
<img
v-if="a.photo_base64"
:src="`data:${a.photo_content_type};base64,${a.photo_base64}`"
class="w-10 h-10 rounded-full object-cover"
/>
<div
v-else
class="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs"
>
{{ initiales(a) }}
</div>
<span
:class="[
'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--card)]',
a.is_online ? 'bg-emerald-500' : 'bg-slate-400'
]"
></span>
</div>

<div class="min-w-0 flex-1">
<p class="text-sm font-bold text-[var(--text)] truncate">
{{ a.nom }} {{ a.prenom }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
{{ roleLabel(a.role) }}
</p>
</div>

<div class="text-center shrink-0">
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
Traités
</p>
<p class="text-base font-black text-[var(--text)] tabular-nums">
{{ a.tickets_traites }}
</p>
</div>

<div class="text-center shrink-0 hidden sm:block">
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
Moy.
</p>
<p class="text-base font-black text-[var(--text)] tabular-nums">
{{ a.temps_moyen ? `${a.temps_moyen}min` : '—' }}
</p>
</div>

<span
:class="[
'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
a.is_online
? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
: 'bg-slate-500/10 text-slate-500'
]"
>
{{ a.is_online ? 'En ligne' : 'Hors ligne' }}
</span>
</div>
</div>
</motion.div>
</div>

<!-- Colonne droite (1/3) -->
<div class="space-y-6">

<!-- Actions rapides -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.3 }"
class="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#1e3a5f] to-[#0f1f33] p-5 sm:p-6 text-white overflow-hidden relative"
>
<div class="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>

<h3 class="relative text-base font-bold mb-1">Actions de gestion</h3>
<p class="relative text-xs text-white/60 mb-5">
Accès rapide aux modules essentiels
</p>

<div class="relative space-y-2">
<button
@click="naviguer('/dashAgent/guichet_list')"
class="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-left group"
>
<div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
<svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
</svg>
</div>
<div class="flex-1 min-w-0">
<p class="text-sm font-bold truncate">Supervision guichets</p>
<p class="text-[10px] text-white/60">Ouvrir, fermer, réassigner</p>
</div>
<svg class="w-4 h-4 text-white/40 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>

<button
@click="naviguer('/dashAgent/dossiers')"
class="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-left group"
>
<div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
<svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<div class="flex-1 min-w-0">
<p class="text-sm font-bold truncate">Vérification dossiers</p>
<p class="text-[10px] text-white/60">
{{ stats.dossiers.soumis + stats.dossiers.enVerification }} en attente
</p>
</div>
<svg class="w-4 h-4 text-white/40 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>

<button
@click="naviguer('/dashAgent/user_space')"
class="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-left group"
>
<div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
<svg class="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
</svg>
</div>
<div class="flex-1 min-w-0">
<p class="text-sm font-bold truncate">Comptes utilisateurs</p>
<p class="text-[10px] text-white/60">
{{ pendingCount > 0 ? `${pendingCount} à valider` : 'Tout à jour' }}
</p>
</div>
<svg class="w-4 h-4 text-white/40 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>

<button
@click="naviguer('/dashAgent/service_fiscal')"
class="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-left group"
>
<div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
<svg class="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
</svg>
</div>
<div class="flex-1 min-w-0">
<p class="text-sm font-bold truncate">Services fiscaux</p>
<p class="text-[10px] text-white/60">Configurer les services</p>
</div>
<svg class="w-4 h-4 text-white/40 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>
</div>
</motion.div>

<!-- Répartition dossiers -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.4 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
>
<h3 class="text-base font-bold text-[var(--text)]">Répartition des dossiers</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5 mb-5">
<!-- ⭐ CORRECTIF : stats.dossiers reflète maintenant l'état global
(backlog réel), plus seulement les dossiers déposés aujourd'hui.
Le volume du jour est affiché séparément ci-dessous. -->
{{ stats.dossiers.total }} dossiers au total · {{ stats.dossiersPredepositesAujourdhui }} déposé(s) aujourd'hui
</p>

<div class="space-y-3">
<div
v-for="d in [
{ label: 'En vérification', value: stats.dossiers.enVerification, color: 'bg-indigo-500' },
{ label: 'À compléter', value: stats.dossiers.aCompleter, color: 'bg-orange-500' },
{ label: 'Validés', value: stats.dossiers.valides, color: 'bg-emerald-500' },
{ label: 'Rejetés', value: stats.dossiers.rejetes, color: 'bg-red-500' }
]"
:key="d.label"
>
<div class="flex items-center justify-between text-xs mb-1.5">
<span class="font-medium text-[var(--text-muted)]">{{ d.label }}</span>
<span class="font-bold text-[var(--text)] tabular-nums">{{ d.value }}</span>
</div>
<div class="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
<motion.div
:initial="{ width: 0 }"
:animate="{ width: stats.dossiers.total > 0 ? `${(d.value / stats.dossiers.total) * 100}%` : '0%' }"
:transition="{ duration: 0.7, delay: 0.5 }"
:class="['h-full rounded-full', d.color]"
></motion.div>
</div>
</div>
</div>
</motion.div>
</div>
</div>
</template>

<!-- Erreur -->
<div v-else class="rounded-2xl bg-red-500/10 border border-red-500/20 p-12 text-center">
<svg class="w-12 h-12 mx-auto text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>
<p class="text-sm font-bold text-red-600 dark:text-red-400">Impossible de charger les statistiques</p>
<button
@click="chargerStats"
class="mt-4 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-blue-600 transition"
>
Réessayer
</button>
</div>
</main>
</div>
</template>
