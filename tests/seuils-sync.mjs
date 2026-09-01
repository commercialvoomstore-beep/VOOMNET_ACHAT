/**
 * Vérifie que les seuils de relance (alerte / urgence) sont bien
 * synchronisés via la colonne JSONB « poids » — sans colonne SQL ajoutée.
 */
import { createSupabaseSync } from "../lib/supabaseSync.js";

/* --- faux client Supabase en mémoire --- */
function fauxClient() {
  const tables = {};
  const tbl = (t) => (tables[t] = tables[t] || new Map());
  const builder = (t) => {
    let op = null, payload = null, filtre = null;
    const exec = () => {
      const T = tbl(t);
      if (op === "select") return { data: [...T.values()].map((r) => JSON.parse(JSON.stringify(r))), error: null };
      if (op === "upsert" || op === "insert") { (payload || []).forEach((r) => T.set(r.id, JSON.parse(JSON.stringify(r)))); return { data: payload, error: null }; }
      if (op === "delete") {
        if (filtre && filtre.ids) filtre.ids.forEach((id) => T.delete(id));
        else if (filtre && filtre.tout) T.clear();
        return { data: [], error: null };
      }
      return { data: [], error: null };
    };
    const b = {
      select: () => { op = "select"; return b; },
      upsert: (r) => { op = "upsert"; payload = r; return b; },
      insert: (r) => { op = "insert"; payload = r; return b; },
      delete: () => { op = "delete"; return b; },
      in: (c, ids) => { filtre = { ids }; return b; },
      neq: () => { filtre = { tout: true }; return b; },
      then: (res, rej) => Promise.resolve().then(exec).then(res, rej)
    };
    return b;
  };
  return { from: builder, channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {}, _tables: tables };
}

const client = fauxClient();
const sync = createSupabaseSync(() => client, "https://test.supabase.co", "cle");

const DB = {
  users: [{ id: "u1", nom: "TEST", identifiant: "test", email: "", tel: "", service: "", fonction: "", password: "", role: "admin", statut: "Actif" }],
  suppliers: [], requests: [], orders: [], receptions: [], notifications: [],
  meta: { achCounter: 5, bcCounter: 2, seuilOffres: 0, tva: 0, delaiAlerte: 2, delaiUrgence: 9, poids: { prix: 50, delai: 20, garantie: 20, paiement: 10 } }
};

const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

/* --- 1. envoi --- */
await sync.push(DB);
const ligne = client._tables.meta.get("app");
check("Ligne meta écrite", !!ligne);
check("Les seuils voyagent dans la colonne poids", ligne.poids._alerte === 2 && ligne.poids._urgence === 9, JSON.stringify(ligne.poids));
check("La pondération reste intacte", ligne.poids.prix === 50 && ligne.poids.paiement === 10, JSON.stringify(ligne.poids));

/* --- 2. relecture --- */
const relu = await sync.fetchAll();
check("delaiAlerte relu", relu.meta.delaiAlerte === 2, String(relu.meta.delaiAlerte));
check("delaiUrgence relu", relu.meta.delaiUrgence === 9, String(relu.meta.delaiUrgence));
check("Pondération relue sans les clés techniques", !("_alerte" in relu.meta.poids) && relu.meta.poids.prix === 50, JSON.stringify(relu.meta.poids));

/* --- 3. modification par un autre poste --- */
const autre = JSON.parse(JSON.stringify(relu));
autre.meta.delaiAlerte = 6;
await sync.push(autre);
const relu2 = await sync.fetchAll();
check("Nouvelle valeur synchronisée", relu2.meta.delaiAlerte === 6, String(relu2.meta.delaiAlerte));

/* --- 4. compatibilité : anciennes données sans seuils --- */
client._tables.meta.set("app", { id: "app", ach_counter: 1, bc_counter: 1, seuil_offres: 0, tva: 0, poids: { prix: 50, delai: 20, garantie: 20, paiement: 10 } });
const relu3 = await sync.fetchAll();
check("Anciennes données : valeurs par défaut (3 / 7)", relu3.meta.delaiAlerte === 3 && relu3.meta.delaiUrgence === 7,
  `${relu3.meta.delaiAlerte} / ${relu3.meta.delaiUrgence}`);

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
