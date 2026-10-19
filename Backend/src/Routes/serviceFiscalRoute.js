import { Router } from 'express'
import { ServiceFiscalController } from '../Controllers/serviceFiscalController.js'

const router = Router()

// Obtenir la liste des services fiscaux
router.get('/', ServiceFiscalController.getAllServices)

// Obtenir un service fiscal spécifique
router.get('/:id', ServiceFiscalController.getServiceById)
router.get('/:id/pieces-requises',ServiceFiscalController.getPiecesRequises)

// Créer un nouveau service fiscal
router.post('/create', ServiceFiscalController.createService)

// Mettre à jour un service fiscal
router.patch('/edit/:id', ServiceFiscalController.updateService)

// Supprimer un service fiscal
router.delete('/:id', ServiceFiscalController.deleteService)

export default router
