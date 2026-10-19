<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useRouter } from 'vue-router'
import EditRendezVousModal from './EditRendezVousModal.vue'
import api from '@/api/Axios'
import { socket } from '@/services/socket'

/* ============================================================
 * PROPS / EMITS
 * ============================================================ */
const props = defineProps({
	rdvId: { type: [Number, String], default: null }
})
const emit  = defineEmits(['back', 'updated'])
const router = useRouter()

/* ============================================================
 * ÉTAT
 * ============================================================ */
const rdv                = ref(null)
const isLoading          = ref(true)
const isCancelling       = ref(false)
const showCancelConfirm  = ref(false)
const isEditOpen         = ref(false)

/* ============================================================
 * PALETTES DE STATUT
 * ============================================================ */
const statusMeta = {
	EN_ATTENTE: { label: 'En attente', color: 'amber',   message: 'Votre rendez-vous est en attente de confirmation. Vous serez notifié par e-mail.' },
	CONFIRME:   { label: 'Confirmé',   color: 'emerald', message: 'Rendez-vous confirmé. Présentez-vous à l’heure indiquée.' },
	ANNULE:     { label: 'Annulé',     color: 'red',     message: 'Ce rendez-vous a été annulé.' },
	HONORE:     { label: 'Terminé',    color: 'slate',   message: 'Ce rendez-vous a été honoré.' },
	ABSENT:     { label: 'Absence',    color: 'slate',   message: 'Vous ne vous êtes pas présenté à ce rendez-vous.' }
}

const statusPalette = (s) => {
	const k = (s || '').toUpperCase()
	if (k === 'CONFIRME')   return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', hex: '#10b981' }
	if (k === 'EN_ATTENTE') return { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500',   hex: '#f59e0b' }
	if (k === 'ANNULE')     return { bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500',     hex: '#ef4444' }
	return { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500', hex: '#64748b' }
}

const ticketStatusMeta = {
	RESERVE:    { label: 'Réservé',     color: '#8b5cf6', message: 'Ticket réservé. Il sera pris en compte à l’approche du rendez-vous.' },
	EN_ATTENTE: { label: 'En file',     color: '#f59e0b', message: 'Vous êtes dans la file. Vous serez appelé au guichet sous peu.' },
	APPELE:     { label: 'Appelé',      color: '#3b82f6', message: 'Votre ticket a été appelé — présentez-vous au guichet.' },
	EN_COURS:   { label: 'Au guichet',  color: '#3b82f6', message: 'Vous êtes pris en charge au guichet.' },
	TERMINE:    { label: 'Terminé',     color: '#10b981', message: 'Votre passage au guichet est terminé.' },
	ABSENT:     { label: 'Absence',     color: '#64748b', message: 'Vous n’étiez pas présent lorsque le ticket a été appelé.' }
}

const ticketSteps = [
	{ key: 'RESERVE',    label: 'Réservé' },
{ key: 'EN_ATTENTE', label: 'File' },
{ key: 'APPELE',     label: 'Appelé' },
{ key: 'EN_COURS',   label: 'Guichet' },
{ key: 'TERMINE',    label: 'Terminé' }
]

/* ============================================================
 * HELPERS
 * ============================================================ */
const normalizeStatus = (status) => {
	if (!status) return 'EN_ATTENTE'
		return String(status).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatDateLong = (dateStr) => {
	if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr) => {
	if (!dateStr) return '—'
		return new Date(dateStr).toLocaleString('fr-FR', {
			day: '2-digit', month: 'long', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		})
}

const formatCanal = (canal) => ({
	PORTAIL_WEB: 'En ligne',
	GUICHET:     'Guichet',
	TELEPHONE:   'Téléphone'
}[canal] || 'Inconnu')

/* ============================================================
 * CHARGEMENT
 * ============================================================ */
const fetchRdv = async () => {
	if (!props.rdvId) return
		isLoading.value = true
		
		try {
			const res  = await api.get(`/rendez-vous/${props.rdvId}`)
			const data = res.data.data
			
			rdv.value = data
			? {
				...data,
				statut_rdv: normalizeStatus(data.statut_rdv),
				ticket: data.ticket
				? { ...data.ticket, statut_ticket: normalizeStatus(data.ticket.statut_ticket) }
				: null
			}
			: null
		} catch (err) {
			console.error('Erreur chargement rendez-vous :', err)
		} finally {
			isLoading.value = false
		}
}

const handleFileUpdated = (payload) => {
	if (String(payload.id_rdv) !== String(props.rdvId)) return
		if (rdv.value?.ticket && payload.ticket) {
			rdv.value.ticket.statut_ticket = normalizeStatus(payload.ticket.statut_ticket)
		}
		if (rdv.value && payload.suivi) rdv.value.suivi = payload.suivi
}

/* ============================================================
 * COMPUTED
 * ============================================================ */
const locked = computed(() => ['ANNULE', 'HONORE', 'ABSENT'].includes(rdv.value?.statut_rdv))
const ticketKey = computed(() => rdv.value?.ticket?.statut_ticket || null)

const ticketStepIndex = computed(() => {
	if (ticketKey.value === 'ABSENT') return -1
		return ticketSteps.findIndex((s) => s.key === ticketKey.value)
})

const showSuivi = computed(() => {
	if (!rdv.value?.ticket) return false
		if (['TERMINE', 'ABSENT'].includes(ticketKey.value)) return false
			return true
})

const hasDossierLie = computed(() => {
	// Source de vérité : existence du dossier OU flag hasDossier
	if (!rdv.value) return false
		if (rdv.value.dossier?.id_dossier) return true
			if (rdv.value.hasDossier === true) return true
				return false
})

const canCreateDossier = computed(() => {
	if (!rdv.value) return false
		if (hasDossierLie.value) return false                                    // ⭐ bloqué
			return ['CONFIRME', 'EN_ATTENTE'].includes(rdv.value.statut_rdv)
})

/* ============================================================
 * ACTIONS
 * ============================================================ */
const onSaved = () => {
	isEditOpen.value = false
	fetchRdv()
	emit('updated')
}

const cancelRdv = async () => {
	isCancelling.value = true
	try {
		await api.patch(`/rendez-vous/${props.rdvId}/annuler`)
		showCancelConfirm.value = false
		await fetchRdv()
		emit('updated')
	} catch (err) {
		console.error('Erreur annulation :', err)
	} finally {
		isCancelling.value = false
	}
}

const addToCalendar = () => {
	if (!rdv.value) return
		const [year, month, day] = rdv.value.date_rdv.split('-')
		const [hour, minute]     = (rdv.value.heure_rdv || '00:00').split(':')
		const duration           = rdv.value.service?.duree_estimee_min || 30
		const start              = new Date(year, month - 1, day, hour, minute)
		const end                = new Date(start.getTime() + duration * 60000)
		const toICSDate          = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
		
		const icsContent = [
			'BEGIN:VCALENDAR', 'VERSION:2.0',
			'PRODID:-//Centre Fiscal de Manakara//Portail Contribuable//FR',
			'BEGIN:VEVENT',
			`UID:rdv-${rdv.value.id_rdv}@impots-manakara`,
			`DTSTAMP:${toICSDate(new Date())}`,
			`DTSTART:${toICSDate(start)}`,
			`DTEND:${toICSDate(end)}`,
			`SUMMARY:${rdv.value.service?.libelle_service || 'Rendez-vous fiscal'}`,
			`DESCRIPTION:Rendez-vous au Centre Fiscal de Manakara${rdv.value.commentaire ? ' — ' + rdv.value.commentaire : ''}`,
			'LOCATION:Centre Fiscal de Manakara',
			'END:VEVENT', 'END:VCALENDAR'
		].join('\r\n')
		
		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
		const url  = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `rendez-vous-${rdv.value.id_rdv}.ics`
		link.click()
		URL.revokeObjectURL(url)
}

const goToDossier = () => {
	const id = rdv.value?.dossier?.id_dossier
	if (id && router.hasRoute('ContribuableDossiers')) {
		router.push({ name: 'ContribuableDossiers', params: { id } })
	}
}

/* ⭐ Navigation vers la page de création de dossier avec le RDV pré-rattaché */
const goToCreateDossier = () => {
	router.push({
		name: 'CreateDossier',
		query: { rdv: rdv.value.id_rdv }
	})
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
watch(() => props.rdvId, fetchRdv)

onMounted(() => {
	fetchRdv()
	socket.on('file:updated', handleFileUpdated)
})

onUnmounted(() => {
	socket.off('file:updated', handleFileUpdated)
})
</script>

<template>
<div class="w-full min-w-0 text-[var(--text)]">

<!-- Bouton retour -->
<motion.button
@click="emit('back')"
whileHover="{ x: -3 }"
	whileTap="{ scale: 0.97 }"
		class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
		</svg>
		Retour à la liste
		</motion.button>
		
		<!-- Loading -->
		<div v-if="isLoading" class="rounded-3xl bg-[var(--card)] h-[400px] animate-pulse"></div>
		
		<AnimatePresence v-else-if="rdv" mode="wait">
		<motion.div
		:initial="{ opacity: 0, y: 12 }"
		:animate="{ opacity: 1, y: 0 }"
		:transition="{ duration: 0.35 }"
		class="space-y-4"
		>
		
		<!-- ============================================================
		HERO — Titre + statut + actions
		============================================================ -->
		<div class="rounded-3xl bg-[var(--card)] p-5 sm:p-6 relative overflow-hidden">
		<div class="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-[var(--primary)]/5 pointer-events-none"></div>
		
		<div class="relative flex flex-wrap items-start justify-between gap-4">
		<div class="flex items-start gap-4 min-w-0">
		<div :class="['shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center', statusPalette(rdv.statut_rdv).bg]">
		<svg :class="['w-6 h-6', statusPalette(rdv.statut_rdv).text]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
		</svg>
		</div>
		
		<div class="min-w-0">
		<p class="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
		Rendez-vous
		</p>
		<h1 class="mt-1 text-xl sm:text-2xl font-bold tracking-tight truncate">
		{{ rdv.service?.libelle_service || 'Service fiscal' }}
		</h1>
		<p class="mt-1 text-sm text-[var(--text-muted)] font-mono">
		RDV #{{ rdv.id_rdv }}
		</p>
		</div>
		</div>
		
		<span :class="['inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap', statusPalette(rdv.statut_rdv).bg, statusPalette(rdv.statut_rdv).text]">
		<span :class="['w-1.5 h-1.5 rounded-full', statusPalette(rdv.statut_rdv).dot]"></span>
		{{ statusMeta[rdv.statut_rdv]?.label }}
		</span>
		</div>
		
		<!-- Quick info 3 colonnes -->
		<div class="relative mt-5 grid grid-cols-3 gap-3">
		<div class="rounded-2xl bg-[var(--bg)] p-3">
		<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Date</p>
		<p class="text-sm font-bold mt-1">{{ formatDateLong(rdv.date_rdv) }}</p>
		</div>
		<div class="rounded-2xl bg-[var(--bg)] p-3">
		<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Heure</p>
		<p class="text-sm font-bold mt-1 tabular-nums">{{ rdv.heure_rdv?.slice(0, 5) || '—' }}</p>
		</div>
		<div class="rounded-2xl bg-[var(--bg)] p-3">
		<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Canal</p>
		<p class="text-sm font-bold mt-1">{{ formatCanal(rdv.canal_creation) }}</p>
		</div>
		</div>
		</div>
		
		<!-- ============================================================
		BOUTON CRÉATION DOSSIER (si applicable)
		============================================================ -->
		<motion.div
		v-if="canCreateDossier"
		:initial="{ opacity: 0, y: 8 }"
		:animate="{ opacity: 1, y: 0 }"
		:transition="{ duration: 0.35, delay: 0.1 }"
		class="rounded-3xl bg-gradient-to-br from-[var(--primary)] to-blue-700 p-5 text-white relative overflow-hidden"
		>
		<div class="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none"></div>
		<div class="absolute -right-6 -bottom-14 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
		
		<div class="relative flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-start gap-3 min-w-0">
		<div class="shrink-0 w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
		<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
		</svg>
		</div>
		
		<div class="min-w-0">
		<p class="text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">
		Prochaine étape
		</p>
		<p class="mt-0.5 font-bold text-base">
		Préparez votre dossier en ligne
		</p>
		<p class="text-xs text-white/70 mt-1 max-w-md">
		Rattachez ce rendez-vous à un dossier fiscal et téléversez vos pièces à l'avance pour accélérer votre passage au guichet.
		</p>
		</div>
		</div>
		
		<motion.button
		@click="goToCreateDossier"
		:whileHover="{ scale: 1.03, y: -1 }"
		:whileTap="{ scale: 0.97 }"
		class="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[var(--primary)] text-sm font-bold hover:bg-white/95 shadow-lg shadow-black/10 transition"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
		</svg>
		Préparer un dossier
		</motion.button>
		</div>
		</motion.div>
		
		<!-- Bandeau "dossier déjà rattaché" si applicable -->
		<motion.div
		v-else-if="hasDossierLie"
		:initial="{ opacity: 0, y: 8 }"
		:animate="{ opacity: 1, y: 0 }"
		:transition="{ duration: 0.35, delay: 0.1 }"
		class="rounded-2xl bg-[var(--bgListCard)] border border-[var(--borderListCard)] p-4 flex items-start gap-3"
		>
		<div class="shrink-0 w-9 h-9 rounded-xl bg-[var(--card)] flex items-center justify-center text-[var(--textListCard)]">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M5 13l4 4L19 7"/>
		</svg>
		</div>
		<div class="min-w-0">
		<p class="text-sm font-bold text-[var(--text)]">
		Ce rendez-vous est déjà rattaché à un dossier
		</p>
		<p class="text-xs text-[var(--text-muted)] mt-0.5">
		Vous ne pouvez pas créer un nouveau dossier pour ce rendez-vous (RG5).
		Consultez le dossier associé ci-dessous.
		</p>
		</div>
		</motion.div>
		
		<!-- ============================================================
		CONTENU : infos + side
		============================================================ -->
		<div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
		
		<!-- Colonne principale -->
		<div class="space-y-4">
		
		<!-- Informations -->
		<div class="rounded-3xl bg-[var(--card)] p-5 sm:p-6">
		<div class="flex items-center gap-2 mb-4">
		<div class="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
		<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>
		</div>
		<h2 class="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
		Informations
		</h2>
		</div>
		
		<div class="space-y-2.5">
		<div v-for="row in [
		{ l: 'Référence',    v: 'RDV #' + rdv.id_rdv, mono: true },
{ l: 'Contribuable', v: rdv.contribuable?.nom_raison_sociale || '—' },
{ l: 'NIF',          v: rdv.contribuable?.nif || '—', mono: true },
{ l: 'Service',      v: rdv.service?.libelle_service || '—' },
{ l: 'Créé le',      v: formatDateTime(rdv.date_creation) },
{ l: 'Commentaire',  v: rdv.commentaire || '—' }
]" :key="row.l" class="flex justify-between items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
<span class="text-xs text-[var(--text-muted)] shrink-0">{{ row.l }}</span>
<span :class="['text-sm text-right', row.mono ? 'font-mono font-semibold' : 'font-medium']">
{{ row.v }}
</span>
</div>
</div>
</div>

<!-- Suivi file -->
<div v-if="rdv.ticket" class="rounded-3xl bg-[var(--card)] p-5 sm:p-6">
<div class="flex items-center gap-2 mb-4">
<div class="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
</svg>
</div>
<h2 class="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
Suivi de la file
</h2>
</div>

<!-- Steps -->
<ol class="grid grid-cols-5 gap-1.5 mb-4">
<li
v-for="(step, i) in ticketSteps"
:key="step.key"
class="flex flex-col items-center gap-1.5 text-center"
:class="{ 'opacity-40': ticketKey === 'ABSENT' }"
>
<div
:class="[
'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors',
ticketStepIndex > i
? 'bg-emerald-500 border-emerald-500 text-white'
: ticketStepIndex === i
? 'bg-[var(--primary)] border-[var(--primary)] text-white'
: 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'
]"
>
<svg v-if="ticketStepIndex > i" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<span v-else>{{ i + 1 }}</span>
</div>
<span
:class="[
'text-[10px] font-bold',
ticketStepIndex === i ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
]"
>
{{ step.label }}
</span>
</li>
</ol>

<!-- Stats -->
<div v-if="showSuivi && rdv.suivi" class="grid grid-cols-2 md:grid-cols-4 gap-2">
<div class="rounded-xl bg-[var(--bg)] p-3 text-center">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
RDV avant
</p>
<p class="text-xl font-black tabular-nums mt-1">{{ rdv.suivi.rendezVousAvant ?? '—' }}</p>
</div>
<div class="rounded-xl bg-[var(--bg)] p-3 text-center">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
Personnes
</p>
<p class="text-xl font-black tabular-nums mt-1">{{ rdv.suivi.personnesDevant ?? '—' }}</p>
</div>
<div class="rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-3 text-center">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
Position
</p>
<p class="text-xl font-black text-[var(--primary)] tabular-nums mt-1">
{{ rdv.suivi.positionEstimee ?? '—' }}
</p>
</div>
<div class="rounded-xl bg-[var(--bg)] p-3 text-center">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
Temps
</p>
<p class="text-xl font-black tabular-nums mt-1">
{{ rdv.suivi.tempsEstimeMin != null ? rdv.suivi.tempsEstimeMin + ' min' : '—' }}
</p>
</div>
</div>

<p v-else-if="ticketKey === 'RESERVE'" class="text-xs text-[var(--text-muted)] text-center py-2">
Le suivi s'affichera lorsque vous serez en file d'attente.
</p>
</div>

<!-- Dossier associé -->
<div class="rounded-3xl bg-[var(--card)] p-5 sm:p-6">
<div class="flex items-center gap-2 mb-4">
<div class="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
</svg>
</div>
<h2 class="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
Dossier associé
</h2>
</div>

<div v-if="rdv.dossier" class="rounded-2xl border border-[var(--borderListCard)] bg-[var(--bgListCard)] p-4 flex flex-wrap items-center justify-between gap-3">
<div class="flex items-center gap-3 min-w-0">
<div class="shrink-0 w-10 h-10 rounded-xl bg-[var(--card)] flex items-center justify-center text-[var(--textListCard)]">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
</svg>
</div>
<div class="min-w-0">
<p class="font-bold text-[var(--textListCard)] truncate font-mono">
{{ rdv.dossier.reference_dossier }}
</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Pré-dépôt le {{ formatDateLong(rdv.dossier.date_predepot) }}
</p>
</div>
</div>

<motion.button
@click="goToDossier"
:whileHover="{ scale: 1.03 }"
:whileTap="{ scale: 0.97 }"
class="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[var(--hover)] transition"
>
Voir le dossier
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</motion.button>
</div>

<div v-else class="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
<p class="text-sm text-[var(--text-muted)]">
Aucun dossier n'est encore associé à ce rendez-vous.
</p>
</div>
</div>
</div>

<!-- Sidebar -->
<div class="space-y-4 lg:sticky lg:top-6 lg:self-start">

<!-- Statut box -->
<div :class="['rounded-2xl border p-4', statusPalette(rdv.statut_rdv).bg]">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
Statut du rendez-vous
</p>
<p :class="['font-black text-lg', statusPalette(rdv.statut_rdv).text]">
{{ statusMeta[rdv.statut_rdv]?.label }}
</p>
<p class="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
{{ statusMeta[rdv.statut_rdv]?.message }}
</p>
</div>

<!-- Ticket box -->
<div
v-if="rdv.ticket"
:class="['rounded-2xl border p-4']"
:style="{
borderColor: `color-mix(in srgb, ${ticketStatusMeta[rdv.ticket.statut_ticket]?.color || '#64748b'} 30%, var(--border))`,
backgroundColor: `color-mix(in srgb, ${ticketStatusMeta[rdv.ticket.statut_ticket]?.color || '#64748b'} 6%, transparent)`
}"
>
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
Ticket de passage
</p>
<div class="flex items-center gap-3 mb-2">
<span class="text-2xl font-black tabular-nums font-mono">
{{ rdv.ticket.numero_ticket }}
</span>
<span
class="text-[10px] font-bold px-2 py-1 rounded-full"
:style="{
color: ticketStatusMeta[rdv.ticket.statut_ticket]?.color,
backgroundColor: `color-mix(in srgb, ${ticketStatusMeta[rdv.ticket.statut_ticket]?.color} 14%, transparent)`
}"
>
{{ ticketStatusMeta[rdv.ticket.statut_ticket]?.label }}
</span>
</div>
<p class="text-xs text-[var(--text-muted)] leading-relaxed">
{{ ticketStatusMeta[rdv.ticket.statut_ticket]?.message }}
</p>
</div>

<!-- Actions -->
<div class="rounded-2xl bg-[var(--card)] p-4">
<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
Actions
</p>

<div class="space-y-2">
<motion.button
type="button"
:disabled="locked"
@click="isEditOpen = true"
:whileHover="locked ? {} : { x: 2 }"
:whileTap="locked ? {} : { scale: 0.98 }"
class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--hover)] text-sm font-semibold text-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
<span class="flex items-center gap-2">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
</svg>
Modifier
</span>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</motion.button>

<motion.button
type="button"
@click="addToCalendar"
:whileHover="{ x: 2 }"
:whileTap="{ scale: 0.98 }"
class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--hover)] text-sm font-semibold text-[var(--text)] transition-colors"
>
<span class="flex items-center gap-2">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
Ajouter au calendrier
</span>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</motion.button>

<motion.button
type="button"
:disabled="locked"
@click="showCancelConfirm = true"
:whileHover="locked ? {} : { x: 2 }"
:whileTap="locked ? {} : { scale: 0.98 }"
class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-sm font-semibold text-red-600 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
<span class="flex items-center gap-2">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M6 18L18 6M6 6l12 12"/>
</svg>
Annuler le rendez-vous
</span>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</motion.button>
</div>
</div>

<!-- Confirmation annulation -->
<AnimatePresence>
<motion.div
v-if="showCancelConfirm"
:initial="{ opacity: 0, height: 0, marginTop: 0 }"
:animate="{ opacity: 1, height: 'auto', marginTop: 0 }"
:exit="{ opacity: 0, height: 0, marginTop: 0 }"
class="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 overflow-hidden"
>
<p class="text-xs text-red-700 dark:text-red-300 font-semibold">
Confirmer l'annulation ? Cette action est irréversible.
</p>
<div class="mt-3 flex gap-2">
<button
type="button"
@click="showCancelConfirm = false"
class="flex-1 px-3 py-2 rounded-lg bg-[var(--card)] text-xs font-bold text-[var(--text)] hover:bg-[var(--hover)] transition"
>
Garder
</button>
<button
type="button"
:disabled="isCancelling"
@click="cancelRdv"
class="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition"
>
{{ isCancelling ? 'Annulation…' : 'Oui, annuler' }}
</button>
</div>
</motion.div>
</AnimatePresence>
</div>
</div>
</motion.div>
</AnimatePresence>

<!-- Modal édition -->
<EditRendezVousModal
:open="isEditOpen"
:rdv="rdv"
@close="isEditOpen = false"
@saved="onSaved"
/>
</div>
</template>
