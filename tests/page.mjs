/**
 * Fournit la page HTML de l'application aux tests.
 * 1. /tmp/ssr.html si elle existe (page rendue par le serveur de dev)
 * 2. sinon http://localhost:3000 si le serveur tourne
 * 3. sinon on fabrique la page à partir de scripts/shell.html (aucun serveur requis)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function chargerPage() {
  try {
    if (fs.existsSync("/tmp/ssr.html")) return fs.readFileSync("/tmp/ssr.html", "utf8");
  } catch { /* on continue */ }
  try {
    const r = await fetch("http://localhost:3000/");
    if (r.ok) return await r.text();
  } catch { /* serveur absent */ }
  const shell = fs.readFileSync(path.join(root, "scripts", "shell.html"), "utf8");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>VOOMNET — Gestion des Achats</title></head><body>\n${shell}\n
<div id="modal-root"></div><div id="toast-root"></div><div id="print-root"></div>
</body></html>`;
}

export const enginePath = new URL("../lib/voomnet.js", import.meta.url).href;
export const syncPath = new URL("../lib/supabaseSync.js", import.meta.url).href;
export { root };

/* jsPDF + AutoTable : même bibliothèques que l'application, téléchargées si besoin */
const CDN = [
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.3/dist/jspdf.plugin.autotable.min.js"
];
export async function chargerJsPdf() {
  const dossiers = ["/tmp", "/home/user/_test"];
  const noms = ["jspdf.umd.min.js", "jspdf.autotable.min.js"];
  const sources = [];
  for (let i = 0; i < noms.length; i++) {
    let src = null;
    for (const d of dossiers) {
      try { src = fs.readFileSync(path.join(d, noms[i]), "utf8"); break; } catch { /* absent */ }
    }
    if (!src) {
      const r = await fetch(CDN[i]);
      if (!r.ok) throw new Error("jsPDF indisponible : " + CDN[i]);
      src = await r.text();
      for (const d of dossiers) { try { fs.writeFileSync(path.join(d, noms[i]), src); break; } catch { /* ignoré */ } }
    }
    sources.push(src);
  }
  return sources;
}
