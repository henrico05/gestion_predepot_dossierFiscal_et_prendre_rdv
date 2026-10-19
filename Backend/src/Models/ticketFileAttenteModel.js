import pool from '../DataBases/db.js'

import { emitStatsRefresh, emitFileRefresh } from '../Socket/emitters.js'

const STATUTS = [
	'RESERVE',
'EN_ATTENTE',
'APPELE',
'EN_COURS',
'TERMINE',
'ABSENT',
'ANNULE'
]

const transitions = {
	RESERVE: [
		'EN_ATTENTE',
		'ANNULE',
		'ABSENT'
	],
	
	EN_ATTENTE: [
		'APPELE',
		'ANNULE',
		'ABSENT'
	],
	
	APPELE: [
		'EN_COURS',
		'ABSENT',
		'EN_ATTENTE'
	],
	
	EN_COURS: [
		'TERMINE',
		'ABSENT'
	],
	
	TERMINE: [],
	ABSENT: [],
	ANNULE: []
}

const STATUTS_ACTIFS = [
	'RESERVE',
'EN_ATTENTE',
'APPELE',
'EN_COURS'
]

function dateAntananarivo() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Indian/Antananarivo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date())
}

export const TicketFileAttenteModel = {
	
	// =========================================================
	// GENERATION NUMERO TICKET
	// =========================================================
	
	async generateNumeroTicket(client, date) {
		
		const q = client || pool
		
		const { rows } = await q.query(
			`
			SELECT generer_numero_ticket($1) AS numero_ticket
			`,
			[date]
		)
		
		if (!rows[0]?.numero_ticket) {
			throw new Error(
				'Impossible de générer le numéro du ticket'
			)
		}
		
		return rows[0].numero_ticket
	},
	
	// =========================================================
	// PERSONNES DEVANT
	// =========================================================
	
	async getPersonnesDevant(id_rdv) {
		
		const { rows } = await pool.query(
			`
			SELECT COUNT(*) AS nombre
			
			FROM ticket_file_attente t
			
			INNER JOIN rendez_vous rv
			ON rv.id_rdv = t.id_rdv
			
			WHERE rv.date_rdv = (
				SELECT date_rdv
				FROM rendez_vous
				WHERE id_rdv = $1
			)
			
			AND rv.heure_rdv < (
				SELECT heure_rdv
				FROM rendez_vous
				WHERE id_rdv = $1
			)
			
			AND t.statut_ticket = ANY($2::text[])
			`,
			[
				id_rdv,
				STATUTS_ACTIFS
			]
		)
		
		return Number(rows[0]?.nombre || 0)
	},
	
	// =========================================================
	// CREATE
	// =========================================================
	
	async create(client, data) {
		
		const q = client || pool
		
		const {
			numero_ticket,
			date_file,
			heure_arrivee = null,
			statut_ticket = 'EN_ATTENTE',
			nom_visiteur = null,
			motif_visite = null,
			id_contribuable = null,
			id_rdv = null,
			id_agent = null,
			id_guichet = null
		} = data
		
		if (!numero_ticket) {
			throw new Error(
				'Le numéro du ticket est obligatoire'
			)
		}
		
		if (!date_file) {
			throw new Error(
				'La date de la file est obligatoire'
			)
		}
		
		if (!STATUTS.includes(statut_ticket)) {
			throw new Error(
				`Statut ticket invalide : ${statut_ticket}`
			)
		}
		
		const { rows } = await q.query(
			`
			INSERT INTO ticket_file_attente (
				numero_ticket,
				date_emission,
				date_file,
				heure_arrivee,
				heure_appel,
				heure_fin,
				statut_ticket,
				nom_visiteur,
				motif_visite,
				id_contribuable,
				id_rdv,
				id_agent,
				id_guichet
			)
			
			VALUES (
				$1,
		   NOW(),
					$2::date,
		   $3,
		   NULL,
		   NULL,
		   $4,
		   $5,
		   $6,
		   $7,
		   $8,
		   $9,
		   $10
			)
			
			RETURNING *
			`,
			[
				numero_ticket,
				date_file,
				heure_arrivee,
				statut_ticket,
				nom_visiteur,
				motif_visite,
				id_contribuable,
				id_rdv,
				id_agent,
				id_guichet
			]
		)
		
		
		return rows[0]
	},
	
	// =========================================================
	// FIND BY ID
	// =========================================================
	
	
	async findById(id_ticket) {
		const { rows } = await pool.query(`
		SELECT
		t.*,
		
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.email,
		
		rv.date_rdv,
		rv.heure_rdv,
		rv.statut_rdv,
		rv.id_service,
		
		-- ⭐ Libellé + durée avec fallback
		COALESCE(
			sf_rdv.libelle_service,
		   sf_dossier.libelle_service
		) AS libelle_service,
		
		COALESCE(
			sf_rdv.duree_estimee_min,
		   sf_dossier.duree_estimee_min,
		   15
		) AS duree_estimee_min,
		
		g.numero_guichet,
		g.libelle AS libelle_guichet
		
		FROM ticket_file_attente t
		
		LEFT JOIN contribuable c ON c.id_contribuable = t.id_contribuable
		LEFT JOIN rendez_vous rv ON rv.id_rdv = t.id_rdv
		
		LEFT JOIN service_fiscal sf_rdv ON sf_rdv.id_service = rv.id_service
		
		LEFT JOIN LATERAL (
			SELECT id_service
			FROM dossier_fiscal
			WHERE id_contribuable = t.id_contribuable
			ORDER BY date_predepot DESC
			LIMIT 1
		) d ON TRUE
		
		LEFT JOIN service_fiscal sf_dossier ON sf_dossier.id_service = d.id_service
		
		LEFT JOIN guichet g ON g.id_guichet = t.id_guichet
		
		WHERE t.id_ticket = $1
		`, [id_ticket])
		
		
		return rows[0] || null
	},
	
	// =========================================================
	// FIND BY RDV
	// =========================================================
	
	async findByRdv(id_rdv) {
		
		const { rows } = await pool.query(
			`
			SELECT *
			FROM ticket_file_attente
			
			WHERE id_rdv = $1
			
			ORDER BY id_ticket DESC
			
			LIMIT 1
			`,
			[id_rdv]
		)
		
		
		return rows[0] || null
	},
	
	async findByRendezVous(id_rdv) {
		return this.findByRdv(id_rdv)
	},
	
	// =========================================================
	// FIND BY DATE
	// =========================================================
	
	
	async findByDate(date_file) {
		const { rows } = await pool.query(`
		SELECT
		t.*,
		c.nif, c.nom_raison_sociale, c.prenom, c.email,
		rv.date_rdv, rv.heure_rdv, rv.statut_rdv, rv.id_service,
		
		COALESCE(sf_rdv.libelle_service, sf_dossier.libelle_service) AS libelle_service,
										  COALESCE(sf_rdv.duree_estimee_min, sf_dossier.duree_estimee_min, 15) AS duree_estimee_min,
										  
										  g.numero_guichet, g.libelle AS libelle_guichet
										  
										  FROM ticket_file_attente t
										  LEFT JOIN contribuable c ON c.id_contribuable = t.id_contribuable
										  LEFT JOIN rendez_vous rv ON rv.id_rdv = t.id_rdv
										  LEFT JOIN service_fiscal sf_rdv ON sf_rdv.id_service = rv.id_service
										  LEFT JOIN LATERAL (
											  SELECT id_service FROM dossier_fiscal
											  WHERE id_contribuable = t.id_contribuable
											  ORDER BY date_predepot DESC LIMIT 1
										  ) d ON TRUE
										  LEFT JOIN service_fiscal sf_dossier ON sf_dossier.id_service = d.id_service
										  LEFT JOIN guichet g ON g.id_guichet = t.id_guichet
										  
										  WHERE t.date_file = $1::date
										  ORDER BY t.numero_ticket
										  `, [date_file])
		
		return rows
	},
	// =========================================================
	// FILE DU JOUR
	// =========================================================
	
	async fileDuJour(date = null) {
		const jour = date || dateAntananarivo()
		
		const { rows } = await pool.query(`
		SELECT
		t.*,
		
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		
		-- RDV (peut être NULL si ticket sans RDV)
		rv.date_rdv,
		rv.heure_rdv,
		rv.statut_rdv,
		rv.id_service,
		
		-- ⭐ Service fiscal (via RDV OU via dernier dossier)
		COALESCE(
			sf_rdv.libelle_service,
		   sf_dossier.libelle_service
		) AS libelle_service,
		
		-- ⭐ Durée estimée (via RDV OU via dernier dossier)
		COALESCE(
			sf_rdv.duree_estimee_min,
		   sf_dossier.duree_estimee_min,
		   15
		) AS duree_estimee_min,
		
		g.numero_guichet,
		g.libelle AS libelle_guichet
		
		FROM ticket_file_attente t
		
		LEFT JOIN contribuable c
		ON c.id_contribuable = t.id_contribuable
		
		-- RDV associé (s'il existe)
		LEFT JOIN rendez_vous rv
		ON rv.id_rdv = t.id_rdv
		
		-- Service via RDV
		LEFT JOIN service_fiscal sf_rdv
		ON sf_rdv.id_service = rv.id_service
		
		-- ⭐ Service via dernier dossier du contribuable (pour les sans-RDV)
		LEFT JOIN LATERAL (
			SELECT d.id_service
			FROM dossier_fiscal d
			WHERE d.id_contribuable = t.id_contribuable
			ORDER BY d.date_predepot DESC
			LIMIT 1
		) d ON TRUE
		
		LEFT JOIN service_fiscal sf_dossier
		ON sf_dossier.id_service = d.id_service
		
		LEFT JOIN guichet g
		ON g.id_guichet = t.id_guichet
		
		WHERE t.date_file = $1::date
		AND t.statut_ticket <> 'ANNULE'
		
		ORDER BY
		CASE t.statut_ticket
		WHEN 'APPELE' THEN 0
		WHEN 'EN_COURS' THEN 1
		WHEN 'EN_ATTENTE' THEN 2
		WHEN 'RESERVE' THEN 3
		ELSE 4
		END,
		t.numero_ticket
		`, [jour])
		
		return rows
	},
	// =========================================================
	// MARQUER PRESENT
	// =========================================================
	
	async marquerPresent({
		id_rdv,
		id_agent = null,
		id_guichet = null
	}) {
		
		const client = await pool.connect()
		
		try {
			
			await client.query('BEGIN')
			
			// -----------------------------------------------
			// Verrouillage du RDV
			// -----------------------------------------------
			
			const rdvResult = await client.query(
				`
				SELECT *
				FROM rendez_vous
				
				WHERE id_rdv = $1
				
				FOR UPDATE
				`,
				[id_rdv]
			)
			
			if (rdvResult.rowCount === 0) {
				throw new Error(
					'Rendez-vous introuvable'
				)
			}
			
			const rdv = rdvResult.rows[0]
			
			// -----------------------------------------------
			// Vérification statut RDV
			// -----------------------------------------------
			
			if (rdv.statut_rdv !== 'CONFIRME') {
				throw new Error(
					`Impossible de marquer présent : RDV ${rdv.statut_rdv}`
				)
			}
			
			// -----------------------------------------------
			// Recherche ticket existant
			// -----------------------------------------------
			
			const ticketResult = await client.query(
				`
				SELECT *
				FROM ticket_file_attente
				
				WHERE id_rdv = $1
				
				ORDER BY id_ticket DESC
				
				LIMIT 1
				
				FOR UPDATE
				`,
				[id_rdv]
			)
			
			let ticket
			
			// -----------------------------------------------
			// Aucun ticket → création
			// -----------------------------------------------
			
			if (ticketResult.rowCount === 0) {
				
				const dateFile = rdv.date_rdv
				
				const numero = await this.generateNumeroTicket(
					client,
					dateFile
				)
				
				ticket = await this.create(
					client,
					{
						numero_ticket: numero,
						date_file: dateFile,
						heure_arrivee: new Date(),
										   statut_ticket: 'EN_ATTENTE',
										   id_contribuable: rdv.id_contribuable,
										   id_rdv,
										   id_agent,
										   id_guichet,
										   motif_visite: 'Rendez-vous confirmé'
					}
				)
				
			} else {
				
				ticket = ticketResult.rows[0]
				
				// -------------------------------------------
				// Ticket RESERVE → EN_ATTENTE
				// -------------------------------------------
				
				if (ticket.statut_ticket === 'RESERVE') {
					
					const result = await client.query(
						`
						UPDATE ticket_file_attente
						
						SET
						statut_ticket = 'EN_ATTENTE',
						
						heure_arrivee = COALESCE(
							heure_arrivee,
							NOW()
						),
						
						id_agent = COALESCE(
							$1,
						  id_agent
						),
						
						id_guichet = COALESCE(
							$2,
							id_guichet
						)
						
						WHERE id_ticket = $3
						
						RETURNING *
						`,
						[
							id_agent,
							id_guichet,
							ticket.id_ticket
						]
					)
					
					ticket = result.rows[0]
				}
			}
			
			await client.query('COMMIT')
			
			emitFileRefresh()
			emitStatsRefresh()
			
			return ticket
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			
			throw error
			
		} finally {
			
			client.release()
		}
	},
	
	// =========================================================
	// CREATION SANS RDV
	// =========================================================
	
	async creerSansRdv({
		nom_visiteur = null,
		motif_visite = null,
		id_contribuable = null,
		id_agent = null,
		id_guichet = null
	}) {
		
		if (!motif_visite && !id_contribuable) {
			
			throw new Error(
				'Le ticket doit avoir un motif ou un contribuable identifiable'
			)
		}
		
		const client = await pool.connect()
		
		try {
			
			await client.query('BEGIN')
			
			const dateFile = dateAntananarivo()
			
			// Génération PostgreSQL :
			// A-001 ... A-050
			const numero = await this.generateNumeroTicket(
				client,
				dateFile
			)
			
			const ticket = await this.create(
				client,
				{
					numero_ticket: numero,
					date_file: dateFile,
					heure_arrivee: new Date(),
											 statut_ticket: 'EN_ATTENTE',
											 nom_visiteur,
											 motif_visite,
											 id_contribuable,
											 id_rdv: null,
											 id_agent,
											 id_guichet
				}
			)
			
			await client.query('COMMIT')
			emitFileRefresh()
			emitStatsRefresh()
			
			return ticket
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			
			throw error
			
		} finally {
			
			client.release()
		}
	},
	
	// =========================================================
	// CHANGER STATUT
	// =========================================================
	async changerStatut(
		id_ticket,
		vers,
		{
			id_agent = null,
			id_guichet = null
		} = {}
	) {
		
		// -----------------------------------------------
		// Vérification nouveau statut
		// -----------------------------------------------
		
		if (!STATUTS.includes(vers)) {
			
			throw new Error(
				`Statut invalide : ${vers}`
			)
		}
		
		const client = await pool.connect()
		
		try {
			
			await client.query('BEGIN')
			
			// -----------------------------------------------
			// Verrouillage du ticket
			// -----------------------------------------------
			
			const result = await client.query(
				`
				SELECT *
				FROM ticket_file_attente
				
				WHERE id_ticket = $1
				
				FOR UPDATE
				`,
				[id_ticket]
			)
			
			if (result.rowCount === 0) {
				
				throw new Error(
					'Ticket introuvable'
				)
			}
			
			const ticket = result.rows[0]
			
			// -----------------------------------------------
			// Vérification transition
			// -----------------------------------------------
			
			const autorises =
			transitions[ticket.statut_ticket] || []
			
			if (!autorises.includes(vers)) {
				
				throw new Error(
					`Transition interdite : ${ticket.statut_ticket} → ${vers}`
				)
			}
			
			// -----------------------------------------------
			// Construction UPDATE
			// -----------------------------------------------
			
			const valeurs = []
			const sets = []
			
			// Heure d'appel
			if (vers === 'APPELE') {
				sets.push(
					'heure_appel = NOW()'
				)
			}
			
			// Heure de fin
			if (vers === 'TERMINE') {
				sets.push(
					'heure_fin = NOW()'
				)
			}
			
			// Agent
			if (id_agent !== null) {
				
				valeurs.push(id_agent)
				
				sets.push(
					`id_agent = $${valeurs.length}`
				)
			}
			
			// Guichet
			if (id_guichet !== null) {
				
				valeurs.push(id_guichet)
				
				sets.push(
					`id_guichet = $${valeurs.length}`
				)
			}
			
			// Nouveau statut
			valeurs.push(vers)
			
			const statutIndex = valeurs.length
			
			sets.push(
				`statut_ticket = $${statutIndex}`
			)
			
			// ID ticket
			valeurs.push(id_ticket)
			
			const idIndex = valeurs.length
			
			// -----------------------------------------------
			// UPDATE
			// -----------------------------------------------
			
			const updatedResult = await client.query(
				`
				UPDATE ticket_file_attente
				
				SET ${sets.join(', ')}
				
				WHERE id_ticket = $${idIndex}
				
				RETURNING *
				`,
				valeurs
			)
			
			const updated = updatedResult.rows[0]
			
			// -----------------------------------------------
			// Synchronisation avec RDV
			// -----------------------------------------------
			
			if (ticket.id_rdv) {
				
				// Ticket terminé → RDV honoré
				if (vers === 'TERMINE') {
					
					await client.query(
						`
						UPDATE rendez_vous
						
						SET statut_rdv = 'HONORE'
						
						WHERE id_rdv = $1
						
						AND statut_rdv = 'CONFIRME'
						`,
						[ticket.id_rdv]
					)
				}
				
				// Ticket absent → RDV absent
				if (vers === 'ABSENT') {
					
					await client.query(
						`
						UPDATE rendez_vous
						
						SET statut_rdv = 'ABSENT'
						
						WHERE id_rdv = $1
						
						AND statut_rdv = 'CONFIRME'
						`,
						[ticket.id_rdv]
					)
				}
			}
			
			await client.query('COMMIT')
			
			emitFileRefresh()
			emitStatsRefresh()
			
			return updated
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			
			throw error
			
		} finally {
			
			client.release()
		}
	},
	
	async updateStatus(
		id_ticket,
		statut_ticket,
		options = {}
	) {
		
		return this.changerStatut(
			id_ticket,
			statut_ticket,
			options
		)
	},
	
	// =========================================================
	// APPELER SUIVANT
	// =========================================================
	
	async appelerSuivant(id_guichet, id_agent = null) {
		const jour = dateAntananarivo()
		
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			const { rows } = await client.query(`
			SELECT *
			FROM ticket_file_attente
			WHERE date_file = $1::date
			AND statut_ticket = 'EN_ATTENTE'
			ORDER BY numero_ticket
			LIMIT 1
			FOR UPDATE SKIP LOCKED
			`, [jour])
			
			if (rows.length === 0) {
				await client.query('COMMIT')
				return null
			}
			
			const ticketId = rows[0].id_ticket
			
			await client.query(`
			UPDATE ticket_file_attente
			SET
			statut_ticket = 'APPELE',
			heure_appel = NOW(),
							   id_agent = $1,
					  id_guichet = $2
					  WHERE id_ticket = $3
					  `, [id_agent, id_guichet, ticketId])
			
			await client.query('COMMIT')
			
			emitFileRefresh()
			emitStatsRefresh()
			
			return this.findById(ticketId)
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	async getSuivi(id_rdv) {
		
		if (!id_rdv) {
			return null
		}
		
		// =====================================================
		// 1. RÉCUPÉRER LE RDV + SERVICE + TICKET
		// =====================================================
		
		const { rows } = await pool.query(
			`
			SELECT
			rv.id_rdv,
			rv.date_rdv,
			rv.heure_rdv,
			rv.statut_rdv,
			rv.id_service,
			
			sf.libelle_service,
			
			COALESCE(
				sf.duree_estimee_min,
			15
			) AS duree_slot_min,
			
			t.id_ticket,
			t.numero_ticket,
			t.statut_ticket,
			t.date_file,
			t.heure_arrivee,
			t.heure_appel
			
			FROM rendez_vous rv
			
			LEFT JOIN service_fiscal sf
			ON sf.id_service = rv.id_service
			
			LEFT JOIN LATERAL (
				SELECT *
				FROM ticket_file_attente t2
				
				WHERE t2.id_rdv = rv.id_rdv
				
				ORDER BY t2.id_ticket DESC
				
				LIMIT 1
			) t ON TRUE
			
			WHERE rv.id_rdv = $1
			`,
			[id_rdv]
		)
		
		if (rows.length === 0) {
			return null
		}
		
		const rdv = rows[0]
		
		// =====================================================
		// 2. DATE DU JOUR
		// =====================================================
		
		const dateJour = dateAntananarivo()
		
		const jourJ =
		String(rdv.date_rdv).slice(0, 10) === dateJour
		
		const duree =
		Number(rdv.duree_slot_min || 15)
		
		
		// =====================================================
		// 3. RDV AVANT CE RDV
		// =====================================================
		
		const avantResult = await pool.query(
			`
			SELECT COUNT(*) AS nombre
			
			FROM rendez_vous
			
			WHERE date_rdv = $1
			
			AND id_service = $2
			
			AND heure_rdv < $3
			
			AND id_rdv <> $4
			
			AND statut_rdv IN (
				'CONFIRME',
				'EN_ATTENTE'
			)
			`,
			[
				rdv.date_rdv,
				rdv.id_service,
				rdv.heure_rdv,
				id_rdv
			]
		)
		
		const rendezVousAvant =
		Number(
			avantResult.rows[0]?.nombre || 0
		)
		
		
		// =====================================================
		// 4. PERSONNES DEVANT
		// =====================================================
		
		let personnesDevant = rendezVousAvant
		
		
		// =====================================================
		// 5. SI LE CONTRIBUABLE EST DÉJÀ DANS LA FILE
		// =====================================================
		
		if (
			rdv.id_ticket &&
			STATUTS_ACTIFS.includes(rdv.statut_ticket)
		) {
			
			const ticketsAvantResult =
			await pool.query(
				`
				SELECT COUNT(*) AS nombre
				
				FROM ticket_file_attente t
				
				WHERE t.date_file = $1::date
				
				AND t.id_ticket <> $2
				
				AND t.statut_ticket = ANY(
					$3::text[]
				)
				
				AND t.id_ticket < $2
				`,
				[
					rdv.date_rdv,
					rdv.id_ticket,
					STATUTS_ACTIFS
				]
			)
			
			personnesDevant =
			Number(
				ticketsAvantResult.rows[0]?.nombre || 0
			)
		}
		
		
		// =====================================================
		// 6. POSITION
		// =====================================================
		
		const positionEstimee =
		personnesDevant + 1
		
		
		// =====================================================
		// 7. TEMPS ESTIMÉ
		// =====================================================
		
		let tempsEstimeMin = null
		
		if (jourJ) {
			
			tempsEstimeMin =
			personnesDevant * duree
		}
		
		
		// =====================================================
		// 8. RETOUR
		// =====================================================
		
		return {
			
			id_rdv:
			rdv.id_rdv,
			
			date_rdv:
			rdv.date_rdv,
			
			heure_rdv:
			rdv.heure_rdv,
			
			statut_rdv:
			rdv.statut_rdv,
			
			id_service:
			rdv.id_service,
			
			libelle_service:
			rdv.libelle_service,
			
			id_ticket:
			rdv.id_ticket,
			
			numero_ticket:
			rdv.numero_ticket,
			
			statut_ticket:
			rdv.statut_ticket,
			
			// -------------------------
			// SUIVI
			// -------------------------
			
			rendezVousAvant,
			
			personnesDevant,
			
			positionEstimee,
			
			tempsEstimeMin,
			
			jourJ,
			
			dureeSlotMin:
			duree
		}
	}
}
