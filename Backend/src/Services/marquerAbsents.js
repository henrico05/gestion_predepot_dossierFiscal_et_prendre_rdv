import pool from '../DataBases/db.js'
import { emitFileRefresh, emitStatsRefresh } from '../Socket/emitters.js'
import { notifyChef } from '../Services/notifyChef.js'

export async function marquerRdvExpires() {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')
		
		// 1. RDV confirmés dont l'heure est passée → ABSENT
		const absents = await client.query(`
		UPDATE rendez_vous
		SET statut_rdv = 'ABSENT'
		WHERE statut_rdv = 'CONFIRME'
		AND (date_rdv + heure_rdv) < NOW()
		RETURNING id_rdv
		`)
		
		// 2. RDV encore EN_ATTENTE dont l'heure est passée → ANNULE
		const annules = await client.query(`
		UPDATE rendez_vous
		SET statut_rdv = 'ANNULE'
		WHERE statut_rdv = 'EN_ATTENTE'
		AND (date_rdv + heure_rdv) < NOW()
		RETURNING id_rdv
		`)
		
		const ids = [...absents.rows, ...annules.rows].map((r) => r.id_rdv)
		
		// 3. Annuler les tickets liés à ces RDV
		if (ids.length) {
			await client.query(`
			UPDATE ticket_file_attente
			SET statut_ticket = 'ANNULE'
			WHERE id_rdv = ANY($1::int[])
			AND statut_ticket IN ('RESERVE', 'EN_ATTENTE', 'APPELE')
			`, [ids])
		}
		
		// 4. Tickets walk-in non traités depuis plus de 3h → ANNULE
		const walkInExpires = await client.query(`
		UPDATE ticket_file_attente
		SET statut_ticket = 'ANNULE'
		WHERE date_file = CURRENT_DATE
		AND id_rdv IS NULL
		AND statut_ticket IN ('EN_ATTENTE', 'APPELE')
		AND (date_file + heure_arrivee) < CURRENT_TIMESTAMP - INTERVAL '3 hours'
		RETURNING id_ticket
		`)
		
		await client.query('COMMIT')
		
		const nAbsents = absents.rowCount
		const nAnnules = annules.rowCount
		const nWalkIn = walkInExpires.rowCount
		const total = nAbsents + nAnnules + nWalkIn
		
		console.log(`[cron] ${nWalkIn} tickets walk-in marqués ANNULE`)
		console.log(`[cron] ${nAbsents} ABSENT (confirmés), ${nAnnules} ANNULE (en attente)`)
		
		// Sockets seulement s'il y a eu des changements
		if (total > 0) {
			emitFileRefresh()
			emitStatsRefresh()
			console.log('[cron] 📡 Sockets émis')
		}
		
		// Notification chef seulement s'il y a eu des RDV expirés
		if (nAbsents + nAnnules > 0) {
			await notifyChef({
				type_notification: 'RDV_EXPIRES',
				contenu: `${nAbsents + nAnnules} rendez-vous marqué(s) absents/annulés automatiquement.`,
							 type_acteur: 'SYSTEME',
							 action: 'MARQUER_ABSENTS',
							 table_cible: 'rendez_vous'
			})
		}
		
	} catch (error) {
		await client.query('ROLLBACK')
		console.error('[cron] marquerRdvExpires :', error)
		throw error
	} finally {
		client.release()
	}
}
