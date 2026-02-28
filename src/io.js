import fs from "node:fs/promises";
import path from "node:path";
import { fetchGoogleDocText } from "./googleDocs.js";

export async function loadTextInput(input, options = {}) {
  if (!input) {
    throw new Error("Missing input path or URL");
  }

  if (/^https?:\/\//i.test(input)) {
    if (input.includes("docs.google.com/document/d/")) {
      return fetchGoogleDocText(input, options);
    }

    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`);
    }
    return await response.text();
  }

  return fs.readFile(input, "utf8");
}

export async function writeJsonFile(filePath, data) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function writeTextFile(filePath, content) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, content, "utf8");
}

export async function writeCsvFile(filePath, rows, header) {
  await ensureDir(filePath);
  const lines = [];

  if (header?.length) {
    lines.push(toCsvLine(header));
  }

  for (const row of rows) {
    lines.push(toCsvLine(row));
  }

  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const raw = String(value ?? "");
      if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    })
    .join(",");
}
