import pool from '../DataBases/db.js'


/* ============================================================
 * CACHE COURT (10 secondes)
 * ============================================================ */
const cache = new Map()
const CACHE_TTL = 10000   /* 10s */

function getCache(key) {
	const hit = cache.get(key)
	if (!hit) return null
		if (Date.now() - hit.timestamp > CACHE_TTL) {
			cache.delete(key)
			return null
		}
		return hit.value
}

function setCache(key, value) {
	cache.set(key, { value, timestamp: Date.now() })
}

export function clearStatsCache() {
	cache.clear()
}

export const StatsController = {
	
	async dashboard(req, res) {
		try {
			/* ============================================================
			 * 1. TICKETS DU JOUR
			 * ============================================================ */
			const { rows: [tickets] } = await pool.query(`
			SELECT
			COUNT(*)::int AS total,
														 COUNT(*) FILTER (WHERE statut_ticket = 'EN_ATTENTE')::int AS en_attente,
														 COUNT(*) FILTER (WHERE statut_ticket = 'APPELE')::int AS appeles,
														 COUNT(*) FILTER (WHERE statut_ticket = 'EN_COURS')::int AS en_cours,
														 COUNT(*) FILTER (WHERE statut_ticket = 'TERMINE')::int AS termines,
														 COUNT(*) FILTER (WHERE statut_ticket = 'ABSENT')::int AS absents
														 FROM ticket_file_attente
														 WHERE date_file = CURRENT_DATE
														 `)
			
			/* ============================================================
			 * 2. AFFLUENCE PAR HEURE (aujourd'hui)
			 * ============================================================ */
			const { rows: affluence } = await pool.query(`
			SELECT
			EXTRACT(HOUR FROM heure_arrivee)::int AS heure,
														 COUNT(*)::int AS count
														 FROM ticket_file_attente
														 WHERE date_file = CURRENT_DATE
														 AND heure_arrivee IS NOT NULL
														 GROUP BY EXTRACT(HOUR FROM heure_arrivee)
														 ORDER BY heure
														 `)
		
			const { rows: [dossiers] } = await pool.query(`
			SELECT
			COUNT(*)::int AS total,
														  COUNT(*) FILTER (WHERE statut_dossier = 'SOUMIS')::int AS soumis,
														  COUNT(*) FILTER (WHERE statut_dossier = 'EN_VERIFICATION')::int AS en_verification,
														  COUNT(*) FILTER (WHERE statut_dossier = 'A_COMPLETER')::int AS a_completer,
														  COUNT(*) FILTER (WHERE statut_dossier = 'VALIDE')::int AS valides,
														  COUNT(*) FILTER (WHERE statut_dossier = 'REJETE')::int AS rejetes
														  FROM dossier_fiscal
														  `)
			
			const { rows: [dossiersJour] } = await pool.query(`
			SELECT COUNT(*)::int AS n
			FROM dossier_fiscal
			WHERE DATE(date_predepot) = CURRENT_DATE
			`)
			
			/* ============================================================
			 * 4. AGENTS EN LIGNE
			 * ============================================================ */
			const { rows: [agents] } = await pool.query(`
			SELECT
			COUNT(*)::int AS total,
														COUNT(*) FILTER (WHERE is_online = TRUE)::int AS en_ligne
														FROM agents
														WHERE is_active = TRUE 
														AND role IN ('GUICHETIER', 'VERIFICATEUR')
														`)
			
			/* ============================================================
			 * 5. COMPTES EN ATTENTE DE VALIDATION
			 * ============================================================ */
			const { rows: [pendingAgents] } = await pool.query(`
			SELECT COUNT(*)::int AS n
			FROM agents
			WHERE admin_status = 'pending'
			AND email_verified = TRUE
			`)
			
			const { rows: [pendingContribs] } = await pool.query(`
			SELECT COUNT(*)::int AS n
			FROM contribuable
			WHERE admin_activation = FALSE
			AND email_verified = TRUE
			`)
			
			/* ============================================================
			 * 6. TEMPS D'ATTENTE MOYEN
			 * ============================================================ */
			const { rows: [attente] } = await pool.query(`
			SELECT
			AVG(
				EXTRACT(
					EPOCH FROM (
						(date_file + heure_appel)::timestamp - (date_file + heure_arrivee)::timestamp
					)
				) / 60
			)::numeric(10,1) AS minutes
			FROM ticket_file_attente
			WHERE date_file = CURRENT_DATE
			AND heure_arrivee IS NOT NULL
			AND heure_appel   IS NOT NULL
			`)
			const { rows: activiteAgents } = await pool.query(`
			SELECT
			a.id,
			a.nom,
			a.prenom,
			a.role,
			a.is_online,
			a.photo_base64,
			a.photo_content_type,
			COUNT(DISTINCT t.id_ticket)::int AS tickets_traites,
			 AVG(
				EXTRACT(
				 EPOCH FROM (
				(t.date_file + t.heure_fin)::timestamp - (t.date_file + t.heure_appel)::timestamp
				  )
				  ) / 60
			)::numeric(10,1) AS temps_moyen
			 FROM agents a
			LEFT JOIN ticket_file_attente t
			 ON t.id_agent = a.id
			AND t.date_file = CURRENT_DATE
			AND t.statut_ticket = 'TERMINE'
			AND t.heure_appel IS NOT NULL
			 AND t.heure_fin   IS NOT NULL
			WHERE a.role IN ('GUICHETIER', 'VERIFICATEUR', 'CHEF_CENTRE')
			 AND a.is_active = TRUE
			AND a.admin_status = 'approved'
			AND a.email_verified = TRUE
			GROUP BY a.id, a.nom, a.prenom, a.role, a.is_online, a.photo_base64, a.photo_content_type
			ORDER BY tickets_traites DESC
			  LIMIT 10
															  `)
			
			/* ============================================================
			 * 8. ALERTES CRITIQUES
			 * ============================================================ */
			const alertes = []
			
			/* File critique (>10 tickets en attente) */
			const { rows: filesCritiques } = await pool.query(`
			SELECT
			COALESCE(g.numero_guichet, '0') AS numero_guichet,
															  COUNT(*)::int AS n
															  FROM ticket_file_attente t
															  LEFT JOIN guichet g
															  ON g.id_guichet = t.id_guichet
															  WHERE t.date_file = CURRENT_DATE
															  AND t.statut_ticket = 'EN_ATTENTE'
															  GROUP BY g.numero_guichet
															  HAVING COUNT(*) > 10
															  `)
			
			for (const fileCritique of filesCritiques) {
				alertes.push({
					type: 'FILE_CRITIQUE',
					niveau: 'WARNING',
					titre: 'File d\'attente critique',
					message: `${fileCritique.n} personnes en attente au guichet ${fileCritique.numero_guichet || 'principal'}`
				})
			}
			
			/* Dossiers bloqués (>24h sans traitement) */
			const { rows: [dossiersBloques] } = await pool.query(`
			SELECT COUNT(*)::int AS n
			FROM dossier_fiscal
			WHERE statut_dossier = 'EN_VERIFICATION'
			AND NOW() - date_predepot > INTERVAL '24 hours'
			`)
			
			if (dossiersBloques?.n > 0) {
				alertes.push({
					type: 'DOSSIER_BLOQUE',
					niveau: 'ERROR',
					titre: 'Dossiers bloqués',
					message: `${dossiersBloques.n} dossier(s) en vérification depuis plus de 24h`
				})
			}
			
			/* Comptes en attente */
			const totalPending = (pendingAgents?.n || 0) + (pendingContribs?.n || 0)
			if (totalPending > 0) {
				alertes.push({
					type: 'COMPTES_EN_ATTENTE',
					niveau: 'INFO',
					titre: 'Comptes à valider',
					message: `${totalPending} compte(s) en attente de validation`
				})
			}
			
			/* ============================================================
			 * RÉPONSE
			 * ============================================================ */
			return res.json({
				success: true,
				data: {
					tickets: {
						total: tickets.total,
						enAttente: tickets.en_attente,
						appeles: tickets.appeles,
						enCours: tickets.en_cours,
						termines: tickets.termines,
						absents: tickets.absents
					},
					dossiers: {
						total: dossiers.total,
						soumis: dossiers.soumis,
						enVerification: dossiers.en_verification,
						aCompleter: dossiers.a_completer,
						valides: dossiers.valides,
						rejetes: dossiers.rejetes
					},
					dossiersPredepositesAujourdhui: dossiersJour?.n || 0,
					agents: {
						total: agents.total,
						enLigne: agents.en_ligne
					},
					pending: {
						agents: pendingAgents?.n || 0,
						contribuables: pendingContribs?.n || 0,
						total: totalPending
					},
					tempsAttenteMoyen: Number(attente?.minutes || 0),
							affluence: affluence.map(a => ({
								heure: a.heure,
								count: a.count
							})),
							activiteAgents,
							alertes
				}
			})
			
		} catch (error) {
			console.error('❌ Erreur stats dashboard :', error)
			return res.status(500).json({
				success: false,
				message: 'Impossible de charger les statistiques.'
			})
		}
	},
	
	async verificateur(req, res) {
		try {
			const { rows: [dossiers] } = await pool.query(`
			SELECT
			COUNT(*) FILTER (WHERE statut_dossier = 'SOUMIS')::int AS a_traiter,
														  COUNT(*) FILTER (WHERE statut_dossier = 'EN_VERIFICATION')::int AS en_cours,
														  COUNT(*) FILTER (WHERE statut_dossier = 'A_COMPLETER')::int AS a_completer
														  FROM dossier_fiscal
														  `)
			
			/* Décisions de CET agent aujourd'hui (validés / rejetés / temps moyen) */
			const { rows: [decisionsJour] } = await pool.query(`
			SELECT
			COUNT(*) FILTER (WHERE t.decision = 'VALIDE')::int AS valides_aujourdhui,
															   COUNT(*) FILTER (WHERE t.decision = 'REJETE')::int AS rejetes_aujourdhui,
															   AVG(EXTRACT(EPOCH FROM (NOW() - t.date_traitement)) / 60)::numeric(10,0) AS minutes
															   FROM traitement t
															   WHERE t.id_agent = $1
															   AND DATE(t.date_traitement) = CURRENT_DATE
															   `, [req.user.id])
			
			/* Activité récente de CET agent */
			const { rows: activite } = await pool.query(`
			SELECT
			t.id_traitement,
			t.date_traitement,
			t.decision,
			t.commentaire_agent,
			d.reference_dossier,
			d.id_dossier
			FROM traitement t
			JOIN dossier_fiscal d ON d.id_dossier = t.id_dossier
			WHERE t.id_agent = $1
			ORDER BY t.date_traitement DESC
			LIMIT 5
			`, [req.user.id])
			
			return res.json({
				success: true,
				data: {
					aTraiter: Number(dossiers.a_traiter || 0),
							enCours: Number(dossiers.en_cours || 0),
							validesAujourdhui: Number(decisionsJour?.valides_aujourdhui || 0),
							rejetesAujourdhui: Number(decisionsJour?.rejetes_aujourdhui || 0),
							aCompleter: Number(dossiers.a_completer || 0),
							tempsMoyen: Number(decisionsJour?.minutes || 0),
							activite: activite || []
				}
			})
		} catch (error) {
			console.error('❌ Erreur stats verificateur :', error)
			return res.status(500).json({
				success: false,
				message: 'Impossible de charger les statistiques.'
			})
		}
	},
	async StatistiqueAgent(req, res) {
		try {
			/* ---------- Paramètres ---------- */
			const role = String(req.user?.role || '').toUpperCase()
			const periode = String(req.query.periode || 'annee').toLowerCase()
			const mesStats = req.query.mes_stats === 'true'
			let idAgent = null
			
			if (mesStats) {
				idAgent = req.user?.id
			}
			
			/* ---------- Sécurité ---------- */
			if (!req.user?.id || !role) {
				return res.status(401).json({
					success: false,
					message: 'Utilisateur non authentifié.'
				})
			}
			
			if (mesStats && !idAgent) {
				return res.status(400).json({
					success: false,
					message: 'Identifiant agent introuvable.'
				})
			}
			
			/* ---------- Cache ---------- */
			const cacheKey = `stats:${role}:${periode}:${mesStats ? idAgent : 'all'}`
			const cached = getCache(cacheKey)
			if (cached) {
				return res.json({ success: true, data: cached, fromCache: true })
			}
			
			/* ---------- Bornes de période ---------- */
			
			const now = new Date()
			
			let dateDebut
			let labels = []
			let typePeriode
			
			switch (periode) {
				
				case 'mois': {
					
					dateDebut = new Date(now)
					dateDebut.setDate(now.getDate() - 27)
					
					labels = ['S1', 'S2', 'S3', 'S4']
					typePeriode = 'semaine'
					break
				}
				
				case 'trimestre': {
					
					dateDebut = new Date(
						now.getFullYear(),
										 now.getMonth() - 2,
										 1
					)
					
					labels = []
					
					for (let i = 0; i < 3; i++) {
						const d = new Date(
							now.getFullYear(),
										   now.getMonth() - 2 + i,
										   1
						)
						
						labels.push(
							d.toLocaleDateString('fr-FR', {
								month: 'short'
							}).replace('.', '').toUpperCase()
						)
					}
					
					typePeriode = 'mois'
					break
				}
				
				case 'annee':
				default: {
					/*
					 * Année = janvier → décembre
					 * de l'année courante.
					 */
					dateDebut = new Date(
						now.getFullYear(),
										 0,
						  1
					)
					
					labels = [
						'JAN',
						'FÉV',
						'MAR',
						'AVR',
						'MAI',
						'JUN',
						'JUL',
						'AOÛ',
						'SEP',
						'OCT',
						'NOV',
						'DÉC'
					]
					
					typePeriode = 'mois'
					break
				}
			}
			
			/* ---------- Construction des séries ---------- */
			
			function construireSerieMensuelle(rows) {
				const map = new Map(
					rows.map(row => [
						row.mois,
			  Number(row.total || 0)
					])
				)
				
				return labels.map((_, index) => {
				
					const d = new Date(
						dateDebut.getFullYear(),
									   dateDebut.getMonth() + index,
									   1
					)
					
					const key =
					`${d.getFullYear()}-${String(
						d.getMonth() + 1
					).padStart(2, '0')}`
					
					return map.get(key) || 0
				})
			}
			
			function construireSerieHebdomadaire(rows) {
				const map = new Map(
					rows.map(row => [
						Number(row.semaine),
							 Number(row.total || 0)
					])
				)
				
				return labels.map((_, index) => {
					const semaine = index + 1
					return map.get(semaine) || 0
				})
			}
			
			/* ---------- Auto-détection rôle ---------- */
			const inclureRDV      = ['CHEF_CENTRE'].includes(role)
			const inclureDossiers = ['CHEF_CENTRE', 'VERIFICATEUR'].includes(role)
			const inclureTickets  = ['CHEF_CENTRE', 'GUICHETIER'].includes(role)
			
			const series = {}
			const kpis = {}
			const sparks = {}
			
			const paramsTempsMoyen = []
			
			let filtreAgentTempsMoyen = ''
			
			if (mesStats && idAgent) {
				paramsTempsMoyen.push(idAgent)
				filtreAgentTempsMoyen = 'AND id_agent = $1'
			}
			
			const { rows: [tempsMoyenTicket] } = await pool.query(`
			SELECT
			COALESCE(
				ROUND(
					AVG(
						EXTRACT(
							EPOCH FROM (
								(date_file + heure_appel)::timestamp
								-
								(date_file + heure_arrivee)::timestamp
							)
						) / 60
					)
				),
			0
			)::int AS minutes
			FROM ticket_file_attente
			WHERE date_file >= CURRENT_DATE
			AND heure_arrivee IS NOT NULL
			AND heure_appel IS NOT NULL
			${filtreAgentTempsMoyen}
			`, paramsTempsMoyen)
			
			kpis.tempsMoyen = Number(
				tempsMoyenTicket?.minutes || 0
			)
			
			if (inclureRDV) {
				
				let rows = []
				
				if (typePeriode === 'semaine') {
					
					const result = await pool.query(`
					SELECT
					(
						FLOOR(
							(
								DATE(date_rdv) - DATE($1)
							) / 7
						) + 1
					)::int AS semaine,
					COUNT(*)::int AS total
					FROM rendez_vous
					WHERE date_rdv >= $1
					AND date_rdv < $1 + INTERVAL '28 days'
					AND UPPER(statut_rdv) <> 'ANNULE'
					GROUP BY semaine
					ORDER BY semaine
					`, [dateDebut])
					
					rows = result.rows
					
					series.rdv = construireSerieHebdomadaire(rows)
					
				} else {
					
					const result = await pool.query(`
					SELECT
					TO_CHAR(
						date_rdv,
			 'YYYY-MM'
					) AS mois,
					COUNT(*)::int AS total
					FROM rendez_vous
					WHERE date_rdv >= $1
					AND date_rdv < $2
					AND UPPER(statut_rdv) <> 'ANNULE'
					GROUP BY TO_CHAR(
						date_rdv,
					  'YYYY-MM'
					)
					ORDER BY mois
					`, [
						dateDebut,
						periode === 'annee'
						? new Date(now.getFullYear() + 1, 0, 1)
						: new Date(now.getFullYear(), now.getMonth() + 1, 1)
					])
					
					rows = result.rows
					
					series.rdv = construireSerieMensuelle(rows)
				}
				
				sparks.rdv = series.rdv.slice(-7)
				
				const { rows: [kpi] } = await pool.query(`
				SELECT COUNT(*)::int AS total
				FROM rendez_vous
				WHERE date_rdv >= $1
				AND date_rdv < $2
				AND UPPER(statut_rdv) <> 'ANNULE'
				`, [
					dateDebut,
					periode === 'annee'
					? new Date(now.getFullYear() + 1, 0, 1)
					: new Date(now.getFullYear(), now.getMonth() + 1, 1)
				])
				
				kpis.rdv = Number(kpi?.total || 0)
			}
			
			
			if (inclureDossiers) {
				
				let rows = []
				
				if (typePeriode === 'semaine') {
					
					const result = await pool.query(`
					SELECT
					(
						FLOOR(
							(
								DATE(date_predepot) - DATE($1)
							) / 7
						) + 1
					)::int AS semaine,
					COUNT(*)::int AS total
					FROM dossier_fiscal
					WHERE date_predepot >= $1
					AND date_predepot < $1 + INTERVAL '28 days'
					AND statut_dossier IN ('VALIDE', 'REJETE')
					GROUP BY semaine
					ORDER BY semaine
					`, [dateDebut])
					
					rows = result.rows
					
					series.dossiers =
					construireSerieHebdomadaire(rows)
					
				} else {
					
					const dateFin =
					periode === 'annee'
					? new Date(now.getFullYear() + 1, 0, 1)
					: new Date(now.getFullYear(), now.getMonth() + 1, 1)
					
					const result = await pool.query(`
					SELECT
					TO_CHAR(
						date_predepot,
			 'YYYY-MM'
					) AS mois,
					COUNT(*)::int AS total
					FROM dossier_fiscal
					WHERE date_predepot >= $1
					AND date_predepot < $2
					AND statut_dossier IN ('VALIDE', 'REJETE')
					GROUP BY TO_CHAR(
						date_predepot,
					  'YYYY-MM'
					)
					ORDER BY mois
					`, [dateDebut, dateFin])
					
					rows = result.rows
					
					series.dossiers =
					construireSerieMensuelle(rows)
				}
				
				sparks.dossiers =
				series.dossiers.slice(-7)
				
				const dateFin =
				periode === 'annee'
				? new Date(now.getFullYear() + 1, 0, 1)
				: new Date(now.getFullYear(), now.getMonth() + 1, 1)
				
				const { rows: [kpi] } = await pool.query(`
				SELECT COUNT(*)::int AS total
				FROM dossier_fiscal
				WHERE date_predepot >= $1
				AND date_predepot < $2
				AND statut_dossier IN ('VALIDE', 'REJETE')
				`, [dateDebut, dateFin])
				
				kpis.dossiers =
				Number(kpi?.total || 0)
			}
			
			/* ============================================================
			 * 3. TICKETS
			 * ============================================================ */
			if (inclureTickets) {
				
				const dateFin =
				periode === 'annee'
				? new Date(now.getFullYear() + 1, 0, 1)
				: new Date(now.getFullYear(), now.getMonth() + 1, 1)
				
				const paramsMensuels =
				mesStats && idAgent
				? [dateDebut, dateFin, idAgent]
				: [dateDebut, dateFin]
				
				const filtreAgentMensuel =
				mesStats && idAgent
				? 'AND id_agent = $3'
				: ''
				
				const { rows } = await pool.query(`
				SELECT
				TO_CHAR(
					date_file,
			'YYYY-MM'
				) AS mois,
				COUNT(*)::int AS total
				FROM ticket_file_attente
				WHERE date_file >= $1
				AND date_file < $2
				AND statut_ticket = 'TERMINE'
				${filtreAgentMensuel}
				GROUP BY TO_CHAR(
					date_file,
					 'YYYY-MM'
				)
				ORDER BY mois
				`, paramsMensuels)
				
				const serieTickets = construireSerieMensuelle(rows)
				
				series.tickets = serieTickets
				
				sparks.tickets = serieTickets.slice(-7)
				
				const paramsKpi =
				mesStats && idAgent
				? [dateDebut, dateFin, idAgent]
				: [dateDebut, dateFin]
				
				const filtreAgentKpi =
				mesStats && idAgent
				? 'AND id_agent = $3'
				: ''
				
				const { rows: [kpi] } = await pool.query(`
				SELECT
				COUNT(*)::int AS total
				FROM ticket_file_attente
				WHERE date_file >= $1
				AND date_file < $2
				AND statut_ticket = 'TERMINE'
				${filtreAgentKpi}
				`, paramsKpi)
				
				kpis.tickets = Number(kpi?.total || 0)
			}
			
			/* ---------- Réponse ---------- */
			const result = {
				series,
				kpis,
				sparks,
				meta: {
					role,
					periode,
					mesStats,
					dateDebut: dateDebut.toISOString(),
					labels
				}
			}
			
			setCache(cacheKey, result)
			
			return res.json({ success: true, data: result })
			
		} catch (error) {
			console.error('❌ Erreur stats dashboard :', error)
			return res.status(500).json({
				success: false,
				message: 'Impossible de charger les statistiques.'
			})
		}
	}
}
