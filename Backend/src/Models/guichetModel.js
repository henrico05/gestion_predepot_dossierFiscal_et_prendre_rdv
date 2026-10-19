import pool from '../DataBases/db.js'

export const GuichetModel = {
	
	
	async findAll() {
		const { rows } = await pool.query(`
		SELECT
		id_guichet,
		numero_guichet,
		libelle,
		etat_guichet
		FROM guichet
		ORDER BY numero_guichet
		`)
		
		return rows
	},
	
	async affectationActive(id_agent) {
		if (!id_agent) {
			return null
		}
		
		const { rows } = await pool.query(`
		SELECT
		a.id_affectation,
		a.id_agent,
		a.id_guichet,
		a.date_debut,
		a.date_fin,
		
		g.id_guichet,
		g.numero_guichet,
		g.libelle,
		g.etat_guichet
		
		FROM affectation_guichet a
		
		INNER JOIN guichet g
		ON g.id_guichet = a.id_guichet
		
		WHERE a.id_agent = $1
		AND a.date_fin IS NULL
		
		ORDER BY a.date_debut DESC
		LIMIT 1
		`, [id_agent])
		
		return rows[0] || null
	},
	
	
	async affecter(id_agent, id_guichet = null) {
		if (!id_agent) {
			throw new Error('Agent obligatoire.')
		}
		
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			/* 1. Récupérer le guichet assigné à l'agent */
			const { rows: agents } = await client.query(`
			SELECT id, id_guichet
			FROM agents
			WHERE id = $1
			FOR UPDATE
			`, [id_agent])
			
			if (!agents[0]) {
				throw new Error('Agent introuvable.')
			}
			
			const guichetAssigne = agents[0].id_guichet
			
			if (!guichetAssigne) {
				throw new Error(
					'Aucun guichet ne vous est assigné. Contactez le chef de centre.'
				)
			}
			
			/* 2. Si l'agent tente un autre guichet → refuser
			 *    ⭐ Comparaison STRING (UUID), pas Number() */
			if (id_guichet && String(id_guichet) !== String(guichetAssigne)) {
				throw new Error(
					'Vous ne pouvez ouvrir que votre guichet assigné.'
				)
			}
			
			const id_guichetFinal = guichetAssigne
			
			/* 3. Vérifier le guichet */
			const { rows: guichets } = await client.query(`
			SELECT id_guichet, numero_guichet, libelle, etat_guichet
			FROM guichet
			WHERE id_guichet = $1
			FOR UPDATE
			`, [id_guichetFinal])
			
			if (!guichets[0]) {
				throw new Error('Guichet introuvable.')
			}
			
			if (guichets[0].etat_guichet === 'OUVERT') {
				throw new Error('Ce guichet est déjà ouvert.')
			}
			
			/* 4. Vérifier que l'agent n'a pas déjà une affectation active */
			const { rowCount: dejaAffecte } = await client.query(`
			SELECT 1
			FROM affectation_guichet
			WHERE id_agent = $1 AND date_fin IS NULL
			LIMIT 1
			`, [id_agent])
			
			if (dejaAffecte > 0) {
				throw new Error('Vous avez déjà un guichet ouvert.')
			}
			
			/* 5. Vérifier que le guichet n'est pas occupé */
			const { rowCount: guichetOccupe } = await client.query(`
			SELECT 1
			FROM affectation_guichet
			WHERE id_guichet = $1 AND date_fin IS NULL
			LIMIT 1
			`, [id_guichetFinal])
			
			if (guichetOccupe > 0) {
				throw new Error('Ce guichet est déjà occupé.')
			}
			
			/* 6. Créer l'affectation */
			const { rows: affectations } = await client.query(`
			INSERT INTO affectation_guichet (id_agent, id_guichet, date_debut)
			VALUES ($1, $2, NOW())
			RETURNING *
			`, [id_agent, id_guichetFinal])
			
			/* 7. Passer le guichet en OUVERT */
			const { rows: guichetOuvert } = await client.query(`
			UPDATE guichet
			SET etat_guichet = 'OUVERT'
			WHERE id_guichet = $1
			RETURNING id_guichet, numero_guichet, libelle, etat_guichet
			`, [id_guichetFinal])
			
			await client.query('COMMIT')
			
			return {
				...affectations[0],
				guichet: guichetOuvert[0]
			}
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	async listAgentsGuichetiers() {
		const { rows } = await pool.query(`
		SELECT
		a.id,
		a.matricule,
		a.nom,
		a.prenom,
		a.role,
		a.id_guichet,
		a.is_active,
		a.is_online,
		g.numero_guichet,
		g.libelle AS libelle_guichet
		FROM agents a
		LEFT JOIN guichet g
		ON g.id_guichet = a.id_guichet
		WHERE a.role = 'GUICHETIER'
		AND a.is_active = TRUE
		AND (a.admin_status IS NULL OR a.admin_status = 'approved')
		ORDER BY a.nom, a.prenom
		`)
		return rows
	},
	
	async reassignerGuichet(id_agent, id_guichet) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			/* 1. Vérifier que l'agent existe et est guichetier */
			const { rows: agents } = await client.query(`
			SELECT id, role, id_guichet, is_active
			FROM agents
			WHERE id = $1
			FOR UPDATE
			`, [id_agent])
			
			if (!agents[0]) {
				throw new Error('Agent introuvable.')
			}
			
			/* ⭐ Uniquement GUICHETIER */
			if (agents[0].role !== 'GUICHETIER') {
				throw new Error('Seuls les guichetiers peuvent être affectés à un guichet.')
			}
			
			if (!agents[0].is_active) {
				throw new Error('Cet agent est inactif.')
			}
			
			/* 2. Vérifier que le guichet existe */
			if (id_guichet) {
				const { rows: guichets } = await client.query(`
				SELECT id_guichet, etat_guichet
				FROM guichet
				WHERE id_guichet = $1
				FOR UPDATE
				`, [id_guichet])
				
				if (!guichets[0]) {
					throw new Error('Guichet introuvable.')
				}
				
				if (guichets[0].etat_guichet === 'OUVERT') {
					throw new Error(
						'Ce guichet est actuellement ouvert. Fermez-le avant de réassigner.'
					)
				}
			}
			
			/* 3. Si l'agent avait un autre guichet, vérifier qu'il est fermé */
			if (agents[0].id_guichet && agents[0].id_guichet !== id_guichet) {
				const { rows: ancienGuichet } = await client.query(`
				SELECT etat_guichet
				FROM guichet
				WHERE id_guichet = $1
				`, [agents[0].id_guichet])
				
				if (ancienGuichet[0]?.etat_guichet === 'OUVERT') {
					throw new Error(
						'L\'agent est actuellement affecté à un guichet ouvert. Fermez-le d\'abord.'
					)
				}
			}
			
			/* 4. Mettre à jour */
			const { rows: updated } = await client.query(`
			UPDATE agents
			SET id_guichet = $1
			WHERE id = $2
			RETURNING id, matricule, nom, prenom, role, id_guichet
			`, [id_guichet, id_agent])
			
			await client.query('COMMIT')
			return updated[0]
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	async liberer(id_agent) {
		if (!id_agent) {
			throw new Error('Agent obligatoire.')
		}
		
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			// Récupérer l'affectation active
			const affectationResult = await client.query(`
			SELECT
			id_affectation,
			id_guichet
			FROM affectation_guichet
			WHERE id_agent = $1
			AND date_fin IS NULL
			FOR UPDATE
			`, [id_agent])
			
			if (affectationResult.rowCount === 0) {
				throw new Error(
					'Cet agent n’a aucun guichet ouvert.'
				)
			}
			
			const affectation = affectationResult.rows[0]
			
			// Terminer l'affectation
			const result = await client.query(`
			UPDATE affectation_guichet
			SET date_fin = NOW()
			WHERE id_affectation = $1
			RETURNING *
			`, [affectation.id_affectation])
			
			// Fermer le guichet
			await client.query(`
			UPDATE guichet
			SET etat_guichet = 'FERME'
			WHERE id_guichet = $1
			`, [affectation.id_guichet])
			
			await client.query('COMMIT')
			
			return result.rows[0]
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	
	async monGuichet(id_agent) {
		if (!id_agent) return null
			
			const { rows } = await pool.query(`
			SELECT
			g.id_guichet,
			g.numero_guichet,
			g.libelle,
			g.etat_guichet,
			
			-- Affectation active éventuelle
			a.id_affectation,
			a.date_debut
			
			FROM agents ag
			
			INNER JOIN guichet g
			ON g.id_guichet = ag.id_guichet
			
			LEFT JOIN affectation_guichet a
			ON a.id_guichet = g.id_guichet
			AND a.date_fin IS NULL
			
			WHERE ag.id = $1
			LIMIT 1
			`, [id_agent])
			
			return rows[0] || null
	},
	/**
	 * Modifier l'état d'un guichet
	 */
	async setEtat(id_guichet, etat_guichet) {
		if (!id_guichet) {
			throw new Error('Guichet obligatoire.')
		}
		
		const etatsAutorises = [
			'OUVERT',
			'FERME'
		]
		
		if (!etatsAutorises.includes(etat_guichet)) {
			throw new Error(
				`État de guichet invalide. Valeurs autorisées : ${etatsAutorises.join(', ')}.`
			)
		}
		
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			const guichetResult = await client.query(`
			SELECT
			id_guichet,
			numero_guichet,
			libelle,
			etat_guichet
			FROM guichet
			WHERE id_guichet = $1
			FOR UPDATE
			`, [id_guichet])
			
			if (guichetResult.rowCount === 0) {
				throw new Error('Guichet introuvable.')
			}
			
			if (etat_guichet === 'FERME') {
				await client.query(`
				UPDATE affectation_guichet
				SET date_fin = NOW()
				WHERE id_guichet = $1
				AND date_fin IS NULL
				`, [id_guichet])
			}
			
			const { rows } = await client.query(`
			UPDATE guichet
			SET etat_guichet = $1
			WHERE id_guichet = $2
			RETURNING
			id_guichet,
			numero_guichet,
			libelle,
			etat_guichet
			`, [etat_guichet, id_guichet])
			
			await client.query('COMMIT')
			
			return rows[0]
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	}
}
