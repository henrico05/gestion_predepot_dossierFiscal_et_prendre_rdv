import express from 'express'
import {
	TicketFileAttenteController
} from '../Controllers/ticketFileAttenteController.js'

import {
	authAgent
} from '../middleware/Auth.js'

const router = express.Router()

// Modifier le statut d'un ticket
router.patch(
	'/:id/status',
	authAgent,
	TicketFileAttenteController.updateStatus
)

export default router
