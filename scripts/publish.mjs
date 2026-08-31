#!/usr/bin/env node
/**
 * PUBLICATION — enchaîne toute la chaîne de livraison en une commande :
 *
 *   1. régénère la version autonome (standalone/index.html)
 *   2. vérifie la compilation (npm run build : TypeScript + ESLint)
 *   3. commit les modifications
 *   4. pousse vers GitHub (branche main)
 *   5. attend le redéploiement Vercel et vérifie que le nouveau build est en ligne
 *
 * Usage :
 *   node scripts/publish.mjs "Message du commit"
 *   node scripts/publish.mjs "Message" --no-build      # sans recompiler
 *   node scripts/publish.mjs "Message" --no-standalone # sans régénérer l'autonome
 */
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const args = process.argv.slice(2);
const message = args.find((a) => !a.startsWith("--"));
const noBuild = args.includes("--no-build");
const noStandalone = args.includes("--no-standalone");
const SITE = process.env.VERCEL_SITE || "https://voomnetachat.vercel.app";

const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, encoding: "utf8", ...opts });
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || ""), status: r.status };
};
const step = (n, t) => console.log(`\n\x1b[36m[${n}]\x1b[0m ${t}`);
const fail = (t) => { console.log(`\x1b[31m✘ ${t}\x1b[0m`); process.exit(1); };

if (!message) fail('Message de commit manquant. Exemple : node scripts/publish.mjs "Ajout du rapport mensuel"');

/* ---------- 0. état du dépôt ---------- */
step(0, "Vérification du dépôt");
const remote = run("git remote get-url origin");
if (!remote.ok || !remote.out.trim()) fail("Aucun dépôt distant « origin » configuré");
console.log("   remote :", remote.out.trim());
const branch = run("git rev-parse --abbrev-ref HEAD").out.trim();
console.log("   branche :", branch);

/* Clé SSH : le fichier .git/config n'étant pas conservé entre les sessions,
   on reconfigure la commande SSH à chaque publication. */
const home = process.env.HOME || "/home/user";
const keyPath = process.env.SSH_KEY || path.join(home, ".ssh/id_ed25519_voomnet");
if (fs.existsSync(keyPath)) {
  try { fs.chmodSync(home + "/.ssh", 0o700); fs.chmodSync(keyPath, 0o600); } catch { /* ignoré */ }
  run(`git config core.sshCommand "ssh -i ${keyPath} -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes"`);
  console.log("   clé SSH :", keyPath);
} else {
  console.log("   ⚠ clé SSH introuvable :", keyPath, "→ le push exigera vos identifiants");
}

/* ---------- 1. version autonome ---------- */
if (!noStandalone) {
  step(1, "Régénération de la version autonome (standalone/index.html)");
  const r = run("node scripts/gen-standalone.mjs");
  console.log(r.out.trim().split("\n").map((l) => "   " + l).join("\n"));
  if (!r.ok) fail("Échec de la génération autonome");
}

/* ---------- 2. compilation ---------- */
if (!noBuild) {
  step(2, "Compilation et contrôles (npm run build)");
  const r = run("npm run build");
  if (!r.ok) fail("La compilation a échoué — rien n'est publié.\n" + r.out.slice(-1500));
  const lignes = r.out.split("\n").filter((l) => /Route|Compiled|error|warn/i.test(l));
  console.log(lignes.slice(0, 6).map((l) => "   " + l.trim()).join("\n"));
  console.log("   ✔ compilation OK");
}

/* ---------- 3. commit ---------- */
step(3, "Commit");
run("git add -A");
const staged = run("git diff --cached --name-only").out.trim();
const enAvance = run(`git rev-list origin/${branch}..HEAD --count`).out.trim();
let sha = run("git rev-parse --short HEAD").out.trim();
if (!staged) {
  if (!enAvance || enAvance === "0") { console.log("   (déjà à jour : aucune modification à publier)"); process.exit(0); }
  console.log(`   (rien à committer, mais ${enAvance} commit(s) local(aux) pas encore poussé(s))`);
} else {
console.log("   fichiers :\n" + staged.split("\n").map((f) => "     • " + f).join("\n"));
  const c = run(`git -c user.name="Arena Agent" -c user.email="agent@arena.ai" commit -q -m ${JSON.stringify(message)}`);
  if (!c.ok) fail("Le commit a échoué\n" + c.out);
  sha = run("git rev-parse --short HEAD").out.trim();
  console.log(`   ✔ commit ${sha} — ${message}`);
}

/* ---------- 4. push ---------- */
step(4, "Push vers GitHub");
const before = buildHash();
const p = run('GIT_TERMINAL_PROMPT=0 git push origin ' + branch);
if (!p.ok) fail("Le push a échoué\n" + p.out);
console.log(`   ✔ poussé vers origin/${branch}`);

/* ---------- 5. déploiement Vercel ---------- */
step(5, "Déploiement Vercel");
console.log("   site :", SITE);
const deadline = Date.now() + 6 * 60 * 1000;
let deploye = false;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 20000));
  const now = buildHash();
  if (now && now === sha) { deploye = true; console.log(`   ✔ commit ${sha} en ligne`); break; }
  if (now && now !== before) { deploye = true; console.log("   ✔ nouveau build en ligne :", now); break; }
  process.stdout.write(".");
}
if (!deploye) console.log("\n   ⚠ le nouveau build n'a pas encore été détecté (Vercel peut prendre quelques minutes)");
else {
  const check = run(`curl -s -o /dev/null -w "%{http_code}" ${SITE}`);
  console.log("   site accessible :", check.out.trim() === "200" ? "✔ HTTP 200" : "✘ " + check.out.trim());
}

console.log(`\n\x1b[32m✔ Publié : ${message}\x1b[0m`);
console.log(`  GitHub  : https://github.com/commercialvoomstore-beep/VOOMNET_ACHAT/commit/${sha}`);
console.log(`  Vercel  : ${SITE}`);

/* --- empreinte du build servi, pour détecter le nouveau déploiement --- */
function buildHash() {
  try {
    const html = execSync(`curl -s --max-time 30 ${SITE}`, { encoding: "utf8" });
    /* la page expose le numéro de commit déployé : <meta name="voomnet-build" content="89b8b7e"> */
    const m = html.match(/<meta name="voomnet-build" content="([^"]*)"/);
    if (m) return m[1];
    const b = html.match(/\/_next\/static\/([A-Za-z0-9_-]{8,})\//);
    if (b) return b[1];
    const c = html.match(/\/_next\/static\/chunks\/app\/page-([a-z0-9]+)\.js/);
    return c ? c[1] : "";
  } catch { return ""; }
}
