/**
 * Impression : les prix doivent apparaître sur la fiche de demande
 * (avec OU sans fournisseur retenu) et sur le bon de commande.
 */
import { chargerPage, enginePath } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only",
});
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
globalThis.FileReader = w.FileReader; globalThis.Blob = w.Blob; globalThis.URL = w.URL;
w.scrollTo = () => {}; w.print = () => {};

const { initVoomnet } = await import(enginePath);
initVoomnet();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const input = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const nav = (p) => { click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
  const m = $("#modal-root"); if (m && m.textContent.trim()){ const b = $$("#modal-root [data-mbtn]")[1]; if (b) click(b); } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const db = () => JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);
const nettoyer = (t) => t.replace(/\s+/g, " ").replace(/ | /g, " ");

$("#login-id").value = "demandeur"; $("#login-pw").value = "demo123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));

/* --- demande avec 3 fournisseurs et des prix : 780 000 / 800 000 / 820 000 --- */
nav("nouvelleDemande");
click($('[data-act="add-article"]'));
input($(".art input[data-ai]"), "Ordinateur portable");
input($$(".art input[data-ai]")[1], "10");
input($$(".art input[data-ai]")[2], "800000");
click($('[data-act="wiz-next"]'));
const boxes = $$("input[data-sid]");
[0, 1, 2].forEach((i) => { boxes[i].checked = true; boxes[i].dispatchEvent(new w.Event("change", { bubbles: true })); });
click($('[data-act="wiz-next"]'));
$$(".cmp input[data-ai]").forEach((inp, i) => input(inp, String(780000 + i * 20000)));
await attendre(1200);
const d = db().requests[db().requests.length - 1];
const numeroDemande = d.numero;
check("Prix saisis enregistrés", Object.values(d.offers || {}).some((o) => Object.values(o.prixArticles || {}).some((v) => v > 0)));
check("Aucun fournisseur retenu (cas signalé)", !d.chosenSupplierId);

/* --- impression SANS fournisseur retenu --- */
click($('[data-act="wiz-next"]'));           /* étape 4 */
click($('[data-act="wiz-next"]'));           /* étape 5 (sans choix) */
click($('[data-act="wiz-next"]'));           /* étape 6 */
click($('[data-act="print-request"]'));
await attendre(400);
let html = nettoyer($("#print-root").innerHTML);
check("Les prix s'affichent SANS fournisseur retenu", /FCFA/.test(html), (html.match(/FCFA/g) || []).length + " montant(s)");
check("Le meilleur prix (780 000 FCFA) est repris", /780 000 FCFA/.test(html));
check("Le total est calculé (7 800 000 FCFA)", /7 800 000 FCFA/.test(html));
check("L'origine des prix est précisée", /Meilleurs prix obtenus/.test(html));
check("La colonne « Coût présumé » est présente", /Coût présumé/.test(html));
check("Le coût présumé (800 000 FCFA) apparaît", /800 000 FCFA/.test(html));

/* --- impression AVEC fournisseur retenu --- */
/* retour à l'étape 5 : on repasse par l'étape 1 puis on avance */
click($('[data-act="wiz-goto"][data-step="1"]'));
for (let i = 0; i < 6 && !$("#wiz-justif"); i++){
  click($('[data-act="wiz-goto"][data-step="1"]'));       /* certaines vues n'avancent que via « Continuer » */
  click($('[data-act="wiz-next"]'));
}
click($('[data-act="nego-pickbest"]'));
input($("#wiz-justif"), "Meilleur prix retenu.");
click($('[data-act="wiz-next"]'));
await attendre(1200);
const d2 = db().requests[db().requests.length - 1];
check("Fournisseur retenu enregistré", !!d2.chosenSupplierId, String(d2.chosenSupplierId));
click($('[data-act="print-request"]'));
await attendre(400);
html = nettoyer($("#print-root").innerHTML);
const prixRetenu = +Object.values((d2.offers || {})[d2.chosenSupplierId]?.prixArticles || {})[0] || 0;
check("Les prix s'affichent AVEC fournisseur retenu", /FCFA/.test(html), (html.match(/FCFA/g) || []).length + " montant(s)");
check("C'est bien le prix du fournisseur retenu qui figure", html.includes(prixRetenu.toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA"),
  prixRetenu + " FCFA");
check("L'origine indique le fournisseur retenu", /Prix négociés —/.test(html));

/* --- bon de commande --- */
nav("mesDemandes");
const ligne = $$("#page-content tr").find((tr) => tr.textContent.includes(numeroDemande));
click(ligne.querySelector('[data-act="view-request"]'));
click($('[data-act="goto-create-order"]'));
await attendre(600);
click($('[data-act="print-order"]'));
await attendre(400);
html = nettoyer($("#print-root").innerHTML);
check("Bon de commande : les prix s'affichent", /FCFA/.test(html), (html.match(/FCFA/g) || []).length + " montant(s)");
check("Bon de commande : montant total présent", /MONTANT TOTAL/.test(html));

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
