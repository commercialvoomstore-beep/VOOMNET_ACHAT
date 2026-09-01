/**
 * Exécute tous les tests fonctionnels du projet.
 *   npm test
 * (les tests marqués « réseau » interrogent le projet Supabase en lecture seule)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const reseau = new Set(["supabase-live.mjs", "no-overwrite.mjs"]);
const fichiers = fs.readdirSync(ici)
  .filter((f) => f.endsWith(".mjs") && f !== "page.mjs" && f !== "run.mjs")
  .sort();

let echecs = 0;
console.log(`\n🧪 ${fichiers.length} séries de tests\n${"─".repeat(58)}`);
for (const f of fichiers) {
  const r = spawnSync(process.execPath, [path.join(ici, f)], {
    encoding: "utf8", timeout: 300000, env: { ...process.env, FORCE_COLOR: "0" }
  });
  const sortie = ((r.stdout || "") + (r.stderr || "")).trim();
  const resume = sortie.split("\n").reverse().find((l) => /OK \/|ÉCHEC/.test(l)) || "(pas de résultat)";
  const ok = /(\d+) OK \/ 0 ÉCHEC/.test(resume);
  if (!ok) echecs++;
  console.log(`${ok ? "✅" : "❌"} ${f.padEnd(22)} ${resume.replace(/[✅⛔]/g, "").trim()}${reseau.has(f) ? "   (réseau)" : ""}`);
  if (!ok) console.log(sortie.split("\n").filter((l) => /⛔/.test(l)).map((l) => "      " + l.trim()).join("\n"));
}

console.log("─".repeat(58));
if (echecs) {
  console.log(`\n❌ ${echecs} série(s) en échec\n`);
  process.exit(1);
}
console.log(`\n✅ Toutes les séries de tests sont au vert\n`);
