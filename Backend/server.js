import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import cron from 'node-cron'

// Services
import { verifyMailConnection } from './src/Services/emailService.js'
import { verifyPostGresConnection } from './src/DataBases/db.js'
import { marquerRdvExpires } from './src/Services/marquerAbsents.js'
import { envoyerRappels } from './src/Services/rappelsRdv.js'

// Routes
import serviceFiscalRoutes from './src/Routes/serviceFiscalRoute.js'
import TypePieceRoutes from './src/Routes/TypePieceRoutes.js'
import ServicePieceRoutes from './src/Routes/ServicePieceRoutes.js'
import rendezVousRoutes from './src/Routes/rendezVousRoutes.js'
import contribuableRoutes from './src/Routes/contribuableRoutes.js'
import authRoutes from './src/Routes/authAgentRoutes.js'
import guichetRoutes from './src/Routes/guichetRoutes.js'
import ticketFileAttenteRoutes from './src/Routes/ticketFileAttenteRoutes.js'
import NotificationRoute from './src/Routes/NotificationRoute.js'
import { dailyOpsRoutes } from './src/Routes/dailyOps.routes.js'
import { dossierDetailRoutes } from './src/Routes/dossierDetailRoutes.js'

// Models
import { AgentModel } from './src/Models/RegisterAgent.js'

// Middleware
import {
	verifyJWT,
	authAgent,
	authContribuable,
	authChef,
	authVerificateurOuChef,
	authGuichetierOuChef
} from './src/middleware/Auth.js'

import { initSocket } from './src/Socket/socket.js'

// ======================================================
// ENV
// ======================================================

dotenv.config()

// ======================================================
// EXPRESS
// ======================================================

const app = express()

const PORT = process.env.PORT || 3000


// ======================================================
// FRONTEND URLS
// ======================================================
const FRONTEND_URLS = [
	'http://localhost:5173',
'http://localhost:5174'
]

app.use(
	cors({
		origin: (origin, callback) => {
			
			// Requête sans Origin
			if (!origin) {
				return callback(null, true)
			}
			
			// Origine autorisée
			if (FRONTEND_URLS.includes(origin)) {
				return callback(null, true)
			}
			
			console.log(	'❌ Origine CORS refusée :', origin)
			
			return callback(new Error('Origine non autorisée par CORS'))
		},
		
		credentials: true,
		
		methods: [
			'GET',
			'HEAD',
			'POST',
			'PUT',
			'PATCH',
			'DELETE',
			'OPTIONS'
		],
		
		allowedHeaders: [
			'Content-Type',
			'Authorization'
		]
	})
)


// ======================================================
// BODY PARSER
// ======================================================

app.use(
	express.json({
		limit: '5mb'
	})
)

app.use(
	express.urlencoded({
		extended: true
	})
)


// ======================================================
// ROUTE RACINE
// ======================================================

app.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Serveur IMPOTS Manakara opérationnel',
		socketio: true
	})
})


// ======================================================
// ROUTES API
// ======================================================

app.use('/api/auth',authRoutes)
app.use('/api/guichets',guichetRoutes)
app.use('/api/services-fiscaux',serviceFiscalRoutes)
app.use('/api/admin',TypePieceRoutes)
app.use('/api/admin',ServicePieceRoutes)
app.use('/api/rendez-vous',rendezVousRoutes)
app.use('/api/contribuables',contribuableRoutes)
app.use('/api/tickets',ticketFileAttenteRoutes)
app.use('/api/notifications', NotificationRoute)
app.use('/api/dossier-detail',dossierDetailRoutes(authAgent,authContribuable, authChef))

app.use(
	'/api',
	dailyOpsRoutes(
		authAgent,
		authContribuable,
		authChef,
		authVerificateurOuChef,
		authGuichetierOuChef
	)
)


// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/api/health', (req, res) => {
	res.json({
		success: true,
		status: 'OK',
		timestamp: new Date().toISOString()
	})
})


// ======================================================
// SERVEUR HTTP
// ======================================================

const server = http.createServer(app)


// ======================================================
// SOCKET.IO
// ======================================================

const io = new Server(server, {
	cors: {
		origin: FRONTEND_URLS,
		credentials: true,
		methods: [
			'GET',
			'POST',
			'PATCH',
			'PUT',
			'DELETE'
		]
	}
})

initSocket(io)

const onlineAgents = new Set()
const onlineContribuables = new Set()


// ======================================================
// AUTHENTIFICATION SOCKET.IO
// ======================================================

io.use((socket, next) => {
	try {
		
		const token = socket.handshake.auth?.token
		
		// --------------------------------------------------
		// Token absent
		// --------------------------------------------------
		
		if (!token) {
			
			console.log(
				'❌ Connexion Socket.IO refusée : token manquant'
			)
			
			return next(
				new Error('Token manquant')
			)
		}
		
		
		// --------------------------------------------------
		// Vérification JWT
		// --------------------------------------------------
		
		const decoded = verifyJWT(token)
		
		
		if (!decoded) {
			
			console.log(
				'❌ Connexion Socket.IO refusée : token invalide'
			)
			
			return next(
				new Error('Token invalide ou expiré')
			)
		}
		
		
		// --------------------------------------------------
		// Stocker utilisateur dans socket
		// --------------------------------------------------
		
		socket.user = decoded
		
		console.log(
			'🔐 Socket authentifié :',
			{
				id: decoded.id,
				role: decoded.role
			}
		)
		
		
		next()
		
	} catch (error) {
		
		console.error(
			'❌ Erreur authentification Socket.IO:',
			error
		)
		
		next(
			new Error('Authentification échouée')
		)
	}
})


// ======================================================
// CONNEXION SOCKET.IO
// ======================================================

io.on(
	'connection',
	async (socket) => {
		
		// ==================================================
		// INFORMATIONS UTILISATEUR
		// ==================================================
		
		const userId = String(
			socket.user.id
		)
		
		const role = String(socket.user.role || '').toUpperCase()
		
		const isContribuable = role === 'CONTRIBUABLE'
		
		
		console.log('')
		console.log(
			'=========================================='
		)
		
		console.log(
			'🔌 NOUVELLE CONNEXION SOCKET.IO'
		)
		
		console.log(
			'👤 ID :',
			userId
		)
		
		console.log(
			'🎭 ROLE :',
			role
		)
		
		console.log(
			'🆔 SOCKET ID :',
			socket.id
		)
		
		console.log(
			'=========================================='
		)
		
		
		
		// ==================================================
		// CAS AGENT
		// ==================================================
		
		if (!isContribuable) {
			
			// ------------------------------------------------
			// Room générale des agents
			// ------------------------------------------------
			
			socket.join(
				'room:agents'
			)
			
			
			// ------------------------------------------------
			// Room correspondant au rôle
			// ------------------------------------------------
			
			if (role) {
				
				socket.join(
					`role:${role}`
				)
			}
			
			
			console.log(
				`🟢 Agent connecté [${role}] : ${userId}`
			)
			
			
			// ------------------------------------------------
			// Ajouter dans les agents en ligne
			// ------------------------------------------------
			
			onlineAgents.add(
				userId
			)
			
			
			console.log(
				'👥 Agents en ligne après connexion :',
			   [...onlineAgents]
			)
			
			
			// ------------------------------------------------
			// Mettre l'agent ONLINE en DB
			// ------------------------------------------------
			
			try {
				
				const agent =
				await AgentModel.setOnline(
					userId
				)
				
				
				if (agent) {
					
					console.log(
						'🟢 Agent marqué ONLINE en DB :',
				 userId
					)
					
					
					// --------------------------------------------
					// Informer tous les agents
					// --------------------------------------------
					
					io
					.to('room:agents')
					.emit(
						'agent:online',
		   {
			   id: String(agent.id),
						  role: role,
						  is_online: true,
						  last_seen: agent.last_seen
		   }
					)
				}
				
			} catch (error) {
				
				console.error(
					'❌ Erreur mise en ligne agent:',
				  error
				)
			}
			
			
			// ==================================================
			// CAS CONTRIBUABLE
			// ==================================================
			
		} else {
			
			// ------------------------------------------------
			// Room personnelle du contribuable
			// ------------------------------------------------
			
			socket.join(
				`contribuable:${userId}`
			)
			
			
			// ------------------------------------------------
			// Room générale contribuables
			// ------------------------------------------------
			
			socket.join(
				'room:contribuables'
			)
			
			
			console.log(
				`🔵 Contribuable connecté : ${userId}`
			)
			
			
			// ------------------------------------------------
			// Informer les GUICHETIERS
			// ------------------------------------------------
			
			io
			.to('role:CHEF_CENTRE')
			.emit(
				'contribuable:online',
		 {
			 id: userId,
			 nif: socket.user.nif,
			 is_online: true
		 }
			)
		}
		
		
		socket.on(
			'presence:request',
			() => {
				
				console.log(
					`📋 Demande présence de ${socket.user.id}`
				)
				
				
				console.log('👥 Agents actuellement en ligne :',[...onlineAgents])
				console.log('👥 Contribuables actuellement en ligne :', [...onlineContribuables])
				
				
				socket.emit('agents:initial',[...onlineAgents])
				socket.emit('contribuables:initial', [...onlineContribuables]) 
			}
		)
		
		
		socket.on(
			'presence:heartbeat',
			async () => {
				
				try {
					
					// --------------------------------------------
					// Seulement pour les agents
					// --------------------------------------------
					
					if (!isContribuable) {
						
						await AgentModel.updateLastSeen(
							userId
						)
						
						
						console.log(
							`💓 Heartbeat agent : ${userId}`
						)
					}else {
						
						onlineContribuables.add(userId)
						
						console.log(`⭐ Heartbeat contribuable : ${userId}`)
					}
					
				} catch (error) {
					
					console.error(
						'❌ Erreur heartbeat:',
				   error
					)
				}
			}
		)
		
		
		
		// ==================================================
		// DÉCONNEXION
		// ==================================================
		
		socket.on(
			'disconnect',
			async (reason) => {
				
				// =================================================
				// AGENT
				// =================================================
				
				if (!isContribuable) {
					
					console.log(
						`🔴 Agent déconnecté [${role}] : ${userId} (${reason})`
					)
					
					
					// ---------------------------------------------
					// Retirer de la liste mémoire
					// ---------------------------------------------
					
					onlineAgents.delete(
						userId
					)
					
					
					console.log(
						'👥 Agents en ligne après déconnexion :',
				 [...onlineAgents]
					)
					
					
					// ---------------------------------------------
					// Mettre OFFLINE en DB
					// ---------------------------------------------
					
					try {
						
						const agent =
						await AgentModel.setOffline(
							userId
						)
						
						
						if (agent) {
							
							console.log(
								'🔴 Agent marqué OFFLINE en DB :',
				   userId
							)
							
							
							// -----------------------------------------
							// Informer tous les agents
							// -----------------------------------------
							
							io
							.to('room:agents')
							.emit(
								'agent:offline',
			 {
				 id: String(agent.id),
								  role: role,
								  is_online: false,
								  last_seen: agent.last_seen
			 }
							)
						}
						
					} catch (error) {
						
						console.error(
							'❌ Erreur mise hors ligne agent:',
					error
						)
					}
					
					
					// =================================================
					// CONTRIBUABLE
					// =================================================
					
				} else {
					
					console.log(
						`🔴 Contribuable déconnecté : ${userId} (${reason})`
					)
					
					
					// ---------------------------------------------
					// Informer les CHEFS DE CENTRE
					// ---------------------------------------------
					
					io
					.to('role:CHEF_CENTRE')
					.emit(
						'contribuable:offline',
		   {
			   id: userId,
			   is_online: false
		   }
					)
				}
				
				
				console.log(
					'=========================================='
				)
				
				console.log(
					'🔌 SOCKET DÉCONNECTÉ'
				)
				
				console.log(
					'🆔 SOCKET :',
				socket.id
				)
				
				console.log(
					'👤 USER :',
				userId
				)
				
				console.log(
					'📌 RAISON :',
				reason
				)
				
				console.log(
					'=========================================='
				)
				
			}
		)
	}
)


// ======================================================
// DEMARRAGE DU SERVEUR
// ======================================================

server.listen(PORT, async () => {
	console.log('')
	console.log('==========================================')
	console.log('🚀 SERVEUR IMPOTS MANAKARA')
	console.log('==========================================')
	console.log(`🌐 API : http://localhost:${PORT}`)
	console.log(`🔌 Socket.IO : http://localhost:${PORT}`)
	console.log('📡 Frontends autorisés :')
	FRONTEND_URLS.forEach((url) => console.log(`   - ${url}`))
	console.log('==========================================')
	
	try {
		await verifyPostGresConnection()
		console.log('🟢 PostgreSQL connecté')
	} catch (error) {
		console.error('❌ PostgreSQL non disponible :', error.message)
	}
	
	try {
		await verifyMailConnection()
		console.log('🟢 Service email connecté')
	} catch (error) {
		console.error('❌ Service email non disponible :', error.message)
	}
	
	cron.schedule('*/5 * * * *', () => {
		marquerRdvExpires()
	}, {
		timezone: 'Indian/Antananarivo'
	})
	
	cron.schedule('* * * * *', async () => {
		try {
			await envoyerRappels()
		} catch (error) {
			console.error(
				'❌ Erreur cron rappels RDV :',
				 error
			)
		}
	}, {
		timezone: 'Indian/Antananarivo'
	})
	
	console.log('⏰ Cron RDV expirés : chaque heure (GMT+3)')
	
	console.log('==========================================')
	console.log('✅ SERVEUR PRÊT')
	console.log('==========================================')
})

