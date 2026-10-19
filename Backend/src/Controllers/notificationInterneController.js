import { NotificationInterneModel } from '../Models/notificationInterneModel.js'

export const NotificationInterneController = {
	async list(req, res) {
		try {
			if (req.user?.role !== 'CHEF_CENTRE') {
				return res.status(403).json({ success: false, message: 'Réservé au chef de service.' })
			}
			
			const unread = await NotificationInterneModel.countNonLues()
			const data = await NotificationInterneModel.findRecent({ limit: 50 })
			
			return res.json({ success: true, unread, data })
		} catch (error) {
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	async lire(req, res) {
		try {
			if (req.user?.role !== 'CHEF_CENTRE') {
				return res.status(403).json({ success: false, message: 'Réservé au chef de service.' })
			}
			
			const row = await NotificationInterneModel.marquerLue(req.params.id)
			if (!row) {
				return res.status(404).json({ success: false, message: 'Notification introuvable.' })
			}
			return res.json({ success: true, data: row })
		} catch (error) {
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	async lireToutes(req, res) {
		try {
			if (req.user?.role !== 'CHEF_CENTRE') {
				return res.status(403).json({ success: false, message: 'Réservé au chef de service.' })
			}
			
			const n = await NotificationInterneModel.marquerToutesLues()
			return res.json({ success: true, updated: n })
		} catch (error) {
			return res.status(500).json({ success: false, message: error.message })
		}
	}
}
