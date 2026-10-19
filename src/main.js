import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import routerContrib from './router/routeContribuable.js'
import Toast from "vue-toastification"
import "vue-toastification/dist/index.css"
import contribApp from './contribuable.vue'
import './style.css'
import './assets/input.css'

const isWeb = import.meta.env.MODE === 'web'

const app = createApp(
	isWeb ? contribApp : App
);

const options = {
	// Position & comportement
	position: 'top-right',
	timeout: 3500,
	closeOnClick: true,
	pauseOnFocusLoss: true,
	pauseOnHover: true,
	draggable: true,
	draggablePercent: 0.6,
	showCloseButtonOnHover: false,
	hideProgressBar: false,
	closeButton: 'button',
	icon: true,
	rtl: false,
	
	// Transitions plus modernes
	transition: 'Vue-Toastification__bounce',
	maxToasts: 4,
	newestOnTop: true,
	
	// Styles par type (optionnel mais recommandé)
	toastClassName: 'modern-toast',
	bodyClassName: ['modern-toast-body'],
	progressClassName: 'modern-progress'
}

app.use(
	isWeb ? routerContrib : router
)
app.use(Toast, options)
app.mount('#app')
