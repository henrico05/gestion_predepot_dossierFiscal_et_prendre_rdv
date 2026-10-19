
import { seedChefService } from './seedChefService.js'
import pool from '../DataBases/db.js'

try {
	await seedChefService()
	
	console.log('✅ Seed terminé')
} catch (error) {
	console.error('❌ Seed échoué')
	console.error(error)
	process.exitCode = 1
} finally {
	await pool.end()
}

