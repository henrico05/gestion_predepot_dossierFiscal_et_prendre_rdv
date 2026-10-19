import bcrypt from 'bcryptjs'
import { AgentModel } from '../Models/RegisterAgent.js'
import { generateEmailToken, generateJWT } from '../utils/token.js'
import {checkMailConnection, sendVerificationEmail } from '../Services/emailService.js'
import { notifyChef } from '../Services/notifyChef.js'

export const register = async (req, res) => {
	try {
		const {
			nom, prenom, matricule, email, password,
			role, id_guichet, imageBase64, imageContentType
		} = req.body
		
		// Validations de base
		if (!nom || !prenom || !matricule || !email || !password || !role) {
			return res.status(400).json({ message: 'Tous les champs obligatoires sont requis' })
		}
		
		if (password.length < 8) {
			return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' })
		}
		
		const allowedRoles = ['GUICHETIER', 'VERIFICATEUR']
		if (!allowedRoles.includes(role)) {
			return res.status(400).json({ message: 'Rôle invalide' })
		}
		
		if (role === 'CHEF_CENTRE') {
			return res.status(403).json({
				message: 'Le rôle Chef de service ne peut pas être créé via l’inscription'
			})
		
		// Unicité
		const existingEmail = await AgentModel.findByEmail(email)
		if (existingEmail) {
			return res.status(409).json({ message: 'Cet email est déjà utilisé' })
		}
		}
		
		const existingMatricule = await AgentModel.findByMatricule(matricule)
		if (existingMatricule) {
			return res.status(409).json({ message: 'Ce matricule est déjà utilisé' })
		}
		
		// Hash du mot de passe
		const password_hash = await bcrypt.hash(password, 12)
		
		// Token de validation email (24h)
		const email_token = generateEmailToken()
		const email_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
		
		const mailAvailable = await checkMailConnection()
		
		if (!mailAvailable) {
			return res.status(503).json({
				message: 'Le service email est actuellement indisponible. Inscription impossible, veuillez réessayer plus tard.'
			})
		}
		
		const agent = await AgentModel.create({
			nom,
			prenom,
			matricule,
			email,
			password_hash,
			role,
			id_guichet,
			photo_base64: imageBase64,
			photo_content_type: imageContentType,
			email_token,
			email_token_expires
		})
		
		// Envoi de l’email
		await sendVerificationEmail({
			to: email,
			nom,
			prenom,
			token: email_token,
			accountType: 'AGENT'
		})
		
		await notifyChef({
			type_notification: 'COMPTE_AGENT',
			contenu: `Nouvel agent ${prenom} ${nom} (${role}) en attente de validation.`,
						 type_acteur: 'AGENT',
						 id_acteur: agent.id,
						 nom_acteur: `${prenom} ${nom}`,
						 action: 'INSCRIPTION',
						 table_cible: 'agents',
						 id_cible: agent.id
		})
		
		return res.status(201).json({
			message: 'Compte créé. Veuillez vérifier votre email pour continuer.',
			agent: {
				id: agent.id,
				nom: agent.nom,
				prenom: agent.prenom,
				matricule: agent.matricule,
				email: agent.email,
				role: agent.role,
				admin_status: agent.admin_status
			}
		})
		
	} catch (error) {
		console.error('Register error:', error)
		return res.status(500).json({ message: 'Erreur lors de la création du compte' })
	}
}

export const updateAgent = async (req, res) => {
	try {
		const { id } = req.params
		
		const target = await AgentModel.findById(id)
		if (!target) {
			return res.status(404).json({ message: 'Agent introuvable' })
		}
		
		if (target.role === 'CHEF_CENTRE') {
			return res.status(403).json({ message: 'Le chef de centre ne peut pas être modifié ici.' })
		}
		
		/* Filtrer les champs autorisés */
		const allowed = ['nom', 'prenom', 'matricule', 'email', 'role', 'is_active']
		const payload = {}
		for (const k of allowed) {
			if (req.body[k] !== undefined) payload[k] = req.body[k]
		}
		
		const updated = await AgentModel.update(id, payload)
		
		return res.json({
			success: true,
			message: 'Agent mis à jour avec succès.',
			agent: updated
		})
	} catch (error) {
		console.error('❌ updateAgent :', error)
		return res.status(500).json({ message: 'Erreur lors de la mise à jour.' })
	}
}

export const verifyEmail = async (req, res) => {
	try {
		const { token } = req.params
		
		const agent = await AgentModel.findByEmailToken(token)
		if (!agent) {
			return res.status(400).json({
				message: 'Lien invalide ou expiré'
			})
		}
		
		if (agent.email_verified) {
			return res.status(400).json({ message: 'Email déjà vérifié' })
		}
		
		const updated = await AgentModel.markEmailVerified(agent.id)
		
		return res.json({
			message: 'Email validé avec succès. Votre compte est en attente de validation par un administrateur.',
			email_verified: updated.email_verified,
			admin_status: updated.admin_status
		})
	} catch (error) {
		console.error('Verify email error:', error)
		return res.status(500).json({ message: 'Erreur lors de la validation de l’email' })
	}
}

export const resendVerification =  async(req, res) => {
	
	try {
		
		const { token } = req.body
		
		if (!token) {
			return res.status(400).json({
				success: false,
				message: 'Token de vérification manquant.'
			})
		}
		
		const agent =
		await AgentModel.regenerateEmailToken(token)
		
		if (!agent) {
			return res.status(404).json({
				success: false,
				message: 'Lien de vérification invalide.'
			})
		}
		
		if (agent.alreadyVerified) {
			return res.status(400).json({
				success: false,
				message: 'Cette adresse email est déjà vérifiée.'
			})
		}
		
		await sendVerificationEmail({
			to: agent.email,
			nom: agent.nom_raison_sociale,
			prenom: agent.prenom,
			token: agent.email_token,
			accountType: 'AGENT'
		})
		
		return res.status(200).json({
			success: true,
			message:
			'Un nouveau lien de vérification a été envoyé à votre adresse email.'
		})
		
	} catch (error) {
		
		console.error(
			'Erreur renvoi email contribuable :',
			error
		)
		
		return res.status(500).json({
			success: false,
			message:
			"Impossible d'envoyer un nouveau lien de vérification."
		})
	}
}

export const login = async (req, res) => {
	try {
		const { matricule, password } = req.body
		
		if (!matricule || !password) {
			return res.status(400).json({ message: 'Matricule et mot de passe requis' })
		}
		
		const agent = await AgentModel.findByMatricule(matricule)
		if (!agent) {
			return res.status(401).json({ message: 'Matricule ou mot de passe incorrect' })
		}
		
		const validPassword = await bcrypt.compare(password, agent.password_hash)
		if (!validPassword) {
			return res.status(401).json({ message: 'Matricule ou mot de passe incorrect' })
		}
				
		// Super-admin : pas de file d’attente
		if (agent.role !== 'CHEF_CENTRE') {
			if (!agent.email_verified) {
				return res.status(403).json({ message: 'Veuillez d’abord confirmer votre adresse email' })
			}
			if (agent.admin_status === 'pending') {
				return res.status(403).json({ message: 'Votre compte est en attente de validation par un administrateur' })
			}
			if (agent.admin_status === 'rejected') {
				return res.status(403).json({
					message: 'Votre compte a été refusé. Contactez l’administration.',
					reason: agent.admin_comment
				})
			}
		}
		
		if (!agent.is_active) {
			return res.status(403).json({ message: 'Compte désactivé' })
		}
		
		// Vérifications de statut
		if (!agent.email_verified) {
			return res.status(403).json({
				message: 'Veuillez d’abord confirmer votre adresse email'
			})
		}
		
		if (agent.admin_status === 'pending') {
			return res.status(403).json({
				message: 'Votre compte est en attente de validation par un administrateur'
			})
		}
		
		if (agent.admin_status === 'rejected') {
			return res.status(403).json({
				message: 'Votre compte a été refusé. Contactez l’administration.',
				reason: agent.admin_comment
			})
		}
		
		if (!agent.is_active) {
			return res.status(403).json({ message: 'Compte désactivé' })
		}
		
		  await AgentModel.updateLastLogin(agent.id)
		
		// Génération du JWT
		const token = generateJWT({
			id: agent.id,
			matricule: agent.matricule,
			role: agent.role
		})
		
		//await AgentModel.setOnline(agent.id)
		
		return res.json({
			message: 'Connexion réussie',
			token,
			agent: {
				id: agent.id,
				nom: agent.nom,
				prenom: agent.prenom,
				matricule: agent.matricule,
				email: agent.email,
				role: agent.role,
				guichet: agent.id_guichet,
				photo: agent.photo_base64
			}
		})
	} catch (error) {
		console.error('Login error:', error)
		return res.status(500).json({ message: 'Erreur de connexion' })
	}
}

// ========== ADMIN ==========
export const getPendingAgents = async (req, res) => {
	try {
		const agents = await AgentModel.findPending()
		return res.json(agents)
	} catch (error) {
		console.log('error: ',error)
		return res.status(500).json({ message: 'Erreur serveur' })
	}
}

export const getPendingApproved = async(req,res) => {
	try {
		const agents = await AgentModel.findApproved()
		return res.json(agents)
	} catch(error) {
		console.log('error: ',error)
		return res.status(500).json({ message: 'Erreur serveur' })
	}
}

export const getChefCentres = async (req, res) => {
	try {
		const chef = await AgentModel.getChefCentre()
		
		if (!chef) {
			return res.status(404).json({
				success: false,
				message: 'Chef de centre introuvable.'
			})
		}
		
		return res.status(200).json({
			success: true,
			data: chef
		})
		
	} catch (err) {
		console.error('Erreur récupération profil chef :', err)
		
		return res.status(500).json({
			success: false,
			message: 'Erreur serveur pendant la récupération des données du chef de centre.'
		})
	}
}

export const reviewAgent = async (req, res) => {
	
	try {
		
		const { id } = req.params
		const { status, comment } = req.body
		const adminId = req.user.id
		
		if (req.user.role !== 'CHEF_CENTRE') {
			return res.status(403).json({ message: 'Seul le Chef de service peut valider un compte' })
		}
		
		if (!['approved', 'rejected'].includes(status)) {
			return res.status(400).json({ message: 'Statut invalide' })
		}
		
		const target = await AgentModel.findById(id)
		if (!target) {
			return res.status(404).json({ message: 'Agent introuvable' })
		}
		
		if (target.role === 'CHEF_CENTRE') {
			return res.status(403).json({ message: 'Le Chef de service ne peut pas être modifié ici' })
		}
		
		if (String(target.id) === String(adminId)) {
			return res.status(403).json({ message: 'Auto-validation interdite' })
		}
		
		const updated = await AgentModel.updateAdminStatus(id, status, adminId, comment || null)
		
		return res.json({
			message: status === 'approved' ? 'Compte approuvé avec succès' : 'Compte refusé',
			agent: updated
		})
	} catch (error) {
		console.error('Review error:', error)
		return res.status(500).json({ message: 'Erreur lors de la revue du compte' })
	}
}

export const updateAgentStatus = async (req, res) => {
	try {
		const { id } = req.params
		const { is_active } = req.body
		
		console.log('🔵 UPDATE AGENT')
		console.log('ID reçu:', id)
		console.log('is_active reçu:', is_active)
		console.log('Type:', typeof is_active)
		
		if (typeof is_active !== 'boolean') {
			return res.status(400).json({
				message: 'Le statut is_active doit être un booléen.'
			})
		}
		
		const agent = await AgentModel.findById(id)
		
		if (!agent) {
			return res.status(404).json({
				message: 'Agent introuvable.'
			})
		}
		
		if (agent.role === 'CHEF_CENTRE') {
			return res.status(403).json({
				message: 'Le statut du Chef de centre ne peut pas être modifié ici.'
			})
		}
		
		const updated = await AgentModel.updateActiveStatus(
			id,
			is_active
		)
		console.log('🟢 AGENT APRÈS UPDATE :', updated)
		
		return res.status(200).json({
			success: true,
			message: is_active
			? 'Agent réactivé avec succès.'
			: 'Agent désactivé avec succès.',
			agent: updated
		})
		
	} catch (error) {
		console.error('Erreur updateAgentStatus :', error)
		
		return res.status(500).json({
			success: false,
			message: 'Erreur lors du changement de statut de l’agent.'
		})
	}
}

export const updateChefCentre = async (req, res) =>  {
	try {
		const updatedChef =
		await AgentModel.updateChefCentre(req.body)
		
		if (!updatedChef) {
			return res.status(404).json({
				success: false,
				message: 'Chef de centre introuvable.'
			})
		}
		
		return res.status(200).json({
			success: true,
			message: 'Profil du chef de centre mis à jour avec succès.',
			data: updatedChef
		})
		
	} catch (error) {
		console.error(
			'Erreur updateChefCentre :',
			error
		)
		
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la mise à jour du profil.'
		})
	}
}
