<script setup>
import { ref, onMounted } from 'vue';
import gsap from 'gsap';
import TaxHeader from '../components/Depot/TaxHeader.vue';
import DocumentList from '../components/Depot/DocumentList.vue';
import FileUploadZone from '../components/Depot/FileUploadZone.vue';
import UploadedFilesTable from '../components/Depot/UploadedFilesTable.vue';
import ActionBar from '../components/Depot/ActionBar.vue';
import { requiredDocuments } from '../data/documents.js';

// Données réactives
const documents = ref(requiredDocuments);
const uploadedFiles = ref([
	{ id: 1, name: 'CIN_Rakoto_20240415.pdf', size: '1,24 Mo' },
	{ id: 2, name: 'Attestation_NIF_20240320.pdf', size: '856 Ko' }
]);

// Actions
const deleteFile = (id) => {
	uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id);
};

const handleSave = () => console.log('Brouillon sauvegardé');
const handleBack = () => console.log('Retour à l\'étape précédente');
const handleSubmit = () => console.log('Dossier soumis');

onMounted(() => {
	// Animation GSAP pour faire apparaître les composants en cascade
	gsap.from('.document-section, .upload-section, .action-section', {
		y: 30,
		opacity: 0,
		duration: 0.8,
		stagger: 0.15,
		ease: 'power3.out'
	});
});
</script>

<template>
<div class="min-h-screen bg-gray-50 flex flex-col">

gucoufu oou fg g u  gkg ou giu gigoh
<TaxHeader />

<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-10">

<!-- Section 1 : Documents requis -->
<div class="document-section">
<DocumentList :documents="documents" />
</div>

<!-- Section 2 : Upload et Fichiers -->
<div class="upload-section mt-8">
<FileUploadZone />
<UploadedFilesTable :files="uploadedFiles" @delete-file="deleteFile" />
</div>

<!-- Section 3 : Barre d'actions -->
<div class="action-section">
<ActionBar 
@save="handleSave" 
@back="handleBack" 
@submit="handleSubmit" 
/>
</div>

</main>
</div>
</template>
