<script setup>
/* ============================================================
 * IMPORTS
 * ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { motion, AnimatePresence } from 'motion-v'
import { gsap } from 'gsap'
import api from '@/api/Axios'
import {useToast} from 'vue-toastification'

import DemandeComplement from '@/components/Dossiers/modal/DemandeComplement.vue'
import VerificationPiece from '@/components/Dossiers/modal/VerificationPiece.vue'
import RejetDossier from '@/components/Dossiers/modal/RejetDossier.vue'
import { socket } from '@/services/socket'

const route  = useRoute()
const router = useRouter()
const toast = useToast()

/* ============================================================
 * ÉTAT RÉACTIF
 * ============================================================ */
const isLoading    = ref(false)
const errorMessage = ref('')

const dossier      = ref(null)
const pieces       = ref([])
const requis       = ref([])
const comments     = ref([])


/* Modales */
const showComplementModal    = ref(false)
const complementCommentaire  = ref('')
const isSubmittingComplement = ref(false)

const showVerificationModal       = ref(false)
const selectedPiece               = ref(null)
const verificationStatut          = ref('')
const verificationCommentaire     = ref('')
const isSubmittingVerification    = ref(false)

/* Refs DOM pour GSAP */
const headerRef = ref(null)
const kpiRefs   = ref([])
const tabNavRef = ref(null)
const contentRef = ref(null)

/* Aperçu pièce (Approche A : le parent fournit l'URL) */
const piecePreviewUrl    = ref('')
const piecePreviewMime   = ref('')
const isLoadingPreview   = ref(false)
const piecePreviewError  = ref('')

/* Modal rejet */
const showRejetModal      = ref(false)
const rejetMotif          = ref('')
const isSubmittingRejet   = ref(false)

/* Historique */
const historique        = ref([])
const historiqueGrouped = ref([])
const isLoadingHistorique = ref(false)

/* Traitements */
const traitements        = ref([])
const isLoadingTraitements = ref(false)
const filtreTraitement   = ref('TOUS')

/* Audit */
const audit           = ref([])
const isLoadingAudit  = ref(false)

/* Commentaires */
const commentaires          = ref([])
const isLoadingCommentaires = ref(false)
const newComment            = ref('')
const newCommentInterne     = ref(true)
const isSubmittingComment   = ref(false)

const isSubmittingSoumission = ref(false)

/* ============================================================
 * CHARGEMENT DOSSIER
 * ============================================================ */
async function chargerDossier() {
	isLoading.value = true
	errorMessage.value = ''
	
	try {
		const response = await api.get(`/agent/dossiers/${route.params.id}`)
		const data = response.data?.data || response.data
		
		if (!data) throw new Error('Le serveur n’a retourné aucune donnée pour ce dossier.')
			
			dossier.value     = data
			pieces.value      = data.pieces      || []
			requis.value      = data.requis      || []
			traitements.value = data.traitements || []
			comments.value    = data.comments    || []
			audit.value       = data.audit       || []
			
			await nextTick()
			animerEntree()
	} catch (error) {
		console.error('❌ Erreur chargement dossier :', error)
		errorMessage.value =
		error.response?.data?.message ||
		error.message ||
		'Impossible de charger le dossier.'
	} finally {
		isLoading.value = false
	}
}

/* ============================================================
 * CHARGEMENT HISTORIQUE
 * ============================================================ */
async function chargerHistorique() {
	if (!dossier.value) return
		
		isLoadingHistorique.value = true
		
		try {
			const response = await api.get(
				`/dossier-detail/${dossier.value.id_dossier}/historique`
			)
			
			historique.value        = response.data?.data?.events  || []
			historiqueGrouped.value = response.data?.data?.grouped || []
		} catch (error) {
			console.error('❌ Erreur historique :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger l\'historique.'
			)
		} finally {
			isLoadingHistorique.value = false
		}
}

/* ============================================================
 * CHARGEMENT TRAITEMENTS
 * ============================================================ */
async function chargerTraitements() {
	if (!dossier.value) return
		
		isLoadingTraitements.value = true
		
		try {
			const params = filtreTraitement.value !== 'TOUS'
			? { decision: filtreTraitement.value }
			: {}
			
			const response = await api.get(
				`/dossier-detail/${dossier.value.id_dossier}/traitements`,
				{ params }
			)
			
			traitements.value = response.data?.data || []
		} catch (error) {
			console.error('❌ Erreur traitements :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger les traitements.'
			)
		} finally {
			isLoadingTraitements.value = false
		}
}

/* ============================================================
 * CHARGEMENT AUDIT
 * ============================================================ */
async function chargerAudit() {
	if (!dossier.value) return
		
		isLoadingAudit.value = true
		
		try {
			const response = await api.get(
				`/dossier-detail/${dossier.value.id_dossier}/audit`
			)
			
			audit.value = response.data?.data || []
		} catch (error) {
			console.error('❌ Erreur audit :', error)
			
			if (error.response?.status === 403) {
				toast.warning('Accès à l\'audit réservé au chef de centre.')
			} else {
				toast.error(
					error.response?.data?.message ||
					'Impossible de charger le journal d\'audit.'
				)
			}
		} finally {
			isLoadingAudit.value = false
		}
}

/* ============================================================
 * CHARGEMENT COMMENTAIRES
 * ============================================================ */
async function chargerCommentaires() {
	if (!dossier.value) return
		
		isLoadingCommentaires.value = true
		
		try {
			const response = await api.get(
				`/dossier-detail/${dossier.value.id_dossier}/commentaires`
			)
			
			commentaires.value = response.data?.data || []
		} catch (error) {
			console.error('❌ Erreur commentaires :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de charger les commentaires.'
			)
		} finally {
			isLoadingCommentaires.value = false
		}
}

/* ============================================================
 * AJOUT COMMENTAIRE
 * ============================================================ */
async function addComment() {
	const contenu = newComment.value.trim()
	
	if (!contenu || !dossier.value) return
		
		isSubmittingComment.value = true
		
		try {
			const response = await api.post(
				`/dossier-detail/${dossier.value.id_dossier}/commentaires`,
				{
					contenu,
					interne: newCommentInterne.value
				}
			)
			
			const comment = response.data?.data
			
			if (comment) {
				commentaires.value.push(comment)
			}
			
			newComment.value = ''
			newCommentInterne.value = true
			
			toast.success('Commentaire ajouté.')
		} catch (error) {
			console.error('❌ Erreur ajout commentaire :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible d\'ajouter le commentaire.'
			)
		} finally {
			isSubmittingComment.value = false
		}
}

/* ============================================================
 * SUPPRESSION COMMENTAIRE
 * ============================================================ */
async function supprimerCommentaire(commentaire) {
	if (!commentaire) return
		
		if (!confirm('Supprimer ce commentaire ?')) return
			
			try {
				await api.delete(
					`/dossier-detail/commentaires/${commentaire.id_commentaire}`
				)
				
				commentaires.value = commentaires.value.filter(
					c => c.id_commentaire !== commentaire.id_commentaire
				)
				
				toast.success('Commentaire supprimé.')
			} catch (error) {
				console.error('❌ Erreur suppression commentaire :', error)
				toast.error(
					error.response?.data?.message ||
					'Impossible de supprimer le commentaire.'
				)
			}
}

/* ============================================================
 * EXPORT TRAITEMENTS CSV
 * ============================================================ */
async function exporterTraitements() {
	if (!dossier.value) return
		
		try {
			const response = await api.get(
				`/dossier-detail/${dossier.value.id_dossier}/traitements/export`,
				{ responseType: 'blob' }
			)
			
			const blob = new Blob([response.data], {
				type: 'text/csv;charset=utf-8'
			})
			
			const url  = URL.createObjectURL(blob)
			const link = document.createElement('a')
			
			link.href     = url
			link.download = `traitements-${dossier.value.reference_dossier}.csv`
			link.click()
			
			URL.revokeObjectURL(url)
			
			toast.success('Export CSV téléchargé.')
		} catch (error) {
			console.error('❌ Erreur export CSV :', error)
			toast.error('Impossible d\'exporter les traitements.')
		}
}


/* ============================================================
 * TEMPS RÉEL — Dossier mis à jour
 * ============================================================ */

/* ============================================================
 * TEMPS RÉEL — Dossier mis à jour
 * ============================================================ */
function onDossierUpdated(data) {
	if (!data?.id_dossier) return
		
		if (Number(data.id_dossier) !== Number(route.params.id)) return
			
			console.log('📡 [Agent] Dossier mis à jour :', data)
			
			/* Recharger le dossier principal */
			chargerDossier()
			
			/* Toast informatif */
			const statutLabel = {
				SOUMIS:          'soumis par le contribuable',
				EN_VERIFICATION: 'en cours de vérification',
				A_COMPLETER:     'en attente de compléments',
				VALIDE:          'validé',
				REJETE:          'rejeté',
				CLOTURE:         'clôturé'
			}[data.statut_dossier]
			
			if (statutLabel) {
				toast.info(`Dossier ${statutLabel}`, { timeout: 4000 })
			}
			
			/* Recharger l'historique si on est dessus */
			if (activeTab.value === 'historique') {
				chargerHistorique()
			}
			
			/* Recharger les traitements si on est dessus */
			if (activeTab.value === 'traitements') {
				chargerTraitements()
			}
}

/* ============================================================
 * TEMPS RÉEL — Nouveau commentaire
 * ============================================================ */
function onCommentaireNew(data) {
	if (!data?.id_dossier) return
		
		if (Number(data.id_dossier) !== Number(route.params.id)) return
			
			console.log('📡 [Agent] Nouveau commentaire :', data)
			
			/* Recharger les commentaires */
			chargerCommentaires()
}

/* ============================================================
 * HELPERS UI — ÉVÉNEMENTS
 * ============================================================ */
function getEventColor(type) {
	return {
		TRANSITION:         'bg-indigo-500',
		VERIFICATION_PIECE: 'bg-emerald-500',
		UPLOAD_PIECE:       'bg-blue-500',
		COMMENTAIRE:        'bg-purple-500'
	}[type] || 'bg-slate-400'
}

function getEventLabel(type) {
	return {
		TRANSITION:         'Transition',
		VERIFICATION_PIECE: 'Vérification',
		UPLOAD_PIECE:       'Upload',
		COMMENTAIRE:        'Commentaire'
	}[type] || type
}

/* ============================================================
 * HELPERS UI — DÉCISIONS
 * ============================================================ */
function getDecisionLabel(decision) {
	const labels = {
		EN_VERIFICATION: 'En vérification',
		A_COMPLETER:     'À compléter',
		REJETE:          'Rejeté',
		VALIDE:          'Validé',
		CLOTURE:         'Clôturé',
		SOUMIS:          'Soumis'
	}
	
	return labels[decision] || decision
}

function getDecisionColor(decision) {
	const colors = {
		EN_VERIFICATION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
		A_COMPLETER:     'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
		REJETE:          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
		VALIDE:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
		CLOTURE:         'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
		SOUMIS:          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
	}
	
	return colors[decision] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
}

/* ============================================================
 * HELPER : heure seule
 * ============================================================ */
function formatHeure(iso) {
	if (!iso) return '—'
		
		const d = new Date(iso)
		
		if (Number.isNaN(d.getTime())) return '—'
			
			return d.toLocaleTimeString('fr-FR', {
				hour:   '2-digit',
				minute: '2-digit'
			})
}

/* ============================================================
 * FORMATAGE
 * ============================================================ */
function formatTypeContribuable(type) {
	if (!type) return '—'
		if (Array.isArray(type)) return type.map(formatTypeContribuable).join(', ')
			if (typeof type === 'string' && type.startsWith('{') && type.endsWith('}')) {
				return type.slice(1, -1).split(',').map(t => t.trim().replace(/^"|"$/g, '')).join(', ')
			}
			const labels = { PERSONNE_PHYSIQUE: 'Personne physique', SOCIETE: 'Société' }
			return labels[type] || type
}

function formaterDate(date) {
	if (!date) return '—'
		const d = new Date(date)
		if (Number.isNaN(d.getTime())) return String(date)
			return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formaterDateHeure(date) {
	if (!date) return '—'
		const d = new Date(date)
		if (Number.isNaN(d.getTime())) return String(date)
			return d.toLocaleString('fr-FR', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			})
}

function formaterTaille(bytes) {
	if (!bytes) return '—'
		if (bytes < 1024) return `${bytes} octets`
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
				return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/* ============================================================
 * ONGLETS
 * ============================================================ */
const activeTab = ref('contribuable')

const tabs = [
	{ id: 'contribuable', label: 'Contribuable', icon: 'user' },
{ id: 'pieces',       label: 'Pièces déposées', icon: 'doc',  badge: () => pieces.value.length },
{ id: 'historique',   label: 'Historique',   icon: 'clock' ,badge: () => historique.value.length || 0},
{ id: 'traitements',  label: 'Traitements',  icon: 'check', badge: () => traitements.value.length || 0 },
{ id: 'commentaires', label: 'Commentaires', icon: 'chat',   badge: () => commentaires.value.length || 0 },
{ id: 'audit',        label: 'Audit',        icon: 'shield' }
]

/* ============================================================
 * STATS RG (RG6, RG8, RG9)
 * ============================================================ */
const stats = computed(() => {
	const total        = pieces.value.length
	const conformes    = pieces.value.filter(p => p.statut_verification === 'CONFORME').length
	const nonConformes = pieces.value.filter(p => p.statut_verification === 'NON_CONFORME').length
	const enAttente    = pieces.value.filter(p => p.statut_verification === 'EN_ATTENTE').length
	
	const peutValider   = total > 0 && nonConformes === 0 && enAttente === 0
	const doitCompleter = nonConformes > 0 || enAttente > 0
	
	const progression = total === 0 ? 0 : Math.round((conformes / total) * 100)
	
	return { total, conformes, nonConformes, enAttente, peutValider, doitCompleter, progression }
})

/* ============================================================
 * STATUTS & CLASSES UI
 * ============================================================ */
const statutClass = computed(() => {
	const map = {
		BROUILLON:       'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200',
		SOUMIS:          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
		EN_VERIFICATION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
		A_COMPLETER:     'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
		VALIDE:          'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
		REJETE:          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
		CLOTURE:         'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200'
	}
	return map[dossier.value?.statut_dossier] || 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
})

const getStatusClass = (status) => {
	if (status === 'CONFORME')     return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
		if (status === 'NON_CONFORME') return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
			return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
}

const contribuable = computed(() => dossier.value?.contribuable || null)

/* ============================================================
 * ICÔNES FICHIERS
 * ============================================================ */
const fileIcons = {
	id:       'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5l-2-2H8l-2 2z',
	pdf:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z',
	xl:       'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
	eur:      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
	bank:     'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
	home:     'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
	contract: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
}

// Dans DossierDetailAgent.vue
const piecesNonConformes = computed(() =>
pieces.value.filter(p => p.statut_verification === 'NON_CONFORME')
)

/* Pieces manquantes : presentes dans `requis` mais absentes de `pieces` */
const piecesManquantes = computed(() => {
	const idsFournis = new Set(
		pieces.value.map(p => p.id_type_piece ?? p.type_piece?.id_type_piece)
	)
	
	return requis.value
	.filter(r => r.obligatoire !== false)
	.filter(r => !idsFournis.has(r.id_type_piece))
	.map(r => ({
		id_type_piece: r.id_type_piece,
		libelle: r.libelle || r.type_piece_libelle || 'Pièce obligatoire',
		obligatoire: r.obligatoire !== false
	}))
})

const getFileIcon = (mimeType) => {
	if (!mimeType) return fileIcons.id
		if (mimeType === 'application/pdf') return fileIcons.pdf
			if (mimeType === 'image/jpeg' || mimeType === 'image/png') return fileIcons.id
				return fileIcons.id
}

/* ============================================================
 * ACTIONS DOSSIER
 * ============================================================ */
async function changerDecision(decision, commentaire = '') {
	try {
		await api.patch(`/dossiers/${dossier.value.id_dossier}/decision`, { decision, commentaire })
		await chargerDossier()
	} catch (error) {
		console.error('❌ Erreur décision dossier :', error)
		toast.error(error.response?.data?.message || 'Impossible de modifier le statut du dossier.')
	}
}

async function handleValider() {
	if (!stats.value.peutValider) {
		toast.warning(' toutes les pièces obligatoires doivent être CONFORME.')
		return
	}
	await changerDecision('VALIDE')
}

function ouvrirModalComplement() {
	complementCommentaire.value = ''
	showComplementModal.value = true
}

function fermerModalComplement() {
	if (isSubmittingComplement.value) return
		showComplementModal.value = false
		complementCommentaire.value = ''
}

async function confirmerComplement() {
	const commentaire = complementCommentaire.value.trim()
	if (!commentaire) return
		
		isSubmittingComplement.value = true
		try {
			await changerDecision('A_COMPLETER', commentaire)
			showComplementModal.value = false
			complementCommentaire.value = ''
		} finally {
			isSubmittingComplement.value = false
		}
}

/* ============================================================
 * REJET DOSSIER
 * ============================================================ */
function ouvrirModalRejet() {
	rejetMotif.value = ''
	showRejetModal.value = true
}

function fermerModalRejet() {
	if (isSubmittingRejet.value) return
		showRejetModal.value = false
		rejetMotif.value = ''
}

async function confirmerRejet() {
	const motif = rejetMotif.value.trim()
	if (motif.length < 15) return
		
		isSubmittingRejet.value = true
		try {
			await changerDecision('REJETE', motif)
			showRejetModal.value = false
			rejetMotif.value = ''
		} finally {
			isSubmittingRejet.value = false
		}
}

async function commencerVerification() {
	if (!dossier.value || dossier.value.statut_dossier !== 'SOUMIS') return
		try {
			await api.patch(`/dossiers/${dossier.value.id_dossier}/commencer-verification`)
			await chargerDossier()
		} catch (error) {
			console.error('❌ Erreur début vérification :', error)
			toast.error(error.response?.data?.message || 'Impossible de commencer la vérification.')
		}
}

/* ============================================================
 * VÉRIFICATION PIÈCE
 * ============================================================ */
function ouvrirModalVerification(piece) {
	selectedPiece.value = piece
	verificationStatut.value = ''
	verificationCommentaire.value = ''
	showVerificationModal.value = true
	
	// Charge automatiquement l'aperçu (Approche A)
	visualiserPiece(piece.id_piece)
}

function fermerModalVerification() {
	if (isSubmittingVerification.value) return
		showVerificationModal.value = false
		selectedPiece.value = null
		verificationStatut.value = ''
		verificationCommentaire.value = ''
		
		// Libère l'URL blob
		libererPiecePreview()
}

async function confirmerVerification() {
	if (!selectedPiece.value || !verificationStatut.value) return
		
		if (verificationStatut.value === 'NON_CONFORME' && !verificationCommentaire.value.trim()) {
			toast.warning('Un commentaire est obligatoire pour déclarer une pièce non conforme.')
			return
		}
		
		isSubmittingVerification.value = true
		try {
			
			console.log('********************************************************')
			console.log('VERIFICATION PIECE RECU')
			console.log('ID : ',selectedPiece.value.id_piece)
			console.log('COMMENTAIRE : ', verificationCommentaire.value)
			console.log('********************************************************')
			
			
			await api.patch(`/pieces/${selectedPiece.value.id_piece}/verifier`, {
				statut_verification: verificationStatut.value,
				commentaire_verification: verificationCommentaire.value.trim() || null
			})
			fermerModalVerification()
			await chargerDossier()
		} catch (error) {
			console.error('❌ Erreur vérification pièce :', error)
			
			console.error(
				'📡 STATUS :',
				 error.response?.status
			)
			
			console.error(
				'📡 REPONSE API :',
				 error.response?.data
			)
			
			toast.error(
				error.response?.data?.message ||
				'Impossible de vérifier cette pièce.'
			)
		} finally {
			isSubmittingVerification.value = false
		}
}

/* ============================================================
 * APERÇU PIÈCE (Approche A)
 * ============================================================ */

/** Libère l'URL blob courante pour éviter les fuites mémoire */
function libererPiecePreview() {
	if (piecePreviewUrl.value?.startsWith('blob:')) {
		URL.revokeObjectURL(piecePreviewUrl.value)
	}
	piecePreviewUrl.value   = ''
	piecePreviewMime.value  = ''
	piecePreviewError.value = ''
}

/** Charge la pièce en blob et stocke l'URL pour la modal */
async function visualiserPiece(idPiece) {
	if (!idPiece) return
		
		libererPiecePreview()
		isLoadingPreview.value = true
		
		try {
			const response = await api.get(`/pieces/${idPiece}/visualiser`, {
				responseType: 'blob'
			})
			
			const mime = response.headers['content-type'] || 'application/octet-stream'
			const blob = new Blob([response.data], { type: mime })
			
			piecePreviewMime.value = mime
			piecePreviewUrl.value  = URL.createObjectURL(blob)
		} catch (error) {
			console.error('❌ Erreur visualisation pièce :', error)
			
			// L'API peut retourner un JSON d'erreur alors qu'on demande un blob
			if (error.response?.data instanceof Blob) {
				try {
					const text = await error.response.data.text()
					const data = JSON.parse(text)
					piecePreviewError.value = data.message || 'Impossible de visualiser la pièce.'
					return
				} catch { /* ignore */ }
			}
			piecePreviewError.value =
			error.response?.data?.message ||
			'Impossible de visualiser la pièce.'
		} finally {
			isLoadingPreview.value = false
		}
}

/** Ouvre l'URL blob dans un nouvel onglet (déclenché depuis la modal) */
function ouvrirApercuDansNouvelOnglet() {
	if (!piecePreviewUrl.value) return
		window.open(piecePreviewUrl.value, '_blank')
}

const suggestionsComplement = computed(() => {
	const out = []
	
	/* 1. Pièces non conformes */
	pieces.value
	.filter(p => p.statut_verification === 'NON_CONFORME')
	.forEach(p => {
		const nom = p.type_piece_libelle || p.nom_fichier || 'Pièce'
		out.push({
			type: 'non_conforme',
			label: `Remplacer « ${nom} » (non conforme)`,
				 value: `Remplacer la pièce « ${nom} » : elle est actuellement non conforme.`
		})
	})
	
	/* 2. Pièces en attente */
	pieces.value
	.filter(p => p.statut_verification === 'EN_ATTENTE')
	.forEach(p => {
		const nom = p.type_piece_libelle || p.nom_fichier || 'Pièce'
		out.push({
			type: 'en_attente',
			label: `Préciser « ${nom} » (en attente)`,
				 value: `Fournir des précisions pour la pièce « ${nom} » : elle est en attente de validation.`
		})
	})
	
	const idsFournis = new Set(
		pieces.value.map(p => p.id_type_piece ?? p.type_piece?.id_type_piece)
	)
	
	requis.value
	.filter(r => r.obligatoire !== false)
	.filter(r => !idsFournis.has(r.id_type_piece))
	.forEach(r => {
		const nom = r.libelle || r.type_piece_libelle || 'Pièce obligatoire'
		out.push({
			type: 'manquante',
			label: `Fournir « ${nom} » (manquante)`,
				 value: `Fournir la pièce obligatoire manquante : « ${nom} ».`
		})
	})
	
	return out
})

/* ============================================================
 * NAVIGATION
 * ============================================================ */
function retour() {
	router.back()
}

/* ============================================================
 * ANIMATIONS GSAP
 * ============================================================ */
function animerEntree() {
	// Header : slide-down + fade (fromTo = déterministe)
	if (headerRef.value) {
		gsap.fromTo(
			headerRef.value,
			{ opacity: 0, y: -24 },
			{
				opacity: 1,
				y: 0,
				duration: 0.55,
				ease: 'power3.out',
				clearProps: 'transform,opacity'   // ← rend la main au CSS après
			}
		)
	}
	
	// KPI cascade
	const kpis = kpiRefs.value.filter(Boolean)
	if (kpis.length) {
		gsap.fromTo(
			kpis,
			{ opacity: 0, y: 18 },
			{
				opacity: 1,
				y: 0,
				duration: 0.45,
				stagger: 0.07,
				delay: 0.15,
				ease: 'power2.out',
				clearProps: 'transform,opacity'
			}
		)
	}
	
	// Onglets
	if (tabNavRef.value) {
		const tabItems = tabNavRef.value.querySelectorAll('[data-tab]')
		if (tabItems.length) {
			gsap.fromTo(
				tabItems,
			   { opacity: 0, y: -8 },
			   {
				   opacity: 1,
				   y: 0,
				   duration: 0.35,
				   stagger: 0.04,
				   delay: 0.25,
				   ease: 'power2.out',
				   clearProps: 'transform,opacity'
			   }
			)
		}
	}
}

const peutSoumettre = computed(() => {
	if (!dossier.value) return false
		if (!['BROUILLON', 'A_COMPLETER'].includes(dossier.value.statut_dossier)) return false
			
			const normalize = (v) => String(v ?? '').trim()
			
			/* Pièces actives (non NON_CONFORME) */
			const piecesActives = pieces.value.filter(
				p => p.statut_verification !== 'NON_CONFORME'
			)
			
			if (piecesActives.length === 0) return false
				
				/* Types fournis (actifs uniquement) */
				const typesFournis = new Set(
					piecesActives.map(p => normalize(p.id_type_piece)).filter(Boolean)
				)
				
				/* Types obligatoires */
				const typesRequisObligatoires = requis.value
				.filter(r => r.obligatoire === true)
				.map(r => normalize(r.id_type_piece))
				.filter(Boolean)
				
				/* Tous fournis ? */
				const tousFournis = typesRequisObligatoires.every(
					idType => typesFournis.has(idType)
				)
				
				return tousFournis
})

const raisonBlocageSoumission = computed(() => {
	if (peutSoumettre.value) {
		return dossier.value?.statut_dossier === 'A_COMPLETER'
		? 'Resoumettre le dossier'
		: 'Soumettre le dossier'
	}
	
	const raisons = []
	const normalize = (v) => String(v ?? '').trim()
	
	const piecesActives = pieces.value.filter(
		p => p.statut_verification !== 'NON_CONFORME'
	)
	
	if (piecesActives.length === 0) {
		raisons.push('aucune pièce fournie')
	} else {
		const typesFournis = new Set(
			piecesActives.map(p => normalize(p.id_type_piece)).filter(Boolean)
		)
		
		const typesRequisObligatoires = requis.value
		.filter(r => r.obligatoire === true)
		.map(r => normalize(r.id_type_piece))
		.filter(Boolean)
		
		const manquants = typesRequisObligatoires.filter(
			idType => !typesFournis.has(idType)
		)
		
		if (manquants.length > 0) {
			raisons.push(
				`${manquants.length} pièce${manquants.length > 1 ? 's' : ''} obligatoire${manquants.length > 1 ? 's' : ''} manquante${manquants.length > 1 ? 's' : ''}`
			)
		}
	}
	
	return 'Impossible de soumettre : ' + raisons.join(', ')
})

/* ============================================================
 * SOUMISSION DOSSIER (agent au guichet)
 * Endpoint : POST /agent/dossiers/:id/soumettre
 * Backend  : DossierFiscalModel.transitionnerPourAgent()
 * ============================================================ */
async function soumettreDossier() {
	if (!dossier.value) return
		
		if (!peutSoumettre.value) {
			toast.error(raisonBlocageSoumission.value)
			return
		}
		
		isSubmittingSoumission.value = true
		try {
			await api.post(
				`/agent/dossiers/${dossier.value.id_dossier}/soumettre`
			)
			
			await chargerDossier()
			toast.success('Dossier soumis avec succès.')
		} catch (error) {
			console.error('❌ Erreur soumission dossier :', error)
			toast.error(
				error.response?.data?.message ||
				'Impossible de soumettre le dossier.'
			)
		} finally {
			isSubmittingSoumission.value = false
		}
}

function animerContenu() {
	if (!contentRef.value) return
		const items = contentRef.value.querySelectorAll('[data-animate-content]')
		if (!items.length) return
			
			gsap.fromTo(
				items,
			   { opacity: 0, y: 14 },
			   {
				   opacity: 1,
				   y: 0,
				   duration: 0.4,
				   stagger: 0.06,
				   ease: 'power2.out',
				   clearProps: 'transform,opacity'
			   }
			)
}

/* Re-animer quand l'onglet change */
watch(activeTab, async () => {
	await nextTick()
	animerContenu()
})

/* ============================================================
 * WATCHER : changement d'onglet
 * Charge les données du nouvel onglet si non chargées
 * ============================================================ */
watch(activeTab, async (newTab) => {
	await nextTick()
	animerContenu()
	
	if (newTab === 'historique' && historique.value.length === 0) {
		await chargerHistorique()
	}
	
	if (newTab === 'traitements' && traitements.value.length === 0) {
		await chargerTraitements()
	}
	
	if (newTab === 'audit' && audit.value.length === 0) {
		await chargerAudit()
	}
	
	/* Commentaires déjà chargés au onMounted */
})

/* ============================================================
 * WATCHER : filtre traitements
 * ============================================================ */
watch(filtreTraitement, () => {
	if (activeTab.value === 'traitements') {
		chargerTraitements()
	}
})

/* Re-animer les pièces quand la liste change */
watch(pieces, async () => {
	await nextTick()
	const rows = document.querySelectorAll('[data-piece-row]')
	if (!rows.length) return
		
		gsap.fromTo(
			rows,
			{ y: 12, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: 0.35,
				stagger: 0.04,
				ease: 'power2.out',
				clearProps: 'transform,opacity'   // ⭐ ESSENTIEL
			}
		)
})

const fileInputRef = ref(null)

function ouvrirSelecteurFichier() {
	if (!selectedTypePiece.value) {
		toast.error('Sélectionnez d\'abord un type de pièce.')
		return
	}
	fileInputRef.value?.click()
}
/* ============================================================
 * ÉTAT — UPLOAD PIÈCE (côté agent)
 * ============================================================ */
const selectedTypePiece  = ref('')
const isUploading        = ref(false)

/* ============================================================
 * UPLOAD PIÈCE — Adapté pour Electron
 * ============================================================ */
async function onUpload(e) {
	const file = e.target.files?.[0]
	if (!file || !dossier.value) { e.target.value = ''; return }
	
	if (!selectedTypePiece.value) {
		toast.error('Veuillez sélectionner le type de pièce.')
		e.target.value = ''
		return
	}
	
	const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']
	if (!ACCEPTED.includes(file.type)) {
		toast.error('Format non autorisé (PDF, JPG, PNG).')
		e.target.value = ''
		return
	}
	
	if (file.size > 8 * 1024 * 1024) {
		toast.error('Le fichier ne doit pas dépasser 8 Mo.')
		e.target.value = ''
		return
	}
	
	isUploading.value = true
	
	try {
		const formData = new FormData()
		
		// ⭐ LE CHAMP QUE MULTER ATTEND
		formData.append('fichier', file)
			
			// Le reste des métadonnées
			formData.append('id_type_piece', selectedTypePiece.value)
				
				// Bonus (le backend peut les ignorer s'il ne les lit pas)
				if (window.electronAPI?.getPathForFile) {
					const filePath = window.electronAPI.getPathForFile(file)
					if (filePath) formData.append('fichier_path', filePath)
				}
				
				// ⭐ PAS de Content-Type manuel — axios gère la boundary
				const response = await api.post(
					`/agent/dossiers/${dossier.value.id_dossier}/pieces`,
					formData
				)
				
				await chargerDossier()
				selectedTypePiece.value = ''
				toast.success('Pièce ajoutée avec succès.')
	} catch (error) {
		console.error('❌ Erreur upload pièce :', error)
		console.error('📡 STATUS :', error.response?.status)
		console.error('📡 DATA :', error.response?.data)
		toast.error(error.response?.data?.message || 'Impossible d\'ajouter la pièce.')
	} finally {
		isUploading.value = false
		e.target.value = ''
	}
}

/* ============================================================
 * HELPERS — Types à insérer (comme côté contribuable)
 * ============================================================ */
const typesAInserer = computed(() => {
	const normalize = (v) => String(v ?? '').trim()
	
	/* 1. Types NON_CONFORME (à remplacer) */
	const typesNonConformes = new Set(
		pieces.value
		.filter(p => p.statut_verification === 'NON_CONFORME')
		.map(p => normalize(p.id_type_piece))
	)
	
	/* 2. Types déjà fournis (actifs) */
	const typesDejaFournis = new Set(
		pieces.value
		.filter(p => p.statut_verification !== 'NON_CONFORME')
		.map(p => normalize(p.id_type_piece))
	)
	
	/* 3. Filtrer requis */
	return requis.value.filter((type) => {
		const id = normalize(type.id_type_piece)
		
		/* Si déjà fourni ET pas non conforme → cacher */
		if (typesDejaFournis.has(id) && !typesNonConformes.has(id)) {
			return false
		}
		
		return true
	})
})

function isTypeNonConforme(type) {
	const normalize = (v) => String(v ?? '').trim()
	const id = normalize(type.id_type_piece)
	
	return pieces.value.some(
		p => normalize(p.id_type_piece) === id
		&& p.statut_verification === 'NON_CONFORME'
	)
}

function countType(type) {
	const normalize = (v) => String(v ?? '').trim()
	const id = normalize(type.id_type_piece)
	
	return pieces.value.filter(
		p => normalize(p.id_type_piece) === id
		&& p.statut_verification !== 'NON_CONFORME'
	).length
}

function preSelectionnerType(typeId) {
	selectedTypePiece.value = typeId
	
	/* Scroll vers la zone d'upload */
	nextTick(() => {
		document.querySelector('select')?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		})
	})
}

/* ============================================================
 * Peut-on uploader ?
 * ============================================================ */
const peutUploaderPiece = computed(() =>
dossier.value &&
['BROUILLON', 'A_COMPLETER'].includes(dossier.value.statut_dossier) &&
typesAInserer.value.length > 0
)

/* ============================================================
 * LIFECYCLE
 * ============================================================ */
onMounted(async () => {
	
	/* ⭐ Écoute des mises à jour de dossier */
	socket.on('dossier:updated', onDossierUpdated)
	socket.on('commentaire:new', onCommentaireNew)
	
	await chargerDossier()
	await chargerCommentaires()
	await nextTick()
	animerEntree()
})

onBeforeUnmount(() => {
	/* ⭐ Retirer l'écouteur Socket.IO */
	socket.off('dossier:updated', onDossierUpdated)
	socket.off('commentaire:new', onCommentaireNew)
	
	gsap.killTweensOf([
		headerRef.value,
		tabNavRef.value,
		contentRef.value,
		...kpiRefs.value
	].filter(Boolean))
	
	/* Libère le blob d'aperçu */
	libererPiecePreview()
})
</script>

<template>
<div class="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">

<!-- ============================================================
LOADING GLOBAL
============================================================ -->
<AnimatePresence>
<motion.div
v-if="isLoading && !dossier"
key="global-loading"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
class="flex-1 flex items-center justify-center"
>
<div class="flex flex-col items-center gap-3">
<div class="w-10 h-10 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin"></div>
<span class="text-sm text-[var(--text-muted)]">Chargement du dossier...</span>
</div>
</motion.div>

<!-- ============================================================
ERREUR GLOBALE
============================================================ -->
<motion.div
v-else-if="errorMessage"
key="global-error"
:initial="{ opacity: 0, y: 10 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0 }"
class="flex-1 flex items-center justify-center p-6"
>
<div class="max-w-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-8 text-center">
<svg class="w-12 h-12 mx-auto text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>
<p class="text-sm text-red-600 dark:text-red-300 font-medium">{{ errorMessage }}</p>
<div class="mt-4 flex justify-center gap-2">
<button @click="chargerDossier" class="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:bg-blue-600 transition">
Réessayer
</button>
<button @click="retour" class="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--hover)] transition">
Retour
</button>
</div>
</div>
</motion.div>
</AnimatePresence>

<!-- ============================================================
CONTENU PRINCIPAL (après chargement)
============================================================ -->
<template v-if="dossier">

<!-- HEADER -->
<header
ref="headerRef"
class="bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6 py-4"
>
<div class="max-w-[1600px] mx-auto space-y-4">

<!-- Ligne 1 : Identité + Actions -->
<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

<!-- Identité du dossier -->
<div class="flex items-start gap-3 min-w-0">
<button
@click="retour"
class="shrink-0 w-9 h-9 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--hover)] flex items-center justify-center transition"
title="Retour"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
</svg>
</button>

<div class="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-blue-500/20">
<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
</div>

<div class="min-w-0">
<div class="flex flex-wrap items-center gap-2">
<h1 class="text-base sm:text-lg font-bold truncate">
Dossier {{ dossier.reference_dossier || '—' }}
</h1>
<span :class="['px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap', statutClass]">
{{ dossier.statut_dossier?.replaceAll('_', ' ') || '—' }}
</span>
</div>
<p class="text-xs text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
<span>{{ dossier.service?.libelle_service || '—' }}</span>
<span class="text-[var(--border)]">•</span>
<span>Prédéposé le {{ formaterDate(dossier.date_predepot) }}</span>
<template v-if="dossier.rdv">
<span class="text-[var(--border)]">•</span>
<span class="text-[var(--primary)] font-medium">
RDV #{{ dossier.rdv.id_rdv }} — {{ dossier.rdv.date_rdv }} {{ dossier.rdv.heure_rdv }}
</span>
</template>
</p>
</div>
</div>

<!-- Actions -->
<div class="flex flex-wrap items-center gap-2">

<motion.button
v-if="dossier.statut_dossier === 'SOUMIS'"
@click="commencerVerification"
whileHover="{ scale: 1.03 }"
	whileTap="{ scale: 0.97 }"
		class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
		>
		Commencer la vérification
		</motion.button>
		
		<motion.button
		v-if="dossier.statut_dossier === 'EN_VERIFICATION'"
		@click="ouvrirModalComplement"
		whileHover="{ scale: 1.03 }"
			whileTap="{ scale: 0.97 }"
				class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition"
				>
				Demander complément
				</motion.button>
				
				<motion.button
				v-if="dossier.statut_dossier === 'EN_VERIFICATION'"
				@click="ouvrirModalRejet"
				whileHover="{ scale: 1.03 }"
					whileTap="{ scale: 0.97 }"
						class="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
						>
						Rejeter
						</motion.button>
						
						<motion.button
						v-if="dossier.statut_dossier === 'EN_VERIFICATION'"
						@click="handleValider"
						:disabled="!stats.peutValider"
						:whileHover="stats.peutValider ? { scale: 1.03 } : {}"
						:whileTap="stats.peutValider ? { scale: 0.97 } : {}"
						:class="[
						'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-white transition flex items-center gap-2',
stats.peutValider
? 'bg-green-600 hover:bg-green-700 shadow-sm shadow-green-500/20'
: 'bg-[var(--border)] cursor-not-allowed opacity-60'
]"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
Valider le dossier
</motion.button>
</div>
</div>

<!-- Barre de progression RG8 -->
<div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
<div class="flex items-center justify-between text-xs mb-2">
<span class="font-medium text-[var(--text-muted)]">Progression de vérification</span>
<span class="font-bold text-[var(--primary)]">{{ stats.progression }}%</span>
</div>
<div class="h-2 bg-[var(--card)] rounded-full overflow-hidden">
<motion.div
:initial="{ width: 0 }"
:animate="{ width: stats.progression + '%' }"
:transition="{ duration: 0.8, ease: 'easeOut' }"
:class="[
'h-full rounded-full',
stats.peutValider ? 'bg-green-500' : stats.nonConformes > 0 ? 'bg-red-500' : 'bg-[var(--primary)]'
]"
></motion.div>
</div>
</div>

<!-- ⭐ Bannière pour démarrer la vérification -->
<motion.div
v-if="dossier.statut_dossier === 'SOUMIS'"
:initial="{ opacity: 0, y: -8 }"
:animate="{ opacity: 1, y: 0 }"
class="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
>
<div class="flex items-start gap-3 min-w-0">
<div class="shrink-0 w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<div class="min-w-0">
<p class="text-sm font-bold text-blue-700 dark:text-blue-300">
Ce dossier attend le démarrage de la vérification
</p>
<p class="text-xs text-[var(--text-muted)] mt-0.5">
Cliquez sur « Commencer la vérification » pour pouvoir vérifier les pièces.
</p>
</div>
</div>

<motion.button
@click="commencerVerification"
whileHover="{ scale: 1.03 }"
	whileTap="{ scale: 0.97 }"
		class="shrink-0 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition inline-flex items-center gap-2"
		>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
		</svg>
		Commencer la vérification
		</motion.button>
		</motion.div>

<!-- KPI -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
<motion.div
v-for="(kpi, i) in [
{ label: 'Pièces totales', value: stats.total,        color: 'text-[var(--text)]',                   bg: 'bg-[var(--card)]',                  border: 'border-[var(--border)]' },
{ label: 'Conformes',      value: stats.conformes,    color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-50 dark:bg-green-500/10',  border: 'border-green-100 dark:border-green-500/20' },
{ label: 'Non conformes',  value: stats.nonConformes, color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-50 dark:bg-red-500/10',      border: 'border-red-100 dark:border-red-500/20' },
{ label: 'En attente',     value: stats.enAttente,    color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-500/10',border: 'border-orange-100 dark:border-orange-500/20' }
]"
:key="kpi.label"
:ref="el => { if (el) kpiRefs[i] = el }"
:whileHover="{ y: -3 }"
:transition="{ type: 'spring', stiffness: 300, damping: 20 }"
:class="['rounded-xl p-3 sm:p-4 border cursor-default', kpi.bg, kpi.border]"
>
<p class="text-[11px] sm:text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">{{ kpi.label }}</p>
<p :class="['text-xl sm:text-2xl font-bold mt-1', kpi.color]">{{ kpi.value }}</p>
</motion.div>
</div>
</div>
</header>

<!-- ============================================================
ONGLETS
============================================================ -->
<nav
ref="tabNavRef"
class="bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6"
>
<div class="max-w-[1600px] mx-auto flex gap-1 overflow-x-auto scrollbar-thin">
<button
v-for="tab in tabs"
:key="tab.id"
data-tab
@click="activeTab = tab.id"
:class="[
'relative flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
activeTab === tab.id
? 'text-[var(--primary)]'
: 'text-[var(--text-muted)] hover:text-[var(--text)]'
]"
>
<!-- Icônes -->
<svg v-if="tab.icon === 'user'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
<svg v-else-if="tab.icon === 'doc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
<svg v-else-if="tab.icon === 'clock'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
<svg v-else-if="tab.icon === 'check'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
<svg v-else-if="tab.icon === 'chat'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
<svg v-else-if="tab.icon === 'shield'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
<span>{{ tab.label }}</span>

<span
v-if="tab.badge && tab.badge()"
class="px-1.5 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)] text-[10px] font-semibold"
>
{{ tab.badge() }}
</span>

<!-- Indicateur actif animé -->
<motion.div
v-if="activeTab === tab.id"
layout-id="tab-indicator"
:transition="{ type: 'spring', stiffness: 380, damping: 30 }"
class="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--primary)] rounded-full"
></motion.div>
</button>
</div>
</nav>

<!-- ============================================================
CONTENU DES ONGLETS
============================================================ -->
<main class="flex-1 overflow-y-auto p-4 sm:p-6">
<div ref="contentRef" class="max-w-[1600px] mx-auto">

<AnimatePresence mode="wait">

<!-- ===================== CONTRIBUABLE ===================== -->
<motion.div
v-if="activeTab === 'contribuable'"
key="contribuable"
data-animate-content
:initial="{ opacity: 0, y: 12 }"
:animate="{ opacity: 1, y: 0 }"
:exit="{ opacity: 0, y: -12 }"
:transition="{ duration: 0.25 }"
class="grid grid-cols-1 lg:grid-cols-12 gap-6"
>
<!-- Fiche contribuable -->
<div class="lg:col-span-7 bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)]">
<div class="p-5 sm:p-6 border-b border-[var(--border)]">
<h2 class="font-bold flex items-center gap-2 text-[var(--text)]">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
Informations contribuable
</h2>
</div>

<div class="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
<div>
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">NIF</p>
<p class="font-medium text-[var(--text)]">{{ contribuable?.nif || '—' }}</p>
</div>
<div>
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">Type</p>
<p class="font-medium text-[var(--text)]">
{{ formatTypeContribuable(contribuable?.type_contribuable) }}
</p>
</div>
<div class="sm:col-span-2">
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">Nom / Raison sociale</p>
<p class="font-medium text-[var(--text)]">
{{ contribuable?.nom_raison_sociale || '—' }} {{ contribuable?.prenom || '' }}
</p>
</div>
<div>
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">Téléphone</p>
<p class="font-medium text-[var(--text)]">{{ contribuable?.telephone || '—' }}</p>
</div>
<div>
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">Email</p>
<p class="font-medium text-[var(--text)] truncate">{{ contribuable?.email || '—' }}</p>
</div>
<div class="sm:col-span-2">
<p class="text-[var(--text-muted)] mb-1 text-xs uppercase tracking-wide">Adresse</p>
<p class="font-medium text-[var(--text)]">{{ contribuable?.adresse || '—' }}</p>
</div>
</div>

<div class="p-5 sm:p-6 pt-0">
<motion.button
whileHover="{ scale: 1.01 }"
	whileTap="{ scale: 0.99 }"
		class="w-full border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 py-2.5 rounded-lg flex justify-between items-center px-4 font-medium text-sm transition"
		>
		Voir la fiche contribuable
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
		</motion.button>
		</div>
		</div>
		
		<!-- Panneau contextuel -->
		<div class="lg:col-span-5 space-y-6">
		<div class="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-5 sm:p-6">
		<h3 class="font-bold text-[var(--text)] mb-4 text-sm flex items-center gap-2">
		<svg class="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
		Rendez-vous rattaché
		</h3>
		
		<div v-if="dossier.rdv" class="space-y-3 text-sm">
		<div class="flex justify-between items-center">
		<span class="text-[var(--text-muted)]">Référence</span>
		<span class="font-medium text-[var(--text)]">RDV #{{ dossier.rdv.id_rdv }}</span>
		</div>
		<div class="flex justify-between items-center">
		<span class="text-[var(--text-muted)]">Date & heure</span>
		<span class="font-medium text-[var(--text)]">
		{{ dossier.rdv.date_rdv }} — {{ dossier.rdv.heure_rdv }}
		</span>
		</div>
		<div class="flex justify-between items-center">
		<span class="text-[var(--text-muted)]">Statut</span>
		<span class="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
		{{ dossier.rdv.statut_rdv }}
		</span>
		</div>
		</div>
		<p v-else class="text-sm text-[var(--text-muted)] italic">Aucun rendez-vous rattaché (RG4).</p>
		</div>
		</div>
		</motion.div>
		
		<!-- ===================== PIÈCES ===================== -->
		<motion.div
		v-else-if="activeTab === 'pieces'"
		key="pieces"
		data-animate-content
		:initial="{ opacity: 0, y: 12 }"
		:animate="{ opacity: 1, y: 0 }"
		:exit="{ opacity: 0, y: -12 }"
		:transition="{ duration: 0.25 }"
		class="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
		>
		<div class="p-5 sm:p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
		<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
		<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
		Pièces déposées
		</h2>
		
		<div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
		
		<!-- ⭐ Select des pièces manquantes -->
		<div
		v-if="piecesManquantes.length"
		class="relative"
		>
		<select
		class="appearance-none pl-8 pr-8 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 cursor-pointer"
		:title="`${piecesManquantes.length} pièce(s) obligatoire(s) manquante(s)`"
		>
		<option value="">
		⚠ {{ piecesManquantes.length }} manquante{{ piecesManquantes.length > 1 ? 's' : '' }}
		</option>
		<option
		v-for="p in piecesManquantes"
		:key="p.id_type_piece"
		:value="p.id_type_piece"
		disabled
		>
		• {{ p.libelle }}
		</option>
		</select>
		
		<!-- Icône à gauche -->
		<svg
		class="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none"
		fill="none" stroke="currentColor" viewBox="0 0 24 24"
		>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
		</svg>
		
		<!-- Flèche à droite -->
		<svg
		class="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none"
		fill="none" stroke="currentColor" viewBox="0 0 24 24"
		>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
		</svg>
		</div>
		
		<!-- ⭐ Bouton Soumettre / Resoumettre (agent pour le contribuable) -->
		<!-- ⭐ Bouton Soumettre / Resoumettre (agent au guichet) -->
		<motion.button
		v-if="['BROUILLON', 'A_COMPLETER'].includes(dossier.statut_dossier)"
		type="button"
		@click="soumettreDossier"
		:disabled="!peutSoumettre || isSubmittingSoumission"
		:whileHover="(peutSoumettre && !isSubmittingSoumission) ? { scale: 1.03 } : {}"
		:whileTap="(peutSoumettre && !isSubmittingSoumission) ? { scale: 0.97 } : {}"
		:class="[
		'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition',
         peutSoumettre && !isSubmittingSoumission
? 'bg-[var(--primary)] text-white hover:bg-blue-600 shadow-sm shadow-blue-500/20'
: 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
]"
:title="peutSoumettre ? raisonBlocageSoumission : raisonBlocageSoumission"
>
<svg v-if="isSubmittingSoumission" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
d="M5 12h14m-6-6 6 6-6 6"/>
</svg>
{{ isSubmittingSoumission
	? 'Envoi…'
	: (dossier.statut_dossier === 'A_COMPLETER' ? 'Resoumettre' : 'Soumettre') }}
	</motion.button>
		
		<!-- Bouton Tout télécharger -->
		<button class="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5 transition">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
		</svg>
		Tout télécharger
		</button>
		</div>
		</div>
		
		<!-- ============================================================
		ZONE UPLOAD (uniquement si BROUILLON ou A_COMPLETER)
		============================================================ -->
		<div
		v-if="peutUploaderPiece"
		class="p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--bg)]/50"
		>
		<div class="flex items-start gap-3 mb-4">
		<div class="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
		<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
		</svg>
		</div>
		<div>
		<h3 class="font-bold text-sm text-[var(--text)]">
		Ajouter ou remplacer une pièce
		</h3>
		<p class="text-xs text-[var(--text-muted)] mt-0.5">
		PDF, PNG, JPG · 8 Mo max
		</p>
		</div>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
		<div>
		<label class="block text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
		Type de pièce
		</label>
		<select
		v-model="selectedTypePiece"
		:disabled="isUploading"
		class="w-full rounded-xl bg-[var(--card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:opacity-50"
		>
		<option value="">
		Sélectionner le type ({{ typesAInserer.length }} disponible{{ typesAInserer.length > 1 ? 's' : '' }})
		</option>
		<option
		v-for="type in typesAInserer"
		:key="type.id_type_piece"
		:value="type.id_type_piece"
		>
		{{ type.libelle }}
		<template v-if="isTypeNonConforme(type)"> — ⚠ à remplacer</template>
		<template v-else-if="type.multiple"> — multiple ({{ countType(type) }} déposée{{ countType(type) > 1 ? 's' : '' }})</template>
		<template v-else>{{ type.obligatoire ? ' — obligatoire' : ' — facultatif' }}</template>
		</option>
		</select>
		</div>
		
		<label
		:class="[
		'inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition',
!selectedTypePiece || isUploading
? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
: 'bg-[var(--primary)] text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
]"
>
<svg v-if="isUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
</svg>
{{ isUploading ? 'Envoi…' : 'Choisir un fichier' }}

<input
ref="fileInputRef"
type="file"
accept=".pdf,.jpg,.jpeg,.png"
class="hidden"
:disabled="!selectedTypePiece || isUploading"
@change="onUpload"
/>
</label>

</div>
</div>
		
		
		<div class="p-3 text-sm text-[var(--text-muted)] bg-[var(--bg)] border-b border-[var(--border)]">
		<span class="font-medium text-[var(--text)]">{{ stats.total }} pièces</span> •
		<span class="text-green-600 dark:text-green-400">{{ stats.conformes }} conformes</span> •
		<span class="text-red-600 dark:text-red-400">{{ stats.nonConformes }} non conformes</span> •
		<span class="text-orange-600 dark:text-orange-400">{{ stats.enAttente }} en attente</span>
		</div>
		
		<div class="divide-y divide-[var(--border)]">
		<motion.div
		v-for="doc in pieces"
		:key="doc.id_piece"
		data-piece-row
		:whileHover="{ backgroundColor: 'var(--hover)' }"
		class="flex flex-col sm:flex-row sm:items-center p-4 transition gap-3"
		>
		<div class="flex items-center gap-3 min-w-0 flex-1">
		<div class="w-10 h-10 shrink-0 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getFileIcon(doc.mime_type)"/>
		</svg>
		</div>
		<div class="min-w-0">
		<p class="font-medium text-[var(--text)] truncate">
		{{ doc.type_piece_libelle || 'Pièce justificative' }}
		</p>
		<p class="text-xs text-[var(--text-muted)] mt-0.5 truncate">
		{{ doc.nom_fichier || 'Fichier' }} •
		{{ formaterTaille(doc.taille_octets) }} •
		{{ formaterDateHeure(doc.date_upload) }}
		</p>
		</div>
		</div>
		
		<div class="flex items-center gap-3 shrink-0 sm:ml-4">
		<span :class="['px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap', getStatusClass(doc.statut_verification)]">
		{{ doc.statut_verification?.replaceAll('_', ' ') || '—' }}
		</span>
		
		<motion.button
		v-if="doc.statut_verification === 'EN_ATTENTE' && dossier?.statut_dossier === 'EN_VERIFICATION'"
		type="button"
		@click="ouvrirModalVerification(doc)"
		whileHover="{ scale: 1.05 }"
			whileTap="{ scale: 0.95 }"
				class="flex items-center gap-1 text-[var(--primary)] hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
				>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
				</svg>
				Vérifier
				</motion.button>
				
				<motion.button
				v-if="doc.statut_verification === 'NON_CONFORME' && peutUploaderPiece"
				type="button"
				@click="preSelectionnerType(doc.id_type_piece)"
				whileHover="{ scale: 1.05 }"
					whileTap="{ scale: 0.95 }"
						class="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium"
						>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
						</svg>
						Remplacer
						</motion.button>
				
				<!-- Message contextuel si dossier pas encore en vérification -->
				<p
				v-else-if="doc.statut_verification === 'EN_ATTENTE' && dossier?.statut_dossier === 'SOUMIS'"
				class="text-[11px] text-orange-600 dark:text-orange-400 flex items-center gap-1.5"
				>
				<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
				d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				Démarrez la vérification
				</p>
				
				</div>
				</motion.div>
				</div>
				
				<div class="p-5 sm:p-6 bg-blue-50 dark:bg-blue-500/5 border-t border-blue-100 dark:border-blue-500/20 text-sm text-[var(--text)] flex items-start gap-3">
				<svg class="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
				<p class="text-xs sm:text-sm">
				Seuls un <strong>AGENT_VERIFICATEUR</strong> ou un <strong>CHEF_SERVICE</strong> habilité peuvent vérifier une pièce.
				</p>
				</div>
				</motion.div>
				
				<!-- ===================== HISTORIQUE ===================== -->
				
				<!-- ===================== HISTORIQUE ===================== -->
				<motion.div
				v-else-if="activeTab === 'historique'"
				key="historique"
				data-animate-content
				:initial="{ opacity: 0, y: 12 }"
				:animate="{ opacity: 1, y: 0 }"
				:exit="{ opacity: 0, y: -12 }"
				:transition="{ duration: 0.25 }"
				class="max-w-4xl mx-auto"
				>
				<div class="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)]">
				<div class="p-5 sm:p-6 border-b border-[var(--border)]">
				<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
				<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				Historique complet
				<span class="text-xs font-normal text-[var(--text-muted)]">
				({{ historique.length }} événement{{ historique.length > 1 ? 's' : '' }})
				</span>
				</h2>
				</div>
				
				<!-- Loading -->
				<div v-if="isLoadingHistorique" class="p-6 space-y-4">
				<div v-for="n in 3" :key="n" class="flex gap-4">
				<div class="w-10 h-10 rounded-full bg-[var(--bg)] animate-pulse"></div>
				<div class="flex-1 space-y-2">
				<div class="h-4 bg-[var(--bg)] rounded animate-pulse"></div>
				<div class="h-3 bg-[var(--bg)] rounded w-2/3 animate-pulse"></div>
				</div>
				</div>
				</div>
				
				<!-- Vide -->
				<div v-else-if="historiqueGrouped.length === 0" class="p-12 text-center">
				<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				<p class="text-sm text-[var(--text-muted)]">Aucun événement enregistré.</p>
				</div>
				
				<!-- Groupé par jour -->
				<div v-else class="p-5 sm:p-6 space-y-8">
				<div v-for="group in historiqueGrouped" :key="group.date">
				<!-- Titre du jour -->
				<div class="flex items-center gap-3 mb-4">
				<div class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
				{{ group.label }}
				</div>
				<div class="flex-1 h-px bg-[var(--border)]"></div>
				<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
				{{ group.items.length }}
				</span>
				</div>
				
				<!-- Timeline -->
				<ol class="relative border-l border-[var(--border)] ml-3 space-y-4">
				<li v-for="(event, i) in group.items" :key="`${group.date}-${i}`" class="ml-6">
				<!-- Pastille -->
				<span :class="['absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 border-[var(--card)]', getEventColor(event.event_type)]"></span>
				
				<div class="flex items-start justify-between gap-3 flex-wrap">
				<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-[var(--text)]">
				{{ event.event_action?.replace(/_/g, ' ') }}
				</p>
				
				<p class="text-xs text-[var(--text-muted)] mt-1">
				<span class="font-medium">{{ event.auteur }}</span>
				<template v-if="event.auteur_detail?.matricule">
				({{ event.auteur_detail.matricule }})
				</template>
				<span class="mx-1">·</span>
				<span class="text-[var(--primary)] font-medium">{{ event.auteur_type }}</span>
				</p>
				
				<p
				v-if="event.event_detail"
				class="mt-2 text-xs px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] inline-block max-w-full whitespace-pre-wrap break-words"
				>
				{{ event.event_detail }}
				</p>
				</div>
				
				<span class="text-xs text-[var(--text-muted)] whitespace-nowrap">
				{{ formatHeure(event.event_date) }}
				</span>
				</div>
				</li>
				</ol>
				</div>
				</div>
				</div>
				</motion.div>
				
				<!-- ===================== TRAITEMENTS ===================== -->
				<!-- ===================== TRAITEMENTS ===================== -->
				<motion.div
				v-else-if="activeTab === 'traitements'"
				key="traitements"
				data-animate-content
				:initial="{ opacity: 0, y: 12 }"
				:animate="{ opacity: 1, y: 0 }"
				:exit="{ opacity: 0, y: -12 }"
				:transition="{ duration: 0.25 }"
				class="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)]"
				>
				<div class="p-5 sm:p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
				<div>
				<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
				<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				Décisions de traitement
				</h2>
				<p class="text-xs text-[var(--text-muted)] mt-1">Trace formelle des décisions (RG13)</p>
				</div>
				
				<div class="flex flex-wrap items-center gap-2">
				<!-- Filtres -->
				<div class="inline-flex p-1 rounded-xl bg-[var(--bg)]">
				<button
				v-for="opt in [
				{ key: 'TOUS',            label: 'Tous' },
{ key: 'VALIDE',          label: 'Validés' },
{ key: 'REJETE',          label: 'Rejetés' },
{ key: 'A_COMPLETER',     label: 'Compléments' },
{ key: 'EN_VERIFICATION', label: 'En vérif.' }
]"
:key="opt.key"
type="button"
@click="filtreTraitement = opt.key"
:class="[
'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
filtreTraitement === opt.key
? 'bg-[var(--primary)] text-white shadow-sm'
: 'text-[var(--text-muted)] hover:text-[var(--text)]'
]"
>
{{ opt.label }}
</button>
</div>

<!-- Export CSV -->
<motion.button
@click="exporterTraitements"
:disabled="traitements.length === 0"
:whileHover="{ scale: 1.03 }"
:whileTap="{ scale: 0.97 }"
class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40 transition"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
</svg>
Export CSV
</motion.button>
</div>
</div>

<!-- Loading -->
<div v-if="isLoadingTraitements" class="p-6 space-y-3">
<div v-for="n in 3" :key="n" class="h-20 rounded-2xl bg-[var(--bg)] animate-pulse"></div>
</div>

<!-- Vide -->
<div v-else-if="traitements.length === 0" class="p-12 text-center">
<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
<p class="text-sm text-[var(--text-muted)]">
Aucun traitement {{ filtreTraitement !== 'TOUS' ? `de type « ${filtreTraitement} »` : '' }}
</p>
</div>

<!-- Liste -->
<div v-else class="divide-y divide-[var(--border)]">
<div
v-for="t in traitements"
:key="t.id_traitement"
class="p-5 sm:p-6 hover:bg-[var(--hover)] transition"
>
<div class="flex items-start gap-4">
<!-- Icône -->
<div
:class="[
'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
t.decision === 'VALIDE'      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
t.decision === 'REJETE'      ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
t.decision === 'A_COMPLETER' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
]"
>
<svg v-if="t.decision === 'VALIDE'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
</svg>
<svg v-else-if="t.decision === 'REJETE'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
<svg v-else-if="t.decision === 'A_COMPLETER'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>
</div>

<div class="flex-1 min-w-0">
<div class="flex items-start justify-between gap-3 flex-wrap mb-2">
<span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', getDecisionColor(t.decision)]">
{{ getDecisionLabel(t.decision) }}
</span>
<span class="text-xs text-[var(--text-muted)]">
{{ formaterDateHeure(t.date_traitement) }}
</span>
</div>

<p
v-if="t.commentaire_agent"
class="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words"
>
{{ t.commentaire_agent }}
</p>
<p v-else class="text-sm italic text-[var(--text-muted)]">
Aucun commentaire.
</p>

<p class="mt-3 text-xs text-[var(--text-muted)] flex items-center gap-2">
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
<span class="font-medium text-[var(--text)]">{{ t.agent }}</span>
<template v-if="t.agent_matricule">
<span>·</span>
<span>{{ t.agent_matricule }}</span>
</template>
</p>
</div>
</div>
</div>
</div>
</motion.div>
				
				<!-- ===================== COMMENTAIRES ===================== -->
				<!-- ===================== COMMENTAIRES ===================== -->
				<motion.div
				v-else-if="activeTab === 'commentaires'"
				key="commentaires"
				data-animate-content
				:initial="{ opacity: 0, y: 12 }"
				:animate="{ opacity: 1, y: 0 }"
				:exit="{ opacity: 0, y: -12 }"
				:transition="{ duration: 0.25 }"
				class="max-w-3xl mx-auto bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)]"
				>
				<div class="p-5 sm:p-6 border-b border-[var(--border)] flex items-center justify-between">
				<div>
				<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
				<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
				Discussion
				</h2>
				<p class="text-xs text-[var(--text-muted)] mt-1">Notes internes entre agents et contribuable</p>
				</div>
				<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
				{{ commentaires.length }}
				</span>
				</div>
				
				<div class="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
				<!-- Loading -->
				<div v-if="isLoadingCommentaires" class="space-y-4">
				<div v-for="n in 2" :key="n" class="flex gap-3">
				<div class="w-10 h-10 rounded-full bg-[var(--bg)] animate-pulse"></div>
				<div class="flex-1 space-y-2">
				<div class="h-3 bg-[var(--bg)] rounded w-1/3 animate-pulse"></div>
				<div class="h-4 bg-[var(--bg)] rounded animate-pulse"></div>
				</div>
				</div>
				</div>
				
				<!-- Vide -->
				<div v-else-if="commentaires.length === 0" class="py-8 text-center">
				<svg class="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
				<p class="text-xs text-[var(--text-muted)]">Aucun commentaire pour le moment.</p>
				</div>
				
				<!-- Liste -->
				<div
				v-for="c in commentaires"
				:key="c.id_commentaire"
				class="flex gap-3"
				>
				<!-- Avatar -->
				<div
				:class="[
				'shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs',
c.auteur_type === 'AGENT'
? 'bg-[var(--primary)]/10 text-[var(--primary)]'
: 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
]"
>
{{ c.auteur?.charAt(0)?.toUpperCase() || '?' }}
</div>

<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 flex-wrap mb-1">
<span class="text-sm font-semibold text-[var(--text)]">{{ c.auteur }}</span>
<span
:class="[
'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
c.auteur_type === 'AGENT'
? 'bg-[var(--primary)]/10 text-[var(--primary)]'
: 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
]"
>
{{ c.auteur_type }}
</span>
<span v-if="c.interne" class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500">
Interne
</span>
</div>

<p class="text-sm text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
{{ c.contenu }}
</p>

<p class="text-[10px] text-[var(--text-muted)] mt-1">
{{ formaterDateHeure(c.date_creation) }}
<template v-if="c.date_modification">
· modifié le {{ formaterDateHeure(c.date_modification) }}
</template>
</p>
</div>

<!-- Bouton supprimer (agents uniquement) -->
<motion.button
v-if="c.auteur_type === 'AGENT'"
@click="supprimerCommentaire(c)"
:whileHover="{ scale: 1.1 }"
:whileTap="{ scale: 0.9 }"
class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition self-start"
title="Supprimer"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
</svg>
</motion.button>
</div>
</div>

<!-- Zone d'ajout -->
<div class="p-5 sm:p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 space-y-3">
<textarea
v-model="newComment"
@keydown.enter.exact.prevent="addComment"
rows="3"
:disabled="isSubmittingComment"
placeholder="Ajoutez un commentaire... (Ctrl+Entrée pour envoyer)"
class="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] resize-none transition disabled:opacity-50"
></textarea>

<div class="flex items-center justify-between gap-3 flex-wrap">
<label class="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
<input
type="checkbox"
v-model="newCommentInterne"
class="w-3.5 h-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/40"
>
<span>Note interne (non visible par le contribuable)</span>
</label>

<motion.button
@click="addComment"
:disabled="!newComment.trim() || isSubmittingComment"
:whileHover="(!newComment.trim() || isSubmittingComment) ? {} : { scale: 1.03 }"
:whileTap="(!newComment.trim() || isSubmittingComment) ? {} : { scale: 0.97 }"
class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-blue-500/20"
>
<svg v-if="isSubmittingComment" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
</svg>
{{ isSubmittingComment ? 'Envoi…' : 'Envoyer' }}
</motion.button>
</div>
</div>
</motion.div>
						
						<!-- ===================== AUDIT ===================== -->
						<!-- ===================== AUDIT ===================== -->
						<motion.div
						v-else-if="activeTab === 'audit'"
						key="audit"
						data-animate-content
						:initial="{ opacity: 0, y: 12 }"
						:animate="{ opacity: 1, y: 0 }"
						:exit="{ opacity: 0, y: -12 }"
						:transition="{ duration: 0.25 }"
						class="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
						>
						<div class="p-5 sm:p-6 border-b border-[var(--border)]">
						<h2 class="font-bold text-[var(--text)] flex items-center gap-2">
						<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
						</svg>
						Journal d'audit
						<span class="text-xs font-normal text-[var(--text-muted)]">
						({{ audit.length }} entrée{{ audit.length > 1 ? 's' : '' }})
						</span>
						</h2>
						<p class="text-xs text-[var(--text-muted)] mt-1">
						Traçabilité technique — réservé au chef de centre 
						</p>
						</div>
						
						<!-- Loading -->
						<div v-if="isLoadingAudit" class="p-6 space-y-2">
						<div v-for="n in 4" :key="n" class="h-12 rounded-lg bg-[var(--bg)] animate-pulse"></div>
						</div>
						
						<!-- Vide -->
						<div v-else-if="audit.length === 0" class="p-12 text-center">
						<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
						</svg>
						<p class="text-sm text-[var(--text-muted)]">Aucune entrée d'audit pour ce dossier.</p>
						</div>
						
						<!-- Tableau -->
						<div v-else class="overflow-x-auto">
						<table class="w-full text-sm">
						<thead class="bg-[var(--bg)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
						<tr>
						<th class="text-left px-5 py-3 font-semibold">Date</th>
						<th class="text-left px-5 py-3 font-semibold">Type</th>
						<th class="text-left px-5 py-3 font-semibold">Acteur</th>
						<th class="text-left px-5 py-3 font-semibold">Action</th>
						<th class="text-left px-5 py-3 font-semibold">Cible</th>
						<th class="text-left px-5 py-3 font-semibold">Détails</th>
						</tr>
						</thead>
						<tbody class="divide-y divide-[var(--border)]">
						<tr
						v-for="a in audit"
						:key="a.id_audit"
						class="hover:bg-[var(--hover)] transition"
						>
						<td class="px-5 py-3 text-[var(--text-muted)] whitespace-nowrap">
						{{ formaterDateHeure(a.date_action) }}
						</td>
						<td class="px-5 py-3">
						<span
						:class="[
						'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
a.type_acteur === 'AGENT'
? 'bg-[var(--primary)]/10 text-[var(--primary)]'
: 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
]"
>
{{ a.type_acteur }}
</span>
</td>
<td class="px-5 py-3 text-[var(--text)] font-medium">
{{ a.acteur_nom }}
</td>
<td class="px-5 py-3 text-[var(--text-muted)] font-mono text-xs">
{{ a.action }}
</td>
<td class="px-5 py-3 text-[var(--text-muted)] text-xs">
{{ a.table_cible }} #{{ a.id_cible }}
</td>
<td class="px-5 py-3 text-[var(--text-muted)] text-xs max-w-xs truncate" :title="a.details_json">
{{ a.details_json || '—' }}
</td>
</tr>
</tbody>
</table>
</div>
</motion.div>
						
						</AnimatePresence>
						</div>
						</main>
						</template>
						
						<!-- ============================================================
						MODALES
						============================================================ -->
						<DemandeComplement
						:showComplementModal="showComplementModal"
						:isSubmittingComplement="isSubmittingComplement"
						:suggestions="suggestionsComplement"
						:piecesNonConformes="piecesNonConformes" 
						v-model:complementCommentaire="complementCommentaire"
						@SaveComplement="confirmerComplement"
						@fermerModalComplement="fermerModalComplement"
						/>
						
						<VerificationPiece
						:showVerificationModal="showVerificationModal"
						:selectedPiece="selectedPiece"
						:previewUrl="piecePreviewUrl"
						:previewMime="piecePreviewMime"
						:isLoadingPreview="isLoadingPreview"
						:previewError="piecePreviewError"
						v-model:verificationStatut="verificationStatut"
						v-model:verificationCommentaire="verificationCommentaire"
						:isSubmittingVerification="isSubmittingVerification"
						@confirmerVerification="confirmerVerification"
						@fermerVerificationModal="fermerModalVerification"
						@ouvrirDansNouvelOnglet="ouvrirApercuDansNouvelOnglet"
						/>
						
						<RejetDossier
						:showRejetModal="showRejetModal"
						:isSubmittingRejet="isSubmittingRejet"
						:referenceDossier="dossier?.reference_dossier || ''"
						v-model:rejetMotif="rejetMotif"
						@confirmerRejet="confirmerRejet"
						@fermerRejetModal="fermerModalRejet"
						/>
						</div>
						</template>
