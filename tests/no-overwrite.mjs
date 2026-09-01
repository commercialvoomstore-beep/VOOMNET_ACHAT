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
const count = async (t) => { const { data } = await client.from(t).select("id"); return data.length; };
const avant = { users: await count("users"), suppliers: await count("suppliers"), requests: await count("requests") };
console.log("  AVANT  →", JSON.stringify(avant));

/* --- nouvel appareil : localStorage vide, donc jeu de démo local --- */
const dom = new JSDOM(await chargerPage(), { url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only" });
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w); globalThis.FileReader = w.FileReader;
globalThis.Blob = w.Blob; globalThis.URL = w.URL; w.scrollTo = () => {}; w.print = () => {};
const { createSupabaseSync } = await import(syncPath);
globalThis.__voomnetSupabase = createSupabaseSync(() => client, URL_, KEY);
const { initVoomnet } = await import(enginePath);
initVoomnet();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
await wait(4000);
/* on se connecte avec un utilisateur du serveur et on navigue (déclenche des render) */
$("#login-id").value = "admin"; $("#login-pw").value = "admin123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(4000);
const nav = (p) => { const b = $$("#sidebar-nav .nav-item").find((x) => x.dataset.page === p); b && b.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
nav("fournisseurs"); await wait(2500);
nav("toutesDemandes"); await wait(2500);

const apres = { users: await count("users"), suppliers: await count("suppliers"), requests: await count("requests") };
console.log("  APRÈS  →", JSON.stringify(apres));

const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);
check("Les utilisateurs du serveur ne sont PAS supprimés", apres.users === avant.users, `${avant.users} → ${apres.users}`);
check("Les 112 fournisseurs ne sont PAS écrasés", apres.suppliers === avant.suppliers, `${avant.suppliers} → ${apres.suppliers}`);
check("La demande du client n'est PAS supprimée", apres.requests === avant.requests, `${avant.requests} → ${apres.requests}`);
const db = JSON.parse(w.localStorage.getItem("voomnet_achats_v4") || "{}");
check("L'appareil a adopté les données du serveur", (db.suppliers || []).length === avant.suppliers, `${(db.suppliers || []).length} fournisseurs en local`);
console.log(ok.join("\n")); if (ko.length) console.log(ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
