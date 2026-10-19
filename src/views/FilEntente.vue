<script setup>

import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import gsap from 'gsap'
import api from '@/api/Axios'
import { socket } from '@/services/socket'
import { useTraitementTimer } from '@/composables/useTraitementTimer'
import { playSound } from '@/services/sonnerie'


// ============================================================
// ÉTAT — SESSION GUICHET
// ============================================================

const session = ref(null) // affectation active { id_guichet, numero_guichet, libelle, etat_guichet, ... }
const chargementSession = ref(true)
const enCoursAction = ref(false)

const guichetOuvert = computed(() => 
session.value?.est_ouvert === true
)

async function chargerSession() {
	chargementSession.value = true
	try {
		const res = await api.get('/guichets/session')
		const d = res.data?.data
		
		/* Le backend renvoie { guichet, est_ouvert, date_debut } ou null */
		if (!d || !d.guichet) {
			session.value = null
			return
		}
		
		session.value = {
			...d.guichet,
			est_ouvert: d.est_ouvert,
			date_debut: d.date_debut
		}
	} catch (e) {
		console.error('Erreur session :', e)
		notifier(
			e.response?.data?.message ||
			'Impossible de charger votre guichet.',
		   'erreur'
		)
		session.value = null
	} finally {
		chargementSession.value = false
	}
}

async function ouvrirGuichet() {
	if (!session.value?.id_guichet) {
		notifier('Aucun guichet assigné à votre compte.', 'erreur')
		return
	}
	
	enCoursAction.value = true
	try {
		/* ⭐ Plus de body : le backend utilise agent.id_guichet */
		const res = await api.post('/guichets/ouvrir')
		const aff = res.data?.data
		
		if (aff?.guichet) {
			session.value = {
				...aff.guichet,
				est_ouvert: true,
				date_debut: aff.date_debut
			}
			notifier(
				`Guichet n°${aff.guichet.numero_guichet} ouvert.`,
			'succes'
			)
			await chargerFile()
		}
	} catch (e) {
		notifier(
			e.response?.data?.message || e.message,
		   'erreur'
		)
	} finally {
		enCoursAction.value = false
	}
}

async function fermerGuichet() {
	enCoursAction.value = true
	try {
		await api.post('/guichets/fermer')
		
		if (session.value) {
			session.value = {
				...session.value,
				etat_guichet: 'FERME',
				est_ouvert: false,
				date_debut: null
			}
		}
		notifier('Guichet fermé.', 'succes')
	} catch (e) {
		notifier(
			e.response?.data?.message || e.message,
		   'erreur'
		)
	} finally {
		enCoursAction.value = false
	}
}

// ============================================================
// ÉTAT — FILE D'ATTENTE
// ============================================================

const fileAttente = ref([])
const chargementFile = ref(true)
const appelEnCours = ref(false)

// Ticket actuellement traité à CE guichet (APPELE ou EN_COURS)
const ticketActuel = computed(() => {
	if (!session.value) return null
		return (
			fileAttente.value.find(
				(t) =>
				t.id_guichet === session.value.id_guichet &&
				(t.statut_ticket === 'APPELE' || t.statut_ticket === 'EN_COURS')
			) || null
		)
})

// Tickets en attente réelle (pas encore appelés), triés par numéro
const ticketsEnAttente = computed(() =>
fileAttente.value
.filter((t) => t.statut_ticket === 'EN_ATTENTE' || t.statut_ticket === 'RESERVE')
.sort((a, b) => String(a.numero_ticket).localeCompare(String(b.numero_ticket)))
)

// Tickets en cours de traitement ailleurs (autres guichets), pour info
const ticketsAutresGuichets = computed(() =>
fileAttente.value.filter(
	(t) =>
	(t.statut_ticket === 'APPELE' || t.statut_ticket === 'EN_COURS') &&
	t.id_guichet !== session.value?.id_guichet
)
)

async function chargerFile() {
	chargementFile.value = true
	try {
		const res = await api.get('/tickets/file')
		fileAttente.value = res.data.data
	} catch (e) {
		notifier(e.message, 'erreur')
	} finally {
		chargementFile.value = false
	}
}

async function appelerSuivant() {
	if (!session.value) {
		notifier('Ouvrez d’abord votre guichet.', 'erreur')
		return
	}
	if (ticketActuel.value) {
		notifier('Terminez le ticket en cours avant d’en appeler un autre.', 'erreur')
		return
	}
	appelEnCours.value = true
	try {
		const res = await api.post('/tickets/appeler')
		
		if (!res.data.data) {
			notifier('File d’attente vide.', 'info')
		} else {
			notifier(
				`Ticket ${res.data.data.numero_ticket} appelé.`,
			'succes'
			)
		}
		await chargerFile()
	} catch (e) {
		notifier(e.message, 'erreur')
	} finally {
		appelEnCours.value = false
	}
}

const { label, pct, zone, overtimeMs, dureeMin, marquerDebut, oublier, bilan, fmt } = useTraitementTimer(ticketActuel)

const ZONE_UI = {
	vert:   { bar: 'bg-emerald-500', text: 'text-emerald-600', ring: 'border-emerald-300' },
	orange: { bar: 'bg-amber-500',   text: 'text-amber-600',   ring: 'border-amber-300' },
	rouge:  { bar: 'bg-rose-500',    text: 'text-rose-600',    ring: 'border-rose-300' }
}

async function changerStatutTicket(id_ticket, statut_ticket) {
	try {
		if (statut_ticket === 'EN_COURS') marquerDebut(id_ticket)
			
			const recap = statut_ticket === 'TERMINE' ? bilan() : null
			
			await api.patch(`/tickets/${id_ticket}/statut`, {
				statut_ticket,
				id_guichet: session.value?.id_guichet
			})
			
			if (statut_ticket === 'TERMINE' && recap) {
				playSound(recap.overtime > 0 ? 'warning' : 'success')
				const extra = recap.overtime > 0
				? ` · dépassement ${recap.labelOvertime}`
				: ' · dans les temps'
				notifier(`Traitement terminé : ${recap.labelTotal}${extra}`, recap.overtime > 0 ? 'erreur' : 'succes')
			} else {
				notifier(`Ticket mis à jour : ${libelleStatut(statut_ticket)}.`, 'succes')
			}
			
			if (['TERMINE', 'ABSENT', 'EN_ATTENTE'].includes(statut_ticket)) {
				oublier(id_ticket)
			}
			
			await chargerFile()
	} catch (e) {
		notifier(e.message, 'erreur')
	}
}

// ============================================================
// WALK-IN (arrivant sans rendez-vous)
// ============================================================

const modaleWalkInOuverte = ref(false)
const walkInForm = reactive({ nom_visiteur: '', motif_visite: '' })
const envoiWalkIn = ref(false)

function ouvrirModaleWalkIn() {
	walkInForm.nom_visiteur = ''
	walkInForm.motif_visite = ''
	modaleWalkInOuverte.value = true
}

async function creerWalkIn() {
	if (!walkInForm.nom_visiteur.trim()) {
		notifier('Le nom du visiteur est obligatoire.', 'erreur')
		return
	}
	envoiWalkIn.value = true
	try {
		const res = await api.post('/tickets/walk-in', {
			...walkInForm
		})
		notifier(`Ticket ${res.data.numero_ticket} créé.`, 'succes')
		modaleWalkInOuverte.value = false
		await chargerFile()
	} catch (e) {
		notifier(e.message, 'erreur')
	} finally {
		envoiWalkIn.value = false
	}
}

const dossiersSansRdv = ref([])
const chargementSansRdv = ref(false)
const rechercheSansRdv = ref('')
const marquageEnCours = ref(null)
const showSansRdvPanel = ref(false)

// ============================================================
// DOSSIERS SANS RDV — Fonctions
// ============================================================

async function chargerDossiersSansRdv() {
	chargementSansRdv.value = true
	try {
		const res = await api.get('/dossiers/sans-rdvs', {
			params: { q: rechercheSansRdv.value }
		})
		dossiersSansRdv.value = res.data?.data || []
	} catch (e) {
		notifier(
			e.response?.data?.message || 'Impossible de charger les dossiers.',
		   'erreur'
		)
	} finally {
		chargementSansRdv.value = false
	}
}

async function marquerPresentSansRdv(dossier) {
	marquageEnCours.value = dossier.id_dossier
	try {
		const res = await api.post(
			`/dossiers/${dossier.id_dossier}/present-sans-rdv`,
			{ id_guichet: session.value?.id_guichet }
		)
		
		const ticket = res.data?.data?.ticket
		notifier(
			`Ticket ${ticket?.numero_ticket} créé pour ${dossier.nom_raison_sociale}.`,
		   'succes'
		)
		
		/* Retirer de la liste + recharger la file */
		dossiersSansRdv.value = dossiersSansRdv.value.filter(
			d => d.id_dossier !== dossier.id_dossier
		)
		await chargerFile()
	} catch (e) {
		notifier(
			e.response?.data?.message || 'Erreur lors du marquage.',
		   'erreur'
		)
	} finally {
		marquageEnCours.value = null
	}
}

function ouvrirPanneauSansRdv() {
	showSansRdvPanel.value = true
	chargerDossiersSansRdv()
}

/* Debounce recherche */
let rechercheTimer = null
watch(rechercheSansRdv, () => {
	if (rechercheTimer) clearTimeout(rechercheTimer)
		rechercheTimer = setTimeout(chargerDossiersSansRdv, 400)
})

/* Helpers dates */
function isToday(iso) {
	if (!iso) return false
		const d = new Date(iso)
		const now = new Date()
		return d.getDate() === now.getDate()
		&& d.getMonth() === now.getMonth()
		&& d.getFullYear() === now.getFullYear()
}

function relativeDate(iso) {
	if (!iso) return '—'
		const d = new Date(iso)
		const diff = Math.floor((Date.now() - d.getTime()) / 1000)
		
		if (diff < 60) return "à l'instant"
			if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
				if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
					if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`
						
						return d.toLocaleDateString('fr-FR', {
							day: '2-digit',
							month: 'short'
						})
}

// ============================================================
// RENDEZ-VOUS DU JOUR (accueil)
// ============================================================

const rdvDuJour = ref([])
const chargementRdv = ref(true)

async function chargerRdvDuJour() {
	chargementRdv.value = true
	try {
		const res = await api.get('/accueil/rdv-du-jour')
		rdvDuJour.value = res.data.data
	} catch (e) {
		notifier(e.message, 'erreur')
	} finally {
		chargementRdv.value = false
	}
}

async function marquerPresent(id_rdv) {
	try {
		await api.post(`/rendez-vous/${id_rdv}/present`)
		notifier('Contribuable marqué présent, ticket créé.', 'succes')
		await Promise.all([chargerFile(), chargerRdvDuJour()])
	} catch (e) {
		notifier(e.message, 'erreur')
	}
}

//=============================================================
//  GESTION DES TEMPS REELS
//=============================================================

/* ============================================================
 * SOCKET HANDLERS — nommés pour pouvoir les retirer
 * ============================================================ */
function onFileRefresh() {
	chargerFile()
}

function onFileUpdated({ ticket }) {
	if (!ticket) return
		const index = fileAttente.value.findIndex(
			(t) => String(t.id_ticket) === String(ticket.id_ticket)
		)
		if (index !== -1) {
			fileAttente.value[index] = { ...fileAttente.value[index], ...ticket }
		}
}

function onGuichetUpdated(data) {
	if (!data?.id_guichet) return
		/* ⭐ Comparaison STRING (UUID) */
		if (String(data.id_guichet) !== String(session.value?.id_guichet)) return
			console.log('📡 [Guichet] Mise à jour reçue :', data)
			chargerSession()
}

// ============================================================
// NOTIFICATIONS (toasts)
// ============================================================

const toasts = ref([])
let toastId = 0

function notifier(message, type = 'info') {
	const id = ++toastId
	toasts.value.push({ id, message, type })
	setTimeout(() => {
		toasts.value = toasts.value.filter((t) => t.id !== id)
	}, 4000)
}

// ============================================================
// LIBELLÉS / STYLES DE STATUT
// ============================================================

const STATUTS_LABELS = {
	RESERVE: 'Réservé',
	EN_ATTENTE: 'En attente',
	APPELE: 'Appelé',
	EN_COURS: 'En cours',
	TERMINE: 'Terminé',
	ABSENT: 'Absent',
	ANNULE: 'Annulé'
}

function libelleStatut(statut) {
	return STATUTS_LABELS[statut] || statut
}

const STATUTS_STYLES = {
	RESERVE: { dot: 'bg-slate-400', text: 'text-slate-500' },
	EN_ATTENTE: { dot: 'bg-amber-500', text: 'text-amber-600' },
	APPELE: { dot: 'bg-[var(--primary)]', text: 'text-[var(--primary)]' },
	EN_COURS: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
	TERMINE: { dot: 'bg-emerald-600', text: 'text-emerald-700' },
	ABSENT: { dot: 'bg-rose-500', text: 'text-rose-600' },
	ANNULE: { dot: 'bg-slate-300', text: 'text-slate-400' }
}

function styleStatut(statut) {
	return STATUTS_STYLES[statut] || STATUTS_STYLES.RESERVE
}

function formatHeure(valeur) {
	if (!valeur) return '—'
		try {
			return new Date(valeur).toLocaleTimeString('fr-FR', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'Indian/Antananarivo'
			})
		} catch {
			return '—'
		}
}

function nomAffichage(t) {
	if (t.nom_visiteur) return t.nom_visiteur
		if (t.nom_raison_sociale) return `${t.nom_raison_sociale} ${t.prenom || ''}`.trim()
			return 'Visiteur'
}

// ============================================================
// ANIMATIONS GSAP — numéro appelé + halo pulsant
// ============================================================

const numeroActuelEl = ref(null)
const haloEl = ref(null)
let haloTween = null

watch(
	() => ticketActuel.value?.id_ticket,
	  async (nouveauId, ancienId) => {
		  if (nouveauId && nouveauId !== ancienId) {
			  await nextTick()
			  if (numeroActuelEl.value) {
				  gsap.fromTo(
					  numeroActuelEl.value,
				  { scale: 0.4, opacity: 0, y: -16 },
				  { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: 'back.out(2.2)' }
				  )
			  }
		  }
	  }
)

watch(
	() => [guichetOuvert.value, !!ticketActuel.value, ticketsEnAttente.value.length],
	  ([ouvert, occupe, enAttente]) => {
		  haloTween?.kill()
		  if (haloEl.value) gsap.set(haloEl.value, { scale: 1, opacity: 0.5 })
			  if (ouvert && !occupe && enAttente > 0 && haloEl.value) {
				  haloTween = gsap.to(haloEl.value, {
					  scale: 1.6,
					  opacity: 0,
					  duration: 1.5,
					  ease: 'power1.out',
					  repeat: -1
				  })
			  }
	  },
	  { immediate: true }
)

function onDossierUpdated() {
	/* Si le panneau est ouvert, recharger la liste */
	if (showSansRdvPanel.value) {
		chargerDossiersSansRdv()
	}
}


// ============================================================
// CYCLE DE VIE
// ============================================================

onMounted(async () => {
	chargementSession.value = true
	try {
		await Promise.all([chargerSession(), chargerFile(), chargerRdvDuJour()])
	} finally {
		chargementSession.value = false
	}
	socket.on('file:refresh', onFileRefresh)
	socket.on('file:updated', onFileUpdated)
	socket.on('guichet:updated', onGuichetUpdated)
	socket.on('dossier:updated', onDossierUpdated)
})

onBeforeUnmount(() => {
	socket.off('file:refresh', onFileRefresh)
	socket.off('file:updated', onFileUpdated)
	socket.off('guichet:updated', onGuichetUpdated)
	socket.off('dossier:updated', onDossierUpdated)
	haloTween?.kill()
})
</script>

<template>
<div class="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6 space-y-6">
<!-- ================= EN-TÊTE : SESSION GUICHET ================= -->
<div
class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
>
<div>
<h1 class="text-lg font-semibold tracking-tight">Espace guichetier</h1>
<p class="text-sm text-[var(--text-muted)]">
Centre Fiscal de Manakara — accueil et traitement des tickets
</p>
</div>

<div class="flex items-center gap-3">

<!-- Badge état (visible seulement si guichet connu) -->
<motion.div
v-if="session"
:animate="{ scale: guichetOuvert ? [1, 1.05, 1] : 1 }"
:transition="{ duration: 0.4 }"
class="flex items-center gap-2 px-3 py-1.5 rounded-full border"
:class="
guichetOuvert
? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
: 'border-[var(--border)] bg-[var(--hover)] text-[var(--text-muted)]'
"
>
<span
class="w-2 h-2 rounded-full"
:class="guichetOuvert ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"
/>
<span class="text-sm font-medium">
Guichet n°{{ session.numero_guichet }} — {{ guichetOuvert ? 'ouvert' : 'fermé' }}
</span>
</motion.div>

<!-- Carte compacte "Mon guichet" -->
<div
v-if="session"
class="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
>
<div class="min-w-0">
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
Mon guichet
</p>
<p class="text-sm font-bold text-[var(--text)] truncate">
{{ session.libelle || 'Sans libellé' }}
</p>
</div>

<!-- Bouton OUVRIR / FERMER -->
<motion.button
:disabled="enCoursAction"
@click="guichetOuvert ? fermerGuichet() : ouvrirGuichet()"
:whileHover="!enCoursAction ? { scale: 1.03 } : {}"
:whileTap="!enCoursAction ? { scale: 0.97 } : {}"
:class="[
'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50',
guichetOuvert
? 'bg-red-500 text-white hover:bg-red-600'
: 'bg-[var(--primary)] text-white hover:bg-blue-600'
]"
>
<svg v-if="enCoursAction" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else-if="guichetOuvert" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
</svg>
<svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
{{ enCoursAction
	? (guichetOuvert ? 'Fermeture…' : 'Ouverture…')
	: (guichetOuvert ? 'FERMER' : 'OUVRIR') }}
	</motion.button>
	</div>
	
	<!-- Aucun guichet assigné -->
	<div
	v-else-if="!chargementSession"
	class="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30"
	>
	<svg class="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
	d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
	</svg>
	<p class="text-xs font-semibold text-orange-600 dark:text-orange-300">
	Aucun guichet assigné
	</p>
	</div>
	</div>
</div>

<!-- ================= GRILLE PRINCIPALE ================= -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<!-- ---------- COLONNE PRINCIPALE (traitement) ---------- -->
<div class="lg:col-span-2 space-y-6">
<!-- Panneau : ticket en cours / appel -->
<div class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
<div class="flex items-center justify-between mb-4">
<h2 class="font-semibold">Traitement</h2>
<span class="text-xs text-[var(--text-muted)]">
{{ ticketsEnAttente.length }} en attente
</span>
</div>

<AnimatePresence mode="wait">
<motion.div
v-if="ticketActuel"
:key="ticketActuel.id_ticket"
:initial="{ opacity: 0, y: 8 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -8 }"
class="flex flex-col items-center text-center py-6"
>
<span class="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
Ticket en cours
</span>
<span
ref="numeroActuelEl"
class="text-6xl font-bold text-[var(--primary)] leading-none"
>
{{ ticketActuel.numero_ticket }}
</span>

<!--/////////////////////////////ticket timier debut///////////////////////////////////-->

<div
v-if="ticketActuel.statut_ticket === 'EN_COURS'"
class="mt-5 w-full max-w-sm rounded-xl border px-4 py-3"
:class="ZONE_UI[zone].ring"
style="background: var(--bg)"
>
<div class="flex items-end justify-between gap-3 mb-2">
<div class="text-left">
<p class="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
Temps écoulé · {{ dureeMin() }} min prévues
</p>
<p class="text-xs text-[var(--text-muted)]">
{{ ticketActuel.libelle_service || 'Service' }}
</p>
</div>
<p class="text-3xl font-bold tabular-nums leading-none" :class="ZONE_UI[zone].text">
{{ label }}
</p>
</div>

<div class="h-2 rounded-full overflow-hidden" style="background: var(--hover)">
<div
class="h-full rounded-full transition-[width] duration-200"
:class="ZONE_UI[zone].bar"
:style="{ width: Math.min(pct, 100) + '%' }"
/>
</div>

<p class="text-[11px] mt-2 font-medium" :class="ZONE_UI[zone].text">
<template v-if="zone === 'vert'">🟢 Dans les temps ({{ Math.floor(pct) }}%)</template>
<template v-else-if="zone === 'orange'">🟠 Bientôt dépassé ({{ Math.floor(pct) }}%)</template>
<template v-else>🔴 Dépassé · +{{ fmt(overtimeMs) }}</template>
</p>
</div>

<!--/////////////////////////////ticket timier debut///////////////////////////////////-->

<span class="mt-3 text-[var(--text)]">{{ nomAffichage(ticketActuel) }}</span>
<span v-if="ticketActuel.libelle_service" class="text-sm text-[var(--text-muted)]">
{{ ticketActuel.libelle_service }}
</span>

<div class="flex flex-wrap justify-center gap-2 mt-5">
<button
v-if="ticketActuel.statut_ticket === 'APPELE'"
@click="changerStatutTicket(ticketActuel.id_ticket, 'EN_COURS')"
class="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition"
>
Démarrer le traitement
</button>
<button
v-if="ticketActuel.statut_ticket === 'EN_COURS'"
@click="changerStatutTicket(ticketActuel.id_ticket, 'TERMINE')"
class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition"
>
Terminer
</button>
<button
@click="changerStatutTicket(ticketActuel.id_ticket, 'ABSENT')"
class="px-4 py-2 rounded-lg border border-rose-300 text-rose-600 text-sm font-medium hover:bg-rose-50 transition"
>
Absent
</button>
<button
@click="changerStatutTicket(ticketActuel.id_ticket, 'EN_ATTENTE')"
class="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--hover)] transition"
>
Remettre en attente
</button>
</div>
</motion.div>

<motion.div
v-else
key="vide"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
class="flex flex-col items-center text-center py-10"
>
<div class="relative flex items-center justify-center mb-4">
<span ref="haloEl" class="absolute w-16 h-16 rounded-full bg-[var(--primary)]/40" />
<span
class="relative w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-2xl"
>
🔔
</span>
</div>
<p class="text-[var(--text-muted)] mb-4">
{{
	!guichetOuvert
	? 'Ouvrez votre guichet pour commencer à appeler des tickets.'
	: 'Aucun ticket en traitement.'
}}
</p>
<button
:disabled="!guichetOuvert || appelEnCours"
@click="appelerSuivant"
class="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-40 transition"
>
{{ appelEnCours ? 'Appel en cours…' : 'Appeler le suivant' }}
</button>
</motion.div>
</AnimatePresence>
</div>

<!-- Panneau : rendez-vous du jour -->
<!-- ================= DOSSIERS SANS RDV + RDV DU JOUR ================= -->
<div class="space-y-6">

<!-- ============ DOSSIERS SANS RDV ============ -->
<div class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
<div class="flex items-center justify-between mb-4">
<div>
<h2 class="font-semibold">Dossiers validés sans RDV</h2>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Contribuables dont le dossier a été validé et qui attendent au guichet
</p>
</div>
<motion.button
@click="ouvrirPanneauSansRdv"
:whileHover="{ scale: 1.03 }"
:whileTap="{ scale: 0.97 }"
class="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition"
>
+ Accueillir
</motion.button>
</div>

<div class="flex items-center gap-3 text-xs text-[var(--text-muted)]">
<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
</svg>
<p>
Cliquez sur "Accueillir" pour générer un ticket automatiquement.
</p>
</div>
</div>

<!-- ============ RENDEZ-VOUS DU JOUR ============ -->
<div class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
<div class="flex items-center justify-between mb-4">
<h2 class="font-semibold">Rendez-vous du jour</h2>
<button
@click="ouvrirModaleWalkIn"
class="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] transition"
>
+ Visiteur anonyme
</button>
</div>

<p v-if="chargementRdv" class="text-sm text-[var(--text-muted)]">Chargement…</p>
<p v-else-if="!rdvDuJour.length" class="text-sm text-[var(--text-muted)]">
Aucun rendez-vous prévu aujourd'hui.
</p>
<ul v-else class="divide-y divide-[var(--border)]">
<li
v-for="rdv in rdvDuJour"
:key="rdv.id_rdv"
class="py-3 flex items-center justify-between gap-3"
>
<div class="min-w-0">
<p class="text-sm font-medium truncate">
{{ rdv.heure_rdv }} — {{ rdv.nom_raison_sociale || rdv.nom_visiteur || 'Contribuable' }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
{{ rdv.libelle_service }} · {{ rdv.statut_rdv }}
</p>
</div>
<button
v-if="rdv.statut_rdv === 'CONFIRME'"
@click="marquerPresent(rdv.id_rdv)"
class="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition"
>
Marquer présent
</button>
</li>
</ul>
</div>
</div>
</div>

<!-- ---------- COLONNE FILE D'ATTENTE ---------- -->
<div class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 h-fit">
<div class="flex items-center justify-between mb-4">
<h2 class="font-semibold">File d’attente</h2>
<span class="text-xs text-[var(--text-muted)]">{{ fileAttente.length }} ticket(s)</span>
</div>

<p v-if="chargementFile" class="text-sm text-[var(--text-muted)]">Chargement…</p>
<p v-else-if="!ticketsEnAttente.length && !ticketsAutresGuichets.length" class="text-sm text-[var(--text-muted)]">
Personne en attente pour le moment.
</p>

<div class="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
<AnimatePresence>
<motion.div
v-for="t in ticketsEnAttente"
:key="t.id_ticket"
layout
:initial="{ opacity: 0, x: 16 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: -16 }"
:transition="{ duration: 0.25 }"
class="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2"
style="background: var(--bgListCard); border-color: var(--borderListCard)"
>
<div class="min-w-0">
<p class="text-sm font-semibold" style="color: var(--textListCard)">
{{ t.numero_ticket }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">{{ nomAffichage(t) }}</p>
</div>
<span class="flex items-center gap-1.5 text-xs shrink-0" :class="styleStatut(t.statut_ticket).text">
<span class="w-1.5 h-1.5 rounded-full" :class="styleStatut(t.statut_ticket).dot" />
{{ libelleStatut(t.statut_ticket) }}
</span>
</motion.div>
</AnimatePresence>

<template v-if="ticketsAutresGuichets.length">
<p class="text-xs text-[var(--text-muted)] pt-2">En traitement à d’autres guichets</p>
<div
v-for="t in ticketsAutresGuichets"
:key="t.id_ticket"
class="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 opacity-70"
style="background: var(--bgListCard); border-color: var(--borderListCard)"
>
<div class="min-w-0">
<p class="text-sm font-semibold" style="color: var(--textListCard)">
{{ t.numero_ticket }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
Guichet {{ t.numero_guichet }} · {{ formatHeure(t.heure_appel) }}
</p>
</div>
<span class="flex items-center gap-1.5 text-xs shrink-0" :class="styleStatut(t.statut_ticket).text">
<span class="w-1.5 h-1.5 rounded-full" :class="styleStatut(t.statut_ticket).dot" />
{{ libelleStatut(t.statut_ticket) }}
</span>
</div>
</template>
</div>
</div>
</div>

<!-- ================= PANNEAU : DOSSIERS SANS RDV ================= -->
<AnimatePresence>
<motion.div
v-if="showSansRdvPanel"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
@click="showSansRdvPanel = false"
>
<motion.div
:initial="{ x: '100%' }"
:animate="{ x: 0 }"
:exit="{ x: '100%' }"
:transition="{ type: 'spring', stiffness: 300, damping: 30 }"
@click.stop
class="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-[var(--card)] shadow-2xl overflow-y-auto"
>
<!-- Header -->
<div class="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)] px-5 py-4">
<div class="flex items-center justify-between gap-3 mb-3">
<div>
<h3 class="font-bold text-[var(--text)]">
Accueillir un dossier sans RDV
</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Dossiers validés en attente d'accueil
</p>
</div>
<button
@click="showSansRdvPanel = false"
class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--hover)] transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>

<!-- Recherche -->
<div class="relative">
<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="rechercheSansRdv"
type="text"
placeholder="Rechercher par référence, NIF ou nom..."
class="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
/>
</div>
</div>

<!-- Liste -->
<div class="p-5 space-y-2">

<!-- Loading -->
<div v-if="chargementSansRdv" class="space-y-2">
<div v-for="n in 4" :key="n"
class="h-20 rounded-xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Vide -->
<div v-else-if="!dossiersSansRdv.length" class="py-12 text-center">
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3"
fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
</svg>
<p class="text-sm text-[var(--text-muted)]">
Aucun dossier validé sans RDV à accueillir
</p>
<p class="text-xs text-[var(--text-muted)] mt-1">
Les dossiers apparaissent ici une fois validés par un vérificateur.
</p>
</div>

<!-- Cartes -->
<motion.button
v-for="(d, i) in dossiersSansRdv"
:key="d.id_dossier"
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ delay: i * 0.04 }"
:whileHover="{ y: -2 }"
:disabled="marquageEnCours === d.id_dossier"
@click="marquerPresentSansRdv(d)"
class="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 hover:border-[var(--primary)]/40 transition disabled:opacity-50"
>
<div class="flex items-start gap-3">

<!-- Avatar -->
<div class="shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">
{{ (d.nom_raison_sociale || '?')[0].toUpperCase() }}
</div>

<!-- Infos -->
<div class="min-w-0 flex-1">
<div class="flex items-center gap-2 flex-wrap mb-1">
<span class="text-sm font-bold text-[var(--text)] truncate">
{{ d.nom_raison_sociale }} {{ d.prenom || '' }}
</span>

<!-- Badge VALIDE -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
Prêt
</span>

<!-- Badge Aujourd'hui -->
<span
v-if="isToday(d.date_validation)"
class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] font-black uppercase"
>
Aujourd'hui
</span>
</div>

<p class="text-xs text-[var(--text-muted)]">
NIF {{ d.nif }} · Réf {{ d.reference_dossier }}
</p>

<p class="text-xs text-[var(--text-muted)] mt-1">
{{ d.libelle_service || 'Service' }}
</p>

<p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
<template v-if="d.date_validation">
✓ Validé {{ relativeDate(d.date_validation) }}
</template>
<template v-else>
✓ Dossier prêt
</template>
</p>
</div>

<!-- Action -->
<div
v-if="marquageEnCours === d.id_dossier"
class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--primary)]/10"
>
<svg class="w-4 h-4 animate-spin text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
</div>
<div
v-else
class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
</svg>
Accueillir
</div>
</div>
</motion.button>
</div>
</motion.div>
</motion.div>
</AnimatePresence>

<!-- ================= MODALE : ARRIVANT SANS RENDEZ-VOUS ================= -->
<AnimatePresence>
<motion.div
v-if="modaleWalkInOuverte"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
@click.self="modaleWalkInOuverte = false"
>
<motion.div
:initial="{ opacity: 0, scale: 0.95, y: 10 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.95, y: 10 }"
:transition="{ duration: 0.2 }"
class="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm"
>
<h3 class="font-semibold mb-4">Nouveau ticket — sans rendez-vous</h3>

<label class="block text-sm mb-1 text-[var(--text-muted)]">Nom du visiteur</label>
<input
v-model="walkInForm.nom_visiteur"
type="text"
class="w-full mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
placeholder="Ex : Rakoto Jean"
/>

<label class="block text-sm mb-1 text-[var(--text-muted)]">Motif de la visite</label>
<textarea
v-model="walkInForm.motif_visite"
rows="3"
class="w-full mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
placeholder="Ex : Attestation fiscale"
/>

<div class="flex justify-end gap-2">
<button
@click="modaleWalkInOuverte = false"
class="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--hover)] transition"
>
Annuler
</button>
<button
:disabled="envoiWalkIn"
@click="creerWalkIn"
class="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
>
{{ envoiWalkIn ? 'Création…' : 'Créer le ticket' }}
</button>
</div>
</motion.div>
</motion.div>
</AnimatePresence>

<!-- ================= TOASTS ================= -->
<div class="fixed bottom-4 right-4 z-50 space-y-2 w-72">
<AnimatePresence>
<motion.div
v-for="toast in toasts"
:key="toast.id"
:initial="{ opacity: 0, x: 40 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: 40 }"
:transition="{ duration: 0.25 }"
class="rounded-xl border px-4 py-3 text-sm shadow-sm bg-[var(--card)]"
:class="{
'border-emerald-300 text-emerald-700': toast.type === 'succes',
'border-rose-300 text-rose-600': toast.type === 'erreur',
'border-[var(--border)] text-[var(--text)]': toast.type === 'info'
}"
>
{{ toast.message }}
</motion.div>
</AnimatePresence>
</div>
</div>
</template>
