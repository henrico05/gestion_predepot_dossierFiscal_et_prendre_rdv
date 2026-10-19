<template>
<div class="chef-page">

<!-- ==================== EN-TÊTE : PROFIL DU CHEF ==================== -->
<Motion
:initial="{ opacity: 0, y: -16 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, ease: 'easeOut' }"
class="header-bar"
>
<div class="flex items-center gap-4">
<div class="relative">
<img
v-if="chief.photo_base64"
:src="`data:${chief.photo_content_type};base64,${chief.photo_base64}`"
class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
>
<div v-else class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg border-2 border-white shadow-md">
{{ initials }}
</div>
<span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
</div>
<div>
<h1 class="text-lg font-bold text-slate-800">{{ chief.nom }} {{ chief.prenom }}</h1>
<p class="text-xs text-slate-500">Chef de Centre — Matricule {{ chief.matricule }}</p>
</div>
</div>

<button
@click="openEditProfile"
class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
</svg>
Modifier mon profil
</button>
</Motion>

<div class="content-wrapper">

<!-- ==================== STATISTIQUES ==================== -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
<Motion
v-for="(stat, i) in stats"
:key="stat.label"
:initial="{ opacity: 0, y: 20 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.4, delay: 0.08 * i, ease: 'easeOut' }"
class="stat-card"
>
<div :class="['w-10 h-10 rounded-lg flex items-center justify-center', stat.iconBg]">
<component :is="stat.icon" :class="['w-5 h-5', stat.iconColor]" />
</div>
<div>
<p class="text-2xl font-bold text-slate-800">{{ stat.value }}</p>
<p class="text-xs text-slate-500">{{ stat.label }}</p>
</div>
</Motion>
</div>

<!-- ==================== DEMANDES EN ATTENTE ==================== -->
<Motion
:initial="{ opacity: 0, y: 24 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.15, ease: 'easeOut' }"
class="section-card mb-8"
>
<div class="flex items-center justify-between mb-5">
<div class="flex items-center gap-2">
<h2 class="font-bold text-slate-800">Demandes en attente de validation</h2>
<span v-if="pendingAccounts.length" class="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
{{ pendingAccounts.length }}
</span>
</div>
</div>

<div v-if="isLoadingPendingAll" class="space-y-3">
<div v-for="n in 2" :key="n" class="h-20 rounded-lg bg-slate-100 animate-pulse"></div>
</div>

<div v-else-if="pendingAccounts.length === 0" class="py-10 text-center text-sm text-slate-400">
Aucune demande en attente pour le moment.
</div>

<div v-else ref="pendingListRef" class="space-y-3">
<div
v-for="account in pendingAccounts"
:key="`${account.type}-${account.id}`"
:data-account-id="`${account.type}-${account.id}`"
class="pending-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border"
>
<div class="flex items-center gap-3 min-w-0">
<div class="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
{{ accountInitials(account) }}
</div>
<div class="min-w-0">
<p class="font-semibold text-slate-800 truncate">{{ account.displayName }}</p>
<p class="text-xs text-slate-500 truncate">
{{ account.displaySub }} ·
<span :class="account.type === 'AGENT' ? 'text-blue-600' : 'text-purple-600'">
{{ account.type === 'AGENT' ? roleLabel(account.role) : 'Contribuable' }}
</span>
</p>
<p class="text-xs text-slate-400 mt-0.5">Inscrit le {{ formatDate(account.createdAt) }}</p>
</div>
</div>

<div class="flex items-center gap-2 shrink-0">
<button
@click="openDetail(account)"
class="flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>
Vérifier
</button>
<button
@click="approveAccount(account)"
:disabled="processingId === account.id"
class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-60"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
Approuver
</button>
<button
@click="openReject(account)"
:disabled="processingId === account.id"
class="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-60"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
Refuser
</button>
</div>
</div>
</div>
</Motion>

<!-- ==================== UTILISATEURS APPROUVÉS ==================== -->
<Motion
:initial="{ opacity: 0, y: 24 }"
:animate="{ opacity: 1, y: 0 }"
:transition="{ duration: 0.5, delay: 0.22, ease: 'easeOut' }"
class="section-card"
>
<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
<h2 class="font-bold text-slate-800">Comptes du portail</h2>
<div class="relative w-full sm:w-64">
<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
</svg>
<input v-model="searchQuery" type="text" placeholder="Rechercher un agent ou un contribuable..." class="input-base pl-9" />
</div>
</div>

<div v-if="isLoadingApproved2" class="space-y-2">
<div v-for="n in 3" :key="n" class="h-14 rounded-lg bg-slate-100 animate-pulse"></div>
</div>

<div v-else class="overflow-x-auto">
<table class="w-full text-left text-sm">
<thead class="text-xs uppercase text-slate-400 border-b border-slate-100">
<tr>
<th class="py-2.5 pr-4 font-semibold">Compte</th>
<th class="py-2.5 pr-4 font-semibold">Type / Rôle</th>
<th class="py-2.5 pr-4 font-semibold">Statut</th>
<th class="py-2.5 pr-4 font-semibold text-right">Actions</th>
</tr>
</thead>
<tbody ref="accountsTbodyRef" class="divide-y divide-slate-50">
<tr
v-for="account in paginatedAccounts"
:key="`${account.type}-${account.id}`"
@click="ouvrirEdition(account)"
class="approved-row hover:bg-slate-50/70 transition-colors cursor-pointer"
>
<td class="py-3 pr-4">
<div class="flex items-center gap-3">
<div class="relative shrink-0">
<img
v-if="account.photo_base64"
:src="`data:${account.photo_content_type};base64,${account.photo_base64}`"
class="w-9 h-9 rounded-full object-cover"
>

<div
v-else
class="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
>
{{ accountInitials(account) }}
</div>

<!-- Statut en ligne/hors ligne -->
<span
:class="[
'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
isAccountOnline(account)
? 'bg-emerald-500 online-pulse'
: 'bg-slate-300'
]"
></span>
</div>
<div class="min-w-0">
<p class="font-semibold text-slate-800 truncate">{{ account.displayName }}</p>
<p class="text-xs text-slate-400 truncate">{{ account.displaySub }}</p>
</div>
</div>
</td>
<td class="py-3 pr-4">
<span
:class="[
'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full',
account.type === 'AGENT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
]"
>
{{ account.type === 'AGENT' ? roleLabel(account.role) : 'Contribuable' }}
</span>
</td>
<td class="py-3 pr-4">
<span
:class="[
'inline-flex items-center gap-1.5 text-xs font-semibold',
isAccountOnline(account)
? 'text-emerald-600'
: 'text-slate-400'
]"
>
<span
:class="[
'w-1.5 h-1.5 rounded-full',
isAccountOnline(account)
? 'bg-emerald-500'
: 'bg-slate-300'
]"
></span>

{{ isAccountOnline(account) ? 'En ligne' : 'Hors ligne' }}
</span>
</td>
<td class="py-3 pr-4 text-right">
<button
@click.stop="toggleActive(account)"
:disabled="processingId === account.id"
:class="[
'px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer',
account.is_active
? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
: 'bg-red-50 text-red-600 hover:bg-red-100'
]"
>
{{ account.is_active ? 'Désactiver' : 'Réactiver' }}
</button>

</td>
</tr>

<tr v-if="filteredAccounts.length === 0">
<td colspan="4" class="py-10 text-center text-sm text-slate-400">Aucun compte ne correspond à cette recherche.</td>
</tr>
</tbody>
</table>
</div>

<!-- ==================== PAGINATION ==================== -->
<div
v-if="filteredAccounts.length > accountsPageSize"
class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"
>
<p class="text-xs text-slate-400">
Page {{ accountsCurrentPage }} sur {{ accountsTotalPages }}
<span class="hidden sm:inline">— {{ filteredAccounts.length }} comptes au total</span>
</p>

<div class="flex items-center gap-2">
<Motion :while-hover="accountsCurrentPage > 1 ? { scale: 1.04 } : {}" :while-press="accountsCurrentPage > 1 ? { scale: 0.96 } : {}">
<button
@click="goToPreviousAccountsPage"
:disabled="accountsCurrentPage === 1"
class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
>
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
</svg>
Précédent
</button>
</Motion>

<Motion :while-hover="accountsCurrentPage < accountsTotalPages ? { scale: 1.04 } : {}" :while-press="accountsCurrentPage < accountsTotalPages ? { scale: 0.96 } : {}">
<button
@click="goToNextAccountsPage"
:disabled="accountsCurrentPage === accountsTotalPages"
class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
>
Suivant
<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
</svg>
</button>
</Motion>
</div>
</div>
</Motion>

</div>

<!-- ==================== MODALES ==================== -->
<AgentDetailModal
:open="isDetailOpen"
:agent="selectedAgent"
:loading="processingId === selectedAgent?.id"
@close="isDetailOpen = false"
@approve="approveAccount"
@reject="openReject"
/>

<RejectAgentModal
:open="isRejectOpen"
:agent="selectedAgent"
:loading="processingId === selectedAgent?.id"
@close="isRejectOpen = false"
@confirm="confirmReject"
/>

<EditChiefProfileModal
:open="isEditProfileOpen"
:chief="chief"
@close="isEditProfileOpen = false"
@save="saveChiefProfile"
/>

<!-- ==================== MODAL D'ÉDITION ==================== -->
<transition name="modal">
<div
v-if="showEditUserModal"
class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
@click.self="fermerEdition"
>
<div class="w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

<!-- Header -->
<div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)]">
<div class="flex items-center gap-3 min-w-0">
<div
:class="[
'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
editingUser?.type === 'AGENT'
? 'bg-blue-500/10 text-blue-600'
: 'bg-purple-500/10 text-purple-600'
]"
>
<svg v-if="editingUser?.type === 'AGENT'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
</svg>
</div>
<div class="min-w-0">
<h3 class="text-base font-bold text-[var(--text)] truncate">
Modifier {{ editingUser?.type === 'AGENT' ? 'l\'agent' : 'le contribuable' }}
</h3>
<p class="text-xs text-[var(--text-muted)] truncate">
{{ editingUser?.displayName }}
</p>
</div>
</div>

<button
@click="fermerEdition"
:disabled="isSubmittingEdit"
class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover)] transition disabled:opacity-50"
>
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>

<!-- Body -->
<div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

<!-- ============ AGENT ============ -->
<template v-if="editingUser?.type === 'AGENT'">
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Nom</label>
<input v-model="editForm.nom" type="text" class="input-base" />
</div>
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Prénom</label>
<input v-model="editForm.prenom" type="text" class="input-base" />
</div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Matricule</label>
<input v-model="editForm.matricule" type="text" class="input-base" />
</div>
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Rôle</label>
<select v-model="editForm.role" class="input-base">
<option value="GUICHETIER">Guichetier</option>
<option value="VERIFICATEUR">Vérificateur</option>
<option value="CHEF_CENTRE">Chef de service</option>
</select>
</div>
</div>

<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Email</label>
<input v-model="editForm.email" type="email" class="input-base" />
</div>
</template>

<!-- ============ CONTRIBUABLE ============ -->
<template v-else>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">NIF</label>
<input v-model="editForm.nif" type="text" class="input-base" />
</div>
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Type</label>
<select v-model="editForm.type_contribuable" class="input-base">
<option value="PARTICULIER">Particulier</option>
<option value="ENTREPRISE">Entreprise</option>
</select>
</div>
</div>

<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Nom / Raison sociale</label>
<input v-model="editForm.nom_raison_sociale" type="text" class="input-base" />
</div>

<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Prénom</label>
<input v-model="editForm.prenom" type="text" class="input-base" />
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Email</label>
<input v-model="editForm.email" type="email" class="input-base" />
</div>
<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Téléphone</label>
<input v-model="editForm.telephone" type="tel" class="input-base" />
</div>
</div>

<div>
<label class="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Adresse</label>
<textarea v-model="editForm.adresse" rows="2" class="input-base resize-none"></textarea>
</div>
</template>

<!-- Commun : actif -->
<div class="pt-3 border-t border-[var(--border)]">
<label class="flex items-center gap-3 cursor-pointer select-none">
<input
v-model="editForm.is_active"
type="checkbox"
class="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/40"
/>
<div>
<p class="text-sm font-medium text-[var(--text)]">Compte actif</p>
<p class="text-xs text-[var(--text-muted)]">Décochez pour désactiver l'accès à ce compte</p>
</div>
</label>
</div>
</div>

<!-- Footer -->
<div class="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]/50">
<button
@click="fermerEdition"
:disabled="isSubmittingEdit"
class="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--hover)] disabled:opacity-50 transition cursor-pointer"
>
Annuler
</button>
<button
@click="soumettreEdition"
:disabled="isSubmittingEdit"
class="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
>
<svg v-if="isSubmittingEdit" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
</svg>
{{ isSubmittingEdit ? 'Enregistrement…' : 'Enregistrer' }}
</button>
</div>
</div>
</div>
</transition>

<!-- Toast -->
<transition name="toast">
<div v-if="toastMessage" class="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 border-l-4" :class="toastType === 'error' ? 'border-red-500' : 'border-emerald-500'">
<span class="text-sm font-medium">{{ toastMessage }}</span>
</div>
</transition>

</div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted,onUnmounted, nextTick, h } from 'vue'
import { Motion } from 'motion-v'
import gsap from 'gsap'
import AgentDetailModal from './Modal/AgentDetailModal.vue'
import RejectAgentModal from './Modal/RejectAgentModal.vue'
import EditChiefProfileModal from './Modal/EditChiefProfileModal.vue'
import api from '@/api/Axios.js'
import socket, { connectSocket }  from '@/services/socket'
import { playSound } from '../services/sonnerie.js'

// ==================== ICÔNES (mini composants inline pour les stats) ====================
const IconUsers = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4' })
])
const IconClock = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
])
const IconWifi = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
	h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M4.929 12.929a9 9 0 0114.142 0' })
])

// ==================== PROFIL DU CHEF ====================
const chief = reactive({
	id: null,
	nom: '',
	prenom: '',
	matricule: '',
	email: '',
	role: 'CHEF_CENTRE',
	photo_base64: null,
	photo_content_type: null
})

const initials = computed(() =>
`${chief.nom?.[0] || ''}${chief.prenom?.[0] || ''}`.toUpperCase()
)

const fetchChiefProfile = async () => {
	try {
		const response = await api.get('/auth/admin')
		
		console.log('Profil du chef :', response.data)
		
		Object.assign(
			chief,
			response.data.data || response.data
		)
		
	} catch (err) {
		console.error(
			'Impossible de charger le profil du chef',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
	}
}

const isEditProfileOpen = ref(false)

const openEditProfile = () => {
	console.log('🟢 Profil envoyé au modal :', { ...chief })
	
	isEditProfileOpen.value = true
}

const saveChiefProfile = async (payload) => {
	try {
		const response = await api.patch(
			`/auth/admin/edit/${chief.role}`,
			payload
		)
		
		console.log(
			'Profil mis à jour :',
			response.data
		)
		
		Object.assign(
			chief,
			response.data.data || response.data
		)
		playSound('update')
		
		showToast(
			'Profil mis à jour avec succès'
		)
		
		isEditProfileOpen.value = false
		
	} catch (err) {
		
		console.error(
			'Erreur mise à jour profil :',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
		
		showToast(
			err.response?.data?.message ||
			err.message ||
			'Erreur lors de la mise à jour',
			'error'
		)
	}
}

/* ============================================================
 * MODAL D'ÉDITION
 * ============================================================ */
const showEditUserModal = ref(false)
const editingUser = ref(null)
const editForm = ref({})
const isSubmittingEdit = ref(false)

function ouvrirEdition(account) {
	editingUser.value = account
	
	/* Pré-remplir selon le type */
	if (account.type === 'AGENT') {
		editForm.value = {
			nom: account.nom || '',
			prenom: account.prenom || '',
			matricule: account.matricule || '',
			email: account.email || '',
			role: account.role || 'GUICHETIER',
			is_active: account.is_active ?? true
		}
	} else {
		editForm.value = {
			nif: account.nif || '',
			nom_raison_sociale: account.nom_raison_sociale || '',
			prenom: account.prenom || '',
			email: account.email || '',
			telephone: account.telephone || '',
			adresse: account.adresse || '',
			type_contribuable: account.type_contribuable || 'PARTICULIER',
			is_active: account.is_active ?? true
		}
	}
	
	showEditUserModal.value = true
}

function fermerEdition() {
	if (isSubmittingEdit.value) return
		showEditUserModal.value = false
		editingUser.value = null
		editForm.value = {}
}

async function soumettreEdition() {
	if (!editingUser.value) return
		
		isSubmittingEdit.value = true
		try {
			const isAgent = editingUser.value.type === 'AGENT'
			
			if (isAgent) {
				await api.patch(
					`/auth/admin/agent/${editingUser.value.id}`,
					editForm.value
				)
			} else {
				await api.patch(
					`/contribuables/${editingUser.value.id}`,
					editForm.value
				)
			}
			
			playSound('update')
			showToast(`${editingUser.value.displayName} mis à jour avec succès.`)
			
			/* Recharger les listes */
			await Promise.all([
				fetchApprovedAgents(),
							  fetchApprovedContribuables()
			])
			
			showEditUserModal.value = false
			editingUser.value = null
			editForm.value = {}
		} catch (err) {
			console.error('❌ Erreur édition :', err)
			playSound('error')
			showToast(
				err.response?.data?.message ||
				'Impossible de mettre à jour.',
			 'error'
			)
		} finally {
			isSubmittingEdit.value = false
		}
}

// ==================== LISTES D'AGENTS ====================
const pendingAgents = ref([])
const approvedAgents = ref([])
const onlineAgentIds = ref(new Set())
const onlineContribuableIds = ref(new Set())
const isLoadingPending = ref(true)
const isLoadingApproved = ref(true)
const searchQuery = ref('')

const fetchPendingAgents = async () => {
	isLoadingPending.value = true
	
	try {
		const response = await api.get(
			'/auth/admin/agents/pending'
		)
		
		console.log(
			'Demandes en attente :',
			response.data
		)
		
		pendingAgents.value =
		response.data.data || response.data
		
	} catch (err) {
		
		console.error(
			'Erreur chargement demandes en attente :',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les demandes en attente',
			'error'
		)
		
	} finally {
		isLoadingPending.value = false
	}
}
const fetchApprovedAgents = async () => {
	isLoadingApproved.value = true
	
	try {
		const response = await api.get(
			'/auth/admin/agents/approved'
		)
		
		console.log(
			'Agents approuvés :',
			response.data
		)
		
		approvedAgents.value =
		response.data.data || response.data
		
	} catch (err) {
		
		console.error(
			'Erreur chargement agents approuvés :',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les agents approuvés',
			'error'
		)
		
	} finally {
		isLoadingApproved.value = false
	}
}


const pendingContribuables = ref([])
const approvedContribuables = ref([])
const isLoadingPendingContribuables = ref(true)
const isLoadingApprovedContribuables = ref(true)

const fetchPendingContribuables = async () => {
	isLoadingPendingContribuables.value = true
	
	try {
		const response = await api.get(
			'/contribuables/pending'
		)
		
		console.log(
			'Contribuables en attente de validation :',
			response.data
		)
		
		pendingContribuables.value =
		response.data.data || response.data
		
	} catch (err) {
		
		console.error(
			'Erreur chargement contribuables en attente :',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les contribuables en attente',
			'error'
		)
		
	} finally {
		isLoadingPendingContribuables.value = false
	}
}

const fetchApprovedContribuables = async () => {
	isLoadingApprovedContribuables.value = true
	
	try {
		const response = await api.get(
			'/contribuables/approved'
		)
		
		console.log(
			'Contribuables validés :',
			response.data
		)
		
		approvedContribuables.value =
		response.data.data || response.data
		
	} catch (err) {
		
		console.error(
			'Erreur chargement contribuables validés :',
			err
		)
		
		console.error(
			'Réponse serveur :',
			err.response?.data
		)
		
		showToast(
			err.response?.data?.message ||
			'Impossible de charger les contribuables validés',
			'error'
		)
		
	} finally {
		isLoadingApprovedContribuables.value = false
	}
}

// ==================== FUSION AGENTS + CONTRIBUABLES ====================
// Deux tables différentes (AGENT / CONTRIBUABLE) mais même principe :
// un statut de validation par l'admin. On normalise chaque source vers une
// forme commune, puis on les combine — pending d'un côté, validés de l'autre.
const normalizeAgent = (a) => ({
	...a,
	type: 'AGENT',
	id: a.id,
	is_active: Boolean(a.is_active),
							   displayName: `${a.nom} ${a.prenom}`,
							   displaySub: a.email,
							   createdAt: a.created_at,
							   searchKey: `${a.nom} ${a.prenom} ${a.email}`.toLowerCase()
})

const normalizeContribuable = (c) => ({
	...c,
	type: 'CONTRIBUABLE',
	id: c.id_contribuable,
	displayName: c.nom_raison_sociale,
	displaySub: c.email || c.telephone || c.nif,
	createdAt: c.created_at || c.date_creation,
	is_active: Boolean(c.is_active),
									  is_online: Boolean(c.is_online),
									  searchKey: `${c.nom_raison_sociale || ''} ${c.prenom || ''} ${c.nif || ''} ${c.email || ''} ${c.telephone || ''}`.toLowerCase()
})

// ---- Liste combinée "en attente de validation" (en haut) ----
const pendingAccounts = computed(() => [
	...pendingAgents.value.map(normalizeAgent),
								 ...pendingContribuables.value.map(normalizeContribuable)
])

const isLoadingPendingAll = computed(() =>
isLoadingPending.value || isLoadingPendingContribuables.value
)

// ---- Liste combinée "validés" (dans le tableau) ----
const allAccounts = computed(() => [
	...approvedAgents.value.map(normalizeAgent),
							 ...approvedContribuables.value.map(normalizeContribuable)
])

const isLoadingApproved2 = computed(() =>
isLoadingApproved.value || isLoadingApprovedContribuables.value
)

const accountInitials = (account) => {
	if (account.type === 'AGENT') {
		return `${account.nom?.[0] || ''}${account.prenom?.[0] || ''}`.toUpperCase()
	}
	// CONTRIBUABLE : initiales du nom / raison sociale (1 ou 2 premiers mots)
	const words = (account.nom_raison_sociale || '').trim().split(/\s+/)
	return words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const connectPresence = () => {
	console.log('🔌 Initialisation présence...')
	
	// Évite les doublons de listeners
	socket.off('connect', handleSocketConnect)
	socket.off('connect_error', handleSocketConnectError)
	socket.off('disconnect', handleSocketDisconnect)
	
	socket.off('agents:initial', handleAgentsInitial)
	socket.off('agent:online', handleAgentOnline)
	socket.off('agent:offline', handleAgentOffline)
	
	socket.off('contribuables:initial', handleContribuablesInitial) 
	socket.off('contribuable:online', handleContribuableOnline)
	socket.off('contribuable:offline', handleContribuableOffline)
	
	socket.on('contribuables:initial', handleContribuablesInitial) 
	socket.on('contribuable:online', handleContribuableOnline)
	socket.on('contribuable:offline', handleContribuableOffline)
	
	// Enregistre les listeners
	socket.on('connect', handleSocketConnect)
	socket.on('connect_error', handleSocketConnectError)
	socket.on('disconnect', handleSocketDisconnect)
	
	socket.on('agents:initial', handleAgentsInitial)
	socket.on('agent:online', handleAgentOnline)
	socket.on('agent:offline', handleAgentOffline)
	
	/*
	 * App.vue s'occupe déjà de connectSocket().
	 * Donc on ne reconnecte PAS ici.
	 */
	
	// Si le socket est déjà connecté,
	// on demande immédiatement la présence actuelle.
	if (socket.connected) {
		console.log(
			'📡 Socket déjà connecté → demande présence'
		)
		
		socket.emit('presence:request')
	}
}
//******************************************************************

const handleSocketConnect = () => {
	console.log('🟢 SOCKET FRONTEND CONNECTÉ')
	console.log('🆔 Socket ID :', socket.id)
	
	// Demander la liste des agents déjà connectés
	socket.emit('presence:request')
}

const handleSocketConnectError = (error) => {
	console.error(
		'❌ SOCKET CONNECTION ERROR :',
		error.message
	)
}

const handleSocketDisconnect = (reason) => {
	console.log(
		'🔴 SOCKET FRONTEND DÉCONNECTÉ :',
		reason
	)
}

const handleAgentsInitial = (ids) => {
	console.log(
		'📋 AGENTS EN LIGNE INITIAUX :',
		ids
	)
	
	onlineAgentIds.value = new Set(
		ids.map(id => String(id))
	)
	
	console.log(
		'👥 Agents actuellement en ligne :',
		[...onlineAgentIds.value]
	)
}

const handleContribuablesInitial = (ids) => {
	console.log('📋 CONTRIBUABLES EN LIGNE INITIAUX :', ids)
	
	onlineContribuableIds.value = new Set(
		ids.map(id => String(id))
	)
	
	console.log(
		'👥 Contribuables actuellement en ligne :',
		[...onlineContribuableIds.value]
	)
}

const handleAgentOnline = (agent) => {
	console.log(
		'🟢 AGENT ONLINE :',
		agent
	)
	
	const ids = new Set(
		onlineAgentIds.value
	)
	
	ids.add(String(agent.id))
	
	onlineAgentIds.value = ids
}

const handleAgentOffline = (agent) => {
	console.log(
		'🔴 AGENT OFFLINE :',
		agent
	)
	
	const ids = new Set(
		onlineAgentIds.value
	)
	
	ids.delete(String(agent.id))
	
	onlineAgentIds.value = ids
}

const handleContribuableOnline = (contribuable) => {
	const ids = new Set(onlineContribuableIds.value)
	
	ids.add(String(contribuable.id))
	
	onlineContribuableIds.value = ids
	
	console.log('🟢 Contribuable en ligne :', contribuable.id)
}

const handleContribuableOffline = (contribuable) => {
	const ids = new Set(onlineContribuableIds.value)
	
	ids.delete(String(contribuable.id))
	
	onlineContribuableIds.value = ids
	
	console.log('🔴 Contribuable hors ligne :', contribuable.id)
}



const isAccountOnline = (account) => {
	if (account.type === 'AGENT') {
		return onlineAgentIds.value.has(String(account.id))
	}
	
	if (account.type === 'CONTRIBUABLE') {
		return onlineContribuableIds.value.has(String(account.id))
	}
	
	return false
}

const filteredAccounts = computed(() => {
	if (!searchQuery.value.trim()) return allAccounts.value
		const q = searchQuery.value.toLowerCase()
		return allAccounts.value.filter(a => a.searchKey.includes(q))
})

// ==================== PAGINATION DU TABLEAU DES COMPTES ====================
const accountsPageSize = 4
const accountsCurrentPage = ref(1)

const accountsTotalPages = computed(() =>
Math.max(1, Math.ceil(filteredAccounts.value.length / accountsPageSize))
)

const paginatedAccounts = computed(() => {
	const start = (accountsCurrentPage.value - 1) * accountsPageSize
	return filteredAccounts.value.slice(start, start + accountsPageSize)
})

// Revenir à la page 1 à chaque nouvelle recherche
watch(searchQuery, () => {
	accountsCurrentPage.value = 1
})

// Se replier sur la dernière page valide si la liste rétrécit (ex: désactivation)
watch(accountsTotalPages, (newTotal) => {
	if (accountsCurrentPage.value > newTotal) {
		accountsCurrentPage.value = newTotal
	}
})

const goToPreviousAccountsPage = () => {
	if (accountsCurrentPage.value > 1) accountsCurrentPage.value--
}

const goToNextAccountsPage = () => {
	if (accountsCurrentPage.value < accountsTotalPages.value) accountsCurrentPage.value++
}

// Petit fondu GSAP à chaque changement de page (cohérent avec l'animation des créneaux)
const accountsTbodyRef = ref(null)

watch(accountsCurrentPage, async () => {
	await nextTick()
	const rows = accountsTbodyRef.value?.querySelectorAll('.approved-row')
	if (!rows?.length) return
		
		gsap.fromTo(
			rows,
			{ opacity: 0, y: 6 },
			{ opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
		)
})

// ==================== STATISTIQUES ====================
const stats = computed(() => [
	{ label: 'Comptes validés (agents + contribuables)', value: allAccounts.value.length, icon: IconUsers, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
					   { label: 'En attente de validation', value: pendingAccounts.value.length, icon: IconClock, iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
					   { label: 'Agents en ligne actuellement', value: onlineAgentIds.value.size, icon: IconWifi, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' }
])

// ==================== HELPERS ====================
const roleLabel = (role) => {
	const labels = {
		AGENT_ACCUEIL: 'Agent d\'accueil',
		AGENT_VERIFICATEUR: 'Agent vérificateur',
		CHEF_SERVICE: 'Chef de service',
		ADMINISTRATEUR: 'Administrateur'
	}
	return labels[role] || role
}

const agentInitials = (agent) =>
`${agent.nom?.[0] || ''}${agent.prenom?.[0] || ''}`.toUpperCase()

const formatDate = (dateStr) => {
	if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ==================== MODALES : DÉTAIL / VÉRIFICATION ====================
const isDetailOpen = ref(false)
const isRejectOpen = ref(false)
const selectedAgent = ref(null)
const processingId = ref(null)
const pendingListRef = ref(null)

const openDetail = (agent) => {
	selectedAgent.value = agent
	isDetailOpen.value = true
}

const openReject = (agent) => {
	selectedAgent.value = agent
	isDetailOpen.value = false
	isRejectOpen.value = true
}

// Animation de sortie GSAP avant de retirer une carte de la liste "en attente"
const animateRowRemoval = (account) => {
	return new Promise((resolve) => {
		const row = pendingListRef.value?.querySelector(`[data-account-id="${account.type}-${account.id}"]`)
		if (!row) return resolve()
			
			gsap.to(row, {
				opacity: 0,
				x: 40,
				height: 0,
				marginBottom: 0,
				paddingTop: 0,
				paddingBottom: 0,
				duration: 0.35,
				ease: 'power2.in',
				onComplete: resolve
			})
	})
}

// ==================== ACTIONS : APPROUVER / REFUSER ====================
// Génériques : dispatchent vers la bonne route selon account.type,
// car AGENT et CONTRIBUABLE viennent de deux tables/API différentes.
const approveAccount = async (account) => {
	processingId.value = account.id
	
	try {
		if (account.type === 'AGENT') {
			await api.patch(
				`/auth/admin/review/${account.id}`,
				{ status: 'approved' }
			)
			
			pendingAgents.value = pendingAgents.value.filter(a => a.id !== account.id)
			approvedAgents.value.unshift({ ...account, admin_status: 'approved', is_active: true })
		} else {
			await api.patch(
				`/contribuables/${account.id}/admin`,
				{ status : true }
			)
			
			pendingContribuables.value = pendingContribuables.value.filter(c => c.id_contribuable !== account.id)
			approvedContribuables.value.unshift({ ...account, id_contribuable: account.id, admin_activation: true })
		}
		
		await animateRowRemoval(account)
		
		isDetailOpen.value = false
		
		playSound('success')
		
		showToast(`${account.displayName} a été approuvé(e)`)
		
	} catch (err) {
		
		console.error(
			'Erreur approbation :',
			err
		)
		playSound('error')
		showToast(
			err.response?.data?.message ||
			err.message ||
			"Erreur lors de l'approbation",
			'error'
		)
		
	} finally {
		processingId.value = null
	}
}


const confirmReject = async ({ agent: account, comment }) => {
	processingId.value = account.id
	
	try {
		if (account.type === 'AGENT') {
			await api.patch(
				`/auth/admin/review/${account.id}`,
				{ status: 'rejected', comment }
			)
			
			pendingAgents.value = pendingAgents.value.filter(a => a.id !== account.id)
		} else {
			await api.patch(
				`/contribuables/${account.id}/admin`,
				{ status: false, comment }
			)
			
			pendingContribuables.value = pendingContribuables.value.filter(c => c.id_contribuable !== account.id)
		}
		
		await animateRowRemoval(account)
		
		isRejectOpen.value = false
		playSound('update')
		showToast(`La demande de ${account.displayName} a été refusée`)
		
	} catch (err) {
		console.error('Erreur refus :', err)
		playSound('error')
		showToast(
			err.response?.data?.message ||
			'Erreur lors du refus',
			'error'
		)
		
	} finally {
		processingId.value = null
	}
}

const toggleActive = async (account) => {
	if (account.type !== 'AGENT') return
		
		try {
			processingId.value = account.id
			
			const currentAgent = approvedAgents.value.find(
				a => String(a.id) === String(account.id)
			)
			
			if (!currentAgent) {
				console.error('❌ Agent non trouvé:', account.id)
				return
			}
			
			const newStatus = !currentAgent.is_active
			
			const response = await api.patch(
				`/auth/admin/agents/${currentAgent.id}`,
				{
					is_active: newStatus
				}
			)
			
			// =================================================
			// MISE À JOUR DE LA SOURCE REACTIVE
			// =================================================
			
			const returnedStatus =
			response.data.agent?.is_active
			
			if (typeof returnedStatus === 'boolean') {
				currentAgent.is_active = returnedStatus
				
			} else {
				currentAgent.is_active = newStatus
			}
			
			console.log(
				'🟣 APRÈS MODIFICATION FRONT:',
			   currentAgent.is_active
			)
			playSound('update')
			showToast(
				response.data.message ||
				(
					currentAgent.is_active
					? 'Agent réactivé avec succès'
					: 'Agent désactivé avec succès'
				)
			)
			
		} catch (err) {
			
			console.error(
				'❌ Erreur changement statut:',
				 err
			)
			playSound('error')
			showToast(
				err.response?.data?.message ||
				'Erreur lors du changement de statut',
			 'error'
			)
			
		} finally {
			processingId.value = null
		}
}

// ==================== TOAST ====================
const toastMessage = ref('')
const toastType = ref('success')

const showToast = (message, type = 'success') => {
	toastType.value = type
	toastMessage.value = message
	setTimeout(() => { toastMessage.value = '' }, 3500)
}

// ==================== CYCLE DE VIE ====================
let presenceInterval = null

onMounted(async () => {
	await Promise.all([
		fetchChiefProfile(),
		fetchPendingAgents(),
		fetchApprovedAgents(),
		fetchPendingContribuables(),
		fetchApprovedContribuables(),
					  
	])
	
	connectPresence()
	
	presenceInterval = setInterval(() => {
		if (socket.connected) {
			socket.emit('presence:request')
		}
	}, 30000)
})

onUnmounted(() => {
	console.log('🧹 Nettoyage listeners Socket.IO')
	
	if (presenceInterval) {
		clearInterval(presenceInterval)
		presenceInterval = null
	}
	
	socket.off('connect', handleSocketConnect)
	socket.off('connect_error', handleSocketConnectError)
	socket.off('disconnect', handleSocketDisconnect)
	
	socket.off('agents:initial', handleAgentsInitial)
	socket.off('agent:online', handleAgentOnline)
	socket.off('agent:offline', handleAgentOffline)
	
	socket.off('contribuables:initial', handleContribuablesInitial)  
	socket.off('contribuable:online', handleContribuableOnline)
	socket.off('contribuable:offline', handleContribuableOffline)
})
</script>

<style scoped>
.chef-page {
	min-height: 100vh;
	background-color: var(--bg);
	color: var(--text);
	font-family: 'Inter', sans-serif;
}

/* ==================== HEADER ==================== */
.header-bar {
	background: var(--card);
	border-bottom: 1px solid var(--border);
	padding: 16px 24px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header-bar h1 {
	color: var(--text);
}

.header-bar p {
	color: var(--text-muted);
}

.header-bar button {
	border: 1px solid var(--border);
	color: var(--text);
	background: transparent;
	transition: background 0.2s, border-color 0.2s;
}

.header-bar button:hover {
	background: var(--hover);
	border-color: var(--primary);
}

/* Avatar fallback */
.header-bar .bg-blue-600 {
	background-color: var(--primary) !important;
}

/* Online indicator */
.header-bar .bg-emerald-500 {
	background-color: #10b981;
}

/* ==================== CONTENT ==================== */
.content-wrapper {
	max-width: 1100px;
	margin: 0 auto;
	padding: 32px 24px;
}

/* ==================== STAT CARDS ==================== */
.stat-card {
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 12px;
	padding: 18px;
	display: flex;
	align-items: center;
	gap: 14px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	color: var(--text);
}

.stat-card p:first-child {
	color: var(--text);
}

.stat-card p:last-child {
	color: var(--text-muted);
}

/* Icon backgrounds (keep soft tints but themed) */
.stat-card .bg-blue-50 {
	background-color: color-mix(in srgb, var(--primary) 12%, transparent);
}
.stat-card .text-blue-600 {
	color: var(--primary);
}

.stat-card .bg-orange-50 {
	background-color: color-mix(in srgb, #f97316 12%, transparent);
}
.stat-card .text-orange-600 {
	color: #ea580c;
}

.stat-card .bg-emerald-50 {
	background-color: color-mix(in srgb, #10b981 12%, transparent);
}
.stat-card .text-emerald-600 {
	color: #059669;
}

/* ==================== SECTION CARDS ==================== */
.section-card {
	background: var(--sidebar);
	border: 1px solid var(--border);
	border-radius: 14px;
	padding: 22px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.section-card h2 {
	color: var(--text);
}

/* Badge "en attente" */
.section-card .bg-orange-100 {
	background-color: color-mix(in srgb, #f97316 18%, transparent);
}
.section-card .text-orange-600 {
	color: #ea580c;
}

/* ==================== PENDING ROWS ==================== */
.pending-row {
	border-color :var(--borderListCard);
	background: var(--bgListCard);
	transition: background 0.2s, border-color 0.2s;
}

.pending-row .font-semibold {
	color: var(--text);
}

.pending-row .text-slate-500,
.pending-row .text-slate-400 {
	color: var(--text-muted);
}


/* Boutons dans les lignes pending */
.pending-row button {
	transition: all 0.2s;
}

/* Bouton Vérifier */
.pending-row button.border-slate-300 {
	border-color: var(--border);
	background: var(--card);
	color: var(--text);
}
.pending-row button.border-slate-300:hover {
	background: var(--hover);
}

/* Bouton Approuver */
.pending-row .bg-emerald-600 {
	background-color: #059669;
}
.pending-row .bg-emerald-600:hover {
	background-color: #047857;
}

/* Bouton Refuser */
.pending-row .border-red-200 {
	border-color: color-mix(in srgb, #ef4444 35%, transparent);
	color: #dc2626;
}
.pending-row .border-red-200:hover {
	background-color: color-mix(in srgb, #ef4444 10%, transparent);
}

/* ==================== TABLE APPROVED ==================== */
table thead {
	color: var(--text-muted);
	border-bottom: 1px solid var(--border);
}

table tbody {
	color: var(--text);
}

.approved-row {
	transition: background 0.15s;
}

.approved-row:hover {
	background: var(--hover);
}

.approved-row .text-slate-800 {
	color: var(--text);
}

.approved-row .text-slate-400,
.approved-row .text-slate-600 {
	color: var(--text-muted);
}

/* Avatar fallback approved */
.approved-row .bg-slate-200 {
	background-color: color-mix(in srgb, var(--text-muted) 25%, transparent);
	color: var(--text);
}

/* Status online / offline */
.approved-row .text-emerald-600 {
	color: #059669;
}
.approved-row .bg-emerald-500 {
	background-color: #10b981;
}
.approved-row .text-slate-400 {
	color: var(--text-muted);
}
.approved-row .bg-slate-300 {
	background-color: var(--border);
}

/* Toggle active / inactive buttons */
.approved-row .bg-slate-100 {
	background: color-mix(in srgb, var(--text-muted) 15%, transparent);
	color: var(--text);
}
.approved-row .bg-slate-100:hover {
	background: color-mix(in srgb, var(--text-muted) 25%, transparent);
}

.approved-row .bg-red-50 {
	background: color-mix(in srgb, #ef4444 12%, transparent);
	color: #dc2626;
}
.approved-row .bg-red-50:hover {
	background: color-mix(in srgb, #ef4444 20%, transparent);
}

/* Badge type de compte */
.approved-row .bg-blue-50 {
	background-color: color-mix(in srgb, var(--primary) 12%, transparent);
	color: var(--primary);
}
.approved-row .bg-purple-50 {
	background-color: color-mix(in srgb, #a855f7 14%, transparent);
	color: #9333ea;
}

/* ==================== MODAL TRANSITION ==================== */
.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
	transition: transform 0.25s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
	transform: scale(0.95) translateY(10px);
}

/* ==================== INPUT SEARCH ==================== */
.input-base {
	width: 100%;
	padding: 8px 12px 8px 34px;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--bg);
	font-size: 13px;
	color: var(--text);
	outline: none;
	transition: all 0.2s;
}

.input-base::placeholder {
	color: var(--text-muted);
}

.input-base:focus {
	border-color: var(--primary);
	background: var(--card);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

/* ==================== LOADING SKELETON ==================== */
.bg-slate-100 {
	background-color: color-mix(in srgb, var(--border) 70%, transparent) !important;
}

/* ==================== EMPTY STATES ==================== */
.text-slate-400 {
	color: var(--text-muted) !important;
}

/* ==================== TOAST ==================== */
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

/* ==================== ONLINE PULSE ==================== */
.online-pulse {
	animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
	0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
	70%  { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
	100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* ==================== TRANSITIONS ==================== */
.toast-enter-active,
.toast-leave-active {
	transition: all 0.4s ease;
}

.toast-enter-from,
.toast-leave-to {
	opacity: 0;
	transform: translateX(100%);
}

/* ==================== DARK MODE SPECIFIC ==================== */
.dark .pending-row {
	background: var(--bgListCard);
	border-color: var(--borderListCard);
}

.dark .stat-card .bg-blue-50 {
	background-color: color-mix(in srgb, var(--primary) 18%, transparent);
}
.dark .stat-card .bg-orange-50 {
	background-color: color-mix(in srgb, #f97316 18%, transparent);
}
.dark .stat-card .bg-emerald-50 {
	background-color: color-mix(in srgb, #10b981 18%, transparent);
}
</style>
