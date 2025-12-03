let definitionWindow = null

const detectOS = ()=> {
	const userAgent = navigator.userAgent
	if (userAgent.includes('Win')){
		return 'os-windows'
	} else if (userAgent.includes('Mac')){
		return 'os-mac'
	} else if (userAgent.includes('Linux')){
		return 'os-linux'
	}
}

const html = (strings, ...values)=> {
	const normalized = values.map((v)=> {
		if (Array.isArray(v)){
			return v.map(item=> item).join('')
		}
		return v
	})

	const output = strings.reduce((acc, str, i)=> acc + str + (normalized[i] ?? ''), '')

	return output.replace(/<template if=([^>]+)>([\s\S]*?)<\/template>/g, (_, cond, content)=> {
		const isTrue = (()=> {
			try {
				return !!eval(cond)
			} catch {
				return false
			}
		})()
		return isTrue ? content : ''
	})
}

class FloatingWindow{

	constructor(){
		this.host = document.createElement('div')
		this.host.className = 'bindu-window'
		this.shadowRoot = this.host.attachShadow({ mode: 'open' })
		this.isMouseOver = false
		this.autoHideTimer = null
		this.fadeOutTimer = null
		this.fadeInDuration = 0.7
		this.fadeOutDuration = 1.5
		this.maxOpacity = 0.9
		this.delayAfterShow = 8
		this.delayAfterMouseLeave = 2
		this.windowWidth = 400
		this.windowMinHeight = 100
		this.windowMaxHeight = 200
		this.offset = 10
		this.render()
		this._setupEventListeners()
	}

	_setupEventListeners(){
		const container = this.shadowRoot.querySelector('.bindu')
		container.addEventListener('mouseenter', ()=> {
			this.isMouseOver = true
			clearTimeout(this.autoHideTimer)
			clearTimeout(this.fadeOutTimer)
		})
		container.addEventListener('mouseleave', ()=> {
			this.isMouseOver = false
			this.scheduleAutoHide(this.delayAfterMouseLeave * 1000)
		})
	}

	show(word, x, y){
		this.host.setAttribute('aria-label', `Definition of ${word}`)
		this.host.dataset.word = word
		if (!this.host.isConnected){
			document.body.appendChild(this.host)
		}
		this._positionWindow(x, y)
		this.host.classList.add('is-visible')
		this.scheduleAutoHide(this.delayAfterShow * 1000)
	}

	_positionWindow(x, y){
		if (x + this.offset + this.windowWidth > window.innerWidth){
			this.host.style.right = Math.max(window.innerWidth - x, this.offset) + 'px'
		} else{
			this.host.style.left = x + this.offset + 'px'
		}
		const windowHeight = this.host.offsetHeight
		if (y + this.offset + windowHeight > window.innerHeight){
			this.host.style.bottom = Math.max(window.innerHeight - y, this.offset) + 'px'
		} else{
			this.host.style.top = y + this.offset + 'px'
		}
	}

	scheduleAutoHide(delay){
		clearTimeout(this.autoHideTimer)
		clearTimeout(this.fadeOutTimer)
		this.autoHideTimer = setTimeout(()=> {
			this.host.classList.add('is-removing')
			this.host.classList.remove('is-visible')
			this.fadeOutTimer = setTimeout(()=> {
				this.close()
			}, this.fadeOutDuration * 1000)
		}, delay)
	}

	close(){
		clearTimeout(this.autoHideTimer)
		clearTimeout(this.fadeOutTimer)
		const evt = new CustomEvent('closed', { bubbles: true, composed: true })
		this.host.dispatchEvent(evt)
		if (this.host.isConnected){
			this.host.remove()
		}
	}

	render(){
		// variables in :root doesn't work at all 
		this.shadowRoot.innerHTML = `
			<style>
				:root {
				}
				*,
				*::before,
				*::after {
					box-sizing: inherit;
				}
				:host {
					display: block;
					box-sizing: border-box;
					position: fixed;
					width: ${this.windowWidth}px;
					min-height: ${this.windowMinHeight}px;
					max-height: ${this.windowMaxHeight}px;
					overflow-y: auto;
					opacity: 0;
					border-radius: 8px;
					transition: opacity ${this.fadeInDuration}s ease-in-out;
					aria-modal: true;
					z-index: 2147483647;
				}
				:host(.is-visible) {
					opacity: ${this.maxOpacity};
				}
				:host(.is-removing) {
					transition-duration: ${this.fadeOutDuration}s;
				}
				:host(:not(.os-mac))::-webkit-scrollbar {
					width: 0; 
				}
				.bindu {
					width: 100%;
					height: 100%;
					background: rgba(30, 30, 30, 1);
					padding: 2px 4px;
					color: #ffffff;
					border-radius: 8px;
					box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
					overflow: auto;
					border: 1px solid rgba(255, 255, 255, 0.1);
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
					backdrop-filter: blur(4px);
					scrollbar-width: 4px;
				}

				.bindu__loading,
				.bindu__error {
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100px;
					color: #cccccc;
					font-size: 16px;
				}

				.definition-container {
					font-size: 14px;
					line-height: 1.5;
					display: flex;
					flex-direction: column;
					gap: 12px;
				}

				.etymology-card {
					display: flex;
					flex-direction: column;
					gap: 6px;
				}

				.etymology-card__separator {
					margin: 0px;
					width: 150px;
					border: none;
					border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				}

				.phonetics-container {
					display: flex;
					flex-wrap: wrap;
					gap: 12px;
					align-items: center;
				}

				.etymology-language {
					font-size: 11px;
					color: #cccccc;
					margin: 0 4px;
					user-select: none;
					background: rgba(255, 255, 255, 0.1);
					font-weight: 300;
					padding: 0px 4px;
				}

				.etymology-phonetic {
					display: flex;
					align-items: center;
					margin: 0;
				}

				.etymology-phonetic__text {
					font-family: monospace;
					background: rgba(255, 255, 255, 0.05);
					font-size: 12px;
					user-select: none;
				}

				.etymology-phonetic__text.has-audio {
					cursor: pointer;
				}

				.etymology-phonetic__text.has-audio:hover {
					color: #4fc3f7;
				}

				.etymology-phonetic__play {
					display: flex;
					justify-content: center;
					align-items: center;
					width: 16px;
					height: 16px;
					display: inline-block;
					cursor: pointer;
					opacity: 0.7;
					transition: all 0.2s ease;
				}

				.etymology-phonetic__play:hover {
					opacity: 1;
					transform: scale(1.1);
				}

				.definition-list {
					margin: 0;
					padding: 0;
					font-size: 14px;
					line-height: 1.4;
				}

				.definition-list__part {
					font-weight: 600;
					font-size: 14px;
					color: #80C2A0;
					margin-bottom: 4px;
					text-transform: lowercase;
					letter-spacing: 0.5px;
				}

				.definition-list__item {
					margin: 0 0 4px 0;
					padding-left: 10px;
					position: relative;
				}

				.definition-list__item::before {
					content: "•";
					position: absolute;
					left: 0;
					color: #E0E0E0;
					/** more the 14 will cause layout shift **/
					font-size: 14px;
				}

				.definition-sentence {
					color: #a0a0a0;
					padding: 0 4px;
					margin-top: 4px;
					border-left: 1px solid rgba(255, 255, 255, 0.1);
					font-size: 13px;
				}

				.definition-sentence__prefix {
					opacity: 0.4;
					user-select: none;
					font-size: 10px;
				}

				.definition-sentence__text {
					font-style: italic;
				}
			</style>
			<div class="bindu" role="dialog"></div>
		`
		this.contentEl = this.shadowRoot.querySelector('.bindu')
		this.host.classList.add(detectOS())
	}

	setContent(node){
		if (!this.contentEl){
			return null
		}
		this.contentEl.innerHTML = ''
		if (typeof node === 'string'){
			this.contentEl.innerHTML = node
			return null
		}
		this.contentEl.appendChild(node)
	}

}

const handleRuntimeMessage = (msg, sender, sendResponse)=> {
	console.log('[bindu][handleRuntimeMessage]: Content script received message:', msg)
	if (msg?.type === 'getHighlightedText'){
		const selectedText = window.getSelection().toString()
		sendResponse({ text: selectedText })
	}
}

const escapeHtml = (str = '')=> {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

const fetchIt = (url, options = {})=> {
	return chrome.runtime.sendMessage({
		type: 'FETCH_REQUEST',
		url,
		options,
	}).then((res)=> {
		if (!res.success){
			throw new Error(res.error || 'Failed to fetch definition.')
		}
		return res.data
	})
}
const fetchCanonData = (word, options = {})=> {
	return chrome.runtime.sendMessage({
		type: 'BG_FETCH_CANON',
		payload: { word },
		options,
	}).then((res)=> {
		if (!res.success){
			throw new Error(res.error || 'Failed to fetch definition.')
		}
		return res.data
	})
}

const playIt = (url)=> {
	return chrome.runtime.sendMessage({
		type: 'ENSURE_OFFSCREEN_DOCUMENT',
	}).then((res)=> {
		if (!res.success){
			throw new Error(res.error || 'Failed to ensure offscreen document.')
		}
		return chrome.runtime.sendMessage({
			type: 'PLAY_AUDIO',
			url,
		})
	}).then((res)=> {
		if (!res.success){
			throw new Error(res.error || 'Failed to play audio.')
		}
		return true
	})
}

const fetchAndPlayVoice = (word)=> {
	return getWebsterHtml(word)
		.then((html)=> {
			const parser = new DOMParser()
			const doc = parser.parseFromString(html, 'text/html')
			const audioElem = doc.querySelector('.entry-word-section-container a.play-pron-v2')
			return audioElem
		})
		.then((audioElem)=> {
			if (!audioElem){
				throw new Error('No audio found for this word: ' + word)
			}
			const audioUrl = audioElem.getAttribute('data-file')
			const category = audioElem.getAttribute('data-dir')
			let subdomain = 'media'
			if (audioUrl.startsWith('gg')){
				subdomain = 'media2'
			} else if ((/^[0-9]/).test(audioUrl.charAt(0))){
				subdomain = 'media3'
			}
			const fullAudioUrl = `https://${subdomain}.merriam-webster.com/audio/prons/en/us/mp3/${category}/${audioUrl}.mp3`
			return fullAudioUrl
		})
		.then((url)=> {
			return playIt(url)
		})
		.catch((err)=> {
			console.error('[bindu][fetchAndPlayVoice]: Error fetching voice:', err)
		})
}

const checkLanguage = (word)=> {
	return chrome.runtime.sendMessage({ type: 'BG_CHECK_LANGUAGE', payload: { word } }).then((response)=> {
		return response.lang
	})
}
const handleDocMouseup = (e)=> {
	if (!e.altKey || !(e.metaKey || e.ctrlKey)){ return }
	const selection = window.getSelection()
	const text = selection?.toString().trim()
	if (text){
		showDefinitionWindow(text, e.clientX, e.clientY)
		fetchAndDisplayDefinition(text)
		checkLanguage(text).then((lang)=> {
			if(lang !== 'en'){
				return { autoPlay: false }
			}
			return chrome.storage.sync.get(['autoPlay'])
		}).then((items)=> {
			if (items.autoPlay){
				fetchAndPlayVoice(text)
			}
			return true
		})
			.catch((err)=> {
				console.error('[bindu][handleDocMouseup]: Error getting autoPlay setting:', err)
			})
	}
}

const showDefinitionWindow = (word, x, y)=> {
	if (definitionWindow){
		definitionWindow.scheduleAutoHide(0)
	}
	definitionWindow = new FloatingWindow()
	definitionWindow.show(word, x, y)
}

const renderError = (message)=> {
	const msg = message || 'An error occurred.'
	return getEle(error_tmpl({ message: msg }))
}

const renderLoading = (text)=> {
	return getEle(loading_tmpl({ text }))
}

const getApi = (word)=> {
	return chrome.runtime.sendMessage({ type: 'BG_GET_API', payload: { word } }).then((response)=> {
		return response.api
	})
}

console.log(!!fetchIt && !!getApi ? '' : '')

const getWebsterHtml = (word)=> {
	return chrome.runtime.sendMessage({ type: 'BG_GET_WEBSTER_HTML', payload: { word } }).then((response)=> {
		if(response?.error){
			throw new Error(response.error)
		}
		return response.html
	})
}

const switchContent = (newContent)=> {
	if (!definitionWindow){ return }
	definitionWindow.setContent(newContent)
}

const fetchAndDisplayDefinition = (word, desiredLang)=> {
	const loadingContainer = renderLoading('Loading...')
	switchContent(loadingContainer)
	fetchCanonData(word, { desiredLang })
		.then((data)=> {
			return switchContent(renderDictionary(data))
		})
		.catch((err)=> {
			console.error('[bindu][fetchAndDisplayDefinition]: Error fetching definition:', err)
			const msg = err || 'Could not load definition. Please try again.'
			switchContent(renderError(msg))
		})
}

const translateTag = (tags)=> {
	const tagMap = {
		Guangzhou: 'Canto.',
		Taipei: 'Min.',
		Xiamen: 'Min.',
	}
	for (const tag of tags){
		if (tagMap[tag]){
			return tagMap[tag]
		}
	}
	return 'other'
}

const error_tmpl = (props)=> {
	const str = html`
<div class="bindu__error">
	<p>${escapeHtml(props.message)}</p>
</div>
	`
	return str.trim()
}

const loading_tmpl = (props)=> {
	const str = html`
<div class="bindu__loading">
	<p>${escapeHtml(props.text || 'Loading...')}</p>
</div>
	`
	return str.trim()
}

const phoneticsContainer_tmpl = ()=> {
	const str = html`
<div class="phonetics-container">
</div>
	`
	return str.trim()
}

const phonetics_tmpl = (props, lang)=> {
	const tags = props.tags || []
	const speaker = '<span class="etymology-phonetic__play" title="Play pronunciation">🔊</span>'
	const str = html`
<p class="etymology-phonetic">
	<span class="etymology-phonetic__text${props.audio ? ' has-audio' : ''}">
		<template if=${lang === 'cho'}>
			<span class="etymology-phonetic__tag">${translateTag(tags)}</span>
		</template>
		${escapeHtml(props.text) || speaker}
	</span>
	
</p>
	`
	return str.trim()
}

const sentence_tmpl = (props)=> {
	const str = html`
<div class="definition-sentence">
	<span class="definition-sentence__prefix">e.g. </span>
	<span class="definition-sentence__text">${escapeHtml(props.example)}</span>
</div>
	`
	return str.trim()
}

const meaning_tmpl = (props)=> {
	const str = html`
<dl class="definition-list">
	<dt class="definition-list__part">${props.partOfSpeech}</dt>
	${props.definitions.map(def=> definition_tmpl({ def }))}
</dl>
	`
	return str.trim()
}

const definition_tmpl = (props)=> {
	const { def } = props
	const str = html`
<dd class="definition-list__item">
	${escapeHtml(def.definition)}
	<template if=${def.examples}>
		${def.examples.map(example=> sentence_tmpl({ example }))}
	</template>
</dd>
`
	return str.trim()
}

const lang_tmpl = (lang)=> {
	const str = html`
<p class="etymology-language">
	<strong lang="${lang}">${lang}</strong>
</p>
	`
	return str.trim()
}

const switchLang = (desiredLang)=> {
	if (!definitionWindow){ return }
	const word = definitionWindow.host.dataset.word || ''
	fetchAndDisplayDefinition(word, desiredLang)
}

const renderPhoneticsSection = (phonetics, lang)=> {
	const container = getEle(phoneticsContainer_tmpl())
	if (!phonetics?.length){
		return container
	}
	const langTag = getEle(lang_tmpl(lang))
	const handleLangClick = (e)=> {
		e.stopPropagation()
		e.preventDefault()
		const ele = e.target
		const currentLang = ele.getAttribute('lang')
		const workingLangs = ['cho', 'jpn']
		if(!workingLangs.includes(currentLang)){
			return null
		}
		switchLang(currentLang === 'cho' ? 'jpn' : 'cho')
	}
	langTag.addEventListener('click', handleLangClick)
	container.appendChild(langTag)
	const filteredPhonetics = phonetics.filter((phonetic)=> {
		if(lang !== 'cho'){
			return true
		}
		if(phonetic.tags){
			const includeTags = ['Guangzhou', 'Taipei', 'Xiamen']
			for (const includeTag of includeTags){
				if (phonetic.tags.includes(includeTag)){
					return true
				}
			}
		}
		return false
	})
	filteredPhonetics.forEach((phonetic)=> {
		if (!['cho', 'eng'].includes(lang)){
			return null
		}
		if(!phonetic.text && !phonetic.audio){
			return null
		}

		const phoneticItem = getEle(phonetics_tmpl(phonetic, lang))
		const playAudio = ()=> {
			if (!phonetic.audio){
				return null
			}
			playIt(phonetic.audio).catch((err)=> {
				console.error('[bindu][playAudio]: Error playing audio:', err)
			})
		}
		phoneticItem.addEventListener('click', playAudio)
		container.appendChild(phoneticItem)
	})

	return container
}

const renderMeaningsSection = (meanings)=> {
	const fragment = document.createDocumentFragment()

	if (!meanings?.length){
		return fragment
	}

	meanings.forEach((meaning)=> {
		if (!meaning.definitions?.length){
			return null
		}
		const defList = getEle(meaning_tmpl(meaning))
		fragment.appendChild(defList)
	})
	return fragment
}

const renderDictionary = (canonData)=> {
	if (!canonData || !Array.isArray(canonData.etymologyEntries)){
		throw new Error('No definition found.')
	}

	const container = document.createElement('div')
	container.classList.add('definition-container')

	canonData.etymologyEntries.forEach((etymologyEntry)=> {
		const etymoCard = document.createElement('article')
		etymoCard.classList.add('etymology-card')

		const phoneticsFragment = renderPhoneticsSection(etymologyEntry.phonetics, canonData.language)
		etymoCard.appendChild(phoneticsFragment)

		const meaningsFragment = renderMeaningsSection(etymologyEntry.meanings)
		etymoCard.appendChild(meaningsFragment)

		const separator = document.createElement('hr')
		separator.className = 'etymology-card__separator'
		etymoCard.appendChild(separator)

		container.appendChild(etymoCard)
	})

	return container
}

const getEle = (tmpl)=> {
	const template = document.createElement('template')
	template.innerHTML = tmpl
	return template.content.firstChild
}

const registerMessageListener = ()=> {
	// according to the official documentation, there's no promise-based API
	chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
	chrome.runtime.onMessage.addListener(handleRuntimeMessage)
}

registerMessageListener()

document.addEventListener('mouseup', handleDocMouseup)
