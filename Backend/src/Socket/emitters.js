import { getIO } from './socket.js'

/* ============================================================
 * ÉMETTEURS SOCKET — centralisés
 * À appeler après chaque COMMIT de transaction pour notifier
 * les dashboards en temps réel.
 * ============================================================ */

/**
 * Rafraîchir les statistiques (tous les dashboards)
 */
export function emitStatsRefresh() {
	try {
		const io = getIO()
		io.to('room:agents').emit('stats:refresh')
		console.log('📡 stats:refresh émis')
	} catch (err) {
		console.error('⚠️ emitStatsRefresh :', err.message)
	}
}

/**
 * Rafraîchir la file d'attente (Fil d'attente, dashboards guichet)
 */
export function emitFileRefresh() {
	try {
		const io = getIO()
		io.to('room:agents').emit('file:refresh')
		io.to('room:public').emit('file:refresh')
		console.log('📡 file:refresh émis')
	} catch (err) {
		console.error('⚠️ emitFileRefresh :', err.message)
	}
}

/**
 * Notifier la mise à jour d'un dossier
 */
export function emitDossierUpdated(dossier) {
	if (!dossier) return
		try {
			const io = getIO()
			
			/* Notifier tous les agents */
			io.to('room:agents').emit('dossier:updated', {
				id_dossier: dossier.id_dossier,
				statut_dossier: dossier.statut_dossier,
				reference_dossier: dossier.reference_dossier
			})
			
			/* Notifier le contribuable concerné */
			if (dossier.id_contribuable) {
				io.to(`contribuable:${dossier.id_contribuable}`).emit('dossier:updated', {
					id_dossier: dossier.id_dossier,
					statut_dossier: dossier.statut_dossier
				})
			}
			
			console.log('📡 dossier:updated émis pour', dossier.reference_dossier)
		} catch (err) {
			console.error('⚠️ emitDossierUpdated :', err.message)
		}
}
