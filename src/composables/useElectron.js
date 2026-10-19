import { ref, onMounted, onUnmounted } from 'vue'

export function useElectron() {
	const isElectron = typeof window !== 'undefined' && !!window.electronAPI
	const isMaximized = ref(false)
	let offMaximize = null
	
	const minimize = () => window.electronAPI?.minimize()
	const maximize = () => window.electronAPI?.maximize()
	const close = () => window.electronAPI?.close()
	
	onMounted(async () => {
		console.log('electronAPI =', window.electronAPI)
		if (!window.electronAPI) return
			isMaximized.value = await window.electronAPI.isMaximized()
			offMaximize = window.electronAPI.onMaximizeChange((val) => {
				isMaximized.value = val
			})
	})
	
	onUnmounted(() => {
		offMaximize?.()
	})
	
	return { isElectron, isMaximized, minimize, maximize, close }
}
