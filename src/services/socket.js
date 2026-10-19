import { io } from 'socket.io-client'

const SOCKET_URL = /*import.meta.env.VITE_API_URL ||*/ 'http://localhost:3000'

console.log('🌐 SOCKET URL =', SOCKET_URL)

export const socket = io(SOCKET_URL, {
	autoConnect: false,
	reconnection: true,
	reconnectionAttempts: 5,
	reconnectionDelay: 2000,
	transports: ['polling', 'websocket']
})



socket.on('connect', () => {
	console.log('🟢 SOCKET SERVICE CONNECTÉ')
	console.log('🆔 ID :', socket.id)
})

socket.on('connect_error', (error) => {
	console.error('❌ SOCKET SERVICE ERROR :', error)
})

socket.on('disconnect', (reason) => {
	console.log('🔴 SOCKET SERVICE DISCONNECT :', reason)
})





export const connectSocket = () => {
	
	const token = localStorage.getItem('token')
	
	console.log('🔑 TOKEN SOCKET :', token ? 'présent' : 'ABSENT')
	console.log('🌐 URL SOCKET :', SOCKET_URL)
	console.log('📡 SOCKET CONNECTÉ AVANT :', socket.connected)
	
	if (!token) {
		console.error('❌ Token absent')
		return
	}
	
	socket.auth = {
		token
	}
	
	if (!socket.connected) {
		
		console.log('🔌 socket.connect()...')
		
		socket.connect()
		
	} else {
		
		console.log(
			'🟢 Socket déjà connecté :',
			socket.id
		)
	}
}

export const disconnectSocket = () => {
	
	if (socket.connected) {
		socket.disconnect()
	}
}

export default socket
