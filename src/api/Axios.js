import axios from 'axios'
import { useToast } from 'vue-toastification'
import router from '@/router/index'

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
	timeout: 15000,
	headers: {
		Accept: 'application/json'
	}
})

let redirectingAuth = false

function getStoredUser() {
	for (const store of [localStorage, sessionStorage]) {
		const raw = store.getItem('currentUser')
		if (!raw) continue
			try { return JSON.parse(raw) } catch { /* ignore */ }
	}
	return null
}

function detectPortal() {
	const stored = localStorage.getItem('portal') || sessionStorage.getItem('portal')
	if (stored === 'agent' || stored === 'contribuable') return stored
		
		const path = window.location.pathname || ''
		
		if (
			path.startsWith('/contrib_login') ||
			path.startsWith('/dashboard') ||
			path.startsWith('/rendez-vous') ||
			path.startsWith('/dossiers') ||
			path.startsWith('/notifications') ||
			path.startsWith('/mon-compte') ||
			path.startsWith('/stat')
		) return 'contribuable'
		
		if (
			path.startsWith('/dashAgent') ||
			path.startsWith('/login') ||
			path.startsWith('/agent')
		) return 'agent'
		
		const user = getStoredUser()
		if (user) {
			const role = String(user.role || user.type || '').toUpperCase()
			if (role === 'CONTRIBUABLE') return 'contribuable'
				if (['CHEF_CENTRE', 'GUICHETIER', 'VERIFICATEUR'].includes(role) || user.matricule) {
					return 'agent'
				}
		}
		
		return 'agent'
}

function clearSession() {
	localStorage.removeItem('token')
	localStorage.removeItem('currentUser')
	sessionStorage.removeItem('token')
	sessionStorage.removeItem('currentUser')
}

function alreadyOnLogin(portal) {
	const path = window.location.pathname || ''
	if (portal === 'contribuable') {
		return path.startsWith('/contrib_login')
	}
	return path === '/login' || path === '/' || path.startsWith('/login')
}

function redirectToPortalLogin(portal) {
	if (redirectingAuth || alreadyOnLogin(portal)) return
		redirectingAuth = true
		
		clearSession()
		
		const target = portal === 'contribuable'
		? { path: '/contrib_login' }
		: { name: 'Login' }
		
		const fallback = portal === 'contribuable' ? '/contrib_login' : '/login'
		
		router.replace(target).catch(() => {
			return router.replace({ path: fallback }).catch(() => {
				window.location.replace(fallback)
			})
		}).finally(() => {
			setTimeout(() => { redirectingAuth = false }, 1500)
		})
}

api.interceptors.request.use(
	(config) => {
		let token = localStorage.getItem('token') || sessionStorage.getItem('token')
		
		if (!token) {
			const user = getStoredUser()
			token = user?.token || user?.accessToken || null
		}
		
		if (token) {
			config.headers = config.headers || {}
			config.headers.Authorization = `Bearer ${token}`
		}
		
		if (config.data instanceof FormData) {
			delete config.headers['Content-Type']
		}
		
		return config
	},
	(error) => Promise.reject(error)
)

api.interceptors.response.use(
	(response) => response,
							  (error) => {
								  const toast = useToast()
								  
								  if (error.response) {
									  const status = error.response.status
									  const message = error.response.data?.message || 'Une erreur est survenue'
									  const skipAuth = error.config?.skipAuthRefresh === true
									  
									  switch (status) {
										  case 400:
											  toast.warning(message)
											  break
											  
										  case 401: {
											  if (skipAuth) {
												  toast.error(message)
												  break
											  }
											  
											  toast.error('Session expirée. Veuillez vous reconnecter.')
											  redirectToPortalLogin(detectPortal())
											  break
										  }
										  
										  case 403:
											  toast.info(message || 'Accès refusé')
											  break
											  
										  case 404:
											  if (!redirectingAuth) toast.error('Ressource introuvable')
												  break
												  
										  case 422:
											  toast.warning(message)
											  break
											  
										  case 500:
											  toast.error('Erreur serveur. Réessayez plus tard.')
											  break
											  
										  default:
											  toast.error(message)
									  }
								  } else if (error.request) {
									  toast.error('Impossible de contacter le serveur')
								  } else {
									  toast.error('Erreur inattendue')
								  }
								  
								  return Promise.reject(error)
							  }
)

export default api
