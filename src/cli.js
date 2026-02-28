#!/usr/bin/env node
import { extractMarkersFromText } from "./extractor.js";
import { buildTimestampSection, toCsvRows, toPremiereJson } from "./formatters.js";
import { loadTextInput, readJsonFile, writeCsvFile, writeJsonFile, writeTextFile } from "./io.js";

const argv = process.argv.slice(2);
const command = argv[0];

const handlers = {
  extract: runExtract,
  inject: runInject,
  help: runHelp,
};

const handler = handlers[command] || runHelp;

handler(argv.slice(1)).catch((error) => {
  console.error(`[marker-sync] ${error.message}`);
  process.exitCode = 1;
});

async function runExtract(args) {
  const flags = parseFlags(args);

  const input = flags.input;
  const output = flags.output;
  const fps = Number(flags.fps || 30);
  const defaultDuration = Number(flags.defaultDuration || 0);
  const fuzzy = flags.fuzzy === true;

  if (!input || !output) {
    throw new Error("Usage: extract --input <path-or-url> --output <markers.json> [--csv <markers.csv>] [--fuzzy]");
  }

  const text = await loadTextInput(input);
  const markers = extractMarkersFromText(text, {
    fps,
    defaultDurationSeconds: defaultDuration,
    fuzzy,
  });

  const payload = toPremiereJson(markers, { fps });
  await writeJsonFile(output, payload);

  if (flags.csv) {
    await writeCsvFile(
      flags.csv,
      toCsvRows(markers),
      [
        "id",
        "name",
        "startSeconds",
        "durationSeconds",
        "markerType",
        "confidence",
        "source",
        "sourceLine",
        "rawTimestamp",
      ]
    );
  }

  console.log(`Extracted ${markers.length} markers from ${input}`);
  console.log(`Wrote marker JSON: ${output}`);
  if (flags.csv) {
    console.log(`Wrote marker CSV: ${flags.csv}`);
  }
}

async function runInject(args) {
  const flags = parseFlags(args);

  const script = flags.script;
  const markersPath = flags.markers;
  const output = flags.output;

  if (!script || !markersPath || !output) {
    throw new Error("Usage: inject --script <path-or-url> --markers <markers.json> --output <script-with-markers.txt>");
  }

  const scriptText = await loadTextInput(script);
  const markerPayload = await readJsonFile(markersPath);
  const markers = normalizeMarkers(markerPayload);

  const merged = `${scriptText.trimEnd()}\n${buildTimestampSection(markers)}`;
  await writeTextFile(output, merged);

  console.log(`Injected ${markers.length} markers into script`);
  console.log(`Wrote output script: ${output}`);
}

function normalizeMarkers(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.markers)) {
    return payload.markers;
  }

  throw new Error("markers file must be an array or an object with a markers array");
}

async function runHelp() {
  const help = `
marker-sync

Commands:
  extract --input <path-or-url> --output <markers.json> [--csv <markers.csv>] [--fps 30] [--default-duration 0] [--fuzzy]
  inject  --script <path-or-url> --markers <markers.json> --output <script-with-markers.txt>

Notes:
  - --input and --script can be local files or URLs.
  - Google Docs URLs are supported.
  - For private Google Docs, set GOOGLE_OAUTH_ACCESS_TOKEN.
`;

  console.log(help.trim());
}

function parseFlags(args) {
  const out = {};

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = args[i + 1];

    if (!next || next.startsWith("--")) {
      out[toCamel(key)] = true;
      continue;
    }

    out[toCamel(key)] = next;
    i += 1;
  }

  return out;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
