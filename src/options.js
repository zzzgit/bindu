// Bindu Options Page
const apiSelect = document.querySelector('#api-select')
const soundSelect = document.querySelector('#sound-select')
const statusSpan = document.querySelector('#status')

// Load settings from chrome.storage
function loadSettings(){
	chrome.storage.sync.get(['api', 'sound'], (items)=> {
		if (items.api){ apiSelect.value = items.api }
		if (items.sound){ soundSelect.value = items.sound }
	})
}

// Save settings to chrome.storage
function saveSettings(e){
	e.preventDefault()
	const api = apiSelect.value
	const sound = soundSelect.value
	chrome.storage.sync.set({ api, sound }, ()=> {
		statusSpan.textContent = 'Settings saved.'
		setTimeout(()=> { statusSpan.textContent = '' }, 1200)
	})
}

document.querySelector('#options-form').addEventListener('submit', saveSettings)
loadSettings()
