<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted,onUnmounted,onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { motion, AnimatePresence } from 'motion-v'
import { gsap } from 'gsap'
import api from '@/api/Axios'

import { socket } from '@/services/socket'

const router = useRouter()

/* ============================================================
 * ÉTAT RÉACTIF
 * ============================================================ */
const dossiers    = ref([])
const isLoading   = ref(false)
const errorMessage = ref('')

const filtreStatut  = ref('TOUS')
const filtreService = ref('TOUS')
const recherche     = ref('')
const triPar        = ref('dateDepot')

/* Refs DOM pour GSAP */
const headerRef  = ref(null)
const kpiRefs    = ref([])
const listRef    = ref(null)

/* ============================================================
 * CHARGEMENT API
 * ============================================================ */
async function chargerDossiers() {
	isLoading.value = true
	errorMessage.value = ''
	
	try {
		const response = await api.get('/verification/dossiers')
		const data = response.data?.data || response.data || []
		dossiers.value = Array.isArray(data) ? data.map(normaliserDossier) : []
		await nextTick()
		animerListe()
	} catch (error) {
		console.error('❌ Erreur chargement dossiers :', error)
		errorMessage.value =
		error.response?.data?.message ||
		'Impossible de charger les dossiers à vérifier.'
		dossiers.value = []
	} finally {
		isLoading.value = false
	}
}

function handleDossierUpdated(data) {
	console.log('📡 Dossier mis à jour :', data)
	
	// Recharger la liste complète
	chargerDossiers()
	
	// OU mise à jour locale optimiste
	const idx = dossiers.value.findIndex(d => d.id_dossier === data.id_dossier)
	if (idx !== -1) {
		dossiers.value[idx].statut_dossier = data.statut_dossier
	}
}

/* ============================================================
 * NORMALISATION API → UI
 * ============================================================ */
function normaliserDossier(d) {
	return {
		id: d.id_dossier ?? d.id,
		reference: d.reference_dossier ?? d.reference ?? '—',
		statut: d.statut_dossier ?? d.statut ?? '—',
		
		contribuable: {
			nom: d.nom_raison_sociale ?? d.contribuable?.nom_raison_sociale ?? d.contribuable?.nom ?? '—',
			nif: d.nif ?? d.contribuable?.nif ?? '—'
		},
		
		service: d.libelle_service ?? d.service?.libelle_service ?? d.service ?? '—',
		dateDepot: formaterDate(d.date_predepot ?? d.dateDepot),
		
		pieces: {
			total:        Number(d.pieces_total        ?? d.pieces?.total        ?? 0),
			conformes:    Number(d.pieces_conformes    ?? d.pieces?.conformes    ?? 0),
			nonConformes: Number(d.pieces_non_conformes ?? d.pieces?.nonConformes ?? 0),
			enAttente:    Number(d.pieces_en_attente   ?? d.pieces?.enAttente    ?? 0),
			manquantes:   Number(d.pieces_manquantes    ?? d.pieces?.manquantes ?? 0),  
		},
		
		agentAffecte: d.agent_affecte ?? d.agentAffecte ?? '—',
		priorite: d.priorite ?? 'NORMALE'
	}
}

function formaterDate(date) {
	if (!date) return '—'
		const d = new Date(date)
		if (Number.isNaN(d.getTime())) return String(date)
			return d.toLocaleString('fr-FR', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			})
}

/* ============================================================
 * COMPUTED : services, filtres, tri, KPI
 * ============================================================ */
const services = computed(() =>
[...new Set(dossiers.value.map(d => d.service).filter(Boolean))]
)

const prioritePoids = (p) => ({ HAUTE: 3, NORMALE: 2, BASSE: 1 }[p] || 0)

const dossiersFiltres = computed(() => {
	const q = recherche.value.toLowerCase().trim()
	return [...dossiers.value]
	.filter(d => filtreStatut.value === 'TOUS'  || d.statut  === filtreStatut.value)
	.filter(d => filtreService.value === 'TOUS' || d.service === filtreService.value)
	.filter(d => {
		if (!q) return true
			return (
				String(d.reference).toLowerCase().includes(q) ||
				String(d.contribuable.nom).toLowerCase().includes(q) ||
				String(d.contribuable.nif).toLowerCase().includes(q)
			)
	})
	.sort((a, b) => {
		if (triPar.value === 'priorite') return prioritePoids(b.priorite) - prioritePoids(a.priorite)
			if (triPar.value === 'pieces')   return b.pieces.total - a.pieces.total
				return new Date(b.dateDepot) - new Date(a.dateDepot)
	})
})

const kpis = computed(() => ({
	total:      dossiers.value.length,
	aCompleter: dossiers.value.filter(d => d.statut === 'A_COMPLETER').length,
							 soumis:     dossiers.value.filter(d => d.statut === 'SOUMIS').length,
							 urgents:    dossiers.value.filter(d => d.priorite === 'HAUTE').length
}))

/* ============================================================
 * NAVIGATION
 * ============================================================ */
const ouvrirDossier = (d) => {
	router.push({ name: 'dossier-detail', params: { id: d.id } })
}

async function actualiser() {
	await chargerDossiers()
}

/* ============================================================
 * CLASSES UI
 * ============================================================ */
const statutClass = (s) => ({
	BROUILLON:   'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200',
	SOUMIS:      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
	A_COMPLETER: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
	VALIDE:      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
	REJETE:      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
}[s] || 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200')

const prioriteBarre = (p) => ({
	HAUTE:   'bg-red-500',
	NORMALE: 'bg-[var(--primary)]',
							  BASSE:   'bg-slate-300 dark:bg-slate-600'
}[p] || 'bg-slate-300')

/* ============================================================
 * ANIMATIONS GSAP
 * ============================================================ */
function animerEntree() {
	if (!headerRef.value) return
		
		// Header : fade + slide down
		gsap.from(headerRef.value, {
			y: -30, opacity: 0, duration: 0.6, ease: 'power3.out'
		})
		
		// KPI : cascade
		gsap.from(kpiRefs.value.filter(Boolean), {
			y: 20, opacity: 0, duration: 0.5, stagger: 0.08, delay: 0.15, ease: 'power2.out'
		})
}

function animerListe() {
	const items = listRef.value?.querySelectorAll('[data-row]')
	if (!items?.length) return
		
		gsap.from(items, {
			y: 15, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out'
		})
}

/* Re-animer quand les filtres changent */
watch(dossiersFiltres, () => { nextTick(animerListe) })

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	socket.on('dossier:updated', handleDossierUpdated)
	
	await chargerDossiers()
	await nextTick()
	animerEntree()
})

onBeforeUnmount(() => {
	gsap.killTweensOf([headerRef.value, ...kpiRefs.value])
})

onUnmounted(() => {
	socket.off('dossier:updated', handleDossierUpdated)
})
</script>

<template>
<div class="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">

<!-- ============================================================
HEADER
============================================================ -->
<motion.header
ref="headerRef"
:initial="{ opacity: 0, y: -20 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
class="bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6 py-4 sm:py-5"
>
<div class="max-w-[1600px] mx-auto space-y-4">

<!-- Titre + actions -->
<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
<div class="flex items-center gap-3">
<div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-blue-500/20">
<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
</svg>
</div>
<div>
<h1 class="text-base sm:text-lg font-bold">File de vérification</h1>
<p class="text-xs text-[var(--text-muted)]">
Dossiers en attente de contrôle — RG7 (agent vérificateur)
</p>
</div>
</div>

<motion.button
@click="actualiser"
:disabled="isLoading"
whileHover="{ scale: 1.03 }"
	whileTap="{ scale: 0.97 }"
		class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-blue-600 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start sm:self-auto"
		>
		<svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
		</svg>
		{{ isLoading ? 'Chargement...' : 'Actualiser' }}
		</motion.button>
		</div>
		
		<!-- KPI -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<motion.div
		v-for="(kpi, i) in [
		{ label: 'Total',      value: kpis.total,      color: 'text-[var(--text)]',       bg: 'bg-[var(--card)]',            border: 'border-[var(--border)]' },
		{ label: 'Soumis',     value: kpis.soumis,     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-500/10',   border: 'border-blue-100 dark:border-blue-500/20' },
{ label: 'À compléter',value: kpis.aCompleter, color: 'text-orange-700 dark:text-orange-300',bg: 'bg-orange-50 dark:bg-orange-500/10',border: 'border-orange-100 dark:border-orange-500/20' },
{ label: 'Urgents',    value: kpis.urgents,    color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-50 dark:bg-red-500/10',     border: 'border-red-100 dark:border-red-500/20' }
]"
:key="kpi.label"
:ref="el => { if (el) kpiRefs[i] = el }"
:whileHover="{ y: -3 }"
:transition="{ type: 'spring', stiffness: 300, damping: 20 }"
:class="['rounded-xl p-3 sm:p-4 border cursor-default', kpi.bg, kpi.border]"
>
<p class="text-[11px] sm:text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">{{ kpi.label }}</p>
<p :class="['text-xl sm:text-2xl font-bold mt-1', kpi.color]">{{ kpi.value }}</p>
</motion.div>
</div>
</div>
</motion.header>

<!-- ============================================================
FILTRES
============================================================ -->
<motion.div
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:transition="{ duration: 0.4, delay: 0.2 }"
class="bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6 py-3"
>
<div class="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-3">

<!-- Recherche -->
<div class="relative md:col-span-5">
<svg class="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="recherche"
type="text"
placeholder="Rechercher par référence, NIF ou nom..."
class="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition"
/>
</div>

<!-- Statut -->
<select v-model="filtreStatut" class="md:col-span-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40">
<option value="TOUS">Tous statuts</option>
<option value="BROUILLON">Brouillon</option>
<option value="SOUMIS">Soumis</option>
<option value="A_COMPLETER">À compléter</option>
</select>

<!-- Service -->
<select v-model="filtreService" class="md:col-span-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40">
<option value="TOUS">Tous services</option>
<option v-for="s in services" :key="s" :value="s">{{ s }}</option>
</select>

<!-- Tri -->
<select v-model="triPar" class="md:col-span-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40">
<option value="dateDepot">Date de dépôt</option>
<option value="priorite">Priorité</option>
<option value="pieces">Nb de pièces</option>
</select>
</div>
</motion.div>

<!-- ============================================================
LISTE
============================================================ -->
<main class="flex-1 overflow-y-auto p-4 sm:p-6">
<div class="max-w-[1600px] mx-auto">

<!-- En-tête de tableau (desktop) -->
<div class="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 mb-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
<div class="col-span-3">Dossier / Contribuable</div>
<div class="col-span-2">Service</div>
<div class="col-span-2">Dépôt</div>
<div class="col-span-2">Pièces</div>
<div class="col-span-2">Agent</div>
<div class="col-span-1 text-right">Statut</div>
</div>

<!-- Conteneur liste (carte globale) -->
<div ref="listRef" class="space-y-3">

<!-- États : loading / erreur / vide -->
<AnimatePresence mode="wait">
<motion.div
v-if="isLoading"
key="loading"
:initial="{ opacity: 0, scale: 0.98 }"
:animate="{ opacity: 1, scale: 1 }"
:exit="{ opacity: 0 }"
class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center"
>
<div class="flex flex-col items-center gap-3">
<div class="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin"></div>
<span class="text-sm text-[var(--text-muted)]">Chargement des dossiers...</span>
</div>
</motion.div>

<motion.div
v-else-if="errorMessage"
key="error"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0 }"
class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-12 text-center"
>
<p class="text-sm text-red-600 dark:text-red-300 font-medium">{{ errorMessage }}</p>
<button
@click="actualiser"
class="mt-3 px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:bg-blue-600 transition"
>
Réessayer
</button>
</motion.div>

<motion.div
v-else-if="dossiersFiltres.length === 0"
key="empty"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0 }"
class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center"
>
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
</svg>
<p class="text-sm text-[var(--text-muted)]">Aucun dossier ne correspond à vos critères.</p>
</motion.div>
</AnimatePresence>

<!-- Lignes -->
<AnimatePresence>
<motion.button
v-for="d in dossiersFiltres"
:key="d.id"
data-row
@click="ouvrirDossier(d)"
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.98 }"
:whileHover="{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }"
:transition="{ type: 'spring', stiffness: 300, damping: 24 }"
class="w-full text-left bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 rounded-xl px-4 sm:px-5 py-4 transition-colors group"
>
<!-- MOBILE / TABLETTE (empilé) -->
<div class="lg:hidden space-y-3">
<div class="flex items-start justify-between gap-3">
<div class="flex items-start gap-3 min-w-0">
<div :class="['w-1 self-stretch rounded-full', prioriteBarre(d.priorite)]"></div>
<div class="min-w-0">
<p class="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition truncate">
{{ d.reference }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">{{ d.contribuable.nom }}</p>
<p class="text-[11px] text-[var(--text-muted)]">NIF {{ d.contribuable.nif }}</p>
</div>
</div>
<span :class="['px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap', statutClass(d.statut)]">
{{ d.statut.replace('_', ' ') }}
</span>
</div>

<div class="flex flex-wrap gap-2 text-[11px]">
<span class="px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
{{ d.service }}
</span>
<span class="px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
{{ d.dateDepot }}
</span>
<span class="px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
Agent : {{ d.agentAffecte }}
</span>
</div>

<div class="flex items-center gap-2 text-[11px]">
<span class="font-semibold text-[var(--text)]">{{ d.pieces.total }} pièces</span>
<span v-if="d.pieces.conformes"    class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300">{{ d.pieces.conformes }} ✓</span>
<span v-if="d.pieces.nonConformes" class="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">{{ d.pieces.nonConformes }} ✗</span>
<span v-if="d.pieces.enAttente"    class="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">{{ d.pieces.enAttente }} ⏳</span>
<span v-if="d.pieces.manquantes"   class="px-2 py-0.5 rounded-full bg-red-600 text-white">{{ d.pieces.manquantes }} ⚠</span>
</div>
</div>

<!-- DESKTOP (grille) -->
<div class="hidden lg:grid grid-cols-12 gap-4 items-center">
<!-- Dossier -->
<div class="col-span-3 flex items-start gap-3 min-w-0">
<div :class="['w-1 self-stretch rounded-full', prioriteBarre(d.priorite)]"></div>
<div class="min-w-0">
<p class="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition truncate">
{{ d.reference }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">{{ d.contribuable.nom }}</p>
<p class="text-[11px] text-[var(--text-muted)]">NIF {{ d.contribuable.nif }}</p>
</div>
</div>

<!-- Service -->
<div class="col-span-2 text-sm text-[var(--text)] truncate">{{ d.service }}</div>

<!-- Dépôt -->
<div class="col-span-2 text-sm text-[var(--text-muted)] truncate">{{ d.dateDepot }}</div>

<!-- Pièces -->
<div class="col-span-2 flex items-center gap-1.5 text-xs flex-wrap">
<span class="font-semibold text-[var(--text)]">{{ d.pieces.total }}</span>
<span v-if="d.pieces.conformes"    class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300">{{ d.pieces.conformes }} ✓</span>
<span v-if="d.pieces.nonConformes" class="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">{{ d.pieces.nonConformes }} ✗</span>
<span v-if="d.pieces.enAttente"    class="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">{{ d.pieces.enAttente }} ⏳</span>
<span v-if="d.pieces.manquantes"   class="px-2 py-0.5 rounded-full bg-red-600 text-white">{{ d.pieces.manquantes }} ⚠</span>
</div>

<!-- Agent -->
<div class="col-span-2 text-xs text-[var(--text-muted)] truncate">{{ d.agentAffecte }}</div>

<!-- Statut -->
<div class="col-span-1 flex justify-end">
<span :class="['px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap', statutClass(d.statut)]">
{{ d.statut.replace('_', ' ') }}
</span>
</div>
</div>
</motion.button>
</AnimatePresence>
</div>
</div>
</main>
</div>
</template>
