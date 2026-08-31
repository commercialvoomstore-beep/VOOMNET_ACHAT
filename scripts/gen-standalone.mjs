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
let shell = read("scripts/shell.html").trim();

/* --supabase-url=… --supabase-key=… : active la synchronisation Supabase
   dans le fichier autonome (sinon : fonctionnement local, comme avant). */
const arg = (n) => { const p = process.argv.find((a) => a.startsWith("--" + n + "=")); return p ? p.slice(n.length + 3) : ""; };
const sbUrl = arg("supabase-url") || process.env.SUPABASE_URL || "";
const sbKey = arg("supabase-key") || process.env.SUPABASE_ANON_KEY || "";
const supabaseActivated = !!(sbUrl && sbKey);

/* module de synchronisation : on retire « export » pour l'inclure tel quel */
const sync = read("lib/supabaseSync.js").replace(/^export /gm, "").trim();

/* logo embarqué en base64 : le fichier autonome fonctionne ainsi hors ligne */
const logoData = "data:image/png;base64," + fs.readFileSync(path.join(root, "public", "voomnet-logo.png")).toString("base64");
const iconData = "data:image/png;base64," + fs.readFileSync(path.join(root, "public", "voomnet-icon.png")).toString("base64");

/* --no-demo : retire le bloc « Comptes de démonstration » du fichier autonome
   (utile pour publier l'index.html sans exposer les identifiants). */
const noDemo = process.argv.includes("--no-demo") || process.env.DEMO_MODE === "0";
if (noDemo) {
  shell = shell.replace(/<div class="demo-box">[\s\S]*?\n<\/div>\n/, "");
  if (/demo-box/.test(shell)) throw new Error("Impossible de retirer le bloc de démonstration");
}

/* --- moteur : on retire l'enveloppe « module ES » ajoutée pour Next.js --- */
let js = read("lib/voomnet.js");
const marker = "  let wizSupCat = '';";
const start = js.indexOf(marker);
if (start < 0) throw new Error("Marqueur d'enveloppe introuvable dans lib/voomnet.js");
js = js.slice(start + marker.length);
js = js.replace(/\n\s*\}\s*$/, "\n");            // fermeture de initVoomnet()
js = js.split("\n").map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n").trim();

const htmlRaw = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VOOMNET — Gestion des Achats</title>
<!-- SheetJS (lecture/écriture Excel .xlsx). Sans Internet, l'application reste 100 % fonctionnelle en CSV et JSON. -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>
${
  supabaseActivated
    ? `<!-- Supabase : synchronisation des données (clé ANON publique) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>`
    : `<!-- Supabase (optionnel) : décommentez ce bloc et renseignez vos clés pour synchroniser les données
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script> -->`
}
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

/* ---------- Supabase (optionnel) ----------
   Renseignez vos clés ci-dessous (Projet Supabase → Settings → API) pour
   synchroniser les données entre plusieurs postes. Laisser vide = mode local. */
window.VOOMNET_SUPABASE = { url: ${JSON.stringify(sbUrl)}, key: ${JSON.stringify(sbKey)} };

/* Couche de synchronisation Supabase (lib/supabaseSync.js) */
${sync}

/* Branchement : crée le client si les clés sont renseignées */
(function(){
  var cfg = window.VOOMNET_SUPABASE || {};
  if (!cfg.url || !cfg.key || typeof createSupabaseSync !== 'function') return;
  var make = window.supabase && window.supabase.createClient;
  if (!make) { if (window.console) console.warn('[VOOMNET] bibliothèque Supabase absente — mode local'); return; }
  try { globalThis.__voomnetSupabase = createSupabaseSync(make, cfg.url, cfg.key); }
  catch(e){ if (window.console) console.warn('[VOOMNET] Supabase non initialisé — mode local', e); }
})();

const XLSX = globalThis.XLSX; // bibliothèque SheetJS chargée depuis le CDN
${js}
<\/script>
</body>
</html>
`;

const outDir = path.join(root, "standalone");
fs.mkdirSync(outDir, { recursive: true });
/* remplacement des chemins du logo par les données embarquées + favicon */
const html = htmlRaw
  .split('src="/voomnet-logo.png"').join(`src="${logoData}"`)
  .replace("</head>", `  <link rel="icon" href="${iconData}">\n</head>`);

fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

for (const f of ["modele_fournisseurs_voomnet.csv", "modele_fournisseurs_voomnet.json"]) {
  fs.copyFileSync(path.join(root, "public", f), path.join(outDir, f));
}

console.log(`✔ standalone/index.html généré (${(html.length / 1024).toFixed(0)} Ko)`);
console.log(noDemo ? "✔ bloc « Comptes de démonstration » retiré (--no-demo)" : "✔ bloc « Comptes de démonstration » conservé");
console.log(supabaseActivated ? "✔ Supabase activé (synchronisation des données)" : "✔ Supabase non configuré (mode local) — voir --supabase-url / --supabase-key");
console.log("✔ modèles CSV/JSON copiés dans standalone/");
