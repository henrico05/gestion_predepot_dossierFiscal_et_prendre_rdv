import { Router } from 'express'

import ContribuableController
from '../Controllers/ContribuableController.js'
import auth, { authContribuable } from '../middleware/Auth.js'

const router = Router()


// =========================================================
// INSCRIPTION
// =========================================================
// POST /api/contribuables/register

router.post(
	'/register',
	ContribuableController.registerContribuable
)

router.post('/register/by_agent',ContribuableController.createByAgent)

// =========================================================
// CONNEXION
// =========================================================
// POST /api/contribuables/login

router.post(
	'/login',
	ContribuableController.loginContribuable
)


// =========================================================
// VERIFICATION EMAIL
// =========================================================
// GET /api/contribuables/verify-email/:token

router.get(
	'/verify-email/:token',
	ContribuableController.verifyContribuableEmail
)
router.get('/resend-email/:token',ContribuableController.resendVerification)

router.get('/pending',ContribuableController.getPendingContribuables)
router.get('/approved',ContribuableController.getPendingApproved)

// =========================================================
// LISTE DES CONTRIBUABLES
// =========================================================
// GET /api/contribuables
//
// Par défaut : actifs uniquement
//
// ?includeInactive=true
// → actifs + inactifs

router.get(
	'/',
	ContribuableController.getAllContribuables
)


// =========================================================
// RECHERCHE PAR NIF
// =========================================================
// GET /api/contribuables/nif/:nif

router.get(
	'/nif/:nif',
	ContribuableController.getByNif
)


router.get('/me', authContribuable, ContribuableController.getMe)
router.patch('/me', authContribuable, ContribuableController.updateMe)
router.patch('/me/password', authContribuable, ContribuableController.changePassword)

// =========================================================
// RECUPERER PAR ID
// =========================================================
// GET /api/contribuables/:id

router.get(
	'/:id',
	ContribuableController.getContribuableById
)


// =========================================================
// MODIFIER
// =========================================================
// PATCH /api/contribuables/:id

router.patch(
	'/:id',
	ContribuableController.updateContribuable
)

router.patch('/:id/admin',auth,ContribuableController.reviewContribuable)


// =========================================================
// DESACTIVER
// =========================================================
// PATCH /api/contribuables/:id/deactivate

router.patch(
	'/:id/deactivate',
	ContribuableController.deactivateContribuable
)


// =========================================================
// ACTIVER
// =========================================================
// PATCH /api/contribuables/:id/activate

router.patch(
	'/:id/activate',
	ContribuableController.activateContribuable
)


// =========================================================
// SUPPRIMER
// =========================================================
// DELETE /api/contribuables/:id

router.delete(
	'/:id',
	ContribuableController.deleteContribuable
)


export default router
