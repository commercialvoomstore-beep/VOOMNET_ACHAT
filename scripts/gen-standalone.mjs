/**
 * Génère la version autonome « un seul fichier » (standalone/index.html)
 * à partir des mêmes sources que l'application Next.js :
 *   • app/globals.css      → <style>
 *   • scripts/shell.html   → structure de la page
 *   • lib/voomnet.js       → moteur applicatif (enveloppe ESM retirée)
 *
 * Usage : node scripts/gen-standalone.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const css = read("app/globals.css").trim();
const shell = read("scripts/shell.html").trim();

/* --- moteur : on retire l'enveloppe « module ES » ajoutée pour Next.js --- */
let js = read("lib/voomnet.js");
const marker = "  let wizSupCat = '';";
const start = js.indexOf(marker);
if (start < 0) throw new Error("Marqueur d'enveloppe introuvable dans lib/voomnet.js");
js = js.slice(start + marker.length);
js = js.replace(/\n\s*\}\s*$/, "\n");            // fermeture de initVoomnet()
js = js.split("\n").map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n").trim();

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VOOMNET — Gestion des Achats</title>
<!-- SheetJS (lecture/écriture Excel .xlsx). Sans Internet, l'application reste 100 % fonctionnelle en CSV et JSON. -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>
<style>
${css}
</style>
</head>
<body>

${shell}

<script>
/* ================================================================
   VOOMNET TECHNOLOGY — GESTION DES ACHATS (démo front-end)
   Application autonome générée depuis les sources Next.js
   (app/globals.css + scripts/shell.html + lib/voomnet.js).
   ================================================================ */
const XLSX = globalThis.XLSX; // bibliothèque SheetJS chargée depuis le CDN
${js}
<\/script>
</body>
</html>
`;

const outDir = path.join(root, "standalone");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

for (const f of ["modele_fournisseurs_voomnet.csv", "modele_fournisseurs_voomnet.json"]) {
  fs.copyFileSync(path.join(root, "public", f), path.join(outDir, f));
}

console.log(`✔ standalone/index.html généré (${(html.length / 1024).toFixed(0)} Ko)`);
console.log("✔ modèles CSV/JSON copiés dans standalone/");
