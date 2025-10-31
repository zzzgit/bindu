const apiSelect = document.querySelector('#api-select')
const soundSelect = document.querySelector('#sound-select')
const statusSpan = document.querySelector('#status')
const autoPlayTrue = document.querySelector('input[name="autoPlay"][value="true"]')
const autoPlayFalse = document.querySelector('input[name="autoPlay"][value="false"]')

function loadSettings(){
	chrome.storage.sync.get(['api', 'sound', 'autoPlay']).then((items)=> {
		if (items.api){ apiSelect.value = items.api }
		if (items.sound){ soundSelect.value = items.sound }
		if (items.autoPlay !== undefined){
			autoPlayTrue.checked = items.autoPlay === true
			autoPlayFalse.checked = items.autoPlay === false
		}
		return true
	}).catch((err)=> {
		console.error('Error loading settings:', err)
	})
}

function saveSettings(e){
	e.preventDefault()
	const api = apiSelect.value
	const sound = soundSelect.value
	const autoPlay = autoPlayTrue.checked
	chrome.storage.sync.set({
		api, sound, autoPlay,
	}).then(()=> {
		statusSpan.style.visibility = 'visible'
		return setTimeout(()=> { statusSpan.style.visibility = 'hidden' }, 1200)
	}).catch((err)=> {
		console.error('Error saving settings:', err)
	})
}

document.querySelector('#options-form').addEventListener('submit', saveSettings)
loadSettings()
