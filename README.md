# Premiere Script <-> Marker Sync (MVP)

Standalone-first MVP for syncing timestamps between scripts and Premiere Pro markers.

## What this repo includes

1. `marker-sync` CLI (Node.js)
- Extracts timestamps from local scripts or Google Docs text into normalized marker JSON.
- Handles strict formats and fuzzy/loose formats (`--fuzzy`) for messy scripts.
- Exports CSV for audit/review.
- Injects markers back into a script as a timestamp section.

2. UXP plugin scaffold for Premiere Pro (`premiere-uxp-plugin/`)
- Imports marker JSON into the active sequence.
- Exports active sequence markers to JSON.

## Why this architecture

- Fastest path to value: standalone parser + lightweight panel bridge.
- Keeps parsing logic independent of Premiere internals.
- Lets you iterate AI extraction in the CLI without reloading the panel each time.

## Quick start

```bash
npm run test:sanity
```

Then inspect:
- `sample/out.markers.json`
- `sample/out.markers.csv`

### Extract markers from a local script

```bash
node ./src/cli.js extract \
  --input ./sample/script.txt \
  --output ./sample/out.markers.json \
  --csv ./sample/out.markers.csv \
  --fps 30 \
  --fuzzy
```

### Extract markers from Google Docs

Public doc:

```bash
node ./src/cli.js extract \
  --input "https://docs.google.com/document/d/<DOC_ID>/edit" \
  --output ./out.markers.json
```

Private doc:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="<oauth_access_token>"
node ./src/cli.js extract --input "https://docs.google.com/document/d/<DOC_ID>/edit" --output ./out.markers.json
```

### Inject markers back into a script

```bash
node ./src/cli.js inject \
  --script ./sample/script.txt \
  --markers ./sample/out.markers.json \
  --output ./sample/script.with-markers.txt
```

## Premiere panel usage

1. Open UXP Developer Tools.
2. Add the `premiere-uxp-plugin/` folder as a plugin.
3. Launch in Premiere Pro (Window -> Plugins -> Marker Sync).
4. Use:
- `Import JSON into Sequence`
- `Export Sequence to JSON`

## Marker JSON format

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-02-26T00:00:00.000Z",
  "fps": 30,
  "markers": [
    {
      "name": "Hook line",
      "comments": "",
      "startSeconds": 3.5,
      "durationSeconds": 0,
      "markerType": "Comment",
      "confidence": 1,
      "source": "strict",
      "sourceLine": 1,
      "rawTimestamp": "00:00:03.500"
    }
  ]
}
```

## AI extension point (next step)

Current MVP uses deterministic + fuzzy parsing. To add model-based recovery for poor formatting:

1. Add `src/aiExtractor.js` that maps raw script lines to `{ timestamp, title }`.
2. Merge AI candidates into `extractMarkersFromText` when strict parsing fails.
3. Keep confidence scoring and human-review CSV.

## Known limits

- Google Docs ingestion is plain text export only (formatting/comments ignored).
- Plugin scaffold is built for Premiere UXP APIs and needs real host validation.
- Fuzzy parsing may produce false positives on number-heavy scripts; review CSV before import.

## Useful references

- Premiere UXP API overview: https://developer.adobe.com/premiere-pro/uxp/ppro_reference/
- Markers API: https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/markers/
- Project transactions (`executeTransaction`): https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/project/
- ExtendScript support status (through September 2026): https://ppro-scripting.docsforadobe.dev/
- Google Docs API overview: https://developers.google.com/workspace/docs/api/quickstart
- Google Drive `files.export` for plain text: https://developers.google.com/drive/api/reference/rest/v3/files/export
