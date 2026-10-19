export const contribuableInfo = {
	nif: '123 456 789',
	nom: 'DUPONT ENTREPRISES SARL',
	telephone: '06 12 34 56 78',
	adresse: '12 rue des Lilas, 75012 PARIS',
	periode: '01/01/2025 au 31/12/2025'
};

export const documents = [
	{ id: 1, type: 'id', nom: 'Pièce d’identité du représentant légal', fichier: 'CNI_recto_verso.pdf', taille: '1,2 Mo', date: '12/05/2026', statut: 'CONFORME' },
{ id: 2, type: 'pdf', nom: 'Extrait Kbis', fichier: 'extrait_kbis_2026.pdf', taille: '856 Ko', date: '12/05/2026', statut: 'CONFORME' },
{ id: 3, type: 'xl', nom: 'Liasse fiscale 2025', fichier: 'liasse_fiscale_2025.pdf', taille: '2,4 Mo', date: '12/05/2026', statut: 'CONFORME' },
{ id: 4, type: 'eur', nom: 'Factures d’achats (échantillon)', fichier: 'factures_achats_janv_mars_2026.pdf', taille: '1,8 Mo', date: '12/05/2026', statut: 'NON_CONFORME' },
{ id: 5, type: 'bank', nom: 'Relevé bancaire (janv. – mars 2026)', fichier: 'releve_bancaire_Q1_2026.pdf', taille: '1,1 Mo', date: '12/05/2026', statut: 'CONFORME' },
{ id: 6, type: 'home', nom: 'Quittance de loyer', fichier: 'quittance_loyer_2026.pdf', taille: '420 Ko', date: '12/05/2026', statut: 'EN_ATTENTE' },
{ id: 7, type: 'contract', nom: 'Contrat de location', fichier: 'contrat_location.pdf', taille: '780 Ko', date: '12/05/2026', statut: 'CONFORME' }
];

export const historique = [
	{ date: '12/05/2026 10:15', auteur: 'Par Système automatique', action: 'Dossier soumis' },
{ date: '12/05/2026 10:16', auteur: 'Agent Vérificateur (DV - Unité 7510)', action: 'Dossier assigné' },
{ date: '12/05/2026 10:18', auteur: 'Par Agent Vérificateur', action: 'Vérification démarrée' },
{ date: '12/05/2026 11:42', auteur: 'Par Agent Vérificateur', action: 'Pièce non conforme détectée', detail: 'Factures d’achats (échantillon)', error: true },
{ date: '12/05/2026 11:45', auteur: 'Par Agent Vérificateur', action: 'Commentaire ajouté', detail: 'Merci de fournir les factures d’achats manquantes pour la période de janvier.' }
];

export const initialComments = [
	{ id: 1, auteur: 'Agent Vérificateur', date: '12/05/2026 11:45', texte: 'Merci de fournir les factures d’achats manquantes pour la période de janvier.', interne: true }
];
