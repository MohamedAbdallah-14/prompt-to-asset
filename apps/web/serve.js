#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = Number(process.env.PORT ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8"
};

const server = createServer((req, res) => {
  let path = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (path === "/") path = "/index.html";
  if (path.endsWith("/")) path += "index.html";

  const filePath = join(PUBLIC_DIR, path);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      res.writeHead(302, { Location: path + "/" }).end();
      return;
    }
    const body = readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html" }).end("<!doctype html><h1>404</h1>");
  }
});

server.listen(PORT, () => console.log(`[web] http://localhost:${PORT}`));
