import { Router } from 'express'
import multer from 'multer'
import { GuichetController, TicketController } from '../Controllers/guichetController.js'
import { DossierController } from '../Controllers/dossierController.js'
import { StatsController } from '../Controllers/statsController.js'
import { NotificationInterneController } from '../Controllers/notificationInterneController.js'

const upload = multer({
	storage: multer.memoryStorage(),
					  limits: { fileSize: 8 * 1024 * 1024 }
})

export function dailyOpsRoutes(authAgent, authContribuable, authChef,authVerificateurOuChef,authGuichetierOuChef) {
	const r = Router()
	
	//======================================================================================
	//      ROUTES LIES AU GUICHETIER ET TICKET DE CONTRIBUABBLE
	//======================================================================================
	
	r.get('/guichet', authChef, GuichetController.list)
	r.get('/guichets/session', authGuichetierOuChef, GuichetController.session)
	r.get('/guichets/mon-guichet', authGuichetierOuChef, GuichetController.monGuichet)
	r.post('/guichets/ouvrir',authGuichetierOuChef, GuichetController.ouvrir)
	r.post('/guichets/fermer', authGuichetierOuChef, GuichetController.fermer)
	r.patch('/guichets/:id/etat', authChef, GuichetController.setEtat)
	r.get('/accueil/rdv-du-jour', authGuichetierOuChef, GuichetController.rdvDuJour)
	r.get('/agents/guichetiers', authChef, GuichetController.listAgents)
	r.patch('/agents/:id/guichet', authChef, GuichetController.reassigner)
	
	r.get('/tickets/file', authGuichetierOuChef, TicketController.file)
	r.get('/tickets/ecran-public', TicketController.ecranPublic)
	r.post('/rendez-vous/:id/present', authGuichetierOuChef, TicketController.present)
	r.post('/tickets/walk-in', authGuichetierOuChef, TicketController.walkIn)
	r.post('/tickets/appeler', authGuichetierOuChef, TicketController.appeler)
	
	r.get('/dossiers/sans-rdvs', authGuichetierOuChef, DossierController.dossiersSansRdv)
	r.patch('/tickets/:id/statut', authGuichetierOuChef, TicketController.statut)
	r.post('/dossiers/:id/present-sans-rdv', authGuichetierOuChef, DossierController.marquerPresentSansRdv)
	
	//======================================================================================
	//             ROUTES POUR LES DOSSIERS
	//======================================================================================
	
	r.get('/dossiers/mes', authContribuable, DossierController.mesDossiers)
	r.post('/dossiers', authContribuable,DossierController.create)
	r.post('/agent/dossiers',authVerificateurOuChef,DossierController.createPourAgent)
	r.get('/dossiers/:id', authContribuable, DossierController.getById)
	r.get('/agent/dossiers/:id',authAgent,DossierController.getByIdPourAgent)
	r.post('/dossiers/:id/soumettre', authContribuable, DossierController.soumettre)
	r.post('/agent/dossiers/:id/soumettre',authVerificateurOuChef,DossierController.soumettrePourAgent)
	r.post('/dossiers/:id/pieces', authContribuable, upload.single('fichier'), DossierController.uploadPiece)
	r.post('/agent/dossiers/:id/pieces',authVerificateurOuChef,upload.single('fichier'),DossierController.uploadPiece)
	
	
	
	
	r.get('/verification/dossiers', authVerificateurOuChef, DossierController.aVerifier)
	r.patch('/dossiers/:id/decision',authVerificateurOuChef, DossierController.decider)
	r.patch('/pieces/:pieceId/verifier',authVerificateurOuChef, DossierController.verifierPiece)
	r.patch('/dossiers/:id/commencer-verification',authVerificateurOuChef,DossierController.commencerVerification)
	r.get('/pieces/:pieceId/visualiser',authVerificateurOuChef,DossierController.visualiserPiece)
	
	//============================================================================================
	//  DASHHBOARD ET STATISTIQUE
	//============================================================================================
	  
	r.get('/stats/dashboard', authChef, StatsController.dashboard)
	r.get('/stats/verificateur', authVerificateurOuChef, StatsController.verificateur)
	r.get('/statistiques/dashboard', authAgent, StatsController.StatistiqueAgent)
	
	//=============================================================================================
	//   NOTIFICATIONS RECU AU CHEF DE SERVICE
	//=============================================================================================
	
	r.get('/notifications/chef', authChef, NotificationInterneController.list)
	r.patch('/notifications/chef/lire-toutes', authChef, NotificationInterneController.lireToutes)
	r.patch('/notifications/chef/:id/lire', authChef, NotificationInterneController.lire)
	
	return r
}
