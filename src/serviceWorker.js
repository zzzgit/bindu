import config from '../config/config.js'
import { fnv1aHash, getSettings, performFetch } from './utils.js'

const BINDU_ID = 'bindu'
const settings = {}
const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen.html'

getSettings().then((result)=> {
	Object.assign(settings, result)
	return settings
}).catch((err)=> {
	console.error('Failed to get settings:', err)
})

config.searchEngines.forEach((engine)=> {
	if (!engine.id){
		engine.id = fnv1aHash(engine.name + engine.url)
	}
})

const handleRuntimeInstalled = ()=> {
	// eslint-disable-next-line promise/catch-or-return
	chrome.contextMenus.removeAll().then(()=> {
		// create 不支持 promise-based API
		const ids = chrome.contextMenus.create({
			id: BINDU_ID,
			title: 'Bindu',
			contexts: ['selection'],
		}, ()=> {
			config.searchEngines.forEach((engine)=> {
				chrome.contextMenus.create({
					id: engine.id,
					parentId: BINDU_ID,
					title: engine.name,
					contexts: ['selection'],
				})
			})
		})
		return ids
	})
	setupOffscreenDocument()
}

const handleRuntimeMessage = (message, sender, sendResponse)=> {
	if (message.type === 'BG_GET_API'){
		const api = config.apis[settings.api]
		sendResponse({ api })
		return true
	}
	if (message.type === 'BG_GET_WEBSTER_HTML'){
		const word = message.payload.word
		const url = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`
		performFetch(url, { redirect: 'follow' }).then(html=> sendResponse({ html }))
			.catch((err)=> {
				sendResponse({ error: err.message })
			})
		return true
	}
	if (message.type === 'LOG'){
		console.log('LOG event:', message.payload)
	}
	if (message.type === 'FETCH_REQUEST'){
		performFetch(message.url, message.options)
			.then((data)=> {
				sendResponse({ success: true, data })
				return true
			})
			.catch((error)=> {
				sendResponse({ success: false, error: error.message })
			})
		return true
	}
	if(message.type === 'ENSURE_OFFSCREEN_DOCUMENT'){
		setupOffscreenDocument().then(()=> {
			return sendResponse({ success: true })
		}).catch((error)=> {
			sendResponse({ success: false, error: error.message })
		})
		return true
	}
}

const hasOffscreenDocument = ()=> {
	return Promise.resolve('getContexts' in chrome.runtime).then((supported)=> {
		if (!supported){
			return false
		}
		return chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
		// eslint-disable-next-line promise/no-nesting
		}).then(contexts=> contexts.length > 0)
	})
}

const setupOffscreenDocument = ()=> {
	return hasOffscreenDocument().then((exists)=> {
		if (exists){
			return null
		}
		return chrome.offscreen.createDocument({
			url: OFFSCREEN_DOCUMENT_PATH,
			reasons: ['AUDIO_PLAYBACK'],
			justification: 'Play audio from an URL in the background.',
		})
	})
}

const openTabForDict = (engine, keyword)=> {
	const url = engine.url.replace('%s', encodeURIComponent(keyword))
	chrome.tabs.create({ url })
}

const handleMenuClick = (info, _tab)=> {
	const selection = info.selectionText
	const engine = config.searchEngines.find(engine=> engine.id === info.menuItemId)
	if (!engine){
		return null
	}
	openTabForDict(engine, selection)
}

const handleActionClick = (tab)=> {
	// eslint-disable-next-line promise/catch-or-return
	chrome.tabs.sendMessage(tab.id, { type: 'getHighlightedText' }).then((response)=> {
		if (!response?.text){
			console.log('no text selected')
			return null
		}
		const engine = config.searchEngines.find(engine=> engine.name == 'gt')
		openTabForDict(engine, response.text || '')
		return null
	})
}

chrome.action.onClicked.addListener(handleActionClick)

chrome.contextMenus.onClicked.addListener(handleMenuClick)

chrome.runtime.onMessage.addListener(handleRuntimeMessage)

chrome.runtime.onStartup.addListener(()=> {
	setupOffscreenDocument()
})

chrome.runtime.onInstalled.addListener(handleRuntimeInstalled)
