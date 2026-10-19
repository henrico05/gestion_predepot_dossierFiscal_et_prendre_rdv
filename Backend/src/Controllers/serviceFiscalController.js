import { ServiceFiscalModel } from '../Models/serviceFiscalModel.js'
import { ServicePieceModel } from '../Models/ServicePieceModel.js'

export const ServiceFiscalController = {
	
	// GET /api/services-fiscaux
	async getAllServices(req, res) {
		try {
			const includeInactive =
			req.query.includeInactive === 'true'
			
			const services =
			await ServiceFiscalModel.findAll(includeInactive)
			
			return res.status(200).json({
				success: true,
				data: services
			})
			
		} catch (error) {
			
			console.error('Erreur getAllServices:', error)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des services fiscaux.'
			})
		}
	},
	
	
	// GET /api/services-fiscaux/:id
	async getServiceById(req, res) {
		try {
			
			const { id } = req.params
			
			const service =
			await ServiceFiscalModel.findById(id)
			
			if (!service) {
				return res.status(404).json({
					success: false,
					message: 'Service fiscal non trouvé.'
				})
			}
			
			return res.status(200).json({
				success: true,
				data: service
			})
			
		} catch (error) {
			
			console.error('Erreur getServiceById:', error)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération du service.'
			})
		}
	},
	
	// ============================================================
	// GET /api/services-fiscaux/:id/pieces-requises
	// Récupérer les pièces nécessaires pour un service fiscal
	// ============================================================
	async getPiecesRequises(req, res) {
		try {
			
			const { id } = req.params
			
			// Vérifier que le service existe
			const service =
			await ServiceFiscalModel.findById(id)
			
			if (!service) {
				return res.status(404).json({
					success: false,
					message: 'Service fiscal non trouvé.'
				})
			}
			
			// Récupérer les pièces associées au service
			const pieces =
			await ServicePieceModel.findByService(id)
			
			return res.status(200).json({
				success: true,
				data: pieces
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getPiecesRequises:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des pièces nécessaires.'
			})
		}
	},
	
	
	// POST /api/services-fiscaux/create
	async createService(req, res) {
		try {
			
			const {
				libelle_service,
				description,
				duree_estimee_min,
				actif
			} = req.body
			
			// =========================
			// VALIDATION
			// =========================
			
			if (!libelle_service || !libelle_service.trim()) {
				return res.status(400).json({
					success: false,
					message:
					'Le libellé du service est obligatoire.'
				})
			}
			
			if (
				duree_estimee_min !== undefined &&
				(
					!Number.isInteger(Number(duree_estimee_min)) ||
					Number(duree_estimee_min) <= 0
				)
			) {
				return res.status(400).json({
					success: false,
					message:
					'La durée estimée doit être un entier positif.'
				})
			}
			
			// =========================
			// CRÉATION
			// =========================
			
			const newService =
			await ServiceFiscalModel.create({
				libelle_service:
				libelle_service.trim(),
											
											description:
											description || null,
											
											duree_estimee_min:
											duree_estimee_min ?? 15,
											
											actif:
											actif ?? true
			})
			
			return res.status(201).json({
				success: true,
				message:
				'Service fiscal créé avec succès.',
				data: newService
			})
			
		} catch (error) {
			
			console.error('Erreur createService:', error)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur serveur lors de la création du service.'
			})
		}
	},
	
	
	// PATCH /api/services-fiscaux/edit/:id
	async updateService(req, res) {
		try {
			
			const { id } = req.params
			
			const existingService =
			await ServiceFiscalModel.findById(id)
			
			if (!existingService) {
				return res.status(404).json({
					success: false,
					message:
					'Service fiscal introuvable.'
				})
			}
			
			const updatedService =
			await ServiceFiscalModel.update(
				id,
				req.body
			)
			
			return res.status(200).json({
				success: true,
				message:
				'Service fiscal mis à jour avec succès.',
				data: updatedService
			})
			
		} catch (error) {
			
			console.error('Erreur updateService:', error)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la mise à jour du service.'
			})
		}
	},
	
	
	// DELETE /api/services-fiscaux/:id
	async deleteService(req, res) {
		try {
			
			const { id } = req.params
			
			const deleted =
			await ServiceFiscalModel.remove(id)
			
			if (!deleted) {
				return res.status(404).json({
					success: false,
					message:
					'Service fiscal introuvable ou déjà supprimé.'
				})
			}
			
			return res.status(200).json({
				success: true,
				message:
				'Service fiscal supprimé avec succès.'
			})
			
		} catch (error) {
			
			console.error('Erreur deleteService:', error)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la suppression du service.'
			})
		}
	}
}
