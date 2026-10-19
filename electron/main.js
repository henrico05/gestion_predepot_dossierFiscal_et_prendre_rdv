import { app, BrowserWindow, ipcMain,shell  } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'




const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win = null

function createWindow() {
	win = new BrowserWindow({
		width: 1300,
		height: 820,
		maxWidth: 1600,
		maxHeight: 1150,
		frame: false,
		minimizable: true,
		maximizable: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
							contextIsolation: true,
							nodeIntegration: false,
							sandbox: false
		}
	})
	win.setMinimumSize(800, 500)
	win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174')
	
	win.on('maximize', () => win?.webContents.send('window:maximizeChange', true))
	win.on('unmaximize', () => win?.webContents.send('window:maximizeChange', false))
	win.on('closed', () => { win = null })
}

function windowFrom(event) {
	return BrowserWindow.fromWebContents(event.sender)
}

ipcMain.on('window:minimize', (event) => {
	windowFrom(event)?.minimize()
})
ipcMain.on('window:maximize', (event) => {
	const w = windowFrom(event)
	if (!w) return
		if (w.isMaximized()) w.unmaximize()
			else w.maximize()
})
ipcMain.on('window:close', (event) => {
	windowFrom(event)?.close()
})
ipcMain.handle('window:isMaximized', (event) => {
	return windowFrom(event)?.isMaximized() ?? false
})



ipcMain.handle('print-ticket', async (_event, ticket) => {
	const printWindow = new BrowserWindow({
		show: false,
		width: 302,
		height: 1200,
		webPreferences: { sandbox: true, contextIsolation: true }
	})
	
	const html = `<!DOCTYPE html>
	<html>
	<head>
	<meta charset="utf-8">
	<title>Ticket ${ticket?.numero || ''}</title>
	<style>
	@page { size: 80mm auto; margin: 0; }
	html, body { width: 80mm; margin: 0; padding: 0; background: #fff; }
	* { box-sizing: border-box; }
	body { font-family: Inter, system-ui, sans-serif; color: #111; font-size: 11px; }
	.ticket { width: 74mm; padding: 4mm 3mm; }
	.ticket-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
	.ticket-icon { font-size: 18px; }
	.summary-eyebrow { display: block; font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	h3 { margin: 2px 0 0; font-size: 13px; }
	.ticket-number { text-align: center; padding: 8px 4px; margin: 8px 0; border: 1px dashed #111; }
	.ticket-number span { display: block; font-size: 8px; margin-bottom: 2px; }
	.ticket-number strong { display: block; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
	.ticket-divider { border-top: 1px dashed #111; margin: 8px 0; }
	.summary-row, .summary-list div {
		display: flex; justify-content: space-between; gap: 6px;
		padding: 3px 0; font-size: 10px;
	}
	dt { color: #444; }
	dd { margin: 0; font-weight: 700; text-align: right; max-width: 58%; }
	.ticket-message { margin-top: 8px; text-align: center; font-size: 9px; }
	.ticket-message p { margin: 3px 0 0; }
	</style>
	</head>
	<body><div class="ticket">${ticket?.html || ''}</div></body>
	</html>`
	
	try {
		await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
		
		const heightPx = await printWindow.webContents.executeJavaScript(
			'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)'
		)
		const heightMicrons = Math.max(50000, Math.ceil((heightPx / 96) * 25400))
		const pageSize = { width: 80000, height: heightMicrons }
		
		try {
			return await new Promise((resolve, reject) => {
				printWindow.webContents.print(
					{
						silent: false,
						printBackground: true,
						landscape: false,
						scaleFactor: 100,
						margins: { marginType: 'none' },
						pageSize
					},
					(ok, reason) => {
						if (ok) resolve(true)
							else if (reason && /cancel/i.test(reason)) resolve(false)
								else reject(new Error(reason || 'Impression échouée'))
					}
				)
			})
		} catch (err) {
			const msg = String(err?.message || err)
			if (!/enumerat/i.test(msg)) throw err
				
				const pdf = await printWindow.webContents.printToPDF({
					printBackground: true,
					landscape: false,
					pageSize,
					margins: { marginType: 'none' }
				})
				
				const file = path.join(os.tmpdir(), `ticket-${ticket?.numero || Date.now()}.pdf`)
				await fs.writeFile(file, pdf)
				
				try {
					await execFileAsync('lp', ['-o', 'media=Custom.80x297mm', '-o', 'fit-to-page', file])
					return true
				} catch {
					await shell.openPath(file)
					return true
				}
		}
	} finally {
		if (!printWindow.isDestroyed()) printWindow.close()
	}
})

const execFileAsync = promisify(execFile)

if (process.platform === 'linux') {
	app.commandLine.appendSwitch('ozone-platform-hint', 'x11')
}

app.whenReady().then(() => {
	createWindow()
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
