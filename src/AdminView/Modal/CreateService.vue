<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
	open: {
		type: Boolean,
		default: false
	},
	
	editingService: {
		type: Object,
		default: null
	},
	
	availableTypesPieces: {
		type: Array,
		default: () => []
	},
	
	loading: {
		type: Boolean,
		default: false
	},
	
	initialPieces: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits([
	'close',
	'save'
])

// ==================== FORMULAIRE LOCAL ====================

const form = reactive({
	libelle_service: '',
	description: '',
	duree_estimee_min: null,
	actif: true,
	pieces: []
})

// ==================== INITIALISATION ====================

const resetForm = () => {
	form.libelle_service = ''
		form.description = ''
			form.duree_estimee_min = null
				form.actif = true
					
					form.pieces = [
						{
							uid: Date.now() + Math.random(),
							mode: 'select',
							id_type_piece: null,
							new_libelle: '',
							new_multiple: false,
							obligatoire: true
						}
					]
}

const loadService = () => {
	if (props.editingService) {
		form.libelle_service = props.editingService.name
			form.description = props.editingService.description || ''
				form.duree_estimee_min = props.editingService.duration
					form.actif = props.editingService.status === 'Actif'
						
						form.pieces = props.initialPieces.map(piece => ({
							uid: `${piece.id_type_piece}-${Date.now()}-${Math.random()}`,
																		mode: 'select',
																		id_type_piece: piece.id_type_piece,
																		new_libelle: '',
																		new_multiple: false, 
																		obligatoire: piece.obligatoire
						}))
	} else {
		resetForm()
	}
}

// Quand la modale s'ouvre
watch(
	() => props.open,
	  (value) => {
		  if (value) {
			  loadService()
		  }
	  },
	  { immediate: true }
)

// ==================== PIÈCES ====================

const addPiece = () => {
	form.pieces.push({
		uid: Date.now() + Math.random(),
					 mode: 'select',
					 id_type_piece: null,
					 new_libelle: '',
					 new_multiple: false, 
					 obligatoire: true
	})
}

const removePiece = (index) => {
	form.pieces.splice(index, 1)
}

const onPieceSelectChange = (piece) => {
	if (piece.id_type_piece === 'NEW') {
		piece.mode = 'create'
		piece.id_type_piece = null
		piece.new_libelle = ''
	}
}

const cancelNewType = (piece) => {
	piece.mode = 'select'
	piece.new_libelle = ''
}

// ==================== VALIDATION ====================

const submit = () => {
	if (!form.libelle_service.trim()) {
		return
	}
	
	if (!form.duree_estimee_min || form.duree_estimee_min <= 0) {
		return
	}
	
	for (const piece of form.pieces) {
		if (
			piece.mode === 'select' &&
			(!piece.id_type_piece || piece.id_type_piece === 'NEW')
		) {
			return
		}
		
		if (
			piece.mode === 'create' &&
			!piece.new_libelle.trim()
		) {
			return
		}
	}
	
	emit('save', {
		libelle_service: form.libelle_service.trim(),
		 description: form.description.trim() || null,
		 duree_estimee_min: form.duree_estimee_min,
	  actif: form.actif,
	  
	  pieces: form.pieces.map(piece => ({
		  id_type_piece: piece.id_type_piece,
		  new_libelle: piece.new_libelle,
		  new_multiple: piece.new_multiple, 
		  mode: piece.mode,
		  obligatoire: piece.obligatoire
	  }))
	})
}

const close = () => {
	emit('close')
}
</script>

<template>

<transition name="modal">
<div
v-if="open"
class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
@click.self="close"
>
<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

<!-- ================= HEADER ================= -->
<div class="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
{{ editingService ? 'Modifier le service' : 'Créer un nouveau service fiscal' }}
</h2>
<button @click="close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
</svg>
</button>
</div>

<!-- ================= FORMULAIRE ================= -->
<form @submit.prevent="submit" class="p-6 overflow-y-auto space-y-5">

<!-- Libellé + durée -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
<div class="flex flex-col gap-2">
<label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Libellé du service</label>
<input
v-model="form.libelle_service"
type="text"
placeholder="Ex : Radiation d'un contribuable"
class="input-base"
required
>
</div>

<div class="flex flex-col gap-2">
<label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Durée estimée (min)</label>
<input
v-model.number="form.duree_estimee_min"
type="number"
min="1"
placeholder="25"
class="input-base"
required
>
</div>
</div>

<!-- ================= STATUT ================= -->
<div class="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
<div class="flex flex-col">
<span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Service actif</span>
<span class="text-xs text-slate-400">Un service inactif n'apparaît plus dans le portail contribuable</span>
</div>
<button
type="button"
role="switch"
:aria-checked="form.actif"
@click="form.actif = !form.actif"
:class="[
'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0',
form.actif ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
	]"
	>
	<span
	:class="[
	'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
form.actif ? 'translate-x-6' : 'translate-x-1'
	]"
	></span>
	</button>
	</div>
	
	<!-- ================= DESCRIPTION ================= -->
	<div class="flex flex-col gap-2">
	<label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
	<textarea
	v-model="form.description"
	rows="2"
	placeholder="Description du service (facultatif)"
	class="input-base resize-none"
	></textarea>
	</div>
	
	<!-- ================= PIECES ================= -->
	<div class="flex flex-col gap-3">
	<label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Pièces exigées</label>
	
	<p v-if="form.pieces.length === 0" class="text-xs text-slate-400 italic">
	Aucune pièce ajoutée pour le moment.
	</p>
	
	<transition-group name="list" tag="div" class="flex flex-col gap-3">
	<div
	v-for="(piece, index) in form.pieces"
	:key="piece.uid"
	class="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-700 transition-all hover:border-blue-400 group"
	>
	<div class="flex-1 flex flex-col gap-2">
	
	<!-- Sélection -->
	<select
	v-if="piece.mode === 'select'"
	v-model="piece.id_type_piece"
	class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 outline-none text-sm text-slate-800 dark:text-slate-100"
	@change="onPieceSelectChange(piece)"
	>
	<option :value="null" disabled>Choisir un type de pièce…</option>
	<option
	v-for="type in availableTypesPieces"
	:key="type.id_type_piece"
	:value="type.id_type_piece"
	>
	{{ type.libelle }} - {{ type.multiple ? ' (multiple)' : '' }}
	</option>
	<option value="NEW">+ Nouveau type de pièce…</option>
	</select>
	
	<!-- Nouveau type -->
	<div v-else class="flex flex-col gap-2 w-full">
	<!-- Ligne 1 : libellé + annuler -->
	<div class="flex items-center gap-2">
	<input
	v-model="piece.new_libelle"
	type="text"
	placeholder="Libellé du nouveau type de pièce"
	class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
	>
	<button
	type="button"
	class="text-xs font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
	@click="cancelNewType(piece)"
	>
	Annuler
	</button>
	</div>
	
	<!-- ⭐ Ligne 2 : toggle multiple/unique -->
	<div class="flex items-center gap-3 px-1">
	<span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
	Ce type de pièce :
	</span>
	
	<div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
	<button
	type="button"
	@click="piece.new_multiple = false"
	:class="[
	'px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer',
!piece.new_multiple
? 'bg-blue-600 text-white'
: 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
]"
>
Unique
</button>

<button
type="button"
@click="piece.new_multiple = true"
:class="[
'px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer',
piece.new_multiple
? 'bg-blue-600 text-white'
: 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
]"
>
Multiple
</button>
</div>

<span class="text-[10px] text-slate-400 dark:text-slate-500 italic">
{{ piece.new_multiple
	? 'Le contribuable pourra déposer plusieurs fichiers'
	: 'Un seul fichier autorisé' }}
	</span>
	</div>
	</div>
	
	</div>
	
	<!-- Obligatoire -->
	<div class="flex items-center gap-2 flex-shrink-0">
	<button
	type="button"
	@click="piece.obligatoire = !piece.obligatoire"
	:class="[
	'px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer',
piece.obligatoire
? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 shadow-inner'
: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
]"
>
{{ piece.obligatoire ? 'Obligatoire' : 'Facultatif' }}
</button>

<button
type="button"
@click="removePiece(index)"
class="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
title="Supprimer"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg>
</button>
</div>

</div>
</transition-group>

<button
type="button"
@click="addPiece"
class="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start transition-colors cursor-pointer"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
</svg>
Ajouter une pièce
</button>
</div>

<!-- ================= ACTIONS ================= -->
<div class="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
<button
type="button"
@click="close"
class="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
>
Annuler
</button>

<button
type="submit"
:disabled="loading"
class="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-[#1e3a5f] hover:bg-[#0b2a5b] text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
>
<span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
{{ editingService ? 'Enregistrer les modifications' : 'Enregistrer le service' }}
</button>
</div>

</form>
</div>
</div>
</transition>

</template>

<style scoped>
.input-base {
	width: 100%;
	padding: 12px 16px;
	border-radius: 10px;
	border: 1px solid #e2e8f0;
	background-color: #ffffff;
	font-size: 0.875rem;
	color: #1e293b;
	outline: none;
	transition: all 0.2s;
}

.input-base:focus {
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.list-enter-active,
.list-leave-active {
	transition: all 0.35s ease;
}

.list-enter-from,
.list-leave-to {
	opacity: 0;
	transform: translateX(-20px);
}

.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}
</style>
