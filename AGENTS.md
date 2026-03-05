# Repository Guidelines

## Project Structure & Module Organization
This repository contains a Node.js CLI and a Premiere Pro UXP panel:
- `src/`: CLI source (`cli.js`) and core modules:
  - `extractor.js` (timestamp parsing),
  - `timecode.js` (time conversions),
  - `formatters.js` (JSON/CSV/script output),
  - `googleDocs.js` and `io.js` (input/output handling).
- `premiere-uxp-plugin/`: UXP panel files (`manifest.json`, `index.html`, `main.js`, `style.css`).
- `sample/`: example input/output fixtures used for sanity checks.
- `README.md`: usage examples and architecture notes.

## Build, Test, and Development Commands
Use Node 18+ (`package.json` engines).

- `npm run test:sanity`: runs a local extraction flow against `sample/script.txt` and writes sample JSON/CSV outputs.
- `npm run extract -- --input <path-or-url> --output <markers.json> [--csv <markers.csv>] [--fps 30] [--fuzzy]`: extract markers from script text or Google Docs.
- `npm run inject -- --script <script.txt> --markers <markers.json> --output <script.with-markers.txt>`: append generated timestamp section into a script.
- `node ./src/cli.js help`: quick CLI reference.

## Coding Style & Naming Conventions
- JavaScript uses ES modules in `src/` and CommonJS-style `require` in UXP panel code (host compatibility).
- Use 2-space indentation, semicolons, and single-responsibility functions.
- Prefer descriptive camelCase for variables/functions and UPPER_SNAKE_CASE for regex/constants.
- Keep files focused by concern (parsing, formatting, I/O) rather than adding monolithic logic to `cli.js`.
- No formatter/linter is configured yet; match existing style and keep diffs minimal.

## Testing Guidelines
- No formal test framework is configured yet.
- Minimum check before PR: run `npm run test:sanity` and verify regenerated outputs in `sample/`.
- For parser changes, include at least one representative sample input/output pair demonstrating the new or fixed case.

## Commit & Pull Request Guidelines
- Current history uses short, imperative commit subjects (for example: `Initial MVP for marker sync`).
- Follow that pattern: one-line imperative subject, optional body for context/risk.
- PRs should include:
  - what changed and why,
  - how to validate (commands run),
  - sample output diffs or screenshots (for UXP panel UI changes),
  - linked issue/task when available.
