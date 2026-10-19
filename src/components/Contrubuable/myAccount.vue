<script setup>
import { onMounted, reactive, ref } from 'vue'
import { motion } from 'motion-v'
import api from '@/api/Axios'
import { useToast } from 'vue-toastification'

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const savingPwd = ref(false)

const profil = reactive({
	id_contribuable: null,
	nif: '',
	nom_raison_sociale: '',
	prenom: '',
	type_contribuable: '',
	adresse: '',
	telephone: '',
	email: '',
	email_verified: false,
	admin_activation: false,
	is_active: true,
	last_login: null
})

const pwd = reactive({
	currentPassword: '',
	newPassword: '',
	confirm: ''
})

const TYPES = ['Personne physique', 'Personne morale']

function syncLocal(data) {
	const raw = localStorage.getItem('currentUser')
	if (!raw) return
		try {
			const user = JSON.parse(raw)
			localStorage.setItem('currentUser', JSON.stringify({
				...user,
				...data,
				id: data.id_contribuable || user.id,
				id_contribuable: data.id_contribuable
			}))
		} catch {}
}

async function load() {
	loading.value = true
	try {
		const res = await api.get('/contribuables/me')
		Object.assign(profil, res.data.data)
	} catch {
		toast.error('Impossible de charger le profil.')
	} finally {
		loading.value = false
	}
}

async function saveProfil() {
	saving.value = true
	try {
		const res = await api.patch('/contribuables/me', {
			nom_raison_sociale: profil.nom_raison_sociale,
			prenom: profil.prenom,
			type_contribuable: profil.type_contribuable,
			adresse: profil.adresse,
			telephone: profil.telephone,
			email: profil.email
		})
		Object.assign(profil, res.data.data)
		syncLocal(res.data.data)
		toast.success('Profil mis à jour.')
	} catch {
		/* toast Axios */
	} finally {
		saving.value = false
	}
}

async function savePassword() {
	if (pwd.newPassword !== pwd.confirm) {
		toast.warning('La confirmation ne correspond pas.')
		return
	}
	savingPwd.value = true
	try {
		await api.patch('/contribuables/me/password', {
			currentPassword: pwd.currentPassword,
			newPassword: pwd.newPassword
		})
		pwd.currentPassword = ''
		pwd.newPassword = ''
		pwd.confirm = ''
		toast.success('Mot de passe modifié.')
	} catch {
		/* toast Axios */
	} finally {
		savingPwd.value = false
	}
}

function fmtDate(v) {
	if (!v) return 'Jamais'
		return new Date(v).toLocaleString('fr-FR')
}

onMounted(load)
</script>

<template>
<div class="p-5 sm:p-8 min-h-[calc(100vh-64px)]" style="background: var(--bg); color: var(--text);">
<motion.div :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" class="mb-8">
<p class="text-[11px] uppercase tracking-[0.25em] font-bold" style="color: var(--primary);">Espace contribuable</p>
<h1 class="text-2xl sm:text-3xl font-bold mt-1">Mon compte</h1>
<p class="text-sm mt-1" style="color: var(--text-muted);">Consulter et modifier vos informations. Le NIF n’est pas modifiable.</p>
</motion.div>

<div v-if="loading" class="h-48 rounded-2xl animate-pulse" style="background: var(--card);" />

<div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<aside class="rounded-2xl border p-5" style="background: var(--card); border-color: var(--border);">
<p class="text-xs font-bold uppercase" style="color: var(--text-muted);">NIF</p>
<p class="text-lg font-bold mt-1">{{ profil.nif }}</p>
<div class="mt-4 space-y-2 text-sm">
<p><span style="color: var(--text-muted);">Email</span> · {{ profil.email_verified ? 'vérifié' : 'non vérifié' }}</p>
<p><span style="color: var(--text-muted);">Compte</span> · {{ profil.admin_activation ? 'approuvé' : 'en attente' }}</p>
<p><span style="color: var(--text-muted);">Statut</span> · {{ profil.is_active ? 'actif' : 'désactivé' }}</p>
<p><span style="color: var(--text-muted);">Dernière connexion</span><br>{{ fmtDate(profil.last_login) }}</p>
</div>
</aside>

<section class="lg:col-span-2 space-y-6">
<form class="rounded-2xl border p-5 space-y-4" style="background: var(--card); border-color: var(--border);" @submit.prevent="saveProfil">
<h2 class="font-bold">Informations</h2>
<div class="grid sm:grid-cols-2 gap-4">
<label class="text-sm sm:col-span-2">
<span style="color: var(--text-muted);">NIF</span>
<input :value="profil.nif" disabled class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text-muted);">
</label>
<label class="text-sm">
<span style="color: var(--text-muted);">Nom / raison sociale</span>
<input v-model="profil.nom_raison_sociale" required class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm">
<span style="color: var(--text-muted);">Prénom</span>
<input v-model="profil.prenom" class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm">
<span style="color: var(--text-muted);">Type</span>
<select v-model="profil.type_contribuable" class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
<option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
</select>
</label>
<label class="text-sm">
<span style="color: var(--text-muted);">Téléphone</span>
<input v-model="profil.telephone" class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm sm:col-span-2">
<span style="color: var(--text-muted);">Email</span>
<input v-model="profil.email" type="email" required class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm sm:col-span-2">
<span style="color: var(--text-muted);">Adresse</span>
<input v-model="profil.adresse" class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
</div>
<button type="submit" :disabled="saving" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background: var(--primary);">
{{ saving ? 'Enregistrement…' : 'Enregistrer' }}
</button>
</form>

<form class="rounded-2xl border p-5 space-y-4" style="background: var(--card); border-color: var(--border);" @submit.prevent="savePassword">
<h2 class="font-bold">Mot de passe</h2>
<label class="text-sm block">
<span style="color: var(--text-muted);">Mot de passe actuel</span>
<input v-model="pwd.currentPassword" type="password" required class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm block">
<span style="color: var(--text-muted);">Nouveau (8 caractères min.)</span>
<input v-model="pwd.newPassword" type="password" required minlength="8" class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<label class="text-sm block">
<span style="color: var(--text-muted);">Confirmation</span>
<input v-model="pwd.confirm" type="password" required class="mt-1 w-full px-3 py-2.5 rounded-xl" style="background: var(--hover); color: var(--text);">
</label>
<button type="submit" :disabled="savingPwd" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background: var(--titlebar);">
{{ savingPwd ? 'Modification…' : 'Changer le mot de passe' }}
</button>
</form>
</section>
</div>
</div>
</template>
