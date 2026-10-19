
import { NotificationModel } from '../Models/NotificationModel.js'

/**
 * ============================================================
 * RÉCUPÉRER LES NOTIFICATIONS DU CONTRIBUABLE
 * ============================================================
 */
export async function mesNotifications(req, res) {
	try {
		const idContribuable =
		req.user.id_contribuable || req.user.id
		
		if (!idContribuable) {
			return res.status(401).json({
				success: false,
				message: 'Contribuable non identifié.'
			})
		}
		
		console.log(
			'🔔 Chargement notifications contribuable :',
			idContribuable
		)
		
		const unread =
		await NotificationModel.countNonLues(idContribuable)
		
		const data =
		await NotificationModel.findPortail(idContribuable)
		
		return res.json({
			success: true,
			unread,
			data
		})
		
	} catch (error) {
		console.error(
			'❌ Erreur récupération notifications :',
			error
		)
		
		return res.status(500).json({
			success: false,
			message: 'Erreur lors du chargement des notifications'
		})
	}
}


/**
 * ============================================================
 * MARQUER UNE NOTIFICATION COMME LUE
 * ============================================================
 */
export async function lireNotification(req, res) {
	try {
		const idContribuable =
		req.user.id_contribuable || req.user.id
		
		if (!idContribuable) {
			return res.status(401).json({
				success: false,
				message: 'Contribuable non identifié.'
			})
		}
		
		const row =
		await NotificationModel.marquerLue(
			req.params.id,
			idContribuable
		)
		
		if (!row) {
			return res.status(404).json({
				success: false,
				message: 'Notification introuvable.'
			})
		}
		
		return res.json({
			success: true,
			data: row
		})
		
	} catch (error) {
		console.error(
			'❌ Erreur lecture notification :',
			error
		)
		
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la lecture de la notification'
		})
	}
}
