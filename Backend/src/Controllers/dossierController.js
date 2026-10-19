import { DossierFiscalModel } from '../Models/dossierFiscalModel.js'
import { PieceJustificativeModel } from '../Models/pieceJustificativeModel.js'
import { NotificationModel } from '../Models/NotificationModel.js'
import { JournalAuditModel } from '../Models/journalAuditModel.js'
import { getIO } from '../Socket/socket.js'
import pool from '../DataBases/db.js'
import path from 'node:path'
import { notifyChef } from '../Services/notifyChef.js'


const ROLES_VERIF = ['VERIFICATEUR', 'CHEF_CENTRE', 'GUICHETIER']

function canVerify(user) {
	return ROLES_VERIF.includes(user?.role)
}

function getIdContribuable(req) {
	return req.user?.id_contribuable || req.user?.id || null
}

async function notifyDossier(id_contribuable, type, contenu) {
	const notif = await NotificationModel.create(pool, {
		type_notification: type,
		contenu,
		canal: 'PORTAIL',
		id_contribuable,
		statut_envoi: 'ENVOYE'
	})
	try {
		getIO().to(`contribuable:${id_contribuable}`).emit('notification:new', {
			id_notification: notif.id_notification,
			type_notification: type,
			contenu
		})
	} catch {}
	return notif
}

function emitDossierUpdated(dossier) {
	if (!dossier) return
		
		try {
			const io = getIO()
			
			// Tous les agents
			io.to('room:agents').emit('dossier:updated', {
				id_dossier: dossier.id_dossier,
				id_contribuable: dossier.id_contribuable,
				id_service: dossier.id_service,
				id_rdv: dossier.id_rdv,
				reference_dossier: dossier.reference_dossier,
				statut_dossier: dossier.statut_dossier
			})
			
			// Le contribuable concerné uniquement
			io.to(`contribuable:${dossier.id_contribuable}`)
			.emit('dossier:updated', {
				id_dossier: dossier.id_dossier,
		 id_contribuable: dossier.id_contribuable,
		 id_service: dossier.id_service,
		 id_rdv: dossier.id_rdv,
		 reference_dossier: dossier.reference_dossier,
		 statut_dossier: dossier.statut_dossier
			})
			
			console.log(
				`📡 dossier:updated → ${dossier.reference_dossier} → ${dossier.statut_dossier}`
			)
		} catch (error) {
			console.error(
				'⚠️ Erreur émission temps réel dossier :',
				 error.message
			)
		}
}

export const DossierController = {
	async mesDossiers(req, res) {
		try {
			const id_contribuable = getIdContribuable(req)
			
			if (!id_contribuable) {
				return res.status(401).json({
					success: false,
					message: 'Utilisateur non authentifié.'
				})
			}
			
			const dossiers = await DossierFiscalModel.findByContribuable(
				id_contribuable
			)
			
			return res.json({
				success: true,
				data: dossiers
			})
		} catch (e) {
			console.error('❌ Erreur mes dossiers :', e)
			
			return res.status(500).json({
				success: false,
				message: 'Erreur lors du chargement des dossiers.'
			})
		}
	},
	
	//==========================================================
	//                 Pour les contribuables
	//==========================================================
	
	async getById(req, res) {
		try {
			const id_contribuable = getIdContribuable(req)
			
			if (!id_contribuable) {
				return res.status(401).json({
					success: false,
					message: 'Utilisateur non authentifié.'
				})
			}
			
			const d = await DossierFiscalModel.findById(req.params.id)
			
			if (!d) {
				return res.status(404).json({
					success: false,
					message: 'Dossier introuvable.'
				})
			}
			
			if (Number(d.id_contribuable) !== Number(id_contribuable)) {
				return res.status(403).json({
					success: false,
					message: 'Accès interdit à ce dossier.'
				})
			}
			
			const pieces = await PieceJustificativeModel.findByDossier(
				d.id_dossier
			)
			
			const requis = await DossierFiscalModel.typesRequis(
				d.id_service
			)
			
			return res.json({
				success: true,
				data: {
					...d,
					pieces,
					requis
				}
			})
		} catch (e) {
			console.error('❌ Erreur récupération dossier :', e)
			
			return res.status(500).json({
				success: false,
				message: 'Erreur lors de la récupération du dossier.'
			})
		}
	},
	
	//====================================================================
	//               Pour les agents
	//====================================================================
	
	async getByIdPourAgent(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Vous n’êtes pas autorisé à consulter ce dossier.'
				})
			}
			
			const d = await DossierFiscalModel.findById(req.params.id)
			
			if (!d) {
				return res.status(404).json({
					success: false,
					message: 'Dossier fiscal introuvable.'
				})
			}
			
			const pieces = await PieceJustificativeModel.findByDossier(
				d.id_dossier
			)
			
			console.log('📦 DOSSIER :', d.id_dossier)
			console.log('📎 PIÈCES TROUVÉES :', pieces)
			
			const requis = await DossierFiscalModel.typesRequis(
				d.id_service
			)
			
			return res.json({
				success: true,
				data: {
					...d,
					pieces,
					requis
				}
			})
			
		} catch (error) {
			console.error(
				'❌ Erreur récupération dossier agent :',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message: error.message || 'Erreur serveur.'
			})
		}
	},
	
	async create(req, res) {
		try {
			const id_contribuable = getIdContribuable(req)
			const { id_service, id_rdv } = req.body
			
			if (!id_contribuable || !id_service) {
				return res.status(400).json({
					success: false,
					message: 'Service fiscal obligatoire.'
				})
			}
			
			const d = await DossierFiscalModel.create({
				id_contribuable,
				id_service,
				id_rdv: id_rdv || null
			})
			
			await JournalAuditModel.log(pool, {
				type_acteur: 'CONTRIBUABLE',
				id_acteur: id_contribuable,
				action: 'CREER_DOSSIER',
				table_cible: 'dossier_fiscal',
				id_cible: d.id_dossier
			})
			
			return res.status(201).json({
				success: true,
				data: d
			})
		} catch (e) {
			console.error('❌ Erreur création dossier :', e)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	//Creation pour agents 
	
	async createPourAgent(req, res) {
		try {
			const id_agent = req.user?.id_agent || req.user?.id
			const {
				id_contribuable,
				id_service,
				id_rdv
			} = req.body
			
			if (!id_agent) {
				return res.status(401).json({
					success: false,
					message: 'Agent non authentifié.'
				})
			}
			
			if (!id_contribuable) {
				return res.status(400).json({
					success: false,
					message: 'Contribuable obligatoire.'
				})
			}
			
			if (!id_service) {
				return res.status(400).json({
					success: false,
					message: 'Service fiscal obligatoire.'
				})
			}
			
			const d = await DossierFiscalModel.create({
				id_contribuable,
				id_service,
				id_rdv: id_rdv || null
			})
			
			await JournalAuditModel.log(pool, {
				type_acteur: 'AGENT',
				id_acteur: id_agent,
				action: 'CREER_DOSSIER',
				table_cible: 'dossier_fiscal',
				id_cible: d.id_dossier,
				details_json: {
					id_contribuable,
					id_service,
					id_rdv: id_rdv || null
				}
			})
			
			// ==================================================
			// TEMPS RÉEL
			// ==================================================
			
			if (d.id_rdv) {
				try {
					const io = getIO()
					
					io
					.to('room:agents')
					.emit('DOSSIER_LIE_RDV', {
						id_rdv: d.id_rdv,
						id_dossier: d.id_dossier,
						id_contribuable: d.id_contribuable,
						id_service: d.id_service
					})
					
				} catch (socketError) {
					console.error(
						'⚠️ Erreur émission Socket.IO création dossier :',
				   socketError.message
					)
				}
			}
			
			return res.status(201).json({
				success: true,
				data: d
			})
			
		} catch (e) {
			console.error(
				'❌ Erreur création dossier agent :',
				 e
			)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async soumettre(req, res) {
		try {
			const id_contribuable = getIdContribuable(req)
			
			if (!id_contribuable) {
				return res.status(401).json({
					success: false,
					message: 'Utilisateur non authentifié.'
				})
			}
			
			const dossier = await DossierFiscalModel.findById(req.params.id)
			
			if (!dossier) {
				return res.status(404).json({
					success: false,
					message: 'Dossier introuvable.'
				})
			}
			
			if (
				Number(dossier.id_contribuable) !==
				Number(id_contribuable)
			) {
				return res.status(403).json({
					success: false,
					message: 'Accès interdit à ce dossier.'
				})
			}
			
			const d = await DossierFiscalModel.transitionner(
				req.params.id,
				'SOUMIS'
			)
			
			emitDossierUpdated(d)
			
			await notifyDossier(
				d.id_contribuable,
				'DOSSIER_SOUMIS',
				`Dossier ${d.reference_dossier} soumis.`
			)
			
			return res.json({
				success: true,
				data: d
			})
		} catch (e) {
			console.error('❌ Erreur soumission dossier :', e)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async visualiserPiece(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Habilitation insuffisante.'
				})
			}
			
			const piece =
			await PieceJustificativeModel.findById(
				req.params.pieceId
			)
			
			if (!piece) {
				return res.status(404).json({
					success: false,
					message: 'Pièce justificative introuvable.'
				})
			}
			
			if (!piece.chemin_stockage) {
				return res.status(404).json({
					success: false,
					message: 'Fichier de la pièce introuvable.'
				})
			}
			
			const fichier = path.resolve(
				piece.chemin_stockage
			)
			
			return res.sendFile(fichier, {
				headers: {
					'Content-Disposition':
					`inline; filename="${piece.nom_fichier}"`
				}
			})
			
		} catch (e) {
			console.error(
				'❌ Erreur visualisation pièce :',
				 e
			)
			
			return res.status(500).json({
				success: false,
				message: 'Impossible de visualiser la pièce.'
			})
		}
	},
	
	async soumettrePourAgent(req, res) {
		try {
			/* Vérifier que l'agent est bien authentifié */
			const id_agent = req.user?.id_agent || req.user?.id
			
			if (!id_agent) {
				return res.status(401).json({
					success: false,
					message: 'Agent non authentifié.'
				})
			}
			
			const dossier = await DossierFiscalModel.findById(req.params.id)
			
			if (!dossier) {
				return res.status(404).json({
					success: false,
					message: 'Dossier introuvable.'
				})
			}
			
			/* ⭐ Utiliser la version AGENT (assouplie) */
			const d = await DossierFiscalModel.transitionnerPourAgent(
				req.params.id,
				'SOUMIS',
				{
					id_agent,
					commentaire: 'Soumission effectuée par l\'agent au guichet.'
				}
			)
			
			emitDossierUpdated(d)
			
			await notifyDossier(
				d.id_contribuable,
				'DOSSIER_SOUMIS',
				`Dossier ${d.reference_dossier} soumis au guichet.`
			)
			
			return res.json({
				success: true,
				data: d
			})
		} catch (e) {
			console.error('❌ Erreur soumission dossier agent :', e)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async aVerifier(_req, res) {
		return res.json({ success: true, data: await DossierFiscalModel.findAVenirPourVerif() })
	},
	
	async commencerVerification(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Habilitation insuffisante.'
				})
			}
			
			const id_agent =
			req.user.id_agent || req.user.id
			
			const d = await DossierFiscalModel.transitionner(
				req.params.id,
				'EN_VERIFICATION',
				{
					id_agent,
					commentaire: 'Vérification du dossier commencée.'
				}
			)
			
			emitDossierUpdated(d)
			
			return res.json({
				success: true,
				data: d
			})
			
		} catch (e) {
			console.error(
				'❌ Erreur début vérification dossier :',
				 e
			)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async decider(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Habilitation insuffisante.'
				})
			}
			
			const { decision, commentaire } = req.body
			
			const allowed = [
				'VALIDE',
				'A_COMPLETER',
				'REJETE'
			]
			
			if (!allowed.includes(decision)) {
				return res.status(400).json({
					success: false,
					message: 'Décision invalide.'
				})
			}
			
			const d = await DossierFiscalModel.transitionner(
				req.params.id,
				decision,
				{
					id_agent: req.user.id_agent || req.user.id,
					commentaire
				}
			)
			
			const { _notification, ...dossier } = d
			
			emitDossierUpdated(dossier)
			
			
			if (_notification) {
				try {
					getIO()
					.to(`contribuable:${dossier.id_contribuable}`)
					.emit('notification:new', {
						id_notification: _notification.id_notification,
						type_notification: _notification.type_notification,
						contenu: _notification.contenu,
						date_creation: _notification.date_creation || new Date().toISOString()
					})
					
					console.log(
						`🔔 Notification temps réel → contribuable:${dossier.id_contribuable} → ${_notification.type_notification}`
					)
				} catch (err) {
					console.error('⚠️ Erreur émission notification :', err.message)
				}
			}
			
			await notifyChef({
				type_notification: `DOSSIER_${decision}`,
				contenu: `Dossier ${dossier.reference_dossier} → ${decision}.`,
				type_acteur: 'AGENT',
				id_acteur: req.user.id,
				nom_acteur: `${req.user.prenom || ''} ${req.user.nom || ''}`.trim() || 'Agent',
							 action: `DECISION_${decision}`,
							 table_cible: 'dossier_fiscal',
							 id_cible: dossier.id_dossier
			})
			
			return res.json({
				success: true,
				data: d
			})
			
		} catch (e) {
			console.error(
				'❌ Erreur décision dossier :',
				 e
			)
			
			return res.status(409).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async uploadPiece(req, res) {
		try {
			const role = req.user?.role
			
			const estContribuable = role === 'CONTRIBUABLE'
			
			const estAgent = [
				'VERIFICATEUR',
				'GUICHETIER',
				'CHEF_CENTRE'
			].includes(role)
			
			if (!estContribuable && !estAgent) {
				return res.status(403).json({
					success: false,
					message: 'Utilisateur non autorisé à déposer une pièce.'
				})
			}
			
			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: 'Fichier manquant.'
				})
			}
			
			const dossier = await DossierFiscalModel.findById(
				req.params.id
			)
			
			if (!dossier) {
				return res.status(404).json({
					success: false,
					message: 'Dossier introuvable.'
				})
			}
			
			// =========================================================
			// CONTRIBUABLE
			// =========================================================
			
			if (estContribuable) {
				const id_contribuable = getIdContribuable(req)
				
				if (!id_contribuable) {
					return res.status(401).json({
						success: false,
						message: 'Contribuable non authentifié.'
					})
				}
				
				if (
					Number(dossier.id_contribuable) !==
					Number(id_contribuable)
				) {
					return res.status(403).json({
						success: false,
						message: 'Accès interdit à ce dossier.'
					})
				}
			}
			
			// =========================================================
			// AGENT
			// =========================================================
			
			if (estAgent) {
				const idAgent = req.user?.id_agent || req.user?.id
				
				if (!idAgent) {
					return res.status(401).json({
						success: false,
						message: 'Agent non authentifié.'
					})
				}
			}
			
			// =========================================================
			// STATUT DU DOSSIER
			// =========================================================
			
			const statutsAutorises = [
				'BROUILLON',
				'A_COMPLETER'
			]
			
			if (!statutsAutorises.includes(dossier.statut_dossier)) {
				return res.status(409).json({
					success: false,
					message:
					`Impossible d'ajouter une pièce lorsque le dossier est "${dossier.statut_dossier}".`
				})
			}
			
			// =========================================================
			// CRÉATION DE LA PIÈCE
			// =========================================================
			
			const piece = await PieceJustificativeModel.create({
				id_dossier: dossier.id_dossier,
				file: req.file,
				id_type_piece: req.body.id_type_piece || null
			})
			
			if (!piece) {
				return res.status(500).json({
					success: false,
					message: 'Échec de l’enregistrement de la pièce.'
				})
			}
			
			return res.status(201).json({
				success: true,
				data: piece
			})
			
		} catch (e) {
			console.error('❌ Erreur upload pièce :', e)
			
			return res.status(400).json({
				success: false,
				message: e.message
			})
		}
	},
	
	async verifierPiece(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({ success: false, message: 'Habilitation insuffisante.' })
			}
			
			const agentId = req.user.id_agent || req.user.id
			
			/* 1. Vérifier la pièce */
			const piece = await PieceJustificativeModel.verifier({
				id_piece: req.params.pieceId,
				id_agent: agentId,
				statut: req.body.statut_verification,
				commentaire: req.body.commentaire_verification
			})
			
			/* 2. Récupérer le dossier */
			const dossier = await DossierFiscalModel.findById(piece.id_dossier)
			
			if (dossier) {
				let dossierCourant = dossier
				
				
				if (dossier.statut_dossier === 'SOUMIS') {
					try {
						dossierCourant = await DossierFiscalModel.transitionner(
							dossier.id_dossier,
							'EN_VERIFICATION',
							{
								id_agent: agentId,
								commentaire: 'Vérification démarrée automatiquement lors du contrôle d’une pièce.'
							}
						)
						emitDossierUpdated(dossierCourant)
					} catch (err) {
						console.error('⚠️ Impossible de démarrer la vérification :', err.message)
					}
				}
				
				if (piece.statut_verification === 'NON_CONFORME'
					&& dossierCourant.statut_dossier === 'EN_VERIFICATION') {
					try {
						const dossierUpdated = await DossierFiscalModel.transitionner(
							dossierCourant.id_dossier,
							'A_COMPLETER',
							{
								id_agent: agentId,
								commentaire: piece.commentaire_verification
							}
						)
						
						emitDossierUpdated(dossierUpdated)
						
						await notifyDossier(
							dossierUpdated.id_contribuable,
						  'PIECE_A_COMPLETER',
						  `Pièce non conforme sur ${dossierUpdated.reference_dossier}. Merci de la remplacer.`
						)
					} catch (error) {
						console.error('❌ Erreur transition A_COMPLETER :', error.message)
					}
					}
			}
			
			return res.json({ success: true, data: piece })
		} catch (e) {
			console.error('❌ ERREUR verifierPiece')
			console.error('MESSAGE :', e.message)
			console.error('STACK :', e.stack)
			
			return res.status(400).json({ success: false, message: e.message })
		}
	},
	
	/* ============================================================
	 * DOSSIERS SANS RDV
	 * ============================================================ */
	async dossiersSansRdv(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Habilitation insuffisante.'
				})
			}
			
			const recherche = req.query.q || ''
			const dossiers = await DossierFiscalModel.findSansRdv({ recherche })
			
			return res.json({
				success: true,
				data: dossiers
			})
		} catch (error) {
			console.error('❌ Erreur dossiers sans RDV :', error)
			return res.status(500).json({
				success: false,
				message: error.message
			})
		}
	},
	
	async marquerPresentSansRdv(req, res) {
		try {
			if (!canVerify(req.user)) {
				return res.status(403).json({
					success: false,
					message: 'Habilitation insuffisante.'
				})
			}
			
			const id_agent = req.user.id_agent || req.user.id
			const id_guichet = req.body.id_guichet || null
			const id_dossier = req.params.id
			
			const result = await DossierFiscalModel.marquerPresentSansRdv(
				id_dossier,
				{ id_agent, id_guichet }
			)
			
			/* Temps réel */
			try {
				const io = getIO()
				io.to('room:agents').emit('file:refresh')
				io.to('room:public').emit('file:refresh')
				io.to('room:agents').emit('ticket:new', {
					id_ticket: result.ticket.id_ticket,
					numero_ticket: result.ticket.numero_ticket
				})
			} catch {}
			
			return res.json({
				success: true,
				data: result
			})
		} catch (error) {
			console.error('❌ Erreur marquer présent sans RDV :', error)
			return res.status(400).json({
				success: false,
				message: error.message
			})
		}
	},
}
