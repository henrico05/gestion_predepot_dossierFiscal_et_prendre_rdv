<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useToast } from 'vue-toastification'
import gsap from 'gsap'
import api from '@/api/Axios'
import { socket, connectSocket } from '@/services/socket'
import DossierExtraTabs from '@/components/Contrubuable/DossierExtraTabs.vue'

const toast = useToast()

/* ============================================================
 * ÉTAT
 * ============================================================ */
const dossiers        = ref([])
const isLoading       = ref(true)
const errorMessage    = ref('')

/* Détail */
const selected        = ref(null)
const isLoadingDetail = ref(false)
const onglet          = ref('pieces')
const selectedTypePiece = ref('')

/* Upload */
const isUploading     = ref(false)

/* UI */
const q        = ref('')
const filtre   = ref('TOUS')
const listRef  = ref(null)

/* ============================================================
 * CHARGEMENT LISTE
 * ============================================================ */
async function fetchDossiers() {
	isLoading.value = true
	errorMessage.value = ''
	
	try {
		const response = await api.get('/dossiers/mes')
		dossiers.value = response.data?.data || []
		await nextTick()
		animerListe()
	} catch (error) {
		console.error('❌ Erreur chargement dossiers :', error)
		errorMessage.value = error.response?.data?.message || 'Impossible de charger vos dossiers.'
		dossiers.value = []
	} finally {
		isLoading.value = false
	}
}

/* ============================================================
 * CHARGEMENT DÉTAIL
 * ============================================================ */
async function openDossier(d) {
	isLoadingDetail.value = true
	selected.value = d           // Affichage immédiat (évite flash)
	onglet.value = 'pieces'
	
	try {
		const response = await api.get(`/dossiers/${d.id_dossier}`)
		const dossier = response.data?.data
		
		if (!dossier) throw new Error('Données absentes')
			
			selected.value = null
			await nextTick()
			selected.value = { ...dossier }
			
			console.log('📦 Dossier rechargé :', {
				statut: selected.value.statut_dossier,
				piecesCount: selected.value.pieces?.length,
				pieces: selected.value.pieces?.map(p => ({
					id: p.id_piece,
					type: p.id_type_piece,
					statut: p.statut_verification
				}))
			})
			
			
	} catch (error) {
		console.error('❌ Erreur récupération dossier :', error)
		toast.error(error.response?.data?.message || 'Impossible de charger le détail du dossier.')
	} finally {
		isLoadingDetail.value = false
	}
}

function closeDossier() {
	selected.value = null
	onglet.value = 'pieces'
	selectedTypePiece.value = ''
}

/* ============================================================
 * TEMPS RÉEL — DOSSIER
 * ============================================================ */
async function onDossierUpdated(data) {
	if (!data?.id_dossier) return
		
		console.log('📡 Dossier mis à jour en temps réel :', data)
		
		if (
			selected.value &&
			Number(selected.value.id_dossier) === Number(data.id_dossier)
		) {
			await openDossier({ id_dossier: data.id_dossier })
		}
		
		await fetchDossiers()
}

/* ============================================================
 * COMPUTED — Labels, filtres
 * ============================================================ */
const labels = {
	BROUILLON:       'Brouillon',
	SOUMIS:          'Soumis',
	EN_VERIFICATION: 'En vérification',
	A_COMPLETER:     'À compléter',
	VALIDE:          'Validé',
	REJETE:          'Rejeté',
	CLOTURE:         'Clôturé'
}

const counters = computed(() => [
	{ key: 'TOUS',            label: 'Tous',           value: dossiers.value.length },
	{ key: 'BROUILLON',       label: 'Brouillons',     value: dossiers.value.filter(d => d.statut_dossier === 'BROUILLON').length },
						  { key: 'SOUMIS',          label: 'Soumis',         value: dossiers.value.filter(d => d.statut_dossier === 'SOUMIS').length },
						  { key: 'EN_VERIFICATION', label: 'En vérification', value: dossiers.value.filter(d => d.statut_dossier === 'EN_VERIFICATION').length },
						  { key: 'A_COMPLETER',     label: 'À compléter',    value: dossiers.value.filter(d => d.statut_dossier === 'A_COMPLETER').length },
						  { key: 'VALIDE',          label: 'Validés',        value: dossiers.value.filter(d => d.statut_dossier === 'VALIDE').length }
])

const filtered = computed(() => {
	const needle = q.value.trim().toLowerCase()
	return dossiers.value.filter(d => {
		const okF = filtre.value === 'TOUS' || d.statut_dossier === filtre.value
		const haystack = [
			d.reference_dossier,
			d.service?.libelle_service,
			d.contribuable?.nom_raison_sociale,
			d.contribuable?.nif
		].filter(Boolean).join(' ').toLowerCase()
		
		const okQ = !needle || haystack.includes(needle)
		return okF && okQ
	})
})

/* ============================================================
 * COMPUTED — Pièces et stats (ALIGNÉ sur DossierDetailAgent)
 * ============================================================ */
const pieceList  = computed(() => selected.value?.pieces || [])
const requisList = computed(() => selected.value?.requis || [])

/* Vérifie si un type de pièce a déjà été fourni */
function isTypeDejaFourni(type) {
	if (type.multiple === true) return false
		
		return pieceList.value.some(
			p => Number(p.id_type_piece) === Number(type.id_type_piece)
			&& p.statut_verification !== 'NON_CONFORME'
		)
}

/* Vérifie si un type de pièce est actuellement NON_CONFORME */
function isTypeNonConforme(type) {
	const normalize = (v) => String(v ?? '').trim()
	const id = normalize(type.id_type_piece)
	
	return pieceList.value.some(
		p => normalize(p.id_type_piece) === id
		&& p.statut_verification === 'NON_CONFORME'
	)
}

const typesAInserer = computed(() => {
	const normalize = (v) => String(v ?? '').trim()
	
	/* 1. Types NON_CONFORME (à remplacer) */
	const typesNonConformes = new Set(
		pieceList.value
		.filter(p => p.statut_verification === 'NON_CONFORME')
		.map(p => normalize(p.id_type_piece))
	)
	
	/* 2. Types déjà fournis (actifs) — à exclure */
	const typesDejaFournis = new Set(
		pieceList.value
		.filter(p => p.statut_verification !== 'NON_CONFORME')
		.map(p => normalize(p.id_type_piece))
	)
	
	/* 3. Filtrer requisList : garder uniquement ceux à insérer */
	return requisList.value.filter((type) => {
		const id = normalize(type.id_type_piece)
		
		/* Si déjà fourni (et pas non conforme) → cacher */
		if (typesDejaFournis.has(id) && !typesNonConformes.has(id)) {
			return false
		}
		
		return true
	})
})

/* Nombre de pièces déposées pour un type donné */
function countType(type) {
	return pieceList.value.filter(
		p => Number(p.id_type_piece) === Number(type.id_type_piece)
		&& p.statut_verification !== 'NON_CONFORME'
	).length
}

const statsSelected = computed(() => {
	if (!selected.value) return null
		
		/* ⭐ Normalisation UUID → string (pas Number !) */
		const normalize = (v) => String(v ?? '').trim()
		
		/* Pièces actives : on exclut les NON_CONFORME */
		const piecesActives = pieceList.value.filter(
			p => p.statut_verification !== 'NON_CONFORME'
		)
		
		/* ⭐ Types fournis (string UUID) */
		const typesFournis = new Set(
			piecesActives
			.map(p => normalize(p.id_type_piece))
			.filter(Boolean)
		)
		
		/* ⭐ Types requis obligatoires (string UUID) */
		const typesRequisObligatoires = requisList.value
		.filter(r => r.obligatoire === true)
		.map(r => normalize(r.id_type_piece))
		.filter(Boolean)
		
		const totalRequis = typesRequisObligatoires.length
		
		/* Conformes : types avec AU MOINS une pièce CONFORME */
		const conformes = typesRequisObligatoires.filter(idType =>
		piecesActives.some(p =>
		normalize(p.id_type_piece) === idType
		&& p.statut_verification === 'CONFORME'
		)
		).length
		
		/* En attente : types sans CONFORME mais avec EN_ATTENTE */
		const enAttente = typesRequisObligatoires.filter(idType => {
			const piecesType = piecesActives.filter(
				p => normalize(p.id_type_piece) === idType
			)
			const hasConforme = piecesType.some(p => p.statut_verification === 'CONFORME')
			if (hasConforme) return false
				return piecesType.some(p => p.statut_verification === 'EN_ATTENTE')
		}).length
		
		/* Non conformes */
		const nonConformes = pieceList.value.filter(
			p => p.statut_verification === 'NON_CONFORME'
		).length
		
		/* Manquantes : types obligatoires sans AUCUNE pièce active */
		const manquantes = typesRequisObligatoires
		.filter(idType => !typesFournis.has(idType))
		.length
		
		/* Progression */
		const progression = totalRequis === 0
		? 0
		: Math.round((conformes / totalRequis) * 100)
		
		/* ⭐ Décisions */
		const peutValider = totalRequis > 0
		&& nonConformes === 0
		&& enAttente === 0
		&& manquantes === 0
		
		const peutSoumettre = piecesActives.length > 0
		&& manquantes === 0
		&& nonConformes === 0
		
		return {
			total: totalRequis,
			conformes,
			nonConformes,
			enAttente,
			manquantes,
			progression,
			peutValider,
			peutSoumettre
		}
})

/* Anneau SVG */
const ringRadius = 42
const ringCircumference = 2 * Math.PI * ringRadius
const ringOffset = computed(() => {
	const p = statsSelected.value?.progression || 0
	return ringCircumference - (p / 100) * ringCircumference
})

/* ============================================================
 * PALETTES
 * ============================================================ */
const statutPalette = (s) => {
	const p = {
		BROUILLON:       { dot: 'bg-slate-400',   text: 'text-slate-700 dark:text-slate-300',     bg: 'bg-slate-500/10',   ring: 'ring-slate-500/20' },
		SOUMIS:          { dot: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-500/10',    ring: 'ring-blue-500/20' },
		EN_VERIFICATION: { dot: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10',  ring: 'ring-indigo-500/20' },
		A_COMPLETER:     { dot: 'bg-orange-500',  text: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-500/10',  ring: 'ring-orange-500/20' },
		VALIDE:          { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
		REJETE:          { dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10',     ring: 'ring-red-500/20' },
		CLOTURE:         { dot: 'bg-slate-500',   text: 'text-slate-600 dark:text-slate-400',     bg: 'bg-slate-500/10',   ring: 'ring-slate-500/20' }
	}
	return p[s] || p.BROUILLON
}

const piecePalette = (s) => {
	const p = {
		CONFORME:     { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
		NON_CONFORME: { dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10' },
		EN_ATTENTE:   { dot: 'bg-orange-500',  text: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-500/10' }
	}
	return p[s] || { dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' }
}


/* ============================================================
 * PEUT-ON SOUMETTRE ? (aligné sur DossiersFiscal.vue)
 * ============================================================ */
const peutSoumettre = computed(() => {
	if (!dossier.value) return false
		
		const normalize = (v) => String(v ?? '').trim()
		
		/* Pièces actives : on exclut les NON_CONFORME */
		const piecesActives = pieces.value.filter(
			p => p.statut_verification !== 'NON_CONFORME'
		)
		
		/* Types fournis */
		const typesFournis = new Set(
			piecesActives.map(p => normalize(p.id_type_piece)).filter(Boolean)
		)
		
		/* Types requis obligatoires */
		const typesRequisObligatoires = requis.value
		.filter(r => r.obligatoire === true)
		.map(r => normalize(r.id_type_piece))
		.filter(Boolean)
		
		/* Manquantes : types obligatoires sans AUCUNE pièce active */
		const manquantes = typesRequisObligatoires
		.filter(idType => !typesFournis.has(idType))
		.length
		
		/* Non conformes */
		const nonConformes = pieces.value.filter(
			p => p.statut_verification === 'NON_CONFORME'
		).length
		
		/* Décision : il faut au moins une pièce active, aucune manquante, aucune non conforme */
		return piecesActives.length > 0
		&& manquantes === 0
		&& nonConformes === 0
})

/* ============================================================
 * HELPERS
 * ============================================================ */
function formatBytes(n) {
	if (!n) return '—'
		if (n < 1024) return `${n} o`
			if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
				return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDateTime(iso) {
	if (!iso) return '—'
		return new Date(iso).toLocaleString('fr-FR', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		})
}

function relativeDate(iso) {
	if (!iso) return '—'
		const d = new Date(iso)
		const diffDays = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24))
		if (diffDays === 0) return "Aujourd'hui"
			if (diffDays === 1) return 'Hier'
				if (diffDays < 7)   return `Il y a ${diffDays} j`
					return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/* ============================================================
 * ACTIONS DOSSIER
 * ============================================================ */
async function soumettreDossier() {
	if (!selected.value) return
		
		/* ⭐ Vérification côté front alignée sur le backend (RG6) */
		if (!statsSelected.value?.peutSoumettre) {
			toast.error(
				'Toutes les pièces obligatoires doivent être fournies avant de soumettre.'
			)
			return
		}
		
		try {
			const response = await api.post(
				`/dossiers/${selected.value.id_dossier}/soumettre`
			)
			
			const dossier = response.data?.data
			
			if (dossier) {
				/* Recharger pour récupérer le nouveau statut + pièces */
				await openDossier({ id_dossier: dossier.id_dossier })
			} else {
				await openDossier(selected.value)
			}
			
			await fetchDossiers()
			toast.success('Dossier soumis avec succès.')
		} catch (error) {
			console.error('❌ Erreur soumission dossier :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de soumettre le dossier.'
			)
		}
}

/* ============================================================
 * UPLOAD PIÈCE
 * ============================================================ */
async function onUpload(e) {
	const file = e.target.files?.[0]
	if (!file || !selected.value) { e.target.value = ''; return }
	
	if (!selectedTypePiece.value) {
		toast.error('Veuillez sélectionner le type de pièce.')
		e.target.value = ''
		return
	}
	
	const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']
	if (!ACCEPTED.includes(file.type)) {
		toast.error('Format non autorisé (PDF, JPG, PNG).')
		e.target.value = ''
		return
	}
	
	if (file.size > 8 * 1024 * 1024) {
		toast.error('Le fichier ne doit pas dépasser 8 Mo.')
		e.target.value = ''
		return
	}
	
	isUploading.value = true
	
	try {
		const formData = new FormData()
		formData.append('fichier', file)
			formData.append('id_type_piece', selectedTypePiece.value)
				
				const response = await api.post(
					`/dossiers/${selected.value.id_dossier}/pieces`,
					formData,
					{ headers: { 'Content-Type': 'multipart/form-data' } }
				)
				
				const piece = response.data?.data
				if (!piece) throw new Error('Aucune donnée retournée.')
					
					/*  Recharger le dossier avec un objet minimal (id_dossier uniquement) */
					await openDossier({ id_dossier: selected.value.id_dossier })
					
					selectedTypePiece.value = ''
					toast.success('Pièce ajoutée avec succès.')
	} catch (error) {
		console.error('❌ Erreur upload :', error)
		toast.error(error.response?.data?.message || 'Impossible d’ajouter la pièce.')
	} finally {
		isUploading.value = false
		e.target.value = ''
	}
}

/* ============================================================
 * ANIMATION
 * ============================================================ */
function animerListe() {
	if (!listRef.value) return
		const items = listRef.value.querySelectorAll('[data-card]')
		if (!items.length) return
			
			gsap.fromTo(items,
						{ opacity: 0, y: 16, scale: 0.98 },
			   { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }
			)
}

/* ============================================================
 * NAVIGATION
 * ============================================================ */
function goToCreateDossier() {
	window.location.href = '/create_dossiers'
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	await fetchDossiers()
	
	connectSocket()
	socket.on('dossier:updated', onDossierUpdated)
})

onBeforeUnmount(() => {
	socket.off('dossier:updated', onDossierUpdated)
})
</script>

<template>
<div class="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
<div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">

<AnimatePresence mode="wait">

<!-- ============================================================
VUE LISTE
============================================================ -->
<motion.div
v-if="!selected"
key="list"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
:transition="{ duration: 0.2 }"
class="space-y-6"
>

<!-- HERO -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
<div class="lg:col-span-2 flex flex-col justify-between">
<div>
<p class="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--primary)]">
Espace contribuable
</p>
<h1 class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
Mes dossiers
<span class="block text-[var(--primary)]">fiscaux.</span>
</h1>
<p class="mt-3 text-sm sm:text-base text-[var(--text-muted)] max-w-lg">
Suivez l'avancement de vos demandes, gérez vos pièces justificatives et consultez vos traitements.
</p>
</div>

<div class="mt-6 flex flex-wrap items-center gap-3">
<motion.button
@click="goToCreateDossier"
:whileHover="{ scale: 1.03, y: -1 }"
:whileTap="{ scale: 0.97 }"
class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
</svg>
Nouveau dossier
</motion.button>
<p class="text-xs text-[var(--text-muted)] hidden sm:block">
ou déposez une pièce depuis un dossier existant
</p>
</div>
</div>

<!-- Carte vue d'ensemble -->
<motion.div
:initial="{ opacity: 0, x: 20 }"
:animate="{ opacity: 1, x: 0 }"
:transition="{ duration: 0.4, delay: 0.1 }"
class="rounded-3xl bg-gradient-to-br from-[var(--primary)] to-blue-700 p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden"
>
<div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none"></div>
<div class="absolute -right-6 -bottom-16 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>

<div class="relative">
<p class="text-[11px] uppercase tracking-wider font-semibold text-white/70">
Vue d'ensemble
</p>
<p class="mt-3 text-5xl font-black tabular-nums leading-none">
{{ dossiers.length }}
</p>
<p class="text-sm text-white/80 mt-1">dossiers actifs</p>

<div class="mt-5 pt-5 border-t border-white/20 grid grid-cols-2 gap-3">
<div>
<p class="text-2xl font-bold tabular-nums">
{{ dossiers.filter(d => d.statut_dossier === 'EN_VERIFICATION').length }}
</p>
<p class="text-[11px] text-white/70 mt-0.5">En vérification</p>
</div>
<div>
<p class="text-2xl font-bold tabular-nums">
{{ dossiers.filter(d => d.statut_dossier === 'A_COMPLETER').length }}
</p>
<p class="text-[11px] text-white/70 mt-0.5">À compléter</p>
</div>
</div>
</div>
</motion.div>
</div>

<!-- FILTRES EN TUILES -->
<div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
<motion.button
v-for="c in counters"
:key="c.key"
type="button"
:whileHover="{ y: -4 }"
:whileTap="{ scale: 0.98 }"
:transition="{ type: 'spring', stiffness: 320, damping: 22 }"
@click="filtre = filtre === c.key ? 'TOUS' : c.key"
:class="[
'group relative text-left rounded-2xl p-4 transition-all duration-200 overflow-hidden',
filtre === c.key
? 'bg-[var(--primary)] text-white shadow-lg shadow-blue-500/25'
: 'bg-[var(--card)] hover:bg-[var(--hover)]'
]"
>
<div :class="[
'absolute -right-6 -top-6 w-20 h-20 rounded-full transition-opacity duration-300 pointer-events-none',
filtre === c.key ? 'bg-white/10' : 'bg-[var(--primary)]/5 opacity-0 group-hover:opacity-100'
]"></div>

<p :class="[
'relative text-[10px] uppercase tracking-wider font-bold truncate',
filtre === c.key ? 'text-white/70' : 'text-[var(--text-muted)]'
]">
{{ c.label }}
</p>
<p :class="[
'relative mt-2 text-3xl font-black tabular-nums leading-none',
filtre === c.key ? 'text-white' : 'text-[var(--text)]'
]">
{{ c.value }}
</p>
</motion.button>
</div>

<!-- RECHERCHE -->
<div class="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--card)]">
<svg class="w-5 h-5 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="q"
type="search"
placeholder="Rechercher une référence, un service ou un NIF…"
class="flex-1 bg-transparent border-0 outline-none text-sm text-[var(--text)] placeholder-[var(--text-muted)]"
/>
<kbd class="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg)] text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)]">
⌘ K
</kbd>
</div>

<!-- LISTE -->
<div ref="listRef" class="space-y-3">

<!-- Loading -->
<div v-if="isLoading" class="space-y-3">
<div v-for="n in 3" :key="n" class="h-32 rounded-3xl bg-[var(--card)] animate-pulse"></div>
</div>

<!-- Erreur -->
<div v-else-if="errorMessage" class="rounded-3xl bg-red-50 dark:bg-red-500/10 p-12 text-center">
<p class="text-sm font-medium text-red-600 dark:text-red-300">{{ errorMessage }}</p>
<button
@click="fetchDossiers"
class="mt-3 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-blue-600 transition"
>
Réessayer
</button>
</div>

<!-- Vide -->
<div
v-else-if="filtered.length === 0"
class="rounded-3xl bg-[var(--card)] p-12 text-center"
>
<div class="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-4">
<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>
<p class="text-sm font-bold">Aucun dossier trouvé</p>
<p class="text-xs text-[var(--text-muted)] mt-1">
Essayez un autre filtre ou une autre recherche.
</p>
</div>

<!-- Cartes dossier -->
<motion.article
v-for="(d, i) in filtered"
:key="d.id_dossier"
data-card
@click="openDossier(d)"
:initial="{ opacity: 0, y: 14 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.3, delay: i * 0.03 }"
:whileHover="{ y: -2, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }"
class="group cursor-pointer rounded-3xl bg-[var(--card)] p-5 sm:p-6 transition-colors"
>
<div class="flex flex-wrap items-center gap-4">
<!-- Bloc gauche -->
<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 flex-wrap mb-2">
<span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider', statutPalette(d.statut_dossier).bg, statutPalette(d.statut_dossier).text]">
<span :class="['w-1.5 h-1.5 rounded-full', statutPalette(d.statut_dossier).dot]"></span>
{{ labels[d.statut_dossier] || d.statut_dossier }}
</span>

<!-- ⭐ Badge manquantes : uniquement pour statuts pertinents -->
<span
v-if="d.pieces_manquantes && ['SOUMIS', 'EN_VERIFICATION', 'A_COMPLETER'].includes(d.statut_dossier)"
class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white"
>
<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
{{ d.pieces_manquantes }} manquante{{ d.pieces_manquantes > 1 ? 's' : '' }}
</span>
</div>

<h3 class="text-lg font-bold truncate group-hover:text-[var(--primary)] transition-colors">
{{ d.service?.libelle_service || 'Service non renseigné' }}
</h3>

<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
<span class="font-mono">{{ d.reference_dossier }}</span>
<span class="w-1 h-1 rounded-full bg-current opacity-40"></span>
<span>Pré-déposé {{ relativeDate(d.date_predepot) }}</span>
<template v-if="d.rdv">
<span class="w-1 h-1 rounded-full bg-current opacity-40"></span>
<span class="text-[var(--primary)] font-medium">
RDV {{ new Date(d.rdv.date_rdv).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }} · {{ d.rdv.heure_rdv?.slice(0,5) }}
</span>
</template>
</div>
</div>

<!-- Métriques -->
<div class="flex items-center gap-5 shrink-0">
<div class="text-center">
<p class="text-xl font-black tabular-nums">{{ d.pieces_total || 0 }}</p>
<p class="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mt-0.5">Pièces</p>
</div>

<div class="text-center">
<p class="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
{{ d.pieces_conformes || 0 }}
</p>
<p class="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mt-0.5">Conf.</p>
</div>

<div class="hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-[var(--bg)] group-hover:bg-[var(--primary)] group-hover:text-white text-[var(--text-muted)] transition-colors">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</div>
</div>
</div>
</motion.article>
</div>
</motion.div>

<!-- ============================================================
VUE DÉTAIL
============================================================ -->
<motion.div
v-else
key="detail"
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -12 }"
:transition="{ duration: 0.25 }"
class="space-y-5"
>

<!-- Bouton retour -->
<motion.button
@click="closeDossier"
:whileHover="{ x: -3 }"
:whileTap="{ scale: 0.97 }"
class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
</svg>
Tous mes dossiers
</motion.button>

<!-- HERO détail -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

<!-- Bloc titre + méta -->
<div class="lg:col-span-2 rounded-3xl bg-[var(--card)] p-6 sm:p-7 relative overflow-hidden">
<div class="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[var(--primary)]/5 pointer-events-none"></div>

<div class="relative">
<div class="flex flex-wrap items-start justify-between gap-4">
<div class="min-w-0">
<p class="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
Dossier fiscal
</p>
<h1 class="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight">
{{ selected.reference_dossier }}
</h1>
<p class="mt-2 text-base text-[var(--text-muted)]">
{{ selected.service?.libelle_service || 'Service non renseigné' }}
</p>
</div>

<div class="flex items-center gap-2 flex-wrap justify-end">
<span
:class="[
'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider',
statutPalette(selected.statut_dossier).bg,
statutPalette(selected.statut_dossier).text
]"
>
<span :class="['w-2 h-2 rounded-full', statutPalette(selected.statut_dossier).dot]"></span>
{{ labels[selected.statut_dossier] }}
</span>

<!-- ⭐ Bouton Soumettre : condition alignée sur backend -->
<button
v-if="['BROUILLON', 'A_COMPLETER'].includes(selected.statut_dossier)"
type="button"
@click="soumettreDossier"
:disabled="!statsSelected?.peutSoumettre"
class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--primary)]"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14m-6-6 6 6-6 6"/>
</svg>
{{ selected.statut_dossier === 'A_COMPLETER' ? 'Resoumettre' : 'Soumettre le dossier' }}
</button>
</div>
</div>

<!-- Meta pills -->
<div class="mt-6 flex flex-wrap gap-2">
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg)] text-xs text-[var(--text-muted)]">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
Pré-dépôt : {{ new Date(selected.date_predepot).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }}
</span>
<span v-if="selected.rdv" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-xs text-[var(--primary)] font-medium">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
RDV #{{ selected.rdv.id_rdv }} · {{ selected.rdv.heure_rdv?.slice(0,5) }}
</span>
</div>
</div>
</div>

<!-- Anneau progression -->
<div class="rounded-3xl bg-[var(--card)] p-6 flex flex-col items-center justify-center">
<p class="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] self-start">
Conformité
</p>

<div class="relative mt-3">
<svg width="120" height="120" class="-rotate-90">
<circle cx="60" cy="60" :r="ringRadius" fill="none" stroke="var(--border)" stroke-width="8"/>
<motion.circle
cx="60" cy="60" :r="ringRadius" fill="none"
stroke="var(--primary)"
stroke-width="8"
stroke-linecap="round"
:stroke-dasharray="ringCircumference"
:initial="{ strokeDashoffset: ringCircumference }"
:animate="{ strokeDashoffset: ringOffset }"
:transition="{ duration: 1, ease: 'easeOut' }"
/>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<p class="text-3xl font-black tabular-nums">{{ statsSelected?.progression || 0 }}%</p>
<p class="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Complet</p>
</div>
</div>

<div class="mt-3 text-xs text-[var(--text-muted)] text-center">
{{ statsSelected?.conformes || 0 }} / {{ statsSelected?.total || 0 }} types conformes
</div>
</div>
</div>

<!-- STATS BENTO -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
<div class="rounded-3xl bg-[var(--card)] p-5">
<div class="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3">
<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
</div>
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Contribuable</p>
<p class="font-bold text-sm truncate mt-1">
{{ selected.contribuable?.nom_raison_sociale || '—' }}
</p>
<p class="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
NIF {{ selected.contribuable?.nif || '—' }}
</p>
</div>

<div class="rounded-3xl bg-emerald-500/10 p-5">
<div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
</svg>
</div>
<p class="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300">Conformes</p>
<p class="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
{{ statsSelected?.conformes || 0 }}
</p>
</div>

<div class="rounded-3xl bg-red-500/10 p-5">
<div class="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center mb-3">
<svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</div>
<p class="text-[10px] uppercase tracking-wider font-bold text-red-700 dark:text-red-300">Non conformes</p>
<p class="text-3xl font-black tabular-nums text-red-600 dark:text-red-400 mt-1">
{{ statsSelected?.nonConformes || 0 }}
</p>
</div>

<div class="rounded-3xl bg-orange-500/10 p-5">
<div class="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center mb-3">
<svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<p class="text-[10px] uppercase tracking-wider font-bold text-orange-700 dark:text-orange-300">Manquantes</p>
<p class="text-3xl font-black tabular-nums text-orange-600 dark:text-orange-400 mt-1">
{{ statsSelected?.manquantes || 0 }}
</p>
</div>
</div>

<!-- SEGMENTED CONTROL -->
<div class="inline-flex p-1 rounded-2xl bg-[var(--card)]">
<button
v-for="tab in [
{ id: 'pieces', label: 'Pièces', badge: pieceList.length },
{ id: 'infos',  label: 'Plus de détail', badge: 0 }
]"
:key="tab.id"
type="button"
@click="onglet = tab.id"
class="relative px-4 sm:px-5 py-2.5 text-sm font-bold rounded-xl transition-colors"
>
<span class="relative z-10 flex items-center gap-2">
<span :class="onglet === tab.id ? 'text-white' : 'text-[var(--text-muted)]'">
{{ tab.label }}
</span>
<span
v-if="tab.badge"
:class="[
'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
onglet === tab.id ? 'bg-white/25 text-white' : 'bg-[var(--bg)] text-[var(--text-muted)]'
]"
>
{{ tab.badge }}
</span>
</span>

<motion.div
v-if="onglet === tab.id"
layout-id="segmented-pill"
:transition="{ type: 'spring', stiffness: 400, damping: 32 }"
class="absolute inset-0 rounded-xl bg-[var(--primary)] shadow-sm shadow-blue-500/20"
></motion.div>
</button>
</div>

<!-- CONTENU ONGLET -->
<AnimatePresence mode="wait">

<!-- PIÈCES -->
<motion.section
v-if="onglet === 'pieces'"
key="pieces"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -10 }"
:transition="{ duration: 0.2 }"
class="space-y-3"
>
<!-- Zone upload -->
<div
v-if="['BROUILLON', 'A_COMPLETER'].includes(selected.statut_dossier)"
class="rounded-3xl bg-[var(--card)] p-6 sm:p-7 relative overflow-hidden"
>
<div class="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[var(--primary)]/5 pointer-events-none"></div>

<div class="relative">
<div class="flex items-start gap-3 mb-5">
<div class="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
</svg>
</div>
<div>
<h3 class="font-bold text-base">Ajouter une pièce justificative</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
PDF, PNG, JPG · 8 Mo max · Types acceptés selon le service fiscal
</p>
</div>
</div>

<div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
<div>
<label for="type-piece" class="block text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
Sélectionnez le type de pièce à importer
</label>
<select
id="type-piece"
v-model="selectedTypePiece"
:disabled="!typesAInserer.length"
class="w-full rounded-2xl bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:opacity-50"
>
<option value="">
<template v-if="typesAInserer.length === 0">
Toutes les pièces sont fournies
</template>
<template v-else>
Sélectionner le type ({{ typesAInserer.length }} disponible{{ typesAInserer.length > 1 ? 's' : '' }})
</template>
</option>

<option
v-for="type in typesAInserer"
:key="type.id_type_piece"
:value="type.id_type_piece"
>
{{ type.libelle }}
<template v-if="isTypeNonConforme(type)"> — ⚠ à remplacer</template>
<template v-else-if="type.multiple"> — multiple ({{ countType(type) }} déposée{{ countType(type) > 1 ? 's' : '' }})</template>
<template v-else>{{ type.obligatoire ? ' — obligatoire' : ' — facultatif' }}</template>
</option>
</select>

<!-- Message si tout est fourni -->
<p
v-if="requisList.length > 0 && typesAInserer.length === 0"
class="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
</svg>
Toutes les pièces obligatoires ont été fournies.
</p>

</div>

<label
for="piece-file"
	:class="[
	'group inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition',
!selectedTypePiece || isUploading
? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
: 'bg-[var(--primary)] text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
]"
>
<svg v-if="isUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
</svg>
{{ isUploading ? 'Envoi…' : 'Choisir un fichier' }}
</label>

<input
id="piece-file"
type="file"
accept=".pdf,.jpg,.jpeg,.png"
class="hidden"
:disabled="!selectedTypePiece || isUploading"
@change="onUpload"
/>
</div>

<p v-if="requisList.length === 0" class="mt-3 text-xs text-orange-600 dark:text-orange-400">
Aucun type de pièce configuré pour ce service.
</p>
</div>
</div>

<!-- Bandeau info si dossier déjà soumis -->
<div
v-else
class="rounded-2xl bg-[var(--bgListCard)] border border-[var(--borderListCard)] p-4 flex items-start gap-3"
>
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--textListCard)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p class="text-xs text-[var(--textListCard)]">
Ce dossier est actuellement <strong>{{ labels[selected.statut_dossier] }}</strong>. Il n'est plus possible d'y ajouter de pièces à cette étape.
</p>
</div>

<!-- Liste des pièces -->
<article
v-for="p in pieceList"
:key="p.id_piece"
:class="[
'rounded-3xl p-5 transition-colors',
p.statut_verification === 'NON_CONFORME'
? 'bg-red-500/5 ring-1 ring-red-500/20'
: 'bg-[var(--card)]'
]"
>
<div class="flex items-start gap-4">
<!-- Icône statut -->
<div :class="['w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', piecePalette(p.statut_verification).bg]">
<svg :class="['w-5 h-5', piecePalette(p.statut_verification).text]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>

<!-- Infos -->
<div class="flex-1 min-w-0">
<div class="flex items-start justify-between gap-3 flex-wrap">
<div class="min-w-0 flex-1">
<!-- Ligne 1 : Nom fichier + Badge service -->
<div class="flex items-center gap-2 flex-wrap">
<p class="font-bold text-sm truncate">{{ p.nom_fichier }}</p>

<span
v-if="selected.service?.libelle_service"
class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)]"
>
{{ selected.service.libelle_service }}
</span>
</div>

<!-- Ligne 2 : Type + méta -->
<p class="text-xs text-[var(--text-muted)] mt-1">
<strong>{{ p.type_piece_libelle || 'Pièce' }}</strong>
· {{ p.type_mime }} · {{ formatBytes(p.taille_fichier) }} · {{ relativeDate(p.date_upload) }}
</p>

<!-- Ligne 3 : Hash -->
<p v-if="p.empreinte_hash" class="mt-1 font-mono text-[10px] text-[var(--text-muted)] truncate opacity-70">
HASH {{ p.empreinte_hash }}
</p>
</div>

<!-- Badge statut -->
<span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0', piecePalette(p.statut_verification).bg, piecePalette(p.statut_verification).text]">
<span :class="['w-1.5 h-1.5 rounded-full', piecePalette(p.statut_verification).dot]"></span>
{{ p.statut_verification.replace('_', ' ') }}
</span>
</div>

<!-- Commentaire agent -->
<div v-if="p.commentaire_verification" class="mt-3 pl-3 border-l-2 border-[var(--primary)]">
<p class="text-xs">
<span class="font-semibold">{{ p.agent || 'Agent' }} —</span>
<span class="text-[var(--text-muted)]"> {{ p.commentaire_verification }}</span>
</p>
</div>
</div>
</div>

<!-- Badge "À remplacer" pour les non conformes -->
<div
v-if="p.statut_verification === 'NON_CONFORME'"
class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold"
>
<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
</svg>
À remplacer
</div>
</article>

<div v-if="pieceList.length === 0" class="rounded-3xl bg-[var(--card)] p-12 text-center">
<div class="w-14 h-14 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-3">
<svg class="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>
<p class="text-sm font-medium">Aucune pièce justificative</p>
<p class="text-xs text-[var(--text-muted)] mt-1">Ajoutez votre première pièce ci-dessus.</p>
</div>
</motion.section>

<DossierExtraTabs
v-if="selected"
:key="selected.id_dossier"
:dossier-id="selected.id_dossier"
class="mt-6"
/>

<!-- INFOS MLD -->
<motion.section
v-else
key="infos"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -10 }"
:transition="{ duration: 0.2 }"
class="rounded-3xl bg-[var(--card)] overflow-hidden"
>
<div
v-for="row in [
{ k: 'Dossier',              v: selected.id_dossier, mono: true },
{ k: 'Référence de dossier', v: selected.reference_dossier, mono: true },
{ k: 'Date de prédépôt',     v: new Date(selected.date_predepot).toLocaleDateString('fr-FR') },
{ k: 'Statut de dossier',    v: selected.statut_dossier, mono: true },
{ k: 'Contribuable',         v: selected.id_contribuable, mono: true },
{ k: 'Service',              v: selected.id_service, mono: true },
{ k: 'Référence de RDV',     v: selected.id_rdv ?? 'Sans rendez-vous lié', mono: true }
]"
:key="row.k"
class="flex justify-between items-center px-6 py-4 hover:bg-[var(--hover)] transition-colors border-b border-[var(--border)] last:border-0"
>
<span class="font-mono text-xs text-[var(--text-muted)]">{{ row.k }}</span>
<span :class="['text-sm font-semibold', row.mono ? 'font-mono' : '']">{{ row.v }}</span>
</div>
</motion.section>

</AnimatePresence>
</motion.div>
</AnimatePresence>
</div>
</div>
</template>
