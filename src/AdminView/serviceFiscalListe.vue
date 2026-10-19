<template>
<div :class="['admin-container',toogleTheme ? 'dark' : 'light']" >

<!-- ==================== CONTENU PRINCIPAL ==================== -->
<div class="content-wrapper">

<!-- Titre, Recherche et Bouton Ajouter -->
<div class="flex flex-col md:flex-row justify-end items-center gap-4 mb-6">

<div class="flex gap-3 w-full md:w-auto">
<!-- Barre de recherche -->
<div class="relative flex-1 md:w-64">
<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
</svg>
<input
v-model="searchQuery"
type="text"
placeholder="Rechercher un service..."
class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
>
</div>

<button
@click="openModal()"
class="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
</svg>
Ajouter un service
</button>
</div>
</div>


<div v-if="isLoadings" class="flex items-center justify-center py-20">
<span class="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
</div>

<!-- Tableau des services -->
<div
v-else-if="filteredServices.length > 0"
class="corps-table rounded-xl border border-slate-200 shadow-sm overflow-hidden"
>
<div class="overflow-x-auto">
<table class="w-full text-left text-sm">
<thead class="text-xs uppercase border-b">
<tr>
<th class="px-6 py-4 font-semibold">Service</th>
<th class="px-6 py-4 font-semibold">Durée</th>
<th class="px-6 py-4 font-semibold">Pièces</th>
<th class="px-6 py-4 font-semibold">Statut</th>
<th class="px-6 py-4 font-semibold text-right">Actions</th>
</tr>
</thead>

<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
<tr
v-for="service in paginatedServices"
:key="service.id"
class="service-row group hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors"
>
<td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">
{{ service.name }}
</td>
<td class="px-6 py-4 text-slate-600 dark:text-slate-300">
{{ service.duration }} min
</td>
<td class="px-6 py-4 text-slate-600 dark:text-slate-300">
{{ service.pieces }}
</td>
<td class="px-6 py-4">
<span
:class="[
'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
service.status === 'Actif'
? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
]"
>
<span
:class="[
'w-1.5 h-1.5 rounded-full',
service.status === 'Actif' ? 'bg-emerald-500' : 'bg-slate-400'
]"
></span>
{{ service.status }}
</span>
</td>
<td class="px-6 py-4">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button
@click="openModal(service)"
class="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition dark:text-blue-400 dark:hover:bg-slate-600 cursor-pointer"
title="Modifier"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
</svg>
</button>
<button
@click="copyService(service)"
class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition dark:text-red-400 dark:hover:bg-slate-600 cursor-pointer"
title="Supprimer"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<!-- ========== FOOTER AVEC PAGINATION ========== -->
<div class="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
<p class="text-xs text-slate-500 dark:text-slate-400">
Affichage de
<strong>{{ paginatedServices.length }}</strong>
sur
<strong>{{ filteredServices.length }}</strong>
services
<span v-if="totalPages > 1" class="ml-1">
(page {{ currentPage }} / {{ totalPages }})
</span>
</p>

<!-- Boutons de pagination (visibles seulement s’il y a plus de 4 éléments) -->
<div v-if="totalPages > 1" class="flex items-center gap-2">
<button
@click="goToPrev"
:disabled="currentPage === 1"
class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
</svg>
Précédent
</button>

<button
@click="goToNext"
:disabled="currentPage === totalPages"
class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
>
Suivant
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
</svg>
</button>
</div>
</div>
</div>

</div>

<!-- ==================== MODALE AJOUT / ÉDITION ==================== -->
<ServiceModal
:open="isModalOpen"
:editing-service="editingService"
:available-types-pieces="availableTypesPieces"
:initial-pieces="editingPieces"
:loading="isLoading"
@close="closeModal"
@save="saveService"
/>

<!-- Toast de confirmation -->
<transition name="toast">
<div v-if="toastMessage" class="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 border-l-4" :class="toastType === 'error' ? 'border-red-500' : 'border-emerald-500'">
<svg class="w-6 h-6" :class="toastType === 'error' ? 'text-red-400' : 'text-emerald-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<span class="text-sm font-medium">{{ toastMessage }}</span>
</div>
</transition>

</div>
<DeleteConfirmation
:isOpen="isShowDelete"
delete-text="Voulez-vous vraiment supprimer le service"
:item-name="serv.name"
@delete="confirmDelete(serv)"
@close="ferme"
/>
</template>

<script setup>
import { ref, reactive, computed, onMounted ,watch} from 'vue'
import gsap from 'gsap'

import ServiceModal from '@/AdminView/Modal/CreateService.vue'
import api from '@/api/Axios.js'
import {playSound} from '@/services/sonnerie'
import DeleteConfirmation from '@/components/DeleteConfirmation.vue'

// ==================== DONNÉES (Table) ====================
const services = ref([])
const serv = ref({})

const copyService = function(service){
	 
	serv.value = service
	isShowDelete.value = true
}

const isModalOpen = ref(false)
const editingService = ref(null)
const editingPieces = ref([])
const isLoading = ref(false)
const isDark = ref(localStorage.getItem('dark')== 'dark')

const toogleTheme = computed(()=>{
	 if(isDark.value){
		 return true
	}else {
		return false
	}
})


const availableTypesPieces = ref([])

// ==================== ÉTAT DE L'INTERFACE ====================
const searchQuery = ref('')
const toastMessage = ref('')
const toastType = ref('success')
const isLoadings = ref(true)

// ==================== CHARGEMENT DEPUIS L'API ====================
const fetchServices = async () => {
	try {
		isLoadings.value = true
		
		const response = await api.get('/services-fiscaux?includeInactive=true')
		
		console.log('Réponse API services :', response.data)
		
		const data = response.data.data || []
		
		services.value = data.map(s => ({
			id: s.id_service,
			name: s.libelle_service,
			duration: s.duree_estimee_min,
			pieces: s.nb_pieces ?? 0,
			status: s.actif ? 'Actif' : 'Inactif'
		}))
		
	} catch (err) {
		console.error('Erreur Vue :', err)
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les services',
			'error'
		)
	}finally {
		isLoadings.value = false
	}
}

const fetchTypesPieces = async () => {
	try {
		const response = await api.get('/admin/type')
		
		console.log('Types de pièces :', response.data)
		
		availableTypesPieces.value = response.data
		
	} catch (err) {
		console.error(
			'Erreur chargement types pièces :',
			err
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les types de pièces',
			'error'
		)
	}
}

const fetchServicePieces = async (id_service) => {
	try {
		const response = await api.get(
			`/admin/services/${id_service}/pieces`
		)
		
		console.log(
			'Pièces du service :',
			response.data
		)
		
		const data = response.data.data || response.data
		
		return data.map(p => ({
			uid: `${p.id_type_piece}-${Date.now()}-${Math.random()}`,
							  mode: 'select',
							  id_type_piece: p.id_type_piece,
							  new_libelle: '',
							  obligatoire: p.obligatoire
		}))
		
	} catch (err) {
		console.error(
			'Erreur chargement pièces service :',
			err
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les pièces du service',
			'error'
		)
		
		return []
	}
}

// ==================== LOGIQUE TABLEAU ====================
const filteredServices = computed(() => {
	if (!searchQuery.value) return services.value
		const query = searchQuery.value.toLowerCase()
		return services.value.filter(s => s.name.toLowerCase().includes(query))
})

// ==================== GESTION DES PIÈCES ====================
const addPiece = () => {
	form.pieces.push({
		uid: Date.now() + Math.random(),
					 mode: 'select',
					 id_type_piece: null,
					 new_libelle: '',
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

// ==================== OUVERTURE / FERMETURE MODALE ====================
const openModal = async (service = null) => {
	
	editingService.value = service
	editingPieces.value = []
	
	if (service) {
		editingPieces.value = await fetchServicePieces(service.id)
	}
	
	isModalOpen.value = true
}

const closeModal = () => {
	isModalOpen.value = false
	editingService.value = null
	editingPieces.value = []
}
  
  
  // ==================== ENREGISTREMENT DU SERVICE ====================
  const saveService = async (formData) => {
	  
	  console.log('📦 Données reçues de ServiceModal :', formData)
	  
	  isLoading.value = true
	  
	  try {
		  
		  // ==========================================================
		  // 1. CRÉER LES NOUVEAUX TYPES DE PIÈCES SI NÉCESSAIRE
		  // ==========================================================
		  
		  for (const piece of formData.pieces) {
			  
			  if (piece.mode === 'create') {
				  
				  if (!piece.new_libelle?.trim()) {
					  throw new Error(
						  'Le libellé du nouveau type de pièce est obligatoire.'
					  )
				  }
				  
				  console.log(
					  '➕ Création du type de pièce :',
				  piece.new_libelle
				  )
				  
				  const response = await api.post(
					  '/admin/type/create',
					  {
						  libelle: piece.new_libelle.trim(),
						  multiple: Boolean(piece.new_multiple)
					  }
				  )
				  
				  console.log(
					  '✅ Type de pièce créé :',
				  response.data
				  )
				  
				  
				  const createdType =
				  response.data.data || response.data
				  
				  if (!createdType?.id_type_piece) {
					  throw new Error(
						  'Le serveur n\'a pas retourné l\'ID du type de pièce créé.'
					  )
				  }
				  
				  // On récupère l'ID créé
				  piece.id_type_piece =
				  createdType.id_type_piece
				  
				  // On ajoute le nouveau type dans la liste
				  availableTypesPieces.value.push(
					  createdType
				  )
			  }
		  }
		  
		  
		  // ==========================================================
		  // 2. PRÉPARER LES DONNÉES DU SERVICE
		  // ==========================================================
		  
		  const payload = {
			  libelle_service:
			  formData.libelle_service?.trim(),
				  
				  description:
				  formData.description?.trim() || null,
					  
					  duree_estimee_min:
					  Number(formData.duree_estimee_min),
					  
					  actif:
					  formData.actif ?? true
		  }
		  
		  console.log(
			  '📤 Payload service :',
			  payload
		  )
		  
		  
		  // ==========================================================
		  // 3. VALIDATION FRONTEND
		  // ==========================================================
		  
		  if (!payload.libelle_service) {
			  throw new Error(
				  'Le libellé du service est obligatoire.'
			  )
		  }
		  
		  if (
			  !Number.isInteger(
				  payload.duree_estimee_min
			  ) ||
			  payload.duree_estimee_min <= 0
		  ) {
			  throw new Error(
				  'La durée estimée doit être un entier positif.'
			  )
		  }
		  
		  
		  // ==========================================================
		  // 4. VÉRIFIER LES PIÈCES
		  // ==========================================================
		  
		  for (const piece of formData.pieces) {
			  
			  if (!piece.id_type_piece) {
				  
				  throw new Error(
					  'Chaque pièce doit avoir un type de pièce valide.'
				  )
			  }
		  }
		  
		  
		  // ==========================================================
		  // 5. CRÉATION OU MODIFICATION DU SERVICE
		  // ==========================================================
		  
		  let idService = null
		  
		  if (editingService.value) {
			  
			  // ======================================================
			  // MODIFICATION
			  // ======================================================
			  
			  console.log(
				  '✏️ Modification du service :',
				 editingService.value.id
			  )
			  
			  const response = await api.patch(
				  `/services-fiscaux/edit/${editingService.value.id}`,
				  payload
			  )
			  
			  console.log(
				  '✅ Service modifié :',
				 response.data
			  )
			  
			  
			  const updatedService =
			  response.data.data
			  
			  if (!updatedService?.id_service) {
				  
				  throw new Error(
					  'L\'ID du service modifié est introuvable.'
				  )
			  }
			  
			  idService =
			  updatedService.id_service
			  
		  } else {
			  
			  // ======================================================
			  // CRÉATION
			  // ======================================================
			  
			  console.log(
				  '➕ Création du service'
			  )
			  
			  const response = await api.post(
				  '/services-fiscaux/create',
				  payload
			  )
			  
			  console.log(
				  '✅ Service créé :',
				 response.data
			  )
			  
			  const createdService =
			  response.data.data
			  
			  if (!createdService?.id_service) {
				  
				  console.error(
					  '❌ Réponse serveur inattendue :',
					response.data
				  )
				  
				  throw new Error(
					  'Le serveur n\'a pas retourné l\'ID du service créé.'
				  )
			  }
			  
			  idService =
			  createdService.id_service
		  }
		  
		  
		  // ==========================================================
		  // 6. VÉRIFICATION CRITIQUE DE L'ID
		  // ==========================================================
		  
		  console.log(
			  '🆔 ID du service utilisé pour les pièces :',
			  idService
		  )
		  
		  if (!idService) {
			  
			  throw new Error(
				  'Impossible d\'associer les pièces : ID du service manquant.'
			  )
		  }
		  
		  
		  // ==========================================================
		  // 7. PRÉPARER LES PIÈCES
		  // ==========================================================
		  
		  const piecesPayload = {
			  
			  pieces: formData.pieces.map(piece => ({
				  
				  id_type_piece:
				  piece.id_type_piece,
				  
				  obligatoire:
				  Boolean(piece.obligatoire)
				  
			  }))
		  }
		  
		  console.log(
			  '📄 Pièces à associer :',
			  piecesPayload
		  )
		  
		  
		  // ==========================================================
		  // 8. ASSOCIATION / REMPLACEMENT DES PIÈCES
		  // ==========================================================
		  
		  const piecesResponse = await api.put(
			  
			  `/admin/services/${idService}/pieces`,
			  
			  piecesPayload
		  )
		  
		  console.log(
			  '✅ Pièces associées :',
			  piecesResponse.data
		  )
		  
		  
		  // ==========================================================
		  // 9. RAFRAÎCHIR LA LISTE DES SERVICES
		  // ==========================================================
		  
		  await fetchServices()
		  
		  
		  // ==========================================================
		  // 10. MESSAGE DE SUCCÈS
		  // ==========================================================
		  playSound(editingService.value ? 'update': 'success')
		  showToast(
			  
			  editingService.value
			  ? 'Service modifié avec succès !'
			  : 'Service fiscal enregistré avec succès !'
			  
		  )
		  
		  
		  // ==========================================================
		  // 11. FERMER LA MODALE
		  // ==========================================================
		  
		  closeModal()
		  
		  
	  } catch (err) {
		  
		  console.error(
			  '❌ Erreur saveService :',
			  err
		  )
		  
		  console.error(
			  '📋 Réponse serveur :',
			  err.response?.data
		  )
		  
		  showToast(
			  
			  err.response?.data?.message ||
			  err.message ||
			  'Une erreur est survenue lors de l\'enregistrement.',
			  
			  'error'
		  )
		  
	  } finally {
		  
		  isLoading.value = false
	  }
  }
  //modal delete
  const isShowDelete = ref(false)
  
 
const ferme = function(){
	isShowDelete.value = false
}

//======================================================
// PAGINATION DE TABLEAU
//======================================================

// ==================== PAGINATION ====================
const currentPage = ref(1)
const itemsPerPage = 4

const totalPages = computed(() =>
Math.ceil(filteredServices.value.length / itemsPerPage) || 1
)

const paginatedServices = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage
	return filteredServices.value.slice(start, start + itemsPerPage)
})

// Remettre à la page 1 quand on recherche
watch(searchQuery, () => {
	currentPage.value = 1
})

const goToPrev = () => {
	if (currentPage.value > 1) currentPage.value--
}

const goToNext = () => {
	if (currentPage.value < totalPages.value) currentPage.value++
}


// ==================== SUPPRESSION ====================
const confirmDelete = async (service) => {
	
	try {
		
		await api.delete(
			`/services-fiscaux/${service.id}`
		)
		
		services.value =
		services.value.filter(
			s => s.id !== service.id
		)
		playSound('delete')
		isShowDelete.value = false
		showToast('Service supprimé')
		
	} catch (err) {
		
		console.error(
			'Erreur suppression :',
			err
		)
		playSound('error')
		
		
		showToast(
			err.response?.data?.message ||
			'Impossible de supprimer ce service',
			'error'
		)
	}
}

// ==================== TOAST ====================
const showToast = (message, type = 'success') => {
	toastType.value = type
	toastMessage.value = message
	setTimeout(() => {
		toastMessage.value = ''
	}, 3000)
}

// ==================== CYCLE DE VIE ====================
onMounted(async () => {
	await Promise.all([
		fetchServices(),
		fetchTypesPieces()])
	
	gsap.from('.service-row', {
		y: 20,
		opacity: 0,
		duration: 0.5,
		stagger: 0.1,
		ease: 'power2.out',
		delay: 0.2
	})
})
</script>

<style scoped>
/* ========== CONTAINER ========== */
.admin-container {
	min-height: 100vh;
	background-color: var(--bg);
	color: var(--text);
	font-family: 'Inter', sans-serif;
	transition: background-color 0.3s, color 0.3s;
}

.content-wrapper {
	max-width: 1200px;
	margin: 0 auto;
	padding: 32px 24px;
}

/* ========== BARRE DE RECHERCHE ========== */
.admin-container input[type="text"] {
	width: 100%;
	padding: 0.625rem 1rem 0.625rem 2.5rem;
	border-radius: 0.5rem;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	font-size: 0.875rem;
	outline: none;
	transition: all 0.2s;
}

.admin-container input[type="text"]::placeholder {
	color: var(--text-muted);
}

.admin-container input[type="text"]:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
	background: var(--card);
}

/* Icône de recherche */
.admin-container .text-slate-400 {
	color: var(--text-muted) !important;
}

/* ========== BOUTON AJOUTER ========== */
.admin-container button.bg-blue-600 {
	background-color: var(--primary) !important;
	color: white !important;
	border: none;
	box-shadow: 0 4px 6px -1px color-mix(in srgb, var(--primary) 30%, transparent);
}

.admin-container button.bg-blue-600:hover {
	filter: brightness(0.92);
	box-shadow: 0 6px 12px -2px color-mix(in srgb, var(--primary) 40%, transparent);
}

/* ========== TABLEAU ========== */
.corps-table {
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 0.75rem;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	overflow: hidden;
}

/* En-tête du tableau */
.corps-table thead {
	background: var(--bg);
	color: var(--text-muted);
	border-bottom: 1px solid var(--border);
}

.corps-table thead th {
	font-weight: 600;
	letter-spacing: 0.025em;
}

/* Corps du tableau */
.corps-table tbody {
	color: var(--text);
}

.corps-table tbody tr {
	border-bottom: 1px solid var(--border);
	transition: background-color 0.15s ease;
}

/* Hover des lignes → orange doux (clair) / cyan doux (sombre) */
.service-row:hover {
	background: var(--bgListCard) !important;
}

.service-row td {
	color: var(--text);
}

.service-row .text-slate-600,
.service-row .text-slate-300 {
	color: var(--text-muted) !important;
}

/* ========== BADGE STATUT ========== */
/* Actif */
.corps-table .bg-emerald-100 {
	background-color: color-mix(in srgb, #10b981 15%, transparent) !important;
	color: #047857 !important;
}
.dark .corps-table .bg-emerald-100,
.dark .corps-table .dark\:bg-emerald-500\/10 {
	background-color: color-mix(in srgb, #10b981 15%, transparent) !important;
	color: #34d399 !important;
}

/* Inactif */
.corps-table .bg-slate-100 {
	background-color: color-mix(in srgb, var(--text-muted) 15%, transparent) !important;
	color: var(--text-muted) !important;
}
.dark .corps-table .bg-slate-100,
.dark .corps-table .dark\:bg-slate-700 {
	background-color: color-mix(in srgb, var(--text-muted) 20%, transparent) !important;
	color: var(--text-muted) !important;
}

/* ========== BOUTONS D'ACTIONS ========== */
.service-row button {
	transition: all 0.2s;
}

/* Modifier (bleu) */
.service-row button.text-blue-600,
.service-row button.dark\:text-blue-400 {
	color: var(--primary) !important;
}
.service-row button.text-blue-600:hover,
.service-row button.dark\:hover\:bg-slate-600:hover {
	background-color: color-mix(in srgb, var(--primary) 15%, transparent) !important;
}

/* Supprimer (rouge) */
.service-row button.text-red-600,
.service-row button.dark\:text-red-400 {
	color: #dc2626 !important;
}
.service-row button.text-red-600:hover {
	background-color: color-mix(in srgb, #ef4444 12%, transparent) !important;
}

/* ========== FOOTER DU TABLEAU ========== */
.corps-table > div:last-child {
	background: var(--bg);
	border-top: 1px solid var(--border);
	color: var(--text-muted);
}

.corps-table > div:last-child strong {
	color: var(--text);
}

/* ========== ÉTAT VIDE ========== */
.corps-table .text-slate-300,
.corps-table .text-slate-600 {
	color: var(--text-muted) !important;
}

.corps-table .text-slate-500,
.corps-table .text-slate-400 {
	color: var(--text-muted) !important;
}

/* ========== LOADER ========== */
.admin-container .border-blue-600\/30 {
	border-color: color-mix(in srgb, var(--primary) 30%, transparent) !important;
}
.admin-container .border-t-blue-600 {
	border-top-color: var(--primary) !important;
}

/* ========== TOAST ========== */
.fixed.bottom-6 {
	background: var(--titlebar);
	color: #ffffff;
	border-left-width: 4px;
}

.border-emerald-500 {
	border-color: #10b981;
}

.border-red-500 {
	border-color: #ef4444;
}

.text-emerald-400 {
	color: #34d399;
}

.text-red-400 {
	color: #f87171;
}

/* ========== TRANSITIONS ========== */
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

.toast-enter-active,
.toast-leave-active {
	transition: all 0.4s ease;
}
.toast-enter-from,
.toast-leave-to {
	opacity: 0;
	transform: translateX(100%);
}

@keyframes pulse {
	0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 70%, transparent); }
	70%  { box-shadow: 0 0 0 6px transparent; }
	100% { box-shadow: 0 0 0 0 transparent; }
}
</style>
