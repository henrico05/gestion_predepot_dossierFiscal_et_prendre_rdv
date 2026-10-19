import pool from '../DataBases/db.js'

class ContribuableModel {
	
	// =========================================================
	// TROUVER TOUS LES CONTRIBUABLES
	// =========================================================
	
	static async findAll(includeInactive = false) {
		
		const query = `
		SELECT
		id_contribuable,
		nif,
		nom_raison_sociale,
		type_contribuable,
		adresse,
		telephone,
		email,
		email_verified,
		admin_activation,
		is_active,
		last_login,
		created_at,
		updated_at
		FROM contribuable
		${includeInactive ? '' : 'WHERE is_active = TRUE'}
		ORDER BY created_at DESC
		`
		
		const result = await pool.query(query)
		
		return result.rows
	}
	
	
	// =========================================================
	// TROUVER PAR NIF
	// =========================================================
	// Utilisé principalement pour la connexion.
	// SELECT * est volontaire ici car le Controller
	// a besoin de mot_de_passe_hash pour bcrypt.compare().
	
	static async findByNif(nif) {
		
		const result = await pool.query(
			`
			SELECT *
			FROM contribuable
			WHERE nif = $1
			LIMIT 1
			`,
			[nif]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// TROUVER PAR NIF - VERSION PUBLIQUE
	// =========================================================
	// Cette méthode évite d'envoyer le hash du mot de passe
	// et le token email au frontend.
	
	static async findByNifPublic(nif) {
		
		const result = await pool.query(
			`
			SELECT
			id_contribuable,
			nif,
			nom_raison_sociale,
			type_contribuable,
			adresse,
			telephone,
			email,
			email_verified,
			admin_activation,
			is_active,
			last_login,
			created_at,
			updated_at
			FROM contribuable
			WHERE nif = $1
			LIMIT 1
			`,
			[nif]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// TROUVER PAR EMAIL
	// =========================================================
	
	static async findByEmail(email) {
		
		const result = await pool.query(
			`
			SELECT *
			FROM contribuable
			WHERE LOWER(email) = LOWER($1)
			LIMIT 1
			`,
			[email]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// TROUVER PAR ID
	// =========================================================
	
	static async findById(id) {
		
		const result = await pool.query(
			`
			SELECT
			id_contribuable,
			nif,
			nom_raison_sociale,
			prenom,
			type_contribuable,
			adresse,
			telephone,
			email,
			email_verified,
			admin_activation,
			is_active,
			last_login,
			created_at,
			updated_at
			FROM contribuable
			WHERE id_contribuable = $1
			`,
			[Number(id)]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// CREER UN CONTRIBUABLE
	// =========================================================
	
	static async create(data) {
		
		const {
			nif,
			nom_raison_sociale,
			prenom,
			type_contribuable,
			adresse,
			telephone,
			email,
			mot_de_passe_hash,
			email_token,
			email_token_expires,
			email_verified,
			admin_activation,
			is_active,
			role
		} = data
		
		const { rows } = await pool.query(
			`
			INSERT INTO contribuable (
				nif,
				nom_raison_sociale,
				prenom,
				type_contribuable,
				adresse,
				telephone,
				email,
				mot_de_passe_hash,
				email_token,
				email_token_expires,
				email_verified,
				admin_activation,
				is_active,
				role
			)
			VALUES (
				$1,
		   $2,
		   $3,
		   $4,
		   $5,
		   $6,
		   $7,
		   $8,
		   $9,
		   $10,
		   $11,
		   $12,
		   $13,
		   $14
			)
			RETURNING
			id_contribuable,
			nif,
			nom_raison_sociale,
			prenom,
			type_contribuable,
			adresse,
			telephone,
			email,
			email_verified,
			admin_activation,
			is_active,
			role,
			created_at
			`,
			[
				nif,
				nom_raison_sociale,
				prenom,
				type_contribuable,
				adresse || null,
				telephone || null,
				email,
				mot_de_passe_hash,
				email_token || null,
				email_token_expires || null,
				email_verified ?? false,
				admin_activation ?? false,
				is_active ?? true,
				role ?? 'contribuable'
			]
		)
		
		return rows[0]
	}
	
	
	// =========================================================
	// VERIFIER EMAIL
	// =========================================================
	
	static async verifyEmail(token) {
		
		const result = await pool.query(
			`
			UPDATE contribuable
			SET
			email_verified = TRUE,
			email_token = NULL,
			email_token_expires = NULL,
			updated_at = CURRENT_TIMESTAMP
			WHERE email_token = $1
			AND email_token_expires > CURRENT_TIMESTAMP
			RETURNING
			id_contribuable,
			email,
			email_verified
			`,
			[token]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// MODIFIER LAST LOGIN
	// =========================================================
	
	static async updateLastLogin(id) {
		
		const result = await pool.query(
			`
			UPDATE contribuable
			SET
			last_login = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
			WHERE id_contribuable = $1
			RETURNING last_login
			`,
			[Number(id)]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// MODIFIER MOT DE PASSE
	// =========================================================
	
	static async updatePassword(id, mot_de_passe_hash) {
		
		const result = await pool.query(
			`
			UPDATE contribuable
			SET
			mot_de_passe_hash = $1,
			updated_at = CURRENT_TIMESTAMP
			WHERE id_contribuable = $2
			RETURNING id_contribuable
			`,
			[mot_de_passe_hash, Number(id)]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// MODIFIER LES INFORMATIONS DU CONTRIBUABLE
	// =========================================================
	
	static async update(id, data) {
		const {
			nif,
			nom_raison_sociale,
			prenom,
			type_contribuable,
			adresse,
			telephone,
			email,
			is_active
		} = data
		
		const result = await pool.query(
			`
			UPDATE contribuable
			SET
			nif = COALESCE($1, nif),
										nom_raison_sociale = COALESCE($2, nom_raison_sociale),
										prenom = COALESCE($3, prenom),
										type_contribuable = COALESCE($4, type_contribuable),
										adresse = COALESCE($5, adresse),
										telephone = COALESCE($6, telephone),
										email = COALESCE($7, email),
										is_active = COALESCE($8, is_active),
										updated_at = CURRENT_TIMESTAMP
										WHERE id_contribuable = $9
										RETURNING
										id_contribuable,
								  nif,
								  nom_raison_sociale,
								  prenom,
								  type_contribuable,
								  adresse,
								  telephone,
								  email,
								  email_verified,
								  admin_activation,
								  is_active,
								  last_login,
								  created_at,
								  updated_at
								  `,
								  [
									  nif || null,
								  nom_raison_sociale || null,
								  prenom || null,
								  type_contribuable || null,
								  adresse || null,
								  telephone || null,
								  email || null,
								  typeof is_active === 'boolean' ? is_active : null,
								  Number(id)
								  ]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// DESACTIVER / ACTIVER
	// =========================================================
	
	 async updateActiveStatus(id, isActive) {
		
		const result = await pool.query(
			`
			UPDATE contribuable
			SET
			is_active = $1,
			updated_at = CURRENT_TIMESTAMP
			WHERE id_contribuable = $2
			RETURNING
			id_contribuable,
			is_active
			`,
			[isActive, Number(id)]
		)
		
		return result.rows[0] || null
	}
	
	
	// =========================================================
	// MODIFIER VALIDATION ADMIN
	// =========================================================
	// pending  -> en attente
	// approved -> approuvé
	// rejected -> refusé
	
	static async updateAdminStatus(id, status, reviewedBy, comment = null) {
		const { rows } = await pool.query(
			`UPDATE contribuable
			SET admin_activation = $1,
			reviewed_by = $2,
			reviewed_at = NOW(),  
										  admin_comment = $3,
									updated_at = NOW()
									WHERE id_contribuable = $4
									RETURNING id_contribuable,admin_activation,nom_raison_sociale,prenom, email`,
									[status, reviewedBy, comment, Number(id)]
		)
		
		return rows[0]
	}
	
	
	// =========================================================
	// SUPPRIMER UN CONTRIBUABLE
	// =========================================================
	
	static async remove(id) {
		
		const result = await pool.query(
			`
			DELETE FROM contribuable
			WHERE id_contribuable = $1
			RETURNING id_contribuable
			`,
			[id]
		)
		
		return result.rows[0] || null
	}
static async findPending() {
		const { rows } = await pool.query(
			`SELECT 
			id_contribuable,
			nif,
			nom_raison_sociale,
			prenom,
			role,
			type_contribuable,
			adresse,
			telephone,
			email,
			email_verified,
			admin_activation,
			is_active,
			last_login,
			created_at,
			updated_at
			 FROM contribuable
			WHERE admin_activation = FALSE
			AND email_verified = TRUE
			ORDER BY created_at ASC`
		)
		
		return rows
	}
	
	static async findApproved() {
		const { rows } = await pool.query(
			`SELECT
			id_contribuable,
			nif,
			nom_raison_sociale,
			prenom,
			role,
			type_contribuable,
			adresse,
			telephone,
			email,
			email_verified,
			admin_activation,
			is_active,
			last_login,
			created_at,
			updated_at
			FROM contribuable
			WHERE admin_activation = TRUE
			AND email_verified = TRUE
			ORDER BY created_at ASC`
		)
		
		return rows
	}
	
	static async regenerateEmailToken(token) {
		
		const result = await pool.query(
			`
			SELECT
			id_contribuable,
			nom_raison_sociale,
			prenom,
			email,
			email_verified
			FROM contribuable
			WHERE email_token = $1
			`,
			[token]
		)
		
		const contribuable = result.rows[0]
		
		if (!contribuable) {
			return null
		}
		
		if (contribuable.email_verified) {
			return {
				alreadyVerified: true,
				contribuable
			}
		}
		
		const crypto = await import('crypto')
		
		const newToken =
		crypto.randomBytes(32).toString('hex')
		
		const expiresAt =
		new Date(Date.now() + 24 * 60 * 60 * 1000)
		
		const updated = await pool.query(
			`
			UPDATE contribuable
			SET
			email_token = $1,
			email_token_expires = $2,
			updated_at = CURRENT_TIMESTAMP
			WHERE id_contribuable = $3
			RETURNING
			id_contribuable,
			nom_raison_sociale,
			prenom,
			email,
			email_token,
			email_token_expires
			`,
			[
				newToken,
				expiresAt,
				contribuable.id_contribuable
			]
		)
		
		return updated.rows[0] || null
	}
	
	
}

export default ContribuableModel
