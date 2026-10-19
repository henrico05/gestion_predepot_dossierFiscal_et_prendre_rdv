
<template>
<div class="bg-[var(--card)] rounded-2xl shadow-2xl p-10 max-w-lg w-full border border-[var(--border)] relative z-10">

<!-- Titre -->
<div class="flex items-center gap-4 mb-2">
<div class="bg-[var(--primary)] rounded-full p-3 text-white">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>
<div>
<h2 class="text-2xl font-bold text-[var(--text)]">Connexion à votre espace</h2>
<p class="text-[var(--text-muted)] text-sm mt-1">Accédez à vos services fiscaux en ligne.</p>
</div>
</div>

<div class="border-t border-[var(--border)] my-6"></div>

<!-- Formulaire -->
<form @submit.prevent="handleLogin" class="space-y-6">

<!-- Champ NIF -->
<div>
<label class="block text-sm font-bold text-[var(--text)] mb-2">
NIF <span class="text-red-500">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5l-2-2H8l-2 2z" />
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 15l3-3 3 3" />
</svg>
</div>
<input 
v-model="nif"
type="text"
required
placeholder="Entrez votre numéro d'Identification Fiscale (NIF)"
class="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-colors
bg-[var(--card)] text-[var(--text)] border border-[var(--border)]
placeholder:text-[var(--text-muted)]
focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
>
</div>
</div>

<!-- Champ Mot de passe -->
<div>
<label class="block text-sm font-bold text-[var(--text)] mb-2">
Mot de passe <span class="text-red-500">*</span>
</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
</svg>
</div>
<input 
v-model="password"
:type="showPassword ? 'text' : 'password'"
required
placeholder="Entrez votre mot de passe"
class="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-colors
bg-[var(--card)] text-[var(--text)] border border-[var(--border)]
placeholder:text-[var(--text-muted)]
focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
>
<button 
type="button" 
@click="showPassword = !showPassword"
class="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
>
<svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
</svg>
</button>
</div>
<div class="flex justify-end mt-2">
<a href="#" class="text-sm font-medium text-[var(--primary)] hover:underline">Mot de passe oublié ?</a>
</div>
</div>

<div
v-if="errorMessage"
class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
>
{{ errorMessage }}
</div>

<!-- Bouton Se connecter -->
<button
type="submit"
:disabled="isLoading"
class="w-full bg-[var(--primary)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
>
<svg
v-if="isLoading"
class="w-5 h-5 animate-spin"
fill="none"
viewBox="0 0 24 24"
>
<circle
class="opacity-25"
cx="12"
cy="12"
r="10"
stroke="currentColor"
stroke-width="4"
></circle>

<path
class="opacity-75"
fill="currentColor"
d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
></path>
</svg>

<svg
v-else
class="w-5 h-5"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M11 16l-4-4m0 0l4-4m-4 4h14"
/>
</svg>

{{ isLoading ? 'Connexion...' : 'Se connecter' }}
</button>

<!-- Séparateur -->
<div class="relative py-2">
<div class="absolute inset-0 flex items-center">
<div class="w-full border-t border-[var(--border)]"></div>
</div>
<div class="relative flex justify-center text-sm text-[var(--text-muted)] bg-[var(--card)] px-2">
OU
</div>
</div>

<!-- Bouton Créer un compte -->
<RouterLink 
  to="/contrib_register"
class="w-full border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--bgListCard)] font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center gap-2"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
</svg>
Créer un compte
</RouterLink>

</form>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/Axios'
import { connectSocket } from '@/services/socket'

const router = useRouter()

const nif = ref('')
const password = ref('')
const showPassword = ref(false)

const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''

  // -----------------------------
  // Validation frontend
  // -----------------------------
  if (!nif.value.trim() || !password.value) {
    errorMessage.value = 'Veuillez renseigner votre NIF et votre mot de passe.'
    return
  }

  try {
    isLoading.value = true

    const response = await api.post(
      '/contribuables/login', {nif: nif.value.trim(), password: password.value},
      {
        skipAuthRefresh: true
      }
    )

    console.log('✅ Réponse login contribuable :', response.data)

    const {
      token,
      contribuable
    } = response.data

    // -----------------------------
    // Vérification réponse backend
    // -----------------------------
    if (!token || !contribuable) {
      throw new Error(
        'Réponse du serveur invalide.'
      )
    }

    // -----------------------------
    // Sauvegarde authentification
    // -----------------------------
    localStorage.setItem(
      'token',
      token
    )

    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        ...contribuable,
        type: 'CONTRIBUABLE',
        role: contribuable.role || 'CONTRIBUABLE'
      })
    )

    // -----------------------------
    // Connexion Socket.IO
    // -----------------------------
    connectSocket()

    // -----------------------------
    // Redirection
    // -----------------------------
    await router.push('/dashboard')

  }catch (err) {
	  console.error(
		  '❌ Erreur login contribuable :',
		  err
	  )
	  
	  const showError = (message) => {
		  errorMessage.value = message
		  
		  setTimeout(() => {
			  errorMessage.value = ''
		  }, 5000)
	  }
	  
	  const data = err.response?.data
	  
	  switch (data?.code) {
		  
		  case 'EMAIL_NOT_VERIFIED':
			  showError(
				  'Veuillez d’abord confirmer votre adresse email.'
			  )
			  break
			  
		  case 'ADMIN_PENDING':
			  showError(
				  'Votre compte est en attente de validation par l’administration.'
			  )
			  break
			  
		  case 'ADMIN_REJECTED':
			  showError(
				  'Votre compte a été refusé par l’administration.'
			  )
			  break
			  
		  case 'ACCOUNT_NOT_APPROVED':
			  showError(
				  'Votre compte n’est pas encore autorisé.'
			  )
			  break
			  
		  case 'ACCOUNT_DISABLED':
			  showError(
				  'Votre compte est désactivé.'
			  )
			  break
			  
		  default:
			  showError(
				  data?.message ||
				  'NIF ou mot de passe incorrect.'
			  )
	  }
	  
  } finally {
	  isLoading.value = false
  }
}
</script>
