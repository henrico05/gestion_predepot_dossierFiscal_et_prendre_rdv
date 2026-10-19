import { ref } from 'vue'

/* ============================================================
 * ANNONCE VOCALE — Speech Synthesis API
 * ============================================================ */

const isEnabled = ref(true)
const isSpeaking = ref(false)

let voicesLoaded = false
let frenchVoice = null

/* ============================================================
 * Charger les voix disponibles
 * ============================================================ */
function loadVoices() {
	if (!('speechSynthesis' in window)) {
		return
	}
	
	const voices = window.speechSynthesis.getVoices()
	
	if (!voices.length) {
		return
	}
	
	/* Chercher une voix française */
	frenchVoice =
	voices.find(v => v.lang?.toLowerCase() === 'fr-fr')
	|| voices.find(v => v.lang?.toLowerCase().startsWith('fr'))
	|| voices[0]
	
	voicesLoaded = true
	
	console.log(
		'🎙️ Voix sélectionnée :',
		frenchVoice?.name,
		frenchVoice?.lang
	)
}

if ('speechSynthesis' in window) {
	window.speechSynthesis.addEventListener(
		'voiceschanged',
		loadVoices
	)
}

/* ============================================================
 * Annoncer un ticket
 * ============================================================ */
export function useVoiceAnnouncer() {
	
	/**
	 * Annonce : "Ticket A-005, veuillez vous présenter au guichet numéro 3"
	 */
	function annoncerTicket(numeroTicket, numeroGuichet) {
		
		console.log('🔊 annoncerTicket() appelée avec :', {
			numeroTicket,
			numeroGuichet
		})
		
		if (!isEnabled.value) {
			console.log('🔇 Annonce désactivée')
			return
		}
		
		if (!('speechSynthesis' in window)) {
			console.warn(
				'⚠️ Speech Synthesis non supporté par ce navigateur'
			)
			return
		}
		
		if (!numeroTicket) {
			console.warn('⚠️ Numéro de ticket manquant')
			return
		}
		
		/* Charger les voix disponibles */
		loadVoices()
		
		/* Numéro prononcé chiffre par chiffre */
		const numeroTexte =
		formatTicketPourVoix(numeroTicket)
			
			const guichetTexte =
			numeroGuichet
			? `, veuillez vous présenter au guichet numéro ${numeroGuichet}`
			: ''
			
			const texte =
			`Ticket ${numeroTexte}${guichetTexte}.`
			
			console.log('🗣️ Texte à prononcer :', texte)
			
			/* Arrêter une annonce précédente */
			window.speechSynthesis.cancel()
			
			/* Créer la voix */
			const utterance =
			new SpeechSynthesisUtterance(texte)
			
			utterance.lang = 'fr-FR'
			utterance.rate = 0.9
			utterance.pitch = 1
			utterance.volume = 1
			
			/* Utiliser une voix française si disponible */
			if (frenchVoice) {
				utterance.voice = frenchVoice
			}
			
			utterance.onstart = () => {
				isSpeaking.value = true
				
				console.log(
					'🔊 ANNONCE VOCALE DÉMARRÉE :',
				texte
				)
			}
			
			utterance.onend = () => {
				isSpeaking.value = false
				
				console.log(
					'🔊 ANNONCE VOCALE TERMINÉE'
				)
			}
			
			utterance.onerror = (event) => {
				isSpeaking.value = false
				
				console.error(
					'❌ ERREUR SPEECH SYNTHESIS :',
				  event
				)
			}
			
			/* Lancer la voix */
			window.speechSynthesis.speak(utterance)
	}
	
	/**
	 * Formater le numéro pour qu'il soit bien prononcé
	 * "A-005" → "A 0 0 5" (au lieu de "A moins cinq" ou autre)
	 */
	function formatTicketPourVoix(numero) {
		if (!numero) return ''
			
			/* Ex: "A-005" → "A 0 0 5" */
			return String(numero)
			.replace(/-/g, ' ')       // Tirets en espaces
			.split('')
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim()
	}
	
	/**
	 * Test rapide
	 */
	function tester() {
		annoncerTicket('A-005', '3')
	}
	
	/**
	 * Activer/désactiver
	 */
	function toggle() {
		isEnabled.value = !isEnabled.value
		if (!isEnabled.value) {
			window.speechSynthesis?.cancel()
		}
	}
	
	return {
		isEnabled,
		isSpeaking,
		annoncerTicket,
		tester,
		toggle
	}
}
