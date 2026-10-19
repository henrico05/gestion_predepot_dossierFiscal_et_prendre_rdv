<template>
<Teleport to="body">
<Transition name="modal-fade">
<div
v-if="isOpen"
class="fixed inset-0 z-50 flex items-center justify-center p-4"
role="dialog"
aria-modal="true"
aria-labelledby="delete-modal-title"
>
<!-- Backdrop -->
<div
class="absolute inset-0 bg-black/50 backdrop-blur-sm"
@click="emit('close')"
></div>

<!-- Modal -->
<Transition name="modal-scale" appear>
<div
v-if="isOpen"
class="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--card)]"
>
<!-- Top accent bar -->
<div class="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400"></div>

<div class="p-7 text-center">
<!-- Icon -->
<div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 ring-8 ring-red-50/60 dark:ring-red-500/5">
<svg
class="h-8 w-8 text-red-500 dark:text-red-400"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
stroke-width="1.8"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
/>
</svg>
</div>

<!-- Title -->
<h3
id="delete-modal-title"
class="mb-2 text-xl font-bold tracking-tight text-[var(--text)]"
>
Confirmer la suppression
</h3>

<!-- Message -->
<p class="mb-7 text-sm leading-relaxed text-[var(--text-muted)]">
{{ confirmationMessage }}
</p>

<!-- Actions -->
<div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-center">
<!-- Cancel -->
<button
type="button"
class="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:bg-[var(--hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
@click="emit('close')"
>
<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>
Annuler
</button>

<!-- Delete -->
<button
type="button"
class="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-700 hover:shadow-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/40 active:scale-[0.98]"
@click="emit('delete')"
>
<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
/>
</svg>
Oui, supprimer
</button>
</div>
</div>
</div>
</Transition>
</div>
</Transition>
</Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  deleteText: {
    type: String,
    default: 'Voulez-vous vraiment supprimer cet élément'
  },
  optionalText: {
    type: String,
    default: ''
  },
  itemName: {
    type: String,
    default: ''
  },
  datas: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'delete'])

const confirmationMessage = computed(() => {
  const base = props.deleteText || 'Voulez-vous vraiment supprimer cet élément'
  const name = props.itemName ? ` « ${props.itemName} »` : ''
  const extra = props.optionalText ? ` ${props.optionalText}` : ''
  
  return `${base}${name}${extra} ? Cette action est irréversible.`
})
</script>

<style scoped>
/* ========== Backdrop fade ========== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* ========== Modal scale + fade ========== */
.modal-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-scale-leave-active {
  transition: all 0.2s ease-in;
}
.modal-scale-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(12px);
}
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
</style>
