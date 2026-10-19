import express from 'express'

import {
	mesNotifications,
	lireNotification
} from '../Controllers/NotificationController.js'

import auth from '../middleware/Auth.js'

const router = express.Router()

// Récupérer les notifications du contribuable connecté
router.get(
	'/',
	auth,
	mesNotifications
)

// Marquer une notification comme lue
router.patch(
	'/:id/lire',
	auth,
	lireNotification
)

export default router
