const config = {
	searchEngines: [
		{
			url: 'https://en.wiktionary.org/wiki/%s',
			name: 'Wiktionary',
		},
		{
			url: 'https://www.merriam-webster.com/dictionary/%s',
			name: 'Webster\'s',
		},
		{
			url: 'https://www.zdic.net/hans/%s',
			name: '漢典',
		},
		{
			url: 'https://www.ahdictionary.com/word/search.html?q=%s',
			name: 'AHD',
		},
		{
			url: 'https://www.ldoceonline.com/dictionary/%s',
			name: 'Longman',
		},
		{
			url: 'https://translate.google.ca/?sl=auto&tl=zh-TW&op=translate&text=%s',
			name: 'gt',
		},
	],
	apis: {
		youdao: 'https://dict.youdao.com/jsonapi',
		iciba: 'https://www.iciba.com/index.php',
		baidu: 'https://fanyi.baidu.com/sug',
		dictionaryapi: 'https://api.dictionaryapi.dev/api/v2/entries/en/%s',
	},
	soundSource: {
		en_US: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/%c/%s001.mp3',
		en_BG: 'https://www.ldoceonline.com/media/english/ameProns/%s.mp3',
	},
}

export default config
