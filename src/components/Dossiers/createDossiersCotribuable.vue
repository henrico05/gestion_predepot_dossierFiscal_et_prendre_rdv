<template>
<div class="dossier-page" :data-page="dossierEtape">

<!-- ========================================================= -->
<!-- ÉTAPE 1 : CRÉATION DU DOSSIER                              -->
<!-- ========================================================= -->
<template v-if="dossierEtape === 'creation'">

<!-- Stepper visuel -->
<div class="stepper">
<div 
v-for="(step, i) in steps" 
:key="step.id"
class="step"
:class="{ 
active: currentStepIndex === i, 
done: currentStepIndex > i,
clickable: currentStepIndex > i
}"
@click="currentStepIndex > i && goToStep(i)"
>
<div class="step-circle">
<svg v-if="currentStepIndex > i" viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
</svg>
<span v-else>{{ i + 1 }}</span>
</div>
<span class="step-label">{{ step.label }}</span>
</div>
</div>

<div class="content-wrapper">
<div class="main-col">

<!-- ÉTAPE 1 : Origine -->
<transition name="slide-fade" mode="out-in">
<section v-if="currentStepIndex === 0" key="origin" class="card-section">
<div class="section-head">
<h2>D'où vient ce dossier ?</h2>
<p class="section-sub">Choisissez le mode de création.</p>
</div>

<div class="origin-grid">
<button 
type="button" 
class="origin-card" 
:class="{ active: origin === 'rdv' }" 
@click="setOrigin('rdv')"
>
<div class="origin-icon">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>
</div>
<strong>Depuis un rendez-vous</strong>
<span>Reprend automatiquement le contribuable et le service.</span>
<span class="origin-badge">Recommandé</span>
</button>

<button 
type="button" 
class="origin-card" 
:class="{ active: origin === 'direct' }" 
@click="setOrigin('direct')"
>
<div class="origin-icon">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
</svg>
</div>
<strong>Sans rendez-vous</strong>
<span>Pré-dépôt immédiat (guichet, dépôt spontané).</span>
</button>
</div>

<button type="button" class="btn-next" @click="nextStep">
Continuer
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</button>
</section>

<!-- ÉTAPE 2 : RDV (si origine = rdv) -->
<section v-else-if="currentStepIndex === 1 && origin === 'rdv'" key="rdv" class="card-section">
<div class="section-head">
<h2>Rendez-vous source</h2>
<p class="section-sub">Recherchez un RDV confirmé pour le lier.</p>
</div>

<div class="search-row">
<div class="search-input-wrap">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input v-model="rdvQuery" type="text" placeholder="NIF du contribuable…" @keyup.enter="searchRdv">
</div>
<input v-model="rdvDateFilter" type="date" class="input-base date-input">
<button type="button" class="btn-dark" @click="searchRdv" :disabled="isLoadingRdvs">
<span v-if="isLoadingRdvs" class="spinner-sm"></span>
Rechercher
</button>
</div>

<!-- Loading -->
<div v-if="isLoadingRdvs" class="loading-state">
<div class="spinner"></div>
<p>Recherche en cours…</p>
</div>

<!-- Résultats -->
<div v-else-if="rdvResults.length" class="rdv-table-wrap">
<table class="data-table">
<thead>
<tr>
<th>N° RDV</th>
<th>Contribuable</th>
<th>Service</th>
<th>Date / heure</th>
<th>Statut</th>
<th></th>
</tr>
</thead>
<tbody>
<tr
v-for="rdv in rdvResults"
:key="rdv.id_rdv"
:class="{ 
selected: selectedRdv?.id_rdv === rdv.id_rdv, 
disabled: rdv.hasDossier 
}"
>
<td class="mono">RDV-{{ rdv.id_rdv }}</td>
<td>
<div class="cell-main">{{ rdv.nom_raison_sociale }}</div>
<div class="cell-sub">NIF {{ rdv.nif }}</div>
</td>
<td>{{ rdv.libelle_service }}</td>
<td>{{ formatLongDate(rdv.date_rdv) }} · {{ rdv.heure_rdv }}</td>
<td>
<span class="pill" :class="rdv.statut_rdv.toLowerCase()">
{{ labelStatutRdv(rdv.statut_rdv) }}
</span>
</td>
<td>
<button
v-if="!rdv.hasDossier && canLinkRdv(rdv)"
type="button"
class="link-btn"
@click="selectRdv(rdv)"
>
{{ selectedRdv?.id_rdv === rdv.id_rdv ? '✓ Sélectionné' : 'Lier' }}
</button>
<span v-else class="cell-sub">
{{ rdv.hasDossier ? 'Déjà lié' : 'Non liabe' }}
</span>
</td>
</tr>
</tbody>
</table>
</div>

<!-- A. En cours de chargement -->
<div v-if="isLoadingRdvs" class="loading-state">
<div class="spinner"></div>
<p>Recherche en cours…</p>
</div>

<!-- B. Résultats trouvés -->
<div v-else-if="rdvResults.length" class="rdv-table-wrap">
<table class="data-table">
<!-- ... votre table ... -->
</table>
</div>

<!-- C. Recherche lancée mais aucun résultat -->
<div v-else-if="rdvSearched && rdvQuery.trim()" class="empty-state">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
<p>Aucun rendez-vous trouvé pour ce NIF.</p>
</div>

<!-- D. État initial : rien n'a encore été cherché -->
<div v-else class="empty-state initial">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<p>Saisissez un NIF puis lancez la recherche pour afficher les rendez-vous.</p>
</div>

<!-- RDV sélectionné -->
<div v-if="selectedRdv" class="alert alert-info">
<div>
<p class="alert-title">RDV-{{ selectedRdv.id_rdv }} — {{ selectedRdv.libelle_service }}</p>
<p class="alert-meta">
{{ selectedRdv.nom_raison_sociale }} · {{ formatLongDate(selectedRdv.date_rdv) }} à {{ selectedRdv.heure_rdv }}
</p>
</div>
<button type="button" class="link-btn" @click="selectedRdv = null">Retirer</button>
</div>

<div class="step-nav">
<button type="button" class="btn-ghost" @click="prevStep">Retour</button>
<button type="button" class="btn-next" @click="nextStep" :disabled="!selectedRdv">
Continuer
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</button>
</div>
</section>

<!-- ÉTAPE 2 ou 3 : Contribuable (selon origine) -->
<section 
v-else-if="(currentStepIndex === 2 && origin === 'rdv') || (currentStepIndex === 1 && origin === 'direct')" 
key="contribuable" 
class="card-section"
>
<div class="section-head">
<h2>Contribuable et service</h2>
<p class="section-sub" v-if="origin === 'rdv'">Hérités du rendez-vous sélectionné.</p>
<p class="section-sub" v-else>Recherchez ou créez un contribuable.</p>
</div>

<!-- Mode RDV : champs verrouillés -->
<div v-if="origin === 'rdv' && selectedRdv" class="locked-grid">
<div class="locked-field">
<span>Contribuable</span>
<strong>{{ selectedRdv.nom_raison_sociale }}</strong>
<small>NIF {{ selectedRdv.nif }}</small>
</div>
<div class="locked-field">
<span>Service</span>
<strong>{{ selectedRdv.libelle_service }}</strong>
<small>Identique au RDV</small>
</div>
</div>

<!-- Mode Direct : recherche + création -->
<div v-else class="stack">
<div class="search-row">
<div class="search-input-wrap">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>
<input v-model="nifSearch" type="text" placeholder="Rechercher par NIF…" @keyup.enter="searchContribuable">
</div>
<button type="button" class="btn-dark" @click="searchContribuable">Rechercher</button>
</div>

<div v-if="selectedContribuable" class="alert alert-success">
<div>
<p class="alert-title">{{ selectedContribuable.nom_raison_sociale }}</p>
<p class="alert-meta">NIF : {{ selectedContribuable.nif }} · Tél : {{ selectedContribuable.telephone }}</p>
</div>
<button type="button" class="link-btn" @click="selectedContribuable = null">Changer</button>
</div>

<div v-else class="form-grid">
<input v-model="newContribuable.nif" class="input-base" placeholder="NIF">
<input v-model="newContribuable.nom_raison_sociale" class="input-base" placeholder="Nom / Raison sociale">
<input v-model="newContribuable.telephone" class="input-base" placeholder="Téléphone">
<input v-model="newContribuable.email" class="input-base" type="email" placeholder="Email">
</div>

<div class="field">
<label for="service">Service fiscal</label>
<select id="service" v-model="selectedService" class="input-base">
<option :value="null" disabled>Sélectionnez un service…</option>
<option v-for="s in services" :key="s.id_service" :value="s">
{{ s.libelle_service }}
</option>
</select>
</div>
</div>

<div class="step-nav">
<button type="button" class="btn-ghost" @click="prevStep">Retour</button>
<button type="button" class="btn-next" @click="nextStep" :disabled="!canGoNext">
Continuer
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
</svg>
</button>
</div>
</section>

<!-- ÉTAPE FINALE : Informations dossier -->
<section v-else key="infos" class="card-section">
<div class="section-head">
<h2>Informations du dossier</h2>
<p class="section-sub">Vérifiez les données avant création.</p>
</div>

<div class="form-grid dossier-fields">
<div class="field">
<label>Référence dossier</label>
<input class="input-base mono" :value="previewReference" readonly>
</div>
<div class="field">
<label for="date_predepot">Date de pré-dépôt</label>
<input id="date_predepot" v-model="datePredepot" type="date" class="input-base" :max="todayIso">
</div>
<div class="field field-span">
<label>Statut initial</label>
<div class="statut-row">
<button
v-for="st in statutsDossier"
:key="st.value"
type="button"
class="statut-btn"
:class="{ active: statutDossier === st.value }"
@click="statutDossier = st.value"
>
{{ st.label }}
</button>
</div>
</div>
</div>

<div class="step-nav">
<button type="button" class="btn-ghost" @click="prevStep">Retour</button>
<button
type="button"
class="btn-confirm"
:disabled="isLoading || !canSubmit"
@click="createDossier"
>
<span v-if="isLoading" class="spinner-sm"></span>
{{ isLoading ? 'Création en cours…' : 'Créer le dossier' }}
</button>
</div>
</section>
</transition>
</div>

<!-- ========================================================= -->
<!-- RÉCAPITULATIF LATÉRAL                                      -->
<!-- ========================================================= -->
<aside class="side-col">
<div class="summary-card">
<h3>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
Récapitulatif
</h3>
<dl class="summary-list">
<div>
<dt>Référence</dt>
<dd class="mono">{{ previewReference }}</dd>
</div>
<div>
<dt>Date pré-dépôt</dt>
<dd>{{ datePredepot || '—' }}</dd>
</div>
<div>
<dt>Statut</dt>
<dd><span class="pill statut">{{ statutDossier }}</span></dd>
</div>
<div>
<dt>Contribuable</dt>
<dd>{{ currentContribuable.nom_raison_sociale || '—' }}</dd>
</div>
<div>
<dt>Service</dt>
<dd>{{ selectedService?.libelle_service || selectedRdv?.libelle_service || '—' }}</dd>
</div>
<div>
<dt>RDV lié</dt>
<dd>{{ selectedRdv ? `RDV-${selectedRdv.id_rdv}` : 'Aucun' }}</dd>
</div>
</dl>

<button
type="button"
class="btn-confirm-side"
:disabled="isLoading || !canSubmit"
@click="createDossier"
>
<span v-if="isLoading" class="spinner-sm"></span>
{{ isLoading ? 'Création…' : 'Créer le dossier' }}
</button>

<p class="secure-note">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
</svg>
Un RDV déjà lié ne peut pas ouvrir un 2ᵉ dossier.
</p>
</div>
</aside>
</div>
</template>

<!-- ========================================================= -->
<!-- ÉTAPE 2 : PIÈCES JUSTIFICATIVES                            -->
<!-- ========================================================= -->
<div v-else-if="dossierEtape === 'pieces'" class="pieces-page">

<header class="page-header">
<button type="button" class="btn-back" @click="dossierEtape = 'creation'">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
</svg>
Retour
</button>
<div class="header-left">
<h1>Pièces justificatives</h1>
<p>Déposez les documents requis pour finaliser le dossier.</p>
</div>
</header>

<section v-if="createdDossier" class="card-section">
<!-- Barre de progression globale -->
<div class="progress-bar">
<div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
<span class="progress-text">
{{ uploadedPieces.length }} / {{ requiredPieces.length }} pièces déposées
</span>
</div>

<div v-if="isLoadingPieces" class="loading-state">
<div class="spinner"></div>
<p>Chargement des pièces requises…</p>
</div>

<div v-else-if="piecesError" class="alert alert-danger">
<div>
<p class="alert-title">Impossible de charger les pièces</p>
<p class="alert-meta">{{ piecesError }}</p>
</div>
<button type="button" class="link-btn" @click="loadRequiredPieces">Réessayer</button>
</div>

<div v-else-if="requiredPieces.length" class="pieces-list">

<!-- Pièces obligatoires -->
<div v-if="requiredMandatoryPieces.length" class="pieces-group">
<div class="pieces-group-title">
<span>Pièces obligatoires</span>
<span class="pieces-count">{{ requiredMandatoryPieces.length }}</span>
</div>

<div v-for="piece in requiredMandatoryPieces" :key="piece.id_type_piece" class="piece-item">
<div class="piece-icon" :class="getPieceStatusClass(piece)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3h8l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5h5"/>
</svg>
</div>

<div class="piece-info">
<strong>{{ piece.libelle }}</strong>
<span v-if="piece.description">{{ piece.description }}</span>
<small>Obligatoire</small>
</div>

<div class="piece-upload-area">
<span class="piece-badge" :class="getPieceStatusClass(piece)">
{{ getPieceStatusLabel(piece) }}
</span>

<div v-if="getUploadedPiece(piece.id_type_piece)" class="uploaded-file">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
<span>{{ getUploadedPiece(piece.id_type_piece).nom_fichier }}</span>
</div>

<label class="upload-btn" :class="{ disabled: piece._uploading }">
<input
type="file"
accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
:disabled="piece._uploading"
@change="uploadPiece($event, piece)"
>
<span v-if="piece._uploading">Upload…</span>
<span v-else>{{ getUploadedPiece(piece.id_type_piece) ? 'Remplacer' : 'Choisir un fichier' }}</span>
</label>
</div>
</div>
</div>

<!-- Pièces optionnelles -->
<div v-if="requiredOptionalPieces.length" class="pieces-group">
<div class="pieces-group-title">
<span>Pièces complémentaires</span>
<span class="pieces-count">{{ requiredOptionalPieces.length }}</span>
</div>

<div v-for="piece in requiredOptionalPieces" :key="piece.id_type_piece" class="piece-item">
<div class="piece-icon" :class="getPieceStatusClass(piece)">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3h8l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5h5"/>
</svg>
</div>

<div class="piece-info">
<strong>{{ piece.libelle }}</strong>
<span v-if="piece.description">{{ piece.description }}</span>
<small>Facultative</small>
</div>

<div class="piece-upload-area">
<span class="piece-badge" :class="getPieceStatusClass(piece)">
{{ getPieceStatusLabel(piece) }}
</span>

<div v-if="getUploadedPiece(piece.id_type_piece)" class="uploaded-file">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
<span>{{ getUploadedPiece(piece.id_type_piece).nom_fichier }}</span>
</div>

<label class="upload-btn" :class="{ disabled: piece._uploading }">
<input
type="file"
accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
:disabled="piece._uploading"
@change="uploadPiece($event, piece)"
>
<span v-if="piece._uploading">Upload…</span>
<span v-else>{{ getUploadedPiece(piece.id_type_piece) ? 'Remplacer' : 'Choisir un fichier' }}</span>
</label>
</div>
</div>
</div>
</div>

<div v-else class="empty-state">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>
<p>Aucune pièce configurée pour ce service.</p>
</div>

<!-- Actions finales -->
<div class="pieces-actions">
<button
v-if="createdDossier?.statut_dossier === 'BROUILLON' && uploadedPieces.length > 0"
type="button"
class="btn-submit"
@click="soumettreDossier"
>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
</svg>
Soumettre à la vérification
</button>
</div>
</section>
</div>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import axios from '@/api/Axios'
import { useToast } from 'vue-toastification'
import { animate } from 'motion-v'
import gsap from 'gsap'
import { socket, connectSocket } from '@/services/socket'

/* =========================================================
 * ÉTAT GÉNÉRAL
 * ========================================================= */
const toast = useToast()
const dossierEtape = ref('creation')
const now = new Date()
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const origin = ref('rdv')
const isLoading = ref(false)
const errorMessage = ref('')

/* =========================================================
 * STEPPER
 * ========================================================= */
const currentStepIndex = ref(0)

const steps = computed(() => {
	if (origin.value === 'rdv') {
		return [
			{ id: 'origin', label: 'Origine' },
			{ id: 'rdv', label: 'Rendez-vous' },
			{ id: 'contribuable', label: 'Contribuable' },
			{ id: 'infos', label: 'Informations' }
		]
	}
	return [
		{ id: 'origin', label: 'Origine' },
		{ id: 'contribuable', label: 'Contribuable' },
		{ id: 'infos', label: 'Informations' }
	]
})

const goToStep = (i) => {
	if (i <= currentStepIndex.value) currentStepIndex.value = i
}

const nextStep = () => {
	const max = steps.value.length - 1
	if (currentStepIndex.value < max) currentStepIndex.value++
}

const prevStep = () => {
	if (currentStepIndex.value > 0) currentStepIndex.value--
}

const canGoNext = computed(() => {
	if (origin.value === 'rdv') {
		if (currentStepIndex.value === 0) return true
			if (currentStepIndex.value === 1) return !!selectedRdv.value
				if (currentStepIndex.value === 2) return !!currentServiceId.value
					return true
	} else {
		if (currentStepIndex.value === 0) return true
			if (currentStepIndex.value === 1) return !!currentServiceId.value
				return true
	}
})

/* =========================================================
 * RENDEZ-VOUS
 * ========================================================= */
const rdvQuery = ref('')
const rdvDateFilter = ref('')
const rdvSearched = ref(false)
const rdvResults = ref([])
const selectedRdv = ref(null)
const isLoadingRdvs = ref(false)

/* =========================================================
 * CONTRIBUABLE
 * ========================================================= */
const nifSearch = ref('')
const selectedContribuable = ref(null)
const newContribuable = reactive({
	nif: '',
	nom_raison_sociale: '',
	telephone: '',
	email: ''
})

/* =========================================================
 * SERVICES
 * ========================================================= */
const services = ref([])
const selectedService = ref(null)

/* =========================================================
 * DOSSIER
 * ========================================================= */
const datePredepot = ref(todayIso)
const statutDossier = ref('BROUILLON')
const statutsDossier = [{ value: 'BROUILLON', label: 'Brouillon' }]
const createdDossier = ref(null)

/* =========================================================
 * PIÈCES
 * ========================================================= */
const requiredPieces = ref([])
const isLoadingPieces = ref(false)
const piecesError = ref('')
const uploadedPieces = ref([])

const requiredMandatoryPieces = computed(() => requiredPieces.value.filter(p => p.obligatoire))
const requiredOptionalPieces = computed(() => requiredPieces.value.filter(p => !p.obligatoire))

const progressPercent = computed(() => {
	if (!requiredPieces.value.length) return 0
		return Math.round((uploadedPieces.value.length / requiredPieces.value.length) * 100)
})

function resetForm() {
	// --- Étape ---
	dossierEtape.value = 'creation'
	currentStepIndex.value = 0
	
	// --- Origine ---
	origin.value = 'rdv'
	
	// --- RDV ---
	rdvQuery.value = ''
	rdvDateFilter.value = ''
	rdvSearched.value = false
	rdvResults.value = []
	selectedRdv.value = null
	
	// --- Contribuable ---
	nifSearch.value = ''
	selectedContribuable.value = null
	newContribuable.nif = ''
	newContribuable.nom_raison_sociale = ''
	newContribuable.telephone = ''
	newContribuable.email = ''
	
	// --- Service ---
	selectedService.value = null
	
	// --- Dossier ---
	datePredepot.value = todayIso
	statutDossier.value = 'BROUILLON'
	createdDossier.value = null
	
	// --- Pièces ---
	requiredPieces.value = []
	uploadedPieces.value = []
	isLoadingPieces.value = false
	piecesError.value = ''
	
	// --- Messages ---
	errorMessage.value = ''
	successMessage.value = ''
	
	// ✅ Petit bonus : animation d'apparition pour l'étape 1
	nextTick(() => {
		animatePageEnter('creation')
	})
}

/* =========================================================
 * COMPUTED
 * ========================================================= */
const previewReference = computed(() => createdDossier.value?.reference_dossier || 'Générée automatiquement')

const currentContribuable = computed(() => {
	if (origin.value === 'rdv' && selectedRdv.value) {
		return {
			id_contribuable: selectedRdv.value.id_contribuable,
			nif: selectedRdv.value.nif,
			nom_raison_sociale: selectedRdv.value.nom_raison_sociale
		}
	}
	return selectedContribuable.value || {
		id_contribuable: null,
		nif: newContribuable.nif,
		nom_raison_sociale: newContribuable.nom_raison_sociale
	}
})

const currentServiceId = computed(() => {
	if (origin.value === 'rdv' && selectedRdv.value) return selectedRdv.value.id_service || null
		return selectedService.value?.id_service || null
})

const canSubmit = computed(() => {
	if (!datePredepot.value) return false
		if (!currentServiceId.value) return false
			if (origin.value === 'rdv') return !!selectedRdv.value
				return !!(currentContribuable.value.id_contribuable && currentContribuable.value.nif)
})

/* =========================================================
 * MÉTHODES
 * ========================================================= */
function setOrigin(mode) {
	origin.value = mode
	selectedRdv.value = null
	selectedContribuable.value = null
	selectedService.value = null
	errorMessage.value = ''
	if (mode === 'rdv') searchRdv()
}

function canLinkRdv(rdv) {
	return String(rdv.statut_rdv || '').toUpperCase() === 'CONFIRME' && rdv.hasDossier === false
}

function labelStatutRdv(status) {
	return {
		CONFIRME: 'Confirmé',
		HONORE: 'Honoré',
		ANNULE: 'Annulé',
		ABSENT: 'Absent',
		EN_ATTENTE: 'En attente'
	}[String(status || '').toUpperCase()] || status
}

function formatLongDate(iso) {
	if (!iso) return '—'
		const [y, m, d] = iso.split('-').map(Number)
		return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
			day: '2-digit', month: 'short', year: 'numeric'
		})
}

function selectRdv(rdv) {
	if (!canLinkRdv(rdv)) return
		selectedRdv.value = rdv
		selectedService.value = {
			id_service: rdv.id_service,
			libelle_service: rdv.libelle_service || rdv.service?.libelle_service || `Service #${rdv.id_service}`
		}
}

async function searchRdv() {
	rdvSearched.value = true
	isLoadingRdvs.value = true
	errorMessage.value = ''
	try {
		const q = rdvQuery.value.trim()
		if (!q) {
			rdvSearched.value = false 
			rdvResults.value = []
			errorMessage.value = ''
			return
		}
		
		rdvSearched.value = true 
		isLoadingRdvs.value = true
		errorMessage.value = ''
		
		
		const contribResponse = await axios.get('/contribuables/nif/' + encodeURIComponent(q))
		const contribuable = contribResponse.data?.data || contribResponse.data
		if (!contribuable?.id_contribuable) {
			rdvResults.value = []
			errorMessage.value = 'Aucun contribuable trouvé.'
			return
		}
		const response = await axios.get(`/rendez-vous/contribuable/${contribuable.id_contribuable}`)
		const rows = response.data?.data || []
		rdvResults.value = rows.filter(rdv => !rdvDateFilter.value || rdv.date_rdv === rdvDateFilter.value)
	} catch (error) {
		console.error('Erreur RDV :', error)
		rdvResults.value = []
		errorMessage.value = error.response?.status === 404 
		? 'Aucun contribuable trouvé.' 
		: 'Impossible de charger les rendez-vous.'
	} finally {
		isLoadingRdvs.value = false
	}
}

async function searchContribuable() {
	const nif = nifSearch.value.replace(/\s/g, '').trim()
	if (!nif) {
		errorMessage.value = 'Veuillez saisir un NIF.'
		return
	}
	try {
		const response = await axios.get('/contribuables/nif/' + encodeURIComponent(nif))
		const data = response.data?.data || response.data
		selectedContribuable.value = data || null
		if (!data) errorMessage.value = 'Aucun contribuable trouvé.'
	} catch (error) {
		selectedContribuable.value = null
		errorMessage.value = error.response?.status === 404
		? 'Aucun contribuable trouvé.'
		: 'Erreur lors de la recherche.'
	}
}

async function loadServices() {
	try {
		const response = await axios.get('/services-fiscaux')
		services.value = response.data?.data || response.data || []
	} catch (error) {
		errorMessage.value = 'Impossible de charger les services.'
	}
}

async function loadRequiredPieces() {
	if (!currentServiceId.value) {
		requiredPieces.value = []
		return
	}
	isLoadingPieces.value = true
	piecesError.value = ''
	try {
		const response = await axios.get(`/services-fiscaux/${currentServiceId.value}/pieces-requises`)
		if (!response.data?.success) throw new Error(response.data?.message || 'Erreur')
			requiredPieces.value = response.data.data || []
	} catch (error) {
		requiredPieces.value = []
		piecesError.value = error.response?.data?.message || error.message || 'Erreur'
	} finally {
		isLoadingPieces.value = false
	}
}

function getUploadedPiece(idTypePiece) {
	return uploadedPieces.value.find(p => String(p.id_type_piece) === String(idTypePiece)) || null
}

function getPieceStatus(piece) {
	const uploaded = getUploadedPiece(piece.id_type_piece)
	if (!uploaded) return 'A_FOURNIR'
		return uploaded.statut_verification || 'EN_ATTENTE'
}

function getPieceStatusLabel(piece) {
	const status = getPieceStatus(piece)
	return {
		A_FOURNIR: 'À fournir',
		EN_ATTENTE: 'En attente',
		CONFORME: 'Conforme',
		NON_CONFORME: 'Non conforme'
	}[status] || status
}

function getPieceStatusClass(piece) {
	const status = getPieceStatus(piece)
	return {
		A_FOURNIR: 'required',
		EN_ATTENTE: 'pending',
		CONFORME: 'valid',
		NON_CONFORME: 'invalid'
	}[status] || 'required'
}

async function uploadPiece(event, piece) {
	const file = event.target.files?.[0]
	if (!file) return
		
		const MIME = ['application/pdf', 'image/jpeg', 'image/png']
		if (!MIME.includes(file.type)) {
			toast.error('Format non autorisé (PDF, JPG, PNG uniquement).')
			event.target.value = ''
			return
		}
		if (file.size > 8 * 1024 * 1024) {
			toast.error('Fichier trop volumineux (max 8 Mo).')
			event.target.value = ''
			return
		}
		if (!createdDossier.value?.id_dossier) {
			toast.error('Le dossier doit être créé avant.')
			event.target.value = ''
			return
		}
		
		const formData = new FormData()
		formData.append('fichier', file)
			formData.append('id_type_piece', String(piece.id_type_piece))
				
				try {
					piece._uploading = true
					const response = await axios.post(`/agent/dossiers/${createdDossier.value.id_dossier}/pieces`, formData)
					if (!response.data?.success) throw new Error(response.data?.message || 'Erreur')
						const uploaded = response.data?.data
						if (!uploaded) throw new Error('Pas de données retournées')
							
							const index = uploadedPieces.value.findIndex(p => String(p.id_type_piece) === String(piece.id_type_piece))
							if (index >= 0) uploadedPieces.value[index] = uploaded
								else uploadedPieces.value.push(uploaded)
									
									toast.success(`Pièce « ${piece.libelle} » déposée.`)
				} catch (error) {
					toast.error(error.response?.data?.message || error.message || 'Impossible de déposer.')
				} finally {
					piece._uploading = false
					event.target.value = ''
				}
}

async function createDossier() {
	if (!canSubmit.value) return
		isLoading.value = true
		errorMessage.value = ''
		createdDossier.value = null
		
		try {
			const payload = {
				id_contribuable: currentContribuable.value.id_contribuable,
				id_service: currentServiceId.value,
				id_rdv: origin.value === 'rdv' ? selectedRdv.value.id_rdv : null
			}
			const response = await axios.post('/agent/dossiers', payload)
			const dossier = response.data?.data || response.data
			createdDossier.value = dossier
			toast.success(`Dossier ${dossier.reference_dossier} créé.`)
			await loadRequiredPieces()
			dossierEtape.value = 'pieces'
			await nextTick()
			animatePieces()
		} catch (error) {
			toast.error(error.response?.data?.message || 'Impossible de créer le dossier.')
		} finally {
			isLoading.value = false
		}
}

async function soumettreDossier() {
	if (!createdDossier.value?.id_dossier) return
		try {
			const response = await axios.post(`/agent/dossiers/${createdDossier.value.id_dossier}/soumettre`)
			
			if (!response.data?.success) {
				throw new Error(
					response.data?.message ||
					'Impossible de soumettre le dossier.'
				)
			}
				
				createdDossier.value = response.data.data
				toast.success('Dossier soumis à la vérification.')
				
				setTimeout(() => {
					resetForm()
				}, 1500)
				
		} catch (error) {
			toast.error(error.response?.data?.message || error.message || 'Erreur.')
		}
}

function animatePieces() {
	const items = document.querySelectorAll('.pieces-page .piece-item')
	if (!items.length) return
		gsap.fromTo(items,
					{ opacity: 0, y: 20, scale: 0.98 },
			  { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out' }
		)
}

/* =========================================================
 * SOCKET
 * ========================================================= */
function handleDossierLieRdv(payload) {
	if (!payload?.id_rdv) return
		const rdv = rdvResults.value.find(r => Number(r.id_rdv) === Number(payload.id_rdv))
		if (rdv) rdv.hasDossier = true
}

onMounted(async () => {
	socket.on('DOSSIER_LIE_RDV', handleDossierLieRdv)
	connectSocket()
	await Promise.all([loadServices()])
})

onBeforeUnmount(() => {
	socket.off('DOSSIER_LIE_RDV', handleDossierLieRdv)
})
</script>

<style scoped>
/* ========================================================= */
/* VARIABLES & BASE                                          */
/* ========================================================= */
.dossier-page {
	container-type: inline-size;
	width: 100%;
	min-height: 100vh;
	background: var(--bg);
	color: var(--text);
	font-family: Inter, system-ui, sans-serif;
	overflow-x: hidden;
}
.dossier-page *, .dossier-page *::before, .dossier-page *::after { box-sizing: border-box; }

/* ========================================================= */
/* HEADER                                                    */
/* ========================================================= */
.page-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
	padding: clamp(16px, 3cqi, 28px) clamp(16px, 3cqi, 32px);
	background: var(--card);
	border-bottom: 1px solid var(--border);
}
.header-left h1 {
	margin: 0;
	font-size: clamp(18px, 2.5cqi, 22px);
	font-weight: 800;
}
.header-left p {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--text-muted);
}
.ref-chip {
	display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
	padding: 8px 14px; border-radius: 10px;
	background: var(--hover); border: 1px solid var(--border);
}
.ref-chip span { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.ref-chip strong { font-family: ui-monospace, monospace; font-size: 13px; }

.btn-back {
	display: inline-flex; align-items: center; gap: 6px;
	padding: 8px 14px; border-radius: 8px;
	background: var(--hover); border: 1px solid var(--border);
	color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer;
	transition: all .2s;
}
.btn-back:hover { background: var(--card); transform: translateX(-2px); }
.btn-back svg { width: 14px; height: 14px; }

/* ========================================================= */
/* STEPPER                                                   */
/* ========================================================= */
.stepper {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	padding: 20px clamp(16px, 3cqi, 32px);
	background: var(--card);
	border-bottom: 1px solid var(--border);
	overflow-x: auto;
}
.step {
	display: flex; flex-direction: column; align-items: center; gap: 6px;
	flex: 1; min-width: 80px;
	cursor: default; transition: opacity .3s;
}
.step.clickable { cursor: pointer; }
.step.clickable:hover .step-circle { transform: scale(1.08); }
.step-circle {
	width: 34px; height: 34px;
	border-radius: 50%;
	display: grid; place-items: center;
	background: var(--hover);
	border: 2px solid var(--border);
	color: var(--text-muted);
	font-size: 13px; font-weight: 700;
	transition: all .3s;
}
.step-circle svg { width: 16px; height: 16px; }
.step.active .step-circle {
	background: var(--primary);
	border-color: var(--primary);
	color: #fff;
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 20%, transparent);
}
.step.done .step-circle {
	background: #10b981;
	border-color: #10b981;
	color: #fff;
}
.step-label {
	font-size: 11px; font-weight: 600;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: .04em;
}
.step.active .step-label { color: var(--primary); }

/* ========================================================= */
/* CONTENU PRINCIPAL                                         */
/* ========================================================= */
.content-wrapper {
	width: 100%;
	padding: clamp(16px, 3cqi, 28px);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 20px;
	align-items: start;
}
.main-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.side-col { min-width: 0; }

/* ========================================================= */
/* CARTES                                                    */
/* ========================================================= */
.card-section, .summary-card {
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 14px;
	padding: clamp(18px, 2.5cqi, 26px);
	box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
}
.section-head { margin-bottom: 18px; }
.section-head h2 {
	margin: 0;
	font-size: clamp(15px, 2cqi, 17px);
	font-weight: 700;
}
.section-sub {
	margin: 4px 0 0;
	font-size: 12.5px;
	color: var(--text-muted);
}

/* ========================================================= */
/* ORIGINE                                                   */
/* ========================================================= */
.origin-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;
	margin-bottom: 20px;
}
.origin-card {
	position: relative;
	text-align: left;
	padding: 18px;
	border-radius: 12px;
	cursor: pointer;
	border: 1.5px solid var(--border);
	background: var(--card);
	color: var(--text);
	transition: all .25s ease;
}
.origin-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--primary) 50%, var(--border)); }
.origin-card.active {
	border-color: var(--primary);
	background: color-mix(in srgb, var(--primary) 8%, var(--card));
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
.origin-icon {
	width: 40px; height: 40px;
	border-radius: 10px;
	background: var(--hover);
	display: grid; place-items: center;
	color: var(--primary);
	margin-bottom: 12px;
}
.origin-icon svg { width: 20px; height: 20px; }
.origin-card.active .origin-icon { background: var(--primary); color: #fff; }
.origin-card strong {
	display: block;
	font-size: 14px;
	margin-bottom: 6px;
}
.origin-card > span {
	display: block;
	font-size: 12px;
	color: var(--text-muted);
	line-height: 1.5;
}
.origin-badge {
	position: absolute;
	top: 12px; right: 12px;
	font-size: 10px; font-weight: 700;
	padding: 3px 8px;
	border-radius: 999px;
	background: color-mix(in srgb, #10b981 15%, var(--card));
	color: #059669;
	text-transform: uppercase;
	letter-spacing: .04em;
}

/* ========================================================= */
/* FORMULAIRES                                               */
/* ========================================================= */
.search-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 16px;
}
.search-input-wrap {
	position: relative;
	flex: 1 1 220px;
}
.search-input-wrap svg {
	position: absolute;
	left: 12px; top: 50%;
	transform: translateY(-50%);
	width: 16px; height: 16px;
	color: var(--text-muted);
	pointer-events: none;
}
.search-input-wrap input {
	width: 100%;
	padding: 11px 12px 11px 38px;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	font-size: 13.5px;
	outline: none;
	transition: all .2s;
}
.search-input-wrap input:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
.date-input { flex: 0 1 160px; }

.stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 10px;
}
.dossier-fields { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.field-span { grid-column: 1 / -1; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12.5px; font-weight: 600; }

.input-base {
	width: 100%;
	padding: 11px 14px;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	font-size: 13.5px;
	outline: none;
	transition: all .2s;
}
.input-base:focus {
	border-color: var(--primary);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}
.input-base[readonly] { background: var(--hover); color: var(--text-muted); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }


/* État initial (invitation à chercher) */
.empty-state.initial {
	background: color-mix(in srgb, var(--primary) 5%, var(--card));
	border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
}

.empty-state.initial svg {
	color: var(--primary);
	opacity: .6;
}

/* État "aucun résultat" (recherche infructueuse) */
.empty-state:not(.initial) {
	background: var(--hover);
	border-color: var(--border);
}

.empty-state:not(.initial) svg {
	color: var(--text-muted);
	opacity: .4;
}

/* ========================================================= */
/* BOUTONS                                                   */
/* ========================================================= */
.btn-dark, .btn-confirm, .btn-next, .btn-ghost, .btn-confirm-side, .btn-submit {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 0;
	cursor: pointer;
	font-weight: 700;
	transition: all .2s;
}
.btn-dark {
	background: var(--titlebar);
	color: #fff;
	padding: 11px 18px;
	border-radius: 8px;
	font-size: 13px;
	white-space: nowrap;
}
.btn-dark:hover { opacity: .9; transform: translateY(-1px); }
.btn-dark:disabled { opacity: .5; cursor: not-allowed; }

.btn-confirm {
	background: var(--titlebar);
	color: #fff;
	padding: 13px 20px;
	border-radius: 10px;
	font-size: 14px;
	flex: 1;
}
.btn-confirm:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

.btn-confirm-side {
	width: 100%;
	background: var(--titlebar);
	color: #fff;
	padding: 12px 14px;
	border-radius: 10px;
	font-size: 13.5px;
	margin-top: 4px;
}
.btn-confirm-side:hover:not(:disabled) { opacity: .9; }
.btn-confirm-side:disabled { opacity: .5; cursor: not-allowed; }

.btn-next {
	background: var(--primary);
	color: #fff;
	padding: 12px 20px;
	border-radius: 10px;
	font-size: 13.5px;
	margin-left: auto;
}
.btn-next:hover:not(:disabled) { opacity: .9; transform: translateX(2px); }
.btn-next:disabled { opacity: .4; cursor: not-allowed; }
.btn-next svg { width: 16px; height: 16px; }

.btn-ghost {
	background: transparent;
	color: var(--text-muted);
	padding: 12px 16px;
	border-radius: 10px;
	font-size: 13px;
	border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--hover); color: var(--text); }

.btn-submit {
	width: 100%;
	background: #10b981;
	color: #fff;
	padding: 14px 20px;
	border-radius: 10px;
	font-size: 14px;
	margin-top: 16px;
}
.btn-submit:hover { opacity: .9; transform: translateY(-1px); }
.btn-submit svg { width: 18px; height: 18px; }

/* Navigation entre étapes */
.step-nav {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-top: 24px;
	padding-top: 20px;
	border-top: 1px solid var(--border);
}

/* ========================================================= */
/* ALERTES                                                   */
/* ========================================================= */
.alert {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	padding: 14px;
	border-radius: 10px;
	border: 1px solid var(--border);
}
.alert-info {
	background: color-mix(in srgb, var(--primary) 8%, var(--card));
	border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}
.alert-success {
	background: color-mix(in srgb, #10b981 10%, var(--card));
	border-color: color-mix(in srgb, #10b981 30%, var(--border));
}
.alert-danger {
	background: color-mix(in srgb, #ef4444 8%, var(--card));
	border-color: color-mix(in srgb, #ef4444 30%, var(--border));
}
.alert-title { margin: 0; font-size: 13.5px; font-weight: 700; }
.alert-meta { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }
.link-btn {
	border: 0; background: none;
	color: var(--primary);
	font-size: 12px; font-weight: 700;
	cursor: pointer; white-space: nowrap;
}
.link-btn:hover { text-decoration: underline; }

/* ========================================================= */
/* ÉTATS                                                     */
/* ========================================================= */
.empty-state, .loading-state {
	padding: 40px 20px;
	text-align: center;
	color: var(--text-muted);
	background: var(--hover);
	border: 1px dashed var(--border);
	border-radius: 12px;
}
.empty-state svg {
	width: 48px; height: 48px;
	color: var(--text-muted);
	opacity: .5;
	margin-bottom: 10px;
}
.empty-state p, .loading-state p {
	margin: 0;
	font-size: 13.5px;
}
.loading-state .spinner {
	width: 32px; height: 32px;
	border: 3px solid var(--border);
	border-top-color: var(--primary);
	border-radius: 50%;
	margin: 0 auto 12px;
	animation: spin .8s linear infinite;
}

/* ========================================================= */
/* TABLE RDV                                                 */
/* ========================================================= */
.rdv-table-wrap {
	overflow-x: auto;
	border: 1px solid var(--border);
	border-radius: 10px;
	margin-top: 4px;
}
.data-table {
	width: 100%;
	min-width: 640px;
	border-collapse: collapse;
	font-size: 13px;
}
.data-table th {
	text-align: left;
	padding: 10px 12px;
	background: var(--hover);
	color: var(--text-muted);
	font-weight: 600;
	font-size: 11.5px;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.data-table td {
	padding: 12px;
	border-top: 1px solid var(--border);
	vertical-align: top;
}
.data-table tr.selected td {
	background: color-mix(in srgb, var(--primary) 8%, var(--card));
}
.data-table tr.disabled td { opacity: .55; }
.cell-main { font-weight: 700; }
.cell-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.pill {
	display: inline-flex;
	padding: 3px 9px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 700;
	background: var(--hover);
	color: var(--text-muted);
}
.pill.confirme { background: color-mix(in srgb, #10b981 18%, var(--card)); color: #059669; }
.pill.honore { background: color-mix(in srgb, var(--primary) 18%, var(--card)); color: var(--primary); }
.pill.annule { background: color-mix(in srgb, #ef4444 16%, var(--card)); color: #dc2626; }
.pill.statut { background: color-mix(in srgb, var(--primary) 12%, var(--card)); color: var(--primary); }

/* ========================================================= */
/* CHAMPS VERROUILLÉS                                        */
/* ========================================================= */
.locked-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;
	margin-bottom: 20px;
}
.locked-field {
	padding: 14px;
	border-radius: 10px;
	background: var(--hover);
	border: 1px solid var(--border);
}
.locked-field span {
	display: block;
	font-size: 11px;
	color: var(--text-muted);
	margin-bottom: 4px;
	text-transform: uppercase;
	letter-spacing: .04em;
	font-weight: 700;
}
.locked-field strong {
	display: block;
	font-size: 14px;
}
.locked-field small {
	display: block;
	margin-top: 4px;
	font-size: 11px;
	color: var(--text-muted);
}

/* ========================================================= */
/* STATUTS                                                   */
/* ========================================================= */
.statut-row { display: flex; flex-wrap: wrap; gap: 8px; }
.statut-btn {
	border: 1px solid var(--border);
	background: var(--card);
	color: var(--text);
	padding: 8px 14px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	transition: all .2s;
}
.statut-btn:hover { border-color: var(--primary); }
.statut-btn.active {
	background: var(--primary);
	border-color: var(--primary);
	color: #fff;
}

/* ========================================================= */
/* RÉCAPITULATIF LATÉRAL                                     */
/* ========================================================= */
.summary-card { position: sticky; top: 20px; }
.summary-card h3 {
	margin: 0 0 16px;
	font-size: 15px;
	display: flex;
	align-items: center;
	gap: 8px;
}
.summary-card h3 svg {
	width: 18px; height: 18px;
	color: var(--primary);
}
.summary-list {
	margin: 0 0 18px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.summary-list div {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--border);
}
.summary-list div:last-child { border-bottom: 0; padding-bottom: 0; }
.summary-list dt {
	font-size: 11.5px;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: .04em;
	font-weight: 600;
}
.summary-list dd {
	margin: 0;
	font-size: 12.5px;
	font-weight: 700;
	text-align: right;
	word-break: break-word;
}
.secure-note {
	margin: 14px 0 0;
	font-size: 11px;
	color: var(--text-muted);
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	line-height: 1.4;
}
.secure-note svg {
	width: 14px; height: 14px;
	flex-shrink: 0;
}

/* ========================================================= */
/* PAGE PIÈCES                                               */
/* ========================================================= */
.pieces-page {
	min-height: 100vh;
	background: var(--bg);
}
.pieces-page .card-section { margin: 20px clamp(16px, 3cqi, 32px); }

.progress-bar {
	position: relative;
	height: 8px;
	background: var(--hover);
	border-radius: 999px;
	overflow: hidden;
	margin-bottom: 24px;
}
.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, var(--primary), #10b981);
	border-radius: 999px;
	transition: width .5s ease;
}
.progress-text {
	position: absolute;
	top: 14px;
	right: 0;
	font-size: 11.5px;
	color: var(--text-muted);
	font-weight: 600;
}

.pieces-list {
	display: flex;
	flex-direction: column;
	gap: 20px;
}
.pieces-group {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.pieces-group-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 12.5px;
	font-weight: 700;
	color: var(--text);
	text-transform: uppercase;
	letter-spacing: .04em;
}
.pieces-count {
	min-width: 24px;
	height: 24px;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	background: var(--hover);
	color: var(--text-muted);
	font-size: 11px;
}

.piece-item {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--card);
	transition: all .2s;
}
.piece-item:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }

.piece-icon {
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	border-radius: 10px;
	background: var(--hover);
	color: var(--primary);
	transition: all .3s;
}
.piece-icon svg { width: 20px; height: 20px; }
.piece-icon.valid { background: color-mix(in srgb, #10b981 15%, var(--card)); color: #10b981; }
.piece-icon.invalid { background: color-mix(in srgb, #ef4444 15%, var(--card)); color: #ef4444; }
.piece-icon.pending { background: color-mix(in srgb, #3b82f6 15%, var(--card)); color: #3b82f6; }

.piece-info {
	min-width: 0;
	flex: 1;
}
.piece-info strong {
	display: block;
	font-size: 13.5px;
}
.piece-info span {
	display: block;
	margin-top: 3px;
	font-size: 11.5px;
	color: var(--text-muted);
}
.piece-info small {
	display: block;
	margin-top: 4px;
	font-size: 10.5px;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: .04em;
	font-weight: 600;
}

.piece-upload-area {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8px;
	flex-shrink: 0;
	min-width: 170px;
}

.piece-badge {
	display: inline-flex;
	align-items: center;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 10.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.piece-badge.required { background: color-mix(in srgb, #f59e0b 15%, var(--card)); color: #d97706; }
.piece-badge.pending { background: color-mix(in srgb, #3b82f6 15%, var(--card)); color: #2563eb; }
.piece-badge.valid { background: color-mix(in srgb, #10b981 15%, var(--card)); color: #059669; }
.piece-badge.invalid { background: color-mix(in srgb, #ef4444 15%, var(--card)); color: #dc2626; }

.uploaded-file {
	display: flex;
	align-items: center;
	gap: 6px;
	max-width: 200px;
	font-size: 11px;
	color: #059669;
	font-weight: 600;
}
.uploaded-file svg { width: 14px; height: 14px; flex-shrink: 0; }
.uploaded-file span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.upload-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 8px 14px;
	border-radius: 8px;
	background: var(--titlebar);
	color: #fff;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
	white-space: nowrap;
	transition: all .2s;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.upload-btn:hover { transform: translateY(-1px); opacity: .92; }
.upload-btn.disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }
.upload-btn input[type="file"] { display: none; }

.pieces-actions { margin-top: 20px; }

/* ========================================================= */
/* SPINNERS                                                  */
/* ========================================================= */
.spinner-sm {
	width: 14px; height: 14px;
	border: 2px solid rgba(255,255,255,.3);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin .7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ========================================================= */
/* TRANSITIONS VUE                                           */
/* ========================================================= */
.slide-fade-enter-active,
.slide-fade-leave-active {
	transition: all .3s ease;
}
.slide-fade-enter-from {
	opacity: 0;
	transform: translateY(10px);
}
.slide-fade-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

/* ========================================================= */
/* RESPONSIVE                                                */
/* ========================================================= */
@container dossier (min-width: 880px) {
	.content-wrapper {
		grid-template-columns: minmax(0, 1.7fr) minmax(280px, 360px);
	}
}

@container dossier (max-width: 640px) {
	.summary-card { position: static; }
	.piece-item { flex-wrap: wrap; }
	.piece-upload-area { width: 100%; align-items: stretch; min-width: 0; }
	.upload-btn { width: 100%; }
	.step-nav { flex-direction: column-reverse; }
	.btn-next, .btn-confirm { width: 100%; }
	.stepper { justify-content: flex-start; gap: 16px; }
	.step { flex: 0 0 auto; min-width: 70px; }
}
</style>
