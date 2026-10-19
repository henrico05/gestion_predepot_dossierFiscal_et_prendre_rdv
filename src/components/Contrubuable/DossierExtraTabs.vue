<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'
import { socket, connectSocket } from '@/services/socket'

const props = defineProps({
	dossierId: {
		type: [Number, String],
		required: true
	}
})

const toast = useToast()

/* ============================================================
 * ÉTAT
 * ============================================================ */
const activeTab = ref('historique')

/* Historique */
const historique        = ref([])
const historiqueGrouped = ref([])
const isLoadingHistorique = ref(false)

/* Traitements */
const traitements         = ref([])
const isLoadingTraitements = ref(false)
const filtreTraitement    = ref('TOUS')

/* Commentaires */
const commentaires          = ref([])
const isLoadingCommentaires = ref(false)
const newComment            = ref('')
const isSubmittingComment   = ref(false)

/* ============================================================
 * ONGLETS
 * ============================================================ */
const onglets = computed(() => [
	{ id: 'historique',   label: 'Historique',   badge: historique.value.length || 0 },
	{ id: 'traitements',  label: 'Traitements',  badge: traitements.value.length || 0 },
	{ id: 'commentaires', label: 'Commentaires', badge: commentaires.value.length || 0 }
])

/* ============================================================
 * CHARGEMENT HISTORIQUE
 * ============================================================ */
async function chargerHistorique() {
	if (!props.dossierId) return
		
		isLoadingHistorique.value = true
		
		try {
			const response = await api.get(
				`/dossier-detail/${props.dossierId}/historiques`
			)
			
			historique.value        = response.data?.data?.events  || []
			historiqueGrouped.value = response.data?.data?.grouped || []
		} catch (error) {
			console.error('❌ Erreur historique :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger l\'historique.'
			)
		} finally {
			isLoadingHistorique.value = false
		}
}

/* ============================================================
 * CHARGEMENT TRAITEMENTS
 * ============================================================ */
async function chargerTraitements() {
	if (!props.dossierId) return
		
		isLoadingTraitements.value = true
		
		try {
			const params = filtreTraitement.value !== 'TOUS'
			? { decision: filtreTraitement.value }
			: {}
			
			const response = await api.get(
				`/dossier-detail/${props.dossierId}/traitement`,
				{ params }
			)
			
			traitements.value = response.data?.data || []
		} catch (error) {
			console.error('❌ Erreur traitements :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger les traitements.'
			)
		} finally {
			isLoadingTraitements.value = false
		}
}

/* ============================================================
 * CHARGEMENT COMMENTAIRES
 * ============================================================ */
async function chargerCommentaires() {
	if (!props.dossierId) return
		
		isLoadingCommentaires.value = true
		
		try {
			const response = await api.get(
				`/dossier-detail/${props.dossierId}/commentaire`
			)
			
			commentaires.value = response.data?.data || []
		} catch (error) {
			console.error('❌ Erreur commentaires :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger les commentaires.'
			)
		} finally {
			isLoadingCommentaires.value = false
		}
}

/* ============================================================
 * AJOUT COMMENTAIRE
 * ============================================================ */
async function addComment() {
	const contenu = newComment.value.trim()
	if (!contenu || !props.dossierId) return
		
		isSubmittingComment.value = true
		
		try {
			const response = await api.post(
				`/dossier-detail/${props.dossierId}/commentaire`,
				{ contenu }
			)
			
			const comment = response.data?.data
			if (comment) commentaires.value.push(comment)
				
				newComment.value = ''
				toast.success('Commentaire envoyé.')
		} catch (error) {
			console.error('❌ Erreur ajout commentaire :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible d\'envoyer le commentaire.'
			)
		} finally {
			isSubmittingComment.value = false
		}
}

/* ============================================================
 * HELPERS UI
 * ============================================================ */
function getEventColor(type) {
	return {
		TRANSITION:         'bg-indigo-500',
		VERIFICATION_PIECE: 'bg-emerald-500',
		UPLOAD_PIECE:       'bg-blue-500',
		COMMENTAIRE:        'bg-purple-500'
	}[type] || 'bg-slate-400'
}

function getDecisionLabel(decision) {
	return {
		EN_VERIFICATION: 'En vérification',
		A_COMPLETER:     'À compléter',
		REJETE:          'Rejeté',
		VALIDE:          'Validé',
		CLOTURE:         'Clôturé',
		SOUMIS:          'Soumis'
	}[decision] || decision
}

function getDecisionColor(decision) {
	return {
		EN_VERIFICATION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
		A_COMPLETER:     'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
		REJETE:          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
		VALIDE:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
		CLOTURE:         'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
		SOUMIS:          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
	}[decision] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
}

function formatHeure(iso) {
	if (!iso) return '—'
		const d = new Date(iso)
		if (Number.isNaN(d.getTime())) return '—'
			return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formaterDateHeure(iso) {
	if (!iso) return '—'
		const d = new Date(iso)
		if (Number.isNaN(d.getTime())) return String(iso)
			return d.toLocaleString('fr-FR', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			})
}

/* ============================================================
 * WATCHERS
 * ============================================================ */
watch(activeTab, async (newTab) => {
	if (newTab === 'historique' && historique.value.length === 0) {
		await chargerHistorique()
	}
	if (newTab === 'traitements' && traitements.value.length === 0) {
		await chargerTraitements()
	}
	if (newTab === 'commentaires' && commentaires.value.length === 0) {
		await chargerCommentaires()
	}
})

watch(filtreTraitement, () => {
	if (activeTab.value === 'traitements') {
		chargerTraitements()
	}
})

/* Recharger si le dossier change */
watch(() => props.dossierId, async () => {
	/* Reset */
	historique.value        = []
	historiqueGrouped.value = []
	traitements.value       = []
	commentaires.value      = []
	activeTab.value         = 'historique'
	
	/* Recharger l'onglet actif */
	await chargerHistorique()
})

/* ============================================================
 * TEMPS RÉEL
 * ============================================================ */
function onCommentaireNew(data) {
	if (!data?.id_dossier) return
		if (Number(data.id_dossier) !== Number(props.dossierId)) return
			chargerCommentaires()
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	connectSocket()
	socket.on('commentaire:new', onCommentaireNew)
	
	await chargerHistorique()
})

onBeforeUnmount(() => {
	socket.off('commentaire:new', onCommentaireNew)
})
</script>

<template>
<div class="space-y-4">

<!-- ============================================================
SEGMENTED CONTROL (3 onglets)
============================================================ -->
<div class="inline-flex flex-wrap p-1 rounded-2xl bg-[var(--card)] gap-0.5">
<button
v-for="tab in onglets"
:key="tab.id"
type="button"
@click="activeTab = tab.id"
class="relative px-4 sm:px-5 py-2.5 text-sm font-bold rounded-xl transition-colors"
>
<span class="relative z-10 flex items-center gap-2">
<span :class="activeTab === tab.id ? 'text-white' : 'text-[var(--text-muted)]'">
{{ tab.label }}
</span>
<span
v-if="tab.badge"
:class="[
'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-[var(--bg)] text-[var(--text-muted)]'
]"
>
{{ tab.badge }}
</span>
</span>

<motion.div
v-if="activeTab === tab.id"
layout-id="extra-tabs-pill"
:transition="{ type: 'spring', stiffness: 400, damping: 32 }"
class="absolute inset-0 rounded-xl bg-[var(--primary)] shadow-sm shadow-blue-500/20"
></motion.div>
</button>
</div>

<!-- ============================================================
CONTENU DES ONGLETS
============================================================ -->
<AnimatePresence mode="wait">

<!-- ============ ONGLET HISTORIQUE ============ -->
<motion.div
v-if="activeTab === 'historique'"
key="historique"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -10 }"
:transition="{ duration: 0.2 }"
>
<div class="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)]">
<div class="p-5 sm:p-6 border-b border-[var(--border)]">
<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Historique du dossier
<span class="text-xs font-normal text-[var(--text-muted)]">
({{ historique.length }} événement{{ historique.length > 1 ? 's' : '' }})
</span>
</h2>
</div>

<!-- Loading -->
<div v-if="isLoadingHistorique" class="p-6 space-y-4">
<div v-for="n in 3" :key="n" class="flex gap-4">
<div class="w-4 h-4 rounded-full bg-[var(--bg)] animate-pulse mt-1.5"></div>
<div class="flex-1 space-y-2">
<div class="h-4 bg-[var(--bg)] rounded animate-pulse"></div>
<div class="h-3 bg-[var(--bg)] rounded w-2/3 animate-pulse"></div>
</div>
</div>
</div>

<!-- Vide -->
<div v-else-if="historiqueGrouped.length === 0" class="p-12 text-center">
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p class="text-sm text-[var(--text-muted)]">Aucun événement pour ce dossier.</p>
</div>

<!-- Groupé par jour -->
<div v-else class="p-5 sm:p-6 space-y-8">
<div v-for="group in historiqueGrouped" :key="group.date">
<div class="flex items-center gap-3 mb-4">
<div class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
{{ group.label }}
</div>
<div class="flex-1 h-px bg-[var(--border)]"></div>
<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
{{ group.items.length }}
</span>
</div>

<ol class="relative border-l border-[var(--border)] ml-3 space-y-4">
<li v-for="(event, i) in group.items" :key="`${group.date}-${i}`" class="ml-6">
<span :class="['absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 border-[var(--card)]', getEventColor(event.event_type)]"></span>

<div class="flex items-start justify-between gap-3 flex-wrap">
<div class="min-w-0 flex-1">
<p class="text-sm font-semibold text-[var(--text)]">
{{ event.event_action?.replace(/_/g, ' ') }}
</p>
<p class="text-xs text-[var(--text-muted)] mt-1">
Par <span class="font-medium">{{ event.auteur }}</span>
</p>
<p v-if="event.event_detail" class="mt-2 text-xs px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] inline-block max-w-full whitespace-pre-wrap break-words">
{{ event.event_detail }}
</p>
</div>
<span class="text-xs text-[var(--text-muted)] whitespace-nowrap">
{{ formatHeure(event.event_date) }}
</span>
</div>
</li>
</ol>
</div>
</div>
</div>
</motion.div>

<!-- ============ ONGLET TRAITEMENTS ============ -->
<motion.div
v-else-if="activeTab === 'traitements'"
key="traitements"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -10 }"
:transition="{ duration: 0.2 }"
>
<div class="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)]">
<div class="p-5 sm:p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
<div>
<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Décisions
</h2>
<p class="text-xs text-[var(--text-muted)] mt-1">Décisions prises sur votre dossier</p>
</div>

<!-- Filtre -->
<div class="inline-flex p-1 rounded-xl bg-[var(--bg)]">
<button
v-for="opt in [
{ key: 'TOUS',        label: 'Toutes' },
{ key: 'VALIDE',      label: 'Validés' },
{ key: 'REJETE',      label: 'Rejetés' },
{ key: 'A_COMPLETER', label: 'Compléments' }
]"
:key="opt.key"
type="button"
@click="filtreTraitement = opt.key"
:class="[
'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
filtreTraitement === opt.key
? 'bg-[var(--primary)] text-white shadow-sm'
: 'text-[var(--text-muted)] hover:text-[var(--text)]'
]"
>
{{ opt.label }}
</button>
</div>
</div>

<!-- Loading -->
<div v-if="isLoadingTraitements" class="p-6 space-y-3">
<div v-for="n in 3" :key="n" class="h-20 rounded-2xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Vide -->
<div v-else-if="traitements.length === 0" class="p-12 text-center">
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
<p class="text-sm text-[var(--text-muted)]">Aucune décision enregistrée.</p>
</div>

<!-- Liste -->
<div v-else class="divide-y divide-[var(--border)]">
<div
v-for="t in traitements"
:key="t.id_traitement"
class="p-5 sm:p-6"
>
<div class="flex items-start gap-4">
<div
:class="[
'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
t.decision === 'VALIDE'      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
t.decision === 'REJETE'      ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
t.decision === 'A_COMPLETER' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
]"
>
<svg v-if="t.decision === 'VALIDE'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
</svg>
<svg v-else-if="t.decision === 'REJETE'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>

<div class="flex-1 min-w-0">
<div class="flex items-start justify-between gap-3 flex-wrap mb-2">
<span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', getDecisionColor(t.decision)]">
{{ getDecisionLabel(t.decision) }}
</span>
<span class="text-xs text-[var(--text-muted)]">
{{ formaterDateHeure(t.date_traitement) }}
</span>
</div>

<p v-if="t.commentaire_agent" class="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words">
{{ t.commentaire_agent }}
</p>
<p v-else class="text-sm italic text-[var(--text-muted)]">
Aucun commentaire.
</p>
</div>
</div>
</div>
</div>
</div>
</motion.div>

<!-- ============ ONGLET COMMENTAIRES ============ -->
<motion.div
v-else-if="activeTab === 'commentaires'"
key="commentaires"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -10 }"
:transition="{ duration: 0.2 }"
class="max-w-3xl"
>
<div class="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)]">
<div class="p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between">
<div>
<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
</svg>
Discussion avec l'administration
</h2>
<p class="text-xs text-[var(--text-muted)] mt-1">Échanges visibles</p>
</div>
<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
{{ commentaires.length }}
</span>
</div>

<div class="p-5 sm:p-6 space-y-4 max-h-[50vh] overflow-y-auto">
<!-- Loading -->
<div v-if="isLoadingCommentaires" class="space-y-4">
<div v-for="n in 2" :key="n" class="flex gap-3">
<div class="w-10 h-10 rounded-full bg-[var(--bg)] animate-pulse"></div>
<div class="flex-1 space-y-2">
<div class="h-3 bg-[var(--bg)] rounded w-1/3 animate-pulse"></div>
<div class="h-4 bg-[var(--bg)] rounded animate-pulse"></div>
</div>
</div>
</div>

<!-- Vide -->
<div v-else-if="commentaires.length === 0" class="py-8 text-center">
<svg class="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
</svg>
<p class="text-xs text-[var(--text-muted)]">Aucun échange pour le moment.</p>
</div>

<!-- Liste -->
<div v-for="c in commentaires" :key="c.id_commentaire" class="flex gap-3">
<div
:class="[
'shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs',
c.auteur_type === 'AGENT'
? 'bg-[var(--primary)]/10 text-[var(--primary)]'
: 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
]"
>
{{ c.auteur?.charAt(0)?.toUpperCase() || '?' }}
</div>

<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 flex-wrap mb-1">
<span class="text-sm font-semibold text-[var(--text)]">{{ c.auteur }}</span>
<span
:class="[
'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
c.auteur_type === 'AGENT'
? 'bg-[var(--primary)]/10 text-[var(--primary)]'
: 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
]"
>
{{ c.auteur_type }}
</span>
</div>

<p class="text-sm text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
{{ c.contenu }}
</p>

<p class="text-[10px] text-[var(--text-muted)] mt-1">
{{ formaterDateHeure(c.date_creation) }}
</p>
</div>
</div>
</div>

<!-- Zone d'ajout -->
<div class="p-5 sm:p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 space-y-3">
<textarea
v-model="newComment"
@keydown.enter.exact.prevent="addComment"
rows="3"
:disabled="isSubmittingComment"
placeholder="Écrivez votre message... (Ctrl+Entrée pour envoyer)"
class="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] resize-none transition disabled:opacity-50"
></textarea>

<div class="flex justify-end">
<motion.button
@click="addComment"
:disabled="!newComment.trim() || isSubmittingComment"
:whileHover="(!newComment.trim() || isSubmittingComment) ? {} : { scale: 1.03 }"
:whileTap="(!newComment.trim() || isSubmittingComment) ? {} : { scale: 0.97 }"
class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-blue-500/20"
>
<svg v-if="isSubmittingComment" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
</svg>
{{ isSubmittingComment ? 'Envoi…' : 'Envoyer' }}
</motion.button>
</div>
</div>
</div>
</motion.div>

</AnimatePresence>
</div>
</template>
