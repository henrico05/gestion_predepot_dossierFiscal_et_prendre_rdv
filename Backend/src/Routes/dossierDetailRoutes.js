import { Router } from 'express'
import { DossierDetailController } from '../Controllers/DossierDetailController.js'

export function dossierDetailRoutes(authAgent,authContribuable, authChef) {
	const r = Router()
	
	
	    //contriuable
	r.get('/:id/historiques',   authContribuable, DossierDetailController.getHistorique)
	r.get('/:id/traitement',  authContribuable, DossierDetailController.getTraitements)
	r.get('/:id/commentaire', authContribuable, DossierDetailController.getCommentaires)
	r.post('/:id/commentaire', authContribuable, DossierDetailController.createCommentaire)
	
	
	/* Historique (agents) */
	r.get('/:id/historique', authAgent, DossierDetailController.getHistorique)
	
	/* Traitements */
	r.get('/:id/traitements',        authAgent, DossierDetailController.getTraitements)
	r.get('/:id/traitements/export', authAgent, DossierDetailController.exportTraitements)
	
	/* Commentaires */
	r.get('/:id/commentaires', authAgent, DossierDetailController.getCommentaires)
	r.post('/:id/commentaires', authAgent, DossierDetailController.createCommentaire)
	r.patch('/commentaires/:commentaireId', authAgent, DossierDetailController.updateCommentaire)
	r.delete('/commentaires/:commentaireId',authAgent, DossierDetailController.deleteCommentaire)
	
	/* Audit (CHEF_CENTRE uniquement) */
	r.get('/:id/audit', authChef, DossierDetailController.getAudit)
	
	
	return r
}
