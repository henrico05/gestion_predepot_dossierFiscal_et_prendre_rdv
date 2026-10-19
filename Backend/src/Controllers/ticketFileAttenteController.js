import { TicketFileAttenteModel } from '../Models/ticketFileAttenteModel.js'
import { getIO } from '../Socket/socket.js'

export const TicketFileAttenteController = {
	
	// =========================================================
	// PERSONNES DEVANT
	// =========================================================
	
	async getPersonnesDevant(req, res) {
		
		try {
			
			const { id_rdv } = req.params
			
			if (!id_rdv) {
				return res.status(400).json({
					success: false,
					message:
					'L’identifiant du rendez-vous est obligatoire.'
				})
			}
			
			const personnesDevant =
			await TicketFileAttenteModel.getPersonnesDevant(
				id_rdv
			)
			
			return res.status(200).json({
				success: true,
				
				data: {
					id_rdv: Number(id_rdv),
										personnesDevant
				}
			})
			
		} catch (error) {
			
			console.error(
				'Erreur calcul personnes devant :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors du calcul des personnes devant vous.'
			})
		}
	},
	
	// =========================================================
	// MODIFIER LE STATUT
	// =========================================================
	
	async updateStatus(req, res) {
		
		try {
			
			const { id } = req.params
			const { statut_ticket } = req.body
			
			// -------------------------------------------------
			// Validation ID
			// -------------------------------------------------
			
			if (!id) {
				return res.status(400).json({
					success: false,
					message:
					'L’identifiant du ticket est obligatoire.'
				})
			}
			
			// -------------------------------------------------
			// Validation statut
			// -------------------------------------------------
			
			if (!statut_ticket) {
				return res.status(400).json({
					success: false,
					message:
					'Le statut est obligatoire.'
				})
			}
			
			// -------------------------------------------------
			// Recherche ticket
			// -------------------------------------------------
			
			const ticket =
			await TicketFileAttenteModel.findById(id)
			
			if (!ticket) {
				return res.status(404).json({
					success: false,
					message:
					'Ticket introuvable.'
				})
			}
			
			// -------------------------------------------------
			// Agent connecté
			// -------------------------------------------------
			
			const id_agent =
			req.user?.id ||
			req.user?.id_agent ||
			null
			
			// -------------------------------------------------
			// Guichet
			// -------------------------------------------------
			
			const id_guichet =
			req.body.id_guichet ||
			ticket.id_guichet ||
			null
			
			// -------------------------------------------------
			// Changement de statut
			// -------------------------------------------------
			
			const updated =
			await TicketFileAttenteModel.changerStatut(
				id,
				statut_ticket,
				{
					id_agent,
					id_guichet
				}
			)
			
			// -------------------------------------------------
			// Suivi du RDV
			// -------------------------------------------------
			
			let suivi = null
			
			if (updated.id_rdv) {
				
				suivi =
				await TicketFileAttenteModel.getSuivi(
					updated.id_rdv
				)
			}
			
			// -------------------------------------------------
			// Socket.IO
			// -------------------------------------------------
			
			const io = getIO()
			
			if (updated.id_contribuable) {
				
				io
				.to(
					`contribuable:${updated.id_contribuable}`
				)
				.emit(
					'file:updated',
		  {
			  id_rdv: updated.id_rdv,
			  
			  ticket: {
				  id_ticket:
				  updated.id_ticket,
				  
				  numero_ticket:
				  updated.numero_ticket,
				  
				  statut_ticket:
				  updated.statut_ticket
			  },
			  
			  suivi
		  }
				)
			}
			
			// -------------------------------------------------
			// Réponse HTTP
			// -------------------------------------------------
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Statut du ticket mis à jour.',
				
				data: updated,
				
				suivi
			})
			
		} catch (error) {
			
			console.error(
				'Erreur update ticket :',
				 error
			)
			
			// -------------------------------------------------
			// Erreur de transition
			// -------------------------------------------------
			
			if (
				error.message?.includes(
					'Transition interdite'
				)
			) {
				
				return res.status(409).json({
					success: false,
					message: error.message
				})
			}
			
			// -------------------------------------------------
			// Statut invalide
			// -------------------------------------------------
			
			if (
				error.message?.includes(
					'Statut invalide'
				)
			) {
				
				return res.status(400).json({
					success: false,
					message: error.message
				})
			}
			
			// -------------------------------------------------
			// Erreur générale
			// -------------------------------------------------
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la modification du ticket.'
			})
		}
	}
}
