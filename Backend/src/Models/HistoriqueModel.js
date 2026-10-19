import pool from '../DataBases/db.js'

export const HistoriqueModel = {
	/* ============================================================
	 * Timeline agrégée : transitions + vérifications + uploads + commentaires
	 * ============================================================ */
	async findByDossier(id_dossier) {
		const { rows } = await pool.query(`
		WITH events AS (
			/* 1. Transitions de statut */
			SELECT
			'TRANSITION' AS event_type,
			t.date_traitement AS event_date,
			t.decision AS event_action,
			t.commentaire_agent AS event_detail,
			'AGENT' AS auteur_type,
			t.id_agent AS id_acteur,
			a.nom AS agent_nom,
			a.prenom AS agent_prenom,
			a.matricule AS agent_matricule,
			NULL AS contribuable_nom
			FROM traitement t
			LEFT JOIN agents a ON a.id = t.id_agent
			WHERE t.id_dossier = $1
			
			UNION ALL
			
			/* 2. Vérifications de pièces */
			SELECT
			'VERIFICATION_PIECE' AS event_type,
			pj.date_verification AS event_date,
			pj.statut_verification AS event_action,
			pj.commentaire_verification AS event_detail,
			'AGENT' AS auteur_type,
			pj.id_agent_verificateur AS id_acteur,
			a.nom AS agent_nom,
			a.prenom AS agent_prenom,
			a.matricule AS agent_matricule,
			NULL AS contribuable_nom
			FROM piece_justificative pj
			LEFT JOIN agents a ON a.id = pj.id_agent_verificateur
			WHERE pj.id_dossier = $1
			AND pj.date_verification IS NOT NULL
			
			UNION ALL
			
			/* 3. Uploads de pièces (par le contribuable) */
			SELECT
			'UPLOAD_PIECE' AS event_type,
			pj.date_upload AS event_date,
			'PIECE_AJOUTEE' AS event_action,
			pj.nom_fichier AS event_detail,
			'CONTRIBUABLE' AS auteur_type,
			NULL AS id_acteur,
			NULL AS agent_nom,
			NULL AS agent_prenom,
			NULL AS agent_matricule,
			NULL AS contribuable_nom
			FROM piece_justificative pj
			WHERE pj.id_dossier = $1
			
			UNION ALL
			
			/* 4. Commentaires */
			SELECT
			'COMMENTAIRE' AS event_type,
			c.date_creation AS event_date,
			'COMMENTAIRE_AJOUTE' AS event_action,
			c.contenu AS event_detail,
			c.auteur_type,
			c.id_agent AS id_acteur,
			a.nom AS agent_nom,
			a.prenom AS agent_prenom,
			a.matricule AS agent_matricule,
			co.nom_raison_sociale AS contribuable_nom
			FROM commentaire c
			LEFT JOIN agents a ON a.id = c.id_agent
			LEFT JOIN contribuable co ON co.id_contribuable = c.id_contribuable
			WHERE c.id_dossier = $1
		)
		
		SELECT *
		FROM events
		WHERE event_date IS NOT NULL
		ORDER BY event_date DESC
		`, [id_dossier])
		
		return rows.map(this.mapRow)
	},
	
	/* ============================================================
	 * Groupement par jour
	 * ============================================================ */
	groupByDay(events) {
		const groups = {}
		
		events.forEach(event => {
			const d = new Date(event.event_date)
			const key = d.toISOString().split('T')[0]
			if (!groups[key]) groups[key] = []
				groups[key].push(event)
		})
		
		return Object.entries(groups)
		.map(([date, items]) => ({
			date,
			label: this.formatDayLabel(date),
								 items
		}))
		.sort((a, b) => b.date.localeCompare(a.date))
	},
	
	formatDayLabel(isoDate) {
		const today = new Date()
		const date = new Date(isoDate)
		const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))
		
		if (diffDays === 0) return "Aujourd'hui"
			if (diffDays === 1) return 'Hier'
				if (diffDays < 7) return `Il y a ${diffDays} jours`
					
					return date.toLocaleDateString('fr-FR', {
						weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
					})
	},
	
	mapRow(row) {
		const agentNom = [row.agent_prenom, row.agent_nom]
		.filter(Boolean)
		.join(' ')
		.trim()
		
		return {
			event_type: row.event_type,
			event_date: row.event_date,
			event_action: row.event_action,
			event_detail: row.event_detail,
			auteur_type: row.auteur_type,
			
			auteur: row.auteur_type === 'AGENT'
			? (agentNom || 'Agent')
			: (row.contribuable_nom || 'Contribuable'),
			
			auteur_detail: row.auteur_type === 'AGENT'
			? { matricule: row.agent_matricule }
			: {}
		}
	}
}
