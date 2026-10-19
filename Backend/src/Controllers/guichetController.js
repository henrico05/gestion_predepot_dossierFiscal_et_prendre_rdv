import { GuichetModel } from '../Models/guichetModel.js'
import { TicketFileAttenteModel } from '../Models/ticketFileAttenteModel.js'
import { RendezVousModel } from '../Models/rendezVousModel.js'
import { JournalAuditModel } from '../Models/journalAuditModel.js'
import { getIO } from '../Socket/socket.js'
import pool from '../DataBases/db.js'
import { notifyChef } from '../Services/notifyChef.js'

function emitFile() {
	try {
		const io = getIO()
		io.to('room:agents').emit('file:refresh')
		io.to('room:public').emit('file:refresh')
	} catch {}
}

function emitGuichetUpdated(guichet) {
	if (!guichet) return
		try {
			getIO()
			.to('room:agents')
			.emit('guichet:updated', {
				id_guichet: guichet.id_guichet,
		 numero_guichet: guichet.numero_guichet,
		 etat_guichet: guichet.etat_guichet
			})
		} catch {}
}

export const GuichetController = {
	async list(_req, res) {
		return res.json({ success: true, data: await GuichetModel.findAll() })
	},
	
	async ouvrir(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			
			/* On n'accepte plus id_guichet du client — le modèle le déduit */
			const aff = await GuichetModel.affecter(id_agent)
			
			await JournalAuditModel.log(pool, {
				type_acteur: 'AGENT',
				id_acteur: id_agent,
				action: 'OUVRIR_GUICHET',
				table_cible: 'guichet',
				id_cible: aff.guichet.id_guichet
			})
			
			
			await notifyChef({
				type_notification: 'GUICHET_OUVERT',
				contenu: `Guichet n°${aff.guichet.numero_guichet} ouvert.`,
				type_acteur: 'AGENT',
				id_acteur: id_agent,
				action: 'OUVRIR_GUICHET',
				table_cible: 'guichet',
				id_cible: aff.guichet.id_guichet
			})
			
			/* ⭐ Temps réel : prévenir les autres agents */
			emitGuichetUpdated(aff.guichet)
			
			return res.json({ success: true, data: aff })
			
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async fermer(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const aff = await GuichetModel.liberer(id_agent)
			
			/* Recharger le guichet pour avoir numero_guichet */
			if (aff?.id_guichet) {
				const guichet = await GuichetModel.monGuichet(id_agent)
				if (guichet) {
					emitGuichetUpdated({
						id_guichet: guichet.id_guichet,
						numero_guichet: guichet.numero_guichet,
						etat_guichet: 'FERME'
					})
				}
			}
			
			return res.json({ success: true, data: aff })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async setEtat(req, res) {
		try {
			const g = await GuichetModel.setEtat(req.params.id, req.body.etat_guichet)
			
			/* ⭐ Temps réel */
			emitGuichetUpdated(g)
			
			return res.json({ success: true, data: g })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async rdvDuJour(req, res) {
		const date = req.query.date || new Date().toISOString().slice(0, 10)
		const data = await RendezVousModel.findByDate(date)
		return res.json({ success: true, date, data })
	},
	async monGuichet(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const guichet = await GuichetModel.monGuichet(id_agent)
			
			if (!guichet) {
				return res.status(404).json({
					success: false,
					message: 'Aucun guichet assigné à votre compte.'
				})
			}
			
			return res.json({ success: true, data: guichet })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async session(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			
			/* Guichet assigné + affectation active éventuelle */
			const guichet = await GuichetModel.monGuichet(id_agent)
			
			if (!guichet) {
				return res.json({
					success: true,
					data: null,
					message: 'Aucun guichet assigné.'
				})
			}
			
			const estOuvert = Boolean(guichet.id_affectation)
			
			return res.json({
				success: true,
				data: {
					guichet: {
						id_guichet: guichet.id_guichet,
						numero_guichet: guichet.numero_guichet,
						libelle: guichet.libelle,
						etat_guichet: guichet.etat_guichet
					},
					est_ouvert: estOuvert,
					date_debut: guichet.date_debut || null
				}
			})
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async listAgents(req, res) {
		try {
			const agents = await GuichetModel.listAgentsGuichetiers()
			return res.json({ success: true, data: agents })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async reassigner(req, res) {
		try {
			const id_agent = req.params.id
			const { id_guichet } = req.body
			
			if (!id_agent) {
				return res.status(400).json({
					success: false,
					message: 'Agent obligatoire.'
				})
			}
			
			const agent = await GuichetModel.reassignerGuichet(
				id_agent,
				id_guichet || null
			)
			
			/* Audit */
			await JournalAuditModel.log(pool, {
				type_acteur: 'AGENT',
				id_acteur: req.user.id,
				action: 'REASSIGNER_GUICHET',
				table_cible: 'agents',
				id_cible: id_agent,
				details_json: { id_guichet: id_guichet || null }
			})
			
			/* ⭐ Temps réel : les autres postes doivent recharger */
			try {
				getIO()
				.to('room:agents')
				.emit('agent:updated', {
					id: agent.id,
		  id_guichet: agent.id_guichet
				})
			} catch {}
			
			return res.json({ success: true, data: agent })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
}



export const TicketController = {
	async file(req, res) {
		const data = await TicketFileAttenteModel.fileDuJour(req.query.date)
		return res.json({ success: true, data })
	},
	
	async ecranPublic(_req, res) {
		try {
			const rows = await TicketFileAttenteModel.fileDuJour()
			
			/* ============================================================
			 * 1. Ticket actuellement appelé (le plus récent en cours)
			 * ============================================================ */
			const enCours = rows
			.filter(t => t.statut_ticket === 'APPELE' || t.statut_ticket === 'EN_COURS')
			.sort((a, b) => {
				const da = a.heure_appel ? new Date(a.heure_appel).getTime() : 0
				const db = b.heure_appel ? new Date(b.heure_appel).getTime() : 0
				return db - da
			})
			
			const ticketActuel = enCours[0] || null
			
			/* ============================================================
			 * 2. Prochains tickets (6 premiers en attente)
			 * ============================================================ */
			const enAttente = rows
			.filter(t => t.statut_ticket === 'EN_ATTENTE' || t.statut_ticket === 'RESERVE')
			.sort((a, b) => String(a.numero_ticket).localeCompare(String(b.numero_ticket)))
			
			const prochains = enAttente
			.slice(0, 6)
			.map(t => ({
				numero_ticket: t.numero_ticket,
				statut_ticket: t.statut_ticket,
				libelle_service: t.libelle_service
			}))
			
			/* ============================================================
			 * 3. Temps d'attente moyen (basé sur les tickets traités aujourd'hui)
			 * ============================================================ */
			const traites = rows.filter(
				t => t.statut_ticket === 'TERMINE' &&
				t.heure_arrivee &&
				t.heure_appel
			)
			
			let tempsAttenteMoyen = 15   /* Valeur par défaut */
			
			if (traites.length > 0) {
				const totalMinutes = traites.reduce((acc, t) => {
					const arrivee = new Date(t.heure_arrivee).getTime()
					const appel   = new Date(t.heure_appel).getTime()
					const diff    = (appel - arrivee) / 60000
					return acc + (diff > 0 ? diff : 0)
				}, 0)
				tempsAttenteMoyen = Math.round(totalMinutes / traites.length)
			}
			
			/* ============================================================
			 * 4. Temps estimé pour le prochain ticket
			 * ============================================================ */
			const tempsProchain = enAttente.length > 0
			? tempsAttenteMoyen
			: 0
			
			/* ============================================================
			 * 5. Réponse
			 * ============================================================ */
			return res.json({
				success: true,
				data: {
					ticketActuel: ticketActuel ? {
						id_ticket: ticketActuel.id_ticket,
						numero_ticket: ticketActuel.numero_ticket,
						numero_guichet: ticketActuel.numero_guichet,
						libelle_service: ticketActuel.libelle_service,
						statut_ticket: ticketActuel.statut_ticket,
						heure_appel: ticketActuel.heure_appel
					} : null,
					prochains,
					tempsAttenteMoyen,
					tempsProchain,
					nbEnAttente: enAttente.length,
					lastUpdate: new Date().toISOString()
				}
			})
		} catch (error) {
			console.error('❌ Erreur écran public :', error)
			return res.status(500).json({
				success: false,
				message: 'Erreur lors du chargement.'
			})
		}
	},
	
	async present(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const aff = await GuichetModel.affectationActive(id_agent)
			const ticket = await TicketFileAttenteModel.marquerPresent({
				id_rdv: req.params.id,
				id_agent,
				id_guichet: aff?.id_guichet
			})
			const suivi = await TicketFileAttenteModel.getSuivi(req.params.id)
			try {
				const io = getIO()
				io.to('room:agents').emit('file:updated', { id_rdv: req.params.id, ticket, suivi })
				if (ticket.id_contribuable) {
					io.to(`contribuable:${ticket.id_contribuable}`).emit('file:updated', { id_rdv: req.params.id, ticket, suivi })
				}
			} catch {}
			emitFile()
			return res.json({ success: true, data: ticket, suivi })
		} catch (e) {
			return res.status(409).json({ success: false, message: e.message })
		}
	},
	
	async walkIn(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const aff = await GuichetModel.affectationActive(id_agent)
			const ticket = await TicketFileAttenteModel.creerSansRdv({
				...req.body,
				id_agent,
				id_guichet: aff?.id_guichet
			})
			emitFile()
			return res.status(201).json({ success: true, data: ticket })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async appeler(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const aff = await GuichetModel.affectationActive(id_agent)
			if (!aff) return res.status(403).json({ success: false, message: 'Aucun guichet ouvert.' })
				const ticket = await TicketFileAttenteModel.appelerSuivant(aff.id_guichet, id_agent)
				if (!ticket) return res.json({ success: true, data: null, message: 'File vide.' })
					emitFile()
					if (ticket.id_rdv) {
						const suivi = await TicketFileAttenteModel.getSuivi(ticket.id_rdv)
						try {
							getIO().to(`contribuable:${ticket.id_contribuable}`).emit('file:updated', {
								id_rdv: ticket.id_rdv, ticket, suivi
							})
						} catch {}
					}
					return res.json({ success: true, data: ticket })
		} catch (e) {
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	async statut(req, res) {
		try {
			const id_agent = req.user.id_agent || req.user.id
			const aff = await GuichetModel.affectationActive(id_agent)
			const ticket = await TicketFileAttenteModel.changerStatut(req.params.id, req.body.statut_ticket, {
				id_agent,
				id_guichet: req.body.id_guichet || aff?.id_guichet
			})
			emitFile()
			return res.json({ success: true, data: ticket })
		} catch (e) {
			return res.status(409).json({ success: false, message: e.message })
		}
	}
}
