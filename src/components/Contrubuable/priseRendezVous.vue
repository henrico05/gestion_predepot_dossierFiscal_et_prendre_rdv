<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import gsap from 'gsap'
import api from '@/api/Axios'

const emit = defineEmits(['ActualiseListe'])

// ==================== ÉTAPES ====================
const steps = [
	{ id: 1, label: 'Service' },
{ id: 2, label: 'Créneau' },
{ id: 3, label: 'Confirmation' }
]

const currentStep = ref(1)
const direction = ref(1) // 1 = avance, -1 = recule

// ==================== DONNÉES DU FORMULAIRE ====================
const form = reactive({
	serviceId: null,
	date: '',
	time: ''
})

const getLocalDate = () => {
	const now = new Date()
	
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	
	return `${year}-${month}-${day}`
}

const today = getLocalDate()

// ==================== SERVICES ====================
const services = ref([])
const isLoadingServices = ref(true)

const fetchServices = async () => {
	isLoadingServices.value = true
	
	try {
		const res = await api.get('/services-fiscaux')
		
		services.value = res.data.data
	} catch (err) {
		console.error('Erreur chargement services :', err)
	} finally {
		isLoadingServices.value = false
	}
}


const selectedService = computed(() =>
services.value.find(s => s.id_service === form.serviceId) || null
)

const requiredMandatoryPieces = computed(() =>
requiredPieces.value.filter(piece => piece.obligatoire)
)

const requiredOptionalPieces = computed(() =>
requiredPieces.value.filter(piece => !piece.obligatoire)
)

const requiredPieces = ref([])
const isLoadingPieces = ref(false)
const piecesError = ref('')

// ==================== CRÉNEAUX (vraie disponibilité, tableau cliquable) ====================
const availableSlots = ref([])
const isLoadingSlots = ref(false)
const slotsError = ref('')
const slotsTableRef = ref(null)

const morningSlots = computed(() => availableSlots.value.filter(s => s.time < '12:00'))
const afternoonSlots = computed(() => availableSlots.value.filter(s => s.time >= '12:00'))

const currentHourMinute = () => {
	const now = new Date()
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const fetchRequiredPieces = async () => {
	if (!form.serviceId) {
		requiredPieces.value = []
		return
	}
	
	isLoadingPieces.value = true
	piecesError.value = ''
	
	try {
		const res = await api.get(
			`/services-fiscaux/${form.serviceId}/pieces-requises`
		)
		
		if (!res.data.success) {
			throw new Error(
				res.data.message ||
				'Impossible de récupérer les pièces nécessaires.'
			)
		}
		
		requiredPieces.value = res.data.data || []
		
		console.log(
			'📄 Pièces nécessaires :',
			requiredPieces.value
		)
		
	} catch (err) {
		console.error(
			'❌ Erreur récupération pièces :',
			err
		)
		
		requiredPieces.value = []
		
		piecesError.value =
		err.response?.data?.message ||
		err.message ||
		'Impossible de récupérer les pièces nécessaires.'
		
	} finally {
		isLoadingPieces.value = false
	}
}


const fetchSlots = async () => {
	if (!form.serviceId || !form.date) return
		
		const serviceId = form.serviceId
		const date = form.date
		
		isLoadingSlots.value = true
		slotsError.value = ''
		form.time = ''
			
			try {
				const res = await api.get('/rendez-vous/rdv/disponibilites', {
					params: {
						date,
						service : serviceId
					}
				})
				
				if (
					form.serviceId !== serviceId ||
						form.date !== date
				) {
					return
				}
				
				console.log('📅 Disponibilités reçues :', form.date, res.data)
				
				if (!res.data.success) {
					throw new Error(
						res.data.message || 'Impossible de charger les disponibilités.'
					)
				}
				
				const data = res.data.data || []
				
				availableSlots.value = data
				.map(slot => ({
					time: String(slot.heure).slice(0, 5),
							  isBooked: !Boolean(slot.disponible)
				}))
				.filter(slot => {
					// Si la date est aujourd'hui,
					// on cache les créneaux déjà passés.
					if (form.date === today) {
						return slot.time > currentHourMinute()
					}
					
					return true
				})
				
				console.log('🕐 Créneaux affichés :', availableSlots.value)
				
				await nextTick()
				animateSlots()
				
			} catch (err) {
				console.error('❌ Erreur chargement créneaux :', err)
				
				slotsError.value =
				err.response?.data?.message ||
				err.message ||
				'Impossible de charger les créneaux disponibles.'
				
				availableSlots.value = []
				
			} finally {
				isLoadingSlots.value = false
			}
}

const animateSlots = () => {
	const rows = slotsTableRef.value?.querySelectorAll('.slot-cell')
	if (!rows?.length) return
		gsap.fromTo(
			rows,
			{ opacity: 0, y: 6, scale: 0.96 },
			{ opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.02, ease: 'power2.out' }
		)
}

const selectSlot = (slot, event) => {
	if (slot.isBooked) return
		form.time = slot.time
			gsap.fromTo(event.currentTarget, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' })
}

watch(
	() => [form.serviceId, form.date],
	  ([newServiceId, newDate], [oldServiceId, oldDate]) => {
		  
		  // ==========================================
		  // SERVICE MODIFIÉ
		  // ==========================================
		  if (newServiceId !== oldServiceId) {
			  form.time = ''
				  
				  availableSlots.value = []
				  
				  slotsError.value = ''
				  
				  // Récupérer les pièces nécessaires
				  fetchRequiredPieces()
		  }
		  
		  // ==========================================
		  // CHARGEMENT DES CRÉNEAUX
		  // ==========================================
		  if (
			  currentStep.value === 2 &&
			  newServiceId &&
			  newDate
		  ) {
			  fetchSlots()
		  }
	  }
)

// ==================== NAVIGATION ENTRE ÉTAPES ====================
const canGoNext = computed(() => {
	if (currentStep.value === 1) return !!form.serviceId
		if (currentStep.value === 2) return !!form.date && !!form.time
			return true
})

const goNext = async () => {
	if (!canGoNext.value || currentStep.value === 3) return
		
		direction.value = 1
		
		const nextStep = currentStep.value + 1
		
		currentStep.value = nextStep
		if (
			nextStep === 2 &&
			form.serviceId &&
				form.date
		) {
			await fetchSlots()
		}
}

const goPrevious = () => {
	if (currentStep.value === 1) return
		direction.value = -1
		currentStep.value--
}

// ==================== CONFIRMATION FINALE ====================
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const createdTicket = ref(null)
const createdAppointment = ref(null)

const confirmAppointment = async () => {
	isSubmitting.value = true
	submitError.value = ''
	submitSuccess.value = false
	
	try {
		// ========================================================
		// RÉCUPÉRER L'UTILISATEUR CONNECTÉ
		// ========================================================
		
		const currentUser = JSON.parse(
			localStorage.getItem('currentUser') || 'null'
		)
		
		const idContribuable =
		currentUser?.id_contribuable || currentUser?.id
		
		if (!idContribuable) {
			throw new Error('Utilisateur connecté introuvable.')
		}
		
		
		// ========================================================
		// ENVOYER LA DEMANDE AU BACKEND
		// ========================================================
		
		const res = await api.post('/rendez-vous', {
			id_contribuable: idContribuable,
			id_service: form.serviceId,
			date_rdv: form.date,
			heure_rdv: form.time,
			canal_creation: 'en_ligne'
		})
		
		
		// ========================================================
		// RÉCUPÉRER LA RÉPONSE
		// ========================================================
		
		createdAppointment.value = res.data.data
		createdTicket.value = res.data.ticket
		
		
		// ========================================================
		// AFFICHER LE SUCCÈS
		// ========================================================
		
		submitSuccess.value = true
		emit('ActualiseListe')
		
	} catch (err) {
		
		console.error(
			'Erreur création rendez-vous :',
			err
		)
		
		// ========================================================
		// CRÉNEAU DÉJÀ PRIS
		// ========================================================
		
		if (err.response?.status === 409) {
			
			submitError.value =
			"Ce créneau vient d'être réservé par quelqu'un d'autre. Merci de choisir un autre créneau."
			
			// On recharge les disponibilités
			await fetchSlots()
			
			// Si le créneau choisi n'est plus disponible,
			// on le désélectionne
			const selectedSlot = availableSlots.value.find(
				slot => slot.time === form.time
			)
			
			if (selectedSlot?.isBooked) {
				form.time = ''
			}
			
		} else {
			
			submitError.value =
			err.response?.data?.message ||
			err.message ||
			'Erreur lors de la création du rendez-vous.'
		}
		
	} finally {
		
		isSubmitting.value = false
	}
}

const resetFlow = () => {
	form.serviceId = null
		form.date = ''
			form.time = ''
				availableSlots.value = []
				submitSuccess.value = false
				submitError.value = ''
				direction.value = -1
				currentStep.value = 1
}

onMounted(fetchServices)
</script>

<template>
<div class="rdv-page">
<div class="rdv-card">

<!-- ==================== EN-TÊTE STEPPER ==================== -->
<div class="stepper">
<template v-for="(step, index) in steps" :key="step.id">
<div class="stepper-item">
<div
class="stepper-circle"
:class="{
'is-active': currentStep === step.id,
'is-done': currentStep > step.id
}"
>
<svg v-if="currentStep > step.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
</svg>
<span v-else>{{ step.id }}</span>
</div>
<span class="stepper-label" :class="{ 'is-active': currentStep === step.id }">{{ step.label }}</span>
</div>
<div v-if="index < steps.length - 1" class="stepper-line" :class="{ 'is-done': currentStep > step.id }"></div>
</template>
</div>

<!-- ==================== CONTENU DES ÉTAPES ==================== -->
<div class="step-content-wrapper">
<AnimatePresence :mode="'wait'">

<!-- ========== ÉTAPE 1 : SERVICE ========== -->
<Motion
v-if="currentStep === 1"
key="step1"
:initial="{ opacity: 0, x: direction * 24 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -24 }"
:transition="{ duration: 0.25, ease: 'easeOut' }"
>
<h2 class="step-title">Choisir un service</h2>
<p class="step-subtitle">Sélectionnez le service souhaité</p>

<label class="field-label">Service<span class="required">*</span></label>
<select v-model="form.serviceId" class="field-select" :disabled="isLoadingServices">
<option :value="null" disabled>{{ isLoadingServices ? 'Chargement…' : 'Sélectionnez un service' }}</option>
<option v-for="s in services" :key="s.id_service" :value="s.id_service">
{{ s.libelle_service }} — {{ s.duree_estimee_min }} min
</option>
</select>

<p v-if="selectedService" class="service-hint">
<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
Durée estimée : {{ selectedService.duree_estimee_min }} minutes
</p>
</Motion>

<!-- ========== ÉTAPE 2 : CRÉNEAU (vrai tableau cliquable) ========== -->
<Motion
v-else-if="currentStep === 2"
key="step2"
:initial="{ opacity: 0, x: direction * 24 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -24 }"
:transition="{ duration: 0.25, ease: 'easeOut' }"
>
<h2 class="step-title">Choisir une date</h2>
<p class="step-subtitle">Sélectionnez une date disponible</p>

<label class="field-label">Date<span class="required">*</span></label>
<div class="date-input-wrap">
<svg class="w-4 h-4 date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
<input v-model="form.date" type="date" :min="today" class="field-input date-input">
</div>

<template v-if="form.date">
<h2 class="step-title mt-6">Choisir un créneau</h2>
<p class="step-subtitle">Sélectionnez un créneau horaire — cliquez directement dans le tableau</p>

<!-- Squelette de chargement -->
<div v-if="isLoadingSlots" class="slots-skeleton">
<div v-for="n in 9" :key="n" class="skeleton-cell"></div>
</div>

<!-- Erreur -->
<div v-else-if="slotsError" class="slots-message is-error">{{ slotsError }}</div>

<!-- Aucun créneau -->
<div v-else-if="availableSlots.length === 0" class="slots-message">Aucun créneau disponible à cette date pour ce service.</div>

<!-- Tableau de créneaux -->
<div v-else ref="slotsTableRef" class="slots-table">
<div v-if="morningSlots.length" class="slots-group">
<p class="slots-group-label">Matin</p>
<table class="slots-native-table">
<thead>
<tr><th>Heure</th><th>Statut</th><th></th></tr>
</thead>
<tbody>
<tr
v-for="slot in morningSlots"
:key="slot.time"
class="slot-row slot-cell"
:class="{ 'is-booked': slot.isBooked, 'is-selected': form.time === slot.time }"
@click="selectSlot(slot, $event)"
>
<td class="slot-time">{{ slot.time }}</td>
<td>
<span class="slot-status-pill" :class="slot.isBooked ? 'is-booked' : 'is-free'">
{{ slot.isBooked ? 'Réservé' : 'Disponible' }}
</span>
</td>
<td class="slot-action">
<span v-if="form.time === slot.time" class="slot-check">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
</span>
<span v-else-if="!slot.isBooked" class="slot-pick">Choisir →</span>
</td>
</tr>
</tbody>
</table>
</div>

<div v-if="afternoonSlots.length" class="slots-group">
<p class="slots-group-label">Après-midi</p>
<table class="slots-native-table">
<thead>
<tr><th>Heure</th><th>Statut</th><th></th></tr>
</thead>
<tbody>
<tr
v-for="slot in afternoonSlots"
:key="slot.time"
class="slot-row slot-cell"
:class="{ 'is-booked': slot.isBooked, 'is-selected': form.time === slot.time }"
@click="selectSlot(slot, $event)"
>
<td class="slot-time">{{ slot.time }}</td>
<td>
<span class="slot-status-pill" :class="slot.isBooked ? 'is-booked' : 'is-free'">
{{ slot.isBooked ? 'Réservé' : 'Disponible' }}
</span>
</td>
<td class="slot-action">
<span v-if="form.time === slot.time" class="slot-check">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
</span>
<span v-else-if="!slot.isBooked" class="slot-pick">Choisir →</span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</template>
</Motion>

<!-- ========== ÉTAPE 3 : CONFIRMATION ========== -->
<Motion
v-else
key="step3"
:initial="{ opacity: 0, x: direction * 24 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -24 }"
:transition="{ duration: 0.25, ease: 'easeOut' }"
>
<template v-if="!submitSuccess">
<h2 class="step-title">Confirmer le rendez-vous</h2>
<p class="step-subtitle">Vérifiez les informations avant de valider</p>

<div class="summary-box">
<div class="summary-row">
<span class="summary-label">Service</span>
<span class="summary-value">{{ selectedService?.libelle_service }}</span>
</div>
<div class="summary-row">
<span class="summary-label">Date</span>
<span class="summary-value">{{ form.date }}</span>
</div>
<div class="summary-row">
<span class="summary-label">Heure</span>
<span class="summary-value">{{ form.time }}</span>
</div>
<div class="summary-row">
<span class="summary-label">Durée estimée</span>
<span class="summary-value">{{ selectedService?.duree_estimee_min }} min</span>
</div>
</div>

<div class="required-pieces-box">

<div class="required-pieces-header">
<div>
<h3 class="required-pieces-title">
Documents nécessaires
</h3>

<p class="required-pieces-subtitle">
Pièces requises pour ce service fiscal
</p>
</div>

<span class="pieces-count">
{{ requiredMandatoryPieces.length }}
{{ requiredMandatoryPieces.length > 1 ? 'pièces' : 'pièce' }}
</span>
</div>

<!-- Chargement -->
<div
v-if="isLoadingPieces"
class="pieces-loading"
>
<span class="pieces-spinner"></span>
Chargement des documents nécessaires...
</div>

<!-- Erreur -->
<div
v-else-if="piecesError"
class="pieces-error"
>
{{ piecesError }}
</div>

<!-- Liste -->
<div
v-else-if="requiredPieces.length"
class="pieces-list"
>

<div
v-for="piece in requiredPieces"
:key="piece.id_type_piece"
class="required-piece-item"
>

<div class="piece-check">
<svg
class="w-4 h-4"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M5 13l4 4L19 7"
/>
</svg>
</div>

<div class="piece-info">

<span class="piece-name">
{{ piece.libelle }}
</span>

<span
v-if="piece.description"
class="piece-description"
>
{{ piece.description }}
</span>

</div>

<span
v-if="piece.obligatoire"
class="piece-required-badge"
>
Obligatoire
</span>

<span
v-else
class="piece-optional-badge"
>
Facultatif
</span>

</div>

</div>

<!-- Aucun document configuré -->
<div
v-else
class="pieces-empty"
>
Aucune pièce justificative configurée pour ce service.
</div>

</div>

<p v-if="submitError" class="slots-message is-error mt-4">{{ submitError }}</p>
</template>

<!-- Succès -->
<template v-else>
<div class="success-icon">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
</div>
<h2 class="step-title text-center">
	Demande de rendez-vous enregistrée !
</h2>

<p class="step-subtitle text-center">
	Votre demande pour le
	<strong>{{ form.date }}</strong>
	à
	<strong>{{ form.time }}</strong>
	pour
	« {{ selectedService?.libelle_service }} »
	a bien été enregistrée.
	<br>
	Elle est actuellement <strong>en attente de confirmation</strong>.
</p>
</template>
</Motion>

</AnimatePresence>
</div>

<!-- ==================== FOOTER NAVIGATION ==================== -->
<div v-if="!submitSuccess" class="step-footer">
<Motion :while-hover="{ scale: 1.02 }" :while-press="{ scale: 0.98 }">
<button class="btn-outline" @click="currentStep === 1 ? null : goPrevious()" :disabled="currentStep === 1">
{{ currentStep === 1 ? 'Annuler' : 'Précédent' }}
</button>
</Motion>

<Motion :while-hover="canGoNext ? { scale: 1.02 } : {}" :while-press="canGoNext ? { scale: 0.98 } : {}">
<button v-if="currentStep < 3" class="btn-primary" :disabled="!canGoNext" @click="goNext">
Suivant
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
</button>
<button v-else class="btn-primary" :disabled="isSubmitting" @click="confirmAppointment">
<span v-if="isSubmitting" class="btn-spinner"></span>
Confirmer le rendez-vous
</button>
</Motion>
</div>

<div v-else class="step-footer justify-center">
<Motion :while-hover="{ scale: 1.02 }" :while-press="{ scale: 0.98 }">
<button class="btn-primary" @click="resetFlow">Prendre un autre rendez-vous</button>
</Motion>
</div>

</div>
</div>
</template>

<style scoped>
.rdv-page {
	min-height: 100%;
	width: 100%;
	background: var(--bg);
	display: flex;
	justify-content: center;
	padding: clamp(16px, 4vw, 40px);
	font-family: 'Inter', sans-serif;
}

.rdv-card {
	width: 100%;
	max-width: 620px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 18px;
	box-shadow: 0 8px 30px rgba(0,0,0,0.06);
	padding: clamp(20px, 4vw, 36px);
}

/* ================= STEPPER ================= */
.stepper {
	display: flex;
	align-items: center;
	margin-bottom: 32px;
}
.stepper-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}
.stepper-circle {
	width: 36px;
	height: 36px;
	border-radius: 999px;
	display: grid;
	place-items: center;
	font-size: 13px;
	font-weight: 700;
	border: 2px solid var(--border);
	color: var(--text-muted);
	background: var(--card);
	transition: all 0.25s;
}
.stepper-circle.is-active {
	border-color: var(--primary);
	background: var(--primary);
	color: white;
}
.stepper-circle.is-done {
	border-color: var(--primary);
	background: var(--bgListCard);
	color: var(--primary);
}
.stepper-label {
	font-size: 11.5px;
	font-weight: 600;
	color: var(--text-muted);
	white-space: nowrap;
}
.stepper-label.is-active {
	color: var(--text);
}
.stepper-line {
	flex: 1;
	height: 2px;
	background: var(--border);
	margin: 0 8px;
	margin-bottom: 20px;
	transition: background 0.25s;
}
.stepper-line.is-done {
	background: var(--primary);
}

/* ================= CONTENU ================= */
.step-content-wrapper {
	min-height: 280px;
}
.step-title {
	font-size: 17px;
	font-weight: 800;
	color: var(--text);
	margin-bottom: 4px;
}
.step-subtitle {
	font-size: 13px;
	color: var(--text-muted);
	margin-bottom: 18px;
}

.field-label {
	display: block;
	font-size: 12.5px;
	font-weight: 700;
	color: var(--text);
	margin-bottom: 6px;
}
.required {
	color: #ef4444;
	margin-left: 2px;
}

.field-select, .field-input {
	width: 100%;
	padding: 11px 14px;
	border-radius: 9px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	font-size: 14px;
	outline: none;
	transition: all 0.2s;
}
.field-select:focus, .field-input:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}

.service-hint {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 10px;
	font-size: 12.5px;
	color: var(--primary);
	background: var(--bgListCard);
	padding: 8px 12px;
	border-radius: 8px;
	width: fit-content;
}

.date-input-wrap {
	position: relative;
	margin-bottom: 4px;
}
.date-icon {
	position: absolute;
	left: 12px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--text-muted);
	pointer-events: none;
}
.date-input {
	padding-left: 38px;
}

/* ================= TABLEAU DE CRÉNEAUX ================= */
.slots-table {
	display: flex;
	flex-direction: column;
	gap: 16px;
	max-height: 300px;
	overflow-y: auto;
	padding-right: 4px;
}
.slots-group-label {
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	color: var(--text-muted);
	margin-bottom: 6px;
}
.slots-native-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}
.slots-native-table thead th {
	text-align: left;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	padding: 6px 10px;
	border-bottom: 1px solid var(--border);
}
.slot-row {
	cursor: pointer;
	transition: background-color 0.15s;
	border-bottom: 1px solid var(--border);
}
.slot-row:hover:not(.is-booked) {
	background: var(--hover);
}
.slot-row.is-booked {
	cursor: not-allowed;
	opacity: 0.55;
}
.slot-row.is-selected {
	background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.slot-row td {
	padding: 10px;
}
.slot-time {
	font-weight: 700;
	color: var(--text);
}
.slot-status-pill {
	font-size: 11px;
	font-weight: 700;
	padding: 3px 9px;
	border-radius: 999px;
}
.slot-status-pill.is-free {
	background: color-mix(in srgb, #10b981 14%, transparent);
	color: #10b981;
}
.slot-status-pill.is-booked {
	background: color-mix(in srgb, #ef4444 12%, transparent);
	color: #ef4444;
}
.slot-action {
	text-align: right;
	font-size: 12px;
	font-weight: 600;
	color: var(--primary);
}
.slot-check {
	display: inline-flex;
	color: var(--primary);
}

.slots-skeleton {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
}
.skeleton-cell {
	height: 40px;
	border-radius: 8px;
	background: var(--hover);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

.slots-message {
	padding: 16px;
	border-radius: 10px;
	background: var(--hover);
	color: var(--text-muted);
	font-size: 13px;
	text-align: center;
}
.slots-message.is-error {
	background: color-mix(in srgb, #ef4444 10%, transparent);
	color: #ef4444;
}

/* ================= RÉSUMÉ CONFIRMATION ================= */
.summary-box {
	border: 1px solid var(--border);
	border-radius: 12px;
	overflow: hidden;
}
.summary-row {
	display: flex;
	justify-content: space-between;
	padding: 12px 16px;
	font-size: 13.5px;
	border-bottom: 1px solid var(--border);
	background: var(--card);
}
.summary-row:last-child {
	border-bottom: none;
}
.summary-label {
	color: var(--text-muted);
}
.summary-value {
	font-weight: 700;
	color: var(--text);
}

.success-icon {
	width: 64px;
	height: 64px;
	margin: 0 auto 18px;
	border-radius: 999px;
	background: color-mix(in srgb, #10b981 15%, transparent);
	color: #10b981;
	display: grid;
	place-items: center;
}

/* ================= FOOTER ================= */
.step-footer {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	margin-top: 28px;
	padding-top: 20px;
	border-top: 1px solid var(--border);
}

.btn-outline, .btn-primary {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 11px 22px;
	border-radius: 9px;
	font-size: 13.5px;
	font-weight: 700;
	cursor: pointer;
	transition: all 0.2s;
}
.btn-outline {
	background: transparent;
	border: 1.5px solid var(--border);
	color: var(--text);
}
.btn-outline:hover:not(:disabled) {
	border-color: var(--primary);
	color: var(--primary);
}
.btn-primary {
	background: var(--primary);
	border: none;
	color: white;
}
.btn-primary:hover:not(:disabled) {
	filter: brightness(1.06);
}
.btn-outline:disabled, .btn-primary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-spinner {
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255,255,255,0.35);
	border-top-color: white;
	border-radius: 999px;
	animation: spin 0.7s linear infinite;
}

/* ================= PIÈCES NÉCESSAIRES ================= */

.required-pieces-box {
	margin-top: 18px;
	border: 1px solid var(--border);
	border-radius: 12px;
	overflow: hidden;
	background: var(--card);
}

.required-pieces-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	background: var(--hover);
	border-bottom: 1px solid var(--border);
}

.required-pieces-title {
	margin: 0;
	font-size: 14px;
	font-weight: 800;
	color: var(--text);
}

.required-pieces-subtitle {
	margin: 3px 0 0;
	font-size: 11.5px;
	color: var(--text-muted);
}

.pieces-count {
	flex-shrink: 0;
	padding: 4px 9px;
	border-radius: 999px;
	background: color-mix(
		in srgb,
		var(--primary) 12%,
						  transparent
	);
	color: var(--primary);
	font-size: 11px;
	font-weight: 700;
}

.pieces-list {
	display: flex;
	flex-direction: column;
}

.required-piece-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 11px 14px;
	border-bottom: 1px solid var(--border);
}

.required-piece-item:last-child {
	border-bottom: none;
}

.piece-check {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	border-radius: 7px;
	display: grid;
	place-items: center;
	background: color-mix(
		in srgb,
		#10b981 14%,
		transparent
	);
	color: #10b981;
}

.piece-info {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.piece-name {
	font-size: 13px;
	font-weight: 700;
	color: var(--text);
}

.piece-description {
	font-size: 11px;
	line-height: 1.4;
	color: var(--text-muted);
}

.piece-required-badge,
.piece-optional-badge {
	flex-shrink: 0;
	font-size: 10px;
	font-weight: 700;
	padding: 3px 7px;
	border-radius: 999px;
}

.piece-required-badge {
	background: color-mix(
		in srgb,
		#ef4444 10%,
		transparent
	);
	color: #ef4444;
}

.piece-optional-badge {
	background: color-mix(
		in srgb,
		var(--primary) 10%,
						  transparent
	);
	color: var(--primary);
}

.pieces-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 18px;
	font-size: 12px;
	color: var(--text-muted);
}

.pieces-spinner {
	width: 15px;
	height: 15px;
	border: 2px solid var(--border);
	border-top-color: var(--primary);
	border-radius: 999px;
	animation: spin 0.7s linear infinite;
}

.pieces-error {
	padding: 14px;
	font-size: 12px;
	color: #ef4444;
	background: color-mix(
		in srgb,
		#ef4444 8%,
		transparent
	);
}

.pieces-empty {
	padding: 18px;
	text-align: center;
	font-size: 12px;
	color: var(--text-muted);
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
