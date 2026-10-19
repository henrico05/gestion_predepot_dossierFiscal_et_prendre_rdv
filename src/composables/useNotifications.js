import { ref } from 'vue'
import api from '@/api/Axios'

/* ============================================================
 * ÉTAT PARTAGÉ (singleton)
 * ============================================================ */
const notifications = ref([])
const unreadCount   = ref(0)
const isLoading     = ref(false)

export function useNotifications() {
	
	/* ---------- Charger depuis l'API ---------- */
	async function loadNotifications() {
		isLoading.value = true
		try {
			const res = await api.get('/notifications')
			notifications.value = res.data.data || []
			unreadCount.value   = res.data.unread ?? notifications.value.filter(n => n.statut_envoi !== 'LU').length
		} catch (error) {
			console.error('❌ Erreur chargement notifications :', error)
			notifications.value = []
			unreadCount.value   = 0
		} finally {
			isLoading.value = false
		}
	}
	
	/* ---------- Marquer une notification comme lue ---------- */
	async function lireNotification(notification) {
		if (!notification || notification.statut_envoi === 'LU') return
			
			try {
				await api.patch(`/notifications/${notification.id_notification}/lire`)
				notification.statut_envoi = 'LU'
				
				// ⭐ Décrément global — tous les composants voient le changement
				if (unreadCount.value > 0) unreadCount.value--
			} catch (error) {
				console.error('❌ Erreur lecture notification :', error)
			}
	}
	
	/* ---------- Ajouter une nouvelle notification (via socket) ---------- */
	function ajouterNotification(notification) {
		notifications.value.unshift(notification)
		unreadCount.value++
	}
	
	/* ---------- Tout marquer comme lu ---------- */
	async function marquerToutCommeLu() {
		const nonLues = notifications.value.filter(n => n.statut_envoi !== 'LU')
		
		try {
			await Promise.all(
				nonLues.map(n => api.patch(`/notifications/${n.id_notification}/lire`))
			)
			notifications.value.forEach(n => { n.statut_envoi = 'LU' })
			unreadCount.value = 0
		} catch (error) {
			console.error('❌ Erreur marquage global :', error)
			throw error
		}
	}
	
	return {
		// State
		notifications,
		unreadCount,
		isLoading,
		// Actions
		loadNotifications,
		lireNotification,
		ajouterNotification,
		marquerToutCommeLu
	}
}
