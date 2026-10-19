<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'
import { socket } from '@/services/socket'

const router = useRouter()
const toast = useToast()

function getUser() {
	try {
		const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}
const user = ref(getUser())
const monAgentId = computed(() => user.value?.id)

/* ============================================================
 * ÉTAT
 * ============================================================ */
const session = ref(null)
const fileAttente = ref([])
const rdvDuJour = ref([])

const isLoading = ref(true)

const guichetOuvert = computed(() => session.value?.est_ouvert === true)
const monGuichetId = computed(() => session.value?.id_guichet)

/* ============================================================
 * COMPUTED — MES TICKETS
 * ⭐ CORRECTIF : filtré par id_agent (moi), pas par id_guichet (le
 * poste physique). Voir la note plus haut sur la réaffectation.
 * ============================================================ */
const mesTickets = computed(() => {
	if (monAgentId.value) {
		return fileAttente.value.filter(
			t => String(t.id_agent) === String(monAgentId.value)
		)
	}
	/* ⭐ Repli : si l'identité agent n'est pas trouvée côté client
	 * (localStorage 'currentUser' sans id_agent/id), on retombe sur le
	 * filtrage par guichet plutôt que de retourner une liste vide —
	 * mieux vaut une donnée approximative qu'un dashboard qui semble
	 * cassé. Voir la note au-dessus de monAgentId. */
	return fileAttente.value.filter(
		t => monGuichetId.value && String(t.id_guichet) === String(monGuichetId.value)
	)
})

/* Ticket actuel */
const ticketActuel = computed(() =>
mesTickets.value.find(
	t => t.statut_ticket === 'APPELE' || t.statut_ticket === 'EN_COURS'
) || null
)

/* Timeline : 3 passés + actuel + 3 suivants */
const timeline = computed(() => {
	const tous = fileAttente.value.slice().sort((a, b) =>
	String(a.numero_ticket).localeCompare(String(b.numero_ticket))
	)
	
	const indexActuel = tous.findIndex(t => t.id_ticket === ticketActuel.value?.id_ticket)
	
	if (indexActuel === -1) {
		/* Pas de ticket en cours → on prend les 3 derniers passés + le prochain + 2 après */
		const passes = tous.filter(t =>
		t.statut_ticket === 'TERMINE' || t.statut_ticket === 'ABSENT'
		).slice(-3)
		
		const futurs = tous.filter(t =>
		t.statut_ticket === 'EN_ATTENTE' || t.statut_ticket === 'RESERVE'
		).slice(0, 3)
		
		return {
			passes,
			actuel: null,
			suivants: futurs
		}
	}
	
	return {
		passes: tous.slice(Math.max(0, indexActuel - 3), indexActuel),
						  actuel: tous[indexActuel],
						  suivants: tous.slice(indexActuel + 1, indexActuel + 4)
	}
})

/* Stats personnelles */
const stats = computed(() => {
	// --- COMPTAGES DE BASE ---
	const total = mesTickets.value.length;
	const traites = mesTickets.value.filter(t => t.statut_ticket === 'TERMINE').length;
	const absents = mesTickets.value.filter(t => t.statut_ticket === 'ABSENT').length;
	
	const enAttente = fileAttente.value.filter(
		t => t.statut_ticket === 'EN_ATTENTE' || t.statut_ticket === 'RESERVE'
	).length;
	
	// --- CALCUL DU TEMPS MOYEN DE TRAITEMENT ---
	// heure_appel = début | heure_fin = fin (Format TIME PostgreSQL "HH:MM:SS")
	const termines = mesTickets.value.filter(
		t => t.statut_ticket === 'TERMINE' && t.heure_appel && t.heure_fin
	);
	
	let tempsMoyen = 0;
	
	if (termines.length > 0) {
		const durees = termines
		.map(t => {
			const [hDebut, mDebut, sDebut = 0] = String(t.heure_appel).split(':').map(Number);
			const [hFin, mFin, sFin = 0] = String(t.heure_fin).split(':').map(Number);
			
			const debutMinutes = hDebut * 60 + mDebut + sDebut / 60;
			const finMinutes = hFin * 60 + mFin + sFin / 60;
			
			let duree = finMinutes - debutMinutes;
			
			// Protection si le traitement traverse minuit
			if (duree < 0) {
				duree += 24 * 60;
			}
			
			return duree;
		})
		.filter(duree => Number.isFinite(duree) && duree >= 0);
		
		if (durees.length > 0) {
			const totalMinutes = durees.reduce((sum, duree) => sum + duree, 0);
			tempsMoyen = Math.round(totalMinutes / durees.length);
		}
	}
	
	// --- STATISTIQUES FINALES ---
	const conclus = traites + absents;
	const tauxPresence = conclus > 0 ? Math.round((traites / conclus) * 100) : 0;
	
	return {
		total,
		traites,
		absents,
		enAttente,
		tempsMoyen, // exprimé en minutes
		tauxPresence // exprimé en pourcentage
	};
});


/* Affluence horaire (aujourd'hui) */
const affluence = computed(() => {
	const map = new Map()
	fileAttente.value.forEach(t => {
		const h = extraireHeureNumero(t.heure_arrivee)
		if (h !== null) {
			map.set(h, (map.get(h) || 0) + 1)
		}
	})
	
	const out = []
	for (let h = 8; h <= 17; h++) {
		out.push({ heure: h, count: map.get(h) || 0 })
	}
	return out
})

const maxAffluence = computed(() =>
Math.max(...affluence.value.map(a => a.count), 1)
)

/* Liste des contribuables du jour (regroupés par ticket) */
const contribuables = computed(() =>
fileAttente.value.map(t => ({
	id_ticket: t.id_ticket,
	numero_ticket: t.numero_ticket,
	nom: t.nom_visiteur || t.nom_raison_sociale || 'Visiteur',
	service: t.libelle_service || '—',
	heure_arrivee: t.heure_arrivee,
	statut: t.statut_ticket,
	estMien: monAgentId.value
	? String(t.id_agent) === String(monAgentId.value)
	: (monGuichetId.value && String(t.id_guichet) === String(monGuichetId.value))
}))
)

/* ============================================================
 * CHARGEMENT
 * ============================================================ */
async function chargerTout() {
	isLoading.value = true
	try {
		const [s, f, r] = await Promise.all([
			api.get('/guichets/session').catch(() => ({ data: { data: null } })),
											api.get('/tickets/file'),
											api.get('/accueil/rdv-du-jour').catch(() => ({ data: { data: [] } }))
		])
		
		const sData = s.data?.data
		session.value = sData?.guichet
		? {
			...sData.guichet,
			est_ouvert: sData.est_ouvert,
			date_debut: sData.date_debut
		}
		: null
		
		fileAttente.value = f.data?.data || []
		rdvDuJour.value = r.data?.data || []
	} catch (error) {
		console.error('❌ Erreur chargement :', error)
	} finally {
		isLoading.value = false
	}
}

/* ============================================================
 * ACTIONS
 * ============================================================ */
async function basculerGuichet() {
	try {
		if (guichetOuvert.value) {
			await api.post('/guichets/fermer')
			if (session.value) session.value.est_ouvert = false
				toast.success('Guichet fermé.')
		} else {
			await api.post('/guichets/ouvrir')
			await chargerTout()
			toast.success('Guichet ouvert.')
		}
	} catch (error) {
		toast.error(error.response?.data?.message || 'Erreur.')
	}
}

/* ============================================================
 * SOCKET
 * ============================================================ */
function onRefresh() {
	chargerTout()
}

/* ============================================================
 * HELPERS
 * ============================================================ */
const STATUT_LABEL = {
	RESERVE: 'Réservé',
	EN_ATTENTE: 'En attente',
	APPELE: 'Appelé',
	EN_COURS: 'En cours',
	TERMINE: 'Terminé',
	ABSENT: 'Absent',
	ANNULE: 'Annulé'
}

const STATUT_STYLE = {
	RESERVE: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-400' },
	EN_ATTENTE: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
	APPELE: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
	EN_COURS: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
	TERMINE: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-600' },
	ABSENT: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' }
}

function styleStatut(s) {
	return STATUT_STYLE[s] || STATUT_STYLE.RESERVE
}

function labelStatut(s) {
	return STATUT_LABEL[s] || s
}

/* ⭐ CORRECTIF : heure_arrivee / heure_appel / heure_fin / heure_rdv sont
 * des colonnes TIME côté base (ex: "14:23:00"), pas des TIMESTAMP.
 * `new Date("14:23:00")` ne lève PAS d'erreur en JS — elle renvoie
 * silencieusement "Invalid Date", d'où le "Date invalide" affiché et
 * les heures qui disparaissaient du calcul d'affluence (NaN).
 * Ces deux helpers gèrent les deux formats (heure seule ou timestamp
 * complet) sans jamais planter ni afficher "Invalid Date". */
function extraireHeureNumero(valeur) {
	if (!valeur) return null
		if (typeof valeur === 'string') {
			const m = valeur.match(/^(\d{2}):/)
			if (m) return Number(m[1])
		}
		const d = new Date(valeur)
		return isNaN(d.getTime()) ? null : d.getHours()
}

function formatHeure(valeur) {
	if (!valeur) return '—'
		/* Colonne TIME pure ("14:23:00" ou "14:23:00.123456") → pas besoin
		 * de passer par Date, on formate directement la chaîne. */
		if (typeof valeur === 'string' && /^\d{2}:\d{2}/.test(valeur)) {
			return valeur.slice(0, 5)
		}
		try {
			const d = new Date(valeur)
			if (isNaN(d.getTime())) return '—'
				return d.toLocaleTimeString('fr-FR', {
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'Indian/Antananarivo'
				})
		} catch { return '—' }
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

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(() => {
	chargerTout()
	socket.on('file:refresh', onRefresh)
	socket.on('file:updated', onRefresh)
	socket.on('guichet:updated', onRefresh)
})

onBeforeUnmount(() => {
	socket.off('file:refresh', onRefresh)
	socket.off('file:updated', onRefresh)
	socket.off('guichet:updated', onRefresh)
})
</script>

<template>
<div class="space-y-6 mx-6 my-8">

<!-- ============================================================
* HEADER PERSONNEL
* ============================================================ -->
<motion.div
:initial="{ opacity: 0, y: -8 }"
:animate="{ opacity: 1, y: 0 }"
class="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--bg)] p-5 sm:p-6"
>
<div class="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
<div class="flex items-start gap-4 min-w-0">
<div
:class="[
'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
guichetOuvert
? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
: 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
]"
>
<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
</div>
<div class="min-w-0">
<p class="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--primary)]">
{{ dateAujourdhui() }} · {{ heureActuelle() }}
</p>
<h2 class="text-xl font-black text-[var(--text)] mt-1 truncate">
<template v-if="session">
Guichet n°{{ session.numero_guichet }} — {{ session.libelle }}
</template>
<template v-else>
Bienvenue au guichet
</template>
</h2>
<p class="text-xs text-[var(--text-muted)] mt-1">
{{ guichetOuvert
	? `Ouvert depuis ${formatHeure(session.date_debut)}`
	: session
	? 'Guichet prêt à être ouvert'
	: 'Aucun guichet assigné'
}}
</p>
</div>
</div>

<button
v-if="session"
@click="basculerGuichet"
:class="[
'shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition',
guichetOuvert
? 'bg-red-500 text-white hover:bg-red-600'
: 'bg-[var(--primary)] text-white hover:bg-blue-600'
]"
>
{{ guichetOuvert ? 'Fermer le guichet' : 'Ouvrir le guichet' }}
</button>
</div>
</motion.div>

<!-- ============================================================
* KPI PERSONNELS
* ============================================================ -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
<motion.div
v-for="(kpi, i) in [
{
key: 'traites',
label: 'Mes Traités aujourd\'hui',
value: stats.traites,
sub: `Sur ${stats.total} tickets`,
tone: 'success',
icon: 'check'
},
{
key: 'moyenne',
label: 'Temps moyen',
value: stats.tempsMoyen > 0 ? `${stats.tempsMoyen} min` : '—',
sub: 'Par ticket',
tone: 'primary',
icon: 'clock'
},
{
key: 'presence',
label: 'Taux de présence',
value: `${stats.tauxPresence}%`,
sub: `${stats.absents} absent(s)`,
tone: stats.tauxPresence > 80 ? 'success' : 'warning',
icon: 'user'
},
{
key: 'attente',
label: 'En attente',
value: stats.enAttente,
sub: 'Dans la file',
tone: 'warning',
icon: 'ticket'
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
<svg v-if="kpi.icon === 'check'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
</svg>
<svg v-else-if="kpi.icon === 'clock'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<svg v-else-if="kpi.icon === 'user'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
</svg>
</div>
</div>
</motion.div>
</div>

<!-- ============================================================
* GRILLE : TIMELINE + AFFLUENCE
* ============================================================ -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

<!-- TIMELINE (2/3) -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.2 }"
class="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
>
<div class="flex items-center justify-between mb-5">
<div>
<h3 class="text-base font-bold text-[var(--text)]">File d'attente du jour</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
{{ fileAttente.length }} ticket(s) · {{ timeline.passes.length }} passés,
{{ timeline.actuel ? 1 : 0 }} en cours,
{{ timeline.suivants.length }} à venir
</p>
</div>
<button
@click="router.push({ name: 'Ticket' })"
class="text-xs font-bold text-[var(--primary)] hover:underline"
>
Voir tout →
</button>
</div>

<!-- Timeline -->
<div class="space-y-3">

<!-- Tickets passés -->
<div
v-for="t in timeline.passes"
:key="`p-${t.id_ticket}`"
class="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] opacity-60"
>
<div class="w-10 h-10 rounded-lg bg-[var(--card)] flex items-center justify-center shrink-0">
<span class="text-xs font-black text-[var(--text)] tabular-nums">
{{ t.numero_ticket }}
</span>
</div>
<div class="min-w-0 flex-1">
<p class="text-sm font-medium text-[var(--text)] truncate">
{{ t.nom_visiteur || t.nom_raison_sociale || 'Visiteur' }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
{{ t.libelle_service || '—' }} · {{ formatHeure(t.heure_fin || t.heure_appel) }}
</p>
</div>
<span
:class="[
'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0',
styleStatut(t.statut_ticket).bg,
styleStatut(t.statut_ticket).text
]"
>
{{ labelStatut(t.statut_ticket) }}
</span>
</div>

<!-- Ticket en cours (mis en avant) -->
<motion.div
v-if="timeline.actuel"
:initial="{ scale: 0.98 }"
:animate="{ scale: 1 }"
class="relative rounded-xl border-2 border-[var(--primary)] bg-gradient-to-r from-blue-500/10 to-transparent p-4"
>
<div class="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider">
En cours
</div>

<div class="flex items-center gap-4">
<div class="w-14 h-14 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
<span class="text-lg font-black tabular-nums">
{{ timeline.actuel.numero_ticket }}
</span>
</div>
<div class="min-w-0 flex-1">
<p class="text-base font-black text-[var(--text)] truncate">
{{ timeline.actuel.nom_visiteur || timeline.actuel.nom_raison_sociale || 'Visiteur' }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate mt-0.5">
{{ timeline.actuel.libelle_service || '—' }}
</p>
<p class="text-[11px] text-[var(--primary)] font-bold mt-1">
Appelé à {{ formatHeure(timeline.actuel.heure_appel) }}
</p>
</div>
</div>
</motion.div>

<!-- Placeholder si pas de ticket en cours -->
<div
v-else
class="rounded-xl border-2 border-dashed border-[var(--border)] p-4 text-center"
>
<p class="text-xs text-[var(--text-muted)]">
{{ guichetOuvert
	? 'Aucun ticket en cours'
	: 'Ouvrez votre guichet pour commencer'
}}
</p>
</div>

<!-- Tickets suivants -->
<div
v-for="t in timeline.suivants"
:key="`s-${t.id_ticket}`"
class="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)]"
>
<div class="w-10 h-10 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0">
<span class="text-xs font-black text-[var(--text)] tabular-nums">
{{ t.numero_ticket }}
</span>
</div>
<div class="min-w-0 flex-1">
<p class="text-sm font-medium text-[var(--text)] truncate">
{{ t.nom_visiteur || t.nom_raison_sociale || 'Visiteur' }}
</p>
<p class="text-xs text-[var(--text-muted)] truncate">
{{ t.libelle_service || '—' }} · Arrivé à {{ formatHeure(t.heure_arrivee) }}
</p>
</div>
<span
:class="[
'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0',
styleStatut(t.statut_ticket).bg,
styleStatut(t.statut_ticket).text
]"
>
{{ labelStatut(t.statut_ticket) }}
</span>
</div>
</div>
</motion.div>

<!-- AFFLUENCE (1/3) -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.3 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
>
<h3 class="text-base font-bold text-[var(--text)]">Affluence du jour</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5 mb-5">
Tickets par heure
</p>

<div class="flex items-end justify-between h-40 gap-1">
<div
v-for="(h, i) in affluence"
:key="h.heure"
class="flex flex-col items-center gap-1.5 flex-1 group"
>
<div class="relative w-full flex justify-center h-full items-end">
<span class="absolute -top-6 opacity-0 group-hover:opacity-100 transition text-[10px] font-bold bg-[var(--card)] border border-[var(--border)] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10 text-[var(--text)]">
{{ h.count }}
</span>
<motion.div
:initial="{ height: 0 }"
:animate="{ height: `${(h.count / maxAffluence) * 100}%` }"
:transition="{ duration: 0.7, delay: 0.4 + i * 0.03, ease: 'easeOut' }"
:class="[
'w-full rounded-t-md transition-colors',
h.count === maxAffluence && h.count > 0
? 'bg-gradient-to-t from-orange-500 to-orange-400'
: 'bg-gradient-to-t from-[var(--primary)] to-blue-400'
]"
:style="{ minHeight: h.count > 0 ? '6px' : '2px' }"
></motion.div>
</div>
<span class="text-[9px] text-[var(--text-muted)] font-medium tabular-nums">
{{ String(h.heure).padStart(2, '0') }}
</span>
</div>
</div>

<!-- RDV du jour -->
<div class="mt-6 pt-5 border-t border-[var(--border)]">
<div class="flex items-center justify-between mb-3">
<h4 class="text-xs font-bold text-[var(--text)]">RDV du jour</h4>
<span class="text-[10px] text-[var(--text-muted)]">
{{ rdvDuJour.length }}
</span>
</div>

<div v-if="!rdvDuJour.length" class="text-center py-4">
<p class="text-xs text-[var(--text-muted)]">Aucun rendez-vous.</p>
</div>

<div v-else class="space-y-2 max-h-[200px] overflow-y-auto">
<div
v-for="rdv in rdvDuJour.slice(0, 5)"
:key="rdv.id_rdv"
class="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-[var(--hover)] transition"
>
<span class="font-bold tabular-nums text-[var(--text)] shrink-0">
{{ formatHeure(rdv.heure_rdv) }}
</span>
<span class="truncate text-[var(--text-muted)]">
{{ rdv.nom_raison_sociale || 'Contribuable' }}
</span>
<span
:class="[
'ml-auto shrink-0 w-1.5 h-1.5 rounded-full',
rdv.statut_rdv === 'CONFIRME' ? 'bg-blue-500' :
rdv.statut_rdv === 'HONORE' ? 'bg-emerald-500' :
rdv.statut_rdv === 'ABSENT' ? 'bg-red-500' : 'bg-slate-400'
]"
></span>
</div>
</div>
</div>
</motion.div>
</div>

<!-- ============================================================
* LISTE DES CONTRIBUABLES DU JOUR
* ============================================================ -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.4 }"
class="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
>
<div class="p-5 border-b border-[var(--border)]">
<h3 class="text-base font-bold text-[var(--text)]">Contribuables du jour</h3>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Liste complète des tickets de la journée
</p>
</div>

<!-- Loading -->
<div v-if="isLoading" class="p-5 space-y-2">
<div v-for="n in 5" :key="n" class="h-12 rounded-lg bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Vide -->
<div v-else-if="!contribuables.length" class="py-12 text-center">
<p class="text-sm text-[var(--text-muted)]">Aucun ticket aujourd'hui.</p>
</div>

<!-- Tableau -->
<div v-else class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="bg-[var(--bg)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
<tr>
<th class="text-left px-5 py-3 font-semibold">N° Ticket</th>
<th class="text-left px-5 py-3 font-semibold">Contribuable</th>
<th class="text-left px-5 py-3 font-semibold">Service</th>
<th class="text-left px-5 py-3 font-semibold">Arrivée</th>
<th class="text-left px-5 py-3 font-semibold">Statut</th>
<th class="text-left px-5 py-3 font-semibold">Guichet</th>
</tr>
</thead>
<tbody class="divide-y divide-[var(--border)]">
<tr
v-for="c in contribuables"
:key="c.id_ticket"
:class="[
'hover:bg-[var(--hover)] transition',
c.estMien ? 'bg-[var(--primary)]/[0.03]' : ''
]"
>
<td class="px-5 py-3">
<span class="font-mono font-black text-[var(--text)]">
{{ c.numero_ticket }}
</span>
<span v-if="c.estMien" class="ml-2 text-[9px] font-bold uppercase text-[var(--primary)]">
(mien)
</span>
</td>
<td class="px-5 py-3 text-[var(--text)] font-medium truncate max-w-[200px]">
{{ c.nom }}
</td>
<td class="px-5 py-3 text-xs text-[var(--text-muted)]">
{{ c.service }}
</td>
<td class="px-5 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
{{ formatHeure(c.heure_arrivee) }}
</td>
<td class="px-5 py-3">
<span
:class="[
'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
styleStatut(c.statut).bg,
styleStatut(c.statut).text
]"
>
<span :class="['w-1.5 h-1.5 rounded-full', styleStatut(c.statut).dot]"></span>
{{ labelStatut(c.statut) }}
</span>
</td>
<td class="px-5 py-3">
<span
v-if="c.estMien"
class="text-xs font-bold text-[var(--primary)]"
>
Mon guichet
</span>
<span v-else class="text-xs text-[var(--text-muted)]">
—
</span>
</td>
</tr>
</tbody>
</table>
</div>
</motion.div>
</div>
</template>
