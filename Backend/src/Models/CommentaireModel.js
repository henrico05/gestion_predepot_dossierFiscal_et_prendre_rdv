import pool from '../DataBases/db.js'
import { emitStatsRefresh, emitDossierUpdated } from '../Socket/emitters.js' 

export const CommentaireModel = {
	/* ============================================================
	 * Liste des commentaires d'un dossier
	 * ============================================================ */
	async findByDossier(id_dossier) {
		const { rows } = await pool.query(`
		SELECT
		c.id_commentaire,
		c.contenu,
		c.interne,
		c.date_creation,
		c.date_modification,
		c.id_agent,
		c.id_contribuable,
		c.auteur_type,
		
		a.nom           AS agent_nom,
		a.prenom        AS agent_prenom,
		a.matricule     AS agent_matricule,
		a.role          AS agent_role,
		
		co.nom_raison_sociale AS contribuable_nom,
		co.nif                AS contribuable_nif
		
		FROM commentaire c
		LEFT JOIN agents a        ON a.id = c.id_agent
		LEFT JOIN contribuable co ON co.id_contribuable = c.id_contribuable
		WHERE c.id_dossier = $1
		ORDER BY c.date_creation ASC
		`, [id_dossier])
		
		return rows.map(this.mapRow)
	},
	
	/* ============================================================
	 * Créer un commentaire
	 * ============================================================ */
	async create({ id_dossier, id_agent = null, id_contribuable = null, contenu, interne = true }) {
		if (!contenu?.trim()) {
			throw new Error('Le contenu du commentaire est obligatoire.')
		}
		
		if (!id_agent && !id_contribuable) {
			throw new Error('Un auteur est obligatoire.')
		}
		
		const auteurType = id_agent ? 'AGENT' : 'CONTRIBUABLE'
		
		const { rows } = await pool.query(`
		INSERT INTO commentaire (
			contenu,
			interne,
			date_creation,
			id_dossier,
			id_agent,
			id_contribuable,
			auteur_type
		)
		VALUES ($1, $2, NOW(), $3, $4, $5, $6)
		RETURNING *
		`, [
			contenu.trim(),
										  Boolean(interne),
										  id_dossier,
									id_agent,
									id_contribuable,
									auteurType
		])
		
		return rows[0]
	},
	
	/* ============================================================
	 * Modifier un commentaire (auteur uniquement)
	 * ============================================================ */
	async update(id_commentaire, { id_agent, contenu }) {
		const { rows } = await pool.query(`
		UPDATE commentaire
		SET contenu = $1, date_modification = NOW()
		WHERE id_commentaire = $2
		AND id_agent = $3
		RETURNING *
		`, [contenu.trim(), id_commentaire, id_agent])
		
		if (!rows[0]) {
			throw new Error('Commentaire introuvable ou non autorisé.')
		}
		
		return rows[0]
	},
	
	/* ============================================================
	 * Supprimer un commentaire (auteur uniquement)
	 * ============================================================ */
	async remove(id_commentaire, id_agent) {
		const { rows } = await pool.query(`
		DELETE FROM commentaire
		WHERE id_commentaire = $1
		AND id_agent = $2
		RETURNING id_commentaire
		`, [id_commentaire, id_agent])
		
		return rows[0] || null
	},
	
	/* ============================================================
	 * Normalisation
	 * ============================================================ */
	mapRow(row) {
		if (!row) return null
			
			const agentNom = [row.agent_prenom, row.agent_nom]
			.filter(Boolean)
			.join(' ')
			.trim()
			
			return {
				id_commentaire: row.id_commentaire,
				contenu: row.contenu,
				interne: row.interne,
				date_creation: row.date_creation,
				date_modification: row.date_modification,
				auteur_type: row.auteur_type,
				id_agent: row.id_agent,
				id_contribuable: row.id_contribuable,
				
				auteur: row.auteur_type === 'AGENT'
				? (agentNom || 'Agent')
				: (row.contribuable_nom || 'Contribuable'),
				
				auteur_detail: row.auteur_type === 'AGENT'
				? {
					matricule: row.agent_matricule,
					role: row.agent_role
				}
				: {
					nif: row.contribuable_nif
				}
			}
	}
}
