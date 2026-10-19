<script setup>
import { reactive, ref, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'

const props = defineProps({
	open: { type: Boolean, default: false },
	loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'submit', 'switch-to-login'])

// ==================== FORMULAIRE (colonnes CONTRIBUABLE) ====================
const form = reactive({
	type_contribuable: 'PARTICULIER',
	nom_raison_sociale: '',
	nif: '',
	telephone: '',
	email: '',
	adresse: '',
	mot_de_passe: '',
	confirmation_mot_de_passe: ''
})

const errors = reactive({})

watch(() => props.open, (value) => {
	if (value) {
		form.type_contribuable = 'PARTICULIER'
		form.nom_raison_sociale = ''
		form.nif = ''
		form.telephone = ''
		form.email = ''
		form.adresse = ''
		form.mot_de_passe = ''
		form.confirmation_mot_de_passe = ''
		Object.keys(errors).forEach(k => delete errors[k])
	}
})

const validate = () => {
	Object.keys(errors).forEach(k => delete errors[k])

	if (!form.nom_raison_sociale.trim()) {
		errors.nom_raison_sociale = form.type_contribuable === 'ENTREPRISE'
			? 'La raison sociale est obligatoire'
			: 'Le nom est obligatoire'
	}
	if (!form.nif.trim()) {
		errors.nif = 'Le NIF est obligatoire'
	}
	if (!form.telephone.trim()) {
		errors.telephone = 'Le téléphone est obligatoire'
	}
	if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
		errors.email = 'Adresse e-mail invalide'
	}
	if (form.mot_de_passe.length < 8) {
		errors.mot_de_passe = 'Au moins 8 caractères'
	}
	if (form.confirmation_mot_de_passe !== form.mot_de_passe) {
		errors.confirmation_mot_de_passe = 'Les mots de passe ne correspondent pas'
	}

	return Object.keys(errors).length === 0
}

const submit = () => {
	if (!validate()) return

	emit('submit', {
		type_contribuable: form.type_contribuable,
		nom_raison_sociale: form.nom_raison_sociale.trim(),
		nif: form.nif.trim(),
		telephone: form.telephone.trim(),
		email: form.email.trim() || null,
		adresse: form.adresse.trim() || null,
		mot_de_passe: form.mot_de_passe
	})
}
</script>

<template>
<AnimatePresence>
<Motion
v-if="open"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
:transition="{ duration: 0.2 }"
class="modal-overlay"
@click.self="emit('close')"
>
<Motion
:initial="{ opacity: 0, scale: 0.95, y: 10 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.95, y: 10 }"
:transition="{ duration: 0.25, ease: 'easeOut' }"
class="modal-box"
>
<div class="modal-header">
<div>
<h2 class="modal-title">Créer un compte</h2>
<p class="modal-subtitle">Prenez rendez-vous et déposez vos dossiers en ligne</p>
</div>
<button @click="emit('close')" class="modal-close">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
</button>
</div>

<form @submit.prevent="submit" class="modal-form">

<!-- Type de contribuable -->
<div class="type-toggle">
<button
type="button"
:class="['type-option', form.type_contribuable === 'PARTICULIER' && 'is-active']"
@click="form.type_contribuable = 'PARTICULIER'"
>
Particulier
</button>
<button
type="button"
:class="['type-option', form.type_contribuable === 'ENTREPRISE' && 'is-active']"
@click="form.type_contribuable = 'ENTREPRISE'"
>
Entreprise
</button>
</div>

<div class="field">
<label class="field-label">{{ form.type_contribuable === 'ENTREPRISE' ? 'Raison sociale' : 'Nom complet' }}</label>
<input v-model="form.nom_raison_sociale" type="text" class="field-input" :class="errors.nom_raison_sociale && 'has-error'">
<p v-if="errors.nom_raison_sociale" class="field-error">{{ errors.nom_raison_sociale }}</p>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
<div class="field">
<label class="field-label">NIF</label>
<input v-model="form.nif" type="text" placeholder="400 123 456" class="field-input" :class="errors.nif && 'has-error'">
<p v-if="errors.nif" class="field-error">{{ errors.nif }}</p>
</div>
<div class="field">
<label class="field-label">Téléphone</label>
<input v-model="form.telephone" type="tel" placeholder="034 12 345 67" class="field-input" :class="errors.telephone && 'has-error'">
<p v-if="errors.telephone" class="field-error">{{ errors.telephone }}</p>
</div>
</div>

<div class="field">
<label class="field-label">E-mail <span class="optional">(facultatif)</span></label>
<input v-model="form.email" type="email" class="field-input" :class="errors.email && 'has-error'">
<p v-if="errors.email" class="field-error">{{ errors.email }}</p>
</div>

<div class="field">
<label class="field-label">Adresse <span class="optional">(facultatif)</span></label>
<input v-model="form.adresse" type="text" class="field-input">
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
<div class="field">
<label class="field-label">Mot de passe</label>
<input v-model="form.mot_de_passe" type="password" class="field-input" :class="errors.mot_de_passe && 'has-error'">
<p v-if="errors.mot_de_passe" class="field-error">{{ errors.mot_de_passe }}</p>
</div>
<div class="field">
<label class="field-label">Confirmation</label>
<input v-model="form.confirmation_mot_de_passe" type="password" class="field-input" :class="errors.confirmation_mot_de_passe && 'has-error'">
<p v-if="errors.confirmation_mot_de_passe" class="field-error">{{ errors.confirmation_mot_de_passe }}</p>
</div>
</div>

<button type="submit" :disabled="loading" class="submit-btn">
<span v-if="loading" class="spinner"></span>
Créer mon compte
</button>

<p class="switch-line">
Déjà un compte ?
<button type="button" class="switch-link" @click="emit('switch-to-login')">Se connecter</button>
</p>
</form>
</Motion>
</Motion>
</AnimatePresence>
</template>

<style scoped>
.modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.6);
	backdrop-filter: blur(4px);
	z-index: 50;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}

.modal-box {
	width: 100%;
	max-width: 460px;
	max-height: 90vh;
	overflow-y: auto;
	background: var(--card);
	border-radius: 18px;
	box-shadow: 0 24px 48px rgba(0,0,0,0.24);
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 22px 22px 16px;
	border-bottom: 1px solid var(--border);
}
.modal-title {
	font-size: 18px;
	font-weight: 800;
	color: var(--text);
}
.modal-subtitle {
	font-size: 12.5px;
	color: var(--text-muted);
	margin-top: 2px;
}
.modal-close {
	color: var(--text-muted);
	cursor: pointer;
	flex-shrink: 0;
}
.modal-close:hover {
	color: var(--text);
}

.modal-form {
	padding: 20px 22px 24px;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.type-toggle {
	display: flex;
	background: var(--hover);
	border-radius: 10px;
	padding: 4px;
	gap: 4px;
}
.type-option {
	flex: 1;
	padding: 8px;
	border-radius: 7px;
	font-size: 13px;
	font-weight: 700;
	color: var(--text-muted);
	cursor: pointer;
	transition: all 0.2s;
}
.type-option.is-active {
	background: var(--primary);
	color: white;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 5px;
}
.field-label {
	font-size: 12.5px;
	font-weight: 700;
	color: var(--text);
}
.optional {
	font-weight: 400;
	color: var(--text-muted);
}
.field-input {
	width: 100%;
	padding: 10px 12px;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--bg);
	color: var(--text);
	font-size: 14px;
	outline: none;
	transition: all 0.2s;
}
.field-input:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
.field-input.has-error {
	border-color: #ef4444;
}
.field-error {
	font-size: 11.5px;
	color: #ef4444;
}

.submit-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	margin-top: 4px;
	padding: 12px;
	border-radius: 10px;
	background: var(--primary);
	color: white;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	transition: filter 0.2s;
}
.submit-btn:hover {
	filter: brightness(1.06);
}
.submit-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.spinner {
	width: 15px;
	height: 15px;
	border: 2px solid rgba(255,255,255,0.35);
	border-top-color: white;
	border-radius: 999px;
	animation: spin 0.7s linear infinite;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

.switch-line {
	text-align: center;
	font-size: 12.5px;
	color: var(--text-muted);
}
.switch-link {
	color: var(--primary);
	font-weight: 700;
	cursor: pointer;
}
.switch-link:hover {
	text-decoration: underline;
}
</style>
