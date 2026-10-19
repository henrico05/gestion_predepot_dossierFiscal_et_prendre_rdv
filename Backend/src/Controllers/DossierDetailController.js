import { CommentaireModel }   from '../Models/CommentaireModel.js'
import { AuditModel }         from '../Models/AuditModel.js'
import { TraitementModel }    from '../Models/TraitementModel.js'
import { HistoriqueModel }    from '../Models/HistoriqueModel.js'
import { JournalAuditModel }  from '../Models/journalAuditModel.js'
import { NotificationModel }  from '../Models/NotificationModel.js'
import { getIO } from '../Socket/socket.js'
import pool from '../DataBases/db.js'

const ROLES_AUDIT = ['CHEF_CENTRE', 'ADMINISTRATEUR']

export const DossierDetailController = {
	
	/* ============================================================
	 * HISTORIQUE
	 * ============================================================ */
	async getHistorique(req, res) {
		try {
			const { id } = req.params
			const isContribuable = req.user?.role === 'CONTRIBUABLE'
			const id_contribuable = req.user?.id_contribuable || req.user?.id
			
			/* Vérifier l'accès */
			if (isContribuable) {
				const dossier = await pool.query(
					'SELECT id_contribuable FROM dossier_fiscal WHERE id_dossier = $1',
					[id]
				)
				
				if (!dossier.rows[0]) {
					return res.status(404).json({
						success: false,
						message: 'Dossier introuvable.'
					})
				}
				
				if (Number(dossier.rows[0].id_contribuable) !== Number(id_contribuable)) {
					return res.status(403).json({
						success: false,
						message: 'Accès interdit.'
					})
				}
			}
			
			let events = await HistoriqueModel.findByDossier(id)
			
			/* ⭐ Filtrer pour le contribuable */
			if (isContribuable) {
				events = events.filter(event => {
					/* Le contribuable ne voit PAS : */
					/* - Les commentaires internes */
					if (event.event_type === 'COMMENTAIRE' && event.interne === true) {
						return false
					}
					
					/* Autoriser tout le reste */
					return true
				})
			}
			
			const grouped = HistoriqueModel.groupByDay(events)
			
			return res.json({
				success: true,
				data: { events, grouped }
			})
		} catch (error) {
			console.error('❌ getHistorique :', error)
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	/* ============================================================
	 * TRAITEMENTS
	 * ============================================================ */
	async getTraitements(req, res) {
		try {
			const { id } = req.params
			const { decision } = req.query
			const isContribuable = req.user?.role === 'CONTRIBUABLE'
			const id_contribuable = req.user?.id_contribuable || req.user?.id
			
			/* Vérifier l'accès */
			if (isContribuable) {
				const dossier = await pool.query(
					'SELECT id_contribuable FROM dossier_fiscal WHERE id_dossier = $1',
					[id]
				)
				
				if (!dossier.rows[0]) {
					return res.status(404).json({
						success: false,
						message: 'Dossier introuvable.'
					})
				}
				
				if (Number(dossier.rows[0].id_contribuable) !== Number(id_contribuable)) {
					return res.status(403).json({
						success: false,
						message: 'Accès interdit.'
					})
				}
			}
			
			let traitements = await TraitementModel.findByDossier(id)
			
			/* ⭐ Filtrer pour le contribuable */
			if (isContribuable) {
				/* Le contribuable voit seulement les décisions finales */
				traitements = traitements.filter(t => 
				['VALIDE', 'REJETE', 'A_COMPLETER'].includes(t.decision)
				)
			}
			
			/* Appliquer le filtre décision */
			if (decision && decision !== 'TOUS') {
				traitements = traitements.filter(t => t.decision === decision)
			}
			
			return res.json({ success: true, data: traitements })
		} catch (error) {
			console.error('❌ getTraitements :', error)
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	/* ============================================================
	 * EXPORT TRAITEMENTS CSV
	 * ============================================================ */
	async exportTraitements(req, res) {
		try {
			const { id } = req.params
			const traitements = await TraitementModel.findByDossier(id)
			
			const header = 'Date,Heure,Décision,Agent,Matricule,Commentaire\n'
			
			const rows = traitements.map(t => {
				const d = new Date(t.date_traitement)
				const date  = d.toLocaleDateString('fr-FR')
				const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
				
				const comment = (t.commentaire_agent || '').replace(/"/g, '""')
				const agent   = (t.agent || '').replace(/"/g, '""')
				
				return `"${date}","${heure}","${t.decision}","${agent}","${t.agent_matricule || ''}","${comment}"`
			}).join('\n')
			
			const csv = header + rows
			
			res.setHeader('Content-Type', 'text/csv; charset=utf-8')
			res.setHeader(
				'Content-Disposition',
				 `attachment; filename="traitements-dossier-${id}.csv"`
			)
			
			return res.send('\uFEFF' + csv)
		} catch (error) {
			console.error('❌ exportTraitements :', error)
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	/* ============================================================
	 * COMMENTAIRES
	 * ============================================================ */
	async getCommentaires(req, res) {
		try {
			const { id } = req.params
			const isContribuable = req.user?.role === 'CONTRIBUABLE'
			const id_contribuable = req.user?.id_contribuable || req.user?.id
			
			/* Vérifier l'accès : le contribuable ne peut voir que ses dossiers */
			if (isContribuable) {
				const dossier = await pool.query(
					'SELECT id_contribuable FROM dossier_fiscal WHERE id_dossier = $1',
					[id]
				)
				
				if (!dossier.rows[0]) {
					return res.status(404).json({
						success: false,
						message: 'Dossier introuvable.'
					})
				}
				
				if (Number(dossier.rows[0].id_contribuable) !== Number(id_contribuable)) {
					return res.status(403).json({
						success: false,
						message: 'Accès interdit.'
					})
				}
			}
			
			let commentaires = await CommentaireModel.findByDossier(id)
			
			/* ⭐ Filtrer pour le contribuable : seulement les non internes */
			if (isContribuable) {
				commentaires = commentaires.filter(c => !c.interne)
			}
			
			return res.json({ success: true, data: commentaires })
		} catch (error) {
			console.error('❌ getCommentaires :', error)
			return res.status(500).json({ success: false, message: error.message })
		}
	},
	
	async createCommentaire(req, res) {
		try {
			const { id } = req.params
			const { contenu, interne = true } = req.body
			
			const user = req.user
			const isAgent = user?.role !== 'CONTRIBUABLE'
			
			const id_agent        = isAgent ? (user.id_agent || user.id) : null
			const id_contribuable = isAgent ? null : (user.id_contribuable || user.id)
			
			if (!contenu?.trim()) {
				return res.status(400).json({
					success: false,
					message: 'Le contenu est obligatoire.'
				})
			}
			
			const created = await CommentaireModel.create({
				id_dossier: id,
				id_agent,
				id_contribuable,
				contenu,
				interne: isAgent ? interne : false
			})
			
			/* Recharger pour enrichissement */
			const all = await CommentaireModel.findByDossier(id)
			const enriched = all.find(c => c.id_commentaire === created.id_commentaire)
			
			/* Journal audit */
			try {
				await JournalAuditModel.log(pool, {
					type_acteur: isAgent ? 'AGENT' : 'CONTRIBUABLE',
					id_acteur: isAgent ? id_agent : id_contribuable,
					action: 'COMMENTAIRE_AJOUTE',
					table_cible: 'commentaire',
					id_cible: created.id_commentaire,
					details_json: JSON.stringify({
						id_dossier: id,
						interne: created.interne
					})
				})
			} catch (err) {
				console.error('⚠️ Erreur log audit :', err.message)
			}
			
			/* Temps réel */
			try {
				const io = getIO()
				io.to(`dossier:${id}`).emit('commentaire:new', enriched)
				io.to('room:agents').emit('commentaire:new', {
					id_dossier: id,
					commentaire: enriched
				})
			} catch (err) {
				console.error('⚠️ Erreur émission :', err.message)
			}
			
			/* Notifier le contribuable si non interne */
			if (isAgent && !interne) {
				const dossierRow = await pool.query(
					'SELECT id_contribuable FROM dossier_fiscal WHERE id_dossier = $1',
					[id]
				)
				
				const idc = dossierRow.rows[0]?.id_contribuable
				if (idc) {
					await NotificationModel.create(pool, {
						type_notification: 'COMMENTAIRE_AGENT',
						contenu: 'Nouveau commentaire de l\'agent sur votre dossier.',
						canal: 'PORTAIL',
						id_contribuable: idc,
						statut_envoi: 'ENVOYE'
					})
				}
			}
			
			return res.status(201).json({ success: true, data: enriched })
		} catch (error) {
			console.error('❌ createCommentaire :', error)
			return res.status(400).json({ success: false, message: error.message })
		}
	},
	
	async updateCommentaire(req, res) {
		try {
			const { commentaireId } = req.params
			const { contenu } = req.body
			const id_agent = req.user?.id_agent || req.user?.id
			
			if (!contenu?.trim()) {
				return res.status(400).json({
					success: false,
					message: 'Le contenu est obligatoire.'
				})
			}
			
			const updated = await CommentaireModel.update(commentaireId, {
				id_agent,
				contenu
			})
			
			return res.json({ success: true, data: updated })
		} catch (error) {
			console.error('❌ updateCommentaire :', error)
			return res.status(400).json({ success: false, message: error.message })
		}
	},
	
	async deleteCommentaire(req, res) {
		try {
			const { commentaireId } = req.params
			const id_agent = req.user?.id_agent || req.user?.id
			
			await CommentaireModel.remove(commentaireId, id_agent)
			
			return res.status(204).send()
		} catch (error) {
			console.error('❌ deleteCommentaire :', error)
			return res.status(400).json({ success: false, message: error.message })
		}
	},
	
	/* ============================================================
	 * AUDIT — CHEF_CENTRE uniquement
	 * ============================================================ */
	async getAudit(req, res) {
		try {
			if (!ROLES_AUDIT.includes(req.user?.role)) {
				return res.status(403).json({
					success: false,
					message: 'Accès réservé au chef de centre.'
				})
			}
			
			const { id } = req.params
			const audit = await AuditModel.findByDossier(id)
			
			return res.json({ success: true, data: audit })
		} catch (error) {
			console.error('❌ getAudit :', error)
			return res.status(500).json({ success: false, message: error.message })
		}
	}
}
