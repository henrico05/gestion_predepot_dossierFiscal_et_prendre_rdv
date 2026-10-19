<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { motion } from 'motion-v'
import { RouterLink } from 'vue-router'
import gsap from 'gsap'
import api from '@/api/Axios'
import { useNotifications } from '@/composables/useNotifications'
import { socket, connectSocket } from '@/services/socket'

function currentUser() {
	try {
		return JSON.parse(localStorage.getItem('currentUser') || '{}')
	} catch {
		return {}
	}
}

const user = currentUser()
const idContribuable = user.id_contribuable || user.id
const displayName = user.prenom || user.nom_raison_sociale || 'Contribuable'

const loading = ref(true)
const errorMessage = ref('')
const rdvs = ref([])
const dossiers = ref([])
const { unreadCount, loadNotifications } = useNotifications()

const TICKET_ACTIF = ['RESERVE', 'EN_ATTENTE', 'APPELE', 'EN_COURS']
const RDV_ACTIF = ['EN_ATTENTE', 'CONFIRME']

const today = () =>
new Date().toLocaleDateString('en-CA', { timeZone: 'Indian/Antananarivo' })

function rdvKey(r) {
	return `${String(r.date_rdv).slice(0, 10)}T${String(r.heure_rdv).slice(0, 8)}`
}

const upcomingRdvs = computed(() => {
	const d = today()
	return [...rdvs.value]
	.filter((r) => RDV_ACTIF.includes(r.statut_rdv) && String(r.date_rdv).slice(0, 10) >= d)
	.sort((a, b) => rdvKey(a).localeCompare(rdvKey(b)))
	.slice(0, 4)
})

const recentDossiers = computed(() =>
[...dossiers.value]
.sort((a, b) => String(b.date_predepot || '').localeCompare(String(a.date_predepot || '')))
.slice(0, 4)
)

const ticketEnCours = computed(() =>
rdvs.value.find((r) => r.ticket && TICKET_ACTIF.includes(r.ticket.statut_ticket)) || null
)

const stats = computed(() => [
	{
		label: 'Rendez-vous',
		value: upcomingRdvs.value.length,
		to: '/rendez-vous',
		icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		color: 'blue'
	},
	{
		label: 'Dossiers',
		value: dossiers.value.length,
		to: '/dossiers',
		icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
		color: 'green'
	},
	{
		label: 'Notifications',
		value: unreadCount.value || 0,
		to: '/notifications',
		icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
		color: 'orange'
	},
	{
		label: 'Ticket en cours',
		value: ticketEnCours.value ? 1 : 0,
		to: ticketEnCours.value,
		icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
		color: 'purple'
	}
])

const colorClasses = {
	blue: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
	green: { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
	orange: { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
	purple: { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' }
}

function rdvLabel(s) {
	return ({ EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé', ANNULE: 'Annulé', HONORE: 'Honoré', ABSENT: 'Absent' }[s] || s)
}
function dossierLabel(s) {
	return ({
		BROUILLON: 'Brouillon', SOUMIS: 'Soumis', EN_VERIFICATION: 'En vérification',
		A_COMPLETER: 'À compléter', VALIDE: 'Validé', REJETE: 'Rejeté', CLOTURE: 'Clôturé'
	}[s] || s)
}
function rdvChip(s) {
	if (s === 'CONFIRME') return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
		if (s === 'EN_ATTENTE') return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
			return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
}
function dossierChip(s) {
	if (s === 'VALIDE' || s === 'SOUMIS') return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
		if (s === 'EN_VERIFICATION' || s === 'A_COMPLETER') return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
			if (s === 'REJETE') return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
				return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
}
function fmtDate(v) {
	if (!v) return '—'
		return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtHeure(v) {
	return String(v || '').slice(0, 5) || '—'
}

function mine(payload) {
	if (!payload || payload.id_contribuable == null) return true
		return Number(payload.id_contribuable) === Number(idContribuable)
}

function upsertRdv(payload) {
	if (!payload?.id_rdv || !mine(payload)) return
		const i = rdvs.value.findIndex((r) => Number(r.id_rdv) === Number(payload.id_rdv))
		if (i === -1) {
			rdvs.value = [payload, ...rdvs.value]
			return
		}
		const prev = rdvs.value[i]
		rdvs.value[i] = {
			...prev,
			...payload,
			service: payload.service || prev.service,
			ticket: payload.ticket
			? { ...(prev.ticket || {}), ...payload.ticket }
			: payload.numero_ticket
			? {
				...(prev.ticket || {}),
				numero_ticket: payload.numero_ticket,
				statut_ticket: payload.statut_ticket || prev.ticket?.statut_ticket
			}
			: prev.ticket
		}
}

function upsertDossier(payload) {
	if (!payload?.id_dossier || !mine(payload)) return
		const i = dossiers.value.findIndex((d) => Number(d.id_dossier) === Number(payload.id_dossier))
		if (i === -1) dossiers.value = [payload, ...dossiers.value]
			else dossiers.value[i] = { ...dossiers.value[i], ...payload }
}

function onFileUpdated(payload) {
	const idRdv = payload?.id_rdv || payload?.ticket?.id_rdv
	if (!idRdv) return
		const i = rdvs.value.findIndex((r) => Number(r.id_rdv) === Number(idRdv))
		if (i === -1) return
			rdvs.value[i] = {
				...rdvs.value[i],
				ticket: {
					...(rdvs.value[i].ticket || {}),
					...(payload.ticket || {})
				}
			}
}

async function load() {
	if (!idContribuable) {
		errorMessage.value = 'Session contribuable introuvable.'
		loading.value = false
		return
	}
	loading.value = true
	errorMessage.value = ''
	try {
		const [rdvRes, dosRes] = await Promise.all([
			api.get(`/rendez-vous/contribuable/${idContribuable}`),
												   api.get('/dossiers/mes'),
												   loadNotifications().catch(() => null)
		])
		rdvs.value = rdvRes.data?.data || []
		dossiers.value = dosRes.data?.data || []
	} catch (e) {
		errorMessage.value = e.response?.data?.message || 'Impossible de charger le tableau de bord.'
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	connectSocket()
	await load()
	
	socket.on('rdv:created', upsertRdv)
	socket.on('rdv:updated', upsertRdv)
	socket.on('dossier:updated', upsertDossier)
	socket.on('file:updated', onFileUpdated)
	socket.on('notification:new', loadNotifications)
	
	const ctx = gsap.context(() => {
		gsap.fromTo('.stat-card', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' })
		gsap.fromTo('.list-card', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, delay: 0.2, ease: 'power3.out' })
	})
	
	onUnmounted(() => {
		ctx.revert()
		socket.off('rdv:created', upsertRdv)
		socket.off('rdv:updated', upsertRdv)
		socket.off('dossier:updated', upsertDossier)
		socket.off('file:updated', onFileUpdated)
		socket.off('notification:new', loadNotifications)
	})
})
</script>

<template>
<div class="p-5 sm:p-8 min-h-[calc(100vh-64px)] overflow-y-auto" style="background-color: var(--bg);">
<motion.div
:initial="{ opacity: 0, y: -12 }"
:animate="{ opacity: 1, y: 0 }"
class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8"
>
<div>
<h1 class="text-2xl sm:text-3xl font-bold" style="color: var(--text);">Bonjour, {{ displayName }}</h1>
<p class="mt-1 text-sm" style="color: var(--text-muted);">Bienvenue sur votre espace personnel.</p>
</div>
<RouterLink
to="/rendez-vous"
class="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
style="background: var(--primary);"
>Prendre un rendez-vous</RouterLink>
</motion.div>

<p v-if="errorMessage" class="mb-4 text-sm text-red-600">{{ errorMessage }}</p>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
<div
v-for="stat in stats"
:key="stat.label"
class="stat-card p-5 sm:p-6 rounded-xl border flex justify-between items-center"
:style="{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }"
>
<div>
<p class="text-sm mb-1" style="color: var(--text-muted);">{{ stat.label }}</p>
<p class="text-3xl font-bold" style="color: var(--text);">{{ loading ? '—' : stat.value }}</p>
<RouterLink :to="stat.to" class="text-xs font-medium mt-2 inline-flex hover:underline" style="color: var(--primary);">
Voir tout
</RouterLink>
</div>
<div :class="['p-3 rounded-full', colorClasses[stat.color].bg, colorClasses[stat.color].text]">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="stat.icon" />
</svg>
</div>
</div>
</div>

<div
v-if="ticketEnCours"
class="mb-6 p-4 rounded-xl border"
style="background: var(--bgListCard); border-color: var(--borderListCard); color: var(--textListCard);"
>
<p class="text-xs font-bold uppercase tracking-wider">Ticket en file</p>
<p class="text-lg font-bold mt-1">{{ ticketEnCours.ticket.numero_ticket }} · {{ ticketEnCours.ticket.statut_ticket }}</p>
<p class="text-sm mt-1">
{{ ticketEnCours.service?.libelle_service }} · {{ fmtDate(ticketEnCours.date_rdv) }} à {{ fmtHeure(ticketEnCours.heure_rdv) }}
</p>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
<div class="list-card p-5 sm:p-6 rounded-xl border" style="background-color: var(--bgListCard); border-color: var(--borderListCard);">
<div class="flex justify-between items-center mb-4">
<h3 class="font-bold text-lg" style="color: var(--textListCard);">Prochains rendez-vous</h3>
<RouterLink to="/rendez-vous" class="text-xs font-semibold hover:underline" style="color: var(--textListCard);">Voir tout →</RouterLink>
</div>
<div v-if="loading" class="space-y-3">
<div v-for="n in 3" :key="n" class="h-16 rounded-lg animate-pulse" style="background: var(--card);" />
</div>
<div v-else-if="upcomingRdvs.length" class="space-y-3">
<RouterLink
v-for="appt in upcomingRdvs"
:key="appt.id_rdv"
 to="/rendez-vous"
class="block p-4 rounded-lg border"
:style="{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }"
>
<div class="flex justify-between items-center gap-3">
<div class="min-w-0">
<p class="font-semibold truncate" style="color: var(--text);">{{ appt.service?.libelle_service || 'Rendez-vous' }}</p>
<p class="text-xs mt-1" style="color: var(--text-muted);">{{ fmtDate(appt.date_rdv) }} · {{ fmtHeure(appt.heure_rdv) }}</p>
</div>
<span :class="['px-3 py-1 rounded-full text-xs font-bold flex-shrink-0', rdvChip(appt.statut_rdv)]">
{{ rdvLabel(appt.statut_rdv) }}
</span>
</div>
</RouterLink>
</div>
<p v-else class="text-sm text-center py-6" style="color: var(--text-muted);">Aucun rendez-vous à venir.</p>
</div>

<div class="list-card p-5 sm:p-6 rounded-xl border" style="background-color: var(--bgListCard); border-color: var(--borderListCard);">
<div class="flex justify-between items-center mb-4">
<h3 class="font-bold text-lg" style="color: var(--textListCard);">Derniers dossiers</h3>
<RouterLink to="/dossiers" class="text-xs font-semibold hover:underline" style="color: var(--textListCard);">Voir tout →</RouterLink>
</div>
<div v-if="loading" class="space-y-3">
<div v-for="n in 3" :key="'d'+n" class="h-16 rounded-lg animate-pulse" style="background: var(--card);" />
</div>
<div v-else-if="recentDossiers.length" class="space-y-3">
<RouterLink
v-for="folder in recentDossiers"
:key="folder.id_dossier"
 to="/dossiers"
class="block p-4 rounded-lg border"
:style="{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }"
>
<div class="flex justify-between items-center gap-3">
<div class="min-w-0">
<p class="font-bold text-sm truncate" style="color: var(--text);">{{ folder.reference_dossier }}</p>
<p class="text-xs mt-1 truncate" style="color: var(--text-muted);">{{ folder.service?.libelle_service }}</p>
</div>
<span :class="['px-3 py-1 rounded-full text-xs font-bold flex-shrink-0', dossierChip(folder.statut_dossier)]">
{{ dossierLabel(folder.statut_dossier) }}
</span>
</div>
</RouterLink>
</div>
<p v-else class="text-sm text-center py-6" style="color: var(--text-muted);">Aucun dossier pour le moment.</p>
</div>
</div>
</div>
</template>
