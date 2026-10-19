<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Motion } from 'motion-v'
import gsap from 'gsap'
import api from '@/api/Axios.js'

const route = useRoute()

// ==================== ÉTAT ====================
// 'loading' | 'success' | 'expired' | 'error'
const state = ref('loading')
const accountLabel = ref('')
const errorMessage = ref('')
const isResending = ref(false)
const resendDone = ref(false)

const circleRef = ref(null)
const checkRef = ref(null)
const crossA = ref(null)
const crossB = ref(null)

const accountType = ref(null)
const loginRoute = ref('/')

// ==================== VÉRIFICATION DU TOKEN ====================
const verifyToken = async () => {
	const token = route.query.token
	const type = route.query.type
	
	if (!token) {
		state.value = 'error'
		errorMessage.value =
		"Aucun jeton de vérification n'a été fourni dans le lien."
		return
	}
	
	if (!type) {
		state.value = 'error'
		errorMessage.value =
		"Le type de compte n'a pas été précisé dans le lien."
		return
	}
	
	const normalizedType = String(type).toLowerCase()
	
	try {
		let response
		
		// ==============================
		// AGENT
		// ==============================
		if (normalizedType === 'agent') {
			
			response = await api.get(
				`/auth/verify-email/${encodeURIComponent(token)}`
			)
			
			accountType.value = 'AGENT'
			loginRoute.value = '/login'
		}
		
		// ==============================
		// CONTRIBUABLE
		// ==============================
		else if (normalizedType === 'contribuable') {
			
			response = await api.get(
				`/contribuables/verify-email/${encodeURIComponent(token)}`
			)
			
			accountType.value = 'CONTRIBUABLE'
			loginRoute.value = '/Acceuil'
		}
		
		// ==============================
		// TYPE INCONNU
		// ==============================
		else {
			state.value = 'error'
			errorMessage.value = "Type de compte inconnu."
			return
		}
		
		// ==============================
		// SUCCÈS
		// ==============================
		accountLabel.value =
		response.data?.email ||
		response.data?.data?.email ||
		''
		
		state.value = 'success'
		
		await nextTick()
		
		playSuccessAnimation()
		
	} catch (err) {
		
		console.error('Erreur de vérification :', err)
		
		const status = err.response?.status
		
		errorMessage.value =
		err.response?.data?.message ||
		"Ce lien de vérification n'est plus valide."
		
		if (status === 410) {
			state.value = 'expired'
		} else {
			state.value = 'error'
		}
		
		await nextTick()
		
		playErrorAnimation()
	}
}

// ==================== ANIMATIONS GSAP ====================
const playSuccessAnimation = () => {
	if (!circleRef.value || !checkRef.value) return
		
		const circleLength = circleRef.value.getTotalLength()
		const checkLength = checkRef.value.getTotalLength()
		
		gsap.set(circleRef.value, { strokeDasharray: circleLength, strokeDashoffset: circleLength })
		gsap.set(checkRef.value, { strokeDasharray: checkLength, strokeDashoffset: checkLength })
		
		const tl = gsap.timeline()
		tl.to(circleRef.value, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out' })
		tl.to(checkRef.value, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, '-=0.15')
		tl.from('.state-icon-wrap', { scale: 0.85, duration: 0.4, ease: 'back.out(2)' }, 0)
}

const playErrorAnimation = () => {
	if (!crossA.value || !crossB.value) return
		
		const lenA = crossA.value.getTotalLength()
		const lenB = crossB.value.getTotalLength()
		
		gsap.set(crossA.value, { strokeDasharray: lenA, strokeDashoffset: lenA })
		gsap.set(crossB.value, { strokeDasharray: lenB, strokeDashoffset: lenB })
		
		const tl = gsap.timeline()
		tl.to(crossA.value, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' })
		tl.to(crossB.value, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1')
		tl.to('.state-icon-wrap', { x: [0, -8, 8, -6, 6, 0], duration: 0.45, ease: 'power1.inOut' }, '-=0.1')
}

// ==================== RENVOYER LE LIEN ====================
const resendVerification = async () => {
	isResending.value = true
	
	try {
		await api.post('/auth/resend-verification', {
			token: route.query.token
		})
		resendDone.value = true
	} catch (err) {
		console.error('Erreur renvoi vérification :', err)
		errorMessage.value = err.response?.data?.message || "Impossible d'envoyer un nouveau lien pour le moment."
	} finally {
		isResending.value = false
	}
}

onMounted(() => {
	verifyToken()
})
</script>

<template>
<div class="verify-page">

<!-- Halos décoratifs -->
<div class="blob-layer" aria-hidden="true">
<div class="blob blob-1"></div>
<div class="blob blob-2"></div>
</div>

<Motion
:initial="{ opacity: 0, y: 24, scale: 0.97 }"
:animate="{ opacity: 1, y: 0, scale: 1 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
class="verify-card"
>

<!-- ==================== CHARGEMENT ==================== -->
<template v-if="state === 'loading'">
<div class="state-icon-wrap">
<div class="spinner-ring"></div>
</div>
<h1 class="state-title">Vérification en cours…</h1>
<p class="state-text">Merci de patienter pendant que nous validons votre adresse e-mail.</p>
</template>

<!-- ==================== SUCCÈS ==================== -->
<template v-else-if="state === 'success'">
<div class="state-icon-wrap icon-success">
<svg viewBox="0 0 100 100" class="state-icon-svg">
<circle ref="circleRef" cx="50" cy="50" r="44" fill="none" stroke="#10b981" stroke-width="6" />
<path ref="checkRef" d="M29 52 L44 67 L73 33" fill="none" stroke="#10b981" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
</svg>
</div>
<h1 class="state-title">E-mail vérifié avec succès</h1>
<p class="state-text">
<span v-if="accountLabel">Le compte <strong>{{ accountLabel }}</strong> est maintenant confirmé.</span>
<span v-else>Votre adresse e-mail a bien été confirmée.</span>
<br>Un administrateur doit encore valider votre compte avant que vous puissiez vous connecter.
</p>
<Motion :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.97 }">
<RouterLink to="/" class="primary-btn">Retour à l'accueil</RouterLink>
</Motion>
</template>

<!-- ==================== LIEN EXPIRÉ ==================== -->
<template v-else-if="state === 'expired'">
<div class="state-icon-wrap icon-warning">
<svg viewBox="0 0 100 100" class="state-icon-svg">
<circle cx="50" cy="50" r="44" fill="none" stroke="#f59e0b" stroke-width="6" />
<path d="M50 28v26" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" />
<circle cx="50" cy="66" r="4.5" fill="#f59e0b" />
</svg>
</div>
<h1 class="state-title">Ce lien a expiré</h1>
<p class="state-text">{{ errorMessage }}</p>

<Motion v-if="!resendDone" :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.97 }">
<button class="primary-btn" :disabled="isResending" @click="resendVerification">
<span v-if="isResending" class="btn-spinner"></span>
Recevoir un nouveau lien
</button>
</Motion>
<p v-else class="resend-done">Un nouvel e-mail de vérification vous a été envoyé.</p>

<RouterLink to="/" class="secondary-link">Retour à l'accueil</RouterLink>
</template>

<!-- ==================== ERREUR ==================== -->
<template v-else>
<div class="state-icon-wrap icon-error">
<svg viewBox="0 0 100 100" class="state-icon-svg">
<circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" stroke-width="6" />
<path ref="crossA" d="M36 36 L64 64" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round" />
<path ref="crossB" d="M64 36 L36 64" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round" />
</svg>
</div>
<h1 class="state-title">Lien invalide</h1>
<p class="state-text">{{ errorMessage }}</p>
<RouterLink to="/" class="primary-btn">Retour à l'accueil</RouterLink>
</template>

</Motion>
</div>
</template>

<style scoped>
.verify-page {
	position: relative;
	min-height: 100vh;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	background: var(--bg);
	overflow: hidden;
	font-family: 'Inter', sans-serif;
}

/* ================= HALOS ================= */
.blob-layer {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
}
.blob {
	position: absolute;
	border-radius: 9999px;
	filter: blur(70px);
	opacity: 0.3;
}
.blob-1 {
	width: 380px;
	height: 380px;
	top: -100px;
	left: -80px;
	background: var(--primary);
}
.blob-2 {
	width: 320px;
	height: 320px;
	bottom: -120px;
	right: -90px;
	background: var(--titlebar);
	opacity: 0.16;
}

/* ================= CARTE ================= */
.verify-card {
	position: relative;
	z-index: 1;
	width: 100%;
	max-width: 440px;
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 20px;
	box-shadow: 0 24px 48px rgba(0,0,0,0.14);
	padding: 40px 32px;
	text-align: center;
}

/* ================= ICÔNE D'ÉTAT ================= */
.state-icon-wrap {
	width: 88px;
	height: 88px;
	margin: 0 auto 22px;
	display: grid;
	place-items: center;
}
.state-icon-svg {
	width: 100%;
	height: 100%;
}

.icon-success { filter: drop-shadow(0 4px 10px rgba(16,185,129,0.25)); }
.icon-warning { filter: drop-shadow(0 4px 10px rgba(245,158,11,0.25)); }
.icon-error { filter: drop-shadow(0 4px 10px rgba(239,68,68,0.25)); }

/* Spinner de chargement */
.spinner-ring {
	width: 64px;
	height: 64px;
	border-radius: 999px;
	border: 5px solid color-mix(in srgb, var(--primary) 18%, transparent);
	border-top-color: var(--primary);
	animation: spin 0.85s linear infinite;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

/* ================= TEXTES ================= */
.state-title {
	font-size: 20px;
	font-weight: 800;
	color: var(--text);
	margin-bottom: 10px;
}
.state-text {
	font-size: 13.5px;
	line-height: 1.6;
	color: var(--text-muted);
	margin-bottom: 26px;
}

/* ================= BOUTONS ================= */
.primary-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 100%;
	padding: 12px;
	border-radius: 10px;
	background: var(--primary);
	color: white;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	border: none;
	transition: filter 0.2s;
}
.primary-btn:hover {
	filter: brightness(1.06);
}
.primary-btn:disabled {
	opacity: 0.65;
	cursor: not-allowed;
}

.secondary-link {
	display: block;
	margin-top: 14px;
	font-size: 12.5px;
	font-weight: 600;
	color: var(--text-muted);
}
.secondary-link:hover {
	color: var(--primary);
}

.resend-done {
	font-size: 13px;
	color: #10b981;
	font-weight: 600;
	background: color-mix(in srgb, #10b981 10%, transparent);
	border-radius: 8px;
	padding: 10px;
	margin-bottom: 4px;
}

.btn-spinner {
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255,255,255,0.35);
	border-top-color: white;
	border-radius: 999px;
	animation: spin 0.7s linear infinite;
}
</style>
