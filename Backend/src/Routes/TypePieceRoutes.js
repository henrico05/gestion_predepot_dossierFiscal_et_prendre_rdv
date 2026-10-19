import { Router } from 'express'
import { TypePieceController } from '../Controllers/TypePieceController.js'
// import { authenticate, requireRole } from '../Middlewares/auth.js'
// -> à adapter avec ton middleware d'authentification existant (celui utilisé pour AgentModel)

const router = Router()

// ==================== ROUTES PUBLIQUES / CONTRIBUABLE-AGENT ====================
// Utilisées par le portail et le formulaire de création de service (select des pièces)
router.get('/types-pieces', TypePieceController.list)
router.get('/types-pieces/:id', TypePieceController.getById)

// ==================== ROUTES ADMINISTRATEUR ====================
// À protéger avec authenticate + requireRole('ADMINISTRATEUR')
router.get('/type', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.listAdmin)
router.post('/type/create', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.create)
router.patch('/type/:id', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.update)
router.patch('/type/:id/desactivation', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.deactivate)
router.patch('/type/:id/activation', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.activate)
router.delete('/type/:id', /* authenticate, requireRole('ADMINISTRATEUR'), */ TypePieceController.remove)

export default router
