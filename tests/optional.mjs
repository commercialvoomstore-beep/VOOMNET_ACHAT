/**
 * Tests du nouveau fonctionnement « tout est facultatif » :
 *   étape 1 sans coût présumé, étape 2 sans fournisseur, étape 3 sans prix,
 *   étape 4 facultative, étape 5 sans choix → impression de la fiche.
 */
import { chargerPage, enginePath, syncPath, chargerJsPdf, root } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only",
});
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
globalThis.FileReader = w.FileReader; globalThis.Blob = w.Blob; globalThis.URL = w.URL;
w.scrollTo = () => {}; w.print = () => { printed++; };
let printed = 0;

const { initVoomnet } = await import(enginePath);
initVoomnet();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const input = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const nav = (p) => click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
const txt = () => $("#page-content").textContent.replace(/\s+/g, " ");
const lastToast = () => $("#toast-root").lastElementChild?.textContent || "";
const db = () => JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const stepper = () => ($("#page-content .stepper .stp.active")?.textContent || "").trim();
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

$("#login-id").value = "demandeur"; $("#login-pw").value = "demo123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("Connexion demandeur", !$("#app").classList.contains("hidden"));

/* ============ CAS 1 : aucune information chiffrée ============ */
nav("nouvelleDemande");
check("Assistant à l'étape 1", stepper().startsWith("1."), stepper());
click($('[data-act="add-article"]'));
let art = $$(".art input[data-ai]");
input(art[0], "Ramette de papier A4");
input(art[1], "20");
/* le coût présumé reste vide */
click($('[data-act="add-article"]'));
art = $$(".art input[data-ai]");
input(art[3], "Classeur suspendu");
input(art[4], "10");
input($("#f-motif"), "Ramette de papier A4");   // repère pour retrouver la demande dans la liste
click($('[data-act="wiz-next"]'));
check("Étape 1 → 2 sans aucun coût présumé", stepper().startsWith("2."), stepper());

/* étape 2 : aucun fournisseur sélectionné */
click($('[data-act="wiz-next"]'));
check("Étape 2 → 3 sans aucun fournisseur", stepper().startsWith("3."), stepper());
check("Grille sans colonne ne plante pas", !!$(".nego-toolbar"), txt().slice(0, 40));

/* étape 3 : aucun prix */
click($('[data-act="wiz-next"]'));
check("Étape 3 → 4 sans aucun prix (seuil = 0)", stepper().startsWith("4."), stepper());

/* étape 4 : comparaison facultative */
click($('[data-act="wiz-next"]'));
check("Étape 4 → 5 (comparaison facultative)", stepper().startsWith("5."), stepper());

/* étape 5 : aucun fournisseur retenu */
click($('[data-act="wiz-next"]'));
check("Étape 5 → 6 sans fournisseur retenu", stepper().startsWith("6."), stepper());
check("Avertissement affiché (sans bloquer)", /Aucun fournisseur retenu/.test(lastToast()), lastToast());

/* impression de la fiche depuis le récapitulatif */
printed = 0;
click($('[data-act="print-request"]'));
check("Impression de la fiche déclenchée", printed === 1);
const pr = $("#print-root").innerHTML;
check("La fiche contient le logo", /<img[^>]+src="[^"]*voomnet-logo\.png"/.test(pr) || /<img[^>]+base64/.test(pr));
check("La fiche est une FICHE DE DEMANDE D'ACHAT", /FICHE DE DEMANDE D'ACHAT/.test(pr));
check("Les colonnes de prix sont vides", /padding:6px;text-align:right"><\/td>/.test(pr.replace(/\s/g, "")) || !/FCFA/.test(pr));
check("Le montant total affiche « — »", />—</.test(pr.replace(/\s/g, "")));

/* soumission */
click($('[data-act="submit-request"]'));
const d1 = db();
const maDemande = d1.requests.find((r) => (r.articles || []).some((a) => a.designation === "Ramette de papier A4"));
check("Demande soumise sans prix ni fournisseur", !!maDemande && maDemande.statut === "en_attente", maDemande?.statut);
check("Aucun fournisseur retenu en base", maDemande && !maDemande.chosenSupplierId);
const toasts = $$("#toast-root > *").map((t) => t.textContent).join(" | ");
check("Avertissement à la soumission", /sans fournisseur retenu/.test(toasts), toasts.slice(-90));
check("Montant affiché « — » dans la liste", /—/.test(txt()));

/* ============ CAS 2 : fournisseurs choisis, mais aucun prix ============ */
nav("nouvelleDemande");
click($('[data-act="add-article"]'));
art = $$(".art input[data-ai]");
input(art[0], "Cartouche d'encre");
input(art[1], "5");
click($('[data-act="wiz-next"]'));
const boxes = $$("input[data-sid]");
[0, 1, 2].forEach((i) => { boxes[i].checked = true; boxes[i].dispatchEvent(new w.Event("change", { bubbles: true })); });
click($('[data-act="wiz-next"]'));
check("Étape 3 avec 3 fournisseurs, 0 prix saisi", /0 \/ 3 prix saisis/.test(txt()), txt().match(/\d \/ \d prix saisis/)?.[0]);
check("Colonnes marquées SANS RÉPONSE", $$('[data-rangof]').filter((e) => /SANS RÉPONSE/.test(e.textContent)).length === 3);
click($('[data-act="wiz-next"]'));
check("Passage autorisé sans aucun prix", stepper().startsWith("4."), stepper());
check("Comparaison : prix NON RENSEIGNÉ", /NON RENSEIGNÉ/.test(txt()));

/* ============ CAS 3 : validation puis bon de commande sans fournisseur ============ */
nav("mesDemandes");
const ligne = $$("#page-content tr").find((tr) => tr.textContent.includes("Ramette de papier A4"));
click(ligne.querySelector('[data-act="view-request"]'));
check("Bouton « Imprimer la fiche » sur le détail", !!$('[data-act="print-request"]'));
const numeroCible = ($("#page-content h2").textContent.match(/ACH-\d{4}-\d{5}/) || [])[0];

/* le responsable approuve */
click($('[data-act="logout"]'));
$("#login-id").value = "responsable"; $("#login-pw").value = "demo123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
nav("aValider");
const ligneV = $$("#page-content tr").find((tr) => tr.textContent.includes("Ramette de papier A4"));
click(ligneV.querySelector('[data-act="view-request"]'));
click($('[data-act="decide"][data-decision="Approuvée"]'));
click($$("#modal-root [data-mbtn]")[1]);
check("Demande approuvée par le responsable",
  db().requests.find((r) => r.numero === numeroCible)?.statut === "approuvee",
  db().requests.find((r) => r.numero === numeroCible)?.statut);

/* le demandeur crée la commande */
click($('[data-act="logout"]'));
$("#login-id").value = "demandeur"; $("#login-pw").value = "demo123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
nav("mesDemandes");
const ligne2 = $$("#page-content tr").find((tr) => tr.textContent.includes("Ramette de papier A4"));
click(ligne2.querySelector('[data-act="view-request"]'));
const btnBC = $('[data-act="goto-create-order"]');
check("Création de commande possible sans fournisseur retenu", !!btnBC);
if (btnBC) {
  click(btnBC);
  check("Écran de commande affiché", /Création de la commande/.test(txt()), txt().slice(0, 50));
  check("Fournisseur affiché « — »", /Fournisseur choisi/.test(txt()));
  printed = 0;
  const btnImp = $$('[data-act="print-order"]')[0];
  if (btnImp) { click(btnImp); check("BC imprimable sans prix", printed === 1 && /BON DE COMMANDE/.test($("#print-root").innerHTML)); }
  click($('[data-act="confirm-order"]'));
  const d3 = db();
  const ord = d3.orders[d3.orders.length - 1];
  check("Commande créée sans fournisseur", !!ord && !ord.supplierId);
  check("Montant de la commande = 0 (prix non fixés)", ord && +ord.total === 0, String(ord?.total));
}

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
