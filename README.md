# Bindu – a practical dictionary Chrome extension

Bindu is a lightweight, opinionated Chrome extension for looking up definitions and translations without breaking your reading flow.

## What it does

- Context menu lookup: Right‑click selected text → Bindu → choose a dictionary. A new tab opens with that source.
- Quick translation: Click the toolbar icon to open the selection in Google Translate (defaults to zh‑TW target).
- Inline definition popup: Select text, then release the mouse while holding Alt + Cmd (macOS) or Alt + Ctrl (Windows/Linux) to show a small popup near the selection.
- Pronunciation: The popup auto‑plays US audio via Merriam‑Webster; you can also click any phonetic “speaker” icon in the popup when available.
- Multiple sources out of the box:
  - Wiktionary
  - Merriam‑Webster
  - 漢典 (zdic.net)
  - American Heritage Dictionary (AHD)
  - Longman
  - Google Translate (engine id: "gt")

## Installation

1. Clone this repository or download it as a ZIP.
2. In Chrome open: chrome://extensions/
3. Enable Developer mode (top‑right).
4. Click Load unpacked and select the project folder.

## Usage

### Context menu lookup

1. Select any text on a page.
2. Right‑click → Bindu → pick a source.
3. A new tab opens with the selected dictionary.

### Quick translation (toolbar icon)

1. Select text on a page.
2. Click the Bindu toolbar icon.
3. A new tab opens in Google Translate with the text (default target: zh‑TW). You can change the target in `config/config.js` by editing the `gt` engine URL.

### Inline definition popup (no tab switch)

1. Select text on a page.
2. Keep Alt + Cmd/Ctrl pressed and release the mouse button (the popup triggers on mouseup with those modifiers held).
3. A compact popup appears near the selection with definitions fetched from DictionaryAPI.
4. Behavior: fades in, auto‑hides after ~10s, or ~2s after moving your mouse away.
5. Audio: auto‑plays US pronunciation from Merriam‑Webster for the word; any phonetic entries in the popup that provide audio can be clicked to play.

## Options and configuration

There are two ways to configure Bindu:

### In the Options page (persisted via chrome.storage.sync)

- Dictionary API: currently uses `dictionaryapi.dev` by default. Baidu is present but disabled in the UI.
- Pronunciation source: US (Merriam‑Webster) is available today. UK (Longman) is listed but disabled.

Open the Options page via chrome://extensions → Bindu → Details → Extension options.

### In `config/config.js` (static config)

- searchEngines: controls the context‑menu items and the toolbar translation engine (the engine with name `gt`). Each engine’s `url` should include `%s` as the query placeholder.
- apis: maps API ids to URLs. The background script returns the active API to the content script based on your saved setting.

## Permissions

- contextMenus: to add the “Bindu” submenu and dictionary entries on text selection.
- storage: to save options (API and sound source) in chrome.storage.sync.
- Host permissions: https://www.merriam-webster.com/* to fetch audio page HTML for pronunciations.

## How it’s wired

- background (`src/background.js`)
  - Creates the “Bindu” context menu and items from `config/searchEngines`.
  - On icon click, opens Google Translate for the current selection.
  - Serves messages to content scripts: returns the active API URL and fetches Merriam‑Webster HTML for audio.
- content (`src/content.js`)
  - Listens for Alt + Cmd/Ctrl + mouseup with a selection, shows an inline popup, fetches definitions from the active API, and plays audio.
  - Renders phonetics and meanings; supports click‑to‑play on phonetic audio and auto‑play via Merriam‑Webster.
- options (`src/options.{html,js}`)
  - Simple form to pick API and sound source; saved to chrome.storage.sync.

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
│  ├─ background.js        # Background/service worker logic
│  ├─ content.js           # Inline popup + selection handling
│  ├─ options.html         # Options UI
│  ├─ options.js           # Options logic (chrome.storage)
│  ├─ utils.js             # Helpers (settings merge, hashing)
│  └─ window.css           # Popup styling
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

- Dictionary API: The inline popup uses `dictionaryapi.dev` by default and relies on CORS being available. Some words may return multiple entries.
- Audio: US audio is fetched from Merriam‑Webster’s site; host permissions are limited accordingly. UK/Longman is not yet enabled in the UI.
- Target language for Google Translate defaults to zh‑TW; change the `gt` engine URL in `config/config.js` to use a different target.

## License

See LICENSE for details.

## Contributing

Issues and PRs are welcome.
