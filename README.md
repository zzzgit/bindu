# Bindu – a practical dictionary Chrome extension

**Version 1.5.4**

Bindu is a lightweight, opinionated Chrome extension for looking up definitions and translations without breaking your reading flow. Built with Manifest V3 and modern ES modules.

## Features

- **Context menu lookup**: Right‑click selected text → Bindu → choose a dictionary. A new tab opens with that source.
- **Quick translation**: Click the toolbar icon to open the selection in Google Translate (defaults to zh‑TW target).
- **Inline definition popup**: Select text, then release the mouse while holding Alt + Cmd (macOS) or Alt + Ctrl (Windows/Linux) to show a small popup near the selection. Uses DictionaryAPI for English and FreeDictionaryAPI for non‑English (auto‑detected).
- **Auto-pronunciation**: The popup can auto‑play US audio via Merriam‑Webster (English only, configurable in options).
- **Click-to-play audio**: Click any phonetic "speaker" icon in the popup when available.
- **Multiple dictionaries** out of the box:
  - Wiktionary
  - Merriam‑Webster (Webster's)
  - 漢典 (zdic.net) - Chinese dictionary
  - American Heritage Dictionary (AHD)
  - Etymonline
  - Longman Dictionary
  - Google Translate

## Installation

### From Source (Development)

1. Clone this repository or download it as a ZIP.
2. In Chrome open: `chrome://extensions/`
3. Enable **Developer mode** (top‑right).
4. Click **Load unpacked** and select the project folder.

### Build for Distribution

```bash
npm run build
```

This creates a `dist/bindu-v1.5.4.zip` file ready for Chrome Web Store upload.

## Usage

### Context menu lookup

1. Select any text on a page.
2. Right‑click → **Bindu** → pick a dictionary source.
3. A new tab opens with the selected dictionary showing your word/phrase.

### Quick translation (toolbar icon)

1. Select text on a page.
2. Click the **Bindu toolbar icon** (action button).
3. A new tab opens in Google Translate with the text (default target: zh‑TW).
   - You can change the target language in `config/config.js` by editing the `gt` engine URL.

### Inline definition popup (no tab switch)

1. Select text on a page.
2. Keep **Alt + Cmd** (macOS) or **Alt + Ctrl** (Windows/Linux) pressed and release the mouse button.
3. A compact popup appears near the selection with definitions fetched from DictionaryAPI (English) or FreeDictionaryAPI (non‑English).
4. **Popup behavior**:
   - Fades in smoothly
  - Auto‑hides after ~8 seconds
   - Hides ~2 seconds after moving your mouse away
   - Shows phonetics, part of speech, and definitions
5. **Audio features**:
   - Auto‑plays US pronunciation from Merriam‑Webster (if enabled in options)
   - Click any phonetic "🔊" icon to play pronunciation
   - Uses offscreen document for reliable audio playback
6. **Optional Chinese translation**:
  - Enable **Chinese translation** in options to fetch short translations from Bing Dictionary

## Configuration

Bindu can be configured in two ways:

### Extension Options Page

Access via: **Chrome Extensions** → **Bindu** → **Details** → **Extension options**

**Available settings** (persisted via `chrome.storage.sync`):
- **Dictionary API**: `dictionaryapi.dev` (English)
- **Sound source**: US pronunciation via Merriam‑Webster (additional sources available in config)
- **Auto-play**: Toggle automatic pronunciation when showing inline definitions
- **Chinese translation**: Toggle Bing Dictionary translations in the popup

### Code Configuration (`config/config.js`)

**Search Engines**: Controls context‑menu items and toolbar translation
```javascript
searchEngines: [
  { url: 'https://en.wiktionary.org/wiki/%s', name: 'Wiktionary' },
  { url: 'https://www.merriam-webster.com/dictionary/%s', name: 'Webster\'s' },
  { url: 'https://www.zdic.net/hans/%s', name: '漢典' },
  { url: 'https://www.ahdictionary.com/word/search.html?q=%s', name: 'AHD' },
  { url: 'https://www.etymonline.com/word/%s', name: 'Etymonline' },
  { url: 'https://www.ldoceonline.com/dictionary/%s', name: 'Longman' },
  { url: 'https://translate.google.ca/?sl=auto&tl=zh-TW&op=translate&text=%s', name: 'gt' }
]
```

**APIs**: Maps API IDs to endpoints for inline definitions
```javascript
apis: {
  dictionaryapi: 'https://api.dictionaryapi.dev/api/v2/entries/en/%s',
  freedictionaryapi: 'https://freedictionaryapi.com/api/v1/entries/%lang/%s'
}
```

Each engine's `url` should include `%s` as the query placeholder.

## Permissions

**Required permissions**:
- **`contextMenus`**: Add the "Bindu" submenu and dictionary entries on text selection
- **`storage`**: Save user preferences (API, sound source, auto-play) via `chrome.storage.sync`
- **`offscreen`**: Create offscreen documents for reliable audio playback

**Host permissions**:
- **`https://www.merriam-webster.com/*`**: Fetch pronunciation audio and dictionary pages
- **`https://media.merriam-webster.com/*`**: Access audio files for pronunciation
- **`https://api.dictionaryapi.dev/*`**: Fetch word definitions for inline popups
- **`https://freedictionaryapi.com/*`**: Fetch non‑English word definitions for inline popups

## Architecture

**Service Worker** (`src/serviceWorker.js`):
- Creates the "Bindu" context menu and items from `config/searchEngines`
- Handles toolbar icon clicks → opens Google Translate for current selection
- Manages message passing: returns active API URL, fetches Merriam‑Webster HTML for audio
- Selects DictionaryAPI or FreeDictionaryAPI based on language detection
- Manages offscreen document lifecycle for audio playback
- Built with Manifest V3 service worker pattern

**Content Script** (`src/content.js`):
- Listens for **Alt + Cmd/Ctrl + mouseup** with text selection
- Shows inline popup with smooth fade-in/out animations
- Fetches definitions from active API (default: dictionaryapi.dev; non‑English uses FreeDictionaryAPI)
- Renders phonetics, parts of speech, and meanings
- Handles audio: auto‑play (if enabled) and click‑to‑play for phonetic entries
- Uses modern fetch API with error handling
- Optional Chinese translation section (Bing Dictionary) when enabled in options

**Options Page** (`src/options.{html,js}`):
- Clean UI for API selection, sound source, and auto-play toggle
- Settings saved to `chrome.storage.sync` for cross-device sync
- Real-time validation and status feedback

**Offscreen Document** (`src/offscreen.{html,js}`):
- Dedicated context for reliable audio playback
- Handles `PLAY_AUDIO` messages from content script
- Required for Manifest V3 audio functionality

## Project structure (key files)

```
bindu/
├─ config/
│  ├─ config.js            # Search engines and API endpoints
│  ├─ constants.js         # Sound/API ids
│  └─ defaultSettings.js   # Default options (dictionaryapi + US)
├─ icons/                  # Extension icons
├─ scripts/
│  └─ zip.js               # Build script to produce a distributable zip
├─ src/
│  ├─ canon.tmpl           # Template for canonical data (future use)
│  ├─ content.js           # Inline popup + selection handling
│  ├─ offscreen.html       # Offscreen document host
│  ├─ offscreen.js         # Offscreen audio playback
│  ├─ options.html         # Options UI
│  ├─ options.js           # Options logic (chrome.storage)
│  ├─ serviceWorker.js     # Background/service worker logic
│  └─ utils.js             # Helpers (settings merge, hashing)
├─ manifest.json           # MV3 manifest
└─ package.json            # Scripts and metadata
```

## Development

Prerequisites:

- Node.js 22+
- zip available on your system (for packaging)

Common tasks:

- Lint: npm run lint (or npm run lint:fix)
- Build zip: npm run build → outputs `dist/bindu-v<version>.zip`
- Clean: npm run clean

Load for local testing: use “Load unpacked” in chrome://extensions and select the project folder (no build needed).

## Notes and limitations

- Dictionary API: The inline popup uses `dictionaryapi.dev` for English and `freedictionaryapi.com` for non‑English by default. Some words may return multiple entries.
- Audio: US audio is fetched from Merriam‑Webster’s site; host permissions are limited accordingly. UK/Longman is not yet enabled in the UI.
- Target language for Google Translate defaults to zh‑TW; change the `gt` engine URL in `config/config.js` to use a different target.

## License

See LICENSE for details.

## Contributing

Issues and PRs are welcome.
