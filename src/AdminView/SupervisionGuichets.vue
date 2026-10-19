<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'
import { socket} from '@/services/socket'

const toast = useToast()

/* ============================================================
 * ÉTAT
 * ============================================================ */
const isLoading    = ref(true)
const guichets     = ref([])
const agents       = ref([])
const actionEnCours = ref(null)   // id_guichet ou id_agent en cours

/* Modal de réassignation */
const showReassignModal = ref(false)
const targetGuichet     = ref(null)
const selectedAgentId   = ref('')
const isSubmittingReassign = ref(false)

/* ============================================================
 * COMPUTED
 * ============================================================ */
const stats = computed(() => {
	const total   = guichets.value.length
	const ouverts = guichets.value.filter(g => g.etat_guichet === 'OUVERT').length
	const fermes  = total - ouverts
	return { total, ouverts, fermes }
})

/* Agents non affectés à un guichet (pour la réassignation) */
const agentsDisponibles = computed(() =>
agents.value.filter(a => !a.id_guichet)
)

/* ============================================================
 * CHARGEMENT
 * ============================================================ */
async function charger() {
	isLoading.value = true
	try {
		const [gRes, aRes] = await Promise.all([
			api.get('/guichet'),
											   api.get('/agents/guichetiers')
		])
		guichets.value = gRes.data?.data || []
		agents.value   = aRes.data?.data || []
	} catch (error) {
		console.error('❌ Erreur chargement supervision :', error)
		toast.error(
			error.response?.data?.message ||
			'Impossible de charger les données.'
		)
	} finally {
		isLoading.value = false
	}
}

/* ============================================================
 * HELPERS
 * ============================================================ */
function agentDuGuichet(id_guichet) {
	if (!id_guichet) return null
		return agents.value.find(
			a => String(a.id_guichet) === String(id_guichet)
		) || null
}

function initiales(a) {
	if (!a) return '?'
		return `${(a.nom || '').charAt(0)}${(a.prenom || '').charAt(0)}`.toUpperCase() || '?'
}

/* ============================================================
 * OUVRIR / FERMER À DISTANCE
 * ============================================================ */
async function basculerEtat(guichet) {
	const nouvelEtat = guichet.etat_guichet === 'OUVERT' ? 'FERME' : 'OUVERT'
	const labelAction = nouvelEtat === 'OUVERT' ? 'ouvrir' : 'fermer'
	
	/* Si on veut ouvrir, l'agent doit être affecté */
	if (nouvelEtat === 'OUVERT' && !agentDuGuichet(guichet.id_guichet)) {
		toast.warning(
			'Aucun agent affecté à ce guichet. Réassignez-le d\'abord.'
		)
		return
	}
	
	if (!confirm(`Voulez-vous ${labelAction} le guichet n°${guichet.numero_guichet} ?`)) {
		return
	}
	
	actionEnCours.value = guichet.id_guichet
	try {
		await api.patch(`/guichets/${guichet.id_guichet}/etat`, {
			etat_guichet: nouvelEtat
		})
		guichet.etat_guichet = nouvelEtat
		toast.success(
			`Guichet n°${guichet.numero_guichet} ${nouvelEtat === 'OUVERT' ? 'ouvert' : 'fermé'}.`
		)
	} catch (error) {
		console.error('❌ Erreur changement état :', error)
		toast.error(
			error.response?.data?.message ||
			'Impossible de modifier l\'état du guichet.'
		)
	} finally {
		actionEnCours.value = null
	}
}

/* ============================================================
 * RÉASSIGNATION
 * ============================================================ */
function ouvrirReassign(guichet) {
	targetGuichet.value = guichet
	selectedAgentId.value = ''
	showReassignModal.value = true
}

function fermerReassign() {
	if (isSubmittingReassign.value) return
		showReassignModal.value = false
		targetGuichet.value = null
		selectedAgentId.value = ''
}

async function confirmerReassign() {
	if (!targetGuichet.value || !selectedAgentId.value) {
		toast.warning('Sélectionnez un agent.')
		return
	}
	
	isSubmittingReassign.value = true
	try {
		await api.patch(`/agents/${selectedAgentId.value}/guichet`, {
			id_guichet: targetGuichet.value.id_guichet
		})
		
		toast.success('Guichet réassigné avec succès.')
		
		/* Recharger pour refléter les changements */
		await charger()
		
		showReassignModal.value = false
		targetGuichet.value = null
		selectedAgentId.value = ''
	} catch (error) {
		console.error('❌ Erreur réassignation :', error)
		toast.error(
			error.response?.data?.message ||
			'Impossible de réassigner le guichet.'
		)
	} finally {
		isSubmittingReassign.value = false
	}
}

/* ============================================================
 * RETIRER L'AFFECTATION D'UN AGENT
 * ============================================================ */
async function retirerAgent(guichet) {
	const agent = agentDuGuichet(guichet.id_guichet)
	if (!agent) return
		
		if (!confirm(
			`Retirer ${agent.nom} ${agent.prenom} du guichet n°${guichet.numero_guichet} ?`
		)) return
		
		actionEnCours.value = guichet.id_guichet
		try {
			await api.patch(`/agents/${agent.id}/guichet`, {
				id_guichet: null
			})
			toast.success('Agent retiré du guichet.')
			await charger()
		} catch (error) {
			console.error('❌ Erreur retrait :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de retirer l\'agent.'
			)
		} finally {
			actionEnCours.value = null
		}
}

/* ============================================================
 * SOCKET
 * ============================================================ */
function onGuichetUpdated(data) {
	if (!data?.id_guichet) return
		const g = guichets.value.find(
			x => String(x.id_guichet) === String(data.id_guichet)
		)
		if (g) {
			g.etat_guichet = data.etat_guichet
			if (data.numero_guichet) g.numero_guichet = data.numero_guichet
		}
}

function onAgentUpdated() {
	/* Un agent a changé de guichet → recharger la liste */
	charger()
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	await charger()
	socket.on('guichet:updated', onGuichetUpdated)
	socket.on('agent:updated', onAgentUpdated)
})

onBeforeUnmount(() => {
	socket.off('guichet:updated', onGuichetUpdated)
	socket.off('agent:updated', onAgentUpdated)
})
</script>

<template>
<div class="space-y-6 mx-8 my-6">

<!-- ============================================================
* EN-TÊTE
* ============================================================ -->
<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
<div>
<p class="text-sm text-[var(--text-muted)] mt-1 ml-13">
Vue chef de centre — gestion et affectation des guichets
</p>
</div>

<!-- Stats -->
<div class="flex items-center gap-2">
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
{{ stats.ouverts }} ouvert{{ stats.ouverts > 1 ? 's' : '' }}
</span>
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-bold">
<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
{{ stats.fermes }} fermé{{ stats.fermes > 1 ? 's' : '' }}
</span>
</div>
</div>

<!-- ============================================================
* LOADING
* ============================================================ -->
<div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<div v-for="n in 3" :key="n" class="h-48 rounded-2xl bg-[var(--card)] animate-pulse"></div>
</div>

<!-- ============================================================
* VIDE
* ============================================================ -->
<div v-else-if="guichets.length === 0" class="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
<div class="w-14 h-14 mx-auto rounded-2xl bg-[var(--bg)] flex items-center justify-center mb-3">
<svg class="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
</svg>
</div>
<p class="text-sm font-semibold text-[var(--text)]">Aucun guichet configuré</p>
</div>

<!-- ============================================================
* GRILLE DES GUICHETS
* ============================================================ -->
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<AnimatePresence>
<motion.div
v-for="g in guichets"
:key="g.id_guichet"
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -12 }"
:whileHover="{ y: -2 }"
:transition="{ duration: 0.25 }"
class="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 space-y-4 relative overflow-hidden"
>
<!-- Décor -->
<div
:class="[
'absolute -right-8 -top-8 w-24 h-24 rounded-full pointer-events-none',
g.etat_guichet === 'OUVERT' ? 'bg-emerald-500/10' : 'bg-slate-500/5'
]"
></div>

<!-- Header -->
<div class="relative flex items-start justify-between gap-3">
<div class="min-w-0">
<p class="text-lg font-black text-[var(--text)]">
Guichet n°{{ g.numero_guichet }}
</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5 truncate">
{{ g.libelle || 'Sans libellé' }}
</p>
</div>

<span
:class="[
'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
g.etat_guichet === 'OUVERT'
? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
]"
>
<span
:class="[
'w-1.5 h-1.5 rounded-full',
g.etat_guichet === 'OUVERT' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
]"
></span>
{{ g.etat_guichet }}
</span>
</div>

<!-- Agent affecté -->
<div class="relative flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
<div class="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
<span v-if="agentDuGuichet(g.id_guichet)" class="font-bold text-[var(--primary)] text-xs">
{{ initiales(agentDuGuichet(g.id_guichet)) }}
</span>
<svg v-else class="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
</div>

<div class="flex-1 min-w-0">
<template v-if="agentDuGuichet(g.id_guichet)">
<p class="text-sm font-semibold text-[var(--text)] truncate">
{{ agentDuGuichet(g.id_guichet).nom }}
{{ agentDuGuichet(g.id_guichet).prenom }}
</p>
<p class="text-[10px] text-[var(--text-muted)] truncate">
{{ agentDuGuichet(g.id_guichet).matricule }}
</p>
</template>
<p v-else class="text-xs italic text-[var(--text-muted)]">
Aucun agent affecté
</p>
</div>

<!-- Retirer l'agent (uniquement si fermé) -->
<motion.button
v-if="agentDuGuichet(g.id_guichet) && g.etat_guichet !== 'OUVERT'"
@click="retirerAgent(g)"
:whileHover="{ scale: 1.1 }"
:whileTap="{ scale: 0.9 }"
class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition"
title="Retirer l'agent"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</motion.button>
</div>

<!-- Actions -->
<div class="relative flex gap-2">
<!-- Bouton ouvrir/fermer -->
<motion.button
:disabled="actionEnCours === g.id_guichet"
@click="basculerEtat(g)"
:whileHover="actionEnCours !== g.id_guichet ? { scale: 1.02 } : {}"
:whileTap="actionEnCours !== g.id_guichet ? { scale: 0.98 } : {}"
:class="[
'flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
g.etat_guichet === 'OUVERT'
? 'bg-red-500 text-white hover:bg-red-600'
: 'bg-[var(--primary)] text-white hover:bg-blue-600'
]"
>
<svg v-if="actionEnCours === g.id_guichet" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else-if="g.etat_guichet === 'OUVERT'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
</svg>
<svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
{{ actionEnCours === g.id_guichet
	? 'En cours…'
	: (g.etat_guichet === 'OUVERT' ? 'Fermer' : 'Ouvrir') }}
	</motion.button>
	
	<!-- Bouton réassigner -->
	<motion.button
	@click="ouvrirReassign(g)"
	:whileHover="{ scale: 1.02 }"
	:whileTap="{ scale: 0.98 }"
	class="px-3 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)] transition flex items-center gap-1.5"
	title="Réassigner un agent"
	>
	<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
	d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
	</svg>
	Réassigner
	</motion.button>
	</div>
	</motion.div>
	</AnimatePresence>
	</div>
	
	<!-- ============================================================
	* MODALE RÉASSIGNATION
	* ============================================================ -->
	<AnimatePresence>
	<motion.div
	v-if="showReassignModal"
	:initial="{ opacity: 0 }"
	:animate="{ opacity: 1 }"
	:exit="{ opacity: 0 }"
	class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
	@click.self="fermerReassign"
	>
	<motion.div
	:initial="{ opacity: 0, scale: 0.95, y: 20 }"
	:animate="{ opacity: 1, scale: 1, y: 0 }"
	:exit="{ opacity: 0, scale: 0.95, y: 20 }"
	:transition="{ duration: 0.2 }"
	class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
	>
	<!-- Header -->
	<div class="flex items-start justify-between gap-3 mb-5">
	<div>
	<h3 class="text-lg font-bold text-[var(--text)]">
	Réassigner un agent
	</h3>
	<p class="text-xs text-[var(--text-muted)] mt-0.5">
	Guichet n°{{ targetGuichet?.numero_guichet }} —
	{{ targetGuichet?.libelle || 'Sans libellé' }}
	</p>
	</div>
	<button
	@click="fermerReassign"
	class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover)] transition"
	>
	<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
	</svg>
	</button>
	</div>
	
	<!-- Info agent actuel -->
	<div
	v-if="targetGuichet && agentDuGuichet(targetGuichet.id_guichet)"
	class="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
	>
	<p class="text-[10px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400">
	Agent actuel
	</p>
	<p class="text-sm font-semibold text-[var(--text)] mt-1">
	{{ agentDuGuichet(targetGuichet.id_guichet).nom }}
	{{ agentDuGuichet(targetGuichet.id_guichet).prenom }}
	<span class="text-[var(--text-muted)] font-normal">
	({{ agentDuGuichet(targetGuichet.id_guichet).matricule }})
	</span>
	</p>
	</div>
	
	<!-- Select nouvel agent -->
	<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
	Nouvel agent
	</label>
	<select
	v-model="selectedAgentId"
	class="w-full rounded-xl bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 mb-2"
	>
	<option value="">Sélectionner un agent…</option>
	<option
	v-for="a in agentsDisponibles"
	:key="a.id"
	:value="a.id"
	>
	{{ a.nom }} {{ a.prenom }} — {{ a.matricule }}
	</option>
	</select>
	
	<p
	v-if="agentsDisponibles.length === 0"
	class="text-xs text-orange-600 dark:text-orange-400 mb-2"
	>
	Aucun agent disponible sans affectation. Retirez d'abord un agent d'un autre guichet.
	</p>
	
	<!-- Actions -->
	<div class="flex justify-end gap-2 mt-5">
	<button
	@click="fermerReassign"
	:disabled="isSubmittingReassign"
	class="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--hover)] disabled:opacity-50 transition"
	>
	Annuler
	</button>
	<motion.button
	@click="confirmerReassign"
	:disabled="!selectedAgentId || isSubmittingReassign"
	:whileHover="selectedAgentId ? { scale: 1.02 } : {}"
	:whileTap="selectedAgentId ? { scale: 0.98 } : {}"
	class="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
	>
	<svg v-if="isSubmittingReassign" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
	<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
	<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
	</svg>
	{{ isSubmittingReassign ? 'En cours…' : 'Confirmer' }}
	</motion.button>
	</div>
	</motion.div>
	</motion.div>
	</AnimatePresence>
	</div>
	</template>
