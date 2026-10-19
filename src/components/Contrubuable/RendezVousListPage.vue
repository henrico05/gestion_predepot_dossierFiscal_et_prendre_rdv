<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import gsap from 'gsap'
import RendezVousDetailPanel from '@/components/Contrubuable/rdv/RendezVousDetailPanel.vue'
import PriseRendezVousStepper from '@/components/Contrubuable/priseRendezVous.vue'
import api from '@/api/Axios'
import { socket, connectSocket } from '@/services/socket'

/* ============================================================
 * STATUTS
 * ============================================================ */
const statusMeta = {
	EN_ATTENTE: { label: 'En attente', color: 'amber',  icon: 'clock' },
	CONFIRME:   { label: 'Confirmé',   color: 'emerald', icon: 'check' },
	ANNULE:     { label: 'Annulé',     color: 'red',    icon: 'cross' },
	HONORE:     { label: 'Terminé',    color: 'slate',  icon: 'check' },
	ABSENT:     { label: 'Absence',    color: 'slate',  icon: 'cross' }
}

const statusPalette = (status) => {
	const s = (status || '').toUpperCase()
	if (s === 'CONFIRME')   return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', bar: 'bg-emerald-500', hex: '#10b981' }
	if (s === 'EN_ATTENTE') return { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500',   ring: 'ring-amber-500/20',   bar: 'bg-amber-500',   hex: '#f59e0b' }
	if (s === 'ANNULE')     return { bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500',     ring: 'ring-red-500/20',     bar: 'bg-red-500',     hex: '#ef4444' }
	return { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500', ring: 'ring-slate-500/20', bar: 'bg-slate-500', hex: '#64748b' }
}

const normalizeStatus = (status) => {
	if (!status) return 'EN_ATTENTE'
		return String(status).trim().toUpperCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/* ============================================================
 * DONNÉES
 * ============================================================ */
const rendezVous = ref([])
const isLoading  = ref(true)
const listRef    = ref(null)

const fetchRendezVous = async () => {
	isLoading.value = true
	
	try {
		const currentUser = JSON.parse(localStorage.getItem('currentUser'))
		const idContribuable = currentUser?.id
		if (!idContribuable) throw new Error('ID contribuable introuvable')
			
			const res = await api.get(`/rendez-vous/contribuable/${idContribuable}`)
			if (!res.data?.success) throw new Error(res.data?.message || 'Erreur API')
				
				rendezVous.value = Array.isArray(res.data.data)
				? res.data.data.map(rdv => ({
					...rdv,
					statut_rdv: normalizeStatus(rdv.statut_rdv)
				}))
				: []
	} catch (err) {
		console.error('Erreur chargement RDV :', err)
		rendezVous.value = []
	} finally {
		isLoading.value = false
		await nextTick()
		animerListe()
	}
}

/* ============================================================
 * ANIMATION GSAP
 * ============================================================ */
function animerListe() {
	if (!listRef.value) return
		const items = listRef.value.querySelectorAll('[data-rdv-row]')
		if (!items.length) return
			
			gsap.fromTo(items,
						{ opacity: 0, y: 12 },
			   { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' }
			)
}

/* ============================================================
 * STATISTIQUES CLIQUABLES
 * ============================================================ */
const activeStatusFilter = ref('TOUS')

const statCards = computed(() => [
	{ key: 'TOUS',       title: 'Tous',       count: rendezVous.value.length,                                                    accent: 'primary', icon: 'calendar' },
	{ key: 'EN_ATTENTE', title: 'En attente', count: rendezVous.value.filter(r => r.statut_rdv === 'EN_ATTENTE').length,          accent: 'amber',   icon: 'clock' },
						   { key: 'CONFIRME',   title: 'Confirmés',  count: rendezVous.value.filter(r => r.statut_rdv === 'CONFIRME').length,            accent: 'emerald', icon: 'check' },
						   { key: 'ANNULE',     title: 'Annulés',    count: rendezVous.value.filter(r => r.statut_rdv === 'ANNULE').length,              accent: 'red',     icon: 'cross' }
])

const accentPalette = (a) => ({
	primary: { bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]',   dot: 'bg-[var(--primary)]' },
							  amber:   { bg: 'bg-amber-500/10',        text: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500' },
							  emerald: { bg: 'bg-emerald-500/10',      text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
							  red:     { bg: 'bg-red-500/10',          text: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' }
}[a] || {})

/* ============================================================
 * FILTRES
 * ============================================================ */
const searchQuery          = ref('')
const dateFilter           = ref('')
const showAdvancedFilters  = ref(false)

const filteredRendezVous = computed(() => {
	let list = rendezVous.value
	
	if (activeStatusFilter.value !== 'TOUS') {
		list = list.filter(r => r.statut_rdv === activeStatusFilter.value)
	}
	
	if (dateFilter.value) {
		list = list.filter(r => r.date_rdv === dateFilter.value)
	}
	
	if (searchQuery.value.trim()) {
		const q = searchQuery.value.toLowerCase()
		list = list.filter(r =>
		(r.service?.libelle_service || '').toLowerCase().includes(q) ||
		r.date_rdv.includes(q) ||
		statusMeta[r.statut_rdv]?.label.toLowerCase().includes(q)
		)
	}
	
	return list
})

/* ============================================================
 * PAGINATION
 * ============================================================ */
const pageSize     = 5
const currentPage  = ref(1)
const totalPages   = computed(() => Math.max(1, Math.ceil(filteredRendezVous.value.length / pageSize)))
const paginatedRendezVous = computed(() => {
	const start = (currentPage.value - 1) * pageSize
	return filteredRendezVous.value.slice(start, start + pageSize)
})

watch([searchQuery, dateFilter, activeStatusFilter], () => { currentPage.value = 1 })

const goToPage = (page) => {
	if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

/* ============================================================
 * NAVIGATION
 * ============================================================ */
const selectedRdvId = ref(null)
const view = ref('list')

const openDetail   = (rdv) => { selectedRdvId.value = rdv.id_rdv; view.value = 'detail' }
const openCreate   = () => { view.value = 'create' }
const backToList   = () => { view.value = 'list'; selectedRdvId.value = null }
const onRdvUpdated = () => fetchRendezVous()
const onRdvCreated = () => { backToList(); fetchRendezVous() }

const formatDateShort = (dateStr) => {
	if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit', month: 'short', year: 'numeric'
		})
}

/* ============================================================
 * SOCKET
 * ============================================================ */
const handleRdvUpdated = (rdv) => {
	const index = rendezVous.value.findIndex(item => item.id_rdv === rdv.id_rdv)
	if (index !== -1) {
		rendezVous.value[index] = { ...rendezVous.value[index], ...rdv }
	}
}

onMounted(() => {
	connectSocket()
	socket.on('rdv:updated', handleRdvUpdated)
	fetchRendezVous()
})

onUnmounted(() => {
	socket.off('rdv:updated', handleRdvUpdated)
})
</script>

<template>
<div class="min-h-full bg-[var(--bg)] text-[var(--text)]">
<div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">

<AnimatePresence mode="wait">

<!-- ============================================================
VUE LISTE
============================================================ -->
<motion.div
v-if="view === 'list'"
key="list"
:initial="{ opacity: 0, x: -16 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: -16 }"
:transition="{ duration: 0.25 }"
class="space-y-5"
>

<!-- HEADER -->
<div class="flex flex-wrap items-start justify-between gap-4">
<div>
<p class="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--primary)]">
Espace contribuable
</p>
<h1 class="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
Mes rendez-vous
</h1>
<p class="mt-1.5 text-sm text-[var(--text-muted)] max-w-xl">
Consultez, gérez et suivez vos rendez-vous avec l'administration fiscale.
</p>
</div>

<motion.button
@click="openCreate"
:whileHover="{ scale: 1.03, y: -1 }"
:whileTap="{ scale: 0.97 }"
class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
</svg>
Prendre un rendez-vous
</motion.button>
</div>

<!-- KPI CARDS -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
<motion.button
v-for="(card, i) in statCards"
:key="card.key"
type="button"
@click="activeStatusFilter = card.key"
:whileHover="{ y: -3 }"
:whileTap="{ scale: 0.98 }"
:transition="{ type: 'spring', stiffness: 300, damping: 22 }"
:class="[
'relative text-left rounded-2xl p-4 transition-all duration-200 overflow-hidden',
activeStatusFilter === card.key
? 'bg-[var(--primary)] text-white shadow-lg shadow-blue-500/25'
: 'bg-[var(--card)] hover:bg-[var(--hover)]'
]"
>
<div :class="[
'absolute -right-6 -top-6 w-24 h-24 rounded-full transition-opacity duration-300 pointer-events-none',
activeStatusFilter === card.key ? 'bg-white/10' : 'bg-[var(--primary)]/5 opacity-0 hover:opacity-100'
]"></div>

<div class="relative flex items-start justify-between gap-3">
<div :class="[
'w-9 h-9 rounded-xl flex items-center justify-center',
activeStatusFilter === card.key ? 'bg-white/15 text-white' : [accentPalette(card.accent).bg, accentPalette(card.accent).text]
]">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path v-if="card.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
<path v-else-if="card.icon === 'clock'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
<path v-else-if="card.icon === 'check'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
<path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M6 18L18 6M6 6l12 12"/>
</svg>
</div>

<p :class="[
'text-3xl font-black tabular-nums leading-none',
activeStatusFilter === card.key ? 'text-white' : 'text-[var(--text)]'
]">
{{ card.count }}
</p>
</div>

<p :class="[
'relative mt-2 text-[11px] uppercase tracking-wider font-bold',
activeStatusFilter === card.key ? 'text-white/80' : 'text-[var(--text-muted)]'
]">
{{ card.title }}
</p>
</motion.button>
</div>

<!-- FILTRES -->
<div class="rounded-2xl bg-[var(--card)] p-3 sm:p-4">
<div class="flex flex-wrap items-center gap-3">
<!-- Recherche -->
<div class="relative flex-1 min-w-[220px]">
<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="searchQuery"
type="search"
placeholder="Rechercher par service, date, statut…"
class="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[var(--bg)] border-0 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
/>
</div>

<!-- Date -->
<div class="relative">
<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
<input
v-model="dateFilter"
type="date"
class="pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[var(--bg)] border-0 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 cursor-pointer"
/>
</div>

<!-- Toggle filtres avancés -->
<button
@click="showAdvancedFilters = !showAdvancedFilters"
:class="[
'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
showAdvancedFilters
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
]"
title="Plus de filtres"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
</svg>
</button>
</div>

<!-- Panneau filtres avancés -->
<AnimatePresence>
<motion.div
v-if="showAdvancedFilters"
:initial="{ opacity: 0, height: 0, marginTop: 0 }"
:animate="{ opacity: 1, height: 'auto', marginTop: 12 }"
:exit="{ opacity: 0, height: 0, marginTop: 0 }"
class="overflow-hidden"
>
<div class="pt-3 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
<button
v-if="dateFilter"
@click="dateFilter = ''"
class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold"
>
Date : {{ dateFilter }}
<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
<p v-else class="text-xs text-[var(--text-muted)]">
Utilisez le champ date ci-dessus pour filtrer sur un jour précis.
</p>
</div>
</motion.div>
</AnimatePresence>
</div>

<!-- LISTE -->
<div ref="listRef" class="space-y-2">

<!-- Loading -->
<div v-if="isLoading" class="space-y-2">
<div v-for="n in 4" :key="n" class="h-[88px] rounded-2xl bg-[var(--card)] animate-pulse"></div>
</div>

<!-- Vide -->
<div
v-else-if="filteredRendezVous.length === 0"
class="rounded-3xl bg-[var(--card)] p-12 text-center"
>
<div class="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-4">
<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
</div>
<p class="text-sm font-bold">Aucun rendez-vous trouvé</p>
<p class="text-xs text-[var(--text-muted)] mt-1">
Essayez de modifier vos filtres ou prenez un nouveau rendez-vous.
</p>
</div>

<!-- Lignes -->
<motion.article
v-for="rdv in paginatedRendezVous"
:key="rdv.id_rdv"
data-rdv-row
@click="openDetail(rdv)"
:whileHover="{ y: -2 }"
:transition="{ type: 'spring', stiffness: 300, damping: 22 }"
class="group relative cursor-pointer rounded-2xl bg-[var(--card)] p-4 sm:p-5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-shadow"
>
<!-- Barre latérale colorée -->
<div :class="['absolute left-0 top-4 bottom-4 w-1 rounded-r-full', statusPalette(rdv.statut_rdv).bar]"></div>

<div class="flex flex-wrap items-center gap-4 pl-2">

<!-- Icône statut -->
<div :class="['shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center', statusPalette(rdv.statut_rdv).bg]">
<svg :class="['w-5 h-5', statusPalette(rdv.statut_rdv).text]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path v-if="statusMeta[rdv.statut_rdv]?.icon === 'check'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
<path v-else-if="statusMeta[rdv.statut_rdv]?.icon === 'cross'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
<path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>

<!-- Infos principales -->
<div class="min-w-0 flex-1">
<div class="flex items-center gap-2 flex-wrap">
<h3 class="text-base font-bold truncate group-hover:text-[var(--primary)] transition-colors">
{{ rdv.service?.libelle_service || 'Service fiscal' }}
</h3>

<!-- Badge statut -->
<span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', statusPalette(rdv.statut_rdv).bg, statusPalette(rdv.statut_rdv).text]">
<span :class="['w-1.5 h-1.5 rounded-full', statusPalette(rdv.statut_rdv).dot]"></span>
{{ statusMeta[rdv.statut_rdv]?.label }}
</span>
</div>

<div class="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
<!-- Date -->
<span class="inline-flex items-center gap-1.5">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
{{ formatDateShort(rdv.date_rdv) }}
</span>

<!-- Heure -->
<span class="inline-flex items-center gap-1.5">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
{{ rdv.heure_rdv?.slice(0, 5) || '—' }}
</span>

<!-- Ref -->
<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg)]">
#{{ rdv.id_rdv }}
</span>
</div>
</div>

<!-- Ticket -->
<div v-if="rdv.ticket" class="shrink-0 rounded-xl bg-[var(--bg)] px-3 py-2 border border-[var(--border)]">
<p class="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Ticket</p>
<p class="text-base font-black tabular-nums mt-0.5">{{ rdv.ticket.numero_ticket }}</p>
</div>

<!-- Chevron -->
<div class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg)] group-hover:bg-[var(--primary)] group-hover:text-white text-[var(--text-muted)] transition-colors">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</div>
</div>
</motion.article>
</div>

<!-- PAGINATION -->
<div v-if="filteredRendezVous.length > pageSize" class="flex justify-center items-center gap-1.5 pt-2">
<button
:disabled="currentPage === 1"
@click="goToPage(currentPage - 1)"
class="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
</svg>
</button>

<button
v-for="p in totalPages"
:key="p"
@click="goToPage(p)"
:class="[
'w-9 h-9 rounded-lg text-xs font-bold transition-colors',
currentPage === p
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)]'
]"
>
{{ p }}
</button>

<button
:disabled="currentPage === totalPages"
@click="goToPage(currentPage + 1)"
class="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>
</div>

<!-- LÉGENDE -->
<div class="rounded-2xl bg-[var(--card)] p-4 sm:p-5">
<p class="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] mb-3">
Légende des statuts
</p>
<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
<div
v-for="item in [
{ key: 'EN_ATTENTE', desc: 'En attente de confirmation' },
{ key: 'CONFIRME',   desc: 'Rendez-vous confirmé' },
{ key: 'ANNULE',     desc: 'Rendez-vous annulé' },
{ key: 'HONORE',     desc: 'Rendez-vous effectué' }
]"
:key="item.key"
class="flex items-center gap-2"
>
<span :class="['shrink-0 w-2 h-2 rounded-full', statusPalette(item.key).dot]"></span>
<div class="min-w-0">
<p :class="['text-[11px] font-bold', statusPalette(item.key).text]">
{{ statusMeta[item.key].label }}
</p>
<p class="text-[10px] text-[var(--text-muted)] truncate">{{ item.desc }}</p>
</div>
</div>
</div>
</div>
</motion.div>

<!-- ============================================================
VUE DÉTAIL
============================================================ -->
<motion.div
v-else-if="view === 'detail'"
key="detail"
:initial="{ opacity: 0, x: 16 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: 16 }"
:transition="{ duration: 0.25 }"
>
<RendezVousDetailPanel
:rdv-id="selectedRdvId"
@back="backToList"
@updated="onRdvUpdated"
/>
</motion.div>

<!-- ============================================================
VUE CRÉATION
============================================================ -->
<motion.div
v-else
key="create"
:initial="{ opacity: 0, x: 16 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: 16 }"
:transition="{ duration: 0.25 }"
>
<motion.button
@click="backToList"
whileHover="{ x: -3 }"
	whileTap="{ scale: 0.97 }"
		class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
		</svg>
		Retour à la liste
		</motion.button>
		
		<PriseRendezVousStepper @ActualiseListe="fetchRendezVous" />
		</motion.div>
		
		</AnimatePresence>
		</div>
		</div>
		</template>
