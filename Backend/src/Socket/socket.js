let io = null

export const initSocket = (socketIo) => {
	io = socketIo
}

export const getIO = () => {
	if (!io) {
		throw new Error('Socket.IO n’est pas initialisé.')
	}
	
	return io
}
