<script setup>
import { reactive, ref, watch, onMounted } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import api from '@/api/Axios'

const props = defineProps({
	open: { type: Boolean, default: false },
	rdv: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved'])

const form = reactive({
	date_rdv: '',
	heure_rdv: '',
	id_service: null,
	commentaire: ''
})

const services = ref([])
const isSaving = ref(false)
const errorMessage = ref('')

const fetchServices = async () => {
	try {
		const res = await api.get('/services-fiscaux')
		
		if (res.data?.success) {
			services.value = res.data.data
		}
		
		console.log("service ressue : ",services.value)
		
	} catch (err) {
		console.error('Erreur chargement services :', err)
		console.error('Réponse serveur :', err.response?.data)
	}
}

watch(() => props.open, (value) => {
	if (value && props.rdv) {
		form.date_rdv = props.rdv.date_rdv
		form.heure_rdv = props.rdv.heure_rdv?.slice(0, 5) || ''
		form.id_service = props.rdv.id_service ?? props.rdv.service?.id_service ?? null
		form.commentaire = props.rdv.commentaire || ''
		errorMessage.value = ''
	}
})

const submit = async () => {
	isSaving.value = true
	errorMessage.value = ''
	
	try {
		const res = await api.patch(
			`/rendez-vous/${props.rdv.id_rdv}`,
			form
		)
		
		console.log('Rendez-vous modifié :', res.data)
		
		emit('saved')
	} catch (err) {
		if (err.response?.status === 409) {
			errorMessage.value =
			"Ce créneau n'est plus disponible. Choisissez une autre date ou heure."
		} else {
			errorMessage.value =
			err.response?.data?.message ||
			'Erreur lors de la modification du rendez-vous.'
		}
		
		console.error('Erreur modification rendez-vous :', err)
	} finally {
		isSaving.value = false
	}
}

onMounted(fetchServices)
</script>

<template>
<AnimatePresence>
<Motion
v-if="open && rdv"
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
<h2 class="modal-title">Modifier le rendez-vous</h2>
<button class="modal-close" @click="emit('close')">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
</button>
</div>

<form @submit.prevent="submit" class="modal-form">

<div class="grid-2">
<div class="field">
<label class="field-label">Date</label>
<input v-model="form.date_rdv" type="date" class="field-input" required>
</div>
<div class="field">
<label class="field-label">Heure</label>
<input v-model="form.heure_rdv" type="time" class="field-input" required>
</div>
</div>

<div class="field">
<label class="field-label">Service</label>
<select v-model="form.id_service" class="field-input" required>
<option :value="null" disabled>Sélectionnez un service</option>
<option v-for="s in services" :key="s.id_service" :value="s.id_service">{{ s.libelle_service }}</option>
</select>
</div>

<div class="field">
<label class="field-label">Commentaire (optionnel)</label>
<textarea v-model="form.commentaire" rows="3" class="field-input resize-none" placeholder="Précisez l'objet de votre visite..."></textarea>
</div>

<p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

<div class="modal-actions">
<button type="button" class="btn-secondary" @click="emit('close')">Annuler</button>
<button type="submit" class="btn-primary" :disabled="isSaving">
<span v-if="isSaving" class="btn-spinner"></span>
Enregistrer
</button>
</div>
</form>
</Motion>
</Motion>
</AnimatePresence>
</template>

<style scoped>
.modal-overlay {
	position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(3px);
	z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
	width: 100%; max-width: 440px; background: var(--card); border-radius: 16px;
	box-shadow: 0 20px 44px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15.5px; font-weight: 800; color: var(--text); }
.modal-close { color: var(--text-muted); background: none; border: none; cursor: pointer; }
.modal-close:hover { color: var(--text); }

.modal-form { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 700; color: var(--text); }
.field-input {
	width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border);
	background: var(--card); color: var(--text); font-size: 13.5px; outline: none; transition: all 0.15s;
}
.field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }

.error-message { font-size: 12.5px; color: #ef4444; background: color-mix(in srgb, #ef4444 8%, transparent); padding: 8px 12px; border-radius: 8px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn-secondary {
	padding: 9px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card);
	color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-primary {
	display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; border: none;
	background: var(--primary); color: white; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.06); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.35); border-top-color: white; border-radius: 999px; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
