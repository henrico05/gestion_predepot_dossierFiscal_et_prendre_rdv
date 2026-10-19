import pool from '../DataBases/db.js'

export const TypePieceModel = {

	async findAll() {
		const { rows } = await pool.query(
			`SELECT * FROM type_piece
			WHERE actif = TRUE
			ORDER BY libelle ASC`
		)
		return rows
	},

	async findAllAdmin() {
		const { rows } = await pool.query(
			`SELECT * FROM type_piece
			ORDER BY libelle ASC`
		)
		return rows
	},

	async findById(id) {
		const { rows } = await pool.query(
			'SELECT * FROM type_piece WHERE id_type_piece = $1',
			[id]
		)
		return rows[0] || null
	},

	async findByLibelle(libelle) {
		const { rows } = await pool.query(
			'SELECT * FROM type_piece WHERE libelle = $1',
			[libelle]
		)
		return rows[0] || null
	},

	async create(data) {
		const {
			libelle,
			description,
			actif,
			multiple
		} = data

		const { rows } = await pool.query(
			`INSERT INTO type_piece (
				libelle,
				description,
				actif,
				multiple
			)
			VALUES (
				$1,$2,$3,$4
			)
			RETURNING
			id_type_piece,
			libelle,
			description,
			actif,
			multiple`,
			[
				libelle,
				description || null,
				actif ?? true,
				multiple ?? false
			]
		)

		return rows[0]
	},

	async update(id, data) {
		const {
			libelle,
			description,
			actif,
			multiple           // ⭐ corrigé : "miltiple" → "multiple"
		} = data
		
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			// =========================================================
			// 1. Récupérer l'état ACTUEL du type
			// =========================================================
			const { rows: currentRows } = await client.query(`
			SELECT id_type_piece, multiple
			FROM type_piece
			WHERE id_type_piece = $1
			FOR UPDATE
			`, [id])
			
			const current = currentRows[0]
			
			if (!current) {
				throw new Error('Type de pièce introuvable.')
			}
			
			const currentMultiple = current.multiple
			
			// =========================================================
			// 2. ⭐ BLOQUER le changement de `multiple` si utilisé
			// =========================================================
			const veutChangerMultiple =
			multiple !== undefined &&
			multiple !== null &&
			Boolean(multiple) !== Boolean(currentMultiple)
			
			if (veutChangerMultiple) {
				// Combien de fois ce type est-il utilisé ?
				const { rows: usages } = await client.query(`
				SELECT COUNT(*)::int AS n
				FROM piece_justificative
				WHERE id_type_piece = $1
				`, [id])
				
				const nbUsages = usages[0].n
				
				if (nbUsages > 0) {
					throw new Error(
						`Impossible de changer ce type de pièce (${nbUsages} dossier(s) ` +
						`l'utilise déjà). Le passage de "${currentMultiple ? 'multiple' : 'unique'}" ` +
						`à "${multiple ? 'multiple' : 'unique'}" est interdit.`
					)
				}
			}
			
			// =========================================================
			// 3. Effectuer la mise à jour
			// =========================================================
			const { rows } = await client.query(`
			UPDATE type_piece
			SET
			libelle     = COALESCE($1, libelle),
			description = COALESCE($2, description),
			actif       = COALESCE($3, actif),
			multiple    = COALESCE($4, multiple)
			WHERE id_type_piece = $5
				RETURNING
					id_type_piece,
					libelle,
					description,
					actif,
					multiple
					`, [
						libelle ?? null,
					description	?? null,
						actif ?? null,
						multiple ?? null,
						id
						])
			
			await client.query('COMMIT')
			
			return rows[0] || null
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
			
		} finally {
			client.release()
		}
	},

	async setActif(id, actif) {
		const { rows } = await pool.query(
			`UPDATE type_piece
			SET actif = $1
			WHERE id_type_piece = $2
			RETURNING id_type_piece, libelle,description, actif,multiple`,
			[actif, id]
		)

		return rows[0] || null
	},

	async remove(id) {
		const { rows } = await pool.query(
			`DELETE FROM type_piece
			WHERE id_type_piece = $1
			RETURNING id_type_piece`,
			[id]
		)

		return rows[0] || null
	},

	async isUsedByServices(id) {
		const { rows } = await pool.query(
			`SELECT
			EXISTS(SELECT 1 FROM service_piece WHERE id_type_piece = $1) AS used_by_service,
			EXISTS(SELECT 1 FROM piece_justificative WHERE id_type_piece = $1) AS used_by_piece
										  `,
			[id]
		)
		
		return rows[0].used_by_service || rows[0].used_by_piece
	},
}
