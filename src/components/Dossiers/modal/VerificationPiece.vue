<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { gsap } from 'gsap'

/* ============================================================
 * PROPS / EMITS
 * ============================================================ */
const props = defineProps({
	showVerificationModal:    { type: Boolean, default: false },
	selectedPiece:            { type: Object,  default: null },
	
	previewUrl:               { type: String,  default: '' },
	previewMime:              { type: String,  default: '' },
	isLoadingPreview:         { type: Boolean, default: false },
	previewError:             { type: String,  default: '' },
	
	verificationStatut:       { type: String,  default: '' },
	verificationCommentaire:  { type: String,  default: '' },
	isSubmittingVerification: { type: Boolean, default: false }
})

const emit = defineEmits([
	'fermerVerificationModal',
	'confirmerVerification',
	'ouvrirDansNouvelOnglet',
	'update:verificationStatut',
	'update:verificationCommentaire'
])

/* ============================================================
 * TYPE D'APERÇU
 * ============================================================ */
const previewKind = computed(() => {
	const m = props.previewMime || props.selectedPiece?.type_mime || ''
	if (m.startsWith('image/')) return 'image'
		if (m === 'application/pdf') return 'pdf'
			if (m.startsWith('text/'))    return 'text'
				return 'unsupported'
})

/* Le PDF est rendu via <iframe> : le zoom CSS affecte l'iframe entière.
 P our PDF*, on applique un transform scale — l'utilisateur peut zoomer
 en "voyant plus grand" mais le contenu reste net côté navigateur. */
const supportsZoom = computed(() =>
['image', 'pdf', 'text'].includes(previewKind.value) && !!props.previewUrl
)

/* ============================================================
 * ÉTAT ZOOM / PAN / ROTATION
 * ============================================================ */
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const STEP     = 0.2

const zoom       = ref(1)
const rotation   = ref(0)
const panX       = ref(0)
const panY       = ref(0)
const isDragging = ref(false)

const dragStart = ref({ x: 0, y: 0, panX: 0, panY: 0 })
const viewportRef = ref(null)

/* Zoom affiché en % */
const zoomPercent = computed(() => Math.round(zoom.value * 100))
const isZoomed    = computed(() => zoom.value !== 1 || rotation.value !== 0 || panX.value || panY.value)

/* ============================================================
 * ACTIONS ZOOM
 * ============================================================ */
function zoomIn() {
	zoom.value = Math.min(MAX_ZOOM, +(zoom.value + STEP).toFixed(2))
}

function zoomOut() {
	zoom.value = Math.max(MIN_ZOOM, +(zoom.value - STEP).toFixed(2))
}

function resetView() {
	zoom.value = 1
	rotation.value = 0
	panX.value = 0
	panY.value = 0
}

function rotate() {
	rotation.value = (rotation.value + 90) % 360
}

/* Zoom centré sur un point (utile pour la molette) */
function zoomAtPoint(newZoom, clientX, clientY) {
	const viewport = viewportRef.value
	if (!viewport) { zoom.value = newZoom; return }
	
	const rect = viewport.getBoundingClientRect()
	const offsetX = clientX - rect.left - rect.width / 2
	const offsetY = clientY - rect.top - rect.height / 2
	
	const ratio = newZoom / zoom.value
	
	// Ajuste le pan pour garder le point sous le curseur
	panX.value = panX.value - offsetX * (ratio - 1)
	panY.value = panY.value - offsetY * (ratio - 1)
	zoom.value = newZoom
}

/* Molette (Ctrl/Cmd + wheel) */
function onWheel(e) {
	if (!supportsZoom.value) return
		if (!e.ctrlKey && !e.metaKey) return // ne pas bloquer le scroll normal
			
			e.preventDefault()
			
			const delta = e.deltaY > 0 ? -STEP : STEP
			const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoom.value + delta).toFixed(2)))
			zoomAtPoint(newZoom, e.clientX, e.clientY)
}

/* ============================================================
 * PAN (glisser-déposer)
 * ============================================================ */
function onMouseDown(e) {
	if (!supportsZoom.value || zoom.value <= 1) return
		if (e.button !== 0) return
			
			isDragging.value = true
			dragStart.value = {
				x: e.clientX,
				y: e.clientY,
				panX: panX.value,
				panY: panY.value
			}
			
			window.addEventListener('mousemove', onMouseMove)
			window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
	if (!isDragging.value) return
		panX.value = dragStart.value.panX + (e.clientX - dragStart.value.x)
		panY.value = dragStart.value.panY + (e.clientY - dragStart.value.y)
}

function onMouseUp() {
	isDragging.value = false
	window.removeEventListener('mousemove', onMouseMove)
	window.removeEventListener('mouseup', onMouseUp)
}

/* ============================================================
 * STYLE TRANSFORM CALCULÉ
 * ============================================================ */
const previewStyle = computed(() => ({
	transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value}) rotate(${rotation.value}deg)`,
									 transition: isDragging.value ? 'none' : 'transform 0.2s ease-out',
									 cursor: supportsZoom.value && zoom.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default'
}))

/* ============================================================
 * RESET AUTOMATIQUE QUAND LA PIÈCE CHANGE
 * ============================================================ */
watch(
	() => props.selectedPiece?.id_piece,
	  () => resetView()
)

/* Reset zoom quand la modal se ferme */
watch(
	() => props.showVerificationModal,
	  (visible) => {
		  if (!visible) resetView()
	  }
)

/* ============================================================
 * REFS DOM + ANIMATION GSAP
 * ============================================================ */
const cardRef = ref(null)

function animerEntree() {
	if (!cardRef.value) return
		
		gsap.fromTo(
			cardRef.value,
			{ opacity: 0, y: 20, scale: 0.97 },
			{
				opacity: 1, y: 0, scale: 1,
				duration: 0.4,
				ease: 'power3.out',
				clearProps: 'transform,opacity'
			}
		)
		
		const sections = cardRef.value.querySelectorAll('[data-anim-section]')
		if (sections.length) {
			gsap.fromTo(
				sections,
			   { opacity: 0, y: 12 },
			   {
				   opacity: 1, y: 0,
				   duration: 0.35,
				   stagger: 0.06,
				   delay: 0.1,
				   ease: 'power2.out',
				   clearProps: 'transform,opacity'
			   }
			)
		}
}

watch(
	() => props.showVerificationModal,
	  async (visible) => {
		  if (visible) {
			  await nextTick()
			  animerEntree()
		  }
	  }
)

/* ============================================================
 * ACTIONS
 * ============================================================ */
function fermerModal() {
	if (props.isSubmittingVerification) return
		emit('fermerVerificationModal')
}

function ouvrirDansNouvelOnglet() {
	if (!props.previewUrl) return
		window.open(props.previewUrl, '_blank')
}

function setStatut(value) {
	emit('update:verificationStatut', value)
	 props.showVerificationModal = false;
}

function updateCommentaire(e) {
	emit('update:verificationCommentaire', e.target.value)
}

function confirmerVerification() {
	emit('confirmerVerification')
	fermerModal()
}

/* ============================================================
 * RACCOURCIS CLAVIER
 * ============================================================ */
function onKeydown(e) {
	if (e.key === 'Escape') fermerModal()
		
		// Zoom clavier (+, -, 0)
		if (props.showVerificationModal && supportsZoom.value) {
			if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
			if (e.key === '-')                  { e.preventDefault(); zoomOut() }
			if (e.key === '0')                  { e.preventDefault(); resetView() }
			if (e.key.toLowerCase() === 'r')    { e.preventDefault(); rotate() }
		}
}

watch(() => props.showVerificationModal, (v) => {
	if (v) window.addEventListener('keydown', onKeydown)
		else    window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown)
	window.removeEventListener('mousemove', onMouseMove)
	window.removeEventListener('mouseup', onMouseUp)
	if (cardRef.value) gsap.killTweensOf(cardRef.value)
})
</script>

<template>
<AnimatePresence>
<motion.div
v-if="showVerificationModal"
key="verification-modal"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
:transition="{ duration: 0.2 }"
class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
@click.self="fermerModal"
>
<!-- Carte principale -->
<div
ref="cardRef"
class="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden"
>

<!-- HEADER -->
<div class="flex items-start justify-between gap-4 border-b border-[var(--borderListCard)] px-5 sm:px-6 py-4 bg-[var(--bg)]">
<div class="flex items-start gap-3 min-w-0">
<div class="shrink-0 w-10 h-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
<svg class="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<div class="min-w-0">
<h2 class="text-base sm:text-lg font-semibold text-[var(--text)] truncate">
Vérification de la pièce
</h2>
<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)] truncate">
Contrôlez la conformité de la pièce justificative.
</p>
</div>
</div>

<motion.button
type="button"
:disabled="isSubmittingVerification"
@click="fermerModal"
whileHover="{ scale: 1.08, rotate: 90 }"
	whileTap="{ scale: 0.92 }"
		:transition="{ type: 'spring', stiffness: 400, damping: 20 }"
		class="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-50 transition"
		title="Fermer (Échap)"
		>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
		</svg>
		</motion.button>
		</div>
		
		<!-- CORPS — 2 COLONNES -->
		<div class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
		
		<!-- ============ COLONNE GAUCHE : APERÇU ============ -->
		<div
		data-anim-section
		class="flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--borderListCard)] bg-[var(--bgListCard)] min-h-[280px] lg:min-h-0"
		>
		<!-- Barre d'info + toolbar zoom -->
		<div class="flex items-center justify-between gap-2 px-5 py-2 border-b border-[var(--borderListCard)]">
		<div class="min-w-0">
		<p class="text-xs uppercase tracking-wide font-semibold text-[var(--textListCard)]">
		Aperçu du document
		</p>
		<p class="text-xs text-[var(--text-muted)] mt-0.5 truncate">
		{{ selectedPiece?.nom_fichier || 'Pièce justificative' }}
		</p>
		</div>
		</div>
		
		<!-- ⭐ TOOLBAR ZOOM (sous la barre d'info) -->
		<div
		v-if="supportsZoom"
		class="flex items-center gap-1 px-3 py-2 bg-[var(--card)]/60 border-b border-[var(--borderListCard)] backdrop-blur-sm"
		>
		<!-- Zoom arrière -->
		<motion.button
		type="button"
		@click="zoomOut"
		:disabled="zoom <= MIN_ZOOM"
		whileHover="{ scale: 1.08 }"
			whileTap="{ scale: 0.92 }"
				class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
				title="Zoom arrière (−)"
				>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
				</svg>
				</motion.button>
				
				<!-- Pourcentage (cliquable pour reset) -->
				<button
				type="button"
				@click="resetView"
				class="min-w-[52px] px-2 py-1 text-xs font-semibold rounded-lg text-[var(--text)] hover:bg-[var(--hover)] transition"
				:title="isZoomed ? 'Réinitialiser la vue (0)' : 'Zoom actuel'"
				>
				{{ zoomPercent }}%
				</button>
				
				<!-- Zoom avant -->
				<motion.button
				type="button"
				@click="zoomIn"
				:disabled="zoom >= MAX_ZOOM"
				whileHover="{ scale: 1.08 }"
					whileTap="{ scale: 0.92 }"
						class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
						title="Zoom avant (+)"
						>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
						</motion.button>
						
						<!-- Séparateur -->
						<div class="w-px h-5 bg-[var(--border)] mx-1"></div>
						
						<!-- Rotation -->
						<motion.button
						type="button"
						@click="rotate"
						whileHover="{ scale: 1.08, rotate: 90 }"
							whileTap="{ scale: 0.92 }"
								:transition="{ type: 'spring', stiffness: 400, damping: 20 }"
								class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
								title="Rotation 90° (R)"
								>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
								</svg>
								</motion.button>
								
								<!-- Reset -->
								<motion.button
								type="button"
								@click="resetView"
								:disabled="!isZoomed"
								whileHover="{ scale: 1.08 }"
									whileTap="{ scale: 0.92 }"
										class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
										title="Réinitialiser (0)"
										>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
										d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5"/>
										</svg>
										</motion.button>
										
										<!-- Spacer -->
										<div class="flex-1"></div>
										
										<!-- Indicateur drag actif -->
										<span
										v-if="isZoomed"
										class="hidden sm:inline text-[10px] text-[var(--text-muted)] px-2"
										>
										Glissez pour déplacer
										</span>
										
										<!-- Ouvrir dans un nouvel onglet -->
										<motion.button
										v-if="previewUrl"
										type="button"
										@click="ouvrirDansNouvelOnglet"
										whileHover="{ scale: 1.08 }"
											whileTap="{ scale: 0.92 }"
												class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
												title="Ouvrir dans un nouvel onglet"
												>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
												</svg>
												</motion.button>
												</div>
												
												<!-- Zone d'aperçu avec zoom/pan -->
												<div
												ref="viewportRef"
												class="flex-1 relative flex items-center justify-center overflow-hidden select-none"
												@wheel="onWheel"
												@mousedown="onMouseDown"
												>
												
												<!-- Loading -->
												<div v-if="isLoadingPreview" class="flex flex-col items-center gap-3">
												<div class="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin"></div>
												<span class="text-xs text-[var(--text-muted)]">Chargement de l’aperçu…</span>
												</div>
												
												<!-- Erreur -->
												<div v-else-if="previewError" class="p-6 text-center">
												<svg class="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
												</svg>
												<p class="text-sm text-red-600 dark:text-red-300">{{ previewError }}</p>
												</div>
												
												<!-- Contenu zoomable -->
												<div
												v-else-if="previewUrl"
												class="w-full h-full flex items-center justify-center will-change-transform"
												:style="previewStyle"
												>
												<!-- PDF -->
												<iframe
												v-if="previewKind === 'pdf'"
												:src="previewUrl"
												class="w-full h-full min-h-[400px] lg:min-h-full border-0 bg-white"
												title="Aperçu PDF"
												></iframe>
												
												<!-- Image -->
												<img
												v-else-if="previewKind === 'image'"
												:src="previewUrl"
												class="max-w-full max-h-full object-contain pointer-events-none"
												alt="Aperçu de la pièce"
												draggable="false"
												/>
												
												<!-- Texte -->
												<iframe
												v-else-if="previewKind === 'text'"
												:src="previewUrl"
												class="w-full h-full min-h-[400px] lg:min-h-full bg-white border-0"
												title="Aperçu texte"
												></iframe>
												
												<!-- Non supporté -->
												<div v-else class="p-6 text-center">
												<svg class="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
												d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
												</svg>
												<p class="text-sm text-[var(--text-muted)] mb-3">
												Aperçu non disponible pour ce type de fichier.
												</p>
												<button
												@click="ouvrirDansNouvelOnglet"
												class="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition"
												>
												Ouvrir dans un onglet
												</button>
												</div>
												</div>
												
												<!-- Aucun fichier -->
												<div v-else class="p-6 text-center">
												<p class="text-sm text-[var(--text-muted)]">Aucun fichier à prévisualiser.</p>
												</div>
												
												<!-- Badge zoom flottant (visible quand zoom != 100%) -->
												<AnimatePresence>
												<motion.div
												v-if="isZoomed && supportsZoom"
												:initial="{ opacity: 0, y: 10 }"
												:animate="{ opacity: 1, y: 0 }"
												:exit="{ opacity: 0, y: 10 }"
												class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-xs font-medium flex items-center gap-2 shadow-lg"
												>
												<span>{{ zoomPercent }}%</span>
												<span v-if="rotation" class="opacity-60">•</span>
												<span v-if="rotation" class="opacity-80">{{ rotation }}°</span>
												</motion.div>
												</AnimatePresence>
												</div>
												
												<!-- Pied d'aperçu : méta + hint raccourcis -->
												<div class="px-5 py-3 border-t border-[var(--borderListCard)] text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
												<span v-if="selectedPiece?.type_mime">
												<strong class="text-[var(--text)]">Type :</strong> {{ selectedPiece.type_mime }}
												</span>
												<span v-if="selectedPiece?.taille_octets">
												<strong class="text-[var(--text)]">Taille :</strong>
												{{ (selectedPiece.taille_octets / 1024).toFixed(1) }} Ko
												</span>
												<span v-if="selectedPiece?.statut_verification">
												<strong class="text-[var(--text)]">Statut :</strong>
												{{ selectedPiece.statut_verification.replace('_', ' ') }}
												</span>
												<span v-if="supportsZoom" class="ml-auto hidden md:inline text-[10px] opacity-70">
												<kbd class="px-1 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">+</kbd>
												<kbd class="px-1 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">−</kbd>
												<kbd class="px-1 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">0</kbd>
												<kbd class="px-1 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">R</kbd>
												<span class="ml-1">Ctrl + molette</span>
												</span>
												</div>
												</div>
												
												<!-- ============ COLONNE DROITE : FORMULAIRE ============ -->
												<div class="flex-1 overflow-y-auto">
												<div class="p-5 sm:p-6 space-y-6">
												
												<!-- Décision -->
												<div data-anim-section>
												<label class="mb-3 block text-sm font-medium text-[var(--text)]">
												Résultat de la vérification
												</label>
												
												<div class="grid grid-cols-2 gap-3">
												<motion.button
												type="button"
												:disabled="isSubmittingVerification"
												@click="setStatut('CONFORME')"
												:whileHover="{ scale: verificationStatut === 'CONFORME' ? 1 : 1.02 }"
												:whileTap="{ scale: 0.98 }"
												:class="[
												'rounded-xl border-2 px-4 py-4 text-sm font-medium transition flex flex-col items-center gap-2',
verificationStatut === 'CONFORME'
? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 shadow-sm shadow-green-500/20'
: 'border-[var(--borderListCard)] text-[var(--text-muted)] hover:border-green-400 hover:bg-green-50/40 dark:hover:bg-green-500/5'
]"
>
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Conforme
</motion.button>

<motion.button
type="button"
:disabled="isSubmittingVerification"
@click="setStatut('NON_CONFORME')"
:whileHover="{ scale: verificationStatut === 'NON_CONFORME' ? 1 : 1.02 }"
:whileTap="{ scale: 0.98 }"
:class="[
'rounded-xl border-2 px-4 py-4 text-sm font-medium transition flex flex-col items-center gap-2',
verificationStatut === 'NON_CONFORME'
? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 shadow-sm shadow-red-500/20'
: 'border-[var(--borderListCard)] text-[var(--text-muted)] hover:border-red-400 hover:bg-red-50/40 dark:hover:bg-red-500/5'
]"
>
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Non conforme
</motion.button>
</div>

<AnimatePresence>
<motion.div
v-if="verificationStatut === 'NON_CONFORME'"
:initial="{ opacity: 0, height: 0, marginTop: 0 }"
:animate="{ opacity: 1, height: 'auto', marginTop: 12 }"
:exit="{ opacity: 0, height: 0, marginTop: 0 }"
class="overflow-hidden"
>
<div class="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300">
<svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span>Un commentaire est obligatoire pour justifier le refus.</span>
</div>
</motion.div>
</AnimatePresence>
</div>

<!-- Commentaire -->
<div data-anim-section>
<label for="verification-commentaire" class="mb-2 block text-sm font-medium text-[var(--text)]">
Commentaire
<span v-if="verificationStatut === 'NON_CONFORME'" class="text-red-500">*</span>
<span v-else class="text-[var(--text-muted)] text-xs font-normal ml-1">(optionnel)</span>
</label>

<textarea
id="verification-commentaire"
:value="verificationCommentaire"
@input="updateCommentaire"
rows="5"
maxlength="1000"
:disabled="isSubmittingVerification"
placeholder="Exemple : document illisible, pièce expirée, informations incorrectes…"
class="w-full resize-none rounded-xl border border-[var(--borderListCard)] bg-[var(--bgListCard)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/40"
></textarea>

<div class="mt-1 flex justify-between items-center text-xs text-[var(--text-muted)]">
<span>Astuce : soyez précis pour faciliter la correction.</span>
<span :class="verificationCommentaire.length > 900 ? 'text-orange-500' : ''">
{{ verificationCommentaire.length }}/1000
</span>
</div>
</div>

<!-- Note RG -->
<div data-anim-section class="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--borderListCard)] text-xs text-[var(--text-muted)]">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span>
Cette décision sera enregistrée dans <strong>JOURNAL_AUDIT</strong>
et notifiera le contribuable si un canal est disponible.
</span>
</div>
</div>
</div>
</div>

<!-- FOOTER -->
<div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-[var(--borderListCard)] bg-[var(--bgListCard)] px-5 sm:px-6 py-4">

<motion.button
type="button"
:disabled="isSubmittingVerification"
@click="fermerModal"
whileHover="{ scale: 1.02 }"
	whileTap="{ scale: 0.98 }"
		class="w-full sm:w-auto rounded-xl border border-[var(--borderListCard)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-50 transition"
		>
		Annuler
		</motion.button>
		
		<motion.button
		type="button"
		:disabled="
		isSubmittingVerification ||
		!verificationStatut ||
		(verificationStatut === 'NON_CONFORME' && !verificationCommentaire.trim())
		"
		@click="confirmerVerification"
		:whileHover="{ scale: (isSubmittingVerification || !verificationStatut) ? 1 : 1.03 }"
		:whileTap="{ scale: 0.97 }"
		class="w-full sm:w-auto rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
		>
		<svg v-if="isSubmittingVerification" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
		<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
		</svg>
		<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
		</svg>
		{{ isSubmittingVerification ? 'Vérification…' : 'Confirmer la vérification' }}
		</motion.button>
		</div>
		</div>
		</motion.div>
		</AnimatePresence>
		</template>
