let definitionWindow = null
let isMouseOverDefinitionWindow = false
let autoHideTimer = null

const handleRuntimeMessage = (msg, sender, sendResponse)=> {
	console.log('Content script received message:', msg)
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
			console.error('Error fetching voice:', err)
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
				console.error('Error getting autoPlay setting:', err)
			})
	}
}

const fadeOutAndRemove = (duration, callback)=> {
	if (isMouseOverDefinitionWindow){
		return null
	}
	definitionWindow.style.opacity = '0'
	setTimeout(()=> {
		if(callback){
			callback()
		}
	}, duration * 1000)
}

const showDefinitionWindow = (word, x, y)=> {
	const id = 'w' + new Date().valueOf()
	const className = 'definition-window'
	const windowWidth = 400
	const windowMinHeight = 100
	const windowMaxHeight = 200
	const offset = 10
	const fadeInDuration = 0.5
	const fadeOutDuration = 1
	const maxOpacity = 0.9
	const delayAfterShow = 10 * 1000
	const delayAfterMouseLeave = 2 * 1000
	const existingWindow = document.querySelector(`.${className}`)

	clearTimeout(autoHideTimer)
	if (existingWindow){
		fadeOutAndRemove(fadeOutDuration, ()=> existingWindow.remove())
	}

	definitionWindow = document.createElement('div')
	definitionWindow.id = id
	definitionWindow.className = className
	definitionWindow.role = 'dialog'
	definitionWindow.ariaLabel = `Definition of ${word}`

	definitionWindow.style.width = `${windowWidth}px`
	definitionWindow.style.minHeight = `${windowMinHeight}px`
	definitionWindow.style.maxHeight = `${windowMaxHeight}px`
	definitionWindow.style.opacity = '0'
	definitionWindow.style.transition = `opacity ${fadeInDuration}s ease-in-out`

	if (x + offset + windowWidth > window.innerWidth){
		definitionWindow.style.right = Math.max(window.innerWidth - x, offset) + 'px'
	} else{
		definitionWindow.style.left = x + offset + 'px'
	}
	document.body.appendChild(definitionWindow)

	// after appendence
	const windowHeight = definitionWindow.offsetHeight
	if (y + offset + windowHeight > window.innerHeight){
		definitionWindow.style.bottom = Math.max(window.innerHeight - y, offset) + 'px'
	} else{
		definitionWindow.style.top = y + offset + 'px'
	}

	definitionWindow.addEventListener('mouseenter', ()=> {
		isMouseOverDefinitionWindow = true
		clearTimeout(autoHideTimer)
	})

	definitionWindow.addEventListener('mouseleave', ()=> {
		isMouseOverDefinitionWindow = false
		definitionWindow.style.transition = `opacity ${fadeOutDuration}s ease-in-out`
		// clearTimeout(autoHideTimer)
		autoHideTimer = setTimeout(()=> {
			definitionWindow.style.transition = `opacity ${fadeOutDuration}s ease-in-out`
			fadeOutAndRemove(fadeOutDuration, ()=> {
				definitionWindow.remove()
			})
		}, delayAfterMouseLeave)
	})

	requestAnimationFrame(()=> {
		definitionWindow.style.opacity = maxOpacity
	})

	autoHideTimer = setTimeout(()=> {
		definitionWindow.style.transition = `opacity ${fadeOutDuration}s ease-in-out`
		fadeOutAndRemove(fadeOutDuration, ()=> {
			definitionWindow.remove()
		})
	}, delayAfterShow)
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
	if(definitionWindow.firstChild){
		definitionWindow.removeChild(definitionWindow.firstChild)
	}
	definitionWindow.appendChild(newContent)
}

const fetchAndDisplayDefinition = (word)=> {
	const loadingContainer = renderLoading('Loading...')
	switchContent(loadingContainer)
	fetchCanonData(word)
		.then((data)=> {
			return switchContent(renderDictionary(data))
		})
		.catch((err)=> {
			console.error('Error fetching definition:', err)
			const msg = err || 'Could not load definition. Please try again.'
			switchContent(renderError(msg))
		})
}

const error_tmpl = (props)=> {
	const str = `
<div class="definition-window__error">
	<p>${escapeHtml(props.message)}</p>
</div>
	`
	return str.trim()
}

const loading_tmpl = (props)=> {
	const str = `
<div class="definition-window__loading">
	<p>${escapeHtml(props.text || 'Loading...')}</p>
</div>
	`
	return str.trim()
}

const phoneticsContainer_tmpl = ()=> {
	const str = `
<div class="phonetics-container">
</div>
	`
	return str.trim()
}

const phonetics_tmpl = (props)=> {
	const speaker = '<span class="etymology-phonetic__play" title="Play pronunciation">🔊</span>'
	const str = `
<p class="etymology-phonetic">
	<span class="etymology-phonetic__text${props.audio ? ' has-audio' : ''}">
		${escapeHtml(props.text) || speaker}
	</span>
	
</p>
	`
	return str.trim()
}

const sentence_tmpl = (props)=> {
	const str = `
<div class="definition-sentence">
	<span class="definition-sentence__prefix">e.g. </span>
	<span class="definition-sentence__text">${escapeHtml(props.example)}</span>
</div>
	`
	return str.trim()
}

const meaning_tmpl = (props)=> {
	const str = `
<dl class="definition-list">
	<dt class="definition-list__part">${props.partOfSpeech}</dt>
	${props.definitions.map(def=> `
		return ${definition_tmpl({ def })}
		`).join('')}
</dl>
	`
	return str.trim()
}

const definition_tmpl = (props)=> {
	const { def } = props
	const str = `
<dd class="definition-list__item">
	${escapeHtml(def.definition)}
	${def.examples ? def.examples.map(example=> sentence_tmpl({ example })).join('') : ''}
</dd>
`
	return str.trim()
}

const lang_tmpl = (lang)=> {
	const str = `
<p class="etymology-language">
	<strong>${lang}</strong>
</p>
	`
	return str.trim()
}

const renderPhoneticsSection = (phonetics, lang)=> {
	const container = getEle(phoneticsContainer_tmpl())
	if (!phonetics?.length){
		return container
	}
	const langTag = getEle(lang_tmpl(lang))
	container.appendChild(langTag)
	phonetics.forEach((phonetic)=> {
		if (!['cho', 'eng'].includes(lang)){
			return null
		}
		if(!phonetic.text && !phonetic.audio){
			return null
		}

		const phoneticItem = getEle(phonetics_tmpl(phonetic))
		const playAudio = ()=> {
			if (!phonetic.audio){
				return null
			}
			playIt(phonetic.audio).catch((err)=> {
				console.error('Error playing audio:', err)
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
	// no promise-based API 
	chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
	chrome.runtime.onMessage.addListener(handleRuntimeMessage)
}

registerMessageListener()

document.addEventListener('mouseup', handleDocMouseup)
