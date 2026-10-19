
import { RendezVousModel } from '../Models/rendezVousModel.js'
import { ServiceFiscalModel } from '../Models/serviceFiscalModel.js'
import { TicketFileAttenteModel } from '../Models/ticketFileAttenteModel.js'
import { NotificationModel } from '../Models/NotificationModel.js'
import { getIO } from '../Socket/socket.js'
import pool from '../DataBases/db.js'
import { notifyChef } from '../Services/notifyChef.js'

export const RendezVousController = {
	
	// ============================================================
	// GET /api/rendez-vous
	// ============================================================
	async getAll(req, res) {
		
		try {
			
			const rendezVous =
			await RendezVousModel.findAll()
			
			return res.status(200).json({
				success: true,
				data: rendezVous
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getAll rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des rendez-vous.'
			})
		}
	},
	
	
	// ============================================================
	// GET /api/rendez-vous/:id
	// ============================================================
	async getById(req, res) {
		
		try {
			
			const { id } = req.params
			
			const rendezVous =
			await RendezVousModel.findById(id)
			
			if (!rendezVous) {
				
				return res.status(404).json({
					success: false,
					message:
					'Rendez-vous introuvable.'
				})
			}
			
			//const personnesDevant = await TicketFileAttenteModel.getPersonnesDevant(id)
			const suivi = await TicketFileAttenteModel.getSuivi(id)
			
			return res.status(200).json({
				success: true,
				data: {
					...rendezVous,
					
					suivi,
					
					// suivi: {
					// 	personnesDevant
					// }
				}
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getById rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération du rendez-vous.'
			})
		}
	},
	
	
	// ============================================================
	// GET /api/rendez-vous/date/:date
	// ============================================================
	async getByDate(req, res) {
		
		try {
			
			const { date } = req.params
			
			if (!date) {
				
				return res.status(400).json({
					success: false,
					message:
					'La date du rendez-vous est obligatoire.'
				})
			}
			
			const rendezVous =
			await RendezVousModel.findByDate(date)
			
			return res.status(200).json({
				success: true,
				data: rendezVous
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getByDate rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des rendez-vous.'
			})
		}
	},
	
	
	// ============================================================
	// GET /api/rendez-vous/contribuable/:id
	// ============================================================
	async getByContribuable(req, res) {
		
		try {
			
			const { id } = req.params
			
			const rendezVous =
			await RendezVousModel.findByContribuable(id)
			
			return res.status(200).json({
				success: true,
				data: rendezVous
			})
			
		} catch (error) {
			
			console.error(
				'Erreur rendez-vous contribuable :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des rendez-vous.'
			})
		}
	},
	
	
	// ============================================================
	// POST /api/rendez-vous
	// ============================================================
	async create(req, res) {
		try {
			const {
				date_rdv,
				heure_rdv,
				canal_creation = 'en_ligne',
				commentaire = null,
				id_contribuable,
				id_service
			} = req.body
			
			// ================================
			// VALIDATION
			// ================================
			
			if (!date_rdv || !heure_rdv) {
				return res.status(400).json({
					success: false,
					message: 'La date et l’heure du rendez-vous sont obligatoires.'
				})
			}
			
			if (!id_contribuable) {
				return res.status(400).json({
					success: false,
					message: 'Le contribuable est obligatoire.'
				})
			}
			
			if (!id_service) {
				return res.status(400).json({
					success: false,
					message: 'Le service fiscal est obligatoire.'
				})
			}
			
			const jourTravail = await RendezVousModel.estJourTravail(date_rdv)
			
			if (!jourTravail) {
				return res.status(400).json({
					success: false,
					message: 'Les rendez-vous sont disponibles uniquement du lundi au vendredi.'
				})
			}
			
			// ================================
			// SERVICE FISCAL
			// ================================
			
			const service = await ServiceFiscalModel.findById(id_service)
			
			if (!service) {
				return res.status(404).json({
					success: false,
					message: 'Le service fiscal demandé n’existe pas.'
				})
			}
			
			if (!service.actif) {
				return res.status(400).json({
					success: false,
					message: 'Ce service fiscal est actuellement inactif.'
				})
			}
			
			// ================================
			// DISPONIBILITÉ
			// ================================
			
			const available = await RendezVousModel.isSlotAvailable(
				date_rdv,
				heure_rdv,
				id_service,
				service.duree_estimee_min
			)
			
			if (!available) {
				return res.status(409).json({
					success: false,
					message: `Le créneau de ${heure_rdv} n'est pas disponible pour ce service.`
				})
			}
			
			// ================================
			// CRÉATION
			// ================================
			
			const result = await RendezVousModel.create({
				date_rdv,
				heure_rdv,
				statut_rdv: 'EN_ATTENTE',
				canal_creation,
				commentaire,
				id_contribuable,
				id_service
			})
			
			
			try {
				
				const io = getIO()
				
				io.to('room:agents').emit('rdv:created', {
					...result.rendezVous
				})
			} catch (errs){
				console.error('error de creation de rendez-vous en temps reel ',errs)
			}
			
			
			return res.status(201).json({
				success: true,
				message: 'Rendez-vous créé avec succès.',
				data: result.rendezVous,
			})
			
			await notifyChef({
				type_notification: 'RDV_CREE',
				contenu: `Nouveau rendez-vous le ${date_rdv} à ${heure_rdv}.`,
				type_acteur: canal_creation === 'en_ligne' ? 'CONTRIBUABLE' : 'AGENT',
				id_acteur: id_contribuable,
				action: 'CREER_RDV',
				table_cible: 'rendez_vous',
				id_cible: result.rendezVous.id_rdv
			})
			
		} catch (error) {
			console.error('message :', error.message)
			
			
			return res.status(500).json({
				success: false,
				message: error.message,
				code: error.code,
				constraint: error.constraint,
				detail: error.detail
			})
		}
	},
	
	
	// ============================================================
	// PATCH /api/rendez-vous/:id
	//=============================================================
	
	async update(req, res) {
		try {
			const { id } = req.params
			
			const existing = await RendezVousModel.findById(id)
			
			if (!existing) {
				return res.status(404).json({
					success: false,
					message: 'Rendez-vous introuvable.'
				})
			}
			
			// ====================================================
			// ⭐ VÉRIFICATION JOUR TRAVAILLÉ
			// ====================================================
			
			const newDate = req.body.date_rdv || existing.date_rdv
			
			const jourTravail = await RendezVousModel.estJourTravail(newDate)
			
			if (!jourTravail) {
				return res.status(400).json({
					success: false,
					message: 'Les rendez-vous sont disponibles uniquement du lundi au vendredi.'
				})
			}
			
			// ====================================================
			// VÉRIFICATION SERVICE
			// ====================================================
			
			if (req.body.id_service) {
				const service = await ServiceFiscalModel.findById(req.body.id_service)
				
				if (!service) {
					return res.status(404).json({
						success: false,
						message: 'Le service fiscal demandé n\'existe pas.'
					})
				}
				
				if (!service.actif) {
					return res.status(400).json({
						success: false,
						message: 'Impossible d\'utiliser un service fiscal inactif.'
					})
				}
			}
			
			// ====================================================
			// VÉRIFIER LE NOUVEAU CRÉNEAU
			// ====================================================
			
			const newHeure = req.body.heure_rdv || existing.heure_rdv
			const newService = req.body.id_service || existing.id_service
			
			const service = await ServiceFiscalModel.findById(newService)
			
			if (!service) {
				return res.status(404).json({
					success: false,
					message: 'Le service fiscal demandé n\'existe pas.'
				})
			}
			
			if (
				String(newDate) !== String(existing.date_rdv) ||
				String(newHeure) !== String(existing.heure_rdv)
			) {
				const available = await RendezVousModel.isSlotAvailable(
					newDate,
					newHeure,
					newService,
					service.duree_estimee_min,
					id
				)
				
				if (!available) {
					return res.status(409).json({
						success: false,
						message: 'Le nouveau créneau est déjà réservé.'
					})
				}
			}
			
			// ====================================================
			// MISE À JOUR
			// ====================================================
			
			const updated = await RendezVousModel.update(id, req.body)
			
			try {
				const io = getIO()
				
				io.to('room:agents').emit('rdv:updated', { ...updated })
				io.to(`contribuable:${updated.id_contribuable}`).emit('rdv:updated', { ...updated })
				
			} catch (socketError) {
				console.error('⚠️ Erreur modification RDV temps réel :', socketError)
			}
			
			return res.status(200).json({
				success: true,
				message: 'Rendez-vous modifié avec succès.',
				data: updated
			})
			
		} catch (error) {
			console.error('Erreur modification rendez-vous :', error)
			
			return res.status(500).json({
				success: false,
				message: 'Erreur lors de la modification du rendez-vous.'
			})
		}
	},
	// ============================================================
	// GET /api/rendez-vous/rdv/disponibilites
	// ============================================================
	async getDisponibilites(req, res) {
		
		try {
			
			const { date, service } = req.query
			
			// ========================================================
			// VALIDATION
			// ========================================================
			
			if (!date) {
				return res.status(400).json({
					success: false,
					message: 'La date est obligatoire.'
				})
			}
			
			if (!service) {
				return res.status(400).json({
					success: false,
					message: 'Le service fiscal est obligatoire.'
				})
			}
			
			const idService = Number(service)
			
			if (!Number.isInteger(idService)) {
				return res.status(400).json({
					success: false,
					message: 'Le service fiscal est invalide.'
				})
			}
			
			// ========================================================
			// VÉRIFIER QUE LE SERVICE EXISTE
			// ========================================================
			
			const serviceFiscal =
			await ServiceFiscalModel.findById(idService)
			
			if (!serviceFiscal) {
				return res.status(404).json({
					success: false,
					message: 'Le service fiscal demandé n’existe pas.'
				})
			}
			
			if (!serviceFiscal.actif) {
				return res.status(400).json({
					success: false,
					message: 'Ce service fiscal est actuellement inactif.'
				})
			}
			
			// ========================================================
			// VÉRIFIER SI LE JOUR EST TRAVAILLÉ
			// ========================================================
			
			const jourTravail =
			await RendezVousModel.estJourTravail(date)
			
			if (!jourTravail) {
				
				return res.status(200).json({
					success: true,
					jour_travail: false,
					data: [],
					message:
					'Aucun créneau disponible : jour non travaillé.'
				})
			}
			
			// ========================================================
			// RÉCUPÉRER LES RDV DE LA DATE + DU SERVICE
			// ========================================================
			
			const rendezVous =
			await RendezVousModel.findByDateAndService(
				date,
				idService
			)
			
			// ========================================================
			// HEURES DÉJÀ RÉSERVÉES
			// ========================================================
			
			// ========================================================
			// DURÉE DU SERVICE
			// ========================================================
			
			const duree = Number(serviceFiscal.duree_estimee_min)
			
			if (!Number.isFinite(duree) || duree <= 0) {
				return res.status(400).json({
					success: false,
					message: 'La durée estimée du service fiscal est invalide.'
				})
			}
			
			// ========================================================
			// GÉNÉRER LES CRÉNEAUX SELON LA DURÉE DU SERVICE
			// ========================================================
			
			const genererCreneaux = (
				heureDebut,
				minuteDebut,
				heureFin,
				minuteFin
			) => {
				const slots = []
				
				let currentMinutes =
				heureDebut * 60 + minuteDebut
				
				const finMinutes =
				heureFin * 60 + minuteFin
				
				while (currentMinutes + duree <= finMinutes) {
					
					const heures =
					Math.floor(currentMinutes / 60)
					
					const minutes =
					currentMinutes % 60
					
					const heure =
					`${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
					
					slots.push(heure)
					
					currentMinutes += duree
				}
				
				return slots
			}
			
			// ========================================================
			// HORAIRES DE TRAVAIL
			// ========================================================
			
			const horaires = [
				...genererCreneaux(8, 0, 12, 0),
				...genererCreneaux(14, 0, 17, 0)
			]
			
			// ========================================================
			// VÉRIFIER LA DISPONIBILITÉ RÉELLE
			// EN TENANT COMPTE DE LA DURÉE
			// ========================================================
			
			const slots = []
			
			for (const heure of horaires) {
				
				const disponible =
				await RendezVousModel.isSlotAvailable(
					date,
					heure,
					idService,
					duree
				)
				
				slots.push({
					heure: `${heure}:00`,
					disponible
				})
			}
			
			// ========================================================
			// RÉPONSE
			// ========================================================
			
			return res.status(200).json({
				
				success: true,
				
				jour_travail: true,
				
				data: slots
				
			})
			
		} catch (error) {
			
			console.error(
				'❌ Erreur getDisponibilites rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors du chargement des créneaux disponibles.'
				
			})
		}
	},
	
	// ============================================================
	// PATCH /api/rendez-vous/:id/confirmer
	// ============================================================
	async confirm(req, res) {
		
		try {
			
			const { id } = req.params
			
			// ========================================================
			// VALIDATION
			// ========================================================
			
			if (!id) {
				
				return res.status(400).json({
					success: false,
					message:
					"L'identifiant du rendez-vous est obligatoire."
				})
			}
			
			// ========================================================
			// CONFIRMATION DU RENDEZ-VOUS + CRÉATION DU TICKET
			// ========================================================
			
			const result =
			await RendezVousModel.confirmer(id)
			
			const rendezVous = result.rendezVous
			const ticket = result.ticket
			
			try {
				const io = getIO()
				
				// Mise à jour chez les agents
				io.to('room:agents').emit('rdv:updated', {
					...rendezVous,
					...ticket
				})
				
				// Mise à jour chez le contribuable
				io.to(`contribuable:${rendezVous.id_contribuable}`)
				.emit('rdv:updated', {
					...rendezVous,
		  ...ticket
				})
				
			} catch (socketError) {
				console.error(
					'⚠️ Erreur Socket.IO confirmation RDV :',
				  socketError
				)
			}
			
			
			// ========================================================
			// NOTIFICATION DU CONTRIBUABLE
			// ========================================================
			
			const dateRdv =
			String(rendezVous.date_rdv || '').slice(0, 10)
			
			const heureRdv =
			String(rendezVous.heure_rdv || '').slice(0, 5)
			
			const contenu =
			`Votre demande de rendez-vous a été confirmée ` +
			`pour le ${dateRdv} à ${heureRdv}.` +
			(
				ticket?.numero_ticket
				? ` Votre numéro de ticket est ${ticket.numero_ticket}.`
				: ''
			)
			
			const notificationPortail =
			await NotificationModel.create(pool, {
				type_notification: 'RDV_CONFIRME',
				contenu,
				canal: 'PORTAIL',
				id_contribuable: rendezVous.id_contribuable,
				statut_envoi: 'ENVOYE'
			})
			
			// ========================================================
			// NOTIFICATION TEMPS RÉEL
			// ========================================================
			
			try {
				
				const io = getIO()
				
				io.to(
					`contribuable:${rendezVous.id_contribuable}`
				).emit(
					'notification:new',
		   {
			   id_notification:
			   notificationPortail.id_notification,
			   
			   id_rdv:
			   rendezVous.id_rdv,
			   
			   type_notification:
			   'RDV_CONFIRME',
			   
			   contenu:
			   notificationPortail.contenu,
			   
			   date_rdv:
			   dateRdv,
			   
			   heure_rdv:
			   heureRdv,
			   
			   numero_ticket:
			   ticket?.numero_ticket || null,
			   
			   date_creation:
			   notificationPortail.date_creation,
			   
			   statut_envoi:
			   notificationPortail.statut_envoi
		   }
				)
				
			} catch (socketError) {
				
				// Une erreur Socket.IO ne doit pas annuler
				// la confirmation du rendez-vous.
				
				console.error(
					'⚠️ Erreur notification temps réel :',
				  socketError
				)
			}
			
			// ========================================================
			// RÉPONSE
			// ========================================================
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Rendez-vous confirmé avec succès.',
				
				data:
				rendezVous,
				
				ticket:
				ticket
			})
			
		} catch (error) {
			
			console.error(
				'Erreur confirmation rendez-vous :',
				 error
			)
			
			// --------------------------------------------------------
			// Rendez-vous introuvable
			// --------------------------------------------------------
			
			if (
				error.message ===
				'Rendez-vous introuvable.'
			) {
				
				return res.status(404).json({
					
					success: false,
					
					message:
					error.message
				})
			}
			
			// --------------------------------------------------------
			// Mauvais statut
			// --------------------------------------------------------
			
			if (
				error.message ===
				'Seul un rendez-vous en attente peut être confirmé.'
			) {
				
				return res.status(409).json({
					
					success: false,
					
					message:
					error.message
				})
			}
			
			// --------------------------------------------------------
			// Erreur serveur
			// --------------------------------------------------------
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors de la confirmation du rendez-vous.'
			})
		}
	},
	
	// ============================================================
	// PATCH /api/rendez-vous/:id/absent
	// ============================================================
	
	async absent(req, res) {
		try {
			const { id } = req.params
			if (!id) {
				return res.status(400).json({ success: false, message: "L'identifiant du rendez-vous est obligatoire." })
			}
			const rdv = await RendezVousModel.marquerAbsent(id)
			
			try {
				const io = getIO()
				io.to('room:agents').emit('rdv:updated', rdv)
				io.to(`contribuable:${rdv.id_contribuable}`).emit('rdv:updated', rdv)
				
			} catch (socketError) {
				console.error(
					'⚠️ Erreur absent RDV temps réel :',
				  socketError
				)
			}
			
			return res.status(200).json({
				success: true,
				message: 'Rendez-vous marqué absent.',
				data: rdv
			})
		} catch (error) {
			if (error.message === 'Rendez-vous non éligible.') {
				return res.status(409).json({ success: false, message: error.message })
			}
			return res.status(500).json({ success: false, message: 'Erreur lors du marquage absent.' })
		}
	},
	
	
	// ============================================================
	// PATCH /api/rendez-vous/:id/statut
	// ============================================================
	async updateStatus(req, res) {
		
		try {
			
			const { id } = req.params
			const { statut_rdv } = req.body
			
			if (!statut_rdv) {
				
				return res.status(400).json({
					success: false,
					message:
					'Le statut est obligatoire.'
				})
			}
			
			
			const updated =
			await RendezVousModel.updateStatus(
				id,
				statut_rdv
			)
			
			if (!updated) {
				
				return res.status(404).json({
					success: false,
					message:
					'Rendez-vous introuvable.'
				})
			}
			
			try {
				const io = getIO()
				
				io.to('room:agents').emit(
					'rdv:updated',
					updated
				)
				
				io.to(`contribuable:${updated.id_contribuable}`)
				.emit(
					'rdv:updated',
		  updated
				)
				
			} catch (socketError) {
				console.error(
					'⚠️ Erreur statut RDV temps réel :',
				  socketError
				)
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Statut du rendez-vous mis à jour.',
				
				data:
				updated
			})
			
		} catch (error) {
			
			console.error(
				'Erreur changement statut :',
				 error
			)
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors de la modification du statut.'
			})
		}
	},
	
	
	// ============================================================
	// PATCH /api/rendez-vous/:id/annuler
	// ============================================================
	async cancel(req, res) {
		
		try {
			
			const { id } = req.params
			
			const cancelled = await RendezVousModel.cancel(id)
			
			if (!cancelled) {
				
				return res.status(404).json({
					success: false,
					message:
					'Rendez-vous introuvable.'
				})
			}
			
			try {
				const io = getIO()
				
				const event = {
					...cancelled,
					statut_rdv: 'ANNULE'
				}
				
				// Agents
				io.to('room:agents').emit(
					'rdv:updated',
					event
				)
				
				// Contribuable
				io.to(`contribuable:${cancelled.id_contribuable}`)
				.emit(
					'rdv:updated',
					event
				)
				
			} catch (socketError) {
				console.error(
					'⚠️ Erreur annulation RDV temps réel :',
				  socketError
				)
			}
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Rendez-vous annulé avec succès.',
				
				data:
				cancelled
			})
			
		} catch (error) {
			
			console.error(
				'Erreur annulation rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors de l’annulation du rendez-vous.'
			})
		}
	},
	
	
	// ============================================================
	// DELETE /api/rendez-vous/:id
	// ============================================================
	async remove(req, res) {
		
		try {
			
			const { id } = req.params
			
			const deleted =
			await RendezVousModel.remove(id)
			
			if (!deleted) {
				
				return res.status(404).json({
					success: false,
					message:
					'Rendez-vous introuvable ou déjà supprimé.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Rendez-vous supprimé avec succès.'
			})
			
		} catch (error) {
			
			console.error(
				'Erreur suppression rendez-vous :',
				 error
			)
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors de la suppression du rendez-vous.'
			})
		}
	}
}
