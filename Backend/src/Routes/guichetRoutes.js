import express from 'express'
import pool from '../DataBases/db.js'

const router = express.Router()

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(`
		SELECT
		id_guichet,
		numero_guichet,
		libelle,
		etat_guichet
		FROM guichet
		WHERE etat_guichet = 'OUVERT'
		ORDER BY numero_guichet
		`)
		
		res.json({
			guichets: result.rows
		})
		
	} catch (error) {
		console.error(error)
		
		res.status(500).json({
			message: 'Erreur lors du chargement des guichets'
		})
	}
})

export default router
