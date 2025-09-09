const createAudio = (url)=> {
	return new Promise((resolve, reject)=> {
		try {
			resolve(new Audio(url))
		} catch(error){
			reject(error)
			return
		}
	})
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse)=> {
	if (message.type === 'PLAY_AUDIO'){
		createAudio(message.url).then((audio)=> {
			return audio.play()
		})
			.then(()=> {
				sendResponse({ success: true })
				return true
			})
			.catch((error)=> {
				log('Error playing audio:', error)
				sendResponse({ success: false, error: error.message })
			})
		return true
	}
})

const log = (str)=> {
	chrome.runtime.sendMessage({
		type: 'LOG',
		payload: str,
	})
}
