import pool from '../DataBases/db.js'
import { TicketFileAttenteModel } from './ticketFileAttenteModel.js'
import { emitStatsRefresh, emitFileRefresh } from '../Socket/emitters.js' 

export const RendezVousModel = {
	
	// ============================================================
	// RÉCUPÉRER TOUS LES RENDEZ-VOUS
	// ============================================================
	async findAll() {
		const { rows } = await pool.query(`
		SELECT
		rv.*,
		
		-- CONTRIBUABLE
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.email,
		
		-- SERVICE
		sf.libelle_service,
		sf.duree_estimee_min,
		
		-- DOSSIER
		d.id_dossier,
		d.reference_dossier,
		d.date_predepot,
		d.statut_dossier,
		
		-- TICKET
		t.id_ticket,
		t.numero_ticket,
		t.date_emission,
		t.date_file,
		t.heure_arrivee,
		t.heure_appel,
		t.heure_fin,
		t.statut_ticket,
		t.nom_visiteur,
		t.motif_visite
		
		FROM rendez_vous rv
		
		LEFT JOIN contribuable c
		ON c.id_contribuable = rv.id_contribuable
		
		LEFT JOIN service_fiscal sf
		ON sf.id_service = rv.id_service
		
		-- DOSSIER ACTIF DU RENDEZ-VOUS
		LEFT JOIN LATERAL (
			SELECT
			df.id_dossier,
			df.reference_dossier,
			df.date_predepot,
			df.statut_dossier
			FROM dossier_fiscal df
			WHERE df.id_rdv = rv.id_rdv
			AND df.statut_dossier NOT IN ('REJETE', 'CLOTURE')
			ORDER BY df.id_dossier DESC
			LIMIT 1
		) d ON true
		
		-- DERNIER TICKET DU RENDEZ-VOUS
		LEFT JOIN LATERAL (
			SELECT *
			FROM ticket_file_attente t
			WHERE t.id_rdv = rv.id_rdv
			ORDER BY t.id_ticket DESC
			LIMIT 1
		) t ON true
		
		ORDER BY rv.date_rdv ASC, rv.heure_rdv ASC
		`)
		
		return rows.map(row => ({
			id_rdv: row.id_rdv,
			date_rdv: row.date_rdv,
			heure_rdv: row.heure_rdv,
			statut_rdv: row.statut_rdv,
			canal_creation: row.canal_creation,
			date_creation: row.date_creation,
			commentaire: row.commentaire,
			id_contribuable: row.id_contribuable,
			id_service: row.id_service,
			
			contribuable: row.id_contribuable ? {
				nif: row.nif,
				nom_raison_sociale: row.nom_raison_sociale,
				prenom: row.prenom,
				email: row.email
			} : null,
			
			service: row.id_service ? {
				libelle_service: row.libelle_service,
				duree_estimee_min: row.duree_estimee_min
			} : null,
			
			dossier: row.id_dossier ? {
				id_dossier: row.id_dossier,
				reference_dossier: row.reference_dossier,
				date_predepot: row.date_predepot,
				statut_dossier: row.statut_dossier
			} : null,
			
			ticket: row.id_ticket ? {
				id_ticket: row.id_ticket,
				numero_ticket: row.numero_ticket,
				date_emission: row.date_emission,
				date_file: row.date_file,
				heure_arrivee: row.heure_arrivee,
				heure_appel: row.heure_appel,
				heure_fin: row.heure_fin,
				statut_ticket: row.statut_ticket,
				nom_visiteur: row.nom_visiteur,
				motif_visite: row.motif_visite
			} : null
		}))
	},
	
	
	// ============================================================
	// RÉCUPÉRER UN RENDEZ-VOUS PAR ID
	// ============================================================
	async findById(id_rdv) {
		
		const { rows } = await pool.query(`
		SELECT
		rv.*,
		
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		c.email,
		
		sf.libelle_service,
		sf.duree_estimee_min,
		
		t.id_ticket,
		t.numero_ticket,
		t.date_emission,
		t.date_file,
		t.heure_arrivee,
		t.heure_appel,
		t.heure_fin,
		t.statut_ticket,
		t.nom_visiteur,
		t.motif_visite,
		
		d.id_dossier,
		d.reference_dossier,
		d.date_predepot,
		d.statut_dossier
		
		FROM rendez_vous rv
		
		LEFT JOIN contribuable c
		ON c.id_contribuable = rv.id_contribuable
		
		LEFT JOIN service_fiscal sf
		ON sf.id_service = rv.id_service
		
		LEFT JOIN ticket_file_attente t
		ON t.id_rdv = rv.id_rdv
		
		LEFT JOIN dossier_fiscal d
		ON d.id_rdv = rv.id_rdv
		
		WHERE rv.id_rdv = $1
		
		LIMIT 1
		`, [id_rdv])
		
		if (!rows[0]) {
			return null
		}
		
		const row = rows[0]
		
		return {
			// =========================
			// RENDEZ-VOUS
			// =========================
			id_rdv: row.id_rdv,
			date_rdv: row.date_rdv,
			heure_rdv: row.heure_rdv,
			statut_rdv: row.statut_rdv,
			canal_creation: row.canal_creation,
			date_creation: row.date_creation,
			commentaire: row.commentaire,
			id_contribuable: row.id_contribuable,
			id_service: row.id_service,
			
			// =========================
			// CONTRIBUABLE
			// =========================
			contribuable: {
				nif: row.nif,
				nom_raison_sociale: row.nom_raison_sociale,
				prenom: row.prenom,
				email: row.email
			},
			
			// =========================
			// SERVICE
			// =========================
			service: {
				libelle_service: row.libelle_service,
				duree_estimee_min: row.duree_estimee_min
			},
			
			// =========================
			// TICKET
			// =========================
			ticket: row.id_ticket
			? {
				id_ticket: row.id_ticket,
				numero_ticket: row.numero_ticket,
				date_emission: row.date_emission,
				date_file: row.date_file,
				heure_arrivee: row.heure_arrivee,
				heure_appel: row.heure_appel,
				heure_fin: row.heure_fin,
				statut_ticket: row.statut_ticket,
				nom_visiteur: row.nom_visiteur,
				motif_visite: row.motif_visite
			}
			: null,
			dossier: row.id_dossier
			? {
				id_dossier: row.id_dossier,
				reference_dossier: row.reference_dossier,
				date_predepot: row.date_predepot,
				statut_dossier: row.statut_dossier
			}
			: null
		}
	},
	
	//=======================================================
	// Verifier si la date choisit est travaillable
	//=======================================================
	
	async estJourTravail(date_rdv) {
		const { rows } = await pool.query(`
		SELECT EXTRACT(ISODOW FROM $1::date) BETWEEN 1 AND 5 AS est_jour_travail
		`, [date_rdv])
		
		return rows[0]?.est_jour_travail === true
	},
	
	async findByDateAndService(date_rdv, id_service) {
		
		const { rows } = await pool.query(`
		SELECT *
		FROM rendez_vous
		WHERE date_rdv = $1
		AND id_service = $2
		ORDER BY heure_rdv
		`, [
			date_rdv,
			id_service
		])
		
		return rows
	},
	
	
	// ============================================================
	// RÉCUPÉRER LES RENDEZ-VOUS D'UN CONTRIBUABLE
	// ============================================================
	async findByContribuable(id_contribuable) {
		const { rows } = await pool.query(`
		SELECT
		rv.*,
		
		sf.libelle_service,
		sf.duree_estimee_min,
		
		t.id_ticket,
		t.numero_ticket,
		t.date_emission,
		t.date_file,
		t.heure_arrivee,
		t.heure_appel,
		t.heure_fin,
		t.statut_ticket,
		t.nom_visiteur,
		t.motif_visite,
		
		-- DOSSIER ACTIF LIÉ AU RDV
		EXISTS (
			SELECT 1
			FROM dossier_fiscal d
			WHERE d.id_rdv = rv.id_rdv
			AND d.statut_dossier NOT IN (
				'REJETE',
				'CLOTURE'
			)
		) AS has_dossier
		
		FROM rendez_vous rv
		
		LEFT JOIN service_fiscal sf
		ON sf.id_service = rv.id_service
		
		LEFT JOIN LATERAL (
			SELECT *
			FROM ticket_file_attente t
			WHERE t.id_rdv = rv.id_rdv
			ORDER BY t.id_ticket DESC
			LIMIT 1
		) t ON true
		
		WHERE rv.id_contribuable = $1
		
		ORDER BY
		rv.date_rdv DESC,
		rv.heure_rdv DESC
		`, [id_contribuable])
		
		return rows.map(rdv => ({
			id_rdv: rdv.id_rdv,
			date_rdv: rdv.date_rdv,
			heure_rdv: rdv.heure_rdv,
			statut_rdv: rdv.statut_rdv,
			canal_creation: rdv.canal_creation,
			date_creation: rdv.date_creation,
			commentaire: rdv.commentaire,
			id_contribuable: rdv.id_contribuable,
			id_service: rdv.id_service,
			
			// Nouveau
			hasDossier: rdv.has_dossier,
			
			service: {
				libelle_service: rdv.libelle_service,
				duree_estimee_min: rdv.duree_estimee_min
			},
			
			ticket: rdv.id_ticket
			? {
				id_ticket: rdv.id_ticket,
				numero_ticket: rdv.numero_ticket,
				date_emission: rdv.date_emission,
				date_file: rdv.date_file,
				heure_arrivee: rdv.heure_arrivee,
				heure_appel: rdv.heure_appel,
				heure_fin: rdv.heure_fin,
				statut_ticket: rdv.statut_ticket,
				nom_visiteur: rdv.nom_visiteur,
				motif_visite: rdv.motif_visite
			}
			: null
		}))
	},
	
	
	// ============================================================
	// RÉCUPÉRER LES RENDEZ-VOUS D'UNE DATE  
	// ============================================================
	async findByDate(date_rdv) {
		/* ⭐ CORRECTIF : marquerPresent() fait passer le ticket de
		 * RESERVE à EN_ATTENTE une fois le contribuable accueilli.
		 * Garder EN_ATTENTE ici faisait réapparaître/rester le RDV dans
		 * "Rendez-vous du jour" (bouton "Marquer présent" toujours actif)
		 * alors que la personne existe déjà dans la file d'attente
		 * générale (liste ticketsEnAttente côté FilEntente.vue) — double
		 * affichage. Seul RESERVE (= pas encore accueilli) doit
		 * apparaître ici.
		 */
		const { rows } = await pool.query(`
		SELECT
		rv.*,
		c.nif,
		c.nom_raison_sociale,
		c.prenom,
		sf.libelle_service,
		t.id_ticket,
		t.numero_ticket,
		t.statut_ticket
		FROM rendez_vous rv
		LEFT JOIN contribuable c
		ON c.id_contribuable = rv.id_contribuable
		LEFT JOIN service_fiscal sf
		ON sf.id_service = rv.id_service
		LEFT JOIN LATERAL (
			SELECT *
			FROM ticket_file_attente tk
			WHERE tk.id_rdv = rv.id_rdv
			ORDER BY tk.id_ticket DESC
			LIMIT 1
		) t ON TRUE
		WHERE rv.date_rdv = $1
		AND rv.statut_rdv = 'CONFIRME'
		AND t.statut_ticket = 'RESERVE'
		ORDER BY rv.heure_rdv ASC
		`, [date_rdv])
		
		return rows
	},
	
	
	// ============================================================
	// VÉRIFIER SI UN CRÉNEAU EST DÉJÀ OCCUPÉ
	// ============================================================
	// ============================================================
	// VÉRIFIER SI UN CRÉNEAU EST DISPONIBLE
	// ============================================================
	async isSlotAvailable(date_rdv,heure_rdv,id_service,duree_estimee_min,excludeId = null) {
		const values = [
			date_rdv,
			heure_rdv,
			id_service,
			duree_estimee_min
		]
		
		let query = `
		SELECT rv.id_rdv
		FROM rendez_vous rv
		WHERE rv.date_rdv = $1::date
		AND rv.id_service = $3
		AND LOWER(rv.statut_rdv) NOT IN ('annule', 'annulé')
		
		AND (
			rv.heure_rdv::time,
	   rv.heure_rdv::time
	   + (
		   COALESCE(
			   (
				   SELECT sf.duree_estimee_min
				   FROM service_fiscal sf
				   WHERE sf.id_service = rv.id_service
			   ),
			  30
		   ) * INTERVAL '1 minute'
	   )
		)
		OVERLAPS
		(
			$2::time,
   $2::time
   + ($4 * INTERVAL '1 minute')
		)
		`
		
		if (excludeId) {
			values.push(excludeId)
			query += ` AND rv.id_rdv <> $5`
		}
		
		query += ` LIMIT 1`
		
		const { rows } = await pool.query(query, values)
		
		return rows.length === 0
	},
	
	// ============================================================
	// CRÉER UN RENDEZ-VOUS
	// ============================================================
	async create(data) {
		
		const {
			date_rdv,
			heure_rdv,
			statut_rdv,
			canal_creation,
			commentaire,
			id_contribuable,
			id_service
		} = data
		
		const client = await pool.connect()
		
		try {
			
			// ========================================================
			// DÉBUT TRANSACTION
			// ========================================================
			
			await client.query('BEGIN')
			
			
			// ========================================================
			// CRÉER LE RENDEZ-VOUS
			// ========================================================
			
			const { rows: rdvRows } = await client.query(`
			INSERT INTO rendez_vous (
				date_rdv,
				heure_rdv,
				statut_rdv,
				canal_creation,
				date_creation,
				commentaire,
				id_contribuable,
				id_service
			)
			VALUES (
				$1,
		   $2,
		   $3,
		   $4,
		   CURRENT_TIMESTAMP,
		   $5,
		   $6,
		   $7
			)
			RETURNING *
			`, [
				date_rdv,
				heure_rdv,
				statut_rdv,
				canal_creation,
				commentaire || null,
				id_contribuable,
				id_service
			])
			
			const rendezVous = rdvRows[0]
			
			await client.query('COMMIT')
			emitStatsRefresh()
			return {
				rendezVous
			}
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			
			throw error
			
		} finally {
			
			client.release()
			
		}
	},
	
	async confirmer(id_rdv) {
		
		const client = await pool.connect()
		
		try {
			
			await client.query('BEGIN')
			
			// 1. Récupérer le RDV
			const { rows } = await client.query(`
			SELECT *
			FROM rendez_vous
			WHERE id_rdv = $1
			FOR UPDATE
			`, [id_rdv])
			
			if (!rows.length) {
				throw new Error('Rendez-vous introuvable.')
			}
			
			const rendezVous = rows[0]
			
			// 2. Vérifier son statut
			if (rendezVous.statut_rdv !== 'EN_ATTENTE') {
				throw new Error(
					'Seul un rendez-vous en attente peut être confirmé.'
				)
			}
			
			// 3. Confirmer le RDV
			const { rows: updatedRows } = await client.query(`
			UPDATE rendez_vous
			SET statut_rdv = 'CONFIRME'
			WHERE id_rdv = $1
			RETURNING *
			`, [id_rdv])
			
			const rdvConfirme = updatedRows[0]
			
			// 4. Générer le numéro de ticket
			const numeroTicket =
			await TicketFileAttenteModel.generateNumeroTicket(
				client,
				rdvConfirme.date_rdv
			)
			
			// 5. Créer le ticket
			const ticket =
			await TicketFileAttenteModel.create(
				client,
				{
					numero_ticket: numeroTicket,
					date_file: rdvConfirme.date_rdv,
					statut_ticket: 'RESERVE',
					id_contribuable: rdvConfirme.id_contribuable,
					id_rdv: rdvConfirme.id_rdv
				}
			)
			
			await client.query('COMMIT')
			
			emitFileRefresh()      
			emitStatsRefresh()
			
			return {
				rendezVous: rdvConfirme,
				ticket
			}
			
		} catch (error) {
			
			await client.query('ROLLBACK')
			throw error
			
		} finally {
			
			client.release()
			
		}
	},
	
	async marquerAbsent(id_rdv) {
		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			
			const { rows } = await client.query(`
			UPDATE rendez_vous
			SET statut_rdv = 'ABSENT'
			WHERE id_rdv = $1 AND statut_rdv = 'CONFIRME'
			RETURNING *
			`, [id_rdv])
			
			if (!rows.length) throw new Error('Rendez-vous non éligible.')
				
				await client.query(`
				UPDATE ticket_file_attente
				SET statut_ticket = 'ANNULE'
				WHERE id_rdv = $1
				AND statut_ticket IN ('RESERVE', 'EN_ATTENTE', 'APPELE')
				`, [id_rdv])
				
				await client.query('COMMIT')
				
				emitFileRefresh() 
				emitStatsRefresh()
				
				return rows[0]
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	// ============================================================
	// MODIFIER UN RENDEZ-VOUS
	// ============================================================
	async update(id_rdv, data) {
		
		const {
			date_rdv,
			heure_rdv,
			statut_rdv,
			canal_creation,
			commentaire,
			id_service
		} = data
		
		const { rows } = await pool.query(`
		UPDATE rendez_vous
		SET
		date_rdv = COALESCE($1, date_rdv),
										  heure_rdv = COALESCE($2, heure_rdv),
										  statut_rdv = COALESCE($3, statut_rdv),
										  canal_creation = COALESCE($4, canal_creation),
										  commentaire = COALESCE($5, commentaire),
										  id_service = COALESCE($6, id_service)
										  WHERE id_rdv = $7
										  RETURNING *
										  `, [
											  date_rdv ?? null,
									heure_rdv ?? null,
									statut_rdv ?? null,
									canal_creation ?? null,
									commentaire ?? null,
									id_service ?? null,
									id_rdv
										  ])
		
		return rows[0] || null
	},
	
	
	// ============================================================
	// CHANGER UNIQUEMENT LE STATUT
	// ============================================================
	async updateStatus(id_rdv, statut_rdv) {
		
		const { rows } = await pool.query(`
		UPDATE rendez_vous
		SET statut_rdv = $1
		WHERE id_rdv = $2
		RETURNING *
		`, [
			statut_rdv,
			id_rdv
		])
		
		return rows[0] || null
	},
	
	
	// ============================================================
	// ANNULER UN RENDEZ-VOUS
	// ============================================================
	async cancel(id_rdv) {
		const client = await pool.connect()
		
		try {
			await client.query('BEGIN')
			
			// 1. Annuler le rendez-vous
			const { rows } = await client.query(`
			UPDATE rendez_vous
			SET statut_rdv = 'ANNULE'
			WHERE id_rdv = $1
			RETURNING *
			`, [id_rdv])
			
			if (!rows.length) {
				await client.query('ROLLBACK')
				return null
			}
			
			// 2. Annuler le ticket associé
			await client.query(`
			UPDATE ticket_file_attente
			SET statut_ticket = 'ANNULE'
			WHERE id_rdv = $1
			AND statut_ticket IN ('RESERVE', 'EN_ATTENTE', 'APPELE')
			`, [id_rdv])
			
			await client.query('COMMIT')
			
			emitStatsRefresh()
			
			return rows[0]
			
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	},
	
	
	// ============================================================
	// SUPPRIMER PHYSIQUEMENT
	// ============================================================
	async remove(id_rdv) {
		
		const { rows } = await pool.query(`
		DELETE FROM rendez_vous
		WHERE id_rdv = $1
		RETURNING id_rdv
		`, [id_rdv])
		
		return rows[0] || null
	}
}
