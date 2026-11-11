# focus-gate
Chrome extension for parental controls: domain-based rules, timed learn-to-continue quizzes, and master-password override.

Runs in the background with Chrome. Guard any domain/URL, interrupt browsing every N minutes with a math/science quiz, and gate settings behind a master password (PBKDF2-hashed, never plaintext).

## Configurable
- **Time:** interrupt interval (min 0.1), global on/off
- **Password:** master password to change settings / disable / snooze
- **URLs:** pattern list (`youtube.com`, `*.youtube.com`, `*://*.example.com/*`), per-rule on/off
- **Questions:** bank (text/mcq with clickable choices, shuffled) + auto-generated math (levels 1-3), source mix: mixed | math-only | bank-only, **questions per break (default 5, 1-20)** with progress + streak saved across refresh/tabs
- **Prompt text:** title (default “Take a brain break”), subtitle (default “Answer the following to continue”)
- **Prompt color:** accent color picker, applied to card border + buttons + input
- **Mascot:** upload png/jpg in Options (stored locally, 500KB max), default bundled `assets/mascot-default.png`
- **Motivation:** random funny line every prompt (collection in `src/lib/motivation.js`)

## Install (Chrome)
1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder.
2. On first install the Options page opens: set a master password, then adjust time / URLs / questions / appearance.
3. Pin it: puzzle-piece toolbar menu → pin **Focus Gate**. Click the icon for status / snooze / Open settings.
4. Open a guarded site (default: youtube.com), wait for the interval, solve the streak to continue.
5. After pulling changes: `chrome://extensions` → ↻ **Reload** on Focus Gate.

## Tests
Prereq: Node 18+ (no dependencies, uses built-in `node:test`).

```sh
make test          # run all tests
make test-verbose  # spec reporter
make check         # syntax-check shipped JS + validate JSON
```

What is covered: URL rule matching (`tests/rules.test.mjs`), quiz generation/checking (`tests/quiz.test.mjs`), seed-file parsing (`tests/seed-parser.test.mjs`), config validation incl. `questionsPerBreak` (`tests/config.test.mjs`), motivator/praise collections (`tests/content.test.mjs`).

## Seed questions from text file
`seed/questions-seed.txt`, one per line:
```
type | question | answer | choices
```
- `type`: `math` | `mcq` | `text`
- `choices`: comma or `|` separated (mcq needs 2+)
- `#` comments and blank lines ignored

In Options you can paste bulk text, import a `.txt` file, export, or reset to seed.

## Dev notes
- `manifest.json` (MV3) + `src/background/service-worker.js` seed install state from `seed/default-config.json` + `seed/questions-seed.txt`.
- Per-tab overlay in `src/content/guard.js`; shared lock state (`nextPromptAt`, `pendingQuiz` with streak progress, `unlockedUntil`) in `chrome.storage.local` so refresh / multi-tab can't bypass.
- Pure logic in `src/lib/` is unit-tested; content-script mirrors it (no bundler).
