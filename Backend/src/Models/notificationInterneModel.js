import pool from '../DataBases/db.js'

export const NotificationInterneModel = {
	async create(db, data) {
		const q = db || pool
		const {
			type_notification,
			contenu,
			type_acteur,
			id_acteur = null,
			nom_acteur = null,
			action = null,
			table_cible = null,
			id_cible = null,
			details_json = null
		} = data
		
		const { rows } = await q.query(`
		INSERT INTO notification_interne (
			type_notification, contenu, type_acteur,
			id_acteur, nom_acteur, action,
			table_cible, id_cible, details_json
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
		RETURNING *
		`, [
			type_notification,
			contenu,
			type_acteur,
			id_acteur ? String(id_acteur) : null,
									   nom_acteur,
									   action,
									   table_cible,
									   id_cible ? String(id_cible) : null,
									   details_json ? JSON.stringify(details_json) : null
		])
		
		return rows[0]
	},
	
	async findRecent({ limit = 40, nonLues = false } = {}) {
		const params = []
		let where = ''
		if (nonLues) where = 'WHERE lu = FALSE'
			params.push(limit)
			
			const { rows } = await pool.query(`
			SELECT * FROM notification_interne
			${where}
			ORDER BY date_creation DESC
			LIMIT $${params.length}
			`, params)
			
			return rows
	},
	
	async countNonLues() {
		const { rows } = await pool.query(`
		SELECT COUNT(*)::int AS n
		FROM notification_interne
		WHERE lu = FALSE
		`)
		return rows[0].n
	},
	
	async marquerLue(id) {
		const { rows } = await pool.query(`
		UPDATE notification_interne
		SET lu = TRUE
		WHERE id_notification = $1
		RETURNING *
		`, [id])
		return rows[0] || null
	},
	
	async marquerToutesLues() {
		const { rowCount } = await pool.query(`
		UPDATE notification_interne
		SET lu = TRUE
		WHERE lu = FALSE
		`)
		return rowCount
	}
}
