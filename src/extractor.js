import { parseCompactedTimestampToSeconds, parseTimestampToSeconds } from "./timecode.js";

const LINE_WITH_BRACKET_TS = /^\s*\[(?<ts>[^\]]+)\]\s*(?<content>.+)$/;
const LINE_WITH_PREFIX_TS = /^\s*(?<ts>(?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{1,2})?(?:[.,]\d{1,3})?|\d+h\s*\d*m\s*\d*(?:[.,]\d{1,3})?s?|\d+m\s*\d*(?:[.,]\d{1,3})?s?|\d+(?:[.,]\d{1,3})?s?)\s*[-|:>)]\s*(?<content>.+)$/i;
const INLINE_TS_TOKEN = /(?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{1,2})?(?:[.,]\d{1,3})?|\d+h\s*\d*m\s*\d*(?:[.,]\d{1,3})?s?|\d+m\s*\d*(?:[.,]\d{1,3})?s?|\d+(?:[.,]\d{1,3})?s?/i;

export function extractMarkersFromText(text, options = {}) {
  const {
    fps = 30,
    defaultDurationSeconds = 0,
    fuzzy = false,
    minConfidence = 0.4,
    markerType = "Comment",
  } = options;

  const lines = String(text || "").split(/\r?\n/);
  const markers = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const strict = parseStrictLine(line, fps);
    if (strict) {
      markers.push(
        toMarker(strict, {
          line,
          lineNumber: index + 1,
          durationSeconds: defaultDurationSeconds,
          markerType,
          confidence: 1,
          source: "strict",
        })
      );
      continue;
    }

    if (!fuzzy) {
      continue;
    }

    const loose = parseLooseLine(line, fps);
    if (loose && loose.confidence >= minConfidence) {
      markers.push(
        toMarker(loose, {
          line,
          lineNumber: index + 1,
          durationSeconds: defaultDurationSeconds,
          markerType,
          confidence: loose.confidence,
          source: "fuzzy",
        })
      );
    }
  }

  return dedupeAndSort(markers).map((marker, i) => ({
    ...marker,
    id: `m${String(i + 1).padStart(4, "0")}`,
  }));
}

function parseStrictLine(line, fps) {
  if (!line || !line.trim()) {
    return null;
  }

  const bracket = line.match(LINE_WITH_BRACKET_TS);
  if (bracket?.groups) {
    const seconds = parseTimestampToSeconds(bracket.groups.ts, fps);
    if (seconds !== null) {
      return {
        seconds,
        name: sanitizeContent(bracket.groups.content),
        rawTimestamp: bracket.groups.ts.trim(),
      };
    }
  }

  const prefix = line.match(LINE_WITH_PREFIX_TS);
  if (prefix?.groups) {
    const seconds = parseTimestampToSeconds(prefix.groups.ts, fps);
    if (seconds !== null) {
      return {
        seconds,
        name: sanitizeContent(prefix.groups.content),
        rawTimestamp: prefix.groups.ts.trim(),
      };
    }
  }

  const inline = line.match(INLINE_TS_TOKEN);
  if (inline) {
    const seconds = parseTimestampToSeconds(inline[0], fps);
    if (seconds !== null) {
      const content = sanitizeContent(line.replace(inline[0], ""));
      return {
        seconds,
        name: content || `Marker ${inline[0]}`,
        rawTimestamp: inline[0].trim(),
      };
    }
  }

  return null;
}

function parseLooseLine(line, fps) {
  if (!line || !line.trim()) {
    return null;
  }

  const compact = line.match(/\b(\d{3,6})\b/);
  if (compact) {
    const compactSeconds = parseCompactedTimestampToSeconds(compact[1]);
    if (compactSeconds !== null) {
      return {
        seconds: compactSeconds,
        name: sanitizeContent(line.replace(compact[1], "")) || `Marker ${compact[1]}`,
        rawTimestamp: compact[1],
        confidence: 0.55,
      };
    }
  }

  const noisy = line.match(/\b(\d{1,2})\D+(\d{2})\b/);
  if (noisy) {
    const seconds = parseTimestampToSeconds(`${noisy[1]}:${noisy[2]}`, fps);
    if (seconds !== null) {
      return {
        seconds,
        name: sanitizeContent(line.replace(noisy[0], "")) || `Marker ${noisy[0]}`,
        rawTimestamp: noisy[0],
        confidence: 0.45,
      };
    }
  }

  return null;
}

function dedupeAndSort(markers) {
  const seen = new Set();
  const out = [];

  for (const marker of markers) {
    const key = `${marker.startSeconds.toFixed(3)}::${marker.name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(marker);
  }

  return out.sort((a, b) => a.startSeconds - b.startSeconds);
}

function toMarker(parsed, extra) {
  return {
    name: parsed.name || `Marker ${parsed.rawTimestamp}`,
    comments: "",
    startSeconds: round(parsed.seconds),
    durationSeconds: round(extra.durationSeconds),
    markerType: extra.markerType,
    confidence: round(extra.confidence),
    source: extra.source,
    sourceLine: extra.lineNumber,
    rawTimestamp: parsed.rawTimestamp,
    rawLine: extra.line,
  };
}

function round(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function sanitizeContent(value) {
  return String(value || "")
    .replace(/^[-–—|:>\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}
