const DOC_URL_RE = /https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

export function extractGoogleDocId(input) {
  const match = String(input || "").match(DOC_URL_RE);
  return match ? match[1] : null;
}

export async function fetchGoogleDocText(inputUrl, options = {}) {
  const fileId = extractGoogleDocId(inputUrl);
  if (!fileId) {
    throw new Error("Invalid Google Docs URL");
  }

  const token = options.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

  const publicExportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  const publicResponse = await fetch(publicExportUrl);
  if (publicResponse.ok) {
    return await publicResponse.text();
  }

  if (!token) {
    throw new Error(
      "Google Docs export failed. Set GOOGLE_OAUTH_ACCESS_TOKEN or share the doc publicly."
    );
  }

  const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  const driveResponse = await fetch(driveExportUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!driveResponse.ok) {
    const reason = await safeReadBody(driveResponse);
    throw new Error(`Drive export failed (${driveResponse.status}): ${reason}`);
  }

  return await driveResponse.text();
}

async function safeReadBody(response) {
  try {
    return await response.text();
  } catch {
    return "unknown error";
  }
}
