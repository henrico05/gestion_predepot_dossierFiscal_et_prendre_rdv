<template>
<div class="appointment-page" :data-page="currentPage">

<!-- ========================================================= -->
<!-- HEADER STICKY                                              -->
<!-- ========================================================= -->
<header class="page-header">
<div class="header-left">
<h1>Prise de rendez-vous</h1>
<p>Espace Agent · Guichet</p>
</div>

<div class="ref-chip" v-if="selectedDate && selectedTime">
<span>Créneau retenu</span>
<strong>{{ formatShortDate(selectedDate) }} · {{ selectedTime }}</strong>
</div>
</header>

<!-- ========================================================= -->
<!-- STEPPER VISUEL                                             -->
<!-- ========================================================= -->
<div class="stepper">
<div 
v-for="(step, i) in steps" 
:key="step.id"
class="step"
:class="{ 
active: currentStepIndex === i, 
done: currentStepIndex > i,
clickable: currentStepIndex > i
}"
@click="currentStepIndex > i && goToStep(i)"
>
<div class="step-circle">
<svg v-if="currentStepIndex > i" viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<span v-else>{{ i + 1 }}</span>
</div>
<span class="step-label">{{ step.label }}</span>
</div>
</div>

<!-- ========================================================= -->
<!-- CONTENU PRINCIPAL                                          -->
<!-- ========================================================= -->
<div class="content-wrapper">
<div class="main-col">

<!-- ================= ÉTAPE 1 : IDENTIFICATION ================= -->
<transition name="slide-fade" mode="out-in">
<section v-if="currentStepIndex === 0" key="ident" class="card-section">
<div class="section-head">
<h2>Identification du contribuable</h2>
<p class="section-sub">Recherchez par NIF ou créez un nouveau compte.</p>
</div>

<div class="stack">
<!-- Barre de recherche -->
<div class="search-row">
<div class="search-input-wrap">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="nifSearch"
type="text"
placeholder="Rechercher par NIF…"
class="input-base"
@keyup.enter="searchContribuable"
>
</div>
<button 
type="button" 
class="btn-dark" 
@click="searchContribuable"
:disabled="isLoading"
>
Rechercher
</button>
</div>

<!-- Contribuable trouvé -->
<div v-if="foundContribuable" class="alert alert-success">
<div>
<p class="alert-title">{{ foundContribuable.nom_raison_sociale }}</p>
<p class="alert-meta">NIF : {{ foundContribuable.nif }} · Tél : {{ foundContribuable.telephone }}</p>
</div>
<button type="button" class="link-btn" @click="selectFoundContribuable">Sélectionner</button>
</div>

<!-- Contribuable sélectionné -->
<div v-if="selectedContribuable" class="alert alert-info">
<div>
<p class="alert-title">{{ selectedContribuable.nom_raison_sociale }}</p>
<p class="alert-meta">NIF : {{ selectedContribuable.nif }} · Tél : {{ selectedContribuable.telephone }}</p>
</div>
<button type="button" class="link-btn" @click="selectedContribuable = null">Changer</button>
</div>

<!-- Création rapide -->
<div v-if="!foundContribuable && !selectedContribuable" class="alert alert-warn">
<div class="alert-warn-head">
<span class="alert-warn-icon">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>
</span>
<div>
<p class="alert-title">Contribuable non trouvé ?</p>
<p class="alert-meta">L'agent peut créer rapidement son compte pour poursuivre la prise de rendez-vous.</p>
</div>
</div>

<div class="contribuable-form-grid">
<input v-model.trim="newContribuable.nif" placeholder="NIF *" class="input-base" />
<input v-model.trim="newContribuable.nom_raison_sociale" placeholder="Nom / Raison sociale *" class="input-base" />
<input v-model.trim="newContribuable.prenom" placeholder="Prénom" class="input-base" />
<input v-model.trim="newContribuable.email" placeholder="Email (facultatif)" type="email" class="input-base" />
<input v-model.trim="newContribuable.telephone" placeholder="Téléphone (facultatif)" type="tel" class="input-base" />
<input v-model.trim="newContribuable.adresse" placeholder="Adresse (facultatif)" class="input-base" />
<select v-model="newContribuable.type_contribuable" class="input-base">
<option v-for="type in typeContribuableOptions" :key="type" :value="type">
{{ type === 'PERSONNE_PHYSIQUE' ? 'Personne physique' : 'Société' }}
</option>
</select>
</div>

<div class="contribuable-form-actions">
<button
type="button"
class="btn-primary"
:disabled="isLoading"
@click="createContribuable"
>
<span v-if="isLoading" class="spinner-sm"></span>
{{ isLoading ? 'Création…' : 'Créer le contribuable' }}
</button>
</div>
</div>
</div>

<!-- Navigation -->
<div class="step-nav">
<button 
type="button" 
class="btn-next" 
@click="nextStep" 
:disabled="!selectedContribuable"
>
Continuer
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</button>
</div>
</section>

<!-- ================= ÉTAPE 2 : SERVICE ================= -->
<section v-else-if="currentStepIndex === 1" key="service" class="card-section">
<div class="section-head">
<h2>Service demandé</h2>
<p class="section-sub">Choisissez le service fiscal concerné par ce rendez-vous.</p>
</div>

<div class="field">
<label for="service">Service fiscal</label>
<select id="service" v-model="selectedService" class="input-base">
<option :value="null" disabled>Sélectionnez un service…</option>
<option v-for="service in services" :key="service.id_service" :value="service">
{{ service.libelle_service }} · {{ service.duree_estimee_min }} min
</option>
</select>
</div>

<!-- Pièces requises (aperçu) -->
<div v-if="selectedService && requiredPieces.length" class="required-pieces-box">
<div class="required-pieces-header">
<div>
<h4 class="required-pieces-title">Documents à prévoir</h4>
<p class="required-pieces-subtitle">Le contribuable devra apporter ces pièces</p>
</div>
<span class="pieces-count">{{ requiredPieces.length }}</span>
</div>

<div class="pieces-list">
<div v-for="piece in requiredPieces" :key="piece.id_type_piece" class="required-piece-item">
<div class="piece-check">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
</div>
<div class="piece-info">
<span class="piece-name">{{ piece.libelle }}</span>
<span v-if="piece.description" class="piece-description">{{ piece.description }}</span>
</div>
<span v-if="piece.obligatoire" class="piece-required-badge">Obligatoire</span>
<span v-else class="piece-optional-badge">Facultatif</span>
</div>
</div>
</div>

<div class="step-nav">
<button type="button" class="btn-ghost" @click="prevStep">Retour</button>
<button 
type="button" 
class="btn-next" 
@click="nextStep" 
:disabled="!selectedService"
>
Continuer
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</button>
</div>
</section>

<!-- ================= ÉTAPE 3 : CRÉNEAU ================= -->
<section v-else key="slot" class="card-section">
<div class="section-head">
<h2>Créneau horaire</h2>
<p class="section-sub">Cliquez une case verte · GMT+3 · Lun. – Ven.</p>
</div>

<div class="slots-block">
<!-- Toolbar -->
<div class="week-toolbar">
<button type="button" class="icon-btn" @click="shiftWeek(-1)" aria-label="Semaine précédente">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
</button>
<div class="week-label">
<strong>{{ weekLabel }}</strong>
<button v-if="!isCurrentWeek" type="button" class="link-btn" @click="goToThisWeek">Cette semaine</button>
</div>
<button type="button" class="icon-btn" @click="shiftWeek(1)" aria-label="Semaine suivante">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
</button>
</div>

<!-- Légende -->
<div class="legend">
<span><i class="dot available"></i> Disponible</span>
<span><i class="dot booked"></i> Réservé</span>
<span><i class="dot selected"></i> Sélectionné</span>
<span><i class="dot past"></i> Indisponible</span>
</div>

<!-- Tableau -->
<div class="slots-scroll">
<table class="slots-table">
<thead>
<tr>
<th class="time-col">Heure</th>
<th v-for="day in weekDays" :key="day.iso" :class="{ today: day.isToday }">
<span class="day-name">{{ day.short }}</span>
<span class="day-num">{{ day.dateNum }}</span>
<span v-if="day.isToday" class="today-pill">Aujourd'hui</span>
</th>
</tr>
</thead>
<tbody>
<template v-for="(group, gIndex) in slotGroups" :key="group.label">
<tr class="group-row">
<td :colspan="1 + weekDays.length">{{ group.label }}</td>
</tr>
<tr v-for="time in group.times" :key="`${selectedService?.id_service}-${time}`">
<th class="time-col" scope="row">{{ time }}</th>
<td
v-for="day in weekDays"
:key="day.iso + time"
:class="cellClass(day, time)"
>
<button
type="button"
class="slot-cell"
:disabled="!canSelect(day, time)"
@click.stop="selectSlot(day, time)"
>
<span class="slot-mark">{{ slotMark(day, time) }}</span>
</button>
</td>
</tr>
<tr v-if="gIndex === 0" class="pause-row">
<td :colspan="1 + weekDays.length">Pause déjeuner 12:00 – 13:00</td>
</tr>
</template>
</tbody>
</table>
</div>

<!-- Commentaire -->
<div class="field">
<label for="commentaire">Commentaire (facultatif)</label>
<textarea
id="commentaire"
v-model="commentaire"
rows="3"
placeholder="Précisez l'objet de la visite…"
class="input-base resize-none"
></textarea>
</div>

<!-- Créneau retenu -->
<transition name="fade">
<p v-if="selectedDate && selectedTime" class="slot-picked">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
Créneau retenu : <strong>{{ formatLongDate(selectedDate) }} à {{ selectedTime }}</strong>
</p>
</transition>
</div>

<div class="step-nav">
<button type="button" class="btn-ghost" @click="prevStep">Retour</button>
<button
type="button"
class="btn-confirm"
:disabled="isLoading || !canSubmit"
@click="createAppointment"
>
<span v-if="isLoading" class="spinner-sm"></span>
<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
{{ isLoading ? 'Création…' : 'Confirmer le rendez-vous' }}
</button>
</div>
</section>
</transition>
</div>

<!-- ================= RÉCAPITULATIF LATÉRAL ================= -->
<aside class="side-col">
<div class="summary-card">
<h3>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
Récapitulatif
</h3>

<dl class="summary-list">
<div>
<dt>Contribuable</dt>
<dd>{{ currentContribuable?.nom_raison_sociale || '—' }}</dd>
</div>
<div>
<dt>NIF</dt>
<dd>{{ currentContribuable?.nif || '—' }}</dd>
</div>
<div>
<dt>Service</dt>
<dd>{{ selectedService?.libelle_service || '—' }}</dd>
</div>
<div>
<dt>Date</dt>
<dd>{{ selectedDate ? formatShortDate(selectedDate) : '—' }}</dd>
</div>
<div>
<dt>Heure</dt>
<dd>{{ selectedTime || '—' }}</dd>
</div>
</dl>

<p class="secure-note">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
</svg>
Données sécurisées et confidentielles
</p>
</div>
</aside>
</div>
</div>
</template>

<script setup>
/* =========================================================
 * LE SCRIPT RESTE IDENTIQUE À VOTRE VERSION ORIGINALE
 * (Copiez-collez votre <script setup> existant ici)
 * ========================================================= */

import { ref, reactive, computed, onMounted, watch } from 'vue'
import gsap from 'gsap'
import api from '@/api/Axios'
import { useToast } from 'vue-toastification'
import { playSound } from '@/services/sonnerie'

const toast = useToast()

function getLocalIsoDate() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const todayIso = getLocalIsoDate()

const nifSearch = ref('')
const foundContribuable = ref(null)
const selectedContribuable = ref(null)

const typeContribuableOptions = ['PERSONNE_PHYSIQUE', 'SOCIETE']

const newContribuable = reactive({
	nif: '',
	nom_raison_sociale: '',
	prenom: '',
	email: '',
	telephone: '',
	adresse: '',
	type_contribuable: 'PERSONNE_PHYSIQUE'
})

/* ==================== STEPPER ==================== */
const currentStepIndex = ref(0)
const currentPage = computed(() => `step-${currentStepIndex.value}`)

const steps = [
	{ id: 'ident', label: 'Identification' },
{ id: 'service', label: 'Service' },
{ id: 'slot', label: 'Créneau' }
]

const goToStep = (i) => {
	if (i <= currentStepIndex.value) currentStepIndex.value = i
}

const nextStep = () => {
	if (currentStepIndex.value < steps.length - 1) currentStepIndex.value++
}

const prevStep = () => {
	if (currentStepIndex.value > 0) currentStepIndex.value--
}

/* ==================== SERVICES ==================== */
const services = ref([])

const loadServices = async () => {
	try {
		const response = await api.get('/services-fiscaux')
		if (response.data.success) {
			services.value = response.data.data
		} else {
			toast.error(response.data.message || 'Impossible de charger les services.')
		}
	} catch (error) {
		toast.error(error.response?.data?.message || 'Impossible de charger les services fiscaux.')
	}
}

/* ==================== CRÉATION CONTRIBUABLE ==================== */
const isLoading = ref(false)

const createContribuable = async () => {
	if (!newContribuable.nif) {
		playSound('warning')
		toast.warning('Le NIF est obligatoire.')
		return
	}
	if (!newContribuable.nom_raison_sociale) {
		playSound('warning')
		toast.warning('Le nom ou la raison sociale est obligatoire.')
		return
	}
	if (!newContribuable.prenom) {
		playSound('warning')
		toast.warning('Le prénom est obligatoire.')
		return
	}
	
	const contribuableData = {
		nif: newContribuable.nif.trim(),
		nom_raison_sociale: newContribuable.nom_raison_sociale.trim(),
		prenom: newContribuable.prenom.trim(),
		email: newContribuable.email?.trim() || null,
		telephone: newContribuable.telephone?.trim() || null,
		adresse: newContribuable.adresse?.trim() || null,
		type_contribuable: newContribuable.type_contribuable
	}
	
	isLoading.value = true
	
	try {
		const response = await api.post('/contribuables/register/by_agent', contribuableData)
		
		if (response.data.success && response.data.data) {
			selectedContribuable.value = response.data.data
			foundContribuable.value = null
			newContribuable.nif = ''
			newContribuable.nom_raison_sociale = ''
			newContribuable.prenom = ''
			newContribuable.email = ''
			newContribuable.telephone = ''
			newContribuable.adresse = ''
			newContribuable.type_contribuable = 'PERSONNE_PHYSIQUE'
			
			playSound('success')
			toast.success('Contribuable créé avec succès. Vous pouvez choisir le service.')
		} else {
			playSound('error')
			toast.error(response.data.message || 'Impossible de créer le contribuable.')
		}
	} catch (error) {
		if (error.response?.status === 409) {
			playSound('warning')
			toast.warning(error.response.data?.message || 'Un contribuable existe déjà avec ces informations.')
		} else if (error.response?.status === 400) {
			playSound('warning')
			toast.warning(error.response.data?.message || 'Les données envoyées sont invalides.')
		} else {
			playSound('error')
			toast.error(error.response?.data?.message || 'Erreur lors de la création du contribuable.')
		}
	} finally {
		isLoading.value = false
	}
}

/* ==================== SERVICE ==================== */
const selectedService = ref(null)
const selectedDate = ref('')
const selectedTime = ref('')
const commentaire = ref('')

/* ==================== PIÈCES ==================== */
const requiredPieces = ref([])
const isLoadingPieces = ref(false)
const piecesError = ref('')

const loadRequiredPieces = async () => {
	if (!selectedService.value?.id_service) {
		requiredPieces.value = []
		piecesError.value = ''
		return
	}
	
	const serviceId = selectedService.value.id_service
	isLoadingPieces.value = true
	piecesError.value = ''
	
	try {
		const response = await api.get(`/services-fiscaux/${serviceId}/pieces-requises`)
		
		if (!selectedService.value || selectedService.value.id_service !== serviceId) return
			
			if (!response.data.success) {
				throw new Error(response.data.message || 'Impossible de récupérer les pièces.')
			}
			
			requiredPieces.value = response.data.data || []
	} catch (error) {
		requiredPieces.value = []
		piecesError.value = error.response?.data?.message || error.message || 'Impossible de récupérer les pièces.'
	} finally {
		isLoadingPieces.value = false
	}
}

/* ==================== SUBMIT ==================== */
const canSubmit = computed(() => {
	return (
		!!selectedContribuable.value?.id_contribuable &&
		!!selectedService.value?.id_service &&
		!!selectedDate.value &&
		!!selectedTime.value
	)
})

const currentContribuable = computed(() => selectedContribuable.value)

/* ==================== DISPONIBILITÉS ==================== */
const disponibilites = ref({})

const loadDisponibilites = async (date) => {
	if (!selectedService.value || !date) return
		const serviceId = selectedService.value.id_service
		
		try {
			const response = await api.get('/rendez-vous/rdv/disponibilites', {
				params: { date, service: serviceId }
			})
			
			if (!selectedService.value || selectedService.value.id_service !== serviceId) return
				
				if (response.data.success) {
					const slots = response.data.data || []
					disponibilites.value[date] = {}
					slots.forEach(slot => {
						const heure = String(slot.heure).slice(0, 5)
						disponibilites.value[date][heure] = slot.disponible
					})
				}
		} catch (error) {
			console.error('❌ Erreur chargement disponibilités :', error)
		}
}

const loadWeekDisponibilites = async () => {
	if (!selectedService.value) return
		disponibilites.value = {}
		for (const day of weekDays.value) {
			if (day.isWeekend) continue
				await loadDisponibilites(day.iso)
		}
}

/* ==================== GÉNÉRATION DES CRÉNEAUX ==================== */
function generateTimes(startHour, startMinute, endHour, endMinute, duration) {
	const times = []
	if (!duration || duration <= 0) return times
		let currentMinutes = startHour * 60 + startMinute
		const endMinutes = endHour * 60 + endMinute
		while (currentMinutes + duration <= endMinutes) {
			const hours = Math.floor(currentMinutes / 60)
			const minutes = currentMinutes % 60
			times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)
			currentMinutes += duration
		}
		return times
}

const morningTimes = computed(() => {
	const duration = Number(selectedService.value?.duree_estimee_min || 30)
	return generateTimes(8, 0, 12, 0, duration)
})

const afternoonTimes = computed(() => {
	const duration = Number(selectedService.value?.duree_estimee_min || 30)
	return generateTimes(14, 0, 17, 0, duration)
})

const slotGroups = computed(() => [
	{ label: 'Matin', times: morningTimes.value },
	{ label: 'Après-midi', times: afternoonTimes.value }
])

/* ==================== SEMAINE ==================== */
function startOfWeek(date) {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	const day = d.getDay()
	const diff = day === 0 ? -6 : 1 - day
	d.setDate(d.getDate() + diff)
	return d
}

function toIso(date) {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

const weekStart = ref(startOfWeek(new Date()))

const weekDays = computed(() => {
	const days = []
	for (let i = 0; i < 5; i++) {
		const d = new Date(weekStart.value)
		d.setDate(weekStart.value.getDate() + i)
		const iso = toIso(d)
		days.push({
			date: d,
			iso,
			short: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
				  dateNum: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
				  isToday: iso === todayIso,
				  isWeekend: false,
				  isPast: iso < todayIso
		})
	}
	return days
})

const weekLabel = computed(() => {
	const start = weekDays.value[0]?.date
	const end = weekDays.value[4]?.date
	if (!start || !end) return ''
		const opts = { day: 'numeric', month: 'long' }
		return `${start.toLocaleDateString('fr-FR', opts)} — ${end.toLocaleDateString('fr-FR', { ...opts, year: 'numeric' })}`
})

const isCurrentWeek = computed(() => toIso(weekStart.value) === toIso(startOfWeek(new Date())))

/* ==================== HELPERS ==================== */
function isBooked(iso, time) {
	if (!selectedService.value) return true
		const disponibilite = disponibilites.value[iso]?.[time]
		if (disponibilite === undefined) return false
			return disponibilite === false
}

function isPastSlot(day, time) {
	if (day.iso < todayIso) return true
		if (day.iso > todayIso) return false
			const [hh, mm] = time.split(':').map(Number)
			const now = new Date()
			return hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes())
}

function canSelect(day, time) {
	return !day.isPast && !isPastSlot(day, time) && !isBooked(day.iso, time)
}

function isSelected(day, time) {
	return selectedDate.value === day.iso && selectedTime.value === time
}

function cellClass(day, time) {
	return {
		'is-today': day.isToday,
		'is-selected': isSelected(day, time),
		'is-booked': isBooked(day.iso, time),
		'is-past': isPastSlot(day, time),
		'is-free': canSelect(day, time)
	}
}

function slotMark(day, time) {
	if (isSelected(day, time)) return '✓'
		if (isBooked(day.iso, time)) return '×'
			if (isPastSlot(day, time)) return '·'
				return ''
}

function formatLongDate(iso) {
	if (!iso) return ''
		const [y, m, d] = iso.split('-').map(Number)
		return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
			weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
		})
}

function formatShortDate(iso) {
	if (!iso) return ''
		const [y, m, d] = iso.split('-').map(Number)
		return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
			day: '2-digit', month: 'short', year: 'numeric'
		})
}

function selectSlot(day, time) {
	if (!canSelect(day, time)) return
		if (isSelected(day, time)) {
			selectedDate.value = ''
			selectedTime.value = ''
			return
		}
		selectedDate.value = day.iso
		selectedTime.value = time
}

async function shiftWeek(dir) {
	const next = new Date(weekStart.value)
	next.setDate(next.getDate() + dir * 7)
	weekStart.value = next
	selectedDate.value = ''
	selectedTime.value = ''
	if (selectedService.value) await loadWeekDisponibilites()
}

async function goToThisWeek() {
	weekStart.value = startOfWeek(new Date())
	selectedDate.value = ''
	selectedTime.value = ''
	if (selectedService.value) await loadWeekDisponibilites()
}

/* ==================== WATCH SERVICE ==================== */
watch(
	() => selectedService.value?.id_service,
	  async (newServiceId, oldServiceId) => {
		  if (newServiceId === oldServiceId) return
			  selectedDate.value = ''
			  selectedTime.value = ''
			  disponibilites.value = {}
			  requiredPieces.value = []
			  piecesError.value = ''
			  if (!newServiceId) return
				  await Promise.all([loadWeekDisponibilites(), loadRequiredPieces()])
	  }
)

/* ==================== RECHERCHE CONTRIBUABLE ==================== */
function selectFoundContribuable() {
	selectedContribuable.value = foundContribuable.value
	foundContribuable.value = null
}

const searchContribuable = async () => {
	const nif = nifSearch.value.trim()
	foundContribuable.value = null
	selectedContribuable.value = null
	
	if (!nif) {
		playSound('warning')
		toast.warning('Veuillez saisir un NIF.')
		return
	}
	
	try {
		isLoading.value = true
		const response = await api.get(`/contribuables/nif/${encodeURIComponent(nif)}`)
		
		if (response.data.success && response.data.data) {
			foundContribuable.value = response.data.data
		} else {
			foundContribuable.value = null
			playSound('warning')
			toast.info('Aucun contribuable trouvé.')
		}
	} catch (error) {
		foundContribuable.value = null
		if (error.response?.status === 404) {
			newContribuable.nif = nif
			playSound('warning')
			toast.info('Aucun contribuable trouvé avec ce NIF.')
		} else {
			playSound('error')
			toast.error(error.response?.data?.message || 'Erreur lors de la recherche.')
		}
	} finally {
		isLoading.value = false
	}
}

/* ==================== CRÉATION RDV ==================== */
const createAppointment = async () => {
	if (!canSubmit.value) {
		playSound('warning')
		toast.warning('Veuillez sélectionner le contribuable, le service, la date et l\'heure.')
		return
	}
	
	isLoading.value = true
	
	try {
		const rdvPayload = {
			id_contribuable: selectedContribuable.value.id_contribuable,
			id_service: selectedService.value.id_service,
			date_rdv: selectedDate.value,
			heure_rdv: selectedTime.value,
			canal_creation: 'AGENT',
			commentaire: commentaire.value?.trim() || null
		}
		
		const response = await api.post('/rendez-vous', rdvPayload)
		
		if (response.data.success && response.data.data) {
			playSound('success')
			toast.success('Rendez-vous créé avec succès.')
			resetForm()
		} else {
			playSound('error')
			toast.error(response.data?.message || 'Le rendez-vous n\'a pas pu être créé.')
		}
	} catch (error) {
		if (error.response?.status === 409) {
			playSound('warning')
			toast.warning(error.response.data?.message || 'Ce créneau vient d\'être réservé.')
			if (selectedService.value) await loadWeekDisponibilites()
				selectedDate.value = ''
				selectedTime.value = ''
		} else if (error.response?.status === 400) {
			playSound('warning')
			toast.warning(error.response.data?.message || 'Les données sont invalides.')
		} else if (error.response?.status === 404) {
			playSound('warning')
			toast.warning(error.response.data?.message || 'Service introuvable.')
		} else {
			playSound('error')
			toast.error(error.response?.data?.message || 'Une erreur est survenue.')
		}
	} finally {
		isLoading.value = false
	}
}

/* ==================== RESET ==================== */
const resetForm = () => {
	selectedContribuable.value = null
	foundContribuable.value = null
	nifSearch.value = ''
	newContribuable.nif = ''
	newContribuable.nom_raison_sociale = ''
	newContribuable.prenom = ''
	newContribuable.email = ''
	newContribuable.telephone = ''
	newContribuable.adresse = ''
	newContribuable.type_contribuable = 'PERSONNE_PHYSIQUE'
	selectedService.value = null
	selectedDate.value = ''
	selectedTime.value = ''
	commentaire.value = ''
	disponibilites.value = {}
	currentStepIndex.value = 0
}

/* ==================== MOUNT ==================== */
onMounted(async () => {
	await loadServices()
	gsap.from('.card-section, .summary-card', {
		y: 24,
		opacity: 0,
		duration: 0.6,
		stagger: 0.12,
		ease: 'power3.out'
	})
})
</script>

<style scoped>
/* ========================================================= */
/* VARIABLES & BASE                                          */
/* ========================================================= */
.appointment-page {
	container-type: inline-size;
	container-name: rdv;
	width: 100%;
	min-height: 100vh;
	background: var(--bg);
	color: var(--text);
	font-family: Inter, system-ui, sans-serif;
	overflow-x: hidden;
}
.appointment-page *, .appointment-page *::before, .appointment-page *::after { box-sizing: border-box; }

/* ========================================================= */
/* HEADER                                                    */
/* ========================================================= */
.page-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
	padding: clamp(16px, 3cqi, 28px) clamp(16px, 3cqi, 32px);
	background: var(--card);
	border-bottom: 1px solid var(--border);
}
.header-left h1 {
	margin: 0;
	font-size: clamp(18px, 2.5cqi, 22px);
	font-weight: 800;
}
.header-left p {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--text-muted);
}
.ref-chip {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 2px;
	padding: 8px 14px;
	border-radius: 10px;
	background: var(--hover);
	border: 1px solid var(--border);
}
.ref-chip span {
	font-size: 10px;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: .04em;
}
.ref-chip strong {
	font-size: 13px;
	color: var(--text);
}

/* ========================================================= */
/* STEPPER                                                   */
/* ========================================================= */
.stepper {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	padding: 20px clamp(16px, 3cqi, 32px);
	background: var(--card);
	border-bottom: 1px solid var(--border);
	overflow-x: auto;
}
.step {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	flex: 1;
	min-width: 80px;
	cursor: default;
	transition: opacity .3s;
}
.step.clickable { cursor: pointer; }
.step.clickable:hover .step-circle { transform: scale(1.08); }
.step-circle {
	width: 34px; height: 34px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	background: var(--hover);
	border: 2px solid var(--border);
	color: var(--text-muted);
	font-size: 13px;
	font-weight: 700;
	transition: all .3s;
}
.step-circle svg { width: 16px; height: 16px; }
.step.active .step-circle {
	background: var(--primary);
	border-color: var(--primary);
	color: #fff;
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 20%, transparent);
}
.step.done .step-circle {
	background: #10b981;
	border-color: #10b981;
	color: #fff;
}
.step-label {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: .04em;
}
.step.active .step-label { color: var(--primary); }

/* ========================================================= */
/* CONTENU                                                   */
/* ========================================================= */
.content-wrapper {
	width: 100%;
	padding: clamp(16px, 3cqi, 28px);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 20px;
	align-items: start;
}
.main-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.side-col { min-width: 0; }

/* ========================================================= */
/* CARTES                                                    */
/* ========================================================= */
.card-section, .summary-card {
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 14px;
	padding: clamp(18px, 2.5cqi, 26px);
	box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
}
.section-head { margin-bottom: 18px; }
.section-head h2 {
	margin: 0;
	font-size: clamp(15px, 2cqi, 17px);
	font-weight: 700;
}
.section-sub {
	margin: 4px 0 0;
	font-size: 12.5px;
	color: var(--text-muted);
}

/* ========================================================= */
/* FORMULAIRES                                               */
/* ========================================================= */
.stack { display: flex; flex-direction: column; gap: 14px; }
.search-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}
.search-input-wrap {
	position: relative;
	flex: 1 1 240px;
}
.search-input-wrap svg {
	position: absolute;
	left: 14px;
	top: 50%;
	transform: translateY(-50%);
	width: 16px;
	height: 16px;
	color: var(--text-muted);
	pointer-events: none;
}
.search-input-wrap input { padding-left: 42px !important; }

.input-base {
	width: 100%;
	padding: 12px 14px;
	border-radius: 10px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	font-size: 14px;
	outline: none;
	transition: all .2s;
}
.input-base:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
.resize-none { resize: none; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; }

/* ========================================================= */
/* BOUTONS                                                   */
/* ========================================================= */
.btn-dark, .btn-primary, .btn-next, .btn-ghost, .btn-confirm {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 0;
	cursor: pointer;
	font-weight: 700;
	transition: all .2s;
}
.btn-dark {
	background: var(--titlebar);
	color: #fff;
	padding: 12px 20px;
	border-radius: 10px;
	font-size: 13.5px;
	white-space: nowrap;
}
.btn-dark:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-dark:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
	background: var(--primary);
	color: #fff;
	padding: 12px 20px;
	border-radius: 10px;
	font-size: 13.5px;
	box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-next {
	background: var(--primary);
	color: #fff;
	padding: 12px 20px;
	border-radius: 10px;
	font-size: 13.5px;
	margin-left: auto;
}
.btn-next:hover:not(:disabled) { opacity: 0.9; transform: translateX(2px); }
.btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-next svg { width: 16px; height: 16px; }

.btn-ghost {
	background: transparent;
	color: var(--text-muted);
	padding: 12px 16px;
	border-radius: 10px;
	font-size: 13px;
	border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--hover); color: var(--text); }

.btn-confirm {
	background: var(--titlebar);
	color: #fff;
	padding: 13px 22px;
	border-radius: 10px;
	font-size: 14px;
}
.btn-confirm:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-confirm svg { width: 18px; height: 18px; }

.step-nav {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-top: 24px;
	padding-top: 20px;
	border-top: 1px solid var(--border);
}

/* ========================================================= */
/* ALERTES                                                   */
/* ========================================================= */
.alert {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
	padding: 14px;
	border-radius: 10px;
	border: 1px solid var(--border);
}
.alert-success {
	background: color-mix(in srgb, #10b981 12%, var(--card));
	border-color: color-mix(in srgb, #10b981 35%, var(--border));
}
.alert-info {
	background: color-mix(in srgb, var(--primary) 10%, var(--card));
	border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}
.alert-warn {
	background: var(--bgListCard);
	border-color: var(--borderListCard);
	flex-direction: column;
}
.alert-warn-head {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}
.alert-warn-icon {
	width: 36px; height: 36px;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	border-radius: 10px;
	background: color-mix(in srgb, var(--textListCard) 15%, transparent);
	color: var(--textListCard);
}
.alert-warn-icon svg { width: 18px; height: 18px; }
.alert-title {
	margin: 0;
	font-size: 14px;
	font-weight: 700;
	color: var(--text);
}
.alert-warn .alert-title { color: var(--textListCard); }
.alert-meta {
	margin: 4px 0 0;
	font-size: 12px;
	color: var(--text-muted);
}
.link-btn {
	border: 0;
	background: none;
	color: var(--primary);
	font-size: 12.5px;
	font-weight: 700;
	cursor: pointer;
	white-space: nowrap;
}
.link-btn:hover { text-decoration: underline; }

/* ========================================================= */
/* FORMULAIRE CONTRIBUABLE                                   */
/* ========================================================= */
.contribuable-form-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
}
.contribuable-form-grid .input-base { min-width: 0; }
.contribuable-form-actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 14px;
}

/* ========================================================= */
/* PIÈCES                                                    */
/* ========================================================= */
.required-pieces-box {
	margin-top: 20px;
	border: 1px solid var(--border);
	border-radius: 12px;
	overflow: hidden;
	background: var(--card);
}
.required-pieces-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 12px 14px;
	background: var(--hover);
	border-bottom: 1px solid var(--border);
}
.required-pieces-title {
	margin: 0;
	font-size: 13px;
	font-weight: 800;
}
.required-pieces-subtitle {
	margin: 3px 0 0;
	font-size: 10.5px;
	color: var(--text-muted);
}
.pieces-count {
	flex-shrink: 0;
	padding: 4px 10px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--primary) 12%, transparent);
	color: var(--primary);
	font-size: 11px;
	font-weight: 800;
}
.pieces-list { display: flex; flex-direction: column; }
.required-piece-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border-bottom: 1px solid var(--border);
}
.required-piece-item:last-child { border-bottom: none; }
.piece-check {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	border-radius: 6px;
	background: color-mix(in srgb, #10b981 14%, transparent);
	color: #10b981;
}
.piece-check svg { width: 14px; height: 14px; }
.piece-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.piece-name { font-size: 12px; font-weight: 700; line-height: 1.3; }
.piece-description { font-size: 10.5px; line-height: 1.35; color: var(--text-muted); }
.piece-required-badge, .piece-optional-badge {
	flex-shrink: 0;
	font-size: 9.5px;
	font-weight: 700;
	padding: 3px 8px;
	border-radius: 999px;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.piece-required-badge {
	background: color-mix(in srgb, #ef4444 10%, transparent);
	color: #ef4444;
}
.piece-optional-badge {
	background: color-mix(in srgb, var(--primary) 10%, transparent);
	color: var(--primary);
}

/* ========================================================= */
/* CRÉNEAUX                                                  */
/* ========================================================= */
.slots-block { display: flex; flex-direction: column; gap: 14px; }
.week-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}
.week-label {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	text-align: center;
}
.week-label strong {
	font-size: 14px;
	font-weight: 700;
	text-transform: capitalize;
}
.icon-btn {
	width: 38px;
	height: 38px;
	display: grid;
	place-items: center;
	border-radius: 10px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	cursor: pointer;
	transition: all .2s;
}
.icon-btn:hover { background: var(--hover); }
.icon-btn svg { width: 18px; height: 18px; }

.legend {
	display: flex;
	flex-wrap: wrap;
	gap: 10px 16px;
	font-size: 12px;
	color: var(--text-muted);
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--hover);
}
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.dot.available { background: #10b981; }
.dot.booked { background: #ef4444; }
.dot.selected { background: var(--primary); }
.dot.past { background: color-mix(in srgb, var(--text-muted) 45%, var(--border)); }

.slots-scroll {
	width: 100%;
	overflow-x: auto;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--card);
}
.slots-table {
	width: 100%;
	min-width: 560px;
	border-collapse: separate;
	border-spacing: 0;
	table-layout: fixed;
	font-size: 12px;
}
.slots-table th, .slots-table td {
	border-right: 1px solid var(--border);
	border-bottom: 1px solid var(--border);
	text-align: center;
	padding: 0;
}
.slots-table thead th {
	position: sticky;
	top: 0;
	z-index: 2;
	background: var(--hover);
	padding: 10px 4px;
	font-weight: 700;
	color: var(--text-muted);
}
.slots-table thead th.today {
	background: color-mix(in srgb, var(--primary) 12%, var(--hover));
	color: var(--text);
}
.time-col {
	width: 64px;
	position: sticky;
	left: 0;
	z-index: 3;
	background: var(--hover);
	color: var(--text-muted);
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}
tbody .time-col { z-index: 1; height: 40px; background: var(--card); }
.day-name { display: block; text-transform: capitalize; font-size: 11px; }
.day-num { display: block; color: var(--text); font-size: 12px; font-weight: 800; margin-top: 2px; }
.today-pill {
	display: inline-block;
	margin-top: 4px;
	padding: 2px 7px;
	border-radius: 999px;
	background: var(--primary);
	color: #fff;
	font-size: 9px;
	font-weight: 700;
}
.group-row td, .pause-row td {
	background: var(--hover);
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	padding: 7px 12px !important;
	text-align: left;
}
.pause-row td {
	font-style: italic;
	font-weight: 500;
	text-transform: none;
	letter-spacing: 0;
	opacity: 0.9;
}
.slot-cell {
	width: 100%;
	min-height: 40px;
	border: 0;
	background: transparent;
	cursor: pointer;
	display: grid;
	place-items: center;
	transition: background 0.12s ease;
}
.slot-cell:disabled { cursor: not-allowed; }
.slots-table td.is-free { background: color-mix(in srgb, #10b981 14%, var(--card)); }
.slots-table td.is-free:hover .slot-cell { background: color-mix(in srgb, #10b981 28%, var(--card)); }
.slots-table td.is-booked { background: color-mix(in srgb, #ef4444 12%, var(--card)); color: #ef4444; }
.slots-table td.is-past { background: var(--hover); color: var(--text-muted); opacity: 0.55; }
.slots-table td.is-selected {
	background: var(--primary);
	color: #fff;
}
.slots-table td.is-today:not(.is-selected) {
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent);
}
.slot-mark { font-size: 14px; font-weight: 800; }

.slot-picked {
	margin: 0;
	font-size: 13px;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--primary) 10%, var(--card));
	border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border));
}
.slot-picked svg {
	width: 16px;
	height: 16px;
	color: var(--primary);
	flex-shrink: 0;
}
.slot-picked strong { text-transform: capitalize; }

/* ========================================================= */
/* RÉCAPITULATIF                                             */
/* ========================================================= */
.summary-card { position: sticky; top: 20px; }
.summary-card h3 {
	margin: 0 0 16px;
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 15px;
	font-weight: 800;
}
.summary-card h3 svg { width: 20px; height: 20px; color: var(--primary); }
.summary-list {
	margin: 0 0 20px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.summary-list div {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--border);
}
.summary-list div:last-child { border-bottom: 0; padding-bottom: 0; }
.summary-list dt {
	color: var(--text-muted);
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: .04em;
	font-weight: 600;
}
.summary-list dd {
	margin: 0;
	font-size: 13px;
	font-weight: 700;
	text-align: right;
	text-transform: capitalize;
	word-break: break-word;
}
.secure-note {
	margin: 14px 0 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	font-size: 11px;
	color: var(--text-muted);
}
.secure-note svg {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	color: var(--primary);
}

/* ========================================================= */
/* SPINNERS & TRANSITIONS                                    */
/* ========================================================= */
.spinner-sm {
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255, 255, 255, .3);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.slide-fade-enter-active,
.slide-fade-leave-active {
	transition: all .3s ease;
}
.slide-fade-enter-from {
	opacity: 0;
	transform: translateY(10px);
}
.slide-fade-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ========================================================= */
/* RESPONSIVE                                                */
/* ========================================================= */
@container rdv (min-width: 880px) {
	.content-wrapper {
		grid-template-columns: minmax(0, 1.7fr) minmax(280px, 360px);
	}
}

@container rdv (max-width: 900px) {
	.contribuable-form-grid { grid-template-columns: repeat(2, 1fr); }
}

@container rdv (max-width: 640px) {
	.contribuable-form-grid { grid-template-columns: 1fr; }
	.contribuable-form-actions { justify-content: stretch; }
	.contribuable-form-actions .btn-primary { width: 100%; }
	.slots-table { min-width: 460px; }
	.time-col { width: 50px; }
	.slot-cell { min-height: 42px; }
	.summary-card { position: static; }
	.search-row { flex-direction: column; }
	.btn-dark { width: 100%; }
	.step-nav { flex-direction: column-reverse; }
	.btn-next, .btn-confirm, .btn-ghost { width: 100%; }
	.stepper { justify-content: flex-start; gap: 16px; }
	.step { flex: 0 0 auto; min-width: 70px; }
}
</style>
