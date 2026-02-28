import { formatSeconds } from "./timecode.js";

export function toPremiereJson(markers, options = {}) {
  const fps = Number(options.fps || 30);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    fps,
    markers: markers.map((marker) => ({
      name: marker.name,
      comments: marker.comments || "",
      startSeconds: marker.startSeconds,
      durationSeconds: marker.durationSeconds || 0,
      markerType: marker.markerType || "Comment",
      confidence: marker.confidence,
      source: marker.source,
      sourceLine: marker.sourceLine,
      rawTimestamp: marker.rawTimestamp,
    })),
  };
}

export function toCsvRows(markers) {
  return markers.map((marker) => [
    marker.id,
    marker.name,
    marker.startSeconds,
    marker.durationSeconds,
    marker.markerType,
    marker.confidence,
    marker.source,
    marker.sourceLine,
    marker.rawTimestamp,
  ]);
}

export function buildTimestampSection(markers, options = {}) {
  const includeMs = options.includeMs !== false;

  const lines = [
    "",
    "---",
    "TIMESTAMP MARKERS",
    "---",
  ];

  for (const marker of markers) {
    const ts = formatSeconds(marker.startSeconds, { includeMs });
    const comment = marker.comments ? ` | ${marker.comments}` : "";
    lines.push(`[${ts}] ${marker.name}${comment}`);
  }

  return `${lines.join("\n")}\n`;
}
