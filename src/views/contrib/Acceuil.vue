<template>
<div class="portal-home">

<!-- ==================== HALOS DÉCORATIFS ANIMÉS ==================== -->
<div class="blob-layer" aria-hidden="true">
<div ref="blob1" class="blob blob-1"></div>
<div ref="blob2" class="blob blob-2"></div>
</div>

<!-- ==================== NAVBAR ==================== -->
<Motion
:initial="{ opacity: 0, y: -16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
class="navbar"
>
<div class="flex items-center gap-3">
<div class="logo-badge">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18M5 21V7l8-4v18M13 21V11l6 4v6M9 9v.01M9 12v.01M9 15v.01" />
</svg>
</div>
<div class="leading-tight">
<p class="text-sm font-bold text-[var(--text)]">Centre Fiscal de Manakara</p>
<p class="logo-subtitle text-[11px] text-[var(--text-muted)]">Portail officiel des services fiscaux</p>
</div>
</div>

<nav class="hidden md:flex items-center gap-1">
<a href="#" class="nav-link is-active">Accueil</a>
<a href="#" class="nav-link">Services</a>
<a href="#" class="nav-link">Suivre un dossier</a>
<a href="#" class="nav-link">Contact</a>
</nav>

<div class="w-full sm:w-auto flex gap-2 justify-between items-center">
<Motion :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.97 }">
<RouterLink class="btn-outline" to="/contrib_register">
<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM2 21a6 6 0 0112 0" />
</svg>
<span class="btn-label">Créer un compte</span>
</RouterLink>
</Motion>

<Motion :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.97 }">
<RouterLink class="btn-primary" to="/contrib_login">
<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
</svg>
<span class="btn-label">Se connecter</span>
</RouterLink>
</Motion>
</div>


</Motion>


<!-- Toast -->
<transition name="toast">
<div v-if="toastMessage" class="fixed bottom-6 right-6 toast-box" :class="toastType === 'error' ? 'toast-error' : 'toast-success'">
<span class="text-sm font-medium">{{ toastMessage }}</span>
</div>
</transition>

<!-- ==================== HERO ==================== -->
<section class="hero">
<Motion
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.1, ease: 'easeOut' }"
class="eyebrow"
>
<span class="eyebrow-dot"></span>
Démarche 100&nbsp;% en ligne — sans file d'attente virtuelle
</Motion>

<Motion
:initial="{ opacity: 0, y: 24 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.6, delay: 0.18, ease: 'easeOut' }"
>
<h1 class="hero-title">
Prenez rendez-vous ou<br class="hidden sm:block">
<span class="hero-title-accent">déposez votre dossier</span>
</h1>
</Motion>

<Motion
:initial="{ opacity: 0, y: 24 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.6, delay: 0.26, ease: 'easeOut' }"
class="hero-subtitle"
>
Gagnez du temps au guichet en préparant votre visite en ligne : choisissez un créneau,
téléversez vos pièces justificatives, et suivez l'avancement de votre dossier en temps réel.
</Motion>

<!-- ==================== CARTES D'ACTION ==================== -->
<div class="actions-grid">
<Motion
v-for="(action, i) in actions"
:key="action.title"
:initial="{ opacity: 0, y: 28 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.35 + i * 0.1, ease: 'easeOut' }"
:while-hover="{ y: -6, scale: 1.015 }"
:while-press="{ scale: 0.985 }"
class="action-card group"
@click="action.onClick"
>
<div class="action-icon" :style="{ background: action.iconBg, color: action.iconColor }">
<component :is="action.icon" class="w-6 h-6" />
</div>
<p class="action-title">{{ action.title }}</p>
<p class="action-desc">{{ action.desc }}</p>
<span class="action-arrow">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
</svg>
</span>
</Motion>
</div>

<!-- ==================== BANDE STATISTIQUES ==================== -->
<Motion
:initial="{ opacity: 0, y: 24 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.7, ease: 'easeOut' }"
class="stats-strip"
>
<div v-for="stat in stats" :key="stat.label" class="stat-item">
<p class="stat-value">{{ stat.value }}</p>
<p class="stat-label">{{ stat.label }}</p>
</div>
</Motion>

<!-- ==================== NOTE D'AIDE ==================== -->
<Motion
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.8, ease: 'easeOut' }"
class="help-note"
>
<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<span>Besoin d'aide pour votre démarche ? Le guichet reste ouvert du lundi au vendredi, 8h–16h.</span>
</Motion>
</section>

<!-- ==================== FOOTER ==================== -->
<footer class="footer">
<p>© {{ currentYear }} IMPOTS Manakara – Direction Régionale des Impôts.</p>
<div class="flex items-center gap-5">
<a href="#" class="footer-link">Accessibilité</a>
<a href="#" class="footer-link">Mentions légales</a>
<a href="#" class="footer-link">Nous contacter</a>
</div>
</footer>

</div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { Motion } from 'motion-v'
import gsap from 'gsap'

const currentYear = new Date().getFullYear()





// ==================== INSCRIPTION / CONNEXION ====================
const isRegisterOpen = ref(false)

const isRegistering = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

const showToast = (message, type = 'success') => {
	toastType.value = type
	toastMessage.value = message
	setTimeout(() => { toastMessage.value = '' }, 4000)
}



// Création de compte contribuable (table CONTRIBUABLE)
const handleRegister = async (formData) => {
	isRegistering.value = true

	try {
		const res = await fetch('/api/contribuables/inscription', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(formData)
		})

		if (res.status === 409) {
			throw new Error('Un compte existe déjà avec ce NIF ou cet e-mail.')
		}
		if (!res.ok) {
			throw new Error('Erreur lors de la création du compte. Vérifiez vos informations.')
		}

		isRegisterOpen.value = false
		showToast('Compte créé avec succès ! Vous pouvez maintenant vous connecter.')
	} catch (err) {
		console.error(err)
		showToast(err.message || 'Erreur lors de la création du compte', 'error')
	} finally {
		isRegistering.value = false
	}
}

// ==================== ICÔNES (mini composants inline) ====================
const IconCalendar = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
])
const IconUpload = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3' })
])
const IconSearch = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' })
])

// ==================== CARTES D'ACTION ====================
const actions = [
	{
		title: 'Prendre rendez-vous',
		desc: 'Choisissez un service et un créneau qui vous convient, sans passer par le guichet.',
		icon: IconCalendar,
		iconBg: 'var(--bgListCard)',
		iconColor: 'var(--primary)',
		onClick: () => console.log('Naviguer vers : prise de rendez-vous')
	},
{
	title: 'Déposer un dossier',
	desc: 'Téléversez vos pièces justificatives à l\'avance pour accélérer votre passage.',
	icon: IconUpload,
	iconBg: 'var(--bgListCard)',
	iconColor: 'var(--primary)',
	onClick: () => console.log('Naviguer vers : dépôt de dossier')
},
{
	title: 'Suivre mon dossier',
	desc: 'Consultez en temps réel le statut de vérification de vos pièces et de votre dossier.',
	icon: IconSearch,
	iconBg: 'var(--bgListCard)',
	iconColor: 'var(--primary)',
	onClick: () => console.log('Naviguer vers : suivi de dossier')
}
]

// ==================== STATISTIQUES ====================
const stats = [
	{ value: '< 3 min', label: 'pour déposer un dossier en ligne' },
{ value: '0', label: 'file d\'attente virtuelle à gérer' },
{ value: '100 %', label: 'démarche sécurisée et confidentielle' }
]

// ==================== HALOS ANIMÉS (GSAP) ====================
const blob1 = ref(null)
const blob2 = ref(null)

onMounted(() => {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	if (prefersReducedMotion) return
		
		gsap.to(blob1.value, {
			x: 40,
		  y: 30,
		  duration: 7,
		  repeat: -1,
		  yoyo: true,
		  ease: 'sine.inOut'
		})
		
		gsap.to(blob2.value, {
			x: -30,
		  y: -20,
		  duration: 9,
		  repeat: -1,
		  yoyo: true,
		  ease: 'sine.inOut'
		})
})
</script>

<style scoped>
.portal-home {
	position: relative;
	min-height: 100%;
	width: 100%;
	background: var(--bg);
	color: var(--text);
	font-family: 'Inter', sans-serif;
	overflow-x: hidden;
}

/* ================= HALOS ================= */
.blob-layer {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
	z-index: 0;
}
.blob {
	position: absolute;
	border-radius: 9999px;
	filter: blur(70px);
	opacity: 0.35;
}
.blob-1 {
	width: 420px;
	height: 420px;
	top: -120px;
	right: -80px;
	background: var(--primary);
}
.blob-2 {
	width: 360px;
	height: 360px;
	bottom: -140px;
	left: -100px;
	background: var(--titlebar);
	opacity: 0.18;
}

/* ================= NAVBAR ================= */
.navbar {
	position: sticky;
	top: 0;
	z-index: 20;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 12px 14px;
	background: color-mix(in srgb, var(--card) 85%, transparent);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid var(--border);
}
@media (min-width: 480px) {
	.navbar { padding: 14px 24px; gap: 16px; }
}
@media (min-width: 768px) {
	.navbar { padding: 14px 28px; }
}

.logo-subtitle {
	display: none;
}
@media (min-width: 420px) {
	.logo-subtitle { display: block; }
}

.logo-badge {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: var(--titlebar);
	color: white;
	display: grid;
	place-items: center;
	flex-shrink: 0;
}
@media (min-width: 480px) {
	.logo-badge { width: 38px; height: 38px; }
}

.nav-link {
	padding: 8px 14px;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
	transition: all 0.2s;
}
.nav-link:hover {
	background: var(--hover);
	color: var(--text);
}
.nav-link.is-active {
	background: var(--bgListCard);
	color: var(--primary);
}

.btn-primary {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 42px;
	padding: 9px 16px;
	border-radius: 9px;
	background: var(--primary);
	color: white;
	font-size: 13px;
	font-weight: 700;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 35%, transparent);
	cursor: pointer;
	transition: filter 0.2s;
}
.btn-primary:hover {
	filter: brightness(1.06);
}

.btn-outline {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 42px;
	padding: 9px 16px;
	border-radius: 9px;
	background: transparent;
	border: 1.5px solid var(--border);
	color: var(--text);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
	transition: all 0.2s;
}
.btn-outline:hover {
	border-color: var(--primary);
	color: var(--primary);
	background: var(--bgListCard);
}

@media (max-width: 359px) {
	.btn-primary,
	.btn-outline {
		padding: 10px;
		border-radius: 999px;
		min-width: 42px;
	}
	.btn-label { display: none; }
}

/* ================= HERO ================= */
.hero {
	position: relative;
	z-index: 1;
	max-width: 880px;
	margin: 0 auto;
	padding: clamp(32px, 8vw, 88px) clamp(16px, 5vw, 32px) 56px;
	text-align: center;
}

.eyebrow {
	display: inline-flex;
	align-items: flex-start;
	gap: 8px;
	max-width: min(94vw, 460px);
	padding: 8px 16px;
	border-radius: 16px;
	background: var(--card);
	border: 1px solid var(--border);
	font-size: clamp(11px, 3vw, 12.5px);
	font-weight: 600;
	line-height: 1.4;
	text-align: left;
	color: var(--text-muted);
	margin-bottom: 22px;
}
.eyebrow-dot {
	width: 7px;
	height: 7px;
	margin-top: 4px;
	border-radius: 999px;
	background: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
	flex-shrink: 0;
}

.hero-title {
	font-size: clamp(28px, 5vw, 44px);
	font-weight: 800;
	line-height: 1.15;
	letter-spacing: -0.02em;
	color: var(--text);
	margin-bottom: 18px;
}
.hero-title-accent {
	color: var(--primary);
}

.hero-subtitle {
	max-width: 560px;
	margin: 0 auto 40px;
	font-size: 15px;
	line-height: 1.6;
	color: var(--text-muted);
}

/* ================= CARTES D'ACTION ================= */
.actions-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
	margin-bottom: 40px;
}
@media (min-width: 480px) {
	.actions-grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
}
@media (min-width: 860px) {
	.actions-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

.action-card {
	position: relative;
	text-align: left;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 16px;
	padding: 18px;
	cursor: pointer;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	transition: border-color 0.2s, box-shadow 0.2s;
}
@media (min-width: 480px) {
	.action-card { padding: 22px; }
}
.action-card:hover {
	border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
	box-shadow: 0 12px 24px -8px color-mix(in srgb, var(--primary) 18%, transparent);
}

.action-icon {
	width: 44px;
	height: 44px;
	border-radius: 12px;
	display: grid;
	place-items: center;
	margin-bottom: 16px;
}

.action-title {
	font-size: 15px;
	font-weight: 700;
	color: var(--text);
	margin-bottom: 6px;
}
.action-desc {
	font-size: 13px;
	line-height: 1.5;
	color: var(--text-muted);
	padding-right: 20px;
}

.action-arrow {
	position: absolute;
	bottom: 20px;
	right: 20px;
	width: 28px;
	height: 28px;
	border-radius: 999px;
	display: grid;
	place-items: center;
	color: var(--primary);
	background: var(--bgListCard);
	opacity: 0;
	transform: translateX(-4px);
	transition: all 0.25s ease;
}
.action-card:hover .action-arrow {
	opacity: 1;
	transform: translateX(0);
}
/* Sur écrans tactiles (mobile/tablette), le survol n'existe pas :
 on ga*rde la flèche visible à faible opacité pour indiquer que c'est cliquable */
@media (hover: none) {
	.action-arrow {
		opacity: 0.6;
		transform: translateX(0);
	}
}

/* ================= STATISTIQUES ================= */
.stats-strip {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 16px;
	padding: 18px 18px;
	margin-bottom: 24px;
}
@media (min-width: 480px) {
	.stats-strip {
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		padding: 24px 16px;
	}
}

.stat-item {
	text-align: center;
	padding: 0 6px 14px;
	border-bottom: 1px solid var(--border);
}
.stat-item:last-child {
	border-bottom: none;
	padding-bottom: 0;
}
@media (min-width: 480px) {
	.stat-item {
		padding: 0 6px;
		border-bottom: none;
		border-right: 1px solid var(--border);
	}
	.stat-item:last-child {
		border-right: none;
	}
}

.stat-value {
	font-size: clamp(18px, 3vw, 24px);
	font-weight: 800;
	color: var(--titlebar);
	margin-bottom: 4px;
}
.stat-label {
	font-size: 11.5px;
	line-height: 1.4;
	color: var(--text-muted);
}

/* ================= NOTE D'AIDE ================= */
.help-note {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	font-size: 12.5px;
	color: var(--textListCard);
	background: var(--bgListCard);
	border: 1px solid var(--borderListCard);
	border-radius: 10px;
	padding: 10px 16px;
}

/* ================= FOOTER ================= */
.footer {
	position: relative;
	z-index: 1;
	max-width: 1100px;
	margin: 0 auto;
	padding: 20px 28px;
	border-top: 1px solid var(--border);
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
	font-size: 12.5px;
	color: var(--text-muted);
}
@media (min-width: 640px) {
	.footer {
		flex-direction: row;
	}
}
.footer-link {
	color: var(--text-muted);
	transition: color 0.2s;
}
.footer-link:hover {
	color: var(--primary);
}

/* ================= TOAST ================= */
.toast-box {
	padding: 14px 20px;
	border-radius: 12px;
	box-shadow: 0 12px 28px rgba(0,0,0,0.18);
	border-left: 4px solid;
	z-index: 50;
	background: var(--card);
	color: var(--text);
}
.toast-success { border-left-color: #10b981; }
.toast-error { border-left-color: #ef4444; }

.toast-enter-active, .toast-leave-active { transition: all 0.4s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>
