import pool from '../DataBases/db.js'

export const TraitementModel = {
	/* ============================================================
	 * Liste des traitements d'un dossier
	 * ============================================================ */
	async findByDossier(id_dossier) {
		const { rows } = await pool.query(`
		SELECT
		t.id_traitement,
		t.date_traitement,
		t.decision,
		t.commentaire_agent,
		t.id_agent,
		
		a.nom        AS agent_nom,
		a.prenom     AS agent_prenom,
		a.matricule  AS agent_matricule,
		a.role       AS agent_role
		
		FROM traitement t
		LEFT JOIN agents a ON a.id = t.id_agent
		WHERE t.id_dossier = $1
		ORDER BY t.date_traitement DESC
		`, [id_dossier])
		
		return rows.map(this.mapRow)
	},
	
	/* ============================================================
	 * Normalisation
	 * ============================================================ */
	mapRow(row) {
		const agentNom = [row.agent_prenom, row.agent_nom]
		.filter(Boolean)
		.join(' ')
		.trim()
		
		return {
			id_traitement: row.id_traitement,
			date_traitement: row.date_traitement,
			decision: row.decision,
			commentaire_agent: row.commentaire_agent,
			id_agent: row.id_agent,
			
			agent: agentNom || '—',
			agent_matricule: row.agent_matricule || '—',
			agent_role: row.agent_role || '—'
		}
	}
}
