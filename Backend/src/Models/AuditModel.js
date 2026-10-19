import pool from '../DataBases/db.js'

export const AuditModel = {
	/* ============================================================
	 * Journal d'audit d'un dossier (via table journal_audit)
	 * ============================================================ */
	async findByDossier(id_dossier) {
		const { rows } = await pool.query(`
		SELECT
		ja.id_audit,
		ja.type_acteur,
		ja.id_acteur,
		ja.action,
		ja.table_cible,
		ja.id_cible,
		ja.date_action,
		ja.details_json,
		
		-- Enrichissement agent (id_acteur est un UUID)
		a.nom       AS agent_nom,
		a.prenom    AS agent_prenom,
		a.matricule AS agent_matricule,
		
		-- Enrichissement contribuable (id_acteur est un int en string)
		c.nom_raison_sociale AS contribuable_nom,
		c.nif                AS contribuable_nif
		
		FROM journal_audit ja
		
		-- ⚠️ LEFT JOIN conditionnel selon le type d'acteur
		LEFT JOIN agents a
		ON ja.type_acteur = 'AGENT'
		AND a.id::text = ja.id_acteur
		
		LEFT JOIN contribuable c
		ON ja.type_acteur = 'CONTRIBUABLE'
		AND c.id_contribuable::text = ja.id_acteur
		
		WHERE (
			(ja.table_cible = 'dossier_fiscal'   AND ja.id_cible = $1::text)
			OR (ja.table_cible = 'commentaire'   
			AND ja.details_json->>'id_dossier' = $1::text)
			OR (ja.table_cible = 'piece_justificative'   
			AND ja.details_json->>'id_dossier' = $1::text)
		)
		ORDER BY ja.date_action DESC
		`, [id_dossier])
		
		return rows.map(this.mapRow)
	},
	
	mapRow(row) {
		const agentNom = [row.agent_prenom, row.agent_nom]
		.filter(Boolean)
		.join(' ')
		.trim()
		
		return {
			id_audit: row.id_audit,
			type_acteur: row.type_acteur,
			id_acteur: row.id_acteur,
			action: row.action,
			table_cible: row.table_cible,
			id_cible: row.id_cible,
			date_action: row.date_action,
			details_json: row.details_json,
			
			acteur_nom: row.type_acteur === 'AGENT'
			? (agentNom || 'Agent inconnu')
			: (row.contribuable_nom || 'Contribuable inconnu'),
			
			acteur_detail: row.type_acteur === 'AGENT'
			? { matricule: row.agent_matricule }
			: { nif: row.contribuable_nif }
		}
	}
}
