
import { Router } from 'express'
import { RendezVousController } from '../Controllers/rendezVousController.js'
import auth from '../middleware/Auth.js'

const router = Router()


// ============================================================
// LISTE DES RENDEZ-VOUS
// ============================================================

router.get(
	'/',auth,
	RendezVousController.getAll
)


// ============================================================
// RENDEZ-VOUS PAR DATE
// IMPORTANT : cette route doit être avant /:id
// ============================================================

router.get(
	'/date/:date',
	RendezVousController.getByDate
)


// ============================================================
// RENDEZ-VOUS D'UN CONTRIBUABLE
// ============================================================

router.get(
	'/contribuable/:id',
	RendezVousController.getByContribuable
)

router.get('/rdv/disponibilites', RendezVousController.getDisponibilites)

// ============================================================
// RENDEZ-VOUS PAR ID
// ============================================================

router.get('/:id',RendezVousController.getById)


// ============================================================
// CRÉER UN RENDEZ-VOUS
// ============================================================

router.post(
	'/',
	RendezVousController.create
)


// ============================================================
// MODIFIER UN RENDEZ-VOUS
// ============================================================

router.patch(
	'/:id',
	RendezVousController.update
)


// ============================================================
// MODIFIER LE STATUT
// ============================================================

router.patch(
	'/:id/statut',
	RendezVousController.updateStatus
)

router.patch('/:id/confirmer' ,RendezVousController.confirm )

router.patch('/:id/absent', RendezVousController.absent)

// ============================================================
// ANNULER
// ============================================================

router.patch(
	'/:id/annuler',
	RendezVousController.cancel
)


// ============================================================
// SUPPRIMER
// ============================================================

router.delete(
	'/:id',
	RendezVousController.remove
)


export default router
