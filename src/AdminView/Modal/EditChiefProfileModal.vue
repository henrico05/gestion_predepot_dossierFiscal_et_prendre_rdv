<script setup>
import { reactive, ref, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'

const props = defineProps({
	open: { type: Boolean, default: false },
	chief: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
	nom: '',
	prenom: '',
	email: '',
	photo_base64: null,
	photo_content_type: null
})

const previewUrl = ref(null)
const isSaving = ref(false)
const fileInput = ref(null)

watch(() => props.open, (value) => {
	if (value) {
		form.nom = props.chief.nom || ''
			form.prenom = props.chief.prenom || ''
				form.email = props.chief.email || ''
					form.photo_base64 = props.chief.photo_base64 || null
						form.photo_content_type = props.chief.photo_content_type || null
							previewUrl.value = form.photo_base64
							? `data:${form.photo_content_type};base64,${form.photo_base64}`
							: null
	}
})

const triggerFileSelect = () => fileInput.value?.click()

const onFileChange = (event) => {
	const file = event.target.files?.[0]
	if (!file) return
		
		if (!file.type.startsWith('image/')) {
			alert('Veuillez sélectionner une image')
			return
		}
		
		if (file.size > 3 * 1024 * 1024) {
			alert('L\'image ne doit pas dépasser 3 Mo')
			return
		}
		
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result // data:image/png;base64,XXXX
			const [meta, base64] = result.split(',')
			form.photo_content_type = meta.match(/data:(.*);base64/)[1]
				form.photo_base64 = base64
					previewUrl.value = result
		}
		reader.readAsDataURL(file)
}

const removePhoto = () => {
	form.photo_base64 = null
		form.photo_content_type = null
			previewUrl.value = null
}

const submit = async () => {
	if (!form.nom.trim() || !form.prenom.trim()) return
		
		isSaving.value = true
		try {
			await emit('save', { ...form })
		} finally {
			isSaving.value = false
		}
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
class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
@click.self="emit('close')"
>
<Motion
:initial="{ opacity: 0, scale: 0.95, y: 10 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.95, y: 10 }"
:transition="{ duration: 0.25, ease: 'easeOut' }"
class="bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
>
<div class="p-6 border-b border-[var(--border)] flex justify-between items-center">
<h2 class="text-lg font-bold text-[var(--text)]">Modifier mon profil</h2>
<button @click="emit('close')" class="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
</button>
</div>

<form @submit.prevent="submit" class="p-6 space-y-5">

<!-- Photo -->
<div class="flex flex-col items-center gap-3">
<div class="relative">
<img v-if="previewUrl" :src="previewUrl" class="w-24 h-24 rounded-full object-cover border-4 border-[var(--hover)]">
<div v-else class="w-24 h-24 rounded-full bg-[var(--bgListCard)] text-[var(--primary)] flex items-center justify-center font-bold text-2xl border-4 border-[var(--hover)]">
{{ form.nom?.[0] }}{{ form.prenom?.[0] }}
</div>
<button
type="button"
@click="triggerFileSelect"
class="absolute bottom-0 right-0 w-8 h-8 bg-[var(--primary)] hover:brightness-105 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
</button>
<input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange">
</div>
<button v-if="previewUrl" type="button" @click="removePhoto" class="text-xs text-red-500 hover:underline cursor-pointer">
Retirer la photo
</button>
</div>

<!-- Champs -->
<div class="grid grid-cols-2 gap-4">
<div class="flex flex-col gap-2">
<label class="text-sm font-semibold text-[var(--text)]">Nom</label>
<input v-model="form.nom" type="text" required class="input-base" placeholder="EX : RAKOTO">
</div>
<div class="flex flex-col gap-2">
<label class="text-sm font-semibold text-[var(--text)]">Prénom</label>
<input v-model="form.prenom" type="text" required class="input-base" placeholder="Ex : James">
</div>
</div>

<div class="flex flex-col gap-2">
<label class="text-sm font-semibold text-[var(--text)]">E-mail</label>
<input v-model="form.email" type="email" required class="input-base" placeholder="Ex : Rakoto@impot.com">
</div>

<!-- Actions -->
<div class="flex justify-end gap-3 pt-2">
<button type="button" @click="emit('close')" class="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--hover)] transition cursor-pointer">
Annuler
</button>
<button
type="submit"
:disabled="isSaving"
class="flex items-center gap-2 bg-[var(--primary)] hover:brightness-105 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
>
<span v-if="isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
Enregistrer
</button>
</div>
</form>
</Motion>
</Motion>
</AnimatePresence>
</template>

<style scoped>
.input-base {
	width: 100%;
	padding: 10px 14px;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--card);
	font-size: 14px;
	color: var(--text);
	outline: none;
	transition: all 0.2s;
}
.input-base::placeholder {
	color: var(--text-muted);
}
.input-base:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
</style>
