import pool from '../DataBases/db.js'

export const JournalAuditModel = {
	
	async log(db, {
		type_acteur,
		id_acteur,
		action,
		table_cible,
		id_cible,
		details_json = null
	}) {
		const q = db || pool
		
		if (!type_acteur) {
			throw new Error('Le type d’acteur est obligatoire.')
		}
		
		if (!id_acteur) {
			throw new Error('L’identifiant de l’acteur est obligatoire.')
		}
		
		if (!action) {
			throw new Error('L’action est obligatoire.')
		}
		
		if (!table_cible) {
			throw new Error('La table cible est obligatoire.')
		}
		
		if (!id_cible) {
			throw new Error('L’identifiant de la cible est obligatoire.')
		}
		
		const { rows } = await q.query(`
		INSERT INTO journal_audit (
			type_acteur,
			id_acteur,
			action,
			table_cible,
			id_cible,
			date_action,
			details_json
		)
		VALUES (
			$1,
		  $2,
		  $3,
		  $4,
		  $5,
		  NOW(),
				$6
		)
		RETURNING *
		`, [
			String(type_acteur),
									   String(id_acteur),
									   String(action),
									   String(table_cible),
									   String(id_cible),
									   details_json
		])
		
		return rows[0]
	},
	
	async findById(id_audit) {
		const { rows } = await pool.query(`
		SELECT *
		FROM journal_audit
		WHERE id_audit = $1
		`, [id_audit])
		
		return rows[0] || null
	},
	
	async findByActeur(id_acteur) {
		const { rows } = await pool.query(`
		SELECT *
		FROM journal_audit
		WHERE id_acteur = $1
		ORDER BY date_action DESC
		`, [String(id_acteur)])
		
		return rows
	},
	
	async findByCible(table_cible, id_cible) {
		const { rows } = await pool.query(`
		SELECT *
		FROM journal_audit
		WHERE table_cible = $1
		AND id_cible = $2
		ORDER BY date_action DESC
		`, [
			String(table_cible),
										  String(id_cible)
		])
		
		return rows
	}
}
