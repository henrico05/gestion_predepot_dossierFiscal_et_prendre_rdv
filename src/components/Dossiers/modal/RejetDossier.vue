<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { gsap } from 'gsap'

/* ============================================================
 * PROPS / EMITS
 * ============================================================ */
const props = defineProps({
	showRejetModal:      { type: Boolean, default: false },
	rejetMotif:          { type: String,  default: '' },
	isSubmittingRejet:   { type: Boolean, default: false },
	referenceDossier:    { type: String,  default: '' }
})

const emit = defineEmits([
	'fermerRejetModal',
	'confirmerRejet',
	'update:rejetMotif'
])

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const MAX_LENGTH = 1000
const MIN_LENGTH = 15

/* Motifs prédéfinis (cliquables pour pré-remplir) */
const motifsRapides = [
	{ label: 'Pièces falsifiées ou non authentiques', value: 'Les pièces fournies semblent falsifiées ou non authentiques.' },
{ label: 'Contribuable non éligible au service', value: 'Le contribuable n’est pas éligible à ce service fiscal.' },
{ label: 'Dossier hors délai légal', value: 'Le dossier a été déposé hors des délais légaux autorisés.' },
{ label: 'Demande manifestement infondée', value: 'La demande est manifestement infondée ou abusive.' },
{ label: 'Refus du contribuable de coopérer', value: 'Le contribuable a refusé de fournir les éléments demandés malgré les relances.' }
]

/* ============================================================
 * ÉTAT DÉRIVÉ
 * ============================================================ */
const motifLength = computed(() => props.rejetMotif.length)

const canSubmit = computed(() =>
!props.isSubmittingRejet &&
props.rejetMotif.trim().length >= MIN_LENGTH
)

const isNearLimit = computed(() => motifLength.value > MAX_LENGTH * 0.9)

const hintMessage = computed(() => {
	const len = props.rejetMotif.trim().length
	if (len === 0)         return 'Expliquez clairement le motif du rejet.'
		if (len < MIN_LENGTH)  return `Encore ${MIN_LENGTH - len} caractère(s) minimum.`
			return ''
})

/* ============================================================
 * REFS DOM + ANIMATION
 * ============================================================ */
const cardRef = ref(null)
const textareaRef = ref(null)

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
	() => props.showRejetModal,
	  async (visible) => {
		  if (visible) {
			  await nextTick()
			  animerEntree()
			  setTimeout(() => textareaRef.value?.focus(), 250)
		  }
	  }
)

/* ============================================================
 * ACTIONS
 * ============================================================ */
function fermerModal() {
	if (props.isSubmittingRejet) return
		emit('fermerRejetModal')
}

function updateMotif(value) {
	emit('update:rejetMotif', value)
}

function onTextareaInput(e) {
	updateMotif(e.target.value)
}

function ajouterMotif(motif) {
	const texte = motif.value || motif.label || ''
	if (!texte) return
		
		const current = props.rejetMotif.trim()
		const newValue = current ? `${current}\n• ${texte}` : `• ${texte}`
		
		updateMotif(newValue)
		nextTick(() => textareaRef.value?.focus())
}

function confirmer() {
	if (!canSubmit.value) return
		emit('confirmerRejet')
}

/* ============================================================
 * RACCOURCIS CLAVIER
 * ============================================================ */
function onKeydown(e) {
	if (e.key === 'Escape') {
		fermerModal()
		return
	}
	
	if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
		e.preventDefault()
		confirmer()
	}
}

watch(() => props.showRejetModal, (v) => {
	if (v) window.addEventListener('keydown', onKeydown)
		else    window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown)
	if (cardRef.value) gsap.killTweensOf(cardRef.value)
})
</script>

<template>
<AnimatePresence>
<motion.div
v-if="showRejetModal"
key="rejet-modal"
:initial="{ opacity: 0 }"
:animate="{ opacity: 1 }"
:exit="{ opacity: 0 }"
:transition="{ duration: 0.2 }"
class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
@click.self="fermerModal"
>
<div
ref="cardRef"
class="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden"
>

<!-- ============================================================
HEADER
============================================================ -->
<div class="flex items-start justify-between gap-4 border-b border-red-200/50 dark:border-red-500/20 px-5 sm:px-6 py-4 bg-red-50/50 dark:bg-red-500/5">
<div class="flex items-start gap-3 min-w-0">
<div class="shrink-0 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
<svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
</div>
<div class="min-w-0">
<h2 class="text-base sm:text-lg font-semibold text-[var(--text)] truncate">
Rejeter le dossier
</h2>
<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)] truncate">
<template v-if="referenceDossier">
<span class="font-medium text-[var(--text)]">{{ referenceDossier }}</span>
<span class="mx-1.5">•</span>
</template>
Indiquez le motif du rejet (RG13).
</p>
</div>
</div>

<motion.button
type="button"
:disabled="isSubmittingRejet"
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
		
		<!-- ============================================================
		CORPS
		============================================================ -->
		<div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
		
		<!-- Alerte : action irréversible -->
		<div
		data-anim-section
		class="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300"
		>
		<svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
		d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
		</svg>
		<span>
		<strong>Action sensible :</strong> le rejet est définitif pour ce dossier.
		Le contribuable sera notifié si un canal est disponible (RG14).
		</span>
		</div>
		
		<!-- Section : Motifs rapides -->
		<div data-anim-section>
		<label class="mb-2 block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
		Motifs fréquents
		</label>
		<div class="flex flex-wrap gap-2">
		<motion.button
		v-for="(m, i) in motifsRapides"
		:key="i"
		type="button"
		:disabled="isSubmittingRejet"
		@click="ajouterMotif(m)"
		whileHover="{ scale: 1.03, y: -1 }"
			whileTap="{ scale: 0.97 }"
				:transition="{ type: 'spring', stiffness: 400, damping: 22 }"
				class="px-3 py-1.5 text-xs rounded-full border border-[var(--borderListCard)] bg-[var(--bgListCard)] text-[var(--textListCard)] hover:border-red-400/60 hover:bg-red-50 dark:hover:bg-red-500/5 transition disabled:opacity-50"
				:title="m.value"
				>
				{{ m.label }}
				</motion.button>
				</div>
				</div>
				
				<!-- Section : Textarea -->
				<div data-anim-section>
				<div class="flex items-center justify-between mb-2">
				<label for="rejet-motif" class="block text-sm font-medium text-[var(--text)]">
				Motif du rejet
				<span class="text-red-500">*</span>
				</label>
				<span
				:class="[
				'text-xs font-medium tabular-nums',
isNearLimit ? 'text-orange-500' : 'text-[var(--text-muted)]'
]"
>
{{ motifLength }}/{{ MAX_LENGTH }}
</span>
</div>

<textarea
id="rejet-motif"
ref="textareaRef"
:value="rejetMotif"
@input="onTextareaInput"
rows="6"
:maxlength="MAX_LENGTH"
:disabled="isSubmittingRejet"
placeholder="Exemple : Les pièces fournies semblent falsifiées et le contribuable n’a pas répondu aux relances…"
class="w-full resize-none rounded-xl border border-[var(--borderListCard)] bg-[var(--bgListCard)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/30 disabled:opacity-60"
></textarea>

<!-- Hint dynamique -->
<div class="mt-2 flex items-start gap-2 text-xs">
<template v-if="hintMessage">
<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span class="text-[var(--text-muted)]">{{ hintMessage }}</span>
</template>
<template v-else>
<svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
<span class="text-green-600 dark:text-green-400">Motif valide.</span>
</template>
</div>
</div>

<!-- Note RG -->
<div data-anim-section class="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--borderListCard)] text-xs text-[var(--text-muted)]">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span>
Cette décision sera enregistrée dans <strong>JOURNAL_AUDIT</strong> (RG13)
avec le motif ci-dessus.
</span>
</div>
</div>

<!-- ============================================================
FOOTER
============================================================ -->
<div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 border-t border-[var(--borderListCard)] bg-[var(--bgListCard)] px-5 sm:px-6 py-4">

<span class="hidden sm:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
<kbd class="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono">Ctrl</kbd>
<span>+</span>
<kbd class="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono">Entrée</kbd>
<span>pour rejeter</span>
</span>

<div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
<motion.button
type="button"
:disabled="isSubmittingRejet"
@click="fermerModal"
whileHover="{ scale: 1.02 }"
	whileTap="{ scale: 0.98 }"
		class="w-full sm:w-auto rounded-xl border border-[var(--borderListCard)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-50 transition"
		>
		Annuler
		</motion.button>
		
		<motion.button
		type="button"
		:disabled="!canSubmit"
		@click="confirmer"
		:whileHover="canSubmit ? { scale: 1.03 } : {}"
		:whileTap="canSubmit ? { scale: 0.97 } : {}"
		:class="[
		'w-full sm:w-auto rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center gap-2',
canSubmit
? 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-500/20'
: 'bg-[var(--border)] cursor-not-allowed opacity-60'
]"
>
<svg v-if="isSubmittingRejet" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M6 18L18 6M6 6l12 12"/>
</svg>
{{ isSubmittingRejet ? 'Rejet en cours…' : 'Confirmer le rejet' }}
</motion.button>
</div>
</div>

</div>
</motion.div>
</AnimatePresence>
</template>
