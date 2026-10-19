<script setup>
import { Motion, AnimatePresence } from 'motion-v'

defineProps({
	open: { type: Boolean, default: false },
	agent: { type: Object, default: null },
	loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'approve', 'reject'])

const roleLabel = (role) => {
	const labels = {
		AGENT_ACCUEIL: 'Agent d\'accueil',
		AGENT_VERIFICATEUR: 'Agent vérificateur',
		CHEF_CENTRE: 'Chef de service',
	}
	return labels[role] || role
}

const formatDate = (dateStr) => {
	if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
class="bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
>
<!-- Header -->
<div class="p-6 border-b border-[var(--border)] flex justify-between items-start">
<div class="flex items-center gap-4">
<img
v-if="agent.photo_base64"
:src="`data:${agent.photo_content_type};base64,${agent.photo_base64}`"
class="w-14 h-14 rounded-full object-cover"
>
<div v-else class="w-14 h-14 rounded-full bg-[var(--hover)] text-[var(--text-muted)] flex items-center justify-center font-bold">
{{ agent.nom?.[0] }}{{ agent.prenom?.[0] }}
</div>
<div>
<h2 class="text-lg font-bold text-[var(--text)]">{{ agent.nom }} {{ agent.prenom }}</h2>
<p class="text-sm text-[var(--text-muted)]">{{ roleLabel(agent.role) }}</p>
</div>
</div>
<button @click="emit('close')" class="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
</button>
</div>

<!-- Détails -->
<div class="p-6 space-y-4">
<div class="grid grid-cols-2 gap-4 text-sm">
<div>
<p class="text-[var(--text-muted)] text-xs mb-1">Matricule</p>
<p class="font-semibold text-[var(--text)]">{{ agent.matricule }}</p>
</div>
<div>
<p class="text-[var(--text-muted)] text-xs mb-1">Email</p>
<p class="font-semibold text-[var(--text)] truncate">{{ agent.email }}</p>
</div>
<div>
<p class="text-[var(--text-muted)] text-xs mb-1">Guichet demandé</p>
<p class="font-semibold text-[var(--text)]">{{ agent.id_guichet ? `Guichet ${agent.id_guichet}` : 'Non assigné' }}</p>
</div>
<div>
<p class="text-[var(--text-muted)] text-xs mb-1">Inscription</p>
<p class="font-semibold text-[var(--text)]">{{ formatDate(agent.created_at) }}</p>
</div>
</div>

<!-- Statut de vérification email -->
<div
:class="[
'flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg',
agent.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
]"
>
<svg v-if="agent.email_verified" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
{{ agent.email_verified ? 'Adresse e-mail vérifiée' : 'Adresse e-mail non encore vérifiée' }}
</div>

<div class="bg-[var(--hover)] border border-[var(--border)] rounded-lg p-4">
<p class="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase">Points à vérifier avant approbation</p>
<ul class="space-y-1.5 text-sm text-[var(--text)]">
<li class="flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span> Le matricule correspond au registre du personnel</li>
<li class="flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span> Le rôle demandé est cohérent avec la fonction</li>
<li class="flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span> L'adresse e-mail appartient bien au Centre Fiscal</li>
</ul>
</div>
</div>

<!-- Actions -->
<div class="flex justify-end gap-3 p-6 border-t border-[var(--border)] bg-[var(--hover)]">
<button
@click="emit('reject', agent)"
:disabled="loading"
class="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer disabled:opacity-60"
>
Refuser
</button>
<button
@click="emit('approve', agent)"
:disabled="loading"
class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
>
<span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
Approuver cet agent
</button>
</div>
</Motion>
</Motion>
</AnimatePresence>
</template>
