<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { motion, AnimatePresence } from 'motion-v'
import gsap from 'gsap'
import api from '@/api/Axios'

const route  = useRoute()
const router = useRouter()

const currentUser = ref(null)

try {
	currentUser.value = JSON.parse(
		localStorage.getItem('currentUser') || 'null'
	)
} catch (error) {
	console.error('❌ Impossible de lire currentUser :', error)
	currentUser.value = null
}

const idContribuable = computed(() =>
currentUser.value?.id || currentUser.value?.id_contribuable || null
)

/* RG4/RG5 : un dossier peut être rattaché à zéro ou un RDV existant */
const linkedRdvId = ref(route.query.rdv || null)

/* ============================================================
 * ÉTAPES
 * ============================================================ */
const steps = [
	{ id: 1, label: 'Service',      icon: 'briefcase' },
{ id: 2, label: 'Rendez-vous',  icon: 'calendar' },
{ id: 3, label: 'Pièces',       icon: 'file' },
{ id: 4, label: 'Confirmation', icon: 'check' }
]
const currentStep = ref(1)
const direction   = ref(1)

const goNext     = () => {
	direction.value =  1; 
	submitError.value = '';
	currentStep.value++ 
	
}
const goPrevious = () => {
	direction.value = -1;
	submitError.value = '';
	currentStep.value-- 
	
}

/* ============================================================
 * ÉTAPE 1 — SERVICE
 * ============================================================ */
const services          = ref([])
const isLoadingServices = ref(true)
const selectedServiceId = ref(null)

const fetchServices = async () => {
	isLoadingServices.value = true
	
	try {
		const response = await api.get('/services-fiscaux')
		
		services.value = response.data?.data || []
		
		console.log('✅ Services fiscaux chargés :', services.value)
		
	} catch (err) {
		console.error(
			'❌ Erreur chargement services fiscaux :',
			err
		)
		
		services.value = []
	} finally {
		isLoadingServices.value = false
	}
}

const selectedService = computed(() =>
services.value.find(s => s.id_service === selectedServiceId.value) || null
)

watch(selectedServiceId, () => {
	selectedRdvId.value = null
	linkedRdvId.value = null
	rdvMode.value = null
	rdvError.value = ''
	submitError.value = ''
})

/* ============================================================
 * ÉTAPE 2 — RDV
 * ============================================================ */

const rdvMode     = ref(linkedRdvId.value ? 'avec' : null) // 'avec' | 'sans'
const rdvList     = ref([])                                // RDV disponibles pour le contribuable
const isLoadingRdv = ref(false)
const selectedRdvId = ref(linkedRdvId.value || null)       // RDV choisi
const rdvError    = ref('')

const fetchAvailableRdv = async () => {
	isLoadingRdv.value = true
	rdvError.value = ''
	
	try {
		if (!idContribuable.value) {
			throw new Error(
				'Impossible d’identifier le contribuable connecté.'
			)
		}
		
		console.log(
			'📅 Chargement des RDV du contribuable :',
			idContribuable.value
		)
		
		const response = await api.get(
			`/rendez-vous/contribuable/${idContribuable.value}`
		)
		
		console.log('📅 Réponse RDV :', response.data)
		
		const data = response.data?.data || []
		
		rdvList.value = Array.isArray(data) ? data : []
		
		console.log(
			'✅ RDV récupérés :',
			rdvList.value
		)
		
		// Vérification du RDV venant éventuellement de ?rdv=...
		if (selectedRdvId.value) {
			const exists = rdvList.value.some(
				rdv =>
				Number(rdv.id_rdv) ===
				Number(selectedRdvId.value)
			)
			
			if (!exists) {
				console.warn(
					'⚠️ Le RDV présélectionné n’appartient pas au contribuable.'
				)
				
				selectedRdvId.value = null
				linkedRdvId.value = null
			}
		}
		
	} catch (err) {
		console.error(
			'❌ Erreur chargement RDV :',
			err.response?.data || err
		)
		
		rdvList.value = []
		
		rdvError.value =
		err.response?.data?.message ||
		err.message ||
		'Impossible de charger vos rendez-vous.'
		
	} finally {
		isLoadingRdv.value = false
	}
}

/* Normalise un statut : enlève accents, espaces, passe en majuscules */
const normalizedStatut = (s) =>
String(s || '')
.trim()
.toUpperCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')

const filteredRdvList = computed(() => {
	if (!selectedServiceId.value) return []
		
		return rdvList.value.filter(
			rdv =>
			Number(rdv.id_service) === Number(selectedServiceId.value) &&
			normalizedStatut(rdv.statut_rdv) === 'CONFIRME' 
		)
})

/* Vérifie s'il existe au moins un RDV sélectionnable (non utilisé) */
const hasRdvDisponible = computed(() =>
filteredRdvList.value.some(rdv => !rdv.hasDossier)
)

/* Le bouton Continuer est-il actif ? */
const canProceedRdv = computed(() => {
	if (!rdvMode.value) return false
		if (rdvMode.value === 'sans') return true
			// Mode "avec" → RDV sélectionné ET pas déjà utilisé
			if (!selectedRdvId.value) return false
				const rdv = rdvList.value.find(r => Number(r.id_rdv) === Number(selectedRdvId.value))
				return !!rdv && !rdv.hasDossier
})

/* Palette de couleurs par statut de RDV */
const rdvStatutPalette = (statut) => ({
	CONFIRME:   { dot: 'bg-green-500',  text: 'text-green-700 dark:text-green-300',   bg: 'bg-green-100 dark:bg-green-500/20',   label: 'Confirmé' },
	EN_ATTENTE: { dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-500/20', label: 'En attente' },
	ANNULE:     { dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-300',       bg: 'bg-red-100 dark:bg-red-500/20',       label: 'Annulé' },
	REPORTE:    { dot: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-500/20',     label: 'Reporté' },
	HONORE:     { dot: 'bg-emerald-500',text: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-100 dark:bg-emerald-500/20',label: 'Honoré' }
}[statut] || {
	dot: 'bg-slate-400',
	text: 'text-slate-700 dark:text-slate-300',
	bg: 'bg-slate-100 dark:bg-slate-700/40',
	label: statut || 'Inconnu'
})

/* Passage étape Service → étape RDV */
const proceedToRdv = async () => {
	if (!selectedServiceId.value) {
		return
	}
	
	await fetchAvailableRdv()
	
	// Même si aucun RDV n'est disponible,
	// le contribuable peut continuer sans RDV.
	if (rdvError.value) {
		return
	}
	
	goNext()
}

const proceedToPieces = async () => {
	rdvError.value = ''
	
	// Sécurité : bloquer si mode "avec" sans RDV valide
	if (!canProceedRdv.value) {
		if (rdvMode.value === 'avec' && !hasRdvDisponible.value) {
			rdvError.value = 'Aucun rendez-vous disponible pour ce service. Choisissez « Je viendrai sans rendez-vous ».'
		} else if (rdvMode.value === 'avec' && !selectedRdvId.value) {
			rdvError.value = 'Veuillez sélectionner un rendez-vous.'
		}
		return
	}
	
	// Mode sans RDV → on efface tout RDV résiduel
	if (rdvMode.value === 'sans') {
		selectedRdvId.value = null
	}
	
	linkedRdvId.value = selectedRdvId.value || null
	
	console.log('🔗 RDV associé au dossier :', linkedRdvId.value)
	
	await fetchRequiredPieces()
	goNext()
}

/* RDV complet sélectionné (pour afficher son statut dans la sidebar) */
const selectedRdvObj = computed(() =>
rdvList.value.find(r => Number(r.id_rdv) === Number(selectedRdvId.value)) || null
)


/* ============================================================
 * ÉTAPE 3 — PIÈCES
 * ============================================================ */
const requiredPieces    = ref([])
const isLoadingPieces   = ref(false)
const filesByType       = reactive({})
const dragOverType      = ref(null)
const piecesGridRef     = ref(null)

const fetchRequiredPieces = async () => {
	if (!selectedServiceId.value) return
		
		isLoadingPieces.value = true
		
		try {
			const response = await api.get(
				`/services-fiscaux/${selectedServiceId.value}/pieces-requises`
			)
			
			requiredPieces.value = response.data?.data || []
			
			Object.keys(filesByType).forEach(
				key => delete filesByType[key]
			)
			
			Object.keys(fileErrors).forEach(
				key => delete fileErrors[key]
			)
			
			console.log(
				'✅ Pièces requises chargées :',
			   requiredPieces.value
			)
			
		} catch (err) {
			console.error(
				'❌ Erreur chargement pièces requises :',
				 err
			)
			
			requiredPieces.value = []
			
		} finally {
			isLoadingPieces.value = false
			await nextTick()
			animatePieces()
		}
}

const animatePieces = () => {
	const cards = piecesGridRef.value?.querySelectorAll('.piece-card')
	if (!cards?.length) return
		gsap.fromTo(cards,
					{ opacity: 0, y: 14 },
			  { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' })
}

/* Contrôle fichiers (RG17) */
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE       = 8 * 1024 * 1024

const fileErrors = reactive({})

const validateAndAssign = (file, piece) => {
	fileErrors[piece.id_type_piece] = ''
	submitError.value = ''
	if (!ACCEPTED_TYPES.includes(file.type)) {
		fileErrors[piece.id_type_piece] = 'Format non accepté (PDF, JPG ou PNG uniquement).'
		return
	}
	if (file.size > MAX_SIZE) {
		fileErrors[piece.id_type_piece] = 'Fichier trop volumineux (8 Mo maximum).'
		return
	}
	filesByType[piece.id_type_piece] = file
}

const onFileInput = (event, piece) => {
	const file = event.target.files?.[0]
	if (file) validateAndAssign(file, piece)
}

const onDrop = (event, piece) => {
	dragOverType.value = null
	const file = event.dataTransfer.files?.[0]
	if (file) validateAndAssign(file, piece)
}

const removeFile = (piece) => {
	delete filesByType[piece.id_type_piece]
	fileErrors[piece.id_type_piece] = ''
	submitError.value = ''
}

const formatFileSize = (bytes) => {
	if (!bytes) return ''
		const units = ['o', 'Ko', 'Mo']
		let value = bytes, i = 0
		while (value >= 1024 && i < units.length - 1) { value /= 1024; i++ }
		return `${value.toFixed(1)} ${units[i]}`
}

const obligatoiresManquantes = computed(() =>
requiredPieces.value.filter(p => p.obligatoire && !filesByType[p.id_type_piece])
)
const canGoToStep3 = computed(() => true)
const totalSelectedFiles  = computed(() => Object.keys(filesByType).length)

/* ============================================================
 * ÉTAPE 4 — CRÉATION
 * ============================================================ */
const isSubmitting    = ref(false)
const submitError     = ref('')
const submitMode      = ref('')
const createdDossier  = ref(null)

const createDossier = async (finalizeSubmission) => {
	if (!selectedServiceId.value) {
		submitError.value = 'Veuillez sélectionner un service fiscal.'
		return
	}
	
	
	const aucunePieceTeleversee = totalSelectedFiles.value === 0
	
	let effectiveSubmission = finalizeSubmission
	
	if (finalizeSubmission && aucunePieceTeleversee) {
		const confirmed = window.confirm(
			'⚠️ Aucune pièce n\'a été téléversée.\n\n' +
			'Le dossier ne peut pas être soumis à la vérification.\n\n' +
			'Il sera enregistré automatiquement comme BROUILLON.\n\n' +
			'Vous pourrez le compléter et le soumettre plus tard depuis « Mes dossiers ».\n\n' +
			'Voulez-vous continuer ?'
		)
		if (!confirmed) return
			
			// ✅ On force le mode brouillon
			effectiveSubmission = false
	}
	
	if (effectiveSubmission && obligatoiresManquantes.value.length > 0) {
		const noms = obligatoiresManquantes.value.map(p => `• ${p.libelle}`).join('\n')
		const confirmed = window.confirm(
			`⚠️ ${obligatoiresManquantes.value.length} pièce(s) obligatoire(s) manquante(s) :\n\n` +
			noms +
			'\n\n' +
			'Le dossier sera soumis mais marqué comme INCOMPLET.\n' +
			'L\'agent vous demandera les pièces manquantes.\n\n' +
			'Voulez-vous continuer ?'
		)
		if (!confirmed) return
	}
	
	// =========================================================
	// TRAITEMENT
	// =========================================================
	isSubmitting.value = true
	submitError.value = ''
	submitMode.value = effectiveSubmission ? 'soumis' : 'brouillon'
	
	try {
		// =========================================================
		// 1. CRÉATION DU DOSSIER
		// =========================================================
		console.log('📁 Création du dossier...')
		
		const dossierResponse = await api.post('/dossiers', {
			id_service: selectedServiceId.value,
			id_rdv: linkedRdvId.value || null
		})
		
		const dossier = dossierResponse.data?.data || dossierResponse.data
		
		if (!dossier?.id_dossier) {
			throw new Error('Le dossier a été créé mais son identifiant est introuvable.')
		}
		
		console.log('✅ Dossier créé :', dossier)
		createdDossier.value = dossier
		
		// =========================================================
		// 2. TÉLÉVERSEMENT DES PIÈCES
		// =========================================================
		const fichiers = Object.entries(filesByType)
		console.log(`📎 ${fichiers.length} pièce(s) à téléverser`)
		
		for (const [idTypePiece, file] of fichiers) {
			const formData = new FormData()
			formData.append('fichier', file)
				formData.append('id_type_piece', idTypePiece)
					
					console.log(`📤 Téléversement de "${file.name}"`)
					
					const pieceResponse = await api.post(
						`/dossiers/${dossier.id_dossier}/pieces`,
						formData
					)
					
					console.log('✅ Pièce téléversée :', pieceResponse.data)
		}
		
		// =========================================================
		// 3. SOUMISSION (uniquement si effectiveSubmission = true)
		// =========================================================
		if (effectiveSubmission) {
			console.log(`📨 Soumission du dossier ${dossier.id_dossier}...`)
			
			const submissionResponse = await api.post(
				`/dossiers/${dossier.id_dossier}/soumettre`
			)
			
			console.log('✅ Dossier soumis :', submissionResponse.data)
			
			const dossierSoumis =
			submissionResponse.data?.data || submissionResponse.data
			
			if (dossierSoumis && typeof dossierSoumis === 'object') {
				createdDossier.value = {
					...createdDossier.value,
					...dossierSoumis
				}
			}
		} else {
			console.log('📝 Dossier conservé en brouillon (aucune pièce)')
		}
		
		// =========================================================
		// 4. ÉCRAN DE SUCCÈS
		// =========================================================
		currentStep.value = 5
		
	} catch (error) {
		console.error(
			'❌ Erreur traitement dossier :',
			error.response?.data || error
		)
		
		submitError.value =
		error.response?.data?.message ||
		error.message ||
		'Une erreur est survenue lors du traitement du dossier.'
		
	} finally {
		isSubmitting.value = false
	}
}

const goToDossiersList = () => router.push('/dossiers')

onMounted(fetchServices)
</script>

<template>
<div class="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
<div class="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">

<!-- ============================================================
HEADER (compact, pas de gros titre)
============================================================ -->
<div class="mb-6 flex items-center justify-between gap-4">
<div>
<p class="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-muted)]">
Pré-dépôt de dossier
</p>
<h1 class="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
Déposer un nouveau dossier
</h1>
</div>

<button
@click="router.back()"
class="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
Fermer
</button>
</div>

<!-- ============================================================
LAYOUT 2 COLONNES : wizard + résumé
============================================================ -->
<div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

<!-- ============ COLONNE PRINCIPALE ============ -->
<motion.div
:initial="{ opacity: 0, y: 16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4 }"
class="rounded-3xl bg-[var(--card)] p-5 sm:p-7 relative overflow-hidden"
>
<!-- Halo décoratif -->
<div class="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[var(--primary)]/5 pointer-events-none"></div>

<div class="relative">

<!-- ============================================================
STEPPER HORIZONTAL (visible dès step < 4)
============================================================ -->
<div v-if="currentStep < 5" class="mb-8">
<!-- Barre de progression fond -->
<div class="relative">
<div class="absolute left-0 right-0 top-5 h-0.5 bg-[var(--border)]"></div>
<motion.div
:initial="{ width: 0 }"
:animate="{ width: ((currentStep - 1) / (steps.length - 1)) * 100 + '%' }"
:transition="{ duration: 0.5, ease: 'easeInOut' }"
class="absolute left-0 top-5 h-0.5 bg-[var(--primary)]"
></motion.div>

<!-- Steps -->
<div class="relative flex justify-between">
<div
v-for="step in steps"
:key="step.id"
class="flex flex-col items-center gap-2 flex-1"
>
<motion.div
:initial="false"
:animate="{
scale: currentStep === step.id ? 1.1 : 1,
backgroundColor: currentStep >= step.id ? 'var(--primary)' : 'var(--card)',
color: currentStep >= step.id ? '#fff' : 'var(--text-muted)',
borderColor: currentStep >= step.id ? 'var(--primary)' : 'var(--border)'
}"
:transition="{ type: 'spring', stiffness: 300, damping: 22 }"
class="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-sm"
>
<svg v-if="currentStep > step.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<span v-else>{{ step.id }}</span>
</motion.div>

<span
:class="[
'text-[11px] font-semibold whitespace-nowrap transition-colors',
currentStep >= step.id ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
]"
>
{{ step.label }}
</span>
</div>
</div>
</div>
</div>

<!-- ============================================================
CORPS DES ÉTAPES
============================================================ -->
<div class="min-h-[340px]">
<AnimatePresence mode="wait">

<!-- ============ ÉTAPE 1 : SERVICE ============ -->
<motion.div
v-if="currentStep === 1"
key="step1"
:initial="{ opacity: 0, x: direction * 30 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -30 }"
:transition="{ duration: 0.25 }"
>
<h2 class="text-lg font-bold tracking-tight">Quel service fiscal ?</h2>
<p class="text-sm text-[var(--text-muted)] mt-1 mb-5">
Choisissez le service concerné par votre démarche.
</p>

<!-- Skeleton -->
<div v-if="isLoadingServices" class="space-y-3">
<div
v-for="n in 3"
:key="n"
class="h-[72px] rounded-2xl bg-[var(--bg)] animate-pulse"
></div>
</div>

<!-- Liste services -->
<div v-else class="space-y-3">
<motion.button
v-for="s in services"
:key="s.id_service"
type="button"
:whileHover="{ y: -2 }"
:whileTap="{ scale: 0.99 }"
@click="selectedServiceId = s.id_service"
:class="[
'group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors',
selectedServiceId === s.id_service
? 'bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]'
: 'bg-[var(--card)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/40'
]"
>
<div
:class="[
'shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
selectedServiceId === s.id_service
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)] group-hover:text-[var(--primary)]'
]"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>

<div class="min-w-0 flex-1">
<p class="text-sm font-bold truncate">{{ s.libelle_service }}</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
~{{ s.duree_estimee_min }} min de traitement
</p>
</div>

<div
:class="[
'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all',
selectedServiceId === s.id_service
? 'bg-[var(--primary)] text-white scale-100'
: 'border-2 border-[var(--border)] scale-90'
]"
>
<svg
v-if="selectedServiceId === s.id_service"
class="w-3.5 h-3.5"
fill="none" stroke="currentColor" viewBox="0 0 24 24"
>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
</div>
</motion.button>

<div v-if="services.length === 0" class="text-center py-12 text-sm text-[var(--text-muted)]">
Aucun service disponible.
</div>
</div>
</motion.div>

<!-- ============ ÉTAPE 2 : RENDEZ-VOUS ============ -->
<motion.div
v-else-if="currentStep === 2"
key="step2-rdv"
:initial="{ opacity: 0, x: direction * 30 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -30 }"
:transition="{ duration: 0.25 }"
>
<h2 class="text-lg font-bold tracking-tight">Avez-vous un rendez-vous ?</h2>
<p class="text-sm text-[var(--text-muted)] mt-1 mb-5">
Rattacher un rendez-vous accélère le traitement de votre dossier.
</p>

<!-- Choix : Avec / Sans RDV -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
<!-- Avec RDV -->
<motion.button
type="button"
:whileHover="{ y: -2 }"
:whileTap="{ scale: 0.99 }"
@click="rdvMode = 'avec'"
:class="[
'group relative flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-colors',
rdvMode === 'avec'
? 'bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]'
: 'bg-[var(--card)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/40'
]"
>
<div
:class="[
'shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
rdvMode === 'avec'
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)] group-hover:text-[var(--primary)]'
]"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
</div>

<div class="min-w-0">
<p class="text-sm font-bold">J'ai un rendez-vous</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Sélectionnez un créneau confirmé
</p>
</div>

<div
:class="[
'absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center transition-all',
rdvMode === 'avec'
? 'bg-[var(--primary)] text-white scale-100'
: 'border-2 border-[var(--border)] scale-90'
]"
>
<svg v-if="rdvMode === 'avec'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
</div>
</motion.button>

<!-- Sans RDV -->
<motion.button
type="button"
:whileHover="{ y: -2 }"
:whileTap="{ scale: 0.99 }"
@click="rdvMode = 'sans'"
:class="[
'group relative flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-colors',
rdvMode === 'sans'
? 'bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]'
: 'bg-[var(--card)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/40'
]"
>
<div
:class="[
'shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
rdvMode === 'sans'
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)] group-hover:text-[var(--primary)]'
]"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>

<div class="min-w-0">
<p class="text-sm font-bold">Je viendrai sans RDV</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Passage en file d'attente sur place
</p>
</div>

<div
:class="[
'absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center transition-all',
rdvMode === 'sans'
? 'bg-[var(--primary)] text-white scale-100'
: 'border-2 border-[var(--border)] scale-90'
]"
>
<svg v-if="rdvMode === 'sans'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
</div>
</motion.button>
</div>

<!-- Si "avec" : liste des RDV disponibles -->
<AnimatePresence>
<motion.div
v-if="rdvMode === 'avec'"
key="rdv-list"
:initial="{ opacity: 0, height: 0 }"
:animate="{ opacity: 1, height: 'auto' }"
:exit="{ opacity: 0, height: 0 }"
:transition="{ duration: 0.25 }"
class="overflow-hidden"
>
<div class="pt-2">
<div class="flex items-center justify-between mb-2">
<label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
Sélectionnez votre rendez-vous
</label>
<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)] tabular-nums">
{{ filteredRdvList.filter(r => !r.hasDossier).length }} disponible{{ filteredRdvList.filter(r => !r.hasDossier).length > 1 ? 's' : '' }}
</span>
</div>

<!-- Loading -->
<div v-if="isLoadingRdv" class="space-y-2">

<div v-for="n in 2" :key="n" class="h-16 rounded-2xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Liste -->
<div
v-else-if="filteredRdvList.length"
class="space-y-2 max-h-64 overflow-y-auto pr-1"
>
<div class="space-y-2 max-h-64 overflow-y-auto pr-1">
<motion.button
v-for="rdv in filteredRdvList"
:key="rdv.id_rdv"
type="button"
:disabled="rdv.hasDossier"
:whileHover="rdv.hasDossier ? {} : { y: -1 }"
:whileTap="rdv.hasDossier ? {} : { scale: 0.99 }"
@click="!rdv.hasDossier && (selectedRdvId = rdv.id_rdv, rdvError = '')"
:class="[
'group w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors',
rdv.hasDossier
? 'opacity-50 cursor-not-allowed bg-[var(--bg)] ring-1 ring-[var(--border)]'
: selectedRdvId === rdv.id_rdv
? 'bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]'
: 'bg-[var(--card)] ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/40'
]"
>
<!-- Date -->
<div
:class="[
'shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center',
rdv.hasDossier
? 'bg-[var(--bg)] text-[var(--text-muted)]'
: selectedRdvId === rdv.id_rdv
? 'bg-[var(--primary)] text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)]'
]"
>
<span class="text-[9px] font-bold uppercase leading-none">
{{ new Date(rdv.date_rdv).toLocaleDateString('fr-FR', { month: 'short' }) }}
</span>
<span class="text-base font-black leading-none">
{{ new Date(rdv.date_rdv).getDate() }}
</span>
</div>

<!-- Infos RDV -->
<div class="min-w-0 flex-1">
<div class="flex items-center gap-1.5 flex-wrap">
<p
:class="[
'text-sm font-bold truncate',
rdv.hasDossier ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'
]"
>
RDV #{{ rdv.id_rdv }} · {{ rdv.heure_rdv }}
</p>

<!-- Badge : si déjà utilisé, on l'affiche, sinon on garde le statut -->
<span
v-if="rdv.hasDossier"
class="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--bg)] text-[var(--text-muted)] ring-1 ring-[var(--border)]"
>
<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 13l4 4L19 7"/>
</svg>
Déjà utilisé
</span>

<span
v-else
:class="[
'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
rdvStatutPalette(rdv.statut_rdv).bg,
rdvStatutPalette(rdv.statut_rdv).text
]"
>
<span :class="['w-1 h-1 rounded-full', rdvStatutPalette(rdv.statut_rdv).dot]"></span>
{{ rdvStatutPalette(rdv.statut_rdv).label }}
</span>
</div>

<p class="text-xs text-[var(--text-muted)] truncate mt-0.5">
{{ rdv.libelle_service || rdv.service?.libelle_service || 'Service' }}
</p>
</div>

<!-- Coche sélection (ou cadenas si déjà utilisé) -->
<div
v-if="!rdv.hasDossier"
:class="[
'shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all',
selectedRdvId === rdv.id_rdv
? 'bg-[var(--primary)] text-white scale-100'
: 'border-2 border-[var(--border)] scale-90'
]"
>
<svg v-if="selectedRdvId === rdv.id_rdv" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
</div>

<!-- Cadenas si déjà utilisé -->
<div
v-else
class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-muted)]"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
</svg>
</div>
</motion.button>
</div>

<!-- Aide : explique pourquoi certains RDV sont grisés -->
<p
v-if="filteredRdvList.some(r => r.hasDossier)"
class="mt-3 text-[11px] text-[var(--text-muted)] flex items-center gap-1.5"
>
<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Les rendez-vous marqués <strong>« Déjà utilisé »</strong> sont rattachés à un autre dossier actif.
</p>

</div>

<!-- Aucun RDV disponible -->
<div v-else class="p-5 rounded-2xl bg-[var(--bg)] ring-1 ring-[var(--border)]">
<div class="flex flex-col items-center text-center gap-3">
<div class="w-12 h-12 rounded-2xl bg-[var(--border)]/50 flex items-center justify-center">
<svg class="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
</div>

<div>
<p class="text-sm font-bold text-[var(--text)]">
Aucun rendez-vous disponible
</p>
<p class="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
Vous n'avez aucun rendez-vous confirmé pour ce service.
Vous pouvez continuer sans rendez-vous.
</p>
</div>

<motion.button
type="button"
:whileHover="{ scale: 1.03 }"
:whileTap="{ scale: 0.97 }"
@click="rdvMode = 'sans'"
class="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Continuer sans rendez-vous
</motion.button>
</div>
</div>
</div>
</motion.div>
</AnimatePresence>

<!-- Message si "sans" -->
<AnimatePresence>
<motion.div
v-if="rdvMode === 'sans'"
key="rdv-sans"
:initial="{ opacity: 0, height: 0 }"
:animate="{ opacity: 1, height: 'auto' }"
:exit="{ opacity: 0, height: 0 }"
:transition="{ duration: 0.25 }"
class="overflow-hidden"
>
<div class="mt-2 p-3 rounded-2xl bg-[var(--bgListCard)] border border-[var(--borderListCard)] flex items-start gap-2">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--textListCard)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p class="text-xs text-[var(--textListCard)] leading-relaxed">
Vous serez placé dans la <strong>file d'attente</strong> à votre arrivée.
Un ticket sera généré selon votre ordre de passage.
</p>
</div>
</motion.div>
</AnimatePresence>

<!-- Erreur RDV -->
<p v-if="rdvError" class="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
{{ rdvError }}
</p>
</motion.div>

<!-- ============ ÉTAPE 3 : PIÈCES ============ -->
<motion.div
v-else-if="currentStep === 3"
key="step2"
:initial="{ opacity: 0, x: direction * 30 }"
:animate="{ opacity: 1, x: 0 }"
:exit="{ opacity: 0, x: direction * -30 }"
:transition="{ duration: 0.25 }"
>
<div class="flex items-start justify-between gap-3 mb-5">
<div>
<h2 class="text-lg font-bold tracking-tight">Téléversez vos pièces</h2>
<p class="text-sm text-[var(--text-muted)] mt-1">
Pour <span class="font-semibold text-[var(--text)]">{{ selectedService?.libelle_service }}</span>
</p>
</div>
<span class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
{{ totalSelectedFiles }} / {{ requiredPieces.length }}
</span>
</div>

<!-- Skeleton -->
<div v-if="isLoadingPieces" class="space-y-3">
<div v-for="n in 3" :key="n" class="h-32 rounded-2xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Liste pièces -->
<div v-else ref="piecesGridRef" class="grid grid-cols-1 md:grid-cols-2 gap-3">
<div
v-for="piece in requiredPieces"
:key="piece.id_type_piece"
class="piece-card rounded-2xl bg-[var(--card)] p-3 transition-all"
:class="{
'ring-2 ring-[var(--primary)] bg-[var(--primary)]/5': dragOverType === piece.id_type_piece,
'ring-1 ring-red-300 dark:ring-red-500/40': fileErrors[piece.id_type_piece],
'ring-1 ring-[var(--border)]': !dragOverType && !fileErrors[piece.id_type_piece] && !filesByType[piece.id_type_piece],
'ring-1 ring-green-300 dark:ring-green-500/40 bg-green-50 dark:bg-green-500/5': filesByType[piece.id_type_piece]
}"
@dragover.prevent="dragOverType = piece.id_type_piece"
@dragleave.prevent="dragOverType = null"
@drop.prevent="onDrop($event, piece)"
>
<!-- Header compact -->
<div class="flex items-center justify-between gap-2 mb-2">
<div class="flex items-center gap-1.5 min-w-0 flex-1">
<!-- Icône de statut -->
<div
:class="[
'shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
filesByType[piece.id_type_piece]
? 'bg-green-500 text-white'
: fileErrors[piece.id_type_piece]
? 'bg-red-500 text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
]"
>
<svg v-if="filesByType[piece.id_type_piece]" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<svg v-else-if="fileErrors[piece.id_type_piece]" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
</svg>
<span v-else class="w-1.5 h-1.5 rounded-full bg-current"></span>
</div>

<p class="text-xs font-bold truncate">{{ piece.libelle }}</p>
</div>

<span
v-if="piece.obligatoire"
class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
>
REQUIS
</span>
<span
v-else
class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--text-muted)]"
>
OPT.
</span>
</div>

<!-- Dropzone compacte OU fichier -->
<label
v-if="!filesByType[piece.id_type_piece]"
class="group flex items-center gap-3 rounded-xl bg-[var(--bg)] hover:bg-[var(--primary)]/5 px-3 py-2.5 cursor-pointer transition-colors"
>
<div class="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3"/>
</svg>
</div>
<div class="min-w-0 flex-1">
<p class="text-[11px] font-medium text-[var(--text)] truncate">
Déposer ou <span class="text-[var(--primary)] font-bold">parcourir</span>
</p>
<p class="text-[10px] text-[var(--text-muted)] truncate">PDF, JPG, PNG · 8 Mo</p>
</div>
<input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" @change="onFileInput($event, piece)">
</label>

<div v-else class="flex items-center gap-2 rounded-xl bg-[var(--bg)] px-3 py-2">
<div class="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
</svg>
</div>
<div class="min-w-0 flex-1">
<p class="text-[11px] font-semibold truncate">{{ filesByType[piece.id_type_piece].name }}</p>
<p class="text-[10px] text-[var(--text-muted)]">{{ formatFileSize(filesByType[piece.id_type_piece].size) }}</p>
</div>
<motion.button
type="button"
@click="removeFile(piece)"
whileHover="{ scale: 1.1 }"
	whileTap="{ scale: 0.9 }"
		class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
		>
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
		</svg>
		</motion.button>
		</div>
		
		<!-- Erreur -->
		<p v-if="fileErrors[piece.id_type_piece]" class="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
		<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>
		{{ fileErrors[piece.id_type_piece] }}
		</p>
		</div>
		
		<div v-if="requiredPieces.length === 0" class="col-span-full text-center py-12 text-sm text-[var(--text-muted)]">
		Aucune pièce spécifique n'est requise pour ce service.
		</div>
		</div>
		</motion.div>
		
		<!-- ============ ÉTAPE 4 : CONFIRMATION ============ -->
		<motion.div
		v-else-if="currentStep === 4"
		key="step3"
		:initial="{ opacity: 0, x: direction * 30 }"
		:animate="{ opacity: 1, x: 0 }"
		:exit="{ opacity: 0, x: direction * -30 }"
		:transition="{ duration: 0.25 }"
		>
		<h2 class="text-lg font-bold tracking-tight">Vérifiez avant d'envoyer</h2>
		<p class="text-sm text-[var(--text-muted)] mt-1 mb-5">
		Enregistrez comme brouillon pour compléter plus tard, ou soumettez directement.
		</p>
		
		<div class="space-y-2">
		<div
		v-for="piece in requiredPieces"
		:key="piece.id_type_piece"
		class="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]"
		>
		<div
		:class="[
		'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
filesByType[piece.id_type_piece]
? 'bg-green-500 text-white'
: 'bg-[var(--bg)] text-[var(--text-muted)]'
]"
>
<svg v-if="filesByType[piece.id_type_piece]" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<span v-else class="text-xs font-bold">—</span>
</div>
<p
:class="[
'text-sm flex-1 min-w-0 truncate',
piece.obligatoire && !filesByType[piece.id_type_piece]
? 'font-semibold text-red-600 dark:text-red-400'
: 'text-[var(--text)]'
]"
>
{{ piece.libelle }}
</p>
<span
v-if="!filesByType[piece.id_type_piece] && !piece.obligatoire"
class="shrink-0 text-[10px] font-medium text-[var(--text-muted)]"
>
Facultatif
</span>
</div>
</div>

<div
v-if="submitError"
class="mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200 dark:ring-red-500/30 flex items-start gap-2"
>
<svg class="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p class="text-xs font-medium text-red-700 dark:text-red-300">{{ submitError }}</p>
</div>
</motion.div>

<!-- ============ ÉTAPE 5 : SUCCÈS ============ -->
<motion.div
v-else
key="step4"
:initial="{ opacity: 0, scale: 0.94 }"
:animate="{ opacity: 1, scale: 1 }"
:transition="{ duration: 0.35, ease: 'easeOut' }"
class="flex flex-col items-center justify-center py-8 text-center"
>
<motion.div
:initial="{ scale: 0 }"
:animate="{ scale: 1 }"
:transition="{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }"
class="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30 mb-5"
>
<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
</motion.div>

<h2 class="text-xl font-bold tracking-tight">
{{ submitMode === 'soumis' ? 'Dossier soumis avec succès' : 'Brouillon enregistré' }}
</h2>

<p v-if="createdDossier" class="mt-2 font-mono text-sm text-[var(--primary)] font-bold px-3 py-1.5 rounded-full bg-[var(--primary)]/10">
{{ createdDossier.reference_dossier }}
</p>

<p class="mt-4 text-sm text-[var(--text-muted)] max-w-sm">
{{ submitMode === 'soumis'
	? 'Votre dossier a été transmis pour vérification. Vous serez notifié de son avancement.'
	: 'Retrouvez ce brouillon dans « Mes dossiers » pour le compléter et le soumettre plus tard.' }}
	</p>
	</motion.div>
	
	</AnimatePresence>
	</div>
	
	<!-- ============================================================
	FOOTER NAVIGATION
	============================================================ -->
	<div
	v-if="currentStep < 5"
	class="flex justify-between items-center gap-3 mt-8 pt-6 border-t border-[var(--border)]"
	>
	<motion.button
	whileHover="{ scale: 1.02, x: -2 }"
		whileTap="{ scale: 0.97 }"
			@click="currentStep === 1 ? router.back() : goPrevious()"
			class="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--hover)] transition"
			>
			{{ currentStep === 1 ? 'Annuler' : '← Précédent' }}
			</motion.button>
			
			<div class="flex gap-2">
			<template v-if="currentStep === 1">
			<motion.button
			whileHover="{ scale: 1.03 }"
				whileTap="{ scale: 0.97 }"
					:disabled="!selectedServiceId"
					@click="proceedToRdv"
					class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition inline-flex items-center gap-2"
					>
					Continuer
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
					</svg>
					</motion.button>
					</template>
					
					<template v-else-if="currentStep === 2">
					<motion.button
					whileHover="{ scale: 1.03 }"
						whileTap="{ scale: 0.97 }"
							:disabled="!canProceedRdv"
							@click="proceedToPieces"
							class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition inline-flex items-center gap-2"
							>
							Continuer
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
							</svg>
							</motion.button>
							</template>
							
							<template v-else-if="currentStep === 3">
							<motion.button
							whileHover="{ scale: 1.03 }"
								whileTap="{ scale: 0.97 }"
									:disabled="!canGoToStep3"
									@click="goNext"
									class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition inline-flex items-center gap-2"
									>
									Continuer
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
									</svg>
									</motion.button>
									</template>
							
							<template v-else>
							<motion.button
							whileHover="{ scale: 1.02 }"
								whileTap="{ scale: 0.97 }"
									:disabled="isSubmitting"
									@click="createDossier(false)"
									class="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40 transition inline-flex items-center gap-2"
									>
									<svg v-if="isSubmitting && submitMode === 'brouillon'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
									</svg>
									Brouillon
									</motion.button>
									
									<motion.button
									whileHover="{ scale: 1.03 }"
										whileTap="{ scale: 0.97 }"
											:disabled="isSubmitting || totalSelectedFiles === 0"
											@click="createDossier(true)"
											class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 disabled:opacity-40 transition inline-flex items-center gap-2"
											>
											<svg v-if="isSubmitting && submitMode === 'soumis'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
											</svg>
											Soumettre
											</motion.button>
											</template>
											</div>
											</div>
											
											<div v-else class="flex justify-center mt-8 pt-6 border-t border-[var(--border)]">
											<motion.button
											whileHover="{ scale: 1.03 }"
												whileTap="{ scale: 0.97 }"
													@click="goToDossiersList"
													class="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition inline-flex items-center gap-2"
													>
													Voir mes dossiers
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
													</svg>
													</motion.button>
													</div>
													
													</div>
													</motion.div>
													
													<!-- ============ COLONNE RÉSUMÉ (sidebar) ============ -->
													<motion.aside
													:initial="{ opacity: 0, x: 20 }"
													:animate="{ opacity: 1, x: 0 }"
													:transition="{ duration: 0.4, delay: 0.1 }"
													class="lg:sticky lg:top-6 lg:self-start space-y-4"
													>
													<!-- Résumé -->
													<div class="rounded-3xl bg-[var(--card)] p-5">
													<div class="flex items-center gap-2 mb-4">
													<div class="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
													<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
													d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
													</svg>
													</div>
													<h3 class="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Résumé</h3>
													</div>
													
													<div class="space-y-3">
													<div>
													<p class="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)]">Service</p>
													<p class="text-sm font-bold mt-0.5 truncate">
													{{ selectedService?.libelle_service || '—' }}
													</p>
													</div>
													
													<div>
													<p class="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)]">Pièces jointes</p>
													<div class="mt-1.5 flex items-center gap-2">
													<span class="text-sm font-bold">{{ totalSelectedFiles }} / {{ requiredPieces.length || '—' }}</span>
													<div v-if="requiredPieces.length" class="flex-1 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
													<motion.div
													:initial="{ width: 0 }"
													:animate="{ width: (totalSelectedFiles / requiredPieces.length) * 100 + '%' }"
													:transition="{ duration: 0.4 }"
													class="h-full rounded-full bg-[var(--primary)]"
													></motion.div>
													</div>
													</div>
													</div>
													
													<div>
													<p class="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)]">Rendez-vous</p>
													<p class="text-sm font-bold mt-0.5">
													<span v-if="rdvMode === 'sans'" class="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
													</svg>
													Sans rendez-vous
													</span>
													  
													  <span v-else-if="selectedRdvId" class="inline-flex items-center gap-1.5 text-[var(--primary)]">
													  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
													  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
													  </svg>
													  RDV #{{ selectedRdvId }}
													  
													  <!-- Badge statut dans la sidebar -->
													  <span
													  v-if="selectedRdvObj"
													  :class="[
													  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1',
rdvStatutPalette(selectedRdvObj.statut_rdv).bg,
rdvStatutPalette(selectedRdvObj.statut_rdv).text
]"
>
<span :class="['w-1 h-1 rounded-full', rdvStatutPalette(selectedRdvObj.statut_rdv).dot]"></span>
{{ rdvStatutPalette(selectedRdvObj.statut_rdv).label }}
</span>
</span>
													  
													<span v-else class="text-[var(--text-muted)] italic font-normal">À définir</span>
													</p>
													</div>
													
													</div>
													</div>
													
													<!-- Note RG6 -->
													<div class="rounded-3xl bg-[var(--bgListCard)] border border-[var(--borderListCard)] p-4">
													<div class="flex items-start gap-2">
													<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--textListCard)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
													d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
													</svg>
													<p class="text-xs text-[var(--textListCard)] leading-relaxed">
													   un dossier brouillon peut rester vide. La soumission nécessite au moins une pièce conforme ou en attente.
													</p>
													</div>
													</div>
													
													<!-- Aide -->
													<div class="hidden lg:block rounded-3xl bg-[var(--card)] p-5">
													<p class="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">Besoin d'aide ?</p>
													<a href="#" class="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
													d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
													</svg>
													Guide de pré-dépôt
													</a>
													</div>
													</motion.aside>
													
													</div>
													</div>
													</div>
													</template>
