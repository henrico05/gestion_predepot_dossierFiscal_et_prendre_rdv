import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

import ContribuableModel from '../Models/ContribuableModel.js'
import { sendVerificationEmail,checkMailConnection } from '../Services/emailService.js'
import { notifyChef } from '../Services/notifyChef.js'


// =========================================================
// VALIDATION ID CONTRIBUABLE (SERIAL4)
// =========================================================

const isValidContribuableId = (id) => {
	if (id === undefined || id === null || id === '') return false
		/* SERIAL4 : entier positif */
		return /^\d+$/.test(String(id))
}


// =========================================================
// CONTROLLER CONTRIBUABLE
// =========================================================

const ContribuableController = {
	
	// =====================================================
	// GET /api/contribuables
	// =====================================================
	
	async getAllContribuables(req, res) {
		
		try {
			
			const includeInactive =
			req.query.includeInactive === 'true'
			
			const contribuables =
			await ContribuableModel.findAll(includeInactive)
			
			return res.status(200).json({
				success: true,
				data: contribuables
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getAllContribuables:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération des contribuables.'
			})
		}
	},
	
	async getMe(req, res) {
		try {
			const id = req.user.id
			const contribuable = await ContribuableModel.findById(id)
			if (!contribuable) {
				return res.status(404).json({ success: false, message: 'Contribuable introuvable.' })
			}
			return res.json({ success: true, data: contribuable })
		} catch (error) {
			return res.status(500).json({ success: false, message: 'Erreur lors du chargement du profil.' })
		}
	},
	
	async updateMe(req, res) {
		try {
			const id = req.user.id
			const existing = await ContribuableModel.findById(id)
			if (!existing) {
				return res.status(404).json({ success: false, message: 'Contribuable introuvable.' })
			}
			
			const {
				nom_raison_sociale,
				prenom,
				type_contribuable,
				adresse,
				telephone,
				email
			} = req.body
			
			if (email) {
				const other = await ContribuableModel.findByEmail(email.trim().toLowerCase())
				if (other && Number(other.id_contribuable) !== Number(id)) {
					return res.status(409).json({ success: false, message: 'Cette adresse email est déjà utilisée.' })
				}
			}
			
			const updated = await ContribuableModel.update(id, {
				nom_raison_sociale: nom_raison_sociale?.trim(),
														   prenom: prenom?.trim(),
														   type_contribuable,
														   adresse: adresse?.trim(),
														   telephone: telephone?.trim(),
														   email: email?.trim().toLowerCase()
			})
			
			return res.json({
				success: true,
				message: 'Profil mis à jour.',
				data: updated
			})
		} catch (error) {
			if (error.code === '23505') {
				return res.status(409).json({ success: false, message: 'Email déjà utilisé.' })
			}
			return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' })
		}
	},
	
	async changePassword(req, res) {
		try {
			const id = req.user.id
			const { currentPassword, newPassword } = req.body
			
			if (!currentPassword || !newPassword) {
				return res.status(400).json({ success: false, message: 'Ancien et nouveau mot de passe requis.' })
			}
			if (newPassword.length < 8) {
				return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
			}
			
			const row = await ContribuableModel.findById(id)
			if (!row) {
				return res.status(404).json({ success: false, message: 'Contribuable introuvable.' })
			}
			
			const full = await ContribuableModel.findByNif(row.nif)
			const ok = await bcrypt.compare(currentPassword, full.mot_de_passe_hash)
			if (!ok) {
				return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' })
			}
			
			const hash = await bcrypt.hash(newPassword, 12)
			await ContribuableModel.updatePassword(id, hash)
			
			return res.json({ success: true, message: 'Mot de passe modifié.' })
		} catch (error) {
			return res.status(500).json({ success: false, message: 'Erreur lors du changement de mot de passe.' })
		}
	},
	
	//======================================================
	//Recuperation des liste d'entente de validation par CHEF_CENTRE
	//======================================================
	
	async getPendingContribuables (req, res){
		try {
			const contribuable = await ContribuableModel.findPending()
			return res.json(contribuable)
		} catch (error) {
			console.log('error: ',error)
			return res.status(500).json({ message: 'Erreur serveur' })
		}
	},
	
	async getPendingApproved(req,res) {
		try {
			const contribuable  = await ContribuableModel.findApproved()
			return res.json(contribuable)
		} catch(error) {
			console.log('error: ',error)
			return res.status(500).json({ message: 'Erreur serveur' })
		}
	},
	
	//======================================================
	//VALIDATION PAR ADMIN_PENDING
	//======================================================
	
	async reviewContribuable(req, res){
		try {
			const { id } = req.params
			const { status, comment } = req.body
			const adminId = req.user.id
			
			if (req.user.role !== 'CHEF_CENTRE' || req.user.role == 'contribuable') {
				return res.status(403).json({ message: 'Seul le Chef de service peut valider un compte' })
			}
			
			if (![true, false].includes(status)) {
				return res.status(400).json({ message: 'Statut invalide' })
			}
			
			const target = await ContribuableModel.findById(id)
			if (!target) {
				return res.status(404).json({ message: 'contribuable introuvable' })
			}
			
			if (target.role === 'CHEF_CENTRE') {
				return res.status(403).json({ message: 'Le Chef de service ne peut pas être modifié ici' })
			}
			
			if (String(target.id) === String(adminId)) {
				return res.status(403).json({ message: 'Auto-validation interdite' })
			}
			
			const updated = await ContribuableModel.updateAdminStatus(id, status, adminId, comment || null)
			
			return res.json({
				message: status === true ? 'Compte approuvé avec succès' : 'Compte refusé',
				agent: updated
			})
		} catch (error) {
			console.error('❌ REVIEW CONTRIBUABLE ERROR')
			console.error('Message :', error.message)
			console.error('Code :', error.code)
			console.error('Detail :', error.detail)
			console.error('Stack :', error.stack)
			
			return res.status(500).json({
				success: false,
				message: error.message
			})
			// console.error('Review error:', error)
			// return res.status(500).json({ message: 'Erreur lors de la revue du compte' })
		}
	},
	
	
	// =====================================================
	// GET /api/contribuables/:id
	// =====================================================
	
	async getContribuableById(req, res) {
		
		try {
			
			const { id } = req.params
			
			
			// -------------------------------------------------
			// Vérifier UUID
			// -------------------------------------------------
			
			if (!isValidContribuableId(id)) {
				return res.status(400).json({
					success: false,
					message: 'ID contribuable invalide.'
				})
			}
			
			
			// -------------------------------------------------
			// Recherche
			// -------------------------------------------------
			
			const contribuable =
			await ContribuableModel.findById(id)
			
			
			if (!contribuable) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable.'
				})
			}
			
			
			return res.status(200).json({
				success: true,
				data: contribuable
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getContribuableById:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la récupération du contribuable.'
			})
		}
	},
	
	
	// =====================================================
	// GET /api/contribuables/nif/:nif
	// =====================================================
	
	async getByNif(req, res) {
		
		try {
			
			const { nif } = req.params
			
			
			if (!nif || !nif.trim()) {
				
				return res.status(400).json({
					success: false,
					message:
					'Le NIF est obligatoire.'
				})
			}
			
			
			const contribuable =
			await ContribuableModel.findByNif(
				nif.trim()
			)
			
			
			if (!contribuable) {
				
				return res.status(404).json({
					success: false,
					message:
					'Aucun contribuable trouvé avec ce NIF.'
				})
			}
			
			
			return res.status(200).json({
				success: true,
				data: contribuable
			})
			
		} catch (error) {
			
			console.error(
				'Erreur getByNif:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la recherche du contribuable.'
			})
		}
	},
	
	
	// =====================================================
	// POST /api/contribuables/register
	// =====================================================
	
	async registerContribuable(req, res) {
		
		try {
			
			const {
				nif,
				nom_raison_sociale,
				prenom,
				type_contribuable,
				adresse,
				telephone,
				email,
				password
			} = req.body
			
			
			// -------------------------------------------------
			// VALIDATION CHAMPS OBLIGATOIRES
			// -------------------------------------------------
			
			if (
				!nif ||
				!nom_raison_sociale ||
				!prenom ||
				!type_contribuable ||
				!email ||
				!password
			) {
				
				return res.status(400).json({
					success: false,
					message:
					'Veuillez remplir tous les champs obligatoires.'
				})
			}
			
			
			// -------------------------------------------------
			// VALIDATION PASSWORD
			// -------------------------------------------------
			
			if (password.length < 8) {
				
				return res.status(400).json({
					success: false,
					message:
					'Le mot de passe doit contenir au moins 8 caractères.'
				})
			}
			
			
			// -------------------------------------------------
			// NORMALISATION
			// -------------------------------------------------
			
			const normalizedNif =
			nif.trim()
			
			const normalizedEmail =
			email.trim().toLowerCase()
			
			const normalizedNom =
			nom_raison_sociale.trim()
			const normalizedPrenom = prenom.trim()
			
			
			// -------------------------------------------------
			// VERIFIER NIF
			// -------------------------------------------------
			
			const existingNif =
			await ContribuableModel.findByNif(
				normalizedNif
			)
			
			
			if (existingNif) {
				
				return res.status(409).json({
					success: false,
					message:
					'Ce NIF est déjà utilisé.'
				})
			}
			
			
			// -------------------------------------------------
			// VERIFIER EMAIL
			// -------------------------------------------------
			
			const existingEmail =
			await ContribuableModel.findByEmail(
				normalizedEmail
			)
			
			
			if (existingEmail) {
				
				return res.status(409).json({
					success: false,
					message:
					'Cette adresse email est déjà utilisée.'
				})
			}
			
			
			// -------------------------------------------------
			// HASH PASSWORD
			// -------------------------------------------------
			
			const mot_de_passe_hash =
			await bcrypt.hash(password, 12)
			
			
			// -------------------------------------------------
			// TOKEN EMAIL
			// -------------------------------------------------
			
			const emailToken =
			crypto.randomBytes(32).toString('hex')
			
			
			const emailTokenExpires =
			new Date(
				Date.now() + 24 * 60 * 60 * 1000
			)
			const mailAvailable = await checkMailConnection()
			
			if (!mailAvailable) {
				return res.status(503).json({
					message: 'Le service email est actuellement indisponible. Inscription impossible, veuillez réessayer plus tard.'
				})
			}
			
			// -------------------------------------------------
			// CREATION COMPTE
			// -------------------------------------------------
			
			const contribuable =
			await ContribuableModel.create({
				
				nif: normalizedNif,
				
				nom_raison_sociale:
				normalizedNom,
				prenom : normalizedPrenom,
				
				type_contribuable,
				
				adresse:
				adresse?.trim() || null,
										   
										   telephone:
										   telephone?.trim() || null,
										   
										   email:
										   normalizedEmail,
										   
										   mot_de_passe_hash,
										   
										   email_token:
										   emailToken,
										   
										   email_token_expires:
										   emailTokenExpires
										   
										   // Le Model applique automatiquement :
										   //
										   // email_verified = false
										   // admin_activation = 'pending'
										   // is_active = true
			})
			
			
			// -------------------------------------------------
			// ENVOYER EMAIL
			// -------------------------------------------------
			
			await sendVerificationEmail({
				to: normalizedEmail,
				nom: normalizedNom,
				prenom: normalizedPrenom,
				token: emailToken,
				accountType: 'CONTRIBUABLE'
			})
			
			await notifyChef({
				type_notification: 'COMPTE_CONTRIBUABLE',
				contenu: `Nouveau compte contribuable : ${normalizedNom} ${normalizedPrenom} (NIF ${normalizedNif}). En attente de validation.`,
							 type_acteur: 'CONTRIBUABLE',
							 id_acteur: contribuable.id_contribuable,
							 nom_acteur: `${normalizedNom} ${normalizedPrenom}`,
							 action: 'INSCRIPTION',
							 table_cible: 'contribuable',
							 id_cible: contribuable.id_contribuable
			})
			
			// -------------------------------------------------
			// RESPONSE
			// -------------------------------------------------
			
			return res.status(201).json({
				
				success: true,
				
				message:
				'Compte créé. Veuillez vérifier votre adresse email.',
				
				contribuable
			})
			
		} catch (error) {
			
			console.error(
				'Erreur inscription contribuable:',
				 error
			)
			
			
			// NIF ou email unique
			if (error.code === '23505') {
				
				return res.status(409).json({
					success: false,
					message:
					'Le NIF ou l’adresse email est déjà utilisé.'
				})
			}
			
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur serveur lors de l’inscription.'
			})
		}
	},
	
	// =====================================================
	// POST /api/contribuables/create-by-agent
	// Création d'un contribuable directement au guichet
	// =====================================================
	
	async createByAgent(req, res) {
		
		try {
			
			const {
				nif,
				nom_raison_sociale,
				prenom,
				type_contribuable,
				adresse,
				telephone,
				email
			} = req.body
			
			if (
				!nif ||
				!nom_raison_sociale ||
				!prenom ||
				!type_contribuable
			) {
				
				return res.status(400).json({
					success: false,
					message:
					'Veuillez remplir tous les champs obligatoires.'
				})
			}
			
			const normalizedNif =
			nif.trim()
			
			const normalizedNom =
			nom_raison_sociale.trim()
			
			const normalizedPrenom =
			prenom.trim()
			
			const normalizedEmail =
			email?.trim()
			? email.trim().toLowerCase()
			: null
			
			const normalizedAdresse =
			adresse?.trim() || null
			
			const normalizedTelephone =
			telephone?.trim() || null
			
			
			// -------------------------------------------------
			// VERIFIER NIF
			// -------------------------------------------------
			
			const existingNif =
			await ContribuableModel.findByNif(
				normalizedNif
			)
			
			if (existingNif) {
				
				return res.status(409).json({
					success: false,
					code: 'NIF_ALREADY_EXISTS',
					message:
					'Ce NIF est déjà utilisé.'
				})
			}
			
			
			// -------------------------------------------------
			// VERIFIER EMAIL UNIQUEMENT S'IL EST FOURNI
			// -------------------------------------------------
			
			if (normalizedEmail) {
				
				const existingEmail =
				await ContribuableModel.findByEmail(
					normalizedEmail
				)
				
				if (existingEmail) {
					
					return res.status(409).json({
						success: false,
						code: 'EMAIL_ALREADY_EXISTS',
						message:
						'Cette adresse email est déjà utilisée.'
					})
				}
			}
			
			
			// -------------------------------------------------
			// GENERER UN MOT DE PASSE TECHNIQUE
			// -------------------------------------------------
			//
			// Le contribuable n'a pas besoin de le connaître.
			// Il est uniquement nécessaire car la colonne
			// mot_de_passe_hash est utilisée pour le compte.
			//
			
			const temporaryPassword =
			crypto.randomBytes(32).toString('hex')
			
			
			const mot_de_passe_hash =
			await bcrypt.hash(
				temporaryPassword,
				12
			)
			
			
			// -------------------------------------------------
			// CREATION DU COMPTE
			// -------------------------------------------------
			
			const contribuable =
			await ContribuableModel.create({
				
				nif:
				normalizedNif,
				
				nom_raison_sociale:
				normalizedNom,
				
				prenom:
				normalizedPrenom,
				
				type_contribuable,
				
				adresse:
				normalizedAdresse,
				
				telephone:
				normalizedTelephone,
				
				email:
				normalizedEmail,
				
				mot_de_passe_hash,
				
				// -----------------------------------------
				// PAS DE VERIFICATION EMAIL
				// -----------------------------------------
				
				email_token:
				null,
				
				email_token_expires:
				null,
				
				email_verified:
				true,
				
				// -----------------------------------------
				// CREATION PAR AGENT = COMPTE AUTORISE
				// -----------------------------------------
				
				admin_activation:
				true,
				
				is_active:
				true,
				
				role:
				'contribuable'
			})
			
			
			// -------------------------------------------------
			// RESPONSE
			// -------------------------------------------------
			
			return res.status(201).json({
				
				success: true,
				
				message:
				'Contribuable créé avec succès.',
				
				data:
				contribuable
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur création contribuable par agent:',
				 error
			)
			
			
			// -------------------------------------------------
			// NIF / EMAIL UNIQUE
			// -------------------------------------------------
			
			if (error.code === '23505') {
				
				return res.status(409).json({
					
					success: false,
					
					message:
					'Le NIF ou l’adresse email est déjà utilisé.'
				})
			}
			
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur serveur lors de la création du contribuable.'
			})
		}
	},
	
	// =====================================================
	// POST /api/contribuables/login
	// =====================================================
	
	async loginContribuable(req, res) {
		
		try {
			
			const {
				nif,
				password
			} = req.body
			
			
			// -------------------------------------------------
			// VALIDATION
			// -------------------------------------------------
			
			if (!nif || !password) {
				
				return res.status(400).json({
					success: false,
					message:
					'NIF et mot de passe requis.'
				})
			}
			
			
			const normalizedNif =
			nif.trim()
			
			
			// -------------------------------------------------
			// RECHERCHE
			// -------------------------------------------------
			
			const contribuable =
			await ContribuableModel.findByNif(
				normalizedNif
			)
			
			
			if (!contribuable) {
				
				return res.status(401).json({
					success: false,
					message:
					'NIF ou mot de passe incorrect.'
				})
			}
			
			
			// -------------------------------------------------
			// PASSWORD
			// -------------------------------------------------
			
			const validPassword =
			await bcrypt.compare(
				password,
				contribuable.mot_de_passe_hash
			)
			
			
			if (!validPassword) {
				
				return res.status(401).json({
					success: false,
					message:
					'NIF ou mot de passe incorrect.'
				})
			}
			
			
			// -------------------------------------------------
			// EMAIL
			// -------------------------------------------------
			
			if (!contribuable.email_verified) {
				
				return res.status(403).json({
					success: false,
					code: 'EMAIL_NOT_VERIFIED',
					message:
					'Veuillez d’abord confirmer votre adresse email.'
				})
			}
			
			// -------------------------------------------------
			// ACTIVATION ADMINISTRATIVE
			// -------------------------------------------------
			
			if (
				contribuable.admin_activation === false && contribuable.created_At === null && contribuable.email_verified === true
			) {
				
				return res.status(403).json({
					success: false,
					code: 'ADMIN_PENDING',
					message:
					'Votre compte est en attente de validation par l’administration.'
				})
			}
			
			
			if (
				contribuable.admin_activation === false && contribuable.created_At != null && contribuable.email_verified === true
			) {
				
				return res.status(403).json({
					success: false,
					code: 'ADMIN_REJECTED',
					message:
					'Votre compte a été refusé par l’administration.'
				})
			}
			
			
			if (contribuable.admin_activation !== true && contribuable.email_verified === true ) {
				
				return res.status(403).json({
					success: false,
					code: 'ACCOUNT_NOT_APPROVED',
					message:
					'Votre compte n’est pas encore autorisé.'
				})
			}
			
			
			// -------------------------------------------------
			// COMPTE ACTIF
			// -------------------------------------------------
			
			if (!contribuable.is_active) {
				
				return res.status(403).json({
					success: false,
					code: 'ACCOUNT_DISABLED',
					message:
					'Votre compte est désactivé.'
				})
			}
			
			
			// -------------------------------------------------
			// LAST LOGIN
			// -------------------------------------------------
			
			await ContribuableModel.updateLastLogin(
				contribuable.id_contribuable
			)
			
			
			// -------------------------------------------------
			// JWT
			// -------------------------------------------------
			
			const token =
			jwt.sign(
				{
					id:
					contribuable.id_contribuable,
					
					nif:
					contribuable.nif,
					
					type:
					'CONTRIBUABLE',
					role : contribuable.role.toUpperCase()
				},
			
			process.env.JWT_SECRET,
			
			{
				expiresIn: '8h'
			}
			)
			
			
			// -------------------------------------------------
			// RESPONSE
			// -------------------------------------------------
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Connexion réussie.',
				
				token,
				
				contribuable: {
					
					id:
					contribuable.id_contribuable,
					
					nif:
					contribuable.nif,
					
					nom_raison_sociale:
					contribuable.nom_raison_sociale,
					
					type_contribuable:
					contribuable.type_contribuable,
					
					adresse:
					contribuable.adresse,
					
					telephone:
					contribuable.telephone,
					
					email:
					contribuable.email,
					
					email_verified:
					contribuable.email_verified,
					
					admin_activation:
					contribuable.admin_activation,
					
					is_active:
					contribuable.is_active
				}
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur login contribuable:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur de connexion.'
			})
		}
	},
	
	async resendVerification (req, res) {
		
		try {
			
			const { token } = req.body
			
			if (!token) {
				return res.status(400).json({
					success: false,
					message: 'Token de vérification manquant.'
				})
			}
			
			const contribuable =
			await ContribuableModel.regenerateEmailToken(token)
			
			if (!contribuable) {
				return res.status(404).json({
					success: false,
					message: 'Lien de vérification invalide.'
				})
			}
			
			if (contribuable.alreadyVerified) {
				return res.status(400).json({
					success: false,
					message: 'Cette adresse email est déjà vérifiée.'
				})
			}
			
			await sendVerificationEmail({
				to: contribuable.email,
				nom: contribuable.nom_raison_sociale,
				prenom: contribuable.prenom,
				token: contribuable.email_token,
				accountType: 'CONTRIBUABLE'
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
	},
	
	// =====================================================
	// GET /api/contribuables/verify-email/:token
	// =====================================================
	
	async verifyContribuableEmail(req, res) {
		
		try {
			
			const { token } =
			req.params
			
			
			if (!token) {
				
				return res.status(400).json({
					success: false,
					message:
					'Token de vérification manquant.'
				})
			}
			
			
			const contribuable =
			await ContribuableModel.verifyEmail(
				token
			)
			
			
			if (!contribuable) {
				
				return res.status(400).json({
					success: false,
					message:
					'Lien de vérification invalide ou expiré.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Adresse email vérifiée avec succès.',
				
				contribuable
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur vérification email contribuable:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur serveur.'
			})
		}
	},
	
	
	// =====================================================
	// PATCH /api/contribuables/:id
	// =====================================================
	
	async updateContribuable(req, res) {
		
		try {
			
			const { id } =
			req.params
			
			
			// -------------------------------------------------
			// UUID
			// -------------------------------------------------
			
			if (!isValidContribuableId(id)) {
				
				return res.status(400).json({
					success: false,
					message:
					'ID contribuable invalide.'
				})
			}
			
			
			// -------------------------------------------------
			// VERIFIER EXISTENCE
			// -------------------------------------------------
			
			const existing =
			await ContribuableModel.findById(id)
			
			
			if (!existing) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable.'
				})
			}
			
			
			const {
				nif,
				nom_raison_sociale,
				type_contribuable,
				adresse,
				telephone,
				email
			} = req.body
			
			
			// -------------------------------------------------
			// VERIFIER NIF
			// -------------------------------------------------
			
			if (nif) {
				
				const normalizedNif =
				nif.trim()
				
				const existingNif =
				await ContribuableModel.findByNif(
					normalizedNif
				)
				
				
				if (
					existingNif &&
					Number(existingNif.id_contribuable) !== Number(id)
				) {
					
					return res.status(409).json({
						success: false,
						message:
						'Ce NIF est déjà utilisé.'
					})
				}
			}
			
			
			// -------------------------------------------------
			// VERIFIER EMAIL
			// -------------------------------------------------
			
			if (email) {
				
				const normalizedEmail =
				email.trim().toLowerCase()
				
				const existingEmail =
				await ContribuableModel.findByEmail(
					normalizedEmail
				)
				
				
				if (
					existingEmail &&
					Number(existingEmail.id_contribuable) !== Number(id)
				) {
					
					return res.status(409).json({
						success: false,
						message:
						'Cette adresse email est déjà utilisée.'
					})
				}
			}
			
			
			// -------------------------------------------------
			// DONNEES NORMALISEES
			// -------------------------------------------------
			
			const data = {
				
				nif:
				nif?.trim(),
				
				nom_raison_sociale:
				nom_raison_sociale?.trim(),
				
				type_contribuable,
				
				adresse:
				adresse?.trim(),
				
				telephone:
				telephone?.trim(),
				
				email:
				email?.trim().toLowerCase()
			}
			
			
			// -------------------------------------------------
			// UPDATE
			// -------------------------------------------------
			
			const updated =
			await ContribuableModel.update(
				id,
				data
			)
			
			
			if (!updated) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Contribuable mis à jour avec succès.',
				
				data: updated
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur updateContribuable:',
				 error
			)
			
			
			if (error.code === '23505') {
				
				return res.status(409).json({
					success: false,
					message:
					'Le NIF ou l’adresse email est déjà utilisé.'
				})
			}
			
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la mise à jour du contribuable.'
			})
		}
	},
	
	
	// =====================================================
	// PATCH /api/contribuables/:id/deactivate
	// =====================================================
	
	async deactivateContribuable(req, res) {
		
		try {
			
			const { id } =
			req.params
			
			
			if (!isValidContribuableId(id)) {
				
				return res.status(400).json({
					success: false,
					message:
					'ID contribuable invalide.'
				})
			}
			
			
			const contribuable =
			await ContribuableModel.updateActiveStatus(
				id,
				false
			)
			
			
			if (!contribuable) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Contribuable désactivé avec succès.',
				
				data: contribuable
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur deactivateContribuable:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de la désactivation.'
			})
		}
	},
	
	
	// =====================================================
	// PATCH /api/contribuables/:id/activate
	// =====================================================
	
	async activateContribuable(req, res) {
		
		try {
			
			const { id } =
			req.params
			
			
			if (!isValidContribuableId(id)) {
				
				return res.status(400).json({
					success: false,
					message:
					'ID contribuable invalide.'
				})
			}
			
			
			const contribuable =
			await ContribuableModel.updateActiveStatus(
				id,
				true
			)
			
			
			if (!contribuable) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Contribuable activé avec succès.',
				
				data: contribuable
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur activateContribuable:',
				 error
			)
			
			return res.status(500).json({
				success: false,
				message:
				'Erreur lors de l’activation.'
			})
		}
	},
	
	
	// =====================================================
	// DELETE /api/contribuables/:id
	// =====================================================
	
	async deleteContribuable(req, res) {
		
		try {
			
			const { id } =
			req.params
			
			
			if (!isValidContribuableId(id)) {
				
				return res.status(400).json({
					success: false,
					message:
					'ID contribuable invalide.'
				})
			}
			
			
			const deleted =
			await ContribuableModel.remove(id)
			
			
			if (!deleted) {
				
				return res.status(404).json({
					success: false,
					message:
					'Contribuable introuvable ou déjà supprimé.'
				})
			}
			
			
			return res.status(200).json({
				
				success: true,
				
				message:
				'Contribuable supprimé définitivement.'
			})
			
			
		} catch (error) {
			
			console.error(
				'Erreur deleteContribuable:',
				 error
			)
			
			
			// -------------------------------------------------
			// Foreign Key
			// -------------------------------------------------
			
			if (error.code === '23503') {
				
				return res.status(409).json({
					
					success: false,
					
					message:
					'Impossible de supprimer ce contribuable car il possède des données liées.'
				})
			}
			
			
			return res.status(500).json({
				
				success: false,
				
				message:
				'Erreur lors de la suppression du contribuable.'
			})
		}
	}
}


export default ContribuableController
