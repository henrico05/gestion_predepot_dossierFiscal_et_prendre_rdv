<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { gsap } from 'gsap'

/* ============================================================
 * PROPS / EMITS
 * ============================================================ */
/* ============================================================
 * PROPS / EMITS
 * ============================================================ */
const props = defineProps({
	showComplementModal:    { type: Boolean, default: false },
	complementCommentaire:  { type: String,  default: '' },
	isSubmittingComplement: { type: Boolean, default: false },
	
	/* Suggestions dynamiques calculées par le parent
	 *   Tableau d'objets : { label, value, type } */
	suggestions: {
		type: Array,
		default: () => []
	},
	piecesNonConformes: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits([
	'SaveComplement',
	'fermerModalComplement',
	'update:complementCommentaire'
])

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const MAX_LENGTH = 1000
const MIN_LENGTH = 10


/* ============================================================
 * ÉTAT DÉRIVÉ
 * ============================================================ */
const commentaireLength = computed(() => props.complementCommentaire.length)

const canSubmit = computed(() =>
!props.isSubmittingComplement &&
props.complementCommentaire.trim().length >= MIN_LENGTH
)

const isNearLimit = computed(() => commentaireLength.value > MAX_LENGTH * 0.9)

const hintMessage = computed(() => {
	const len = props.complementCommentaire.trim().length
	if (len === 0)         return 'Décrivez précisément les éléments à fournir.'
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
	() => props.showComplementModal,
	  async (visible) => {
		  if (visible) {
			  await nextTick()
			  animerEntree()
			  // Auto-focus sur le textarea
			  setTimeout(() => textareaRef.value?.focus(), 250)
		  }
	  }
)

/* ============================================================
 * ACTIONS
 * ============================================================ */
function fermerModal() {
	if (props.isSubmittingComplement) return
		emit('fermerModalComplement')
}

function updateCommentaire(value) {
	emit('update:complementCommentaire', value)
}

function onTextareaInput(e) {
	updateCommentaire(e.target.value)
}

/* ============================================================
 * ACTIONS
 * ============================================================ */
function ajouterSuggestion(suggestion) {
	// `suggestion` peut être string ou objet { label, value }
	const texte = typeof suggestion === 'string'
	? suggestion
	: (suggestion.value || suggestion.label || '')
	
	if (!texte) return
		
		const current = props.complementCommentaire.trim()
		const newValue = current
		? `${current}\n• ${texte}`
		: `• ${texte}`
		
		updateCommentaire(newValue)
		nextTick(() => textareaRef.value?.focus())
}

function confirmer() {
	if (!canSubmit.value) return
		emit('SaveComplement')
}

/* ============================================================
 * RACCOURCIS CLAVIER
 * ============================================================ */
function onKeydown(e) {
	// Échap = fermer
	if (e.key === 'Escape') {
		fermerModal()
		return
	}
	
	// Ctrl/Cmd + Entrée = valider
	if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
		e.preventDefault()
		confirmer()
	}
}

watch(() => props.showComplementModal, (v) => {
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
v-if="showComplementModal"
key="complement-modal"
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
<div class="flex items-start justify-between gap-4 border-b border-[var(--borderListCard)] px-5 sm:px-6 py-4 bg-[var(--bg)]">
<div class="flex items-start gap-3 min-w-0">
<div class="shrink-0 w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
<svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>
</div>
<div class="min-w-0">
<h2 class="text-base sm:text-lg font-semibold text-[var(--text)] truncate">
Demander un complément
</h2>
<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)] truncate">
Indiquez les éléments que le contribuable doit compléter ou corriger.
</p>
</div>
</div>

<motion.button
type="button"
:disabled="isSubmittingComplement"
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
		
		<!-- Section : Pièces non conformes (si fournies) -->
		<div
		v-if="piecesNonConformes.length"
		data-anim-section
		class="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-4"
		>
		<div class="flex items-start gap-2 mb-2">
		<svg class="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>
		<p class="text-xs font-semibold text-red-700 dark:text-red-300">
		Pièces non conformes détectées
		</p>
		</div>
		<ul class="space-y-1 ml-6">
		<li
		v-for="(p, i) in piecesNonConformes"
		:key="p.id_piece || i"
		class="text-xs text-red-700 dark:text-red-300 flex items-start gap-2"
		>
		<span class="text-red-400">•</span>
		<span>{{ p.type_piece_libelle || p.nom_fichier || 'Pièce' }}</span>
		</li>
		</ul>
		</div>
		
		<!-- Section : Suggestions rapides -->
		<!-- Section : Suggestions dynamiques (pièces manquantes / non conformes) -->
		<div v-if="suggestions.length" data-anim-section>
		<div class="flex items-center justify-between mb-2">
		<label class="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
		Motifs détectés
		<span class="ml-1 text-[10px] normal-case tracking-normal text-[var(--text-muted)]/70">
		({{ suggestions.length }})
		</span>
		</label>
		<button
		type="button"
		:disabled="isSubmittingComplement"
		@click="emit('update:complementCommentaire', suggestions.map(s => `• ${s.value}`).join('\n'))"
		class="text-[11px] text-[var(--primary)] hover:underline disabled:opacity-50"
		>
		Tout insérer
		</button>
		</div>
		
		<div class="flex flex-wrap gap-2">
		<motion.button
		v-for="(s, i) in suggestions"
		:key="i"
		type="button"
		:disabled="isSubmittingComplement"
		@click="ajouterSuggestion(s)"
		whileHover="{ scale: 1.03, y: -1 }"
			whileTap="{ scale: 0.97 }"
				:transition="{ type: 'spring', stiffness: 400, damping: 22 }"
				:class="[
				'group flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border transition disabled:opacity-50',
s.type === 'non_conforme'
? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 text-red-700 dark:text-red-300 hover:border-red-400'
: s.type === 'en_attente'
? 'border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 text-orange-700 dark:text-orange-300 hover:border-orange-400'
: 'border-[var(--borderListCard)] bg-[var(--bgListCard)] text-[var(--textListCard)] hover:border-[var(--primary)]/50'
]"
:title="s.label"
>
<!-- Icône selon le type -->
<svg v-if="s.type === 'non_conforme'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<svg v-else-if="s.type === 'en_attente'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<svg v-else class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
</svg>

<span class="truncate max-w-[280px]">{{ s.label }}</span>
</motion.button>
</div>
</div>

<!-- Message si aucune suggestion -->
<div
v-else
data-anim-section
class="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--borderListCard)] text-xs text-[var(--text-muted)]"
>
<svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span>Aucun motif pré-détecté. Rédigez votre demande ci-dessous.</span>
</div>
				
				<!-- Section : Textarea -->
				<div data-anim-section>
				<div class="flex items-center justify-between mb-2">
				<label for="complement-commentaire" class="block text-sm font-medium text-[var(--text)]">
				Éléments à compléter
				<span class="text-red-500">*</span>
				</label>
				<span
				:class="[
				'text-xs font-medium tabular-nums',
isNearLimit ? 'text-orange-500' : 'text-[var(--text-muted)]'
]"
>
{{ commentaireLength }}/{{ MAX_LENGTH }}
</span>
</div>

<textarea
id="complement-commentaire"
ref="textareaRef"
:value="complementCommentaire"
@input="onTextareaInput"
rows="6"
:maxlength="MAX_LENGTH"
:disabled="isSubmittingComplement"
placeholder="Exemple : Veuillez fournir l’attestation fiscale et remplacer la pièce d’identité illisible."
class="w-full resize-none rounded-xl border border-[var(--borderListCard)] bg-[var(--bgListCard)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/40 disabled:opacity-60"
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
<span class="text-green-600 dark:text-green-400">Prêt à envoyer.</span>
</template>
</div>
</div>

<!-- Note RG -->
<div data-anim-section class="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--borderListCard)] text-xs text-[var(--text-muted)]">
<svg class="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<span>
Le dossier passera au statut <strong>A_COMPLETER</strong> (RG9) et le contribuable
sera notifié si un canal est disponible (RG14).
</span>
</div>
</div>

<!-- ============================================================
FOOTER
============================================================ -->
<div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 border-t border-[var(--borderListCard)] bg-[var(--bgListCard)] px-5 sm:px-6 py-4">

<!-- Raccourci -->
<span class="hidden sm:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
<kbd class="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono">Ctrl</kbd>
<span>+</span>
<kbd class="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono">Entrée</kbd>
<span>pour envoyer</span>
</span>

<div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
<motion.button
type="button"
:disabled="isSubmittingComplement"
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
? 'bg-[var(--primary)] hover:bg-blue-600 shadow-sm shadow-blue-500/20'
: 'bg-[var(--border)] cursor-not-allowed opacity-60'
]"
>
<svg v-if="isSubmittingComplement" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
</svg>
{{ isSubmittingComplement ? 'Envoi…' : 'Demander le complément' }}
</motion.button>
</div>
</div>

</div>
</motion.div>
</AnimatePresence>
</template>
