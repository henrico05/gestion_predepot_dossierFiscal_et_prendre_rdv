
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pool from '../DataBases/db.js'
import { AgentModel } from '../Models/RegisterAgent.js'

export async function seedChefService() {
	try {
		// =====================================================
		// Vérification des variables d'environnement
		// =====================================================
		if (
			!process.env.CHEF_MATRICULE ||
			!process.env.CHEF_EMAIL ||
			!process.env.CHEF_PASSWORD
		) {
			throw new Error(
				'CHEF_MATRICULE, CHEF_EMAIL et CHEF_PASSWORD doivent être définis dans .env'
			)
		}
		
		// =====================================================
		// Vérifier si un CHEF_CENTRE existe déjà
		// =====================================================
		const existing = await AgentModel.findByRole('CHEF_CENTRE')
		
		if (existing) {
			console.log('ℹ️ CHEF_CENTRE déjà présent, aucune création nécessaire')
			return existing
		}
		
		// =====================================================
		// Hash du mot de passe
		// =====================================================
		const password_hash = await bcrypt.hash(
			process.env.CHEF_PASSWORD,
			12
		)
		
		// =====================================================
		// Création du Chef de service
		// =====================================================
		const chef = await AgentModel.create({
			nom: 'Chef',
			prenom: 'Service',
			
			matricule: process.env.CHEF_MATRICULE,
			email: process.env.CHEF_EMAIL,
			
			password_hash,
			
			role: 'CHEF_CENTRE',
			
			// Le Chef est déjà validé
			email_verified: true,
			admin_status: 'approved',
			is_active: true,
			
			// Pas de guichet pour le Chef de service
			id_guichet: null,
			
			photo_base64: null,
			photo_content_type: null,
			
			email_token: null,
			email_token_expires: null
		})
		
		console.log('✅ CHEF_CENTRE créé avec succès')
		console.log(`   Matricule : ${chef.matricule}`)
		console.log(`   Email     : ${chef.email}`)
		
		return chef
		
	} catch (error) {
		console.error('❌ Erreur seed CHEF_CENTRE :', error)
		throw error
	}
}
