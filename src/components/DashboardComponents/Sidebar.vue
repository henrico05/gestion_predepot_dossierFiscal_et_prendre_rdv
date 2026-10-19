<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import DeconnectModal from '@/components/DeconnectModal.vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { playSound } from '../../services/sonnerie'
import {disconnectSocket} from '@/services/socket'

const toast = useToast()
const router = useRouter()
const route = useRoute()


/* =====================================================
 *   NAVIGATION
 * ===================================================== */

const navItems = [
	{
		type: 'link',
		key: 'dashboard',
		name: 'Tableau de bord',
		route: 'Dashboard',
		icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10'
	},

{
	type: 'link',
	key: 'statistique',
	name: 'Statistiques des données',
	route: 'Statistiques',
	icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
},

{
	type: 'group',
	key: 'dossiers',
	name: 'Dossiers',
	icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
	
	children: [
		{
			name: 'Créer un dossier',
			route: 'CreateDossier',
			icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			name: 'Liste des dossiers',
			route: 'Dossiers',
			icon: 'M4 6h16M4 10h16M4 14h10M4 18h10'
		}
	]
},

{
	type: 'group',
	key: 'rdv',
	name: 'Rendez-vous',
	icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
	
	children: [
		{
			name: 'Créer un rendez-vous',
			route: 'CreateRendezVous',
			icon: 'M12 4v16m8-8H4'
		},
		{
			name: 'Liste des rendez-vous',
			route: 'RendezVous',
			icon: 'M4 6h16M4 10h16M4 14h10M4 18h10'
		}
	]
},

{
	type: 'link',
	key: 'fil_entente',
	name: 'Ticket',
	route: 'Ticket',
	icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z'
},

{
	type: 'link',
	key: 'fil_entente',
	name: 'Surperviser des guichets',
	route: 'ListGuichet',
	icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
},

{
	type: 'link',
	key: 'guichet_list',
	name: 'Service fiscal',
	route: 'servicesFiscal',
	icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
},

{
	type: 'link',
	key: 'accounts',
	name: 'Gestion des comptes',
	route: 'userSpace',
	icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
}
]


/* =====================================================
 *   GROUPES OUVERTS
 * ===================================================== */

const openGroups = ref({
	dossiers: false,
	rdv: false
})


/* =====================================================
 *   VERIFIER SI UN GROUPE EST OUVERT
 * ===================================================== */

function isOpen(key) {
	return !!openGroups.value[key]
}


/* =====================================================
 *   VERIFIER SI UN ENFANT EST ACTIF
 * ===================================================== */

function isGroupActive(item) {
	return item.children?.some(
		child => route.name === child.route
	)
}


/* =====================================================
 *   OUVRIR / FERMER UN GROUPE
 * ===================================================== */

function toggleGroup(key) {
	
	if (isCollapsed.value) {
		const item = navItems.find(i => i.key === key)
		if (item?.children?.length) {
			router.push({ name: item.children[0].route })
		}
		return
	}
	
	openGroups.value[key] =
	!openGroups.value[key]
}


/* =====================================================
 *   OUVRIR AUTOMATIQUEMENT LE GROUPE
 *   SELON LA PAGE ACTUELLE
 * ===================================================== */

function syncOpenGroups(routeName) {
	
	for (const item of navItems) {
		
		if (item.type !== 'group') {
			continue
		}
		
		const containsCurrentRoute =
		item.children.some(
			child => child.route === routeName
		)
		
		if (containsCurrentRoute) {
			openGroups.value[item.key] = true
		}
	}
}


/* =====================================================
 *   SURVEILLER LA ROUTE
 * ===================================================== */

watch(
	() => route.name,
	  (routeName) => {
		  syncOpenGroups(routeName)
	  },
	  {
		  immediate: true
	  }
)


/* =====================================================
 * COLLAPSE — Détection largeur < 789px
 * ===================================================== */
const isCollapsed = ref(false)
const COLLAPSE_THRESHOLD = 1200

let mediaQuery = null

/* =====================================================
 *   DECONNEXION
 * ===================================================== */

const ismodalDeconnectShow = ref(false)


const showModalDeconnect = () => {
	ismodalDeconnectShow.value = true
}


const closeModalDeconnect = () => {
	ismodalDeconnectShow.value = false
}


const logout = () => {
	
	try {
		
		const raw =
		localStorage.getItem('currentUser') ||
		sessionStorage.getItem('currentUser')
		
		const user = raw
		? JSON.parse(raw)
		: null
		
		ismodalDeconnectShow.value = false
		
		playSound('disconnection')
		
		const label = [
			user?.nom,
			user?.prenom
		]
		.filter(Boolean)
		.join(' ')
		
		toast.success(
			label
			? `${label} a été déconnecté`
			: 'Déconnexion réussie'
		)
		
		disconnectSocket()
		localStorage.removeItem('token')
		localStorage.removeItem('currentUser')
		sessionStorage.removeItem('currentUser')
		
		router.push({ name: 'Login' })
		
	} catch (err) {
		
		toast.error(
			err?.message ||
			'Erreur de déconnexion'
		)
	}
}

let resizeTimer = null

function evaluerLargeur() {
	const w = window.innerWidth
	console.log('📏 largeur :', w, '→ replié ?', w < COLLAPSE_THRESHOLD)
	
	if (w < COLLAPSE_THRESHOLD) {
		isCollapsed.value = true
	} else {
		const saved = localStorage.getItem('sidebar-collapsed')
		isCollapsed.value = saved === 'true'
	}
}

function onResize() {
	if (resizeTimer) clearTimeout(resizeTimer)
		resizeTimer = setTimeout(evaluerLargeur, 100)
}

/* =====================================================
 * TOOLTIP
 * ===================================================== */

const hoveredItem = ref(null)
const tooltipPosition = ref('right')
const tooltipStyle = ref({})
let hoverTimer = null

const TOOLTIP_DELAY = 200

function onItemEnter(key, event) {
	
	if (!isCollapsed.value) {
		return
	}
	
	if (hoverTimer) {
		clearTimeout(hoverTimer)
	}
	
	const element = event.currentTarget
	
	if (!element) {
		return
	}
	
	hoverTimer = setTimeout(() => {
		
		const rect = element.getBoundingClientRect()
		
		const tooltipWidth = 240
		
		const spaceRight =
		window.innerWidth - rect.right
		
		const showLeft =
		spaceRight < tooltipWidth + 30
		
		tooltipPosition.value =
		showLeft ? 'left' : 'right'
		
		if (showLeft) {
			
			tooltipStyle.value = {
				top: `${rect.top + rect.height / 2}px`,
				left: `${rect.left - 12}px`,
				transform: 'translate(-100%, -50%)'
			}
			
		} else {
			
			tooltipStyle.value = {
				top: `${rect.top + rect.height / 2}px`,
				left: `${rect.right + 12}px`,
				transform: 'translateY(-50%)'
			}
		}
		
		hoveredItem.value = key
		
	}, TOOLTIP_DELAY)
}


function onItemLeave() {
	
	if (hoverTimer) {
		clearTimeout(hoverTimer)
		hoverTimer = null
	}
	
	hoveredItem.value = null
}

onMounted(() => {
	mediaQuery = window.matchMedia(`(max-width: ${COLLAPSE_THRESHOLD}px)`)
	evaluerLargeur(mediaQuery)
	window.addEventListener('resize', onResize)
	
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', evaluerLargeur)
	} else {
		mediaQuery.addListener(evaluerLargeur)
	}
})

onBeforeUnmount(() => {
	
	if (resizeTimer) {
		clearTimeout(resizeTimer)
	}
	
	window.removeEventListener(
		'resize',
		onResize
	)
	
	if (mediaQuery) {
		
		if (mediaQuery.removeEventListener) {
			
			mediaQuery.removeEventListener(
				'change',
				evaluerLargeur
			)
			
		} else {
			
			mediaQuery.removeListener(
				evaluerLargeur
			)
		}
	}
	
	if (hoverTimer) {
		clearTimeout(hoverTimer)
	}
})
</script>


<template>

<aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">

<!-- =================================================
HEADER
================================================== -->

<div class="sidebar-header">

<div class="logo-circle large">
S
</div>

<div v-if="!isCollapsed">

<h1 class="sidebar-title">
Services Fiscaux
</h1>

<p class="sidebar-subtitle">
Espace Agent
</p>

</div>

</div>


<!-- =================================================
NAVIGATION
================================================== -->

<nav class="sidebar-nav">

<template
v-for="item in navItems"
:key="item.key"
>


<!-- ============================================
LIEN NORMAL
============================================= -->

<RouterLink
v-if="item.type === 'link'"
:to="{ name: item.route }"
class="nav-item"
active-class="active"
@mouseenter="onItemEnter(item.key, $event)"
@mouseleave="onItemLeave"
>

<svg
class="nav-icon"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
:d="item.icon"
/>

</svg>

<span v-if="!isCollapsed">
{{ item.name }}
</span>

<Teleport to="body">
<Transition name="tooltip">
<div
v-if="isCollapsed && hoveredItem === item.key"
:style="tooltipStyle"
:class="[
'nav-tooltip',
tooltipPosition === 'left' ? 'nav-tooltip--left' : ''
]"
>
<div class="nav-tooltip-content">
<!-- Icône rappel -->
<svg class="nav-tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
</svg>
<span class="nav-tooltip-label">{{ item.name }}</span>
</div>
</div>
</Transition>
</Teleport>

</RouterLink>


<!-- ============================================
GROUPE
============================================= -->

<div
v-else
class="nav-group"
:class="{
open: isOpen(item.key)
}"
>

<!-- PARENT -->

<button
type="button"
class="nav-item nav-parent"
:class="{
active: isGroupActive(item)
}"
:aria-expanded="isOpen(item.key)"
@click="toggleGroup(item.key)"
@mouseenter="onItemEnter(item.key, $event)"
@mouseleave="onItemLeave"
>

<svg
class="nav-icon"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
:d="item.icon"
/>

</svg>

<span v-if="!isCollapsed">
{{ item.name }}
</span>


<!-- FLÈCHE -->

<svg
v-if="!isCollapsed"
class="arrow-icon"
:class="{
rotated: isOpen(item.key)
}"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M9 5l7 7-7 7"
/>

</svg>

<Teleport to="body">
<Transition name="tooltip">
<div
v-if="isCollapsed && hoveredItem === item.key"
:style="tooltipStyle"
:class="[
'nav-tooltip',
tooltipPosition === 'left' ? 'nav-tooltip--left' : ''
]"
>
<div class="nav-tooltip-content">
<svg class="nav-tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
</svg>
<span class="nav-tooltip-label">{{ item.name }}</span>
</div>
<div class="nav-tooltip-hint">
{{ item.children[0].name }}
<svg class="nav-tooltip-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
</svg>
</div>
</div>
</Transition>
</Teleport>

</button>


<!-- SOUS-MENU -->

<div
v-if="isOpen(item.key)"
class="submenu"
>

<RouterLink
v-for="child in item.children"
:key="child.route"
:to="{ name: child.route }"
class="submenu-item"
active-class="active"
>

<svg
class="submenu-icon"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
:d="child.icon"
/>

</svg>

<span>
{{ child.name }}
</span>

</RouterLink>

</div>

</div>

</template>

</nav>


<!-- =================================================
FOOTER
================================================== -->

<div class="sidebar-footer">

<button
class="logout-btn"
@click="showModalDeconnect"
:disabled="ismodalDeconnectShow"
@mouseenter="onItemEnter('logout', $event)"
@mouseleave="onItemLeave"
>

<svg
width="16"
height="16"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>

<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
/>

</svg>

<span v-if="!isCollapsed">Se déconnecter</span>
 <Teleport to="body">
<Transition name="tooltip">
<div
v-if="isCollapsed && hoveredItem === 'logout'"
:style="tooltipStyle"
:class="[
'nav-tooltip',
tooltipPosition === 'left' ? 'nav-tooltip--left' : ''
]"
>
<div class="nav-tooltip-content">
<svg class="nav-tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
</svg>
<span class="nav-tooltip-label">Se déconnecter</span>
</div>
</div>
</Transition>
</Teleport>

</button>

</div>

</aside>


<DeconnectModal
:isOpen="ismodalDeconnectShow"
@close="closeModalDeconnect"
@deconnect="logout"
/>

</template>
<style scoped>
/* ========== NAV GROUPS ========== */

.nav-group {
	width: 100%;
}
.nav-group.active {
	background: rgba(59, 130, 246, 0.1);
	color: var(--primary);
	border-right-color: var(--primary);
}

.nav-parent {
	width: 100%;
	border: none;
	background: transparent;
	font-family: inherit;
	cursor: pointer;
	text-align: left;
}

.nav-parent.active {
	background: rgba(59, 130, 246, 0.1);
	color: var(--primary);
	border-right-color: var(--primary);
}

/* ========== ARROW ========== */

.arrow-icon {
	width: 16px;
	height: 16px;
	margin-left: auto;
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.arrow-icon.rotated {
	transform: rotate(90deg);
}


/* ========== SUBMENU ========== */

.submenu {
	display: flex;
	flex-direction: column;
	
	margin-left: 20px;
	padding-left: 12px;
	
	border-left: 1px solid var(--border);
	
	gap: 2px;
	
	margin-top: 2px;
	margin-bottom: 4px;
}
.submenu:has(.submenu-item.active) {
	border-right-color: var(--primary);
}


/* ========== SUBMENU ITEM ========== */

.submenu-item {
	display: flex;
	align-items: center;
	
	gap: 10px;
	
	padding: 9px 14px;
	
	font-size: 13px;
	font-weight: 500;
	
	color: var(--text-muted);
	
	text-decoration: none;
	
	border-radius: 8px;
	
	transition: all 0.2s;
}

.submenu-item:hover {
	background: var(--hover);
	color: var(--text);
}

.submenu-item.active {
	background: rgba(59, 130, 246, 0.1);
	color: var(--primary);
}

.submenu-icon {
	width: 17px;
	height: 17px;
	flex-shrink: 0;
}

/****************colapse*/
/* ========== MODE REPLIÉ ========== */
/**************** COLLAPSE ****************/

/* Sidebar normal */
.sidebar {
	width: 260px;
	flex-shrink: 0;
	transition: width 0.25s ease;
	overflow-x: hidden;
}

/* Sidebar replié */
.sidebar.is-collapsed {
	width: 72px;
}

/* Header */
.sidebar.is-collapsed .sidebar-header {
	justify-content: center;
	padding: 18px 8px;
}

/* Navigation */
.sidebar.is-collapsed .nav-item {
	justify-content: center;
	padding: 12px 0;
	gap: 0;
}

/* Sous-menus masqués en mode replié */
.sidebar.is-collapsed .submenu {
	display: none;
}

/* Bouton déconnexion */
.sidebar.is-collapsed .logout-btn {
	justify-content: center;
	padding: 12px 0;
}

/* Empêche les textes de dépasser */
.sidebar.is-collapsed .nav-item,
.sidebar.is-collapsed .logout-btn {
	
	white-space: nowrap;
}
</style>

<style>

/* =====================================================
 * TOOLTIP
 * ===================================================== */

.nav-tooltip {
	position: fixed;
	z-index: 999999;
	
	pointer-events: none;
	
	background: var(--titlebar, #0f172a);
	color: #ffffff;
	
	padding: 10px 14px;
	
	border-radius: 10px;
	
	font-size: 12px;
	font-weight: 600;
	
	line-height: 1.3;
	
	white-space: nowrap;
	
	box-shadow:
	0 10px 15px -3px rgba(0, 0, 0, 0.25),
	0 4px 6px -2px rgba(0, 0, 0, 0.15);
	
	display: flex;
	flex-direction: column;
	
	gap: 6px;
	
	min-width: 140px;
	max-width: 260px;
}


/* =====================================================
 * FLECHE
 * ===================================================== */

.nav-tooltip::before {
	content: '';
	
	position: absolute;
	
	top: 50%;
	
	transform: translateY(-50%);
	
	border: 6px solid transparent;
}


/* Tooltip à droite */
.nav-tooltip:not(.nav-tooltip--left)::before {
	
	right: 100%;
	
	border-right-color:
	var(--titlebar, #0f172a);
}


/* Tooltip à gauche */
.nav-tooltip--left::before {
	
	left: 100%;
	
	border-left-color:
	var(--titlebar, #0f172a);
}


/* =====================================================
 * CONTENU
 * ===================================================== */

.nav-tooltip-content {
	
	display: flex;
	
	align-items: center;
	
	gap: 8px;
}


.nav-tooltip-icon {
	
	width: 14px;
	height: 14px;
	
	flex-shrink: 0;
	
	opacity: 0.8;
}


.nav-tooltip-label {
	
	flex: 1;
	
	min-width: 0;
}


/* =====================================================
 * SOUS-TEXTE DES GROUPES
 * ===================================================== */

.nav-tooltip-hint {
	
	display: flex;
	
	align-items: center;
	
	gap: 4px;
	
	font-size: 11px;
	
	font-weight: 500;
	
	color: rgba(255, 255, 255, 0.6);
	
	padding-top: 6px;
	
	border-top:
	1px solid
	rgba(255, 255, 255, 0.1);
}


.nav-tooltip-arrow {
	
	width: 10px;
	height: 10px;
	
	margin-left: auto;
	
	opacity: 0.5;
}


/* =====================================================
 * ANIMATION
 * ===================================================== */

.tooltip-enter-active {
	transition:
	opacity 0.18s ease,
	transform 0.18s ease;
}

.tooltip-leave-active {
	transition:
	opacity 0.12s ease,
	transform 0.12s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
	opacity: 0;
}

</style>
