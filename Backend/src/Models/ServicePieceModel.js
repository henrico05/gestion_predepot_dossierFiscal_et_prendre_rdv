import pool from '../DataBases/db.js'

export const ServicePieceModel = {
	
	// ============================================================
	// Récupérer toutes les pièces associées à un service
	// ============================================================
	async findByService(idService) {
		
		const { rows } = await pool.query(
			`
			SELECT
			sp.id_service,
			sp.id_type_piece,
			sp.obligatoire,
			tp.libelle,
			tp.description
			FROM service_piece sp
			INNER JOIN type_piece tp
			ON tp.id_type_piece = sp.id_type_piece
			WHERE sp.id_service = $1
			ORDER BY tp.libelle ASC
			`,
			[idService]
		)
		
		return rows
	},
	
	
	// ============================================================
	// Récupérer une association précise
	// ============================================================
	async findOne(idService, idTypePiece) {
		
		const { rows } = await pool.query(
			`
			SELECT
			id_service,
			id_type_piece,
			obligatoire
			FROM service_piece
			WHERE id_service = $1
			AND id_type_piece = $2
			`,
			[idService, idTypePiece]
		)
		
		return rows[0] || null
	},
	
	
	// ============================================================
	// Ajouter une pièce à un service
	// ============================================================
	async create(idService, idTypePiece, obligatoire = true) {
		
		const { rows } = await pool.query(
			`
			INSERT INTO service_piece (
				id_service,
				id_type_piece,
				obligatoire
			)
			VALUES ($1, $2, $3)
			RETURNING
			id_service,
			id_type_piece,
			obligatoire
			`,
			[
				idService,
				idTypePiece,
				obligatoire
			]
		)
		
		return rows[0]
	},
	
	
	// ============================================================
	// Modifier le caractère obligatoire
	// ============================================================
	async update(idService, idTypePiece, obligatoire) {
		
		const { rows } = await pool.query(
			`
			UPDATE service_piece
			SET obligatoire = $1
			WHERE id_service = $2
			AND id_type_piece = $3
			RETURNING
			id_service,
			id_type_piece,
			obligatoire
			`,
			[
				obligatoire,
				idService,
				idTypePiece
			]
		)
		
		return rows[0] || null
	},
	
	
	// ============================================================
	// Supprimer une pièce d'un service
	// ============================================================
	async remove(idService, idTypePiece) {
		
		const { rows } = await pool.query(
			`
			DELETE FROM service_piece
			WHERE id_service = $1
			AND id_type_piece = $2
			RETURNING
			id_service,
			id_type_piece
			`,
			[
				idService,
				idTypePiece
			]
		)
		
		return rows[0] || null
	},
	
	
	// ============================================================
	// REMPLACER toutes les pièces d'un service
	//
	// C'est cette méthode que ton saveService() va principalement
	// utiliser avec :
	//
	// PUT /api/admin/services/:idService/pieces
	// ============================================================
	async replacePieces(idService, pieces) {
		
		const client = await pool.connect()
		
		try {
			
			await client.query('BEGIN')
			
			// ----------------------------------------------------
			// 1. Vérifier que le service existe
			// ----------------------------------------------------
			
			const serviceResult = await client.query(
				`
				SELECT id_service
				FROM service_fiscal
				WHERE id_service = $1
				`,
				[idService]
			)
			
			if (serviceResult.rows.length === 0) {
				throw new Error('Service fiscal introuvable')
			}
			
			
			// ----------------------------------------------------
			// 2. Supprimer les anciennes associations
			// ----------------------------------------------------
			
			await client.query(
				`
				DELETE FROM service_piece
				WHERE id_service = $1
				`,
				[idService]
			)
			
			
			// ----------------------------------------------------
			// 3. Ajouter les nouvelles associations
			// ----------------------------------------------------
			
			for (const piece of pieces) {
				
				await client.query(
					`
					INSERT INTO service_piece (
						id_service,
						id_type_piece,
						obligatoire
					)
					VALUES ($1, $2, $3)
					`,
					[
						idService,
					   piece.id_type_piece,
					   piece.obligatoire ?? true
					]
				)
			}
			
			
			// ----------------------------------------------------
			// 4. Valider la transaction
			// ----------------------------------------------------
			
			await client.query('COMMIT')
			
			
			// ----------------------------------------------------
			// 5. Retourner les associations finales
			// ----------------------------------------------------
			
			const result = await pool.query(
				`
				SELECT
				sp.id_service,
				sp.id_type_piece,
				sp.obligatoire,
				tp.libelle
				FROM service_piece sp
				INNER JOIN type_piece tp
				ON tp.id_type_piece = sp.id_type_piece
				WHERE sp.id_service = $1
				ORDER BY tp.libelle ASC
				`,
				[idService]
			)
			
			return result.rows
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			
			throw error
			
		} finally {
			
			client.release()
		}
	}
}
