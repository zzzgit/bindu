import config from '../config/config.js'
import {
	canon2freeLang, canonLangs, checkLanguage, fnv1aHash, free2canonLang, getSettings, performFetch,
} from './utils.js'

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

const dictionaryapiAdapter = (data)=> {
	if (!Array.isArray(data)){
		throw new Error('Input data must be an array')
	}

	const firstEntry = data[0]
	const searchResult = {
		word: firstEntry.word,
		language: canonLangs.ENGLISH,
		etymologyEntries: data.map(entry=> ({
			phonetics: entry.phonetics.map(phonetic=> ({
				text: phonetic.text,
				audio: phonetic.audio,
			})),
			etymology: entry.origin,
			meanings: entry.meanings.map(meaning=> ({
				partOfSpeech: meaning.partOfSpeech,
				definitions: meaning.definitions.map(def=> ({
					definition: def.definition,
					examples: def.example ? [def.example] : [],
					synonyms: def.synonyms,
					antonyms: def.antonyms,
				})),
			})),
		})),
	}

	return searchResult
}

const freedictionaryapiAdapter = (data)=> {
	if (!data || typeof data !== 'object'){
		throw new Error('Input must be an object matching the Wiktionary-like schema')
	}

	const word = data.word || ''
	const firstEntry = Array.isArray(data.entries) && data.entries[0]
	const language = firstEntry && firstEntry.language && firstEntry.language.code ? firstEntry.language.code : undefined

	const etymologyEntries = (data.entries || []).map(entry=> ({
		phonetics: (entry.pronunciations || []).map(p=> ({
			text: p.text || '',
			audio: p.audio || undefined,
			type: p.type || undefined,
			tags: Array.isArray(p.tags) ? p.tags : [],
		})),
		etymology: undefined,
		meanings: [
			{
				partOfSpeech: entry.partOfSpeech || '',
				definitions: (entry.senses || []).map(sense=> ({
					definition: sense.definition || '',
					examples: Array.isArray(sense.examples) ? sense.examples : [],
					synonyms: [
						...Array.isArray(sense.synonyms) ? sense.synonyms : [],
						...Array.isArray(entry.synonyms) ? entry.synonyms : [],
					],
					antonyms: [
						...Array.isArray(sense.antonyms) ? sense.antonyms : [],
						...Array.isArray(entry.antonyms) ? entry.antonyms : [],
					],
				})),
			},
		],
	}))

	return {
		word,
		language: free2canonLang(language),
		etymologyEntries,
		source: data.source ? data.source : undefined,
	}
}

const wordsapiAdapter = (data)=> {
	if (!data || typeof data !== 'object'){
		throw new Error('Input must be an object')
	}

	const word = data.word || ''
	const results = Array.isArray(data.results) ? data.results : []

	const groupedByPos = {}
	results.forEach((result)=> {
		const pos = result.partOfSpeech || 'unknown'
		if (!groupedByPos[pos]){
			groupedByPos[pos] = []
		}
		groupedByPos[pos].push(result)
	})

	const phonetics = []
	if (data.pronunciation){
		if (data.pronunciation.all){
			phonetics.push({
				text: data.pronunciation.all,
			})
		}
	}

	const meanings = Object.entries(groupedByPos).map(([partOfSpeech, resultList])=> ({
		partOfSpeech,
		definitions: resultList.map(result=> ({
			definition: result.definition || '',
			examples: result.examples || [],
			synonyms: result.synonyms || [],
			antonyms: result.antonyms || [],
		})),
	}))

	const etymologyEntries = [{
		phonetics: phonetics.length ? phonetics : undefined,
		etymology: undefined,
		meanings,
	}]

	return {
		word,
		language: canonLangs.ENGLISH,
		etymologyEntries,
	}
}

console.log(wordsapiAdapter)

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
	const word = message.payload?.word
	const lang = checkLanguage(word)
	const calculateURL = ()=> {
		let template = config.apis['dictionaryapi']
		if(lang !== canonLangs.ENGLISH){
			template = config.apis['freedictionaryapi']
		}
		const url = template.replace('%lang', canon2freeLang(lang)).replace('%s', encodeURIComponent(word))
		return url
	}
	if (message.type === 'BG_GET_API'){
		const api = calculateURL()
		sendResponse({ api })
		return true
	}
	if(message.type === 'BG_FETCH_CANON'){
		const api = calculateURL()
		performFetch(api).then((rawData)=> {
			// eslint-disable-next-line no-useless-assignment
			let data = null
			if(lang === canonLangs.ENGLISH){
				data = dictionaryapiAdapter(rawData)
			} else {
				data = freedictionaryapiAdapter(rawData)
			}
			sendResponse({ success: true, data })
			return true
		})
			.catch((error)=> {
				sendResponse({ success: false, error: error.message })
			})
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
	if(message.type === 'BG_CHECK_LANGUAGE'){
		const word = message.payload.word
		const lang = checkLanguage(word)
		sendResponse({ lang })
		return true
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
