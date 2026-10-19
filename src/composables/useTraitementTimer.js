import { computed, onUnmounted, ref, watch } from 'vue'
import { playSound } from '@/services/sonnerie'

function storageKey(id) {
	return `traitement_start_${id}`
}

function fmt(ms) {
	const abs = Math.max(0, Math.floor(ms / 1000))
	const m = Math.floor(abs / 60)
	const s = abs % 60
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playSound3() {
	playSound('warning')
	setTimeout(() => playSound('warning'), 400)
	setTimeout(() => playSound('warning'), 800)
}

export function useTraitementTimer(ticketRef) {
	const now = ref(Date.now())
	const bipFait = ref(false)
	let tick = null
	
	function dureeMin() {
		const n = Number(ticketRef.value?.duree_estimee_min)
		return Number.isFinite(n) && n > 0 ? n : 15
	}
	
	function startMs() {
		const t = ticketRef.value
		if (!t || t.statut_ticket !== 'EN_COURS') return null
			const stored = Number(localStorage.getItem(storageKey(t.id_ticket)))
			if (stored) return stored
				return Date.now()
	}
	
	function marquerDebut(id_ticket) {
		localStorage.setItem(storageKey(id_ticket), String(Date.now()))
		bipFait.value = false
		playSound('update')
	}
	
	function oublier(id_ticket) {
		if (id_ticket) localStorage.removeItem(storageKey(id_ticket))
			bipFait.value = false
	}
	
	const elapsedMs = computed(() => {
		const start = startMs()
		if (start == null) return null
			return Math.max(0, now.value - start)
	})
	
	const budgetMs = computed(() => dureeMin() * 60_000)
	
	const pct = computed(() => {
		if (elapsedMs.value == null) return 0
			return (elapsedMs.value / budgetMs.value) * 100
	})
	
	const zone = computed(() => {
		if (pct.value > 100) return 'rouge'
			if (pct.value >= 80) return 'orange'
				return 'vert'
	})
	
	const overtimeMs = computed(() =>
	elapsedMs.value == null ? 0 : Math.max(0, elapsedMs.value - budgetMs.value)
	)
	
	const label = computed(() =>
	elapsedMs.value == null ? '00:00' : fmt(elapsedMs.value)
	)
	
	function bilan() {
		const total = elapsedMs.value || 0
		return {
			total,
			overtime: overtimeMs.value,
			labelTotal: fmt(total),
			labelOvertime: fmt(overtimeMs.value)
		}
	}
	
	watch(
		() => ticketRef.value && `${ticketRef.value.id_ticket}:${ticketRef.value.statut_ticket}`,
		  () => {
			  clearInterval(tick)
			  if (ticketRef.value?.statut_ticket === 'EN_COURS') {
				  tick = setInterval(() => { now.value = Date.now() }, 250)
				  now.value = Date.now()
			  }
		  },
	   { immediate: true }
	)
	
	watch(pct, (p) => {
		if (p >= 100 && !bipFait.value && ticketRef.value?.statut_ticket === 'EN_COURS') {
			bipFait.value = true
			playSound3()
		}
	})
	
	onUnmounted(() => clearInterval(tick))
	
	return {
		dureeMin,
		elapsedMs,
		pct,
		zone,
		overtimeMs,
		label,
		marquerDebut,
		oublier,
		bilan,
		fmt
	}
}
