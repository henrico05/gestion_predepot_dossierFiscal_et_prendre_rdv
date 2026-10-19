<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
const stats = ref(null)
const dossiers = ref([])
const isLoading = ref(true)
const isLoadingStats = ref(true)
const searchQuery = ref('')
const activeFilter = ref('TOUS')
const currentFolder = ref(null)
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const verificationComment = ref('')

/* Aperçu pièce */
const piecePreviewUrl = ref('')
const piecePreviewMime = ref('')
const isLoadingPreview = ref(false)
const piecePreviewError = ref('')

/* ============================================================
 * CHARGEMENT
 * ============================================================ */
async function chargerStats() {
	isLoadingStats.value = true
	try {
		const { data } = await api.get('/stats/verificateur')
		stats.value = data?.data || null
	} catch (error) {
		console.error('❌ Erreur stats :', error)
	} finally {
		isLoadingStats.value = false
	}
}

async function chargerDossiers() {
	isLoading.value = true
	try {
		const { data } = await api.get('/verification/dossiers')
		dossiers.value = data?.data || []
	} catch (error) {
		console.error('❌ Erreur dossiers :', error)
		toast.error(
			error.response?.data?.message ||
			'Impossible de charger les dossiers.'
		)
	} finally {
		isLoading.value = false
	}
}

async function chargerDetailDossier(id) {
	try {
		const { data } = await api.get(`/agent/dossiers/${id}`)
		return data?.data || null
	} catch (error) {
		console.error('❌ Erreur détail :', error)
		toast.error('Impossible de charger le détail du dossier.')
		return null
	}
}

/* ============================================================
 * FILTRES
 * ============================================================ */
const filters = computed(() => [
	{ key: 'TOUS', label: 'Tous', count: dossiers.value.length },
	{
		key: 'SOUMIS',
		label: 'À traiter',
		count: dossiers.value.filter(d => d.statut_dossier === 'SOUMIS').length
	},
	{
		key: 'EN_VERIFICATION',
		label: 'En cours',
		count: dossiers.value.filter(d => d.statut_dossier === 'EN_VERIFICATION').length
	},
	{
		key: 'A_COMPLETER',
		label: 'À compléter',
		count: dossiers.value.filter(d => d.statut_dossier === 'A_COMPLETER').length
	}
])

const filteredDossiers = computed(() => {
	let out = dossiers.value
	
	if (activeFilter.value !== 'TOUS') {
		out = out.filter(d => d.statut_dossier === activeFilter.value)
	}
	
	const q = searchQuery.value.trim().toLowerCase()
	if (q) {
		out = out.filter(d => {
			const haystack = [
				d.reference_dossier,
				d.nom_raison_sociale,
				d.nif,
				d.libelle_service
			].filter(Boolean).join(' ').toLowerCase()
			return haystack.includes(q)
		})
	}
	
	return out
})

/* ============================================================
 * MODAL — OUVERTURE
 * ============================================================ */
async function openVerification(dossier) {
	currentFolder.value = { ...dossier, pieces: [], isLoadingDetail: true }
	verificationComment.value = ''
	isModalOpen.value = true
	
	/* Charger le détail complet (avec pièces) */
	const detail = await chargerDetailDossier(dossier.id_dossier)
	if (detail) {
		currentFolder.value = { ...detail, isLoadingDetail: false }
	}
}

function closeModal() {
	if (isSubmitting.value) return
		libererPiecePreview()
		isModalOpen.value = false
		currentFolder.value = null
		verificationComment.value = ''
}

/* ============================================================
 * APERÇU PIÈCE
 * ============================================================ */
function libererPiecePreview() {
	if (piecePreviewUrl.value?.startsWith('blob:')) {
		URL.revokeObjectURL(piecePreviewUrl.value)
	}
	piecePreviewUrl.value = ''
	piecePreviewMime.value = ''
	piecePreviewError.value = ''
}

async function visualiserPiece(id_piece) {
	if (!id_piece) return
		libererPiecePreview()
		isLoadingPreview.value = true
		
		try {
			const response = await api.get(`/pieces/${id_piece}/visualiser`, {
				responseType: 'blob'
			})
			const mime = response.headers['content-type'] || 'application/octet-stream'
			const blob = new Blob([response.data], { type: mime })
			piecePreviewMime.value = mime
			piecePreviewUrl.value = URL.createObjectURL(blob)
		} catch (error) {
			console.error('❌ Erreur visualisation :', error)
			piecePreviewError.value = 'Impossible de visualiser la pièce.'
		} finally {
			isLoadingPreview.value = false
		}
}

/* ============================================================
 * VÉRIFICATION PIÈCE
 * ============================================================ */
async function verifierPiece(piece, statut) {
	try {
		await api.patch(`/pieces/${piece.id_piece}/verifier`, {
			statut_verification: statut,
			commentaire_verification:
			statut === 'NON_CONFORME'
			? 'Pièce non conforme.'
			: null
		})
		
		/* Mise à jour locale */
		if (currentFolder.value?.pieces) {
			const p = currentFolder.value.pieces.find(x => x.id_piece === piece.id_piece)
			if (p) p.statut_verification = statut
		}
		
		toast.success(
			statut === 'CONFORME'
			? 'Pièce marquée conforme.'
			: 'Pièce marquée non conforme.'
		)
	} catch (error) {
		console.error('❌ Erreur vérif pièce :', error)
		toast.error(
			error.response?.data?.message ||
			'Impossible de vérifier cette pièce.'
		)
	}
}

/* ============================================================
 * DÉCISION DOSSIER
 * ============================================================ */
async function commencerVerification() {
	if (!currentFolder.value) return
		try {
			await api.patch(`/dossiers/${currentFolder.value.id_dossier}/commencer-verification`)
			await chargerDossiers()
			currentFolder.value.statut_dossier = 'EN_VERIFICATION'
			toast.success('Vérification démarrée.')
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
				'Impossible de démarrer la vérification.'
			)
		}
}

async function deciderDossier(decision) {
	if (!currentFolder.value) return
		
		if (decision === 'REJETE' && !verificationComment.value.trim()) {
			toast.warning('Un motif est obligatoire pour rejeter.')
			return
		}
		
		isSubmitting.value = true
		try {
			await api.patch(`/dossiers/${currentFolder.value.id_dossier}/decision`, {
				decision,
				commentaire: verificationComment.value.trim() || null
			})
			
			toast.success(
				decision === 'VALIDE'
				? 'Dossier validé.'
				: decision === 'REJETE'
				? 'Dossier rejeté.'
				: 'Complément demandé.'
			)
			
			closeModal()
			await Promise.all([chargerDossiers(), chargerStats()])
		} catch (error) {
			console.error('❌ Erreur décision :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible d\'enregistrer la décision.'
			)
		} finally {
			isSubmitting.value = false
		}
}

/* ============================================================
 * SOCKET
 * ============================================================ */
function onDossierUpdated() {
	chargerDossiers()
	chargerStats()
}

/* ============================================================
 * HELPERS
 * ============================================================ */
function formaterDate(iso) {
	if (!iso) return '—'
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
}

function formaterTaille(bytes) {
	if (!bytes) return '—'
		if (bytes < 1024) return `${bytes} o`
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
				return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

const STATUT_LABEL = {
	SOUMIS: 'À traiter',
	EN_VERIFICATION: 'En cours',
	A_COMPLETER: 'À compléter',
	VALIDE: 'Validé',
	REJETE: 'Rejeté',
	CLOTURE: 'Clôturé'
}

const STATUT_TONE = {
	SOUMIS: {
		bg: 'bg-blue-500/10',
		text: 'text-blue-600 dark:text-blue-400',
		dot: 'bg-blue-500'
	},
	EN_VERIFICATION: {
		bg: 'bg-indigo-500/10',
		text: 'text-indigo-600 dark:text-indigo-400',
		dot: 'bg-indigo-500'
	},
	A_COMPLETER: {
		bg: 'bg-orange-500/10',
		text: 'text-orange-600 dark:text-orange-400',
		dot: 'bg-orange-500'
	},
	VALIDE: {
		bg: 'bg-emerald-500/10',
		text: 'text-emerald-600 dark:text-emerald-400',
		dot: 'bg-emerald-500'
	},
	REJETE: {
		bg: 'bg-red-500/10',
		text: 'text-red-600 dark:text-red-400',
		dot: 'bg-red-500'
	}
}

function statutTone(s) {
	return STATUT_TONE[s] || STATUT_TONE.SOUMIS
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	await Promise.all([chargerStats(), chargerDossiers()])
	socket.on('dossier:updated', onDossierUpdated)
	socket.on('file:refresh', onDossierUpdated)
})

onBeforeUnmount(() => {
	libererPiecePreview()
	socket.off('dossier:updated', onDossierUpdated)
	socket.off('file:refresh', onDossierUpdated)
})
</script>

<template>
<div class="space-y-6 mx-6 my-8">

<!-- ============================================================
* KPI
* ============================================================ -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
<motion.div
v-for="(kpi, i) in [
{
key: 'aTraiter',
label: 'À traiter',
value: stats?.aTraiter ?? 0,
sub: 'Dossiers soumis',
icon: 'inbox',
tone: 'primary'
},
{
key: 'enCours',
label: 'En vérification',
value: stats?.enCours ?? 0,
sub: 'En cours de contrôle',
icon: 'search',
tone: 'warning'
},
{
key: 'valides',
label: 'Validés aujourd\'hui',
value: stats?.validesAujourdhui ?? 0,
sub: 'Dossiers approuvés',
icon: 'check',
tone: 'success'
},
{
key: 'temps',
label: 'Temps moyen',
value: `${stats?.tempsMoyen ?? 0} min`,
sub: 'Par dossier traité',
icon: 'clock',
tone: 'primary'
}
]"
:key="kpi.key"
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.35, delay: i * 0.06 }"
:whileHover="{ y: -3 }"
class="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
>
<div
:class="[
'absolute -right-6 -top-6 w-24 h-24 rounded-full pointer-events-none',
kpi.tone === 'primary' ? 'bg-blue-500/10' : '',
kpi.tone === 'success' ? 'bg-emerald-500/10' : '',
kpi.tone === 'warning' ? 'bg-orange-500/10' : ''
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
'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
kpi.tone === 'primary' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : '',
kpi.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : '',
kpi.tone === 'warning' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : ''
]"
>
<svg v-if="kpi.icon === 'inbox'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M5 13l4 4L19 7"/>
</svg>
<svg v-else-if="kpi.icon === 'search'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<svg v-else-if="kpi.icon === 'check'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
</div>
</motion.div>
</div>

<!-- ============================================================
* FILTRES + RECHERCHE
* ============================================================ -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
<!-- Onglets -->
<div class="inline-flex p-1 rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-x-auto scrollbar-thin">
<button
v-for="f in filters"
:key="f.key"
type="button"
@click="activeFilter = f.key"
:class="[
'relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2',
activeFilter === f.key
? 'bg-[var(--primary)] text-white shadow-sm'
: 'text-[var(--text-muted)] hover:text-[var(--text)]'
]"
>
{{ f.label }}
<span
v-if="f.count > 0"
:class="[
'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
activeFilter === f.key
? 'bg-white/25 text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)]'
]"
>
{{ f.count }}
</span>
</button>
</div>

<!-- Recherche -->
<div class="relative w-full md:w-80">
<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="searchQuery"
type="text"
placeholder="Rechercher un dossier, un NIF…"
class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
/>
</div>
</div>

<!-- ============================================================
* TABLEAU
* ============================================================ -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.15 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
>
<!-- Loading -->
<div v-if="isLoading" class="p-6 space-y-3">
<div v-for="n in 5" :key="n" class="h-16 rounded-xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Vide -->
<div v-else-if="filteredDossiers.length === 0" class="py-16 text-center">
<div class="w-14 h-14 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-3">
<svg class="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>
<p class="text-sm font-semibold text-[var(--text)]">Aucun dossier trouvé</p>
<p class="text-xs text-[var(--text-muted)] mt-1">
Essayez un autre filtre ou une autre recherche.
</p>
</div>

<!-- Tableau -->
<div v-else class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="bg-[var(--bg)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
<tr>
<th class="text-left px-5 py-3 font-semibold">Dossier</th>
<th class="text-left px-5 py-3 font-semibold">Contribuable</th>
<th class="text-left px-5 py-3 font-semibold">Service</th>
<th class="text-left px-5 py-3 font-semibold">Pièces</th>
<th class="text-left px-5 py-3 font-semibold">Date</th>
<th class="text-left px-5 py-3 font-semibold">Statut</th>
<th class="text-right px-5 py-3 font-semibold">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-[var(--border)]">
<motion.tr
v-for="d in filteredDossiers"
:key="d.id_dossier"
:initial="{ opacity: 0, y: 6 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.25 }"
class="hover:bg-[var(--hover)] transition"
>
<td class="px-5 py-3">
<p class="font-mono font-bold text-[var(--text)] text-xs">
{{ d.reference_dossier }}
</p>
</td>
<td class="px-5 py-3">
<p class="font-medium text-[var(--text)] truncate max-w-[180px]">
{{ d.nom_raison_sociale }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
NIF {{ d.nif }}
</p>
</td>
<td class="px-5 py-3 text-[var(--text-muted)] text-xs">
{{ d.libelle_service || '—' }}
</td>
<td class="px-5 py-3">
<div class="flex items-center gap-2 text-xs">
<span class="inline-flex items-center gap-1 font-bold text-[var(--text)] tabular-nums">
{{ d.pieces_total || 0 }}
</span>
<span class="text-[var(--text-muted)]">pièces</span>
<span
v-if="d.pieces_manquantes > 0"
class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400"
>
⚠ {{ d.pieces_manquantes }}
</span>
</div>
</td>
<td class="px-5 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
{{ formaterDate(d.date_predepot) }}
</td>
<td class="px-5 py-3">
<span
:class="[
'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
statutTone(d.statut_dossier).bg,
statutTone(d.statut_dossier).text
]"
>
<span :class="['w-1.5 h-1.5 rounded-full', statutTone(d.statut_dossier).dot]"></span>
{{ STATUT_LABEL[d.statut_dossier] || d.statut_dossier }}
</span>
</td>
<td class="px-5 py-3 text-right">
<button
@click="openVerification(d)"
class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:bg-blue-600 transition"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>
Vérifier
</button>
</td>
</motion.tr>
</tbody>
</table>
</div>
</motion.div>

<!-- ============================================================
* MODAL DE VÉRIFICATION
* ============================================================ -->
<AnimatePresence>
<motion.div
v-if="isModalOpen"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
@click.self="closeModal"
>
<motion.div
:initial="{ opacity: 0, scale: 0.95, y: 20 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.95, y: 20 }"
:transition="{ duration: 0.2 }"
class="w-full max-w-4xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
>
<!-- Header modal -->
<div class="flex items-start justify-between gap-3 px-6 py-4 border-b border-[var(--border)]">
<div class="min-w-0">
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--primary)]">
Vérification
</p>
<h3 class="text-lg font-black text-[var(--text)] font-mono mt-0.5 truncate">
{{ currentFolder?.reference_dossier }}
</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5 truncate">
{{ currentFolder?.nom_raison_sociale }} · {{ currentFolder?.libelle_service }}
</p>
</div>
<button
@click="closeModal"
:disabled="isSubmitting"
class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover)] transition disabled:opacity-50"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>

<!-- Corps -->
<div class="flex-1 overflow-y-auto p-6 space-y-4">

<!-- Bouton démarrer vérification si SOUMIS -->
<div
v-if="currentFolder?.statut_dossier === 'SOUMIS'"
class="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
>
<div class="flex items-start gap-3 min-w-0">
<div class="shrink-0 w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<div class="min-w-0">
<p class="text-sm font-bold text-blue-700 dark:text-blue-300">
Ce dossier est en attente de traitement
</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Démarrez la vérification pour pouvoir contrôler les pièces.
</p>
</div>
</div>
<button
@click="commencerVerification"
class="shrink-0 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-blue-600 transition"
>
Démarrer
</button>
</div>

<!-- Pièces -->
<div>
<div class="flex items-center justify-between mb-3">
<h4 class="text-sm font-bold text-[var(--text)]">
Pièces justificatives
</h4>
<span class="text-xs text-[var(--text-muted)]">
{{ currentFolder?.pieces?.length || 0 }} pièce(s)
</span>
</div>

<div v-if="currentFolder?.isLoadingDetail" class="space-y-2">
<div v-for="n in 3" :key="n" class="h-20 rounded-xl bg-[var(--bg)] animate-pulse"></div>
</div>

<div v-else-if="!currentFolder?.pieces?.length" class="py-8 text-center text-sm text-[var(--text-muted)]">
Aucune pièce n'a été déposée pour ce dossier.
</div>

<div v-else class="space-y-2">
<div
v-for="p in currentFolder.pieces"
:key="p.id_piece"
:class="[
'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition',
p.statut_verification === 'CONFORME'
? 'border-emerald-500/30 bg-emerald-500/5'
: p.statut_verification === 'NON_CONFORME'
? 'border-red-500/30 bg-red-500/5'
: 'border-[var(--border)] bg-[var(--bg)]'
]"
>
<!-- Icône fichier -->
<div class="w-10 h-10 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0">
<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M14 2v6h6"/>
</svg>
</div>

<!-- Infos -->
<div class="flex-1 min-w-0">
<p class="text-sm font-semibold text-[var(--text)] truncate">
{{ p.type_piece_libelle || p.nom_fichier }}
</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
{{ p.nom_fichier }} · {{ formaterTaille(p.taille_octets) }}
</p>
</div>

<!-- Actions -->
<div class="flex items-center gap-1 shrink-0">
<button
@click="visualiserPiece(p.id_piece)"
class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover)] transition"
title="Visualiser"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>
</button>

<button
@click="verifierPiece(p, 'CONFORME')"
:class="[
'w-8 h-8 rounded-lg flex items-center justify-center transition',
p.statut_verification === 'CONFORME'
? 'bg-emerald-500 text-white'
: 'text-[var(--text-muted)] hover:bg-emerald-500/10 hover:text-emerald-600'
]"
title="Marquer conforme"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
</svg>
</button>

<button
@click="verifierPiece(p, 'NON_CONFORME')"
:class="[
'w-8 h-8 rounded-lg flex items-center justify-center transition',
p.statut_verification === 'NON_CONFORME'
? 'bg-red-500 text-white'
: 'text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-600'
]"
title="Marquer non conforme"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>
</div>
</div>
</div>

<!-- Aperçu pièce -->
<div v-if="piecePreviewUrl || isLoadingPreview || piecePreviewError" class="rounded-xl border border-[var(--border)] overflow-hidden">
<div class="p-3 border-b border-[var(--border)] flex items-center justify-between">
<p class="text-xs font-bold text-[var(--text)]">Aperçu de la pièce</p>
<button
@click="libererPiecePreview"
class="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
>
Fermer l'aperçu
</button>
</div>

<div class="p-3 bg-[var(--bg)]">
<div v-if="isLoadingPreview" class="h-64 flex items-center justify-center">
<div class="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin"></div>
</div>
<div v-else-if="piecePreviewError" class="h-32 flex items-center justify-center text-sm text-red-500">
{{ piecePreviewError }}
</div>
<img
v-else-if="piecePreviewMime.startsWith('image/')"
:src="piecePreviewUrl"
class="max-h-96 mx-auto rounded-lg"
/>
<iframe
v-else-if="piecePreviewMime === 'application/pdf'"
:src="piecePreviewUrl"
class="w-full h-96 rounded-lg"
></iframe>
<div v-else class="h-32 flex items-center justify-center text-sm text-[var(--text-muted)]">
Aperçu non disponible pour ce format.
</div>
</div>
</div>

<!-- Commentaire -->
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
Commentaire (obligatoire pour un rejet)
</label>
<textarea
v-model="verificationComment"
rows="3"
placeholder="Ajoutez un commentaire pour le contribuable ou pour l'équipe…"
class="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
></textarea>
</div>
</div>

<!-- Footer -->
<div class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]/50">
<button
@click="closeModal"
:disabled="isSubmitting"
class="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--hover)] disabled:opacity-50 transition"
>
Fermer
</button>

<button
@click="deciderDossier('A_COMPLETER')"
:disabled="isSubmitting"
class="px-4 py-2 rounded-xl border border-orange-500/40 text-orange-600 dark:text-orange-400 text-sm font-bold hover:bg-orange-500/10 disabled:opacity-50 transition"
>
Demander complément
</button>

<button
@click="deciderDossier('REJETE')"
:disabled="isSubmitting"
class="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition"
>
Rejeter
</button>

<button
@click="deciderDossier('VALIDE')"
:disabled="isSubmitting"
class="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
>
<svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
</svg>
Valider
</button>
</div>
</motion.div>
</motion.div>
</AnimatePresence>
</div>
</template>
