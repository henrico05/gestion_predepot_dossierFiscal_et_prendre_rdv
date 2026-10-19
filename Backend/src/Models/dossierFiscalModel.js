import pool from '../DataBases/db.js'
import { NotificationModel } from './NotificationModel.js'
import { emitStatsRefresh, emitDossierUpdated } from '../Socket/emitters.js' 

const transitions = {
	BROUILLON: ['SOUMIS'],
	SOUMIS: ['EN_VERIFICATION'],
	EN_VERIFICATION: ['VALIDE', 'A_COMPLETER', 'REJETE'],
	A_COMPLETER: ['SOUMIS'],
	VALIDE: ['CLOTURE'],
	REJETE: ['CLOTURE', 'A_COMPLETER'],
	CLOTURE: []
}

export const DossierFiscalModel = {
	
	async generateReference(client, id_service) {
		const y = new Date().getFullYear()
		
		const { rows } = await client.query(`
		SELECT COUNT(*)::int + 1 AS n
		FROM dossier_fiscal
		WHERE EXTRACT(YEAR FROM date_predepot) = $1
		`, [y])
		
		return `DF-${y}-${String(id_service).padStart(2, '0')}-${String(rows[0].n).padStart(5, '0')}`
	},
	
	
	async findById(id) {
		const { rows } = await pool.query(`
		SELECT
		d.*,
		
		-- Service fiscal
		sf.libelle_service,
		
		-- Contribuable
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.email,
		c.telephone,
		c.adresse,
		c.type_contribuable,
		
		-- Rendez-vous
		rv.date_rdv,
		rv.heure_rdv,
		rv.statut_rdv,
		rv.canal_creation,
		rv.commentaire AS commentaire_rdv,
		
		-- Ticket lié au rendez-vous
		tf.id_ticket,
		tf.numero_ticket,
		tf.date_emission,
		tf.heure_arrivee,
		tf.heure_appel,
		tf.heure_fin,
		tf.statut_ticket,
		
		-- Dernier traitement du dossier
		tr.date_traitement,
		tr.decision,
		tr.commentaire_agent
		
		FROM dossier_fiscal d
		
		-- Service
		LEFT JOIN service_fiscal sf
		ON sf.id_service = d.id_service
		
		-- Contribuable
		LEFT JOIN contribuable c
		ON c.id_contribuable = d.id_contribuable
		
		-- Rendez-vous
		LEFT JOIN rendez_vous rv
		ON rv.id_rdv = d.id_rdv
		
		-- Ticket lié au rendez-vous
		LEFT JOIN LATERAL (
			SELECT
			tf.id_ticket,
			tf.numero_ticket,
			tf.date_emission,
			tf.heure_arrivee,
			tf.heure_appel,
			tf.heure_fin,
			tf.statut_ticket
			FROM ticket_file_attente tf
			WHERE tf.id_rdv = rv.id_rdv
			ORDER BY tf.id_ticket DESC
			LIMIT 1
		) tf ON TRUE
		
		-- Dernier traitement du dossier
		LEFT JOIN LATERAL (
			SELECT
			t.date_traitement,
			t.decision,
			t.commentaire_agent
			FROM traitement t
			WHERE t.id_dossier = d.id_dossier
			ORDER BY t.date_traitement DESC
			LIMIT 1
		) tr ON TRUE
		
		WHERE d.id_dossier = $1
		`, [id])
		
		return this.mapRow(rows[0])
	},
	
	mapRow(row) {
		if (!row) return null
			
			return {
				id_dossier: row.id_dossier,
				reference_dossier: row.reference_dossier,
				date_predepot: row.date_predepot,
				statut_dossier: row.statut_dossier,
				
				id_contribuable: row.id_contribuable,
				id_service: row.id_service,
				id_rdv: row.id_rdv,
				
				// =========================
				// SERVICE FISCAL
				// =========================
				service: row.libelle_service
				? {
					libelle_service: row.libelle_service
				}
				: null,
				
				// =========================
				// CONTRIBUABLE
				// =========================
				contribuable: row.nif
				? {
					nif: row.nif,
					nom_raison_sociale: row.nom_raison_sociale,
					prenom: row.prenom || null,
					email: row.email || null,
					telephone: row.telephone || null,
					adresse: row.adresse || null,
					type_contribuable: row.type_contribuable || null
				}
				: null,
				
				// =========================
				// RENDEZ-VOUS
				// =========================
				rdv: row.id_rdv
				? {
					id_rdv: row.id_rdv,
					date_rdv: row.date_rdv,
					heure_rdv: row.heure_rdv,
					statut_rdv: row.statut_rdv,
					canal_creation: row.canal_creation,
					commentaire: row.commentaire_rdv,
					
					// =========================
					// TICKET
					// =========================
					ticket: row.id_ticket
					? {
						id_ticket: row.id_ticket,
						numero_ticket: row.numero_ticket,
						date_emission: row.date_emission,
						heure_arrivee: row.heure_arrivee,
						heure_appel: row.heure_appel,
						heure_fin: row.heure_fin,
						statut_ticket: row.statut_ticket
					}
					: null
				}
				: null,
				
				// =========================
				// DERNIER TRAITEMENT
				// =========================
				traitement: row.date_traitement
				? {
					date_traitement: row.date_traitement,
					decision: row.decision,
					commentaire_agent: row.commentaire_agent || null
				}
				: null
			}
	},
	
	async findByContribuable(id_contribuable) {
		const { rows } = await pool.query(`
		SELECT
		d.*,
		
		-- Service fiscal
		sf.libelle_service,
		
		-- Contribuable
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.email,
		c.telephone,
		c.adresse,
		c.type_contribuable,
		
		-- Rendez-vous
		rv.date_rdv,
		rv.heure_rdv,
		rv.statut_rdv,
		rv.canal_creation,
		rv.commentaire AS commentaire_rdv,
		
		-- Compteurs des pièces
		COALESCE(pc.pieces_total, 0)::int AS pieces_total,
										  COALESCE(pc.pieces_conformes, 0)::int AS pieces_conformes,
										  COALESCE(pc.pieces_non_conformes, 0)::int AS pieces_non_conformes,
										  COALESCE(pc.pieces_en_attente, 0)::int AS pieces_en_attente,
										  
										  -- Pièces obligatoires manquantes
										  COALESCE(mp.pieces_manquantes, 0)::int AS pieces_manquantes
										  
										  FROM dossier_fiscal d
										  
										  LEFT JOIN service_fiscal sf
										  ON sf.id_service = d.id_service
										  
										  LEFT JOIN contribuable c
										  ON c.id_contribuable = d.id_contribuable
										  
										  LEFT JOIN rendez_vous rv
										  ON rv.id_rdv = d.id_rdv
										  
										  -- Statistiques des pièces déjà déposées
										  LEFT JOIN (
											  SELECT
											  id_dossier,
					   
					   COUNT(*)::int AS pieces_total,
													 
													 COUNT(*) FILTER (
														 WHERE statut_verification = 'CONFORME'
													 )::int AS pieces_conformes,
					   
					   COUNT(*) FILTER (
						   WHERE statut_verification = 'NON_CONFORME'
					   )::int AS pieces_non_conformes,
					   
					   COUNT(*) FILTER (
						   WHERE statut_verification = 'EN_ATTENTE'
					   )::int AS pieces_en_attente
					   
					   FROM piece_justificative
					   
					   GROUP BY id_dossier
										  ) pc
										  ON pc.id_dossier = d.id_dossier
										  
										  -- Nombre de pièces obligatoires sans pièce conforme
										  LEFT JOIN (
											  SELECT
											  d2.id_dossier,
					   
					   COUNT(DISTINCT sp.id_type_piece)::int AS pieces_manquantes
					   
					   FROM dossier_fiscal d2
					   
					   JOIN service_piece sp
					   ON sp.id_service = d2.id_service
					   AND sp.obligatoire = TRUE
					   
					   LEFT JOIN piece_justificative pj
					   ON pj.id_dossier = d2.id_dossier
					   AND pj.id_type_piece = sp.id_type_piece
					   AND pj.statut_verification = 'CONFORME'
					   
					   WHERE pj.id_piece IS NULL
					   
					   GROUP BY d2.id_dossier
										  ) mp
										  ON mp.id_dossier = d.id_dossier
										  
										  WHERE d.id_contribuable = $1
										  
										  ORDER BY d.date_predepot DESC
										  `, [id_contribuable])
		
		return rows.map((r) => ({
			...this.mapRow(r),
								
								pieces_total: Number(r.pieces_total || 0),
								pieces_conformes: Number(r.pieces_conformes || 0),
								pieces_non_conformes: Number(r.pieces_non_conformes || 0),
								pieces_en_attente: Number(r.pieces_en_attente || 0),
								pieces_manquantes: Number(r.pieces_manquantes || 0)
		}))
	},
	
	async findAVenirPourVerif() {
		const { rows } = await pool.query(`
		SELECT
		d.id_dossier,
		d.reference_dossier,
		d.date_predepot,
		d.statut_dossier,
		d.id_contribuable,
		d.id_service,
		d.id_rdv,
		
		sf.libelle_service,
		
		c.nif,
		c.nom_raison_sociale,
		
		COUNT(p.id_piece)::int AS pieces_total,
										  
										  COUNT(p.id_piece) FILTER (
											  WHERE p.statut_verification = 'CONFORME'
										  )::int AS pieces_conformes,
									
									COUNT(p.id_piece) FILTER (
										WHERE p.statut_verification = 'NON_CONFORME'
									)::int AS pieces_non_conformes,
									
									COUNT(p.id_piece) FILTER (
										WHERE p.statut_verification = 'EN_ATTENTE'
									)::int AS pieces_en_attente,
									
									COALESCE(mp.pieces_manquantes, 0)::int AS pieces_manquantes
									
									FROM dossier_fiscal d
									
									JOIN service_fiscal sf
									ON sf.id_service = d.id_service
									
									JOIN contribuable c
									ON c.id_contribuable = d.id_contribuable
									
									LEFT JOIN piece_justificative p
									ON p.id_dossier = d.id_dossier
									
									LEFT JOIN (
										SELECT
										d2.id_dossier,
					COUNT(sp.id_type_piece)::int AS pieces_manquantes
					
					FROM dossier_fiscal d2
					
					JOIN service_piece sp
					ON sp.id_service = d2.id_service
					AND sp.obligatoire = TRUE
					
					LEFT JOIN piece_justificative pj
					ON pj.id_dossier = d2.id_dossier
					AND pj.id_type_piece = sp.id_type_piece
					
					WHERE pj.id_piece IS NULL
					
					GROUP BY d2.id_dossier
									) mp
									ON mp.id_dossier = d.id_dossier
									
									WHERE d.statut_dossier IN (
										'SOUMIS',
									'EN_VERIFICATION',
									'A_COMPLETER'
									)
									
									GROUP BY
									d.id_dossier,
									d.reference_dossier,
									d.date_predepot,
									d.statut_dossier,
									d.id_contribuable,
									d.id_service,
									d.id_rdv,
									sf.libelle_service,
									c.nif,
									c.nom_raison_sociale,
									mp.pieces_manquantes
									
									ORDER BY d.date_predepot ASC
									`)
		
		return rows.map((r) => ({
			id_dossier: r.id_dossier,
			reference_dossier: r.reference_dossier,
			date_predepot: r.date_predepot,
			statut_dossier: r.statut_dossier,
			
			id_contribuable: r.id_contribuable,
			nif: r.nif,
			nom_raison_sociale: r.nom_raison_sociale,
			
			id_service: r.id_service,
			libelle_service: r.libelle_service,
			
			id_rdv: r.id_rdv,
			
			pieces_total: Number(r.pieces_total || 0),
								pieces_conformes: Number(r.pieces_conformes || 0),
								pieces_non_conformes: Number(r.pieces_non_conformes || 0),
								pieces_en_attente: Number(r.pieces_en_attente || 0),
								pieces_manquantes: Number(r.pieces_manquantes || 0),
								
								agent_affecte: '—',
								priorite: 'NORMALE'
		}))
	},
	
	async create({
		id_contribuable,
		id_service,
		id_rdv = null
	}) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			// Vérifier le contribuable
			const { rows: contribuables } = await client.query(`
			SELECT id_contribuable
			FROM contribuable
			WHERE id_contribuable = $1
			AND is_active = TRUE
			FOR UPDATE
			`, [id_contribuable])
			
			if (!contribuables[0]) {
				throw new Error(
					'Contribuable introuvable ou inactif.'
				)
			}
			
			// Vérifier le service fiscal
			const { rows: services } = await client.query(`
			SELECT id_service
			FROM service_fiscal
			WHERE id_service = $1
			AND actif = TRUE
			`, [id_service])
			
			if (!services[0]) {
				throw new Error(
					'Service fiscal introuvable ou inactif.'
				)
			}
			
			// Vérification du rendez-vous
			if (
				id_rdv !== null &&
				id_rdv !== undefined &&
				id_rdv !== ''
			) {
				const { rows: rdvs } = await client.query(`
				SELECT
				id_rdv,
				id_contribuable,
				id_service,
				statut_rdv
				FROM rendez_vous
				WHERE id_rdv = $1
				FOR UPDATE
				`, [id_rdv])
				
				const rdv = rdvs[0]
				
				if (!rdv) {
					throw new Error(
						'Rendez-vous introuvable.'
					)
				}
				
				
				if (
					Number(rdv.id_contribuable) !==
					Number(id_contribuable)
				) {
					throw new Error(
						'Ce rendez-vous ne vous appartient pas.'
					)
				}
				
				
				if (
					Number(rdv.id_service) !==
					Number(id_service)
				) {
					throw new Error(
						'Le service du dossier doit correspondre au service du rendez-vous.'
					)
				}
				
				//  workflow RDV
				if (rdv.statut_rdv !== 'CONFIRME') {
					throw new Error(
						'Seul un rendez-vous confirmé peut être rattaché à un dossier.'
					)
				}
				
				
				const { rows: dossiersExistants } =
				await client.query(`
				SELECT id_dossier
				FROM dossier_fiscal
				WHERE id_rdv = $1
				AND statut_dossier NOT IN (
					'REJETE',
					'CLOTURE'
				)
				LIMIT 1
				`, [id_rdv])
				
				if (dossiersExistants[0]) {
					throw new Error(
						'Un dossier actif est déjà rattaché à ce rendez-vous (RG5).'
					)
				}
			}
			
			// Générer la référence
			const ref = await this.generateReference(
				client,
				id_service
			)
			
			// Créer le dossier
			const { rows } = await client.query(`
			INSERT INTO dossier_fiscal (
				reference_dossier,
				date_predepot,
				statut_dossier,
				id_contribuable,
				id_service,
				id_rdv
			)
			VALUES (
				$1,
		   NOW(),
					'BROUILLON',
		   $2,
		   $3,
		   $4
			)
			RETURNING *
			`, [
				ref,
				id_contribuable,
				id_service,
				id_rdv || null
			])
			
			await client.query('COMMIT')
			
			return rows[0]
			
		} catch (e) {
			await client.query('ROLLBACK')
			throw e
			
		} finally {
			client.release()
		}
	},
	
	async typesRequis(id_service, client = pool) {
		const { rows } = await client.query(`
		SELECT
		tp.*,
		sp.obligatoire
		FROM service_piece sp
		JOIN type_piece tp
		ON tp.id_type_piece = sp.id_type_piece
		WHERE sp.id_service = $1
		AND tp.actif = TRUE
		`, [id_service])
		
		return rows
	},
	
	async transitionner(id_dossier, vers, { id_agent, commentaire } = {}) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			const { rows: [d] } = await client.query(`
			SELECT * FROM dossier_fiscal
			WHERE id_dossier = $1
			FOR UPDATE
			`, [id_dossier])
			
			if (!d) throw new Error('Dossier introuvable.')
				
				// RG18
				if (!(transitions[d.statut_dossier] || []).includes(vers)) {
					throw new Error(`Transition interdite : ${d.statut_dossier} → ${vers}.`)
				}
				
				// RG6
				if (vers === 'SOUMIS') {
					const { rows: [{ n }] } = await client.query(`
					SELECT COUNT(*)::int AS n
					FROM piece_justificative
					WHERE id_dossier = $1
					AND statut_verification IN ('EN_ATTENTE', 'CONFORME')
					`, [id_dossier])
					
					if (n < 1) {
						throw new Error('Au moins une pièce est requise avant soumission.')
					}
					
					/* 2. Aucune pièce NON_CONFORME */
					const { rows: [{ nc }] } = await client.query(`
					SELECT COUNT(*)::int AS nc
					FROM piece_justificative
					WHERE id_dossier = $1
					AND statut_verification = 'NON_CONFORME'
					`, [id_dossier])
					
					if (nc > 0) {
						throw new Error(
							`Impossible de soumettre : ${nc} pièce(s) non conforme(s) à remplacer.`
						)
					}
					
					/* 3. Tous les types obligatoires sont fournis */
					const requis = await this.typesRequis(d.id_service, client)
					const obligatoires = requis.filter(t => t.obligatoire)
					
					const { rows: pieces } = await client.query(`
					SELECT DISTINCT id_type_piece
					FROM piece_justificative
					WHERE id_dossier = $1
					AND statut_verification IN ('EN_ATTENTE', 'CONFORME')
					`, [id_dossier])
					
					const typesFournis = new Set(pieces.map(p => String(p.id_type_piece)))
					const manquants = obligatoires.filter(
						t => !typesFournis.has(String(t.id_type_piece))
					)
					
					if (manquants.length > 0) {
						throw new Error(
							`Impossible de soumettre : ${manquants.length} pièce(s) obligatoire(s) manquante(s).`
						)
					}
					
				}
				
				// RG8
				if (vers === 'VALIDE') {
					const requis = await this.typesRequis(d.id_service, client)
					const obligatoires = requis.filter(t => t.obligatoire)
					
					const { rows: pieces } = await client.query(`
					SELECT id_piece, id_type_piece, statut_verification
					FROM piece_justificative
					WHERE id_dossier = $1
					`, [id_dossier])
					
					const ok = obligatoires.every(t =>
					pieces.some(p =>
					String(p.id_type_piece) === String(t.id_type_piece) &&
					p.statut_verification === 'CONFORME'
					)
					)
					
					if (!ok) {
						throw new Error('Toutes les pièces obligatoires doivent être CONFORME (RG8).')
					}
				}
				
				/* UPDATE statut */
				const { rows } = await client.query(`
				UPDATE dossier_fiscal
				SET statut_dossier = $1
				WHERE id_dossier = $2
				RETURNING *
				`, [vers, id_dossier])
				let notificationCreee = null
				
				/* Traitement + audit + notification */
				if (id_agent) {
					
					// 1. Traitement
					await client.query(`
					INSERT INTO traitement (
						date_traitement, decision, commentaire_agent, id_agent, id_dossier
					)
					VALUES (NOW(), $1, $2, $3, $4)
					`, [vers, commentaire || null, id_agent, id_dossier])
					
					// 2. Journal d'audit
					await client.query(`
					INSERT INTO journal_audit (
						type_acteur, id_acteur, action, table_cible, id_cible, details_json
					)
					VALUES ($1, $2, $3, $4, $5, $6)
					`, [
						'AGENT',
						String(id_agent),
									   `TRANSITION_DOSSIER_${vers}`,
						'dossier_fiscal',
						String(id_dossier),
									   JSON.stringify({
										   ancien_statut: d.statut_dossier,
										   nouveau_statut: vers,
										   commentaire: commentaire || null
									   })
					])
					
					// 3. Notification du contribuable (RG14)
					if (['VALIDE', 'REJETE', 'A_COMPLETER'].includes(vers)) {
						let contenu
						// ⭐ PAS de re-déclaration de notificationCreee ici
						
						if (vers === 'VALIDE') {
							contenu = `Votre dossier ${d.reference_dossier} a été validé.`
						} else if (vers === 'REJETE') {
							contenu = `Votre dossier ${d.reference_dossier} a été rejeté.`
							if (commentaire) contenu += ` Motif : ${commentaire}`
						} else if (vers === 'A_COMPLETER') {
							contenu = `Votre dossier ${d.reference_dossier} nécessite des pièces ou des corrections complémentaires.`
							if (commentaire) contenu += ` Détail : ${commentaire}`
						}
						
						// ⭐ Affectation (pas de `let`) → met à jour la variable externe
						notificationCreee = await NotificationModel.create(client, {
							type_notification: `DOSSIER_${vers}`,
							contenu,
							canal: 'PORTAIL',
							id_contribuable: d.id_contribuable,
							statut_envoi: 'ENVOYE'
						})
					}
				}
				
				await client.query('COMMIT')
				
				const dossierFinal = rows[0]
				emitDossierUpdated(dossierFinal)
				emitStatsRefresh()
				
				// ⭐ Maintenant accessible
				return {
					...dossierFinal,
					_notification: notificationCreee
				}
				
		} catch (e) {
			await client.query('ROLLBACK')
			throw e
		} finally {
			client.release()
		}
	},
	
	
	async transitionnerPourAgent(id_dossier, vers, { id_agent, commentaire } = {}) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			const { rows: [d] } = await client.query(`
			SELECT * FROM dossier_fiscal
			WHERE id_dossier = $1
			FOR UPDATE
			`, [id_dossier])
			
			if (!d) throw new Error('Dossier introuvable.')
				
				// RG18 — transitions autorisées
				if (!(transitions[d.statut_dossier] || []).includes(vers)) {
					throw new Error(`Transition interdite : ${d.statut_dossier} → ${vers}.`)
				}
				
				// RG6 ASSOUPLI — uniquement si on va vers SOUMIS
				if (vers === 'SOUMIS') {
					
					/* 1. Au moins une pièce active (EN_ATTENTE ou CONFORME) */
					const { rows: [{ n }] } = await client.query(`
					SELECT COUNT(*)::int AS n
					FROM piece_justificative
					WHERE id_dossier = $1
					AND statut_verification IN ('EN_ATTENTE', 'CONFORME')
					`, [id_dossier])
					
					if (n < 1) {
						throw new Error('Au moins une pièce est requise avant soumission.')
					}
					
					
					
					const requis = await this.typesRequis(d.id_service, client)
					const obligatoires = requis.filter(t => t.obligatoire)
					
					const { rows: pieces } = await client.query(`
					SELECT DISTINCT id_type_piece
					FROM piece_justificative
					WHERE id_dossier = $1
					AND statut_verification IN ('EN_ATTENTE', 'CONFORME')
					`, [id_dossier])
					
					const typesFournis = new Set(pieces.map(p => String(p.id_type_piece)))
					const manquants = obligatoires.filter(
						t => !typesFournis.has(String(t.id_type_piece))
					)
					
					if (manquants.length > 0) {
						throw new Error(
							`Impossible de soumettre : ${manquants.length} pièce(s) obligatoire(s) manquante(s).`
						)
					}
					
					
				}
				
				/* UPDATE statut */
				const { rows } = await client.query(`
				UPDATE dossier_fiscal
				SET statut_dossier = $1
				WHERE id_dossier = $2
				RETURNING *
				`, [vers, id_dossier])
				
				let notificationCreee = null
				
				if (id_agent) {
					/* Traitement */
					await client.query(`
					INSERT INTO traitement (
						date_traitement, decision, commentaire_agent, id_agent, id_dossier
					)
					VALUES (NOW(), $1, $2, $3, $4)
					`, [vers, commentaire || null, id_agent, id_dossier])
					
					/* Audit — action distincte pour tracer le mode AGENT */
					await client.query(`
					INSERT INTO journal_audit (
						type_acteur, id_acteur, action, table_cible, id_cible, details_json
					)
					VALUES ($1, $2, $3, $4, $5, $6)
					`, [
						'AGENT',
						String(id_agent),
									   `TRANSITION_DOSSIER_${vers}_AGENT`,
						'dossier_fiscal',
						String(id_dossier),
									   JSON.stringify({
										   ancien_statut: d.statut_dossier,
										   nouveau_statut: vers,
										   commentaire: commentaire || null,
										   mode: 'AGENT'
									   })
					])
					
					/* Notification contribuable (RG14) */
					if (['VALIDE', 'REJETE', 'A_COMPLETER'].includes(vers)) {
						let contenu
						if (vers === 'VALIDE') {
							contenu = `Votre dossier ${d.reference_dossier} a été validé.`
						} else if (vers === 'REJETE') {
							contenu = `Votre dossier ${d.reference_dossier} a été rejeté.`
							if (commentaire) contenu += ` Motif : ${commentaire}`
						} else if (vers === 'A_COMPLETER') {
							contenu = `Votre dossier ${d.reference_dossier} nécessite des pièces ou des corrections complémentaires.`
							if (commentaire) contenu += ` Détail : ${commentaire}`
						}
						
						notificationCreee = await NotificationModel.create(client, {
							type_notification: `DOSSIER_${vers}`,
							contenu,
							canal: 'PORTAIL',
							id_contribuable: d.id_contribuable,
							statut_envoi: 'ENVOYE'
						})
					}
				}
				
				await client.query('COMMIT')
				
				return {
					...rows[0],
					_notification: notificationCreee
				}
				
		} catch (e) {
			await client.query('ROLLBACK')
			throw e
		} finally {
			client.release()
		}
	},
	async findSansRdv({ recherche = '', limit = 20 } = {}) {
		const params = []
		
		let where = `
		WHERE d.id_rdv IS NULL
		AND d.statut_dossier = 'VALIDE'
		AND NOT EXISTS (
			SELECT 1
			FROM ticket_file_attente t
			WHERE t.id_contribuable = d.id_contribuable
			AND t.date_file = CURRENT_DATE
		)
		`
		
		if (recherche) {
			params.push(`%${recherche}%`)
			where += ` AND (
				d.reference_dossier ILIKE $${params.length}
				OR c.nif ILIKE $${params.length}
				OR c.nom_raison_sociale ILIKE $${params.length}
			)`
		}
		
		params.push(limit)
		
		const { rows } = await pool.query(`
		SELECT
		d.id_dossier,
		d.reference_dossier,
		d.date_predepot,
		d.statut_dossier,
		d.id_contribuable,
		d.id_service,
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.telephone,
		sf.libelle_service,
		(
			SELECT tr.date_traitement
			FROM traitement tr
			WHERE tr.id_dossier = d.id_dossier
			AND tr.decision = 'VALIDE'
			ORDER BY tr.date_traitement DESC
			LIMIT 1
		) AS date_validation
		FROM dossier_fiscal d
		JOIN contribuable c ON c.id_contribuable = d.id_contribuable
		LEFT JOIN service_fiscal sf ON sf.id_service = d.id_service
		${where}
		ORDER BY d.date_predepot DESC
		LIMIT $${params.length}
		`, params)
		
		return rows
	},
	
	async marquerPresentSansRdv(id_dossier, { id_agent, id_guichet }) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			const { rows: [dossier] } = await client.query(`
			SELECT d.*, c.nif, c.nom_raison_sociale, c.prenom
			FROM dossier_fiscal d
			JOIN contribuable c ON c.id_contribuable = d.id_contribuable
			WHERE d.id_dossier = $1
			FOR UPDATE
			`, [id_dossier])
			
			if (!dossier) {
				throw new Error('Dossier introuvable.')
			}
			
			if (dossier.id_rdv) {
				throw new Error('Ce dossier est lié à un rendez-vous.')
			}
			
			if (dossier.statut_dossier !== 'VALIDE') {
				throw new Error(
					`Ce dossier n'est pas encore validé (statut actuel : ${dossier.statut_dossier}). ` +
					`Seuls les dossiers VALIDE peuvent être accueillis.`
				)
			}
			
			const { rows: ticketsExistants } = await client.query(`
			SELECT id_ticket, numero_ticket
			FROM ticket_file_attente
			WHERE id_contribuable = $1
			AND date_file = CURRENT_DATE
			ORDER BY id_ticket DESC
			LIMIT 1
			`, [dossier.id_contribuable])
			
			if (ticketsExistants[0]) {
				throw new Error(
					`Ce contribuable a déjà un ticket aujourd'hui : ${ticketsExistants[0].numero_ticket}`
				)
			}
			
			const { rows: [numero] } = await client.query(
				`SELECT generer_numero_ticket($1::date) AS numero`,
														  [new Date()]
			)
			
			const { rows: [ticket] } = await client.query(`
			INSERT INTO ticket_file_attente (
				numero_ticket,
				date_emission,
				date_file,
				heure_arrivee,
				statut_ticket,
				id_contribuable,
				id_agent,
				id_guichet,
				motif_visite
			)
			VALUES (
				$1, NOW(), CURRENT_DATE, NOW(),
					'EN_ATTENTE',
					$2, $3, $4, $5
			)
			RETURNING *
			`, [
				numero.numero,
				dossier.id_contribuable,
				id_agent,
				id_guichet,
				`Dossier ${dossier.reference_dossier} - Validé sans RDV`
			])
			
			const { rows: [svc] } = await client.query(`
			SELECT libelle_service, duree_estimee_min
			FROM service_fiscal
			WHERE id_service = $1
			`, [dossier.id_service])
			
			await client.query('COMMIT')
			
			return {
				ticket: {
					...ticket,
					libelle_service: svc?.libelle_service || null,
					duree_estimee_min: Number(svc?.duree_estimee_min || 15)
				},
				dossier: {
					id_dossier: dossier.id_dossier,
					reference_dossier: dossier.reference_dossier,
					statut_dossier: dossier.statut_dossier,
					nom_raison_sociale: dossier.nom_raison_sociale,
					prenom: dossier.prenom,
					nif: dossier.nif
				}
			}
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	}
}
