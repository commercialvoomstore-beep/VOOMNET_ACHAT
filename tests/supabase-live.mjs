/**
 * Vérification en lecture seule sur le projet Supabase réel :
 * l'application s'hydrate bien depuis le serveur. N'ÉCRIT RIEN.
 */
import { chargerPage, enginePath, syncPath, chargerJsPdf, root } from "./page.mjs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
const require = createRequire(root + "/");
const requireTest = createRequire(root + "/");
const { createClient } = require("@supabase/supabase-js");
const ws = requireTest("ws");
const URL_ = "https://uistajnkedyfkgabjbmx.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpc3Rham5rZWR5ZmtnYWJqYm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTMxOTYsImV4cCI6MjEwMzQ4OTE5Nn0.37ByrzOkKJcLGbM5rLI2YXJV0QLJU_MNn3koEq5hucw";

const client = createClient(URL_, KEY, { auth: { persistSession: false }, realtime: { transport: ws } });
const count = async (t) => { const { data } = await client.from(t).select("id"); return (data || []).length; };
const distant = {
  users: await count("users"), suppliers: await count("suppliers"),
  requests: await count("requests"), orders: await count("orders"), meta: await count("meta")
};
console.log("  serveur :", JSON.stringify(distant));

const dom = new JSDOM(await chargerPage(), { url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only" });
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w); globalThis.FileReader = w.FileReader;
globalThis.Blob = w.Blob; globalThis.URL = w.URL; w.scrollTo = () => {}; w.print = () => {};
const { createSupabaseSync } = await import(syncPath);
const sync = createSupabaseSync(() => client, URL_, KEY);
globalThis.__voomnetSupabase = sync;
const { initVoomnet } = await import(enginePath);
initVoomnet();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(4000);
const db = JSON.parse(w.localStorage.getItem("voomnet_achats_v4") || "{}");
const local = {
  users: (db.users || []).length, suppliers: (db.suppliers || []).length,
  requests: (db.requests || []).length, orders: (db.orders || []).length, meta: db.meta ? 1 : 0
};
console.log("  local   :", JSON.stringify(local));

const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);
check("Hydratation depuis Supabase (utilisateurs)", local.users === distant.users, `${local.users}/${distant.users}`);
check("Hydratation depuis Supabase (fournisseurs)", local.suppliers === distant.suppliers, `${local.suppliers}/${distant.suppliers}`);
check("Hydratation depuis Supabase (demandes)", local.requests === distant.requests, `${local.requests}/${distant.requests}`);
check("Hydratation depuis Supabase (commandes)", local.orders === distant.orders, `${local.orders}/${distant.orders}`);
check("Paramètres synchronisés (seuil)", db.meta && typeof db.meta.seuilOffres === "number", String(db.meta?.seuilOffres));
check("Aucune erreur de synchronisation", !sync.getError(), String(sync.getError() || ""));
console.log(ok.join("\n")); if (ko.length) console.log(ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
