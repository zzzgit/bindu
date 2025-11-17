import defaultSettings from '../config/defaultSettings.js'

const canonLangs = {
	JAPANESE: 'jpn',
	ENGLISH: 'eng',
	TAGALOG: 'tgl',
	CHINESE: 'cho',
	SPANISH: 'spa',
}

const free2canonLang = (lang)=> {
	const free2canon_map = {
		en: canonLangs.ENGLISH,
		jp: canonLangs.JAPANESE,
		ja: canonLangs.JAPANESE,
		tl: canonLangs.TAGALOG,
		zh: canonLangs.CHINESE,
		es: canonLangs.SPANISH,
	}
	return free2canon_map[lang] || canonLangs.ENGLISH
}

const canon2freeLang = (lang)=> {
	const canon2free_map = {
		[canonLangs.ENGLISH]: 'en',
		[canonLangs.JAPANESE]: 'ja',
		[canonLangs.TAGALOG]: 'tl',
		[canonLangs.CHINESE]: 'zh',
		[canonLangs.SPANISH]: 'es',
	}
	return canon2free_map[lang] || 'en'
}

const generateUUID = ()=> {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let ssid = ''
	for (let i = 0; i < 10; i++){
		ssid += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return ssid
}

const fnv1aHash = (str)=> {
	let hash = 0x811C9DC5
	for (let i = 0; i < str.length; i++){
		hash ^= str.charCodeAt(i)
		hash = hash * 0x01000193 >>> 0
	}
	const result = hash >>> 0
	return result.toString(16)
}

const getCurrentTab = ()=> chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs=> tabs[0])

const playSound = (url)=> {
	const audio = new Audio(url)
	audio.play().catch((error)=> {
		console.error('Error playing audio:', error)
	})
}

const getSettings = ()=> {
	return chrome.storage.sync.get(null).then((stored)=> {
		const personal = stored || {}
		return mergeConfigs(defaultSettings, personal)
	}).catch((error)=> {
		console.error('Error loading settings from storage:', error)
		return mergeConfigs(defaultSettings, {})
	})
}

const saveSettings = (settings)=> {
	return chrome.storage.sync.set(settings)
}

const mergeConfigs = (config1, config2, options = {})=> {
	const { mergeArrays = false } = options

	if (!config2){ return config1 || {} }
	if (!config1){ return config2 || {} }
	if (typeof config1 !== 'object' || typeof config2 !== 'object'){
		return config2
	}
	if (Array.isArray(config1) && Array.isArray(config2)){
		return mergeArrays ? [...config1, ...config2] : config2
	}
	const result = { ...config1 }
	for (const [key, val2] of Object.entries(config2)){
		const val1 = config1[key]
		if (val1 && val2 && typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1) && !Array.isArray(val2)){
			result[key] = mergeConfigs(val1, val2, options)
		} else {
			result[key] = val2
		}
	}
	return result
}

const performFetch = (url, options = {})=> {
	return fetch(url, options).then((response)=> {
		if (!response.ok){
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const contentType = response.headers.get('content-type')
		if (contentType && contentType.includes('application/json')){
			return response.json()
		}
		if (contentType && contentType.includes('text/')){
			return response.text()
		}
		const blob = response.blob()
		return {
			type: 'blob',
			blob: blob,
		}
	})
}

const checkLanguage = (word)=> {
	const hiraganaKatakanaRegex = /[\u3040-\u30FF]/
	if (hiraganaKatakanaRegex.test(word)){
		return canonLangs.JAPANESE
	}
	const chineseRegex = /[\u4E00-\u9FFF]/
	if (chineseRegex.test(word)){
		return canonLangs.CHINESE
	}
	const latinRegex = /^[A-Za-z\s'-]+$/
	if (latinRegex.test(word)){
		return canonLangs.ENGLISH
	}
	return 'other'
}

export {
	generateUUID, getCurrentTab, playSound, getSettings, saveSettings, fnv1aHash, performFetch, checkLanguage, canonLangs, free2canonLang, canon2freeLang,
}

