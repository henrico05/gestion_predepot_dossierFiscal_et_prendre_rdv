import pool from '../DataBases/db.js'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'

const MIME_OK = [
	'application/pdf',
'image/jpeg',
'image/png'
]

const MAX_BYTES = 8 * 1024 * 1024

const EXTENSIONS_PAR_MIME = {
	'application/pdf': '.pdf',
	'image/jpeg': '.jpg',
	'image/png': '.png'
}

const STATUTS_DOSSIER_UPLOAD = [
	'BROUILLON',
'A_COMPLETER'
]

export const PieceJustificativeModel = {
	
	async findByDossier(id_dossier) {
		const { rows } = await pool.query(`
		SELECT
		p.*,
		a.nom AS verif_nom,
		a.prenom AS verif_prenom,
		tp.libelle AS type_piece_libelle
		FROM piece_justificative p
		LEFT JOIN agents a
		ON a.id = p.id_agent_verificateur
		LEFT JOIN type_piece tp
		ON tp.id_type_piece = p.id_type_piece
		WHERE p.id_dossier = $1
		ORDER BY p.date_upload ASC
		`, [id_dossier])
		
		return rows
	},
	
	async findById(id_piece) {
		const { rows } = await pool.query(`
		SELECT
		p.*,
		a.nom AS verif_nom,
		a.prenom AS verif_prenom,
		tp.libelle AS type_piece_libelle
		FROM piece_justificative p
		LEFT JOIN agents a
		ON a.id = p.id_agent_verificateur
		LEFT JOIN type_piece tp
		ON tp.id_type_piece = p.id_type_piece
		WHERE p.id_piece = $1
		`, [id_piece])
		
		return rows[0] || null
	},
	
	async create({
		id_dossier,
		file,
		id_type_piece = null
	}) {
		// =========================================================
		// 1. Vérification du fichier
		// =========================================================
		if (!file) {
			throw new Error('Fichier manquant.')
		}
		
		if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
			throw new Error('Contenu du fichier invalide.')
		}
		
		if (!file.mimetype || !MIME_OK.includes(file.mimetype)) {
			throw new Error(
				'Type MIME non autorisé. Formats acceptés : PDF, JPEG et PNG (RG17).'
			)
		}
		
		if (!Number.isInteger(file.size) || file.size <= 0) {
			throw new Error('Fichier vide ou taille invalide.')
		}
		
		if (file.size > MAX_BYTES) {
			throw new Error(
				'Fichier trop volumineux. La taille maximale est de 8 Mo (RG17).'
			)
		}
		
		// =========================================================
		// 2. Vérification du dossier
		// =========================================================
		const { rows: dossierRows } = await pool.query(`
		SELECT id_dossier, id_contribuable, id_service, statut_dossier
		FROM dossier_fiscal
		WHERE id_dossier = $1
		`, [id_dossier])
		
		const dossier = dossierRows[0]
		
		if (!dossier) {
			throw new Error('Dossier fiscal introuvable.')
		}
		
		if (!STATUTS_DOSSIER_UPLOAD.includes(dossier.statut_dossier)) {
			throw new Error(
				`Impossible d'ajouter une pièce lorsque le dossier est "${dossier.statut_dossier}".`
			)
		}
		
		// =========================================================
		// 3. Vérification de l'identifiant du type
		// =========================================================
		if (id_type_piece === null || id_type_piece === undefined || id_type_piece === '') {
			throw new Error('Le type de pièce est obligatoire.')
		}
		
		const idTypePiece = String(id_type_piece).trim()
		
		if (!idTypePiece) {
			throw new Error('Identifiant de type de pièce invalide.')
		}
		
		// =========================================================
		// 4. Vérifier que le type existe ET récupérer `multiple`
		// =========================================================
		const { rows: typeRows } = await pool.query(`
		SELECT id_type_piece, libelle, actif, multiple
		FROM type_piece
		WHERE id_type_piece = $1
		`, [idTypePiece])
		
		const typePiece = typeRows[0]
		
		if (!typePiece) {
			throw new Error('Type de pièce introuvable.')
		}
		
		if (!typePiece.actif) {
			throw new Error('Ce type de pièce n’est plus actif.')
		}
		
		const allowMultiple = typePiece.multiple === true
		
		// =========================================================
		// 5. Vérifier que le type appartient au service du dossier
		// =========================================================
		const { rows: servicePieceRows } = await pool.query(`
		SELECT id_service, id_type_piece, obligatoire
		FROM service_piece
		WHERE id_service = $1 AND id_type_piece = $2
		`, [dossier.id_service, idTypePiece])
		
		if (!servicePieceRows[0]) {
			throw new Error(
				`La pièce "${typePiece.libelle}" n'est pas autorisée pour ce service fiscal.`
			)
		}
		
		// =========================================================
		// 6. GESTION DES DOUBLONS ET DU REMPLACEMENT
		// =========================================================
		const { rows: existingPieces } = await pool.query(`
		SELECT id_piece, statut_verification, chemin_stockage
		FROM piece_justificative
		WHERE id_dossier = $1 AND id_type_piece = $2
		`, [id_dossier, idTypePiece])
		
		const piecesNonConformes = existingPieces.filter(p => p.statut_verification === 'NON_CONFORME')
		const piecesActives      = existingPieces.filter(p => p.statut_verification !== 'NON_CONFORME')
		
		// ---------- Cas A : pièce unique déjà active → REFUSER ----------
		if (!allowMultiple && piecesActives.length > 0) {
			throw new Error(
				`La pièce "${typePiece.libelle}" a déjà été déposée. ` +
				`Supprimez-la d'abord pour la remplacer.`
			)
		}
		
		if (piecesNonConformes.length > 0) {
			console.log(
				`🔄 Remplacement de ${piecesNonConformes.length} pièce(s) NON_CONFORME ` +
				`du type "${typePiece.libelle}"`
			)
			
			// 1) Supprimer les fichiers physiques
			for (const old of piecesNonConformes) {
				if (old.chemin_stockage) {
					try {
						await fs.unlink(old.chemin_stockage)
					} catch (err) {
						console.warn(
							`⚠️ Impossible de supprimer le fichier ${old.chemin_stockage} :`,
				   err.message
						)
					}
				}
			}
			
			// 2) Supprimer les lignes en BDD
			const idsToDelete = piecesNonConformes.map(p => p.id_piece)
			
			await pool.query(`
			DELETE FROM piece_justificative
			WHERE id_piece = ANY($1::int[])
			`, [idsToDelete])
			
			console.log(
				`🗑️ ${idsToDelete.length} pièce(s) NON_CONFORME supprimée(s) :`,
						idsToDelete
			)
		}
		
		// =========================================================
		// 7. Calcul de l'empreinte SHA-256
		// =========================================================
		const hash = crypto
		.createHash('sha256')
		.update(file.buffer)
		.digest('hex')
		
		// =========================================================
		// 8. Préparation du stockage privé
		// =========================================================
		const dir = path.join(
			process.cwd(),
							  'uploads',
							  'dossiers',
							  String(id_dossier)
		)
		
		await fs.mkdir(dir, { recursive: true })
		
		const extension = EXTENSIONS_PAR_MIME[file.mimetype]
		const filename  = `${crypto.randomUUID()}${extension}`
		const dest      = path.join(dir, filename)
		
		// =========================================================
		// 9. Écriture du fichier + insertion SQL
		// =========================================================
		let fichierEcrit = false
		
		try {
			await fs.writeFile(dest, file.buffer)
			fichierEcrit = true
			
			const { rows } = await pool.query(`
			INSERT INTO piece_justificative (
				nom_fichier,
				type_mime,
				chemin_stockage,
				taille_fichier,
				date_upload,
				statut_verification,
				empreinte_hash,
				id_dossier,
				id_type_piece
			)
			VALUES (
				$1, $2, $3, $4, NOW(),
					'EN_ATTENTE',
		   $5, $6, $7
			)
			RETURNING *
			`, [
				file.originalname,
				file.mimetype,
				dest,
				file.size,
				hash,
				id_dossier,
				idTypePiece
			])
			
			return rows[0]
			
		} catch (error) {
			// =====================================================
			// 10. Nettoyage si PostgreSQL échoue
			// =====================================================
			if (fichierEcrit) {
				try {
					await fs.unlink(dest)
				} catch (cleanupError) {
					console.error(
						'⚠️ Impossible de supprimer le fichier orphelin :',
				   cleanupError
					)
				}
			}
			
			throw error
		}
	},
	
	async verifier({
		id_piece,
		id_agent,
		statut,
		commentaire
	}) {
		// =========================================================
		// 1. Vérification du statut demandé
		// =========================================================
		
		if (!['CONFORME', 'NON_CONFORME'].includes(statut)) {
			throw new Error(
				'Statut de vérification invalide.'
			)
		}
		
		// =========================================================
		// 2. Vérification de l'agent
		// =========================================================
		
		if (!id_agent) {
			throw new Error(
				'Agent vérificateur obligatoire.'
			)
		}
		
		const { rows: agentRows } = await pool.query(`
		SELECT
		id,
		matricule,
		nom,
		prenom,
		role,
		is_active
		FROM agents
		WHERE id = $1
		`, [id_agent])
		
		const agent = agentRows[0]
		
		// IMPORTANT : vérifier avant d'utiliser agent.xxx
		if (!agent) {
			throw new Error(
				'Agent vérificateur introuvable.'
			)
		}
		
		
		// =========================================================
		// 3. RG7 : contrôle du rôle
		// =========================================================
		
		const ROLES_VERIFICATION_AUTORISES = [
			'VERIFICATEUR',
			'CHEF_CENTRE'
		]
		
		
		if (!ROLES_VERIFICATION_AUTORISES.includes(agent.role)) {
			throw new Error(
				`L'agent ${agent.nom} ${agent.prenom} n'est pas autorisé à vérifier les pièces justificatives.`
			)
		}
		
		// =========================================================
		// 4. Vérification que l'agent est actif
		// =========================================================
		
		if (agent.is_active !== true) {
			throw new Error(
				'Cet agent est désactivé et ne peut pas vérifier une pièce.'
			)
		}
		
		console.log('🟢 AGENT ACTIF')
		console.log('🟢 RECHERCHE DE LA PIECE', id_piece)
		
		// =========================================================
		// 5. Vérification de la pièce
		// =========================================================
		
		const { rows: pieceRows } = await pool.query(`
		SELECT
		id_piece,
		id_dossier,
		statut_verification
		FROM piece_justificative
		WHERE id_piece = $1
		`, [id_piece])
		
		const piece = pieceRows[0]
		
		if (!piece) {console.log('')
			console.log('======================================')
			console.log('🔥 CONTROLLER verifierPiece ATTEINT')
			console.log('PIECE ID :', req.params.pieceId)
			console.log('USER ID  :', req.user?.id)
			console.log('ROLE     :', req.user?.role)
			console.log('======================================')
			throw new Error(
				'Pièce introuvable.'
			)
		}
		
		// =========================================================
		// 6. Vérifier que la pièce est encore en attente
		// =========================================================
		
		if (piece.statut_verification !== 'EN_ATTENTE') {
			throw new Error(
				`Cette pièce a déjà été vérifiée avec le statut "${piece.statut_verification}".`
			)
		}
		
		// =========================================================
		// 7. Mise à jour de la vérification
		// =========================================================
		
		const { rows } = await pool.query(`
		UPDATE piece_justificative
		SET
		statut_verification = $1,
		date_verification = NOW(),
										  commentaire_verification = $2,
									id_agent_verificateur = $3
									WHERE id_piece = $4
									RETURNING *
									`, [
										statut,
									commentaire || null,
									id_agent,
									id_piece
									])
		
		if (!rows[0]) {
			throw new Error(
				'Impossible de mettre à jour la pièce justificative.'
			)
		}
		
		console.log('✅ PIÈCE VÉRIFIÉE')
		console.log('ID pièce :', rows[0].id_piece)
		console.log('Statut   :', rows[0].statut_verification)
		
		return rows[0]
	}
}
