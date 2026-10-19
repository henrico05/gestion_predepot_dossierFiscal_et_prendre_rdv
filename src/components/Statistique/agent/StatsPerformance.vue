<script setup>
import { computed, nextTick, onMounted,onBeforeUnmount, ref, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import gsap from 'gsap'
import VueApexCharts from 'vue3-apexcharts'
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'
import { socket } from '@/services/socket' 

const toast = useToast()

/* ============================================================
 * RÔLE UTILISATEUR
 * ============================================================ */
function getUser() {
	try {
		const raw =
		localStorage.getItem('currentUser') ||
		sessionStorage.getItem('currentUser')
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

const user = ref(getUser())
const role = computed(() => (user.value?.role || '').toUpperCase())

/* ============================================================
 * TABS AUTORISÉS PAR RÔLE
 * ============================================================ */
const ALL_TABS = [
	{ key: 'rdv',      label: 'Rendez-vous' },
{ key: 'dossiers', label: 'Dossiers' },
{ key: 'tickets',  label: 'Tickets' }
]

const tabs = computed(() => {
	switch (role.value) {
		case 'CHEF_CENTRE':  return ALL_TABS
		case 'GUICHETIER':   return ALL_TABS.filter(t => t.key === 'tickets')
		case 'VERIFICATEUR': return ALL_TABS.filter(t => t.key === 'dossiers')
		default:             return []
	}
})

function defaultTabForRole() {
	switch (role.value) {
		case 'GUICHETIER':   return 'tickets'
		case 'VERIFICATEUR': return 'dossiers'
		default:             return 'rdv'
	}
}

const active = ref(defaultTabForRole())

watch(tabs, (newTabs) => {
	if (!newTabs.length) return
		const keys = newTabs.map(t => t.key)
		if (!keys.includes(active.value)) {
			active.value = keys[0]
		}
}, { immediate: true })

/* ============================================================
 * PÉRIODE — Année / Trimestre / Mois
 * ============================================================ */
const PERIODES = [
	{ key: 'annee',     label: 'Année' },
{ key: 'trimestre', label: 'Trimestre' },
{ key: 'mois',      label: 'Mois' }
]

/* Le GUICHETIER ne voit que Trimestre/Mois (données plus courtes, plus utiles) */
/* Le VERIFICATEUR idem */
/* Le CHEF voit tout */
const periodesDisponibles = computed(() => {
	switch (role.value) {
		case 'CHEF_CENTRE':
			return PERIODES
		case 'GUICHETIER':
		case 'VERIFICATEUR':
			return PERIODES.filter(p => p.key !== 'annee')
		default:
			return []
	}
})

const periode = ref(
	periodesDisponibles.value?.[0]?.key || 'annee'
)

/* Si le rôle change et que la période n'est plus valide, on bascule */
watch(periodesDisponibles, (list) => {
	if (!list.length) return
		const keys = list.map(p => p.key)
		if (!keys.includes(periode.value)) {
			periode.value = keys[0]
		}
}, { immediate: true })

/* ============================================================
 * VUE "MES STATS PERSONNELLES" (GUICHETIER uniquement)
 * ============================================================ */
const mesStatsOnly = ref(role.value === 'GUICHETIER')

/* On ne peut activer cette vue que pour GUICHETIER */
const peutFiltrerParAgent = computed(() => role.value === 'GUICHETIER')

/* ============================================================
 * PALETTE (inchangée)
 * ============================================================ */
const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
const palette = { rdv: '#5eebc4', dossiers: '#818cf8', tickets: '#f472b6' }

/* Labels selon la période */
const categoriesActuelles = computed(() => {
	switch (periode.value) {
		case 'mois':      return ['S1', 'S2', 'S3', 'S4']  // 4 semaines
		case 'trimestre': return ['M1', 'M2', 'M3']         // 3 mois
		case 'annee':
		default:          return months                     // 12 mois
	}
})

/* ============================================================
 * DONNÉES
 * ============================================================ */
const data = ref({
	series: {
		rdv:      [],
		dossiers: [],
		tickets:  []
	},
	kpis: { rdv: 0, dossiers: 0, tickets: 0 },
	sparks: {
		rdv:      [],
		dossiers: [],
		tickets:  []
	}
})

/* Renvoie la série tronquée selon la période */
function seriePourPeriode(serie) {
	switch (periode.value) {
		case 'mois':
			/* 4 dernières valeurs = 4 semaines */
			return serie.slice(-4)
		case 'trimestre':
			/* 3 dernières valeurs = 3 mois */
			return serie.slice(-3)
		case 'annee':
		default:
			return serie
	}
}

/* ============================================================
 * GRAPHIQUE PRINCIPAL
 * ============================================================ */
const mainSeries = computed(() => [{
	name: tabs.value.find(t => t.key === active.value)?.label || '',
							data: seriePourPeriode(data.value.series[active.value] || [])
}])

const mainOptions = computed(() => ({
	chart: {
		id: 'main-chart',
		toolbar: { show: false },
		zoom: { enabled: false },
		background: 'transparent',
		foreColor: 'var(--text-muted)',
			animations: { enabled: true, easing: 'easeinout', speed: 900 }
	},
	colors: [palette[active.value]],
	dataLabels: { enabled: false },
	stroke: { curve: 'smooth', width: 3 },
	fill: {
		type: 'gradient',
		gradient: {
			shadeIntensity: 0.4,
			opacityFrom: 0.35,
			opacityTo: 0.02,
			stops: [0, 90, 100]
		}
	},
	markers: {
		size: 5,
		colors: [palette[active.value]],
		strokeColors: 'var(--card)',
									strokeWidth: 3
	},
	grid: {
		borderColor: 'var(--border)',
									xaxis: { lines: { show: true } },
									yaxis: { lines: { show: false } }
	},
	xaxis: {
		categories: categoriesActuelles.value,
		axisBorder: { show: false },
		axisTicks: { show: false },
		labels: {
			style: {
				colors: 'var(--text-muted)',
									fontSize: '11px',
									fontWeight: 600
			}
		}
	},
	yaxis: {
		labels: {
			style: {
				colors: 'var(--text-muted)',
									fontSize: '11px'
			}
		}
	},
	tooltip: { theme: 'dark' }
}))

/* ============================================================
 * SPARKLINE (inchangée)
 * ============================================================ */
function spark(color, type) {
	return {
		chart: {
			sparkline: { enabled: true },
			toolbar: { show: false },
			animations: { enabled: true, speed: 1100 }
		},
		colors: [color],
		stroke: { curve: 'smooth', width: type === 'bar' ? 0 : 3 },
		fill: type === 'bar'
		? { opacity: 1 }
		: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
		plotOptions: type === 'bar'
		? { bar: { columnWidth: '42%', borderRadius: 5, distributed: true } }
		: {},
		markers: type === 'line' ? { size: 4, strokeWidth: 0 } : { size: 0 },
		tooltip: { enabled: false }
	}
}

/* ============================================================
 * KPIs — filtrés par rôle
 * ============================================================ */
const ALL_KPIS = [
	{ key: 'rdv',      label: 'Total rendez-vous',  icon: '🔔', chart: 'area', color: '#5eebc4', chartType: 'area' },
{ key: 'dossiers', label: 'Dossiers traités',   icon: '📁', chart: 'bar',  color: '#6366f1', chartType: 'bar' },
{ key: 'tickets',  label: 'Tickets honorés',    icon: '✈️', chart: 'line', color: '#f472b6', chartType: 'line' }
]

const kpis = computed(() => {
	const autorisees = tabs.value.map(t => t.key)
	
	return ALL_KPIS
	.filter(k => autorisees.includes(k.key))
	.map(k => ({
		key: k.key,
		label: mesStatsOnly.value
		? `Mes ${k.label.toLowerCase()}`
		: k.label,
		icon: k.icon,
		value: data.value.kpis[k.key],
		chart: k.chart,
		series: [{ data: data.value.sparks[k.key] }],
		// ⭐ CORRECTIF : l'ancien code forçait ['#38bdf8', '#6366f1'] sur
		// TOUTES les barres (via plotOptions.bar.distributed), sans lien
		// avec k.color ni avec la couleur du graphique principal — on
		// garde désormais la couleur propre à chaque KPI.
		options: spark(k.color, k.chartType)
	}))
})

/* ============================================================
 * EXPORT CSV
 * ============================================================ */
function exporterCSV() {
	try {
		if (!tabs.value.length) {
			toast.warning('Aucune donnée à exporter.')
			return
		}
		
		const currentTab = tabs.value.find(t => t.key === active.value)
		const serie = seriePourPeriode(data.value.series[active.value] || [])
		const cats = categoriesActuelles.value
		
		/* Lignes CSV */
		const lignes = [
			['Type', 'Période', 'Valeur'],
			...cats.map((cat, i) => [
				currentTab?.label || active.value,
			   cat,
			   String(serie[i] ?? 0)
			])
		]
		
		/* Ajout d'un résumé */
		lignes.push(['', '', ''])
		lignes.push(['Total', '', String(serie.reduce((a, b) => a + b, 0))])
		lignes.push(['Moyenne', '', String(Math.round(serie.reduce((a, b) => a + b, 0) / serie.length))])
		
		/* Ajout du contexte */
		lignes.push(['', '', ''])
		lignes.push(['Rôle', role.value])
		lignes.push(['Période', periode.value])
		lignes.push(['Vue personnelle', mesStatsOnly.value ? 'Oui' : 'Non'])
		lignes.push(['Exporté le', new Date().toLocaleString('fr-FR')])
		
		/* Génération du CSV */
		const csv = lignes
		.map(ligne => ligne.map(cell => {
			const s = String(cell ?? '')
			/* Échappement : si contient ; " \n, on entoure de guillemets */
			if (s.includes(';') || s.includes('"') || s.includes('\n')) {
				return `"${s.replace(/"/g, '""')}"`
			}
			return s
		}).join(';'))
		.join('\n')
		
		/* BOM UTF-8 pour Excel */
		const blob = new Blob(['\uFEFF' + csv], {
			type: 'text/csv;charset=utf-8'
		})
		
		/* Téléchargement */
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		const date = new Date().toISOString().slice(0, 10)
		const typeLabel = currentTab?.key || active.value
		
		link.href = url
		link.download = `stats-${typeLabel}-${periode.value}-${date}.csv`
		link.click()
		
		URL.revokeObjectURL(url)
		
		toast.success('Export CSV téléchargé.')
	} catch (error) {
		console.error('❌ Erreur export :', error)
		toast.error('Impossible d\'exporter les données.')
	}
}

/* ============================================================
 * CHARGEMENT DES STATS
 * ============================================================ */
const isLoading = ref(false)

/* ⭐ CORRECTIF : ref sur la racine du composant, pour ne jamais animer des
 * éléments ".count" appartenant à un AUTRE composant monté ailleurs dans
 * la page (document.querySelectorAll cherchait dans toute la page). */
const statsRoot = ref(null)

async function loadStats() {
	isLoading.value = true
	try {
		
		const params = {
			role: role.value,
			periode: periode.value
		}
		
		if (mesStatsOnly.value && user.value?.id) {
			params.id_agent = user.value.id
			params.mes_stats = 'true'
		}
		
		const res = await api.get('/statistiques/dashboard', { params })
		const payload = res.data?.data || res.data
		
		/* ⭐ Remplacement complet : les valeurs par défaut sont écrasées */
		data.value = {
			series: {
				rdv:      payload?.series?.rdv      || [],
				dossiers: payload?.series?.dossiers || [],
				tickets:  payload?.series?.tickets  || []
			},
			kpis: {
				rdv:      payload?.kpis?.rdv      || 0,
				dossiers: payload?.kpis?.dossiers || 0,
				tickets:  payload?.kpis?.tickets  || 0
			},
			sparks: {
				rdv:      payload?.sparks?.rdv      || [],
				dossiers: payload?.sparks?.dossiers || [],
				tickets:  payload?.sparks?.tickets  || []
			}
		}
	} catch (e) {
		console.error('❌ Erreur stats :', e)
		
		/* ⭐ En cas d'erreur : vider les données au lieu de laisser la démo */
		data.value = {
			series: { rdv: [], dossiers: [], tickets: [] },
			kpis:   { rdv: 0,  dossiers: 0,  tickets: 0  },
			sparks: { rdv: [], dossiers: [], tickets: [] }
		}
		
		toast.error(
			e.response?.data?.message ||
			'Impossible de charger les statistiques.'
		)
	} finally {
		animateCounts()
		isLoading.value = false
	}
}

/* ============================================================
 * ANIMATION DES COMPTEURS
 * ============================================================ */
function animateCounts() {
	nextTick(() => {
		statsRoot.value?.querySelectorAll('.count').forEach((el) => {
			const obj = { n: 0 }
			const cible = Number(el.dataset.to) || 0
			gsap.to(obj, {
				n: cible,
				duration: 1.1,
				ease: 'power2.out',
				onUpdate: () => {
					el.textContent = Math.round(obj.n).toLocaleString('fr-FR')
				}
			})
		})
	})
}

/* ============================================================
 * WATCHERS
 * ============================================================ */
watch(active, () => {
	animateCounts()
})

watch(periode, () => {
	loadStats()
})

watch(mesStatsOnly, () => {
	loadStats()
})

/* ============================================================
 * SOCKET — temps réel
 * ============================================================ */
let debounceTimer = null

function rechargerStats() {
	if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			loadStats()
		}, 800)
}

onMounted(() => {
	loadStats()
	
	socket.on('stats:refresh', rechargerStats)
	socket.on('dossier:updated', rechargerStats)
	socket.on('file:refresh', rechargerStats)
	socket.on('guichet:updated', rechargerStats)
})

onBeforeUnmount(() => {
	if (debounceTimer) clearTimeout(debounceTimer)
		socket.off('stats:refresh', rechargerStats)
		socket.off('dossier:updated', rechargerStats)
		socket.off('file:refresh', rechargerStats)
		socket.off('guichet:updated', rechargerStats)
})
</script>

<template>
<div ref="statsRoot" class="stats-page px-8 py-4 shrink-0">

<!-- ============================================================
* HERO + FILTRES
* ============================================================ -->
<Motion
class="hero-card"
:initial="{ opacity: 0, y: 18 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.45 }"
>
<div class="hero-head">
<div class="hero-title">
<p class="kicker">Activité · {{ role.toLowerCase().replace('_', ' ') }}</p>
<h2>Performance</h2>
</div>

<div class="hero-controls">
<!-- ⭐ Filtre de période -->
<div v-if="periodesDisponibles.length" class="period-tabs">
<button
v-for="p in periodesDisponibles"
:key="p.key"
type="button"
:class="{ on: periode === p.key }"
@click="periode = p.key"
>
{{ p.label }}
</button>
</div>

<!-- ⭐ Toggle "Mes stats personnelles" (GUICHETIER) -->
<AnimatePresence>
<motion.label
v-if="peutFiltrerParAgent"
:initial="{ opacity: 0, scale: 0.9 }"
:animate="{ opacity: 1, scale: 1 }"
:exit="{ opacity: 0, scale: 0.9 }"
class="mes-stats-toggle"
>
<input
v-model="mesStatsOnly"
type="checkbox"
class="mes-stats-checkbox"
/>
<span class="mes-stats-label">Mes stats</span>
</motion.label>
</AnimatePresence>

<!-- ⭐ Bouton Export CSV -->
<button
class="btn-export"
:disabled="isLoading || !tabs.length"
@click="exporterCSV"
title="Exporter les données en CSV"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
</svg>
Export CSV
</button>

<!-- Onglets principaux (RDV / Dossiers / Tickets) -->
<div v-if="tabs.length > 1" class="tabs">
<button
v-for="tab in tabs"
:key="tab.key"
type="button"
:class="{ on: active === tab.key }"
@click="active = tab.key"
>
{{ tab.label }}
</button>
</div>
<div v-else-if="tabs.length === 1" class="tabs-single">
<span class="role-badge">
{{ tabs[0].label }}
</span>
</div>
</div>
</div>

<!-- Indicateur "Mes stats" actif -->
<AnimatePresence>
<motion.div
v-if="mesStatsOnly && peutFiltrerParAgent"
:initial="{ opacity: 0, height: 0 }"
:animate="{ opacity: 1, height: 'auto' }"
:exit="{ opacity: 0, height: 0 }"
class="mes-stats-banner"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
<span>
Vue personnelle activée — vous voyez uniquement vos données
</span>
</motion.div>
</AnimatePresence>

<div v-if="isLoading" class="chart-skeleton">
<div class="h-64 rounded-xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Graphique principal -->
<VueApexCharts
v-if="tabs.length > 0 && mainSeries[0]?.data?.some(v => v > 0)"
type="area"
height="280"
:options="mainOptions"
:series="mainSeries"
/>

<div
v-else-if="tabs.length > 0"
class="empty-chart"
>
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
</svg>
<p class="text-sm text-[var(--text-muted)] text-center">
Aucune donnée sur cette période
</p>
</div>
</Motion>

<!-- ============================================================
* KPI GRID
* ============================================================ -->
<div class="kpi-grid">
<Motion
v-for="(kpi, i) in kpis"
:key="kpi.key"
class="kpi-card"
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.08 * (i + 1) }"
>
<p class="kpi-label">{{ kpi.label }}</p>
<p class="kpi-value">
<span class="kpi-icon">{{ kpi.icon }}</span>
<span class="count" :data-to="kpi.value">0</span>
</p>
<VueApexCharts
:type="kpi.chart"
height="110"
:options="kpi.options"
:series="kpi.series"
/>
</Motion>
</div>
</div>
</template>

<style scoped>
.stats-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
	color: var(--text);
}

.hero-card,
.kpi-card {
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 18px;
	padding: 18px 18px 8px;
}

.hero-head {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 12px;
	padding: 0 8px 4px;
	align-items: flex-start;
}

.hero-title .kicker {
	margin: 0;
	font-size: 11px;
	color: var(--text-muted);
	text-transform: capitalize;
}

h2 {
	margin: 2px 0 0;
	font-size: 26px;
	font-weight: 700;
	letter-spacing: -0.03em;
}

/* Contrôles groupés à droite */
.hero-controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

/* =====================================================
 * FILTRE DE PÉRIODE
 * ===================================================== */
.period-tabs {
	display: inline-flex;
	padding: 3px;
	background: var(--bg);
	border: 1px solid var(--border);
	border-radius: 999px;
	gap: 2px;
}

.period-tabs button {
	border: none;
	background: transparent;
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
	padding: 5px 12px;
	border-radius: 999px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.period-tabs button:hover {
	color: var(--text);
}

.period-tabs button.on {
	background: var(--card);
	color: var(--text);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* =====================================================
 * TABS PRINCIPAUX (ton style d'origine)
 * ===================================================== */
.tabs {
	display: flex;
	gap: 8px;
}

.tabs button {
	border: 1px solid color-mix(in srgb, #a855f7 55%, var(--border));
	background: transparent;
	color: var(--text);
	font-size: 12px;
	font-weight: 700;
	padding: 6px 14px;
	border-radius: 999px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.tabs button:hover {
	border-color: #a855f7;
}

.tabs button.on {
	background: #a855f7;
	border-color: #a855f7;
	color: #fff;
}

/* Badge pour rôle à onglet unique */
.tabs-single {
	display: flex;
	align-items: center;
}

.role-badge {
	display: inline-flex;
	align-items: center;
	padding: 6px 14px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 700;
	color: var(--text-muted);
	background: var(--bg);
	border: 1px dashed var(--border);
}

/* =====================================================
 * TOGGLE "MES STATS"
 * ===================================================== */
.mes-stats-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	background: var(--bg);
	border: 1px solid var(--border);
	border-radius: 999px;
	cursor: pointer;
	user-select: none;
	transition: all 0.2s ease;
}

.mes-stats-toggle:hover {
	border-color: var(--primary);
}

.mes-stats-checkbox {
	width: 14px;
	height: 14px;
	accent-color: var(--primary);
	cursor: pointer;
}

.mes-stats-label {
	font-size: 11px;
	font-weight: 700;
	color: var(--text);
}

/* =====================================================
 * BOUTON EXPORT CSV
 * ===================================================== */
.btn-export {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 999px;
	border: 1px solid var(--border);
	background: var(--bg);
	color: var(--text);
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
	transition: all 0.2s ease;
}

.btn-export:hover:not(:disabled) {
	border-color: var(--primary);
	color: var(--primary);
	background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.btn-export:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* =====================================================
 * BANNIÈRE "MES STATS" ACTIF
 * ===================================================== */
.mes-stats-banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	margin: 4px 8px 8px;
	background: color-mix(in srgb, var(--primary) 8%, transparent);
	border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
	border-radius: 10px;
	color: var(--primary);
	font-size: 12px;
	font-weight: 600;
	overflow: hidden;
}

/* =====================================================
 * KPI GRID
 * ===================================================== */
.kpi-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
}

@media (min-width: 900px) {
	.kpi-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

/* Grille adaptative si peu de KPIs */
.kpi-grid:has(.kpi-card:only-child) {
	grid-template-columns: 1fr;
	max-width: 500px;
	margin: 0 auto;
	width: 100%;
}

.kpi-label {
	margin: 0;
	font-size: 12px;
	color: var(--text-muted);
}

.kpi-value {
	margin: 6px 0 8px;
	font-size: 28px;
	font-weight: 800;
	display: flex;
	align-items: center;
	gap: 8px;
}

.kpi-icon {
	font-size: 20px;
}
</style>
