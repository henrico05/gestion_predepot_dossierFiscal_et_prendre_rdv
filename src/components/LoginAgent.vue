<template>
<div class="app-shell">

<!-- ========================================================= -->
<!-- BARRE DE TITRE ELECTRON                                    -->
<!-- ========================================================= -->
<div class="titlebar" style="-webkit-app-region: drag">
<div class="titlebar-left">
<div class="titlebar-logo">S</div>
<span>Services Fiscaux — Espace Agent</span>
</div>

<div class="titlebar-controls" style="-webkit-app-region: no-drag">
<button class="tb-btn" @click="toggleTheme" :title="isDark ? 'Mode clair' : 'Mode sombre'">
<svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<circle cx="12" cy="12" r="5"/>
<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>
<svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>
</button>
<div class="tb-sep"></div>
<button class="tb-btn" @click="minimize" title="Réduire">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M5 12h14"/>
</svg>
</button>
<button class="tb-btn" @click="maximize" :title="isMaximized ? 'Restaurer' : 'Agrandir'">
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<rect x="5" y="5" width="14" height="14"/>
</svg>
</button>
<button class="tb-btn tb-close" @click="close" title="Fermer">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M18 6 6 18M6 6l12 12"/>
</svg>
</button>
</div>
</div>

<!-- ========================================================= -->
<!-- CONTENU PRINCIPAL                                          -->
<!-- ========================================================= -->
<main class="main-content">

<transition name="progress-fade">
<div v-if="isLoading" class="progress-bar-top">
<div 
class="progress-bar" 
:class="{ 'progress-error': hasError }"
:style="{ width: progressPercent + '%' }"
></div>
</div>
</transition>

<!-- Décorations d'arrière-plan -->
<div class="bg-decor">
<div class="bg-blob bg-blob-1"></div>
<div class="bg-blob bg-blob-2"></div>
<div class="bg-blob bg-blob-3"></div>
</div>

<!-- Carte principale -->
<div class="auth-card">

<!-- ============ COLONNE FORMULAIRE ============ -->
<motion.div
class="form-col"
:initial="{ opacity: 0, y: 20 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
>
<!-- Header avec logo -->
<div class="form-header">
<div class="brand">
<div class="brand-logo">S</div>
<div>
<h1>Services Fiscaux</h1>
<p>Espace Agent · IMPOTS Manakara</p>
</div>
</div>

<!-- Tabs Login/Register -->
<div v-if="!showRecovery" class="tabs">
<button
type="button"
class="tab"
:class="{ 'tab-active': isLogin }"
@click="switchToLogin"
>
Connexion
</button>
<button
type="button"
class="tab"
:class="{ 'tab-active': !isLogin }"
@click="switchToRegister"
>
Créer un compte
</button>
</div>
</div>

<!-- Formulaires avec transition -->
<AnimatePresence mode="wait">

<!-- ===== LOGIN ===== -->
<motion.form
v-if="isLogin && !showRecovery"
key="login"
class="auth-form"
:initial="{ opacity: 0, x: 14 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: -14 }"
:transition="{ duration: 0.25 }"
@submit.prevent="handleLogin"
>
<div class="field">
<label>Matricule</label>
<div class="input-wrapper">
<svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
</svg>
<input v-model="loginMatricule" type="text" placeholder="Ex : AG-2024-015" required autocomplete="username" />
</div>
</div>

<div class="field">
<label>Mot de passe</label>
<div class="input-wrapper">
<svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-9V7a4 4 0 00-8 0v3h8z"/>
</svg>
<input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" placeholder="••••••••••" required autocomplete="current-password" />
<button type="button" class="input-action" @click="showPassword = !showPassword">
<svg v-if="!showPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>
<svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.584 10.587a2 2 0 002.829 2.829"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.88 5.09A10.94 10.94 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.97 10.97 0 01-4.132 5.411M6.228 6.228A10.97 10.97 0 002.458 12c1.274 4.057 5.064 7 9.542 7a10.94 10.94 0 003.12-.45"/>
</svg>
</button>
</div>
</div>

<button type="submit" class="btn-submit" :disabled="isLoading">
<span v-if="isLoading" class="spinner"></span>
<template v-else>
Se connecter
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</template>
</button>

<button type="button" class="link-btn" @click="showRecovery = true">
Mot de passe oublié ?
</button>
</motion.form>

<!-- ===== REGISTER ===== -->
<motion.div
v-else-if="!isLogin && !showRecovery"
key="register"
class="auth-form"
:initial="{ opacity: 0, x: 14 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: -14 }"
:transition="{ duration: 0.25 }"
>
<!-- Stepper -->
<div class="stepper">
<div v-for="s in 3" :key="s" class="step">
<div class="step-circle" :class="{
'step-active': currentStep === s,
'step-done': currentStep > s
}">
<svg v-if="currentStep > s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
</svg>
<span v-else>{{ s }}</span>
</div>
<span class="step-label" :class="{ 'step-label-active': currentStep === s }">
{{ s === 1 ? 'Identité' : s === 2 ? 'Fonction' : 'Sécurité' }}
</span>
</div>
</div>

<!-- Étape 1 -->
<div v-show="currentStep === 1" class="step-content">
<div class="field">
<label>Photo / Avatar</label>
<div class="avatar-upload" @click="$refs.fileInput.click()">
<input ref="fileInput" type="file" accept="image/*" hidden @change="handleImageUpload" />
<img v-if="previewImage" :src="previewImage" />
<div v-else class="avatar-placeholder">
<svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
<span>Ajouter</span>
</div>
</div>
</div>

<div class="field-row">
<div class="field">
<label>Nom</label>
<input v-model="form.nom" type="text" placeholder="Rakoto" required />
</div>
<div class="field">
<label>Prénom</label>
<input v-model="form.prenom" type="text" placeholder="Jean" required />
</div>
</div>

<div class="field">
<label>Matricule</label>
<input v-model="form.matricule" type="text" placeholder="AG-2024-015" required />
</div>

<div class="field">
<label>Email professionnel</label>
<input v-model="form.email" type="email" placeholder="agent@impots.mg" required />
</div>
</div>

<!-- Étape 2 -->
<div v-show="currentStep === 2" class="step-content">
<div class="field">
<label>Rôle / Fonction</label>
<div class="roles-list">
<label v-for="r in roles" :key="r.value" class="role-card" :class="{ 'role-active': form.role === r.value }">
<input v-model="form.role" type="radio" :value="r.value" class="sr-only" />
<div class="role-icon" v-html="r.icon"></div>
<div class="role-text">
<strong>{{ r.label }}</strong>
<span>{{ r.desc }}</span>
</div>
<div class="role-check" :class="{ 'role-check-active': form.role === r.value }">
<svg v-if="form.role === r.value" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
</svg>
</div>
</label>
</div>
</div>

<div v-if="form.role === 'GUICHETIER'" class="field">
<label>Guichet assigné</label>
<select v-model="form.guichet">
<option value="">Aucun</option>
<option v-for="g in guichets" :key="g.id_guichet" :value="g.id_guichet">
{{ g.numero_guichet }} — {{ g.libelle }}
</option>
</select>
</div>
</div>

<!-- Étape 3 -->
<div v-show="currentStep === 3" class="step-content">
<div class="field">
<label>Mot de passe</label>
<div class="input-wrapper">
<input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Minimum 8 caractères" required />
<button type="button" class="input-action" @click="showPassword = !showPassword">
<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>
</button>
</div>
</div>

<div class="field">
<label>Confirmer le mot de passe</label>
<input v-model="form.passwordConfirm" :type="showPassword ? 'text' : 'password'" placeholder="Retapez le mot de passe" required />
</div>

<div v-if="form.nom" class="summary-box">
<p><strong>{{ form.nom }} {{ form.prenom }}</strong></p>
<p>{{ form.matricule }} · {{ form.role }}</p>
<p v-if="form.guichet">Guichet : {{ form.guichet }}</p>
</div>
</div>

<!-- Navigation -->
<div class="step-nav">
<button v-if="currentStep > 1" type="button" class="btn-back" @click="currentStep--">
← Précédent
</button>
<button v-if="currentStep < 3" type="button" class="btn-submit" @click="nextStep">
Suivant →
</button>
<button v-else type="button" class="btn-submit" :disabled="isLoading" @click="handleRegister">
<span v-if="isLoading" class="spinner"></span>
<span v-else>Créer le compte</span>
</button>
</div>
</motion.div>

<!-- ===== RECOVERY ===== -->
<motion.form
v-else
key="recovery"
class="auth-form"
:initial="{ opacity: 0, x: 14 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: -14 }"
:transition="{ duration: 0.25 }"
@submit.prevent="handleRecovery"
>
<div>
<h3>Mot de passe oublié</h3>
<p>Entrez votre matricule ou email professionnel.</p>
</div>

<div class="field">
<label>Matricule ou Email</label>
<input v-model="recoveryEmail" type="text" placeholder="AG-2024-015 ou agent@impots.mg" required />
</div>

<button type="submit" class="btn-submit">Envoyer le code</button>
<button type="button" class="link-btn" @click="showRecovery = false">← Retour à la connexion</button>
</motion.form>
</AnimatePresence>
</motion.div>

<!-- ============ PANNEAU LATÉRAL MODERNISÉ ============ -->
<div class="side-col">
<!-- Illustration animée -->
<div class="side-illustration">
<svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
<!-- Bâtiment stylisé -->
<rect x="120" y="120" width="160" height="140" rx="8" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="rgba(255,255,255,0.05)"/>
<path d="M120 130 L200 80 L280 130" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="rgba(255,255,255,0.1)"/>

<!-- Colonnes -->
<rect x="140" y="150" width="12" height="80" fill="rgba(255,255,255,0.3)"/>
<rect x="170" y="150" width="12" height="80" fill="rgba(255,255,255,0.3)"/>
<rect x="200" y="150" width="12" height="80" fill="rgba(255,255,255,0.3)"/>
<rect x="230" y="150" width="12" height="80" fill="rgba(255,255,255,0.3)"/>
<rect x="260" y="150" width="12" height="80" fill="rgba(255,255,255,0.3)"/>

<!-- Toit -->
<rect x="110" y="120" width="180" height="6" fill="rgba(255,255,255,0.5)"/>

<!-- Étoiles -->
<circle cx="80" cy="60" r="2" fill="rgba(255,255,255,0.6)"/>
<circle cx="320" cy="80" r="2" fill="rgba(255,255,255,0.6)"/>
<circle cx="350" cy="40" r="1.5" fill="rgba(255,255,255,0.4)"/>
<circle cx="50" cy="100" r="1.5" fill="rgba(255,255,255,0.4)"/>
</svg>
</div>

<!-- Contenu textuel -->
<div class="side-content">
<h2>Portail Agent</h2>
<p class="side-subtitle">
Accédez à votre espace de travail sécurisé pour gérer les rendez-vous, dossiers et files d'attente.
</p>


<!-- Bouton d'info -->
<div class="side-footer">
<span class="pulse-dot"></span>
Système opérationnel
</div>
</div>
</div>
</div>
</main>
</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/api/Axios'
import gsap from 'gsap'
import { playSound } from '@/services/sonnerie'
import { connectSocket, socket } from '@/services/socket.js'
import { useElectron } from '@/composables/useElectron.js'

const toast = useToast()
const router = useRouter()
const { isMaximized, minimize, maximize, close } = useElectron()

/* =========================================================
 * THÈME (fonctionne avec documentElement)
 * ========================================================= */
const isDark = ref(localStorage.getItem('auth-theme') === 'dark')

function applyTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('auth-theme', isDark.value ? 'dark' : 'light')
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme()
}

/* =========================================================
 * ÉTAT FORMULAIRE
 * ========================================================= */
const isLogin = ref(true)
const showRecovery = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)
const currentStep = ref(1)

const loginMatricule = ref('')
const loginPassword = ref('')
const recoveryEmail = ref('')
const previewImage = ref(null)
const imageFile = ref(null)

const form = reactive({
  nom: '', prenom: '', matricule: '', email: '',
  role: '', guichet: '', password: '', passwordConfirm: ''
})

/* Rôles avec icônes SVG (plus d'emojis) */
const roles = [
  {
    value: 'VERIFICATEUR',
    label: 'Vérificateur',
    desc: 'Contrôle des pièces & dossiers',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`
  },
{
  value: 'GUICHETIER',
  label: 'Guichetier',
  desc: 'Accueil & file d\'attente',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21V8l9-5 9 5v13h-6v-7h-6v7H3z"/></svg>`
}
]

const guichets = ref([])

/* =========================================================
 * CHARGEMENT
 * ========================================================= */
async function loadGuichets() {
  try {
    const { data } = await api.get('/guichets')
    guichets.value = data.guichets || []
  } catch {
    toast.error('Impossible de charger les guichets')
  }
}

/* =========================================================
 * NAVIGATION FORMULAIRES
 * ========================================================= */
const switchToLogin = () => {
  isLogin.value = true
  showRecovery.value = false
  currentStep.value = 1
}

const switchToRegister = () => {
  isLogin.value = false
  showRecovery.value = false
  currentStep.value = 1
}

/* =========================================================
 * UPLOAD AVATAR
 * ========================================================= */
function handleImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Image trop lourde (max 2 Mo)')
      return
    }
    imageFile.value = file
    const reader = new FileReader()
    reader.onload = (ev) => { previewImage.value = ev.target.result }
    reader.readAsDataURL(file)
}

/* =========================================================
 * STEPPER
 * ========================================================= */
function nextStep() {
  if (currentStep.value === 1) {
    if (!form.nom || !form.prenom || !form.matricule || !form.email) {
      toast.warning('Veuillez remplir tous les champs de l\'étape 1')
      return
    }
  }
  if (currentStep.value === 2 && !form.role) {
    toast.warning('Veuillez sélectionner un rôle')
    return
  }
  currentStep.value++
}

/* =========================================================
 * LOGIN
 * ========================================================= */
async function handleLogin() {
  if (!loginMatricule.value.trim() || !loginPassword.value.trim()) {
    toast.warning('Veuillez remplir tous les champs')
    return
  }
  
  isLoading.value = true
  startProgress()
  try {
    const { data } = await api.post('/auth/login', {
      matricule: loginMatricule.value.trim(),
                                    password: loginPassword.value
    }, { skipAuthRefresh: true })
    
    if (!data?.token || !data?.agent) throw new Error('Réponse du serveur invalide')
      
      const agent = data.agent
      localStorage.setItem('token', data.token)
      localStorage.setItem('currentUser', JSON.stringify({
        ...agent, lastLogin: new Date().toISOString()
      }))
      
      connectSocket()
      playSound('connection')
      finishProgress(true)
      toast.success(`Bienvenue ${agent.prenom || ''} ${agent.nom || 'Agent'} !`)
      
      setTimeout(() => {
        router.push({ path: '/dashboard' })
      }, 300)
      
  } catch (error) {
    console.error('Erreur login:', error)
    playSound('error')
    finishProgress(false)
    toast.error(error.response?.data?.message || 'Matricule ou mot de passe incorrect')
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
  } finally {
    //isLoading.value = false
  }
}

/* =========================================================
 * REGISTER
 * ========================================================= */
async function handleRegister() {
  if (form.password !== form.passwordConfirm) {
    toast.warning('Les mots de passe ne correspondent pas')
    return
  }
  if (form.password.length < 8) {
    toast.warning('Le mot de passe doit contenir au moins 8 caractères')
    return
  }
  
  isLoading.value = true
  startProgress()
  
  try {
    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      matricule: form.matricule.trim(),
      email: form.email.trim(),
      role: form.role,
      id_guichet: form.guichet || null,
      password: form.password,
      ...(imageFile.value && {
        imageBase64: previewImage.value.split(',')[1],
          imageContentType: imageFile.value.type
      })
    }
    
    const { data } = await api.post('/auth/register', payload)
    finishProgress(true)
    toast.success(data.message || 'Compte créé ! Vérifiez votre email.')
    switchToLogin()
      Object.keys(form).forEach(k => form[k] = '')
      previewImage.value = null
      imageFile.value = null
      currentStep.value = 1
  } catch (error) {
    toast.error(error.response?.data?.message || 'Erreur lors de la création')
  } finally {
   // isLoading.value = false
  }
}

/* =========================================================
 * RECOVERY
 * ========================================================= */
function handleRecovery() {
  toast.info('Fonction de récupération à brancher')
  showRecovery.value = false
}

/* =========================================================
 * BARRE DE PROGRESSION
 * ========================================================= */
const progressPercent = ref(0)
const hasError = ref(false)
let progressInterval = null

function startProgress() {
  hasError.value = false
  progressPercent.value = 0
  
  // Progression fluide : 0 → 30% → 70% (ralentit)
  progressInterval = setInterval(() => {
    if (progressPercent.value < 30) {
      progressPercent.value += 8
    } else if (progressPercent.value < 70) {
      progressPercent.value += 2
    } else if (progressPercent.value < 90) {
      progressPercent.value += 0.5
    }
    // On plafonne à 90% tant que la requête n'a pas répondu
    if (progressPercent.value > 90) progressPercent.value = 90
  }, 100)
}

function finishProgress(success = true) {
  clearInterval(progressInterval)
  progressInterval = null
  hasError.value = !success
  progressPercent.value = 100
  
  // ✅ On attend 500ms AVANT de cacher la barre
  setTimeout(() => {
    isLoading.value = false       // ✅ C'est ici qu'on ferme la barre
    progressPercent.value = 0
    hasError.value = false
  }, 500)
}

/* =========================================================
 * LIFECYCLE
 * ========================================================= */
onMounted(async () => {
  applyTheme()
  loadGuichets()
  
  // Animations GSAP
  gsap.from('.auth-card', {
    y: 30, opacity: 0, duration: 0.7, ease: 'power3.out'
  })
  gsap.from('.side-illustration', {
    scale: 0.8, opacity: 0, duration: 0.9, delay: 0.2, ease: 'back.out(1.7)'
  })
  
  // Animation pulse sur les stats live (simulation)
  setInterval(() => {
    liveStats.queue = Math.max(0, liveStats.queue + Math.floor(Math.random() * 3) - 1)
  }, 5000)
})
</script>

<style scoped>
/* =========================================================
 * VARIABLES THÈME
 * ========================================================= */
:root {
  --bg: #f1f5f9;
  --card: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --primary: #3b82f6;
  --hover: #f8fafc;
}

:global(.dark) {
  --bg: #0f172a;
  --card: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --primary: #60a5fa;
  --hover: #334155;
}

/* =========================================================
 * SHELL
 * ========================================================= */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, system-ui, sans-serif;
}

/* =========================================================
 * TITLEBAR
 * ========================================================= */
.titlebar {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #0B2559;
  color: #fff;
  flex-shrink: 0;
  user-select: none;
}
.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
}
.titlebar-logo {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--primary);
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
}
.titlebar-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.tb-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}
.tb-btn:hover { background: rgba(255, 255, 255, 0.12); }
.tb-close:hover { background: #ef4444; }
.tb-sep {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

/* =========================================================
 * MAIN
 * ========================================================= */
.main-content {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Décorations de fond */
.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.25;
}
.bg-blob-1 {
  width: 400px; height: 400px;
  background: #3b82f6;
  top: -100px; left: -100px;
}
.bg-blob-2 {
  width: 300px; height: 300px;
  background: #8b5cf6;
  bottom: -80px; right: 30%;
}
.bg-blob-3 {
  width: 350px; height: 350px;
  background: #10b981;
  top: 40%; right: -100px;
}

/* =========================================================
 * CARTE AUTH
 * ========================================================= */
.auth-card {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 560px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 20px 60px -20px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}

/* =========================================================
 * COLONNE FORMULAIRE
 * ========================================================= */
.form-col {
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 480px;
}

.form-header { margin-bottom: 24px; }

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.brand-logo {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}
.brand p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--hover);
  border-radius: 12px;
}
.tab {
  flex: 1;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab:hover { color: var(--text); }
.tab-active {
  background: var(--card);
  color: var(--primary);
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
}

/* =========================================================
 * FORMULAIRES
 * ========================================================= */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
}
.field input,
.field select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}
.field input:focus,
.field select:focus {
  border-color: var(--primary);
  background: var(--card);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Input avec icône */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrapper input {
  padding-left: 40px;
  padding-right: 40px;
}
.input-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}
.input-action {
  position: absolute;
  right: 10px;
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.input-action:hover { color: var(--text); background: var(--hover); }

/* =========================================================
 * BOUTONS
 * ========================================================= */
.btn-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 20px;
  border-radius: 11px;
  border: 0;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  flex: 1;
}
.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-back {
  flex: 1;
  padding: 13px 20px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-back:hover { background: var(--hover); }

.link-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px;
  text-align: center;
  transition: opacity 0.15s;
}
.link-btn:hover { text-decoration: underline; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* =========================================================
 * STEPPER REGISTER
 * ========================================================= */
.stepper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  margin-bottom: 20px;
}
.stepper::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 16%;
  right: 16%;
  height: 2px;
  background: var(--border);
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
  flex: 1;
}
.step-circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.3s;
}
.step-active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}
.step-done {
  border-color: #10b981;
  background: #10b981;
  color: #fff;
}
.step-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}
.step-label-active { color: var(--primary); }

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 260px;
}

.step-nav {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 16px;
}

/* =========================================================
 * AVATAR UPLOAD
 * ========================================================= */
.avatar-upload {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 2px dashed var(--border);
  background: var(--bg);
  cursor: pointer;
  display: grid;
  place-items: center;
  overflow: hidden;
  transition: border-color 0.2s;
}
.avatar-upload:hover { border-color: var(--primary); }
.avatar-upload img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 11px;
}

/* =========================================================
 * ROLES
 * ========================================================= */
.roles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.role-card:hover { border-color: var(--primary); }
.role-active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
}
.role-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.role-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.role-text strong { font-size: 13.5px; color: var(--text); }
.role-text span { font-size: 11.5px; color: var(--text-muted); }
.role-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  transition: all 0.2s;
}
.role-check-active {
  background: var(--primary);
  border-color: var(--primary);
}

/* =========================================================
 * SUMMARY BOX
 * ========================================================= */
.summary-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--hover);
  border: 1px solid var(--border);
  font-size: 12.5px;
  line-height: 1.6;
}
.summary-box p { margin: 2px 0; color: var(--text-muted); }
.summary-box strong { color: var(--text); }

/* =========================================================
 * PANNEAU LATÉRAL
 * ========================================================= */
.side-col {
  flex: 1;
  background: linear-gradient(135deg, #0B2559 0%, #1e3a5f 50%, #3b82f6 100%);
  color: #fff;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.side-illustration {
  display: flex;
  justify-content: center;
  opacity: 0.9;
}
.side-illustration svg {
  width: 100%;
  max-width: 320px;
  height: auto;
}

.side-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.side-content h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}
.side-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.85;
}

.side-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  opacity: 0.85;
  margin-top: 8px;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
  animation: pulse 2s infinite;
}

/* =========================================================
 * BARRE DE PROGRESSION
 * ========================================================= */

/* Conteneur (fixe en haut du main) */
.progress-bar-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  z-index: 9999;
  pointer-events: none;
}

/* La barre colorée qui progresse */
.progress-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    #3b82f6 0%,
    #60a5fa 50%,
    #3b82f6 100%
  );
  background-size: 200% 100%;
  border-radius: 0 999px 999px 0;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
  transition: width 0.35s ease, background 0.3s ease;
  animation: shimmer 1.5s linear infinite;
}

/* Barre en erreur (rouge) */
.progress-bar.progress-error {
  background: linear-gradient(
    90deg,
    #ef4444 0%,
    #f87171 50%,
    #ef4444 100%
  );
  background-size: 200% 100%;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
  animation: none;
}

/* Effet brillant */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Transition d'apparition/disparition */
.progress-fade-enter-active,
.progress-fade-leave-active {
  transition: opacity 0.3s ease;
}
.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* =========================================================
 * RESPONSIVE
 * ========================================================= */
@media (max-width: 860px) {
  .side-col { display: none; }
  .form-col { max-width: 100%; }
  .auth-card { max-width: 480px; min-height: auto; }
  .field-row { grid-template-columns: 1fr; }
}
</style>
