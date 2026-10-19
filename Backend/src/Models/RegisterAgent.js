import pool from '../DataBases/db.js'

export const AgentModel = {
	
	async findByEmail(email) {
		const { rows } = await pool.query(
			'SELECT * FROM agents WHERE email = $1',
			[email]
		)
		return rows[0] || null
	},
	
	async findByMatricule(matricule) {
		const { rows } = await pool.query(
			'SELECT * FROM agents WHERE matricule = $1',
			[matricule]
		)
		return rows[0] || null
	},
	
	async findByRole(role) {
		const { rows } = await pool.query(
			'SELECT * FROM agents WHERE role = $1 LIMIT 1',
			[role]
		)
		return rows[0] || null
	},

	async updateLastSeen(id) {
		const { rows } = await pool.query(
			`
			UPDATE agents
			SET last_seen = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING id, last_seen
			`,
			[id]
		)
		
		return rows[0] || null
	},
	
	async findByEmailToken(token) {
		const { rows } = await pool.query(
			`SELECT * FROM agents
			WHERE email_token = $1
			AND email_token_expires > NOW()`,
										  [token]
		)
		return rows[0] || null
	},
	
	async create(data) {
		const {
			nom,
			prenom,
			matricule,
			email,
			password_hash,
			role,
			id_guichet,
			photo_base64,
			photo_content_type,
			email_token,
			email_token_expires,
			email_verified,
			admin_status,
			is_active
		} = data
		
		const { rows } = await pool.query(
			`INSERT INTO agents (
				nom,
				prenom,
				matricule,
				email,
				password_hash,
				role,
				id_guichet,
				photo_base64,
				photo_content_type,
				email_token,
				email_token_expires,
				email_verified,
				admin_status,
				is_active
			)
			VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
			)
			RETURNING
			id,
			nom,
			prenom,
			matricule,
			email,
			role,
			id_guichet,
			email_verified,
			admin_status,
			is_active,
			created_at`,
			[
				nom,
				prenom,
				matricule,
				email,
				password_hash,
				role,
				id_guichet || null,
				photo_base64 || null,
				photo_content_type || null,
				email_token || null,
				email_token_expires || null,
				email_verified ?? false,
				admin_status ?? 'pending',
				is_active ?? true
			]
		)
		
		return rows[0]
	},
	
	async updateLastLogin(id) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET last_login = NOW()
			WHERE id = $1
			RETURNING last_login`,
			[id]
		)
		
		return rows[0] || null
	},
	
	async setOnline(id) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET is_online = TRUE,
			last_seen = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING id, is_online`,
			[id]
		)
		
		return rows[0] || null
	},
	
	async setOffline(id) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET is_online = FALSE,
			last_seen = NOW()
			WHERE id = $1
			RETURNING id, is_online, last_seen`,
			[id]
		)
		
		return rows[0] || null
	},
	
	async updateActiveStatus(id, is_active) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET is_active = $1,
			updated_at = NOW()
			WHERE id = $2
			RETURNING *`,
			[is_active, id]
		)
		
		return rows[0] || null
	},
	
	async markEmailVerified(id) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET email_verified = TRUE,
			email_token = NULL,
			email_token_expires = NULL,
			updated_at = NOW()
			WHERE id = $1
			RETURNING id, email, email_verified, admin_status`,
			[id]
		)
		
		return rows[0]
	},
	
	async updateAdminStatus(id, status, reviewedBy, comment = null) {
		const { rows } = await pool.query(
			`UPDATE agents
			SET admin_status = $1,
			reviewed_by = $2,
			reviewed_at = NOW(),
										  admin_comment = $3,
									updated_at = NOW()
									WHERE id = $4
									RETURNING id, nom, prenom, email, admin_status`,
									[status, reviewedBy, comment, id]
		)
		
		return rows[0]
	},
	
	async findById(id) {
		const { rows } = await pool.query(
			'SELECT * FROM agents WHERE id = $1',
			[id]
		)
		
		return rows[0] || null
	},
	
	async getChefCentre() {
		const { rows } = await pool.query(
			`SELECT *
			FROM agents
			WHERE role = 'CHEF_CENTRE'
			ORDER BY created_at ASC
			LIMIT 1`
		)
		
		return rows[0] || null
	},
	
	async findPending() {
		const { rows } = await pool.query(
			`SELECT
			id,
			nom,
			prenom,
			matricule,
			email,
			role,
			id_guichet,
			email_verified,
			admin_status,
			created_at
			FROM agents
			WHERE admin_status = 'pending'
			AND email_verified = TRUE
			ORDER BY created_at ASC`
		)
		
		return rows
	},
	
	async findApproved() {
		const { rows } = await pool.query(
			`SELECT
			id,
			nom,
			prenom,
			matricule,
			email,
			role,
			is_active,
			id_guichet,
			email_verified,
			admin_status,
			created_at
			FROM agents
			WHERE admin_status = 'approved'
			AND email_verified = TRUE
			ORDER BY created_at ASC`
		)
		
		return rows
	},
	
	async updateChefCentre(data) {
		const {
			nom,
			prenom,
			email,
			photo_base64,
			photo_content_type
		} = data
		
		const { rows } = await pool.query(
			`
			UPDATE agents
			SET
			nom = COALESCE($1, nom),
										  prenom = COALESCE($2, prenom),
										  email = COALESCE($3, email),
										  photo_base64 = COALESCE($4, photo_base64),
										  photo_content_type = COALESCE($5, photo_content_type),
										  updated_at = NOW()
										  WHERE role = 'CHEF_CENTRE'
										  RETURNING
										  id,
									nom,
									prenom,
									matricule,
									email,
									role,
									photo_base64,
									photo_content_type,
									email_verified,
									admin_status,
									is_active,
									is_online,
									last_seen,
									updated_at
									`,
									[
										nom ?? null,
									prenom ?? null,
									email ?? null,
									photo_base64 ?? null,
									photo_content_type ?? null
									]
		)
		
		return rows[0] || null
	},
	
	 async regenerateEmailToken(token) {
		
		const result = await pool.query(
			`
			SELECT
			id,
			nom,
			prenom,
			email,
			email_verified
			FROM agents
			WHERE email_token = $1
			`,
			[token]
		)
		
		const agent = result.rows[0]
		
		if (!agent) {
			return null
		}
		
		if (agent.email_verified) {
			return {
				alreadyVerified: true,
				agent
			}
		}
		
		const crypto = await import('crypto')
		
		const newToken =
		crypto.randomBytes(32).toString('hex')
		
		const expiresAt =
		new Date(Date.now() + 24 * 60 * 60 * 1000)
		
		const updated = await pool.query(
			`
			UPDATE agents
			SET
			email_token = $1,
			email_token_expires = $2,
			updated_at = CURRENT_TIMESTAMP
			WHERE id = $3
			RETURNING
			id,
			nom,
			prenom,
			email,
			email_token,
			email_token_expires
			`,
			[
				newToken,
				expiresAt,
				agent.id
			]
		)
		
		return updated.rows[0] || null
	},
	
	async update(id, data) {
		const {
			nom,
			prenom,
			matricule,
			email,
			role,
			is_active
		} = data
		
		const { rows } = await pool.query(`
		UPDATE agents
		SET
		nom = COALESCE($1, nom),
		prenom = COALESCE($2, prenom),
		matricule = COALESCE($3, matricule),
		email = COALESCE($4, email),
		role = COALESCE($5, role),
		is_active = COALESCE($6, is_active),
		updated_at = NOW()
		WHERE id = $7
		RETURNING id, nom, prenom, matricule, email, role, is_active, id_guichet
			`, [nom, prenom, matricule, email, role, is_active, id])
		
		return rows[0] || null
	},
}
