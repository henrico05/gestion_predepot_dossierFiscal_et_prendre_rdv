import pool from '../DataBases/db.js'
import { sendRdvRappel } from './emailService.js'
import { NotificationModel } from '../Models/NotificationModel.js'
import { getIO } from '../Socket/socket.js'


async function envoyer(type, sqlWhere) {
	
	// ======================================================
	// 1. RECHERCHER LES RENDEZ-VOUS CONCERNÉS
	// ======================================================
	
	const { rows } = await pool.query(`
	SELECT
	r.id_rdv,
	r.id_contribuable,
	r.date_rdv,
	r.heure_rdv,
	c.email,
	c.nom_raison_sociale,
	s.libelle_service
	FROM rendez_vous r
	
	JOIN contribuable c
	ON c.id_contribuable = r.id_contribuable
	
	LEFT JOIN service_fiscal s
	ON s.id_service = r.id_service
	
	WHERE r.statut_rdv IN ('CONFIRME', 'EN_ATTENTE')
	
	AND ${sqlWhere}
	
	-- Empêche l'envoi plusieurs fois
	AND NOT EXISTS (
		SELECT 1
		FROM rdv_rappel x
		WHERE x.id_rdv = r.id_rdv
		AND x.type_rappel = $1
	)
	
	ORDER BY r.date_rdv, r.heure_rdv
	`, [type])
	
	
	console.log(
		`🔎 [RAPPEL ${type}] ${rows.length} rendez-vous trouvé(s)`
	)
	
	
	// ======================================================
	// 2. TRAITER CHAQUE RENDEZ-VOUS
	// ======================================================
	
	for (const r of rows) {
		
		try {
			
			// ==================================================
			// INFORMATIONS DU RDV
			// ==================================================
			
			const date = String(r.date_rdv).slice(0, 10)
			const heure = String(r.heure_rdv).slice(0, 5)
			const service = r.libelle_service || 'Service fiscal'
			
			
			// ==================================================
			// TYPE DE NOTIFICATION
			// ==================================================
			
			const typeNotif =
			type === 'J1'
			? 'RDV_RAPPEL_J1'
			: 'RDV_RAPPEL_H2'
			
			
			// ==================================================
			// CONTENU
			// ==================================================
			
			const contenu =
			type === 'J1'
			? `Rappel : rendez-vous demain (${service}) le ${date} à ${heure}.`
			: `Rappel : rendez-vous dans 2 heures (${service}) le ${date} à ${heure}.`
			
			
			console.log('')
			console.log('------------------------------------------')
			console.log(`📅 RAPPEL ${type}`)
			console.log(`🆔 RDV : ${r.id_rdv}`)
			console.log(`👤 Contribuable : ${r.id_contribuable}`)
			console.log(`📅 Date : ${date}`)
			console.log(`⏰ Heure : ${heure}`)
			console.log(`🏢 Service : ${service}`)
			console.log(`📧 Email : ${r.email || 'aucun'}`)
			console.log('------------------------------------------')
			
			
			// ==================================================
			// 3. NOTIFICATION PORTAIL
			// ==================================================
			
			const notificationPortail =
			await NotificationModel.create(pool, {
				type_notification: typeNotif,
				contenu,
				canal: 'PORTAIL',
				id_contribuable: r.id_contribuable,
				statut_envoi: 'ENVOYE'
			})
			
			
			console.log(
				`🔔 Notification PORTAIL créée pour contribuable #${r.id_contribuable}`
			)
			
			
			// ==================================================
			// 4. NOTIFICATION TEMPS RÉEL SOCKET.IO
			// ==================================================
			
			try {
				
				const io = getIO()
				
				io.to(`contribuable:${r.id_contribuable}`)
				.emit('notification:new', {
					
					id_notification:
					notificationPortail.id_notification,
		  
		  id_rdv:
		  r.id_rdv,
		  
		  type_notification:
		  typeNotif,
		  
		  contenu,
		  
		  date,
		  
		  heure,
		  
		  service,
		  
		  date_creation:
		  notificationPortail.date_creation,
		  
		  statut_envoi:
		  notificationPortail.statut_envoi
				})
				
				
				console.log(
					`📡 Notification Socket.IO envoyée à contribuable:${r.id_contribuable}`
				)
				
			} catch (socketError) {
				
				console.error(
					`⚠️ Socket.IO indisponible pour RDV #${r.id_rdv} :`,
				  socketError.message
				)
			}
			
			
			// ==================================================
			// 5. ENVOI EMAIL
			// ==================================================
			
			if (r.email) {
				
				try {
					
					await sendRdvRappel({
						to: r.email,
						nom: r.nom_raison_sociale,
						date,
						heure,
						service,
						type
					})
					
					
					// --------------------------------------------
					// EMAIL RÉUSSI
					// --------------------------------------------
					
					await NotificationModel.create(pool, {
						
						type_notification: typeNotif,
						
						contenu,
						
						canal: 'EMAIL',
						
						id_contribuable:
						r.id_contribuable,
						
						statut_envoi: 'ENVOYE'
					})
					
					
					console.log(
						`📧 Email envoyé à ${r.email}`
					)
					
				} catch (emailError) {
					
					// --------------------------------------------
					// EMAIL ÉCHOUÉ
					// --------------------------------------------
					
					await NotificationModel.create(pool, {
						
						type_notification: typeNotif,
						
						contenu,
						
						canal: 'EMAIL',
						
						id_contribuable:
						r.id_contribuable,
						
						statut_envoi: 'ECHEC'
					})
					
					
					console.error(
						`❌ Échec email RDV #${r.id_rdv} :`,
				   emailError.message
					)
				}
				
			} else {
				
				console.log(
					`⚠️ RDV #${r.id_rdv} : aucun email`
				)
			}
			
			
			// ==================================================
			// 6. MARQUER LE RAPPEL COMME TRAITÉ
			// ==================================================
			
			await pool.query(`
			INSERT INTO rdv_rappel (
				id_rdv,
				type_rappel
			)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
			`, [
				r.id_rdv,
				type
			])
			
			
			console.log(
				`✅ Rappel ${type} enregistré pour RDV #${r.id_rdv}`
			)
			
			
		} catch (error) {
			
			// ==================================================
			// ERREUR SUR UN RDV
			// ==================================================
			
			console.error(
				`❌ Erreur traitement rappel ${type} - RDV #${r.id_rdv} :`,
				 error
			)
		}
	}
}


/**
 * Fonction principale appelée par le CRON.
 */
export async function envoyerRappels() {
	
	console.log('')
	console.log('==========================================')
	console.log('⏰ VÉRIFICATION DES RAPPELS RDV')
	
	console.log(
		new Date().toLocaleString('fr-FR', {
			timeZone: 'Indian/Antananarivo'
		})
	)
	
	console.log('==========================================')
	
	
	try {
		
		// ==================================================
		// RAPPEL J-1
		// ==================================================
		
		await envoyer(
			'J1',
			`r.date_rdv = CURRENT_DATE + INTERVAL '1 day'`
		)
		
		
		// ==================================================
		// RAPPEL H-2
		// ==================================================
		
		await envoyer(
			'H2',
			`(
				r.date_rdv + r.heure_rdv
			) BETWEEN
			NOW() + INTERVAL '1 hour 45 minutes'
			AND
			NOW() + INTERVAL '2 hours 15 minutes'
			`
		)
		
		
		console.log('==========================================')
		console.log('✅ VÉRIFICATION RAPPELS TERMINÉE')
		console.log('==========================================')
		
	} catch (error) {
		
		console.error(
			'❌ Erreur générale envoyerRappels():',
					  error
		)
	}
}
