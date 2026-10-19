import pool from '../DataBases/db.js'

export const ServiceFiscalModel = {
	
	// ============================
	// RÉCUPÉRER TOUS LES SERVICES
	// ============================
	async findAll(includeInactive = false) {
		
		const query = includeInactive
		? `
		SELECT
		sf.*,
		COUNT(sp.id_type_piece)::INTEGER AS nb_pieces
		FROM service_fiscal sf
		LEFT JOIN service_piece sp
		ON sp.id_service = sf.id_service
		GROUP BY sf.id_service
		ORDER BY sf.libelle_service ASC
		`
		: `
		SELECT
		sf.*,
		COUNT(sp.id_type_piece)::INTEGER AS nb_pieces
		FROM service_fiscal sf
		LEFT JOIN service_piece sp
		ON sp.id_service = sf.id_service
		WHERE sf.actif = TRUE
		GROUP BY sf.id_service
		ORDER BY sf.libelle_service ASC
		`
		
		const { rows } = await pool.query(query)
		
		return rows
	},
	
	
	// ============================
	// RÉCUPÉRER UN SERVICE PAR ID
	// ============================
	async findById(id_service) {
		
		const { rows } = await pool.query(
			`SELECT *
			FROM service_fiscal
			WHERE id_service = $1`,
			[id_service]
		)
		
		return rows[0] || null
	},
	
	
	// ============================
	// CRÉER UN SERVICE
	// ============================
	async create(data) {
		
		const {
			libelle_service,
			description,
			duree_estimee_min,
			actif
		} = data
		
		const { rows } = await pool.query(
			`INSERT INTO service_fiscal (
				libelle_service,
				description,
				duree_estimee_min,
				actif
			)
			VALUES ($1, $2, $3, $4)
			RETURNING *`,
			[
				libelle_service,
				description || null,
				duree_estimee_min || 15,
				actif ?? true
			]
		)
		
		return rows[0]
	},
	
	
	// ============================
	// MODIFIER UN SERVICE
	// ============================
	async update(id_service, data) {
		
		const {
			libelle_service,
			description,
			duree_estimee_min,
			actif
		} = data
		
		const { rows } = await pool.query(
			`UPDATE service_fiscal
			SET
			libelle_service = COALESCE($1, libelle_service),
										  description = COALESCE($2, description),
										  duree_estimee_min = COALESCE($3, duree_estimee_min),
										  actif = COALESCE($4, actif)
										  WHERE id_service = $5
										  RETURNING *`,
									[
										libelle_service ?? null,
									description ?? null,
									duree_estimee_min ?? null,
									actif ?? null,
									id_service
									]
		)
		
		return rows[0] || null
	},
	
	
	// ============================
	// DÉSACTIVER UN SERVICE
	// ============================
	async deactivate(id_service) {
		
		const { rows } = await pool.query(
			`UPDATE service_fiscal
			SET actif = FALSE
			WHERE id_service = $1
			RETURNING *`,
			[id_service]
		)
		
		return rows[0] || null
	},
	
	
	// ============================
	// ACTIVER UN SERVICE
	// ============================
	async activate(id_service) {
		
		const { rows } = await pool.query(
			`UPDATE service_fiscal
			SET actif = TRUE
			WHERE id_service = $1
			RETURNING *`,
			[id_service]
		)
		
		return rows[0] || null
	},
	
	
	// ============================
	// SUPPRESSION PHYSIQUE
	// ============================
	async remove(id_service) {
		
		const { rows } = await pool.query(
			`DELETE FROM service_fiscal
			WHERE id_service = $1
			RETURNING id_service`,
			[id_service]
		)
		console.log('🗑️ Résultat DELETE PostgreSQL :', rows)
		
		return rows[0] || null
	}
}
