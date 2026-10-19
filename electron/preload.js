import { contextBridge, ipcRenderer,webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	
	isElectron: true,
	platform: process.platform,
	minimize: () => ipcRenderer.send('window:minimize'),
								maximize: () => ipcRenderer.send('window:maximize'),
								close: () => ipcRenderer.send('window:close'),
								isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
								onMaximizeChange: (callback) => {
									const listener = (_e, isMaximized) => callback(isMaximized)
									ipcRenderer.on('window:maximizeChange', listener)
									return () => ipcRenderer.removeListener('window:maximizeChange', listener)
								},
								printTicket: (ticket) => ipcRenderer.invoke('print-ticket', ticket),
								getPathForFile: (file) => {
									try {
										return webUtils.getPathForFile(file)
									} catch (err) {
										console.error('❌ getPathForFile :', err)
										return null
									}
								},
})
