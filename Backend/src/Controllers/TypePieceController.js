import { TypePieceModel } from '../Models/TypePieceModel.js'

export const TypePieceController = {

	// GET /api/types-pieces
	// Liste publique : uniquement les types de pièces actifs
	async list(req, res) {
		try {
			const types = await TypePieceModel.findAll()
			return res.status(200).json(types)
		} catch (err) {
			console.error('TypePieceController.list', err)
			return res.status(500).json({ message: 'Erreur lors de la récupération des types de pièces' })
		}
	},

	// GET /api/admin/types-pieces
	// Liste complète (actifs et inactifs) réservée à l'administrateur
	async listAdmin(req, res) {
		try {
			const types = await TypePieceModel.findAllAdmin()
			return res.status(200).json(types)
		} catch (err) {
			console.error('TypePieceController.listAdmin', err)
			return res.status(500).json({ message: 'Erreur lors de la récupération des types de pièces' })
		}
	},

	// GET /api/types-pieces/:id
	async getById(req, res) {
		try {
			const { id } = req.params
			const type = await TypePieceModel.findById(id)

			if (!type) {
				return res.status(404).json({ message: 'Type de pièce introuvable' })
			}

			return res.status(200).json(type)
		} catch (err) {
			console.error('TypePieceController.getById', err)
			return res.status(500).json({ message: 'Erreur lors de la récupération du type de pièce' })
		}
	},

	// POST /api/admin/types-pieces
	async create(req, res) {
		try {
			const { libelle, description, actif,multiple } = req.body

			if (!libelle || !libelle.trim()) {
				return res.status(400).json({ message: 'Le libellé du type de pièce est obligatoire' })
			}
			
			if (multiple !== undefined && typeof multiple !== 'boolean') {
				return res.status(400).json({
					message: 'Le champ "multiple" doit être un booléen.'
				})
			}

			const existing = await TypePieceModel.findByLibelle(libelle.trim())
			if (existing) {
				return res.status(409).json({ message: 'Un type de pièce avec ce libellé existe déjà' })
			}

			const type = await TypePieceModel.create({
				libelle: libelle.trim(),
				description,
				actif : actif ?? true,
				multiple : multiple ?? false
			})

			return res.status(201).json(type)
		} catch (err) {
			console.error('TypePieceController.create', err)
			return res.status(500).json({ message: 'Erreur lors de la création du type de pièce' })
		}
	},

	// PATCH /api/admin/types-pieces/:id
	async update(req, res) {
		try {
			const { id } = req.params
			const { libelle, description, actif,multiple } = req.body
			
			
			if (multiple !== undefined && typeof multiple !== 'boolean') {
				return res.status(400).json({
					message: 'Le champ "multiple" doit être un booléen.'
				})
			}

			const existing = await TypePieceModel.findById(id)
			if (!existing) {
				return res.status(404).json({ message: 'Type de pièce introuvable' })
			}

			if (libelle && libelle.trim()) {
				const duplicate = await TypePieceModel.findByLibelle(libelle.trim())
				if (duplicate && duplicate.id_type_piece !== Number(id)) {
					return res.status(409).json({ message: 'Un type de pièce avec ce libellé existe déjà' })
				}
			}

			const type = await TypePieceModel.update(id, {
				libelle: libelle?.trim(),
				description,
				actif,
				multiple
			})

			return res.status(200).json(type)
		} catch (err) {
			console.error('TypePieceController.update', err)
			
			const isBusinessError = err.message && err.message.includes('Impossible de changer ce type')
			
			if (isBusinessError) {
				return res.status(409).json({ message: err.message })
			}
			
			
			return res.status(500).json({ message: 'Erreur lors de la modification du type de pièce' })
		}
	},

	// PATCH /api/admin/types-pieces/:id/desactivation
	async deactivate(req, res) {
		try {
			const { id } = req.params

			const existing = await TypePieceModel.findById(id)
			if (!existing) {
				return res.status(404).json({ message: 'Type de pièce introuvable' })
			}

			const type = await TypePieceModel.setActif(id, false)
			return res.status(200).json(type)
		} catch (err) {
			console.error('TypePieceController.deactivate', err)
			return res.status(500).json({ message: 'Erreur lors de la désactivation du type de pièce' })
		}
	},

	// PATCH /api/admin/types-pieces/:id/activation
	async activate(req, res) {
		try {
			const { id } = req.params

			const existing = await TypePieceModel.findById(id)
			if (!existing) {
				return res.status(404).json({ message: 'Type de pièce introuvable' })
			}

			const type = await TypePieceModel.setActif(id, true)
			return res.status(200).json(type)
		} catch (err) {
			console.error('TypePieceController.activate', err)
			return res.status(500).json({ message: 'Erreur lors de l\'activation du type de pièce' })
		}
	},

	// DELETE /api/admin/types-pieces/:id
	// Refusé si le type est déjà utilisé par un service (intégrité de SERVICE_PIECE)
	async remove(req, res) {
		try {
			const { id } = req.params
			
			const existing = await TypePieceModel.findById(id)
			if (!existing) {
				return res.status(404).json({ message: 'Type de pièce introuvable' })
			}
			
			const used = await TypePieceModel.isUsedByServices(id)
			if (used) {
				return res.status(409).json({
					message: 'Ce type de pièce est utilisé (par un service ou une pièce déposée) et ne peut pas être supprimé. Désactivez-le à la place.'
				})
			}
			
			await TypePieceModel.remove(id)
			return res.status(204).send()
		} catch (err) {
			console.error('TypePieceController.remove', err)
			return res.status(500).json({ message: 'Erreur lors de la suppression du type de pièce' })
		}
	}
}
