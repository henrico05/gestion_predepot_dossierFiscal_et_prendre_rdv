<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { computed, nextTick, onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import gsap from 'gsap'
import VueApexCharts from 'vue3-apexcharts'
import api from '@/api/Axios'

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/* ============================================================
 * ÉTAT
 * ============================================================ */
const stats = ref({
	kpis:   { rdv: 8,  dossiers: 5,  tickets: 6,  pieces: 12 },
	mix:    { rdv: 8,  dossiers: 5,  tickets: 6 },
	rates:  { dossiers_envoyes: 72, rdv_confirmes: 88, pieces_validees: 54 },
	mensuel: {
		dossiers: [1, 0, 2, 1, 0, 1, 0, 2, 1, 0, 1, 2],
		rdv:      [0, 1, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1],
		tendance: [1, 1, 3, 3, 1, 1, 1, 3, 3, 1, 1, 3]
	}
})

const periodeActive = ref('12M')
const periodes = ['7J', '30J', '3M', '12M']

/* ============================================================
 * KPI CARDS (sidebar gauche)
 * ============================================================ */
const kpis = computed(() => [
	{
		key: 'dossiers',
		label: 'Dossiers',
		value: stats.value.kpis.dossiers,
		trend: '+12%',
		trendUp: true,
		icon: 'folder',
		gradient: 'from-blue-500 to-blue-700',
		ring: 'ring-blue-500/20'
	},
	{
		key: 'rdv',
		label: 'Rendez-vous',
		value: stats.value.kpis.rdv,
		trend: '+8%',
		trendUp: true,
		icon: 'calendar',
		gradient: 'from-violet-500 to-violet-700',
		ring: 'ring-violet-500/20'
	},
	{
		key: 'tickets',
		label: 'Tickets',
		value: stats.value.kpis.tickets,
		trend: '-3%',
		trendUp: false,
		icon: 'ticket',
		gradient: 'from-pink-500 to-pink-700',
		ring: 'ring-pink-500/20'
	},
	{
		key: 'pieces',
		label: 'Pièces',
		value: stats.value.kpis.pieces,
		trend: '+24%',
		trendUp: true,
		icon: 'file',
		gradient: 'from-emerald-500 to-emerald-700',
		ring: 'ring-emerald-500/20'
	}
])

/* ============================================================
 * DONUT
 * ============================================================ */
const donutSeries = computed(() => [
	stats.value.mix.rdv,
	stats.value.mix.dossiers,
	stats.value.mix.tickets
])

const totalMix = computed(() =>
donutSeries.value.reduce((a, b) => a + b, 0)
)

const donutOptions = computed(() => ({
	chart: {
		background: 'transparent',
		toolbar: { show: false },
		animations: { speed: 900 },
		fontFamily: 'inherit'
	},
	labels: ['Rendez-vous', 'Dossiers', 'Tickets'],
	colors: ['#8b5cf6', '#3b82f6', '#ec4899'],
	stroke: { width: 0 },
	dataLabels: { enabled: false },
	legend: {
		position: 'bottom',
		fontSize: '12px',
		fontWeight: 600,
		markers: { width: 8, height: 8, radius: 8 },
		itemMargin: { horizontal: 8, vertical: 4 },
		labels: { colors: 'var(--text-muted)' }
	},
	plotOptions: {
		pie: {
			donut: {
				size: '76%',
				labels: {
					show: true,
					name: { color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 },
									 value: { color: 'var(--text)', fontSize: '28px', fontWeight: 800 },
									 total: {
										 show: true,
									 label: 'Total',
									 color: 'var(--text-muted)',
									 fontSize: '12px',
									 fontWeight: 600,
									 formatter: () => totalMix.value
									 }
				}
			}
		}
	}
}))

/* ============================================================
 * RADIAL
 * ============================================================ */
const radialSeries = computed(() => [
	stats.value.rates.dossiers_envoyes,
	stats.value.rates.rdv_confirmes,
	stats.value.rates.pieces_validees
])

const radialOptions = {
	chart: {
		background: 'transparent',
		toolbar: { show: false },
		fontFamily: 'inherit'
	},
	labels: ['Dossiers', 'RDV', 'Pièces'],
	colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
	stroke: { lineCap: 'round' },
	plotOptions: {
		radialBar: {
			hollow: { size: '28%' },
			track: { background: 'var(--hover)', strokeWidth: '100%' },
			dataLabels: {
				name: { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' },
				value: { fontSize: '18px', fontWeight: 800, color: 'var(--text)', formatter: (v) => `${v}%` },
				total: {
					show: true,
					label: 'Global',
					color: 'var(--text-muted)',
					fontSize: '11px',
					fontWeight: 600,
					formatter: () => `${Math.round(radialSeries.value.reduce((a, b) => a + b, 0) / radialSeries.value.length)}%`
				}
			}
		}
	},
	legend: {
		show: true,
		position: 'bottom',
		fontSize: '11px',
		fontWeight: 600,
		markers: { width: 8, height: 8, radius: 8 },
		itemMargin: { horizontal: 6, vertical: 4 },
		labels: { colors: 'var(--text-muted)' }
	}
}

/* ============================================================
 * COMBO
 * ============================================================ */
const comboSeries = computed(() => [
	{ name: 'Dossiers',    type: 'column', data: stats.value.mensuel.dossiers },
	{ name: 'Rendez-vous', type: 'column', data: stats.value.mensuel.rdv },
	{ name: 'Tendance',    type: 'line',   data: stats.value.mensuel.tendance }
])

const comboOptions = {
	chart: {
		background: 'transparent',
		toolbar: { show: false },
		animations: { speed: 900 },
		fontFamily: 'inherit',
		stacked: false
	},
	colors: ['#3b82f6', '#8b5cf6', '#10b981'],
	stroke: { width: [0, 0, 3], curve: 'smooth' },
	plotOptions: {
		bar: { columnWidth: '50%', borderRadius: 6, borderRadiusApplication: 'end' }
	},
	markers: { size: [0, 0, 4], strokeWidth: 2, hover: { size: 6 } },
	grid: { borderColor: 'var(--border)', strokeDashArray: 3, padding: { left: 4, right: 4 } },
	xaxis: {
		categories: months,
		labels: { style: { colors: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 } },
		axisBorder: { show: false },
		axisTicks: { show: false }
	},
	yaxis: {
		labels: { style: { colors: 'var(--text-muted)', fontSize: '11px' }, formatter: (v) => Math.round(v) }
	},
	legend: {
		position: 'top',
		horizontalAlign: 'right',
		fontSize: '11px',
		fontWeight: 600,
		markers: { width: 8, height: 8, radius: 8 },
		labels: { colors: 'var(--text-muted)' }
	},
	tooltip: { shared: true, intersect: false }
}

/* ============================================================
 * ANIMATION COMPTEURS
 * ============================================================ */
function animateCounts() {
	nextTick(() => {
		document.querySelectorAll('.count').forEach((el) => {
			const target = Number(el.dataset.to) || 0
			const obj    = { n: 0 }
			gsap.to(obj, {
				n: target, duration: 1.2, ease: 'power2.out',
				onUpdate: () => { el.textContent = String(Math.round(obj.n)) }
			})
		})
	})
}

/* ============================================================
 * API
 * ============================================================ */
async function loadStats() {
	try {
		const res     = await api.get('/statistiques/contribuable')
		const payload = res.data?.data || res.data
		if (payload?.kpis)    stats.value.kpis    = { ...stats.value.kpis,    ...payload.kpis }
		if (payload?.mix)     stats.value.mix     = { ...stats.value.mix,     ...payload.mix }
		if (payload?.rates)   stats.value.rates   = { ...stats.value.rates,   ...payload.rates }
		if (payload?.mensuel) stats.value.mensuel = { ...stats.value.mensuel, ...payload.mensuel }
	} catch (err) {
		console.warn('Stats en mode démo')
	} finally {
		animateCounts()
	}
}

onMounted(loadStats)
</script>

<template>
<div class="bg-[var(--bg)] text-[var(--text)] min-h-full">
<div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">

<!-- ============================================================
HEADER COMPACT
============================================================ -->
<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
<div>
<p class="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--primary)]">
Analytics
</p>
<h1 class="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
Vue d'ensemble
</h1>
</div>

<!-- Périodes -->
<div class="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--card)]">
<button
v-for="p in periodes"
:key="p"
type="button"
@click="periodeActive = p"
class="relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
>
<span :class="periodeActive === p ? 'text-white' : 'text-[var(--text-muted)]'">
{{ p }}
</span>
<motion.div
v-if="periodeActive === p"
layout-id="periode-active"
:transition="{ type: 'spring', stiffness: 400, damping: 30 }"
class="absolute inset-0 rounded-lg bg-[var(--primary)] -z-10"
></motion.div>
</button>
</div>
</div>

<!-- ============================================================
LAYOUT : SIDEBAR KPI + CONTENU
============================================================ -->
<div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

<!-- ============ SIDEBAR KPI (colonne gauche) ============ -->
<aside class="space-y-3">

<!-- Hero card -->
<motion.div
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4 }"
class="rounded-3xl bg-gradient-to-br from-[var(--primary)] to-blue-700 p-5 text-white relative overflow-hidden"
>
<div class="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none"></div>
<div class="absolute -right-6 -bottom-14 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>

<div class="relative">
<p class="text-[10px] uppercase tracking-[0.25em] font-bold text-white/70">
Activité totale
</p>
<p class="mt-3 text-5xl font-black tabular-nums leading-none">
{{ stats.kpis.dossiers + stats.kpis.rdv + stats.kpis.tickets }}
</p>
<p class="text-xs text-white/70 mt-2">
Dossiers · RDV · Tickets
</p>

<div class="mt-5 pt-4 border-t border-white/20 flex items-center gap-2 text-xs">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
</svg>
<span class="text-white/90 font-semibold">+16%</span>
<span class="text-white/60">vs mois dernier</span>
</div>
</div>
</motion.div>

<!-- KPI list -->
<motion.div
v-for="(k, i) in kpis"
:key="k.key"
:initial="{ opacity: 0, x: -12 }"
:animate="{ opacity: 1, x: 0 }"
:transition="{ duration: 0.35, delay: 0.08 + i * 0.05 }"
:whileHover="{ x: 3 }"
class="group rounded-2xl bg-[var(--card)] p-3.5 flex items-center gap-3 cursor-default"
>
<!-- Icône gradient -->
<div
:class="[
'shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
k.gradient
]"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path v-if="k.icon === 'folder'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
<path v-else-if="k.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
<path v-else-if="k.icon === 'ticket'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
<path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>

<div class="min-w-0 flex-1">
<p class="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
{{ k.label }}
</p>
<p class="text-2xl font-black tabular-nums mt-0.5">
<span class="count" :data-to="k.value">0</span>
</p>
</div>

<!-- Trend -->
<div
:class="[
'shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold',
k.trendUp
? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
: 'bg-red-500/10 text-red-600 dark:text-red-400'
]"
>
<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path v-if="k.trendUp" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"/>
<path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/>
</svg>
{{ k.trend }}
</div>
</motion.div>
</aside>

<!-- ============ CONTENU (colonne droite) ============ -->
<div class="space-y-4 min-w-0">

<!-- Ligne 1 : Donut + Radial -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

<!-- Donut -->
<motion.div
:initial="{ opacity: 0, y: 14 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.15 }"
class="rounded-3xl bg-[var(--card)] p-5"
>
<div class="flex items-start justify-between gap-3 mb-2">
<div>
<p class="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--primary)]">
Répartition
</p>
<h3 class="mt-1 text-base font-bold tracking-tight">
Mix d'activité
</h3>
</div>
<span class="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--bg)] text-[var(--text-muted)] tabular-nums">
{{ totalMix }} au total
</span>
</div>

<VueApexCharts type="donut" height="270" :options="donutOptions" :series="donutSeries" />
</motion.div>

<!-- Radial -->
<motion.div
:initial="{ opacity: 0, y: 14 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.2 }"
class="rounded-3xl bg-[var(--card)] p-5"
>
<div class="flex items-start justify-between gap-3 mb-2">
<div>
<p class="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--primary)]">
Performance
</p>
<h3 class="mt-1 text-base font-bold tracking-tight">
Taux de réussite
</h3>
</div>
<span class="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
Global {{ Math.round(radialSeries.reduce((a, b) => a + b, 0) / radialSeries.length) }}%
</span>
</div>

<VueApexCharts type="radialBar" height="270" :options="radialOptions" :series="radialSeries" />
</motion.div>
</div>

<!-- Ligne 2 : Combo pleine largeur -->
<motion.div
:initial="{ opacity: 0, y: 14 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.25 }"
class="rounded-3xl bg-[var(--card)] p-5"
>
<div class="flex flex-wrap items-start justify-between gap-3 mb-3">
<div>
<p class="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--primary)]">
Évolution mensuelle
</p>
<h3 class="mt-1 text-base font-bold tracking-tight">
Dossiers & Rendez-vous sur 12 mois
</h3>
</div>

<!-- Légende custom -->
<div class="flex items-center gap-4 text-[11px] font-semibold text-[var(--text-muted)]">
<div class="flex items-center gap-1.5">
<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
Dossiers
</div>
<div class="flex items-center gap-1.5">
<span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
RDV
</div>
<div class="flex items-center gap-1.5">
<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
Tendance
</div>
</div>
</div>

<VueApexCharts type="line" height="280" :options="comboOptions" :series="comboSeries" />
</motion.div>
</div>
</div>
</div>
</div>
</template>
