import { Router } from 'express'

import {
	register,
	verifyEmail,
	login,
	getPendingAgents,
	reviewAgent,
	updateChefCentre,
	getChefCentres,
	getPendingApproved,
	updateAgentStatus,
	resendVerification,
	updateAgent
} from '../Controllers/authAgentController.js'

import auth from '../middleware/Auth.js'
import {
	requireChefService,
	requireChefOrRole
} from '../middleware/chefAcces.js'

const router = Router()


// ======================================================
// ROUTES PUBLIQUES
// ======================================================

router.post('/register', register)

router.get('/verify-email/:token', verifyEmail)
router.get('/resend-email/:token',resendVerification)
router.post('/login', login)


// ======================================================
// ROUTES PROTÉGÉES
// ======================================================

// Agents en attente
router.get(
	'/admin/agents/pending',
	auth,
	requireChefService,
	getPendingAgents
)


// Chef de centre
router.get(
	'/admin',
	auth,
	requireChefService,
	getChefCentres
)


// Agents approuvés
router.get(
	'/admin/agents/approved',
	auth,
	requireChefService,
	getPendingApproved
)


// ======================================================
// APPROUVER / REFUSER UN AGENT
// ======================================================

router.patch(
	'/admin/review/:id',
	auth,
	requireChefService,
	reviewAgent
)


// ======================================================
// MODIFIER LE CHEF DE CENTRE
// ======================================================

router.patch(
	'/admin/edit/:role',
	auth,
	requireChefService,
	updateChefCentre
)

router.patch(
	'/admin/agent/:id',
	auth,
	requireChefService,
	updateAgent
)
// ======================================================
// ACTIVER / DÉSACTIVER UN AGENT
// ======================================================

router.patch(
	'/admin/agents/:id',
	auth,
	requireChefService,
	updateAgentStatus
)


export default router
