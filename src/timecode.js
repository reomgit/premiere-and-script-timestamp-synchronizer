const HMSF_RE = /^\s*(\d{1,2}):(\d{2}):(\d{2}):(\d{1,2})\s*$/;
const HMS_MS_RE = /^\s*(\d{1,2}):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?\s*$/;
const MS_MS_RE = /^\s*(\d{1,3}):(\d{2})(?:[.,](\d{1,3}))?\s*$/;
const HMSSUFFIX_RE = /^\s*(?:(\d+)h)?\s*(?:(\d+)m(?:in)?)?\s*(?:(\d+)(?:[.,](\d{1,3}))?s)?\s*$/i;
const SSUFFIX_RE = /^\s*(\d+)(?:[.,](\d{1,3}))?\s*s(?:ec)?s?\s*$/i;

export function parseTimestampToSeconds(token, fps = 30) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const cleaned = token
    .trim()
    .replace(/^[\[\({\s]+/, "")
    .replace(/[\]\)\}\s.,;:-]+$/, "");

  let match = cleaned.match(HMSF_RE);
  if (match) {
    const [, h, m, s, f] = match;
    return toNumber(h) * 3600 + toNumber(m) * 60 + toNumber(s) + toNumber(f) / fps;
  }

  match = cleaned.match(HMS_MS_RE);
  if (match) {
    const [, h, m, s, ms] = match;
    return toNumber(h) * 3600 + toNumber(m) * 60 + toNumber(s) + parseMs(ms);
  }

  match = cleaned.match(MS_MS_RE);
  if (match) {
    const [, m, s, ms] = match;
    return toNumber(m) * 60 + toNumber(s) + parseMs(ms);
  }

  match = cleaned.match(HMSSUFFIX_RE);
  if (match) {
    const [, h, m, s, ms] = match;
    if (!h && !m && !s) {
      return null;
    }
    return toNumber(h) * 3600 + toNumber(m) * 60 + toNumber(s) + parseMs(ms);
  }

  match = cleaned.match(SSUFFIX_RE);
  if (match) {
    const [, s, ms] = match;
    return toNumber(s) + parseMs(ms);
  }

  return null;
}

export function parseCompactedTimestampToSeconds(token) {
  const clean = String(token || "").trim();
  if (!/^\d{3,6}$/.test(clean)) {
    return null;
  }

  if (clean.length === 3) {
    const m = Number(clean.slice(0, 1));
    const s = Number(clean.slice(1));
    return m * 60 + s;
  }

  if (clean.length === 4) {
    const m = Number(clean.slice(0, 2));
    const s = Number(clean.slice(2));
    return m * 60 + s;
  }

  if (clean.length === 5) {
    const h = Number(clean.slice(0, 1));
    const m = Number(clean.slice(1, 3));
    const s = Number(clean.slice(3));
    return h * 3600 + m * 60 + s;
  }

  const h = Number(clean.slice(0, 2));
  const m = Number(clean.slice(2, 4));
  const s = Number(clean.slice(4));
  return h * 3600 + m * 60 + s;
}

export function formatSeconds(seconds, { includeMs = true } = {}) {
  const total = Math.max(0, Number(seconds) || 0);
  const whole = Math.floor(total);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;

  if (!includeMs) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  const ms = Math.round((total - whole) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
}

function toNumber(value) {
  return Number(value || 0);
}

function parseMs(ms) {
  if (!ms) {
    return 0;
  }
  return Number(`0.${String(ms).padEnd(3, "0")}`);
}

function pad(value) {
  return String(value).padStart(2, "0");
}
