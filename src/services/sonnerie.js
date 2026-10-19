import { Howl } from 'howler'

const sounds = {
	success: new Howl({
		src: ['/audio/success.mp3']
	}),
	
	error: new Howl({
		src: ['/audio/error.mp3']
	}),
	
	warning: new Howl({
		src: ['/audio/warning.mp3']
	}),
	
	notification: new Howl({
		src: ['/audio/notification1.mp3']
	}),
	
	delete: new Howl({
		src: ['/audio/delete.mp3']
	}),
	
	update: new Howl({
		src: ['/audio/update.mp3']
	}),
	
	connection: new Howl({
		src: ['/audio/loginSuccess.mp3']
	}),
	
	disconnection: new Howl({
		src: ['/audio/deconnecte.mp3']
	})
}

export const playSound = (type) => {
	if (sounds[type]) {
		sounds[type].play()
	}
}
