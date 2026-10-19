import pool from '../DataBases/db.js'

export const NotificationModel = {
	async create(db, { type_notification, contenu, canal, id_contribuable, statut_envoi = 'ENVOYE' }) {
		const q = db || pool
		const { rows } = await q.query(`
		INSERT INTO notification (
			type_notification, contenu, canal,
			date_creation, date_envoi, statut_envoi, id_contribuable
		)
		VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)
		RETURNING *
		`, [type_notification, contenu, canal, statut_envoi, id_contribuable])
		return rows[0]
	},
	
	async findPortail(id_contribuable) {
		const { rows } = await pool.query(`
		SELECT * FROM notification
		WHERE id_contribuable = $1 AND canal = 'PORTAIL'
		ORDER BY date_creation DESC
		LIMIT 50
		`, [id_contribuable])
		return rows
	},
	
	async countNonLues(id_contribuable) {
		const { rows } = await pool.query(`
		SELECT COUNT(*)::int AS n FROM notification
		WHERE id_contribuable = $1
		AND canal = 'PORTAIL'
		AND statut_envoi <> 'LU'
		`, [id_contribuable])
		return rows[0].n
	},
	
	async marquerLue(id_notification, id_contribuable) {
		const { rows } = await pool.query(`
		UPDATE notification
		SET statut_envoi = 'LU'
		WHERE id_notification = $1
		AND id_contribuable = $2
		AND canal = 'PORTAIL'
		RETURNING *
		`, [id_notification, id_contribuable])
		return rows[0]
	}
}
