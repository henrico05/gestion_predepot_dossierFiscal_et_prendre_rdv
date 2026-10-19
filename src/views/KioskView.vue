<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/api/Axios'
import { useVoiceAnnouncer } from '@/composables/useVoiceAnnouncer'

const { annoncerTicket, isEnabled: voiceEnabled } = useVoiceAnnouncer()

/* ============================================================
 * ÉTAT GLOBAL
 * ============================================================ */
const ticketActuel      = ref(null)
const prochains         = ref([])
const tempsAttenteMoyen = ref(15)
const tempsProchain     = ref(0)
const nbEnAttente       = ref(0)
const lastUpdate        = ref(null)

const isLoading         = ref(true)
const isRefreshing      = ref(false)
const hasError          = ref(false)
const errorMessage      = ref('')

/* ============================================================
 * HORLOGE
 * ============================================================ */
const currentTime = ref('')
const currentDate = ref('')

function updateClock() {
	const now = new Date()
	currentTime.value = now.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	})
	currentDate.value = now.toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	})
}

/* ============================================================
 * CHARGEMENT DES DONNÉES
 * ============================================================ */
async function chargerEcran() {
	if (!lastUpdate.value) {
		isLoading.value = true
	} else {
		isRefreshing.value = true
	}
	
	try {
		const { data } = await api.get('/tickets/ecran-public')
		const payload = data?.data || {}
		
		ticketActuel.value      = payload.ticketActuel      || null
		prochains.value         = payload.prochains         || []
		tempsAttenteMoyen.value = payload.tempsAttenteMoyen ?? 15
		tempsProchain.value     = payload.tempsProchain     ?? 0
		nbEnAttente.value       = payload.nbEnAttente       ?? 0
		lastUpdate.value        = new Date()
		
		hasError.value     = false
		errorMessage.value = ''
	} catch (error) {
		console.error('❌ Erreur écran public :', error)
		hasError.value     = true
		errorMessage.value = 'Connexion au serveur perdue'
	} finally {
		isLoading.value    = false
		isRefreshing.value = false
	}
}

/* ============================================================
 * POLLING
 * ============================================================ */
let refreshInterval = null

function demarrerPolling() {
	arreterPolling()
	refreshInterval = setInterval(chargerEcran, 3000)
}

function arreterPolling() {
	if (refreshInterval) {
		clearInterval(refreshInterval)
		refreshInterval = null
	}
}

/* ============================================================
 * HORLOGE — INTERVAL
 * ============================================================ */
let clockInterval = null

/* ============================================================
 * VISIBILITÉ — Pause si onglet inactif
 * ============================================================ */
function onVisibilityChange() {
	if (document.hidden) {
		arreterPolling()
	} else {
		chargerEcran()
		demarrerPolling()
	}
}

/* ============================================================
 * VOCAL — Activation au premier clic
 * ============================================================ */
const hasInteracted = ref(false)

function demarrerKiosk() {
	hasInteracted.value = true
	
	/* --------------------------------------------------------
	 * Activer / débloquer Speech Synthesis après le clic utilisateur
	 * -------------------------------------------------------- */
	if ('speechSynthesis' in window) {
		window.speechSynthesis.cancel()
		
		const test = new SpeechSynthesisUtterance(' ')
		test.lang = 'fr-FR'
		test.volume = 0.01
		test.rate = 1
		
		window.speechSynthesis.speak(test)
		
		console.log('🔊 Speech Synthesis activé')
	} else {
		console.warn('⚠️ Speech Synthesis non disponible dans ce navigateur')
	}
	
	/* --------------------------------------------------------
	 * Charger immédiatement les données
	 * -------------------------------------------------------- */
	chargerEcran()
	
	/* --------------------------------------------------------
	 * Démarrer le polling
	 * -------------------------------------------------------- */
	demarrerPolling()
}

/* ============================================================
 * WATCH — Annonce vocale quand un ticket est appelé
 * ============================================================ */
const isFirstLoad = ref(true)

watch(
	() => ({
		id_ticket: ticketActuel.value?.id_ticket,
		statut_ticket: ticketActuel.value?.statut_ticket,
		heure_appel: ticketActuel.value?.heure_appel
	}),
	(nouveau, ancien) => {
		
		/* --------------------------------------------------------
		 * Premier chargement :
		 * on affiche le ticket mais on ne l'annonce pas.
		 * -------------------------------------------------------- */
		if (isFirstLoad.value) {
			isFirstLoad.value = false
			return
		}
		
		/* --------------------------------------------------------
		 * Aucun ticket
		 * -------------------------------------------------------- */
		if (!nouveau?.id_ticket) {
			return
		}
		
		/* --------------------------------------------------------
		 * Le ticket doit être APPELE
		 * -------------------------------------------------------- */
		if (nouveau.statut_ticket !== 'APPELE') {
			return
		}
		
		/* --------------------------------------------------------
		 * Détecter un nouvel appel
		 *
		 * Cas 1 : nouveau ticket
		 * Cas 2 : même ticket mais nouvelle heure d'appel
		 * -------------------------------------------------------- */
		const nouveauTicket =
		nouveau.id_ticket !== ancien?.id_ticket
		
		const nouvelAppel =
		nouveau.heure_appel !== ancien?.heure_appel
		
		if (!nouveauTicket && !nouvelAppel) {
			return
		}
		
		/* --------------------------------------------------------
		 * Récupérer le ticket complet
		 * -------------------------------------------------------- */
		const ticket = ticketActuel.value
		
		if (!ticket) {
			return
		}
		
		console.log('🔊 Nouvel appel détecté :', {
			id_ticket: ticket.id_ticket,
			numero_ticket: ticket.numero_ticket,
			numero_guichet: ticket.numero_guichet,
			statut_ticket: ticket.statut_ticket,
			heure_appel: ticket.heure_appel
		})
		
		/* --------------------------------------------------------
		 * Annonce vocale
		 * -------------------------------------------------------- */
		annoncerTicket(
			ticket.numero_ticket,
			ticket.numero_guichet
		)
	},
	{
		deep: false
	}
)

/* ============================================================
 * HELPERS
 * ============================================================ */
function formatHeure(iso) {
	if (!iso) return '—'
		try {
			return new Date(iso).toLocaleTimeString('fr-FR', {
				hour: '2-digit',
				minute: '2-digit'
			})
		} catch { return '—' }
}

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(() => {
	updateClock()
	chargerEcran()
	
	clockInterval = setInterval(updateClock, 1000)
	demarrerPolling()
	
	document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
	if (clockInterval) clearInterval(clockInterval)
		arreterPolling()
		document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
<!-- ============================================================
* OVERLAY DE DÉMARRAGE (pour activer le son)
* ============================================================ -->
<div
v-if="!hasInteracted"
class="fixed inset-0 z-50 bg-[#041b38] flex flex-col items-center justify-center gap-6"
>
<div class="flex items-center gap-6 mb-8">
<div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
<svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 18l10-5-5-2.5-5 2.5z"/>
</svg>
</div>
<div>
<p class="text-cyan-400 uppercase tracking-[0.3em] font-bold text-sm">
Direction Générale des Impôts
</p>
<h1 class="text-4xl font-black text-white mt-1">
Centre Fiscal de Manakara
</h1>
</div>
</div>

<button
@click="demarrerKiosk"
class="px-10 py-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-2xl font-black hover:scale-105 transition shadow-2xl shadow-cyan-500/40"
>
📺 Démarrer l'écran
</button>

<p class="text-white/50 text-center text-sm max-w-md">
Un clic est nécessaire pour activer le son et le temps réel
</p>
</div>

<!-- ============================================================
* ÉCRAN KIOSK
* ============================================================ -->
<div class="kiosk-root flex flex-col h-screen bg-[#041b38] text-white font-sans overflow-hidden">

<!-- ============================================================
* LISERÉ SUPÉRIEUR
* ============================================================ -->
<div class="h-[0.4vh] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>

<!-- ============================================================
* HEADER
* ============================================================ -->
<header
class="flex justify-between items-start border-b border-white/20"
style="padding: 1.5vh 2.5vw 1vh 2.5vw;"
>
<!-- Logo + titre -->
<div class="flex items-center" style="gap: 1.5vw;">
<svg
class="text-white"
:style="{ width: 'clamp(2rem, 2.5vw, 3rem)', height: 'clamp(2rem, 2.5vw, 3rem)' }"
fill="currentColor" viewBox="0 0 24 24"
>
<path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 18l10-5-5-2.5-5 2.5z"/>
</svg>
<div class="w-px bg-white/40" style="height: 4vh;"></div>
<h1
class="font-bold tracking-widest"
style="font-size: clamp(1.2rem, 1.8vw, 2rem);"
>
FILE D'ATTENTE — IMPÔTS MANAKARA
</h1>
</div>

<!-- Horloge -->
<div class="text-right">
<p
class="font-light tabular-nums"
style="font-size: clamp(1.5rem, 2.2vw, 2.8rem);"
>
{{ currentTime }}
</p>
<p
class="text-blue-300 capitalize mt-1"
style="font-size: clamp(0.7rem, 0.9vw, 1rem);"
>
{{ currentDate }}
</p>
</div>
</header>

<!-- ============================================================
* CONTENU PRINCIPAL
* ============================================================ -->
<main
class="flex-1 flex min-h-0"
style="gap: 2.5vw; padding: 2vh 2.5vw;"
>

<!-- ============================================================
* COLONNE GAUCHE — Ticket + Prochains
* ============================================================ -->
<div class="flex-1 flex flex-col min-w-0">

<!-- ============ TICKET ACTUEL ============ -->
<div class="flex-1 flex flex-col items-center justify-center min-h-0">

<!-- Titre -->
<div class="flex items-center w-full" style="gap: 1.5vw; margin-bottom: 2vh;">
<div class="flex-1 h-px bg-white/40"></div>
<h2
class="font-semibold tracking-[0.3em] text-blue-200 whitespace-nowrap"
style="font-size: clamp(0.8rem, 1vw, 1.3rem);"
>
TICKET EN COURS D'APPEL
</h2>
<div class="flex-1 h-px bg-white/40"></div>
</div>

<!-- Loading -->
<div v-if="isLoading" class="flex flex-col items-center" style="gap: 2vh;">
<div
class="rounded-3xl bg-white/5 animate-pulse"
style="width: 40vw; max-width: 500px; height: 20vh;"
></div>
<div
class="rounded-2xl bg-white/5 animate-pulse"
style="width: 25vw; max-width: 300px; height: 10vh;"
></div>
</div>

<!-- Erreur -->
<div v-else-if="hasError" class="text-center">
<svg
class="mx-auto text-red-400/60"
:style="{ width: 'clamp(2rem, 3vw, 3.5rem)', height: 'clamp(2rem, 3vw, 3.5rem)', marginBottom: '1.5vh' }"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>
<p class="text-red-300/80" style="font-size: clamp(1rem, 1.3vw, 1.4rem);">
Connexion perdue
</p>
</div>

<!-- Aucun ticket -->
<div v-else-if="!ticketActuel" class="text-center">
<p
class="font-black text-white/20"
style="font-size: clamp(4rem, 8vw, 8rem); line-height: 1;"
>
—
</p>
<p
class="text-white/50"
style="font-size: clamp(1rem, 1.3vw, 1.4rem); margin-top: 3vh;"
>
Aucun ticket appelé
</p>
<p
class="text-white/30"
style="font-size: clamp(0.75rem, 0.9vw, 1rem); margin-top: 1vh;"
>
En attente du prochain appel…
</p>
</div>

<!-- Ticket actif -->
<div v-else class="text-center">
<!-- Numéro -->
<div class="relative inline-block">
<div class="absolute inset-0 bg-cyan-500/30 blur-3xl rounded-full animate-pulse"></div>
<p
class="relative font-black text-white tracking-tighter leading-none"
style="font-size: clamp(4.5rem, 11vw, 12rem);"
>
{{ ticketActuel.numero_ticket }}
</p>
</div>

<!-- Guichet -->
<div
class="inline-flex items-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/40"
style="
margin-top: 3vh;
gap: 1.5vw;
padding: clamp(0.8rem, 1.2vh, 1.5rem) clamp(1.2rem, 2vw, 2.5rem);
"
>
<svg
class="text-white shrink-0"
:style="{ width: 'clamp(1.2rem, 2vw, 2.5rem)', height: 'clamp(1.2rem, 2vw, 2.5rem)' }"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
<div class="text-left">
<p
class="uppercase tracking-[0.2em] text-white/70 font-bold"
style="font-size: clamp(0.55rem, 0.7vw, 0.85rem);"
>
Présentez-vous au
</p>
<p
class="font-black text-white leading-none"
style="font-size: clamp(1.5rem, 2.8vw, 3.2rem);"
>
Guichet {{ ticketActuel.numero_guichet || '—' }}
</p>
</div>
</div>

<!-- Service -->
<p
v-if="ticketActuel.libelle_service"
class="text-cyan-300 font-medium"
style="font-size: clamp(0.9rem, 1.2vw, 1.3rem); margin-top: 3vh;"
>
{{ ticketActuel.libelle_service }}
</p>
</div>
</div>

<!-- ============ PROCHAINS TICKETS ============ -->
<!-- ============ PROCHAINS TICKETS ============ -->
<div class="prochains-section" style="margin-top: 2.5vh;">

<!-- Titre -->
<div class="flex items-center justify-between" style="margin-bottom: 1.5vh;">
<div class="flex items-center" style="gap: 0.8vw;">
<span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
<p
class="uppercase tracking-[0.25em] text-cyan-400 font-bold"
style="font-size: clamp(0.65rem, 0.8vw, 0.95rem);"
>
Prochains tickets
</p>
</div>
<span
class="text-white/40 tabular-nums"
style="font-size: clamp(0.6rem, 0.75vw, 0.85rem);"
>
{{ prochains.length }} en attente
</span>
</div>

<!-- Loading -->
<div v-if="isLoading" class="prochains-grid">
<div
v-for="n in 6"
:key="n"
class="rounded-2xl bg-white/5 animate-pulse"
style="height: 10vh; min-height: 70px;"
></div>
</div>

<!-- Vide -->
<div
v-else-if="!prochains.length"
class="rounded-2xl border border-dashed border-white/10 text-center"
style="padding: 3vh 0;"
>
<p class="text-white/40" style="font-size: clamp(0.8rem, 1vw, 1rem);">
Aucun ticket en attente
</p>
</div>

<!-- Liste responsive -->
<div v-else class="prochains-grid">
<div
v-for="(t, i) in prochains"
:key="t.numero_ticket"
class="prochain-card rounded-2xl bg-white/5 border border-white/10 backdrop-blur text-center
hover:bg-white/10 hover:border-cyan-400/30 transition-all"
>
<p class="font-black text-white tabular-nums leading-none prochain-numero">
{{ t.numero_ticket }}
</p>
<p class="uppercase tracking-wider text-cyan-400/80 font-bold truncate prochain-service">
{{ t.libelle_service || 'Service' }}
</p>
</div>
</div>
</div>
</div>

<!-- ============================================================
* COLONNE DROITE — Temps d'attente
* ============================================================ -->
<div class="flex items-center justify-center shrink-0">
<div
class="rounded-3xl bg-white/5 border border-white/10 backdrop-blur text-center"
style="
width: clamp(16rem, 20vw, 24rem);
padding: clamp(1.5rem, 2.5vh, 2.5rem);
"
>
<!-- Titre -->
<div class="flex items-center justify-center" style="gap: 0.5vw; margin-bottom: 2vh;">
<svg
class="text-cyan-400"
:style="{ width: 'clamp(0.8rem, 0.9vw, 1.1rem)', height: 'clamp(0.8rem, 0.9vw, 1.1rem)' }"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p
class="uppercase tracking-[0.25em] text-cyan-400 font-bold"
style="font-size: clamp(0.6rem, 0.75vw, 0.85rem);"
>
Temps d'attente
</p>
</div>

<!-- Loading -->
<div v-if="isLoading" class="py-6">
<div
class="mx-auto rounded-2xl bg-white/5 animate-pulse"
style="width: 40%; height: 12vh;"
></div>
</div>

<!-- Temps -->
<template v-else>
<div style="margin-bottom: 2.5vh;">
<p
class="font-black text-white leading-none tabular-nums"
style="font-size: clamp(2.5rem, 5vw, 5rem);"
>
{{ tempsAttenteMoyen }}
</p>
<p
class="text-white/50"
style="font-size: clamp(0.7rem, 0.85vw, 0.95rem); margin-top: 1vh;"
>
minutes en moyenne
</p>
</div>

<!-- Détails -->
<div class="border-t border-white/10" style="padding-top: 2.5vh;">
<div class="flex justify-between items-center" style="margin-bottom: 1.5vh;">
<span class="text-white/50" style="font-size: clamp(0.7rem, 0.85vw, 0.95rem);">
Personnes en attente
</span>
<span
class="font-black text-white tabular-nums"
style="font-size: clamp(1.2rem, 1.6vw, 1.8rem);"
>
{{ nbEnAttente }}
</span>
</div>
<div class="flex justify-between items-center">
<span class="text-white/50" style="font-size: clamp(0.7rem, 0.85vw, 0.95rem);">
Prochain ~
</span>
<span
class="font-black text-cyan-300 tabular-nums"
style="font-size: clamp(1.2rem, 1.6vw, 1.8rem);"
>
{{ tempsProchain }} min
</span>
</div>
</div>
</template>
</div>
</div>
</main>

<!-- ============================================================
* FOOTER
* ============================================================ -->
<footer
class="bg-[#031022] border-t border-white/10 flex justify-between items-center"
style="padding: 1.5vh 2.5vw; gap: 1.5vw;"
>
<!-- Message -->
<div class="flex items-center" style="gap: 1vw;">
<div
class="rounded-full border border-white/60 flex items-center justify-center font-bold shrink-0"
style="
width: clamp(1.5rem, 1.8vw, 2rem);
height: clamp(1.5rem, 1.8vw, 2rem);
font-size: clamp(0.7rem, 0.85vw, 0.95rem);
"
>
i
</div>
<p
class="text-white/80"
style="font-size: clamp(0.75rem, 0.9vw, 1rem);"
>
Merci de vous présenter au guichet lorsque votre ticket est appelé.
</p>
</div>

<!-- Statut + horloge -->
<div class="flex items-center" style="gap: 1.5vw;">

<!-- Statut connexion -->
<div v-if="hasError" class="flex items-center text-red-400 font-semibold" style="gap: 0.5vw;">
<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
<span style="font-size: clamp(0.65rem, 0.8vw, 0.9rem);">
{{ errorMessage || 'Erreur' }}
</span>
</div>

<div v-else class="flex items-center text-emerald-400 font-semibold" style="gap: 0.5vw;">
<span :class="[
'w-2 h-2 rounded-full bg-emerald-500',
isRefreshing ? 'animate-ping' : 'animate-pulse'
]"></span>
<span style="font-size: clamp(0.65rem, 0.8vw, 0.9rem);">
{{ isRefreshing ? 'Actualisation…' : 'En direct' }}
</span>
</div>

<span class="text-white/20">|</span>

<!-- Dernière MAJ -->
<p
v-if="lastUpdate"
class="text-white/40 tabular-nums"
style="font-size: clamp(0.6rem, 0.75vw, 0.85rem);"
>
Actualisé {{ formatHeure(lastUpdate) }}
</p>
</div>
</footer>
</div>
</template>

<style scoped>
.kiosk-root {
	font-size: clamp(12px, 0.8vw + 0.4vh, 18px);
}

/* ========== GRILLE PROCHAINS TICKETS ========== */
.prochains-grid {
	display: grid;
	gap: clamp(0.5rem, 0.8vw, 1rem);
	/* Par défaut : 2 colonnes (petits écrans / tablettes) */
	grid-template-columns: repeat(2, 1fr);
}

/* ≥ 640px → 3 colonnes */
@media (min-width: 640px) {
	.prochains-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

/* ≥ 900px → 4 colonnes */
@media (min-width: 900px) {
	.prochains-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

/* ≥ 1200px → 5 colonnes */
@media (min-width: 1200px) {
	.prochains-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

/* ≥ 1536px (grands écrans kiosk) → 6 colonnes */
@media (min-width: 1536px) {
	.prochains-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}

/* Carte individuelle */
.prochain-card {
	padding: clamp(0.6rem, 0.9vw, 1.1rem);
	min-height: 70px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.prochain-numero {
	font-size: clamp(1.1rem, 1.8vw, 2.2rem);
}

.prochain-service {
	font-size: clamp(0.5rem, 0.65vw, 0.75rem);
	margin-top: 0.6vh;
	max-width: 100%;
}

/* ========== LAYOUT PRINCIPAL RESPONSIVE ========== */
main {
	flex-direction: column; /* mobile / tablette : empilé */
}

@media (min-width: 1024px) {
	main {
		flex-direction: row; /* desktop / kiosk : côte à côte */
	}
}

/* Colonne droite (temps d'attente) sur petit écran */
@media (max-width: 1023px) {
	main > div:last-child {
		width: 100%;
		margin-top: 2vh;
	}
	
	main > div:last-child > div {
		width: 100% !important;
		max-width: 100%;
	}
}
</style>
