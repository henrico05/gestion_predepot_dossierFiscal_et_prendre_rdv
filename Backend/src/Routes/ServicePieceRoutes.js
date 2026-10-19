import { Router } from 'express'
import { ServicePieceController } from '../Controllers/ServicePieceController.js'

const router = Router()


// ============================================================
// Récupérer les pièces d'un service
// GET /api/admin/services/:idService/pieces
// ============================================================

router.get(
	'/services/:idService/pieces',
	ServicePieceController.getByService
)


// ============================================================
// Remplacer toutes les pièces d'un service
//
// PUT /api/admin/services/:idService/pieces
//
// C'est cette route qui correspond à ton saveService()
// ============================================================

router.put(
	'/services/:idService/pieces',
	ServicePieceController.replacePieces
)


// ============================================================
// Ajouter une seule pièce
// POST /api/admin/services/:idService/pieces
// ============================================================

router.post(
	'/services/:idService/pieces',
	ServicePieceController.create
)


// ============================================================
// Modifier obligatoire/facultatif
// PATCH /api/admin/services/:idService/pieces/:idTypePiece
// ============================================================

router.patch(
	'/services/:idService/pieces/:idTypePiece',
	ServicePieceController.update
)


// ============================================================
// Retirer une pièce d'un service
// DELETE /api/admin/services/:idService/pieces/:idTypePiece
// ============================================================

router.delete(
	'/services/:idService/pieces/:idTypePiece',
	ServicePieceController.remove
)


export default router
