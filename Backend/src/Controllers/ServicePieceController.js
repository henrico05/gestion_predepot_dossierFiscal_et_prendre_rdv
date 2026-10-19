import { ServicePieceModel } from '../Models/ServicePieceModel.js'

export const ServicePieceController = {
	
	// ============================================================
	// GET /services/:idService/pieces
	// ============================================================
	async getByService(req, res) {
		
		try {
			
			const { idService } = req.params
			
			const pieces =
			await ServicePieceModel.findByService(idService)
			
			res.status(200).json(pieces)
			
		} catch (error) {
			
			console.error(
				'Erreur récupération pièces service :',
				 error
			)
			
			res.status(500).json({
				message: 'Erreur lors de la récupération des pièces'
			})
		}
	},
	
	
	// ============================================================
	// POST /services/:idService/pieces
	// ============================================================
	async create(req, res) {
		
		try {
			
			const { idService } = req.params
			
			const {
				id_type_piece,
				obligatoire
			} = req.body
			
			
			if (!id_type_piece) {
				
				return res.status(400).json({
					message: 'Le type de pièce est obligatoire'
				})
			}
			
			
			const piece = await ServicePieceModel.create(
				idService,
				id_type_piece,
				obligatoire ?? true
			)
			
			
			res.status(201).json(piece)
			
		} catch (error) {
			
			console.error(
				'Erreur ajout pièce service :',
				 error
			)
			
			// Violation de clé étrangère
			if (error.code === '23503') {
				
				return res.status(400).json({
					message:
					'Le service ou le type de pièce indiqué n’existe pas'
				})
			}
			
			// Violation de clé primaire
			if (error.code === '23505') {
				
				return res.status(409).json({
					message:
					'Cette pièce est déjà associée à ce service'
				})
			}
			
			res.status(500).json({
				message:
				'Erreur lors de l’association de la pièce'
			})
		}
	},
	
	
	// ============================================================
	// PUT /services/:idService/pieces
	//
	// UTILISÉ PAR TON saveService()
	// ============================================================
	async replacePieces(req, res) {
		
		try {
			
			const { idService } = req.params
			const { pieces } = req.body
			
			
			// ----------------------------------------------------
			// Vérification
			// ----------------------------------------------------
			
			if (!Array.isArray(pieces)) {
				
				return res.status(400).json({
					message:
					'Le champ "pieces" doit être un tableau'
				})
			}
			
			
			// ----------------------------------------------------
			// Vérifier les données reçues
			// ----------------------------------------------------
			
			for (const piece of pieces) {
				
				if (!piece.id_type_piece) {
					
					return res.status(400).json({
						message:
						'Chaque pièce doit avoir un id_type_piece'
					})
				}
				
				if (
					piece.obligatoire !== undefined &&
					typeof piece.obligatoire !== 'boolean'
				) {
					
					return res.status(400).json({
						message:
						'Le champ obligatoire doit être un booléen'
					})
				}
			}
			
			
			// ----------------------------------------------------
			// Remplacement complet
			// ----------------------------------------------------
			
			const result =
			await ServicePieceModel.replacePieces(
				idService,
				pieces
			)
			
			
			res.status(200).json({
				message:
				'Les pièces du service ont été enregistrées',
				pieces: result
			})
			
		} catch (error) {
			
			console.error(
				'Erreur remplacement pièces service :',
				 error
			)
			
			
			// Service inexistant
			if (
				error.message ===
				'Service fiscal introuvable'
			) {
				
				return res.status(404).json({
					message: error.message
				})
			}
			
			
			// Clé étrangère invalide
			if (error.code === '23503') {
				
				return res.status(400).json({
					message:
					'Un service ou un type de pièce indiqué n’existe pas'
				})
			}
			
			
			// Doublon
			if (error.code === '23505') {
				
				return res.status(409).json({
					message:
					'Une même pièce est présente plusieurs fois'
				})
			}
			
			
			res.status(500).json({
				message:
				'Erreur lors de l’enregistrement des pièces'
			})
		}
	},
	
	
	// ============================================================
	// PATCH /services/:idService/pieces/:idTypePiece
	// ============================================================
	async update(req, res) {
		
		try {
			
			const {
				idService,
				idTypePiece
			} = req.params
			
			const { obligatoire } = req.body
			
			
			if (typeof obligatoire !== 'boolean') {
				
				return res.status(400).json({
					message:
					'Le champ obligatoire doit être un booléen'
				})
			}
			
			
			const piece =
			await ServicePieceModel.update(
				idService,
				idTypePiece,
				obligatoire
			)
			
			
			if (!piece) {
				
				return res.status(404).json({
					message:
					'Association service/pièce introuvable'
				})
			}
			
			
			res.status(200).json(piece)
			
		} catch (error) {
			
			console.error(error)
			
			res.status(500).json({
				message:
				'Erreur lors de la modification'
			})
		}
	},
	
	
	// ============================================================
	// DELETE /services/:idService/pieces/:idTypePiece
	// ============================================================
	async remove(req, res) {
		
		try {
			
			const {
				idService,
				idTypePiece
			} = req.params
			
			
			const piece =
			await ServicePieceModel.remove(
				idService,
				idTypePiece
			)
			
			
			if (!piece) {
				
				return res.status(404).json({
					message:
					'Association service/pièce introuvable'
				})
			}
			
			
			res.status(200).json({
				message:
				'Pièce retirée du service',
				piece
			})
			
		} catch (error) {
			
			console.error(error)
			
			res.status(500).json({
				message:
				'Erreur lors de la suppression'
			})
		}
	}
}
