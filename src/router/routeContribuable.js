import { createRouter, createWebHistory } from 'vue-router'

// ======================================================
// Composants
// ======================================================

const Login = () =>
import('@/views/contrib/LoginViewContrub.vue')

const Register = () =>
import('@/views/contrib/RegisterView.vue')

const Acceuil = () =>
import('@/views/contrib/Acceuil.vue')

const verifyEmail = () =>
import('@/components/verificationEmail.vue')

const Dashboard = () =>
import('@/views/contrib/ContribuableDashboard.vue')

// ======================================================
// Routes
// ======================================================

const routes = [
	
	// ==================================================
	// Accueil
	// ==================================================
	
	{
		path: '/',
		name: 'Acceuil',
		component: Acceuil,
		
		meta: {
			guest: true,
			title: 'Portail contribuable'
		}
	},

// ==================================================
// Connexion
// ==================================================

{
	path: '/contrib_login',
	name: 'Login',
	component: Login,
	
	meta: {
		guest: true,
		title: 'Connexion'
	}
},

// ==================================================
// Inscription
// ==================================================

{
	path: '/contrib_register',
	name: 'Register',
	component: Register,
	
	meta: {
		guest: true,
		title: 'Enregistrer vos informations'
	}
},

// ==================================================
// Vérification email
// ==================================================

{
	path: '/verify-email',
	name: 'Verify_email',
	component: verifyEmail,
	
	meta: {
		title: 'Email de vérification'
	}
},

// ==================================================
// ESPACE CONTRIBUABLE
// ==================================================

{
	path: '/dashboard',
	name: 'ContribuablePortal',
	component: Dashboard,
	
	meta: {
		requiresAuth: true,
		roles: ['CONTRIBUABLE'],
		title: 'Espace contribuable'
	},
	
	children: [
		
		// ------------------------------------------
		// Tableau de bord
		// ------------------------------------------
		
		{
			path: '',
			name: 'ContribuableDashboard',
			
			component: () =>
			import('@/components/Contrubuable/PortalDashboard.vue'),
			
			meta: {
				requiresAuth: true,
				roles: ['CONTRIBUABLE'],
				title: 'Tableau de bord'
			}
		},
		
		// ------------------------------------------
		// Rendez-vous
		// ------------------------------------------
		
		{
			path: '/rendez-vous',
			name: 'ContribuableRendezVous',
			
			component: () =>
			import('@/components/Contrubuable/RendezVousListPage.vue'),
			
			meta: {
				requiresAuth: true,
				roles: ['CONTRIBUABLE'],
				title: 'Mes rendez-vous'
			}
		},
		
		// ------------------------------------------
		// Dossiers
		// ------------------------------------------
		
		{
			path: '/dossiers',
			name: 'ContribuableDossiers',
			
			component: () =>
			import('@/components/Contrubuable/DossiersFiscal.vue'),
			
			meta: {
				requiresAuth: true,
				roles: ['CONTRIBUABLE'],
				title: 'Deposez vos dossiers fiscaux'
			}
		},
		{
			path: '/create_dossiers',
			name: 'CreateDossier',
			
			component: () =>
			import('@/components/Contrubuable/createDossier.vue'),
			
			meta: {
				requiresAuth: true,
				roles: ['CONTRIBUABLE'],
				title: 'Mes dossiers fiscaux'
			}
		},
		
		// ------------------------------------------
		// Notifications
		// ------------------------------------------
		
		
		{
		    path: '/notifications',
		    name: 'ContribuableNotifications',
		
		    component: () =>
		        import('@/components/Contrubuable/notifications.vue'),
		
		    meta: {
		        requiresAuth: true,
		        roles: ['CONTRIBUABLE'],
		        title: 'Mes notifications'
		    }
		},
		
		// ------------------------------------------
		// Mon compte
		// ------------------------------------------
		
		
		
		{
		    path: '/mon-compte',
		    name: 'ContribuableCompte',
		
		    component: () =>
		        import('@/components/Contrubuable/myAccount.vue'),
		
		    meta: {
		        requiresAuth: true,
		        roles: ['CONTRIBUABLE'],
		        title: 'Mon compte'
		    }
		},
		
		{
			path: '/stat',
			name: 'Statistiques',
			
			component: () =>
			import('@/components/Statistique/contribuable/StatsPerformance.vue'),
			
			meta: {
				requiresAuth: true,
				roles: ['CONTRIBUABLE'],
				title: 'Voirs les statistiques des données'
			}
		}
	]
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
	// Récupération de l'authentification
	// ==================================================
	
	const token =
	localStorage.getItem('token')
	
	const rawUser =
	localStorage.getItem('currentUser')
	
	const isAuthenticated =
	!!token && !!rawUser
	
	// ==================================================
	// Route réservée aux visiteurs
	// ==================================================
	
	if (
		to.meta.guest &&
		isAuthenticated
	) {
		
		return {
			name: 'ContribuableDashboard'
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
	// Route sans rôle particulier
	// ==================================================
	
	if (
		!to.meta.roles ||
		!to.meta.roles.length
	) {
		
		document.title = to.meta.title
		? `${to.meta.title} — IMPOTS Manakara`
		: 'IMPOTS Manakara — Espace Contribuable'
		
		return true
	}
	
	// ==================================================
	// Lecture de currentUser
	// ==================================================
	
	let currentUser = null
	
	try {
		
		currentUser =
		JSON.parse(rawUser)
		
	} catch (error) {
		
		console.error(
			'❌ currentUser invalide :',
			error
		)
		
		localStorage.removeItem('currentUser')
		localStorage.removeItem('token')
		
		return {
			name: 'Login'
		}
	}
	
	// ==================================================
	// Récupération du rôle
	// ==================================================
	
	const userRole =
	currentUser?.role
	
	const allowedRoles =
	to.meta.roles
	
	// ==================================================
	// Vérification du rôle
	// ==================================================
	
	if (
		!userRole ||
		!allowedRoles.includes(userRole)
	) {
		
		console.warn(
			`❌ Accès refusé : rôle "${userRole}" non autorisé pour "${to.name}"`
		)
		
		return {
			name: 'Login'
		}
	}
	
	// ==================================================
	// Titre
	// ==================================================
	
	document.title = to.meta.title
	? `${to.meta.title} — IMPOTS Manakara`
	: 'IMPOTS Manakara — Espace Contribuable'
	
	return true
})

// ======================================================
// Export
// ======================================================

export default router
