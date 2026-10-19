<script setup>
import { ref, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'

const props = defineProps({
	open: { type: Boolean, default: false },
	agent: { type: Object, default: null },
	loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const comment = ref('')
const touched = ref(false)

watch(() => props.open, (value) => {
	if (value) {
		comment.value = ''
		touched.value = false
	}
})

const submit = () => {
	touched.value = true
	if (!comment.value.trim()) return
		
		emit('confirm', { agent: props.agent, comment: comment.value.trim() })
}
</script>

<template>
<AnimatePresence>
<Motion
v-if="open && agent"
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
<div class="p-6 border-b border-[var(--border)]">
<div class="flex items-center gap-3 mb-1">
<div class="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
</div>
<h2 class="text-lg font-bold text-[var(--text)]">Refuser cette demande</h2>
</div>
<p class="text-sm text-[var(--text-muted)] ml-13 pl-0">
Vous êtes sur le point de refuser l'inscription de <strong>{{ agent.nom }} {{ agent.prenom }}</strong>.
</p>
</div>

<div class="p-6">
<label class="text-sm font-semibold text-[var(--text)] block mb-2">Motif du refus <span class="text-red-500">*</span></label>
<textarea
v-model="comment"
rows="4"
placeholder="Expliquez pourquoi cette demande est refusée (ex: matricule introuvable, e-mail non institutionnel...)"
class="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition resize-none bg-[var(--card)] text-[var(--text)]"
:class="touched && !comment.trim() ? 'border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15'"
></textarea>
<p v-if="touched && !comment.trim()" class="text-xs text-red-500 mt-1.5">Le motif est obligatoire — il sera visible par l'agent.</p>
</div>

<div class="flex justify-end gap-3 p-6 border-t border-[var(--border)] bg-[var(--hover)]">
<button
@click="emit('close')"
class="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--card)] transition cursor-pointer"
>
Annuler
</button>
<button
@click="submit"
:disabled="loading"
class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
>
<span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
Confirmer le refus
</button>
</div>
</Motion>
</Motion>
</AnimatePresence>
</template>
