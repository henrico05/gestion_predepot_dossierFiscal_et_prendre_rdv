<template>
<section class="rdv-week-view">

<!-- ========================================================= -->
<!-- BARRE SUPÉRIEURE : Actions + Filtres                       -->
<!-- ========================================================= -->
<div class="top-bar">
<div class="top-actions">
<router-link to="/dashAgent/createRdv" class="btn-primary">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
</svg>
Prendre un rendez-vous
</router-link>
</div>

<!-- Filtres de statut -->
<div class="filters">
<button
v-for="filter in filters"
:key="filter.value"
type="button"
class="filter-chip"
:class="{ 'is-active': activeFilter === filter.value }"
:style="activeFilter === filter.value ? { background: filter.color, color: '#fff', borderColor: filter.color } : {}"
@click="activeFilter = filter.value"
>
<span class="filter-dot" :style="{ background: filter.color }"></span>
{{ filter.label }}
</button>
</div>

<!-- Recherche -->
<div class="search-box">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input
v-model="searchQuery"
type="text"
placeholder="Rechercher par NIF, nom ou n° ticket…"
class="search-input"
>
<button v-if="searchQuery" type="button" class="search-clear" @click="searchQuery = ''">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>
</div>

<!-- ========================================================= -->
<!-- BARRE DE SEMAINE                                          -->
<!-- ========================================================= -->
<div class="week-bar">
<button type="button" class="week-nav" @click="shiftWeek(-1)" title="Semaine précédente">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
</svg>
</button>

<div class="week-label">
<strong>{{ weekLabel }}</strong>
<button v-if="!isCurrentWeek" type="button" class="link-btn" @click="goToThisWeek">
Revenir à cette semaine
</button>
</div>

<button type="button" class="week-nav" @click="shiftWeek(1)" title="Semaine suivante">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
</button>

<div class="week-stats">
<span class="stat-pill">
<span class="stat-count">{{ totalWeekAppointments }}</span>
RDV cette semaine
</span>
</div>
</div>

<!-- ========================================================= -->
<!-- MINI-CALENDRIER DE SAUT RAPIDE                            -->
<!-- ========================================================= -->
<div class="quick-jump">
<div class="quick-jump-header">
<div>
<h3>Accès rapide</h3>
<p>Cliquez sur une date pour y accéder directement.</p>
</div>
<button
v-if="nextUpcomingAppointment"
type="button"
class="btn-next-rdv"
@click="jumpToNextAppointment"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
</svg>
Prochain RDV :
{{ formatShortDate(nextUpcomingAppointment.date_rdv) }}
à {{ String(nextUpcomingAppointment.heure_rdv).slice(0, 5) }}
</button>
</div>

<div class="quick-jump-grid">
<button
v-for="day in nextDaysSummary"
:key="day.iso"
type="button"
class="qj-day"
:class="{
'is-today': day.isToday,
'is-weekend': day.isWeekend,
'has-rdv': day.count > 0,
'is-selected': isDayInCurrentWeek(day.iso)
}"
@click="jumpToDate(day.iso)"
>
<span class="qj-label">{{ day.label }}</span>
<span v-if="day.count > 0" class="qj-count">{{ day.count }}</span>
<span v-else class="qj-count-empty">—</span>
</button>
</div>
</div>

<!-- ========================================================= -->
<!-- CONTENU : Chargement / Erreur / Tableau / Vide            -->
<!-- ========================================================= -->
<div v-if="isLoading" class="loading-state">
<span class="spinner"></span>
<p>Chargement des rendez-vous…</p>
</div>

<div v-else-if="loadError" class="error-state">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
{{ loadError }}
</div>

<div v-else-if="hasAnyAppointmentInWeek" class="table-wrapper">
<!-- ========================================================= -->
<!-- TABLEAU SEMAINE                                            -->
<!-- ========================================================= -->
<div v-if="hasAnyAppointmentInWeek" class="table-wrapper">
<table class="week-table">
<thead>
<tr>
<th class="time-col">Heure</th>
<th
v-for="day in weekDays"
:key="day.iso"
:class="{ today: day.isToday, past: day.isPast,'is-selected-day': day.isToday }"
>
<span class="day-name">{{ day.short }}</span>
<span class="day-num">{{ day.dateNum }}</span>
<span v-if="day.isToday" class="today-pill">Aujourd'hui</span>
</th>
</tr>
</thead>
<tbody>
<tr v-for="time in timeSlots" :key="time">
<th class="time-col" scope="row">{{ time }}</th>
<td
v-for="day in weekDays"
:key="day.iso + time"
class="slot-cell"
:class="{ 'is-past': day.isPast,'is-selected-column': day.isToday }"
>
<!-- Cas 1 : un seul RDV -->
<template v-if="findSlotsFor(day.iso, time).length === 1">
<div
class="rdv-chip"
:style="getStatusStyle(findSlotsFor(day.iso, time)[0].statut_rdv)"
@click="onRdvClick(findSlotsFor(day.iso, time)[0])"
>
<span class="rdv-time">
{{ String(findSlotsFor(day.iso, time)[0].heure_rdv).slice(0, 5) }}
</span>
<span class="rdv-nif">
{{ findSlotsFor(day.iso, time)[0].contribuable?.nif || '—' }}
</span>
<span class="rdv-name">
{{ shortName(findSlotsFor(day.iso, time)[0].contribuable?.nom_raison_sociale) }}
</span>
</div>
</template>

<!-- Cas 2 : plusieurs RDV → badge +N -->
<template v-else-if="findSlotsFor(day.iso, time).length > 1">
<div
class="rdv-multi"
:style="getStatusStyle(findSlotsFor(day.iso, time)[0].statut_rdv)"
@click="onMultiSlotClick(day.iso, time)"
>
<span class="multi-count">
{{ findSlotsFor(day.iso, time).length }}
</span>
<span class="multi-label">RDV</span>
</div>
</template>

<!-- Cas 3 : aucun RDV -->
<template v-else-if="isPastSlot(day, time)">
<span class="empty-mark">·</span>
</template>
<template v-else>
<span class="empty-mark" @click="onEmptyCellClick(day, time)">+</span>
</template>
</td>
</tr>
</tbody>
</table>
</div>
</div>


<div v-else class="empty-week">
<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
<p>Aucun rendez-vous cette semaine.</p>
<router-link to="/dashAgent/createRdv" class="btn-secondary">
Prendre un rendez-vous
</router-link>
</div>

<!-- Légende des statuts -->
<div class="legend">
<span v-for="filter in filters.slice(1)" :key="filter.value" class="legend-item">
<span class="legend-dot" :style="{ background: filter.color }"></span>
{{ filter.label }}
</span>
</div>
</section>

<!-- ========================================================= -->
<!-- MODALES                                                   -->
<!-- ========================================================= -->
<AppointmentDetailModal
:appointment="selectedAppointment"
:show="showDetailModal"
@close="closeDetail"
@confirm="confirmAppointment"
@cancel="cancelAppointment"
@edit="openEditFromDetail"
@absent="markAbsent"
@checkin="checkinAppointment"
@print="printExistingTicket"
/>

<AppointmentEditModal
:appointment="selectedAppointment"
:show="showEditModal"
:services="services"
:is-saving="isSavingEdit"
@save="saveEdit"
@close="closeEdit"
/>

<TicketModal
:show="showTicketModal"
:ticket="ticketCreated"
:is-printing="isPrinting"
@close="closeTicketModal"
@print="printTicket"
/>
<!-- Modale de choix multiple -->
<transition name="fade">
<div v-if="showMultiSlotModal" class="modal-overlay" @click.self="showMultiSlotModal = false">
<div class="modal-content-anim multi-modal">
<div class="modal-header">
<div>
<h2>{{ multiSlotItems.length }} rendez-vous</h2>
<p>
{{ formatShortDate(multiSlotContext.date) }} ·
{{ multiSlotContext.time }} – {{ addMinutes(multiSlotContext.time, 30) }}
</p>
</div>
<button type="button" class="modal-close" @click="showMultiSlotModal = false">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>
<div class="modal-body">
<button
v-for="rdv in multiSlotItems"
:key="rdv.id_rdv"
type="button"
class="multi-item"
:style="getStatusStyle(rdv.statut_rdv)"
@click="selectFromMultiSlot(rdv)"
>
<div class="mi-time">
{{ String(rdv.heure_rdv).slice(0, 5) }}
</div>
<div class="mi-info">
<span class="mi-nif">{{ rdv.contribuable?.nif || '—' }}</span>
<span class="mi-name">{{ rdv.contribuable?.nom_raison_sociale || '—' }}</span>
<span class="mi-service">{{ rdv.service?.libelle_service || '' }}</span>
</div>
<span class="mi-status">{{ rdv.statut_rdv }}</span>
</button>
</div>
</div>
</div>
</transition>

</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import api from '@/api/Axios.js'
import { socket, connectSocket } from '@/services/socket'
import { playSound } from '@/services/sonnerie'

import AppointmentDetailModal from '@/components/RDV/modal/AppointmentDetailModal.vue'
import AppointmentEditModal from '@/components/RDV/modal/AppointmentEditModal.vue'
import TicketModal from '@/components/RDV/modal/TicketModal.vue'

const toast = useToast()
const router = useRouter()

/* =========================================================
 * ÉTAT GLOBAL
 * ========================================================= */
const appointments = ref([])
const isLoading = ref(true)
const loadError = ref('')
const services = ref([])

/* =========================================================
 * FILTRES
 * ========================================================= */
const activeFilter = ref('TOUS')
const searchQuery = ref('')

const filters = [
	{ value: 'TOUS', label: 'Tous', color: 'var(--primary)' },
	{ value: 'EN_ATTENTE', label: 'En attente', color: '#f59e0b' },
{ value: 'CONFIRME', label: 'Confirmés', color: '#10b981' },
{ value: 'HONORE', label: 'Honorés', color: '#3b82f6' },
{ value: 'ABSENT', label: 'Absents', color: '#94a3b8' },
{ value: 'ANNULE', label: 'Annulés', color: '#ef4444' }
]


function formatShortDate(iso) {
	if (!iso) return '—'
		const [y, m, d] = String(iso).slice(0, 10).split('-')
		const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
		return `${d} ${months[Number(m) - 1]}`
}

/* =========================================================
 * SEMAINE AFFICHÉE
 * ========================================================= */
const weekStart = ref(startOfWeek(new Date()))

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

const todayIso = toIso(new Date())

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

/* =========================================================
 * CRÉNEAUX HORAIRES (08:00 → 17:00, pas de 30 min)
 * ========================================================= */
const timeSlots = computed(() => {
	const slots = []
	for (let h = 8; h <= 17; h++) {
		slots.push(`${String(h).padStart(2, '0')}:00`)
		if (h < 17) slots.push(`${String(h).padStart(2, '0')}:30`)
	}
	return slots
})

/* =========================================================
 * INDEX RAPIDE : Map<"YYYY-MM-DD HH:mm", RDV>
 * ========================================================= */
const appointmentIndex = computed(() => {
	const map = new Map()
	for (const rdv of filteredAppointments.value) {
		const dateIso = String(rdv.date_rdv || '').slice(0, 10)
		if (!dateIso) continue
			if (!map.has(dateIso)) map.set(dateIso, [])
				map.get(dateIso).push(rdv)
	}
	return map
})

function findSlotsFor(dateIso, slotTime) {
	const rdvs = appointmentIndex.value.get(dateIso) || []
	const [slotH, slotM] = slotTime.split(':').map(Number)
	const slotStart = slotH * 60 + slotM
	const slotEnd = slotStart + 30
	
	return rdvs
	.filter(rdv => {
		const rdvTime = String(rdv.heure_rdv || '').slice(0, 5)
		if (!rdvTime) return false
			const [rdvH, rdvM] = rdvTime.split(':').map(Number)
			const rdvMinutes = rdvH * 60 + rdvM
			// Le RDV entre dans [slotStart, slotEnd[
			return rdvMinutes >= slotStart && rdvMinutes < slotEnd
	})
	.sort((a, b) => String(a.heure_rdv).localeCompare(String(b.heure_rdv)))
}

const appointmentsOutsideWeek = computed(() => {
	const weekSet = weekIsoSet.value
	return filteredAppointments.value
	.filter(a => {
		const iso = String(a.date_rdv || '').slice(0, 10)
		return iso && !weekSet.has(iso)
	})
	.sort((a, b) => String(a.date_rdv).localeCompare(String(b.date_rdv)))
})

const futureAppointmentsCount = computed(() => {
	return appointmentsOutsideWeek.value.filter(a => {
		const iso = String(a.date_rdv || '').slice(0, 10)
		return iso > todayIso
	}).length
})

const pastAppointmentsCount = computed(() => {
	return appointmentsOutsideWeek.value.filter(a => {
		const iso = String(a.date_rdv || '').slice(0, 10)
		return iso < todayIso
	}).length
})

function getSlotChipLabel(rdv) {
	if (!rdv) return ''
		const time = String(rdv.heure_rdv || '').slice(0, 5)
		const isOffGrid = !['00', '30'].includes(time.split(':')[1])
		return {
			time,
			isOffGrid,
			nif: rdv.contribuable?.nif || '—',
			name: shortName(rdv.contribuable?.nom_raison_sociale)
		}
}

function getAppointmentFor(dateIso, time) {
	return appointmentIndex.value.get(`${dateIso} ${time}`) || null
}

/* =========================================================
 * FILTRAGE
 * ========================================================= */
const normalize = (v) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const filteredAppointments = computed(() => {
	let list = [...appointments.value]
	
	if (activeFilter.value !== 'TOUS') {
		list = list.filter(a => {
			const s = normalize(a.statut_rdv).toUpperCase()
			return s === activeFilter.value
		})
	}
	
	const q = normalize(searchQuery.value)
	if (q) {
		list = list.filter(a => {
			return [
				a.contribuable?.nif,
				a.contribuable?.nom_raison_sociale,
				a.ticket?.numero_ticket,
				a.id_rdv
			].some(v => normalize(v).includes(q))
		})
	}
	
	return list
})

function addMinutes(time, mins) {
	const [h, m] = time.split(':').map(Number)
	const total = h * 60 + m + mins
	return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/* =========================================================
 * PROCHAIN RDV FUTUR (à partir d'aujourd'hui)
 * ========================================================= */
const nextUpcomingAppointment = computed(() => {
	const today = todayIso
	return filteredAppointments.value
	.filter(a => {
		const iso = String(a.date_rdv || '').slice(0, 10)
		return iso >= today
	})
	.sort((a, b) => {
		const da = `${a.date_rdv}T${a.heure_rdv}`
		const db = `${b.date_rdv}T${b.heure_rdv}`
		return da.localeCompare(db)
	})[0] || null
})

function onEmptyCellClick(day, time) {
	if (isPastSlot(day, time)) return
		router.push({
			path: '/dashAgent/createRdv',
			query: {
				date: day.iso,
				time: time
			}
		})
}


/* =========================================================
 * COMPTEUR PAR JOUR SUR LES 14 PROCHAINS JOURS
 * ========================================================= */
const nextDaysSummary = computed(() => {
	const days = []
	for (let i = 0; i < 14; i++) {
		const d = new Date()
		d.setDate(d.getDate() + i)
		const iso = toIso(d)
		const count = (appointmentIndex.value.get(iso) || []).length
		days.push({
			iso,
			label: i === 0 ? "Auj." : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
				  count,
				  isToday: i === 0,
				  isWeekend: [0, 6].includes(d.getDay())
		})
	}
	return days
})

/* =========================================================
 * SAUTER À UNE DATE PRÉCISE
 * ========================================================= */
function jumpToDate(iso) {
	const d = new Date(iso + 'T00:00:00')
	weekStart.value = startOfWeek(d)
	animateTable()
}

/* =========================================================
 * SAUTER AU PROCHAIN RDV FUTUR
 * ========================================================= */
function jumpToNextAppointment() {
	if (!nextUpcomingAppointment.value) return
		jumpToDate(String(nextUpcomingAppointment.value.date_rdv).slice(0, 10))
		// Ouvrir automatiquement le détail
		setTimeout(() => {
			selectedAppointment.value = nextUpcomingAppointment.value
			showDetailModal.value = true
			animateModal()
		}, 400)
}

/* =========================================================
 * STATS SEMAINE
 * ========================================================= */
const weekIsoSet = computed(() => new Set(weekDays.value.map(d => d.iso)))

const totalWeekAppointments = computed(() =>
filteredAppointments.value.filter(a => weekIsoSet.value.has(String(a.date_rdv || '').slice(0, 10))).length
)

const hasAnyAppointmentInWeek = computed(() => totalWeekAppointments.value > 0)

/* =========================================================
 * STYLES DES STATUTS
 * ========================================================= */
const STATUS_STYLES = {
	EN_ATTENTE: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#b45309', icon: '⏱' },
	CONFIRME:   { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#047857', icon: '✓' },
	HONORE:     { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#1d4ed8', icon: '★' },
	ABSENT:     { bg: 'rgba(148, 163, 184, 0.15)', border: '#94a3b8', text: '#475569', icon: '✕' },
	ANNULE:     { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#b91c1c', icon: '✕' }
}

/* =========================================================
 * MODALE "CHOIX MULTIPLE"
 * ========================================================= */
const showMultiSlotModal = ref(false)
const multiSlotItems = ref([])
const multiSlotContext = ref({ date: '', time: '' })

function onMultiSlotClick(dateIso, time) {
	multiSlotItems.value = findSlotsFor(dateIso, time)
	multiSlotContext.value = { date: dateIso, time }
	showMultiSlotModal.value = true
}

function selectFromMultiSlot(rdv) {
	showMultiSlotModal.value = false
	selectedAppointment.value = rdv
	showDetailModal.value = true
	animateModal()
}

function getStatusStyle(statut) {
	const s = normalize(statut).toUpperCase()
	const style = STATUS_STYLES[s] || STATUS_STYLES.EN_ATTENTE
	return {
		background: style.bg,
		borderLeft: `3px solid ${style.border}`,
		color: style.text
	}
}

function getStatusColor(statut) {
	const s = normalize(statut).toUpperCase()
	return (STATUS_STYLES[s] || STATUS_STYLES.EN_ATTENTE).border
}

/* =========================================================
 * UTILITAIRES
 * ========================================================= */
function shortName(name) {
	if (!name) return '—'
		const parts = String(name).split(/[\s,]+/).filter(Boolean)
		if (parts.length <= 2) return parts.join(' ')
			return `${parts[0]} ${parts[1]?.[0] || ''}.`
}

function isPastSlot(day, time) {
	if (day.iso < todayIso) return true
		if (day.iso > todayIso) return false
			const [hh, mm] = time.split(':').map(Number)
			const now = new Date()
			return hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes())
}

/* =========================================================
 * NAVIGATION SEMAINE
 * ========================================================= */
function shiftWeek(dir) {
	const next = new Date(weekStart.value)
	next.setDate(next.getDate() + dir * 7)
	weekStart.value = next
	animateTable()
}

function goToThisWeek() {
	weekStart.value = startOfWeek(new Date())
	animateTable()
}

/* =========================================================
 * CLIC SUR CELLULE
 * ========================================================= */
function onRdvClick(rdv) {
	if (!rdv) return
		selectedAppointment.value = rdv
		showDetailModal.value = true
		animateModal()
}

const currentWeekMondayIso = computed(() => toIso(weekStart.value))

function isDayInCurrentWeek(iso) {
	const dayIndex = weekDays.value.findIndex(d => d.iso === iso)
	return dayIndex !== -1
}

/* =========================================================
 * MODALES
 * ========================================================= */
const showDetailModal = ref(false)
const showEditModal = ref(false)
const showTicketModal = ref(false)
const selectedAppointment = ref(null)
const isSavingEdit = ref(false)

function openEditFromDetail() {
	showDetailModal.value = false
	showEditModal.value = true
}

function closeDetail() {
	showDetailModal.value = false
	selectedAppointment.value = null
}

function closeEdit() {
	if (isSavingEdit.value) return
		showEditModal.value = false
		selectedAppointment.value = null
}

/* =========================================================
 * CHARGEMENT
 * ========================================================= */
async function fetchAppointments() {
	isLoading.value = true
	loadError.value = ''
	try {
		const response = await api.get('/rendez-vous')
		appointments.value = Array.isArray(response.data.data) ? response.data.data : []
	} catch (err) {
		loadError.value = err.response?.data?.message || err.message || 'Une erreur est survenue'
	} finally {
		isLoading.value = false
		await nextTick()
		animateTable()
	}
}

/* =========================================================
 * SOCKET TEMPS RÉEL
 * ========================================================= */
function handleRdvCreated(rdv) {
	playSound('success')
	appointments.value.unshift(rdv)
}

function handleRdvUpdated(rdv) {
	playSound('update')
	const index = appointments.value.findIndex(item => item.id_rdv === rdv.id_rdv)
	if (index !== -1) {
		appointments.value[index] = { ...appointments.value[index], ...rdv }
	} else {
		appointments.value.unshift(rdv)
	}
}

onMounted(() => {
	connectSocket()
	socket.on('rdv:created', handleRdvCreated)
	socket.on('rdv:updated', handleRdvUpdated)
	fetchAppointments()
})

onUnmounted(() => {
	socket.off('rdv:created', handleRdvCreated)
	socket.off('rdv:updated', handleRdvUpdated)
})

/* =========================================================
 * ACTIONS
 * ========================================================= */
const saveEdit = async (formData) => {
	if (!selectedAppointment.value) return
		isSavingEdit.value = true
		try {
			const id = selectedAppointment.value.id_rdv
			const response = await api.patch(`/rendez-vous/${id}`, formData)
			if (!response.data?.success) throw new Error(response.data?.message || 'Impossible de modifier.')
				showEditModal.value = false
				selectedAppointment.value = null
				await fetchAppointments()
				toast.success('Rendez-vous modifié')
		} catch (error) {
			toast.error(error.response?.data?.message || error.message || 'Erreur lors de la modification.')
		} finally {
			isSavingEdit.value = false
		}
}

const cancelAppointment = async (appointment) => {
	if (!appointment?.id_rdv) return
		const nom = appointment.contribuable?.nom_raison_sociale || 'ce contribuable'
		if (!window.confirm(`Voulez-vous vraiment annuler le rendez-vous de ${nom} ?`)) return
			try {
				const response = await api.patch(`/rendez-vous/${appointment.id_rdv}/annuler`)
				if (!response.data?.success) throw new Error(response.data?.message || 'Impossible d\'annuler.')
					closeDetail()
					await fetchAppointments()
					toast.success('Rendez-vous annulé')
			} catch (error) {
				toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'annulation.')
			}
}

const confirmAppointment = async (appointment) => {
	if (!appointment?.id_rdv) return
		const nom = appointment.contribuable?.nom_raison_sociale || 'ce contribuable'
		if (!window.confirm(`Confirmer le rendez-vous de ${nom} ?`)) return
			
			try {
				const response = await api.patch(`/rendez-vous/${appointment.id_rdv}/confirmer`)
				if (!response.data?.success) throw new Error(response.data?.message || 'Impossible de confirmer.')
					
					const rdv = response.data.data
					const ticket = response.data.ticket
					
					closeDetail()
					await fetchAppointments()
					
					// ✅ Si un ticket a été généré par le backend, on l'affiche
					if (ticket?.numero_ticket) {
						ticketCreated.value = {
							numero_ticket: ticket.numero_ticket,
							date_ticket: String(rdv.date_rdv || appointment.date_rdv || '').slice(0, 10),
							heure_ticket: String(rdv.heure_rdv || appointment.heure_rdv || '').slice(0, 5),
							contribuable: appointment.contribuable,
							service: appointment.service,
							statut: ticket.statut_ticket || 'RESERVE'
						}
						showTicketModal.value = true
						await nextTick()
						animateModal()
						// Impression automatique après confirmation
						await printTicket()
					} else {
						toast.success('Rendez-vous confirmé')
					}
			} catch (error) {
				toast.error(error.response?.data?.message || error.message || 'Erreur lors de la confirmation.')
			}
}

const markAbsent = async (appointment) => {
	if (!appointment?.id_rdv) return
		if (!window.confirm(`Marquer ${appointment.contribuable?.nom_raison_sociale || 'ce contribuable'} comme absent ?`)) return
			try {
				const response = await api.patch(`/rendez-vous/${appointment.id_rdv}/absent`)
				if (!response.data?.success) throw new Error(response.data?.message || 'Impossible.')
					closeDetail()
					await fetchAppointments()
					toast.success('Marqué absent')
			} catch (error) {
				toast.error(error.response?.data?.message || error.message || 'Erreur.')
			}
}

const checkinAppointment = async (appointment) => {
	if (!appointment?.id_rdv) return
		try {
			const response = await api.patch(`/rendez-vous/${appointment.id_rdv}/checkin`)
			if (!response.data?.success) throw new Error(response.data?.message || 'Impossible.')
				closeDetail()
				await fetchAppointments()
				toast.success('Présence enregistrée')
		} catch (error) {
			toast.error(error.response?.data?.message || error.message || 'Erreur.')
		}
}

/* =========================================================
 * TICKET
 * ========================================================= */
const ticketCreated = ref(null)
const isPrinting = ref(false)

function closeTicketModal() {
	showTicketModal.value = false
	ticketCreated.value = null
}

async function printTicket() {
	if (!ticketCreated.value) return
		isPrinting.value = true
		try {
			if (!window.electronAPI?.printTicket) {
				toast.warning('Ouvre l\'application desktop pour imprimer.')
				return
			}
			await window.electronAPI.printTicket({
				numero: ticketCreated.value.numero_ticket,
				html: document.getElementById('ticket-print-area')?.innerHTML
			})
		} catch (err) {
			if (/cancel/i.test(err?.message || '')) return
				toast.error(err?.message || 'Impression impossible')
		} finally {
			isPrinting.value = false
		}
}

async function printExistingTicket(appointment) {
	ticketCreated.value = {
		numero_ticket: appointment.ticket?.numero_ticket || '—',
		date_ticket: String(appointment.date_rdv || '').slice(0, 10),
		heure_ticket: String(appointment.heure_rdv || '').slice(0, 5),
		contribuable: appointment.contribuable,
		service: appointment.service,
		statut: appointment.ticket?.statut_ticket || 'RESERVE'
	}
	showTicketModal.value = true
	await nextTick()
	await printTicket()
}

/* =========================================================
 * ANIMATIONS
 * ========================================================= */
function animateTable() {
	nextTick(() => {
		gsap.from('.week-table tbody tr', {
			y: 8,
			opacity: 0,
			duration: 0.3,
			stagger: 0.015,
			ease: 'power2.out',
			overwrite: true
		})
	})
}

function animateModal() {
	nextTick(() => {
		gsap.from('.modal-content-anim', {
			scale: 0.95,
			opacity: 0,
			duration: 0.25,
			ease: 'power2.out',
			overwrite: true
		})
	})
}

/* =========================================================
 * WATCH
 * ========================================================= */
watch([activeFilter, searchQuery], () => {
	animateTable()
})
</script>

<style scoped>
/* ========================================================= */
/* BASE                                                      */
/* ========================================================= */
.rdv-week-view {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px 24px;
	width: 100%;
	min-width: 0;
	overflow-y: auto;
	background: var(--bg);
}

/* ========================================================= */
/* TOP BAR                                                   */
/* ========================================================= */
.top-bar {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.top-actions { flex-shrink: 0; }

.btn-primary {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 10px 18px;
	border-radius: 10px;
	background: var(--primary);
	color: #fff;
	font-size: 13.5px;
	font-weight: 700;
	text-decoration: none;
	transition: all .2s;
	box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
}
.btn-primary:hover { transform: translateY(-1px); opacity: .92; }

.btn-secondary {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 10px 18px;
	border-radius: 10px;
	background: transparent;
	border: 1px solid var(--primary);
	color: var(--primary);
	font-size: 13.5px;
	font-weight: 700;
	text-decoration: none;
	transition: all .2s;
}
.btn-secondary:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }

.filters {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.filter-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 999px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text-muted);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: all .2s;
	white-space: nowrap;
}
.filter-chip:hover { border-color: var(--primary); color: var(--text); }
.filter-chip.is-active {
	color: #fff;
	border-color: transparent;
}
.filter-dot {
	width: 8px; height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.search-box {
	position: relative;
	flex: 1 1 240px;
	min-width: 200px;
	display: flex;
	align-items: center;
}
.search-box > svg {
	position: absolute;
	left: 12px;
	color: var(--text-muted);
	pointer-events: none;
}
.search-input {
	width: 100%;
	padding: 9px 36px 9px 38px;
	border-radius: 10px;
	border: 1px solid var(--border);
	background: var(--bg);
	color: var(--text);
	font-size: 13.5px;
	outline: none;
	transition: all .2s;
}
.search-input:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
	background: var(--card);
}
.search-clear {
	position: absolute;
	right: 8px;
	padding: 4px;
	border: 0;
	background: transparent;
	color: var(--text-muted);
	cursor: pointer;
	border-radius: 6px;
}
.search-clear:hover { background: var(--hover); color: var(--text); }

/* ========================================================= */
/* WEEK BAR                                                  */
/* ========================================================= */
.week-bar {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 12px;
}
.week-nav {
	width: 38px; height: 38px;
	display: grid;
	place-items: center;
	border-radius: 10px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	cursor: pointer;
	transition: all .2s;
}
.week-nav:hover {
	background: var(--hover);
	color: var(--primary);
	border-color: var(--primary);
}
.week-label {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	flex: 1;
}
.week-label strong {
	font-size: 15px;
	font-weight: 800;
	color: var(--text);
	text-transform: capitalize;
}
.link-btn {
	border: 0;
	background: none;
	color: var(--primary);
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}
.link-btn:hover { text-decoration: underline; }
.week-stats { flex-shrink: 0; }
.stat-pill {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--primary) 10%, transparent);
	color: var(--primary);
	font-size: 12px;
	font-weight: 700;
}
.stat-count {
	font-size: 15px;
	font-weight: 900;
}

/* ========================================================= */
/* QUICK JUMP                                                */
/* ========================================================= */
.quick-jump {
	padding: 14px 16px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 12px;
}
.quick-jump-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
	flex-wrap: wrap;
}
.quick-jump-header h3 {
	margin: 0;
	font-size: 14px;
	font-weight: 800;
	color: var(--text);
}
.quick-jump-header p {
	margin: 3px 0 0;
	font-size: 11.5px;
	color: var(--text-muted);
}
.btn-next-rdv {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	border-radius: 10px;
	border: 1px solid var(--primary);
	background: color-mix(in srgb, var(--primary) 8%, transparent);
	color: var(--primary);
	font-size: 12.5px;
	font-weight: 700;
	cursor: pointer;
	transition: all .2s;
}
.btn-next-rdv:hover {
	background: var(--primary);
	color: #fff;
	transform: translateY(-1px);
}

.quick-jump-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
	gap: 6px;
}
.qj-day {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 8px 4px;
	border-radius: 10px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	cursor: pointer;
	transition: all .15s;
	font-family: inherit;
}
.qj-day:hover {
	border-color: var(--primary);
	background: var(--hover);
	transform: translateY(-1px);
}
.qj-day.is-today {
	border-color: var(--primary);
	background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.qj-day.is-weekend {
	opacity: 0.55;
}
.qj-day.has-rdv {
	font-weight: 700;
}
.qj-label {
	font-size: 11px;
	text-transform: capitalize;
	color: var(--text-muted);
}
.qj-count {
	font-size: 14px;
	font-weight: 900;
	color: var(--primary);
	font-variant-numeric: tabular-nums;
}
.qj-count-empty {
	font-size: 14px;
	color: var(--text-muted);
	opacity: 0.4;
}

/* ========================================================= */
/* JOUR SÉLECTIONNÉ DANS LE MINI-CALENDRIER                  */
/* ========================================================= */
.qj-day.is-selected {
	border-color: var(--primary);
	background: color-mix(in srgb, var(--primary) 18%, var(--card));
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent);
	transform: translateY(-1px);
}

.qj-day.is-selected .qj-label {
	color: var(--primary);
	font-weight: 800;
}

.qj-day.is-selected .qj-count {
	color: var(--primary);
	font-weight: 900;
}

/* Un jour à la fois "aujourd'hui" ET "sélectionné" :
 *  on garde le style sélectionné mais avec un point bleu */
.qj-day.is-today.is-selected {
	background: linear-gradient(
		135deg,
		color-mix(in srgb, var(--primary) 22%, var(--card)),
								color-mix(in srgb, var(--primary) 12%, var(--card))
	);
}

.qj-day.is-today.is-selected .qj-label::before {
	content: '● ';
	color: var(--primary);
	font-size: 8px;
	vertical-align: middle;
}

/* ========================================================= */
/* RDV MULTI (badge +N)                                      */
/* ========================================================= */
.rdv-multi {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	height: 100%;
	border-radius: 7px;
	cursor: pointer;
	transition: all .15s;
	position: relative;
}
.rdv-multi:hover {
	transform: scale(1.05);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	z-index: 5;
}
.multi-count {
	font-size: 16px;
	font-weight: 900;
	line-height: 1;
}
.multi-label {
	font-size: 9px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .04em;
	opacity: 0.8;
}

/* ========================================================= */
/* MODALE MULTI                                              */
/* ========================================================= */
.multi-modal {
	width: min(520px, 100%);
}
.multi-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border-radius: 10px;
	border: 1px solid;
	background: var(--card);
	cursor: pointer;
	text-align: left;
	transition: all .15s;
	font-family: inherit;
	width: 100%;
}
.multi-item:hover {
	transform: translateX(3px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.mi-time {
	font-size: 14px;
	font-weight: 900;
	font-variant-numeric: tabular-nums;
	padding: 6px 10px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.4);
	flex-shrink: 0;
}
.mi-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
.mi-nif {
	font-size: 13px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}
.mi-name {
	font-size: 11.5px;
	opacity: 0.85;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.mi-service {
	font-size: 10.5px;
	opacity: 0.6;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.mi-status {
	font-size: 10px;
	font-weight: 800;
	padding: 3px 8px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.5);
	flex-shrink: 0;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.modal-body {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px 20px;
	max-height: 60vh;
	overflow-y: auto;
}

/* ========================================================= */
/* ÉTATS                                                     */
/* ========================================================= */
.loading-state, .error-state, .empty-week {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 60px 20px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 14px;
	color: var(--text-muted);
	font-size: 13.5px;
}
.spinner {
	width: 32px; height: 32px;
	border: 3px solid var(--border);
	border-top-color: var(--primary);
	border-radius: 50%;
	animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state { color: #ef4444; }

/* ========================================================= */
/* TABLEAU SEMAINE                                           */
/* ========================================================= */
.table-wrapper {
	width: 100%;
	overflow-x: auto;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 14px;
}
.week-table {
	width: 100%;
	min-width: 780px;
	border-collapse: separate;
	border-spacing: 0;
	font-size: 12px;
	table-layout: fixed;
}
.week-table th, .week-table td {
	border-right: 1px solid var(--border);
	border-bottom: 1px solid var(--border);
	text-align: center;
	padding: 0;
}
.week-table thead th {
	position: sticky;
	top: 0;
	z-index: 2;
	background: var(--hover);
	padding: 10px 4px;
	font-weight: 700;
	color: var(--text-muted);
}
.week-table thead th.today {
	background: color-mix(in srgb, var(--primary) 12%, var(--hover));
	color: var(--text);
}
.week-table thead th.past {
	opacity: 0.6;
}
.time-col {
	width: 68px;
	position: sticky;
	left: 0;
	z-index: 3;
	background: var(--hover);
	color: var(--text-muted);
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}
tbody .time-col {
	z-index: 1;
	height: 52px;
	background: var(--card);
	font-size: 12px;
}
.day-name {
	display: block;
	text-transform: capitalize;
	font-size: 11px;
}
.day-num {
	display: block;
	color: var(--text);
	font-size: 12.5px;
	font-weight: 800;
	margin-top: 2px;
}
.today-pill {
	display: inline-block;
	margin-top: 4px;
	padding: 1px 6px;
	border-radius: 999px;
	background: var(--primary);
	color: #fff;
	font-size: 9px;
	font-weight: 700;
}

.slot-cell {
	position: relative;
	padding: 4px !important;
	height: 52px;
	cursor: pointer;
	transition: background .15s;
}
.slot-cell:hover {
	background: color-mix(in srgb, var(--primary) 6%, transparent);
}
.slot-cell.is-past {
	background: color-mix(in srgb, var(--text-muted) 5%, transparent);
}

.rdv-chip {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 2px;
	padding: 6px 8px;
	border-radius: 7px;
	height: 100%;
	text-align: left;
	overflow: hidden;
	transition: all .15s;
	cursor: pointer;
}
.rdv-chip:hover {
	transform: scale(1.02);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.rdv-nif {
	font-size: 11.5px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}
.rdv-name {
	font-size: 10px;
	font-weight: 500;
	opacity: 0.75;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}
.empty-mark {
	color: var(--text-muted);
	font-size: 18px;
	opacity: 0.25;
}

.week-table thead th.is-selected-day {
	background: linear-gradient(
		180deg,
		color-mix(in srgb, var(--primary) 18%, var(--hover)),
								color-mix(in srgb, var(--primary) 8%, var(--hover))
	);
	color: var(--primary);
	font-weight: 800;
}

/* La colonne du jour (toutes les cellules) prend une légère teinte */
.week-table tbody td.is-selected-column {
	background: color-mix(in srgb, var(--primary) 3%, transparent);
}

.week-table tbody tr:hover td.is-selected-column {
	background: color-mix(in srgb, var(--primary) 6%, transparent);
}

/* ========================================================= */
/* CHIP RDV AMÉLIORÉ (avec heure exacte)                     */
/* ========================================================= */
.rdv-chip {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 1px;
	padding: 5px 7px;
	border-radius: 6px;
	height: 100%;
	text-align: left;
	overflow: hidden;
	cursor: pointer;
	transition: all .15s;
}
.rdv-chip:hover {
	transform: scale(1.03);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	z-index: 5;
}

/* Heure exacte du RDV (peut différer du créneau) */
.rdv-time {
	font-size: 10.5px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	letter-spacing: .02em;
	color: inherit;
	opacity: 0.95;
}

.rdv-nif {
	font-size: 11px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}
.rdv-name {
	font-size: 9.5px;
	font-weight: 500;
	opacity: 0.75;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}

/* ========================================================= */
/* SECTION HORS SEMAINE                                       */
/* ========================================================= */
.outside-week-section {
	margin-top: 4px;
	padding: 16px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 14px;
}
.outside-week-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-bottom: 14px;
	flex-wrap: wrap;
}
.outside-week-header h3 {
	margin: 0;
	font-size: 15px;
	font-weight: 800;
	color: var(--text);
}
.outside-week-header p {
	margin: 3px 0 0;
	font-size: 12px;
	color: var(--text-muted);
}
.outside-week-badges {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}
.badge-future, .badge-past {
	padding: 5px 12px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 700;
	white-space: nowrap;
}
.badge-future {
	background: color-mix(in srgb, var(--primary) 12%, transparent);
	color: var(--primary);
}
.badge-past {
	background: color-mix(in srgb, #94a3b8 15%, transparent);
	color: #64748b;
}
.outside-week-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 8px;
}
.outside-week-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid;
	background: var(--card);
	cursor: pointer;
	text-align: left;
	transition: all .15s;
	font-family: inherit;
}
.outside-week-item:hover {
	transform: translateX(2px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.owi-date {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 1px;
	flex-shrink: 0;
}
.owi-date strong {
	font-size: 12px;
	font-weight: 800;
	color: inherit;
}
.owi-date span {
	font-size: 10.5px;
	font-weight: 600;
	opacity: 0.75;
}
.owi-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
}
.owi-nif {
	font-size: 12px;
	font-weight: 800;
	color: inherit;
	font-variant-numeric: tabular-nums;
}
.owi-name {
	font-size: 10.5px;
	opacity: 0.7;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.owi-arrow {
	font-size: 14px;
	opacity: 0.5;
	flex-shrink: 0;
}
.owi-more {
	grid-column: 1 / -1;
	margin: 8px 0 0;
	font-size: 12px;
	color: var(--text-muted);
	text-align: center;
	font-style: italic;
}

/* ========================================================= */
/* LÉGENDE                                                   */
/* ========================================================= */
.legend {
	display: flex;
	flex-wrap: wrap;
	gap: 12px 20px;
	padding: 12px 16px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 12px;
	font-size: 12px;
	color: var(--text-muted);
}
.legend-item {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
}
.legend-dot {
	width: 10px; height: 10px;
	border-radius: 3px;
	flex-shrink: 0;
}

/* ========================================================= */
/* RESPONSIVE                                                */
/* ========================================================= */
@media (max-width: 900px) {
	.top-bar { flex-direction: column; align-items: stretch; }
	.top-actions { width: 100%; }
	.btn-primary { width: 100%; justify-content: center; }
	.search-box { width: 100%; }
	.week-table { min-width: 600px; }
	.time-col { width: 54px; }
	tbody .time-col { height: 46px; font-size: 11px; }
	.slot-cell { height: 46px; }
	.rdv-nif { font-size: 10.5px; }
	.rdv-name { display: none; }
}
</style>
