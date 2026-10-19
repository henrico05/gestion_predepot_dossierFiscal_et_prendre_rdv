import { NotificationInterneModel } from '../Models/notificationInterneModel.js'
import { getIO } from '../Socket/socket.js'

export async function notifyChef(payload, db = null) {
	try {
		const typeActeur = String(payload.type_acteur || '').toUpperCase()
		if (typeActeur === 'CHEF_CENTRE') return null
			
			const notif = await NotificationInterneModel.create(db, payload)
			
			try {
				getIO().to('role:CHEF_CENTRE').emit('chef:notification', {
					id_notification: notif.id_notification,
					type_notification: notif.type_notification,
					contenu: notif.contenu,
					type_acteur: notif.type_acteur,
					nom_acteur: notif.nom_acteur,
					action: notif.action,
					date_creation: notif.date_creation,
					lu: false
				})
			} catch {}
			
			return notif
	} catch (error) {
		console.error('⚠️ notifyChef :', error.message)
		return null
	}
}
