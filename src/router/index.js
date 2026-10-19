
import { createRouter, createWebHistory } from 'vue-router'
import { useToast } from 'vue-toastification'
import {playSound} from '@/services/sonnerie'

// ======================================================
// Pages
// ======================================================

const toast = useToast()

// Authentification
const LoginAgent = () => import('@/components/LoginAgent.vue')
const DashboardLayout = () => import('@/views/DasboardAgent.vue')
const Dashboard = () =>import('@/components/DashboardComponents/dashboardAgent.vue')
const Dossiers = () =>import('@/components/Dossiers/VerificationInbox.vue')
const DossierVerifyList = () =>import('@/views/DossierDetailAgent.vue')
const RendezVousList = () =>import('@/views/RendezVousAgent.vue') 
const createRendezVous = () =>import('@/components/RDV/createRendezVous.vue')
const ServiceFiscal = () => import('@/AdminView/serviceFiscalListe.vue')
const UserSpaceAdmin = () => import('@/AdminView/UserPartieViewAdmin.vue')
const createDossier = () => import('@/components/Dossiers/createDossiersCotribuable.vue')
const verifyEmail = () => import('@/components/verificationEmail.vue')
const statistique = () => import('@/components/Statistique/agent/StatsPerformance.vue')
const FilEntente = () => import('@/views/FilEntente.vue')
const ListGuichet = () => import('@/AdminView/SupervisionGuichets.vue')

// ======================================================
// Rôles de l'application
// ======================================================

const ROLES = {
	CHEF_CENTRE: 'CHEF_CENTRE',
	GUICHETIER: 'GUICHETIER',
	VERIFICATEUR: 'VERIFICATEUR'
}

// ======================================================
// Routes
// ======================================================

const routes = [
	
	// ==================================================
	// Racine
	// ==================================================
	
	{
		path: '/',
		redirect: {
			name: 'Login'
		}
	},

// ==================================================
// Login
// ==================================================

{
	path: '/login',
	name: 'Login',
	component: LoginAgent,
	
	meta: {
		guest: true,
		title: 'Connexion'
	}
},
{
	path: '/kiosk',
	name: 'Kiosk',
	component: () =>
	import('@/views/KioskView.vue'),
	meta: {
		title: 'Écran public'
	}
},

// ==================================================
// Portail Agent
// ==================================================

{
	path: '/dashAgent',
	name: 'AgentPortail',
	component: DashboardLayout,
	
	meta: {
		requiresAuth: true
	},
	
	children: [
		
		// ----------------------------------------------
		// Dashboard
		// ----------------------------------------------
		
		{
			path: '/dashboard',
			name: 'Dashboard',
			component: Dashboard,
			
			meta: {
				requiresAuth: true,
				
				title: 'Tableau de bord',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.GUICHETIER,
					ROLES.VERIFICATEUR
				]
			}
		},
		
		{
			path : '/statistique',
			name: 'Statistiques',
			component : statistique,
			
			meta : {
				requiresAuth : true,
				title : 'Statistiques',
				roles : [ROLES.CHEF_CENTRE,ROLES.GUICHETIER,ROLES.VERIFICATEUR]
			}
		},
		
		// ----------------------------------------------
		// Dossiers
		// ----------------------------------------------
		
		{
			path: 'dossiers',
			name: 'Dossiers',
			component: Dossiers,
			
			meta: {
				requiresAuth: true,
				
				title: 'Listes des Dossiers fiscaux',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.VERIFICATEUR
				]
			}
		},
		
		 { 
			 path: '/dossiers/:id', 
			 name: 'dossier-detail', 
			 component: DossierVerifyList, 
			 props: true 
			 
		},
		
		// ----------------------------------------------
		// Rendez-vous
		// ----------------------------------------------
		
		{
			path: 'rendez-vous',
			name: 'RendezVous',
			component: RendezVousList,
			
			meta: {
				requiresAuth: true,
				
				title: 'Rendez-vous',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.VERIFICATEUR
				]
			}
		},
		{
			path: 'service_fiscal',
			name: 'servicesFiscal',
			component: ServiceFiscal,
			
			meta: {
				requiresAuth: true,
				
				title: 'Catalogue des services',
				
				roles: [
					ROLES.CHEF_CENTRE,
				]
			}
		},
		{
			path: 'user_space',
			name: 'userSpace',
			component: UserSpaceAdmin,
			
			meta: {
				requiresAuth: true,
				
				title: 'Comptes de travaille',
				
				roles: [
					ROLES.CHEF_CENTRE,
				]
			}
		},
		{
			path: 'createDossier',
			name: 'CreateDossier',
			component: createDossier,
			
			meta: {
				requiresAuth: true,
				
				title: 'Création de dossier fiscal',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.VERIFICATEUR
				]
			}
		},
		{
			path: 'createRdv',
			name: 'CreateRendezVous',
			component: createRendezVous,
			
			meta: {
				requiresAuth: true,
				
				title: 'Prise de rendez-vous',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.VERIFICATEUR,
					ROLES.GUICHETIER
				]
			}
		},
		
		//=======================================================
		//   TICKET FIL D'ENTENTE
		//=======================================================
		
		{
			path: 'fil_entente',
			name: 'Ticket',
			component: FilEntente,
			
			meta: {
				requiresAuth: true,
				
				title: 'Fils d\'entente',
				
				roles: [
					ROLES.CHEF_CENTRE,
					ROLES.GUICHETIER
				]
			}
		},
		
		{
			path: 'guichet_list',
			name: 'ListGuichet',
			component: ListGuichet,
			
			meta: {
				requiresAuth: true,
				
				title: 'Superviser des guichets',
				
				roles: [
					ROLES.CHEF_CENTRE
				]
			}
		},
	]
},

{
	path: '/verify-email',
	name : 'Verify_email',
	component : verifyEmail,
	meta: {
		title: 'Email de verification'
	}
	
},

// ==================================================
// 404
// ==================================================

{
	path: '/:pathMatch(.*)*',
	
	name: 'NotFound',
	
	component: () =>
	import('@/views/NotFound.vue'),
	
	meta: {
		title: 'Page introuvable'
	}
}
]

// ======================================================
// Création du Router
// ======================================================

const router = createRouter({
	
	history: createWebHistory(),
							
							routes,
							
							scrollBehavior() {
								return {
									top: 0
								}
							}
})

// ======================================================
// Navigation Guard
// ======================================================

router.beforeEach((to) => {
	
	// ==================================================
	// Récupération de l'utilisateur
	// ==================================================
	
	const rawUser =
	localStorage.getItem('currentUser')
	
	const isAuthenticated = !!rawUser
	
	// ==================================================
	// Route Guest
	// ==================================================
	
	// Si l'utilisateur est déjà connecté
	// et essaie d'aller sur /login
	
	if (
		to.meta.guest &&
		isAuthenticated
	) {
		
		return {
			name: 'Dashboard'
		}
	}
	
	// ==================================================
	// Authentification obligatoire
	// ==================================================
	
	if (
		to.meta.requiresAuth &&
		!isAuthenticated
	) {
		
		return {
			name: 'Login'
		}
	}
	
	// ==================================================
	// Si la route ne nécessite pas
	// de rôle particulier
	// ==================================================
	
	if (
		!to.meta.roles ||
		!to.meta.roles.length
	) {
		
		document.title = to.meta.title
		? `${to.meta.title} — IMPOTS Manakara`
		: 'IMPOTS Manakara — Espace Agent'
		
		return true
	}
	
	// ==================================================
	// Lecture de currentUser
	// ==================================================
	
	let currentUser = null
	
	try {
		
		currentUser = JSON.parse(rawUser)
		
	} catch (error) {
		
		console.error(
			'currentUser invalide :',
			error
		)
		
		localStorage.removeItem(
			'currentUser'
		)
		
		return {
			name: 'Login'
		}
	}
	
	// ==================================================
	// Récupération du rôle
	// ==================================================
	
	const userRole =
	currentUser?.role
	
	// ==================================================
	// Vérification du rôle
	// ==================================================
	
	const allowedRoles =
	to.meta.roles
	
	if (
		!userRole ||
		!allowedRoles.includes(userRole)
	) {
		playSound('warning')
		toast.info(`Accès refusé,vous n'etes pas autorise d'y entrée`)
		console.warn(
			`Accès refusé : rôle "${userRole}" non autorisé pour "${to.name}"`
		)
		
		// L'utilisateur est connecté
		// mais n'a pas le droit d'accéder à cette page
		
		return {
			name: 'Dashboard'
		}
	}
	
	// ==================================================
	// Titre de la page
	// ==================================================
	
	document.title = to.meta.title
	? `${to.meta.title} — IMPOTS Manakara`
	: 'IMPOTS Manakara — Espace Agent'
	
	// ==================================================
	// Autorisation
	// ==================================================
	
	return true
})

// ======================================================
// Export
// ======================================================

export default router
