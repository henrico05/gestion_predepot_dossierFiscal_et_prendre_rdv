<script setup>
import { reactive, ref } from 'vue';
import FormInput from './FormInput.vue';
import { useToast } from 'vue-toastification'
import api from '@/api/Axios'

const toast = useToast()

const formData = reactive({
	nif: "",
	raisonSociale: "",
	prenom: "",
	telephone: "",
	email: "",
	motDePasse: "",
	confirmationMotDePasse: ""
})

const acceptTerms = ref(false);

const handleSubmit = async () => {
	
	// Conditions d'utilisation
	if (!acceptTerms.value) {
		toast.info("Veuillez accepter les conditions d'utilisation.")
		return
	}
	
	// Vérification du mot de passe
	if (formData.motDePasse !== formData.confirmationMotDePasse) {
		toast.warning("Les mots de passe ne correspondent pas.")
		return
	}
	
	// Longueur du mot de passe
	if (formData.motDePasse.length < 8) {
		toast.warning("Le mot de passe doit contenir au moins 8 caractères.")
		return
	}
	if (formData.telephone.length < 10 ) {
		toast.warning("Numero de telephone courte")
		return
	}else if(formData.telephone.length > 10 ){
		toast.warning("Numero de telephone plus long")
		return
	}
	
	// Vérification des champs obligatoires
	if (
		!formData.nif.trim() ||
		!formData.raisonSociale.trim() ||
		!formData.prenom.trim() ||
		!formData.telephone.trim() ||
		!formData.email.trim() ||
		!formData.motDePasse
	) {
		toast.warning("Veuillez remplir tous les champs obligatoires.")
		return
	}
	
	try {
		
		// Données envoyées au backend
		const data = {
			nif: formData.nif.trim(),
			
			nom_raison_sociale: formData.raisonSociale.trim(),
			
			prenom: formData.prenom.trim(),
			
			type_contribuable: "PERSONNE_PHYSIQUE",
			
			telephone: formData.telephone.trim(),
			
			email: formData.email.trim().toLowerCase(),
			
			password: formData.motDePasse
		}
		
		console.log("Données envoyées :", data)
		
		const response = await api.post(
			"/contribuables/register",
			data
		)
		
		console.log("Inscription :", response.data)
		
		toast.success(
			response.data.message ||
			"Compte créé avec succès."
		)
		
		// Réinitialisation du formulaire
		Object.assign(formData, {
			nif: "",
			raisonSociale: "",
			prenom: "",
			telephone: "",
			email: "",
			motDePasse: "",
			confirmationMotDePasse: ""
		})
		
		acceptTerms.value = false
		
	} catch (error) {
		
		console.error("Erreur inscription :", error)
		
		if (error.response) {
			
			const status = error.response.status
			const message = error.response.data?.message
			
			if (status === 409) {
				
				toast.error(
					message || "Ce contribuable existe déjà."
				)
				
			} else if (status === 400) {
				
				toast.warning(
					message || "Les données envoyées sont invalides."
				)
				
			} else if (status === 500) {
				
				toast.error(
					"Erreur interne du serveur."
				)
				
			} else {
				
				toast.error(
					message || "Erreur lors de l'inscription."
				)
			}
			
		} else if (error.request) {
			
			toast.error(
				"Impossible de contacter le serveur. Vérifiez que le backend est démarré."
			)
			
		} else {
			
			toast.error(
				"Une erreur est survenue lors de l'inscription."
			)
		}
	}
};

// Icônes SVG (Chemins des icônes pour FormInput)
const icons = {
	card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', // Carte NIF
	building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', // Immeuble
	user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', // Personne
	phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', // Téléphone
	email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', // Email
	lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' // Cadenas
};
</script>

<template>
<div class="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center py-10 px-4">

<!-- Conteneur principal de la carte -->
<div class="register-card bg-[var(--card)] w-full max-w-4xl rounded-2xl shadow-xl p-10 border border-[var(--border)]">

<!-- Icône centrale bleue -->
<div class="flex justify-center mb-4">
<div class="w-16 h-16 bg-[var(--primary)] rounded-full flex items-center justify-center text-white shadow-md">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
</div>
</div>

<!-- Titre -->
<h2 class="text-3xl font-bold text-center text-[var(--text)] mb-2">Créer mon compte</h2>
<p class="text-center text-[var(--text-muted)] mb-8">Rejoignez le portail fiscal IMPOTS Manakara en quelques étapes.</p>

<!-- Formulaire -->
<form @submit.prevent="handleSubmit" class="space-y-6">

<!-- Grid 2 colonnes -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

<FormInput 
v-model="formData.nif" 
label="NIF" 
required 
placeholder="Entrez votre NIF" 
:icon="icons.card" 
/>

<FormInput 
v-model="formData.raisonSociale" 
label="Nom / Raison sociale" 
required 
placeholder="Nom complet ou raison sociale de l'entreprise" 
:icon="icons.building" 
/>

<FormInput 
v-model="formData.prenom" 
label="Prénom" 
required 
placeholder="Entrez votre prénom" 
:icon="icons.user" 
/>

<FormInput 
v-model="formData.telephone" 
label="Téléphone" 
required 
placeholder="Ex : 034 12 345 67" 
:icon="icons.phone" 
/>

<FormInput 
v-model="formData.email" 
label="Email" 
type="email" 
required 
placeholder="Entrez votre email" 
:icon="icons.email" 
/>

<FormInput 
v-model="formData.motDePasse" 
label="Mot de passe" 
type="password" 
required 
hint="Minimum 8 caractères, avec lettre, chiffre et caractère spécial"
placeholder="Créez votre mot de passe" 
:icon="icons.lock" 
/>

<FormInput 
v-model="formData.confirmationMotDePasse" 
label="Confirmation mot de passe" 
type="password" 
required 
placeholder="Confirmez votre mot de passe" 
:icon="icons.lock" 
/>
</div>

<!-- Case à cocher -->
<div class="flex items-center gap-3 pt-2">
<input 
type="checkbox" 
id="terms" 
v-model="acceptTerms"
class="w-4 h-4 rounded accent-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
>
<label for="terms" class="text-sm text-[var(--text)]">
J'accepte les conditions d'utilisation et la politique de confidentialité du portail IMPOTS Manakara.
</label>
</div>

<!-- Bouton de soumission -->
<button 
type="submit"
class="w-full bg-[var(--primary)] hover:brightness-105 text-white font-bold py-3.5 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
</svg>
Créer mon compte
</button>

<!-- Lien de connexion -->
<div class="text-center text-sm text-[var(--text-muted)] mt-4">
Déjà un compte ? 
<RouterLink to="/contrib_login" class="text-[var(--primary)] hover:underline font-medium">Se connecter</RouterLink>
</div>

</form>
</div>
</div>
</template>
