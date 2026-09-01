/**
 * Tests fonctionnels des améliorations de l'étape 3 (comparaison des prix).
 */
import { chargerPage, enginePath, syncPath, chargerJsPdf, root } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/",
  pretendToBeVisual: true,
});
const w = dom.window;
globalThis.window = w;
globalThis.document = w.document;
globalThis.localStorage = w.localStorage;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
globalThis.FileReader = w.FileReader;
globalThis.Blob = w.Blob;
globalThis.URL = w.URL;
w.scrollTo = () => {};

const { initVoomnet } = await import(enginePath);
initVoomnet();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const input = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const change = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("change", { bubbles: true })); };
const nav = (page) => click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === page));
const txt = () => $("#page-content").textContent.replace(/\s+/g, " ");
const money = (s) => String(s).replace(/[  ]/g, " ");
const lastToast = () => ($("#toast-root").lastElementChild?.textContent || "");

const ok = [], ko = [];
const check = (label, cond, extra = "") => (cond ? ok : ko).push(`${cond ? "✅" : "⛔"} ${label}${extra ? " — " + extra : ""}`);

/* Connexion admin + création d'une demande à 2 articles / 3 fournisseurs */
$("#login-id").value = "admin";
$("#login-pw").value = "admin123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));

/* les prix sont désormais facultatifs (seuil 0) : on repasse à 3 pour tester le blocage */
nav("parametres");
change($('[data-meta="seuilOffres"]'), 3);
nav("nouvelleDemande");
click($('[data-act="add-article"]'));
let art = $$(".art input[data-ai]");
input(art[0], "Écran TV 55 pouces"); input(art[1], "4"); input(art[2], "450000");
click($('[data-act="add-article"]'));   // le wizard est re-rendu à chaque ajout
art = $$(".art input[data-ai]");
input(art[3], "Support mural"); input(art[4], "4"); input(art[5], "50000");
check("Somme globale présumée = 2 000 000 FCFA", money($("[data-art-grand]").textContent).includes("2 000 000"), money($("[data-art-grand]").textContent));
click($('[data-act="wiz-next"]'));

const boxes = $$("input[data-sid]");
[0, 1, 2].forEach((i) => { boxes[i].checked = true; boxes[i].dispatchEvent(new w.Event("change", { bubbles: true })); });
const sids = [0, 1, 2].map((i) => boxes[i].dataset.sid);
click($('[data-act="wiz-next"]'));

/* ---------- ÉTAPE 3 ---------- */
check("Étape 3 : barre d'outils de saisie affichée", !!$(".nego-toolbar"));
check("Compteur initial 0 / 6 prix saisis", money($("[data-nego-count]").textContent).includes("0 / 6"), money($("[data-nego-count]").textContent));
check("Badge de seuil « 0 offre complète — minimum 3 »", /0 offre.*minimum 3/.test($("[data-nego-seuil]").textContent));
check("Bloc de pondération présent", !!$(".poids-box"));
check("Lignes de coût total rendu présentes", txt().includes("COÛT TOTAL RENDU"));
check("Ligne de score global présente", txt().includes("SCORE GLOBAL"));
check("3 colonnes marquées SANS RÉPONSE", $$('[data-rangof]').filter(e => e.textContent.includes("SANS RÉPONSE")).length === 3);

/* Pré-remplissage avec le coût présumé */
click($('[data-act="nego-prefill"]'));
check("Pré-remplissage : 6 / 6 prix saisis", money($("[data-nego-count]").textContent).includes("6 / 6"), money($("[data-nego-count]").textContent));
check("Pré-remplissage : 3 offres complètes", /3 offres complètes/.test($("[data-nego-seuil]").textContent), $("[data-nego-seuil]").textContent);
check("Toast de confirmation", /6 prix pré-remplis/.test(lastToast()), lastToast());
check("Meilleur prix surligné (prix identiques → 2 lignes × 3 = 6 cellules)", $$("td.cellbest").length === 6, $$("td.cellbest").length + " cellules");
check("Bannière « meilleure offre globale »", !!$("[data-bestbanner]") && $("[data-bestbanner]").textContent.includes("Meilleure offre globale"));
check("Rangs affichés 1️⃣/2️⃣/3️⃣", $$(".rank").length === 3, $$(".rank").length + " rangs");
check("Scores égaux (prix identiques, pas de délai) : 3 scores", $$("[data-scoreof] b").length === 3);

/* Modification d'un prix : recalcul en direct */
const cellule = (sid, i) => $(`input[data-of="${sid}"][data-ai="${i}"]`);
input(cellule(sids[0], 0), 400000);
check("Total de ligne recalculé (400 000 × 4)", money($(`[data-lt="${sids[0]}-0"]`).textContent).includes("1 600 000"), money($(`[data-lt="${sids[0]}-0"]`).textContent));
check("Écart % affiché (≈ −11 %)", /− 11 %/.test(money($(`[data-ec="${sids[0]}-0"]`).textContent)), money($(`[data-ec="${sids[0]}-0"]`).textContent));
check("Surlignage du meilleur prix déplacé", $(`[data-cell="${sids[0]}-0"]`).classList.contains("cellbest"));
check("Total brut recalculé (1 600 000 + 200 000)", money($(`[data-brutof="${sids[0]}"]`).textContent).includes("1 800 000"), money($(`[data-brutof="${sids[0]}"]`).textContent));

/* Recopie par ligne + recopie d'une ligne */
click($('[data-act="nego-copyrows"]'));
const p1 = +cellule(sids[0], 0).value, p2 = +cellule(sids[1], 0).value, p3 = +cellule(sids[2], 0).value;
check("Recopie par ligne : les 3 fournisseurs ont le même prix", p1 === p2 && p2 === p3, `${p1}/${p2}/${p3}`);
click($('[data-act="nego-copyrow"][data-id="1"]'));
const q = [0, 1, 2].map(i => +cellule(sids[i], 1).value);
check("Recopie d'une ligne (article 2)", q[0] === q[1] && q[1] === q[2] && q[0] > 0, q.join("/"));

/* Remise, frais de livraison, délai, garantie, paiement */
input($(`input[data-of="${sids[0]}"][data-f="remise"]`), 10);
check("Remise 10 % : net HT = 1 620 000", money($(`[data-netof="${sids[0]}"]`).textContent).includes("1 620 000"), money($(`[data-netof="${sids[0]}"]`).textContent));
input($(`input[data-of="${sids[1]}"][data-f="fraisLivraison"]`), 50000);
const tot1 = money($(`[data-totalof="${sids[1]}"]`).textContent);
check("Frais de livraison intégrés au coût total rendu", tot1.includes("2 050 000") || tot1.includes("1 850 000"), tot1);
input($(`input[data-of="${sids[2]}"][data-f="delai"]`), 2);
input($(`input[data-of="${sids[2]}"][data-f="garantie"]`), 3);
input($(`input[data-of="${sids[2]}"][data-f="paiement"]`), "60 jours");
check("Score recalculé après saisie délai/garantie/paiement", $$("[data-scoreof] b").length === 3);

/* Seuil : offre incomplète → blocage */
input(cellule(sids[2], 1), "");
check("Offre incomplète : colonne marquée SANS RÉPONSE", $(`[data-rangof="${sids[2]}"]`).textContent.includes("SANS RÉPONSE"));
check("Compteur retombé à 5 / 6", money($("[data-nego-count]").textContent).includes("5 / 6"), money($("[data-nego-count]").textContent));
click($('[data-act="wiz-next"]'));
check("Seuil non atteint → passage refusé", /2 offre\(s\) complète\(s\) sur 3/.test(lastToast()), lastToast());
check("Toujours sur l'étape 3", !!$(".nego-toolbar"));

/* On complète → passage autorisé */
input(cellule(sids[2], 1), 60000);
click($('[data-act="wiz-next"]'));
check("Seuil atteint → passage à l'étape 4 (comparaison)", txt().includes("Surligné en vert") || !$(".nego-toolbar"));
check("Étape 4 : coût total rendu affiché", txt().includes("COÛT TOTAL RENDU"));
check("Étape 4 : score global affiché", txt().includes("SCORE GLOBAL"));
check("Étape 4 : classement affiché", $$(".rank").length >= 2);

/* Étape 5 : recommandation */
click($('[data-act="wiz-next"]'));
check("Étape 5 : recommandation « meilleur score global »", txt().includes("Recommandation"));
const bestName = txt().match(/Recommandation : (.+?) —/)?.[1]?.trim();
click($('[data-act="nego-pickbest"]'));
check("Bouton « Retenir le mieux noté » fonctionne", txt().includes("Fournisseur retenu : " + bestName), bestName);
input($("#wiz-justif"), "Meilleur score global (prix, délai, garantie, paiement).");
click($('[data-act="wiz-next"]'));
check("Étape 6 : récapitulatif avec comparaison", txt().includes("Comparaison négociée des offres") || txt().includes("RÉCAPITULATIF") || txt().includes("Soumettre"));

/* Export de la comparaison */
let dl = null;
w.URL.createObjectURL = () => "blob:test";
const HTMLAnchor = w.HTMLAnchorElement.prototype;
HTMLAnchor.click = function () { dl = { name: this.download }; };
click($('[data-act="wiz-goto"][data-step="1"]'));
nav("mesDemandes");
const row = $$("#page-content tr").find((tr) => tr.textContent.includes("ACH-2026-00006"));
click(row.querySelector('[data-act="view-request"]'));
const resume = $('[data-act="resume-request"]');
click(resume);
/* retour à l'étape 3 puis export */
for (let i = 0; i < 6 && !$(".nego-toolbar"); i++) click($('[data-act="wiz-back"]') || $('[data-act="wiz-goto"]'));
if (!$(".nego-toolbar")) { // repartir du début de l'assistant si besoin
  for (let i = 0; i < 6 && !$(".nego-toolbar"); i++) click($('[data-act="wiz-next"]'));
}
check("Étape 3 retrouvée pour l'export", !!$(".nego-toolbar"), $(".nego-toolbar") ? "ok" : $("#page-content").textContent.slice(0, 60));
click($('[data-act="nego-export"]'));
check("Export de la comparaison déclenché (CSV de secours)", !!dl && /comparaison_ACH/.test(dl.name || ""), JSON.stringify(dl));

/* Paramètres : seuil, TVA et pondération */
nav("parametres");
check("Paramètres : réglages de comparaison présents", !!$('[data-meta="seuilOffres"]') && !!$('[data-meta="tva"]') && $$('[data-poids]').length === 4);
change($('[data-meta="tva"]'), 18);
check("TVA enregistrée (18 %)", /Paramètre enregistré/.test(lastToast()), lastToast());
change($('[data-meta="seuilOffres"]'), 2);
check("Seuil d'offres complètes enregistré (2)", /Paramètre enregistré/.test(lastToast()), lastToast());
change($('[data-poids="prix"]'), 80);
check("Pondération enregistrée", /Pondération enregistrée/.test(lastToast()), lastToast());

/* Retour dans la demande : la TVA (18 %) doit apparaître dans la grille */
nav("mesDemandes");
click($$("#page-content tr").find((tr) => tr.textContent.includes("ACH-2026-00006")).querySelector('[data-act="view-request"]'));
click($('[data-act="resume-request"]'));
for (let i = 0; i < 5 && !$(".nego-toolbar") && !txt().includes("COÛT TOTAL RENDU"); i++) click($('[data-act="wiz-next"]'));
check("Ligne « TVA (18 %) » affichée dans la grille", txt().includes("TVA (18 %)"), txt().slice(0, 80));
const tvaCell = $$("[data-tvaof]").map((e) => money(e.textContent));
check("Montant de TVA calculé pour chaque fournisseur", tvaCell.length === 3 && tvaCell.every((t) => /FCFA/.test(t)), tvaCell.join(" | "));

/* Seuil abaissé à 2 : une offre incomplète suffit désormais à passer */
while (!$(".nego-toolbar") && $('[data-act="wiz-back"]')) click($('[data-act="wiz-back"]'));
const cell2 = (sid, i) => $(`input[data-of="${sid}"][data-ai="${i}"]`);
input(cell2(sids[2], 1), "");
check("Seuil à 2 : 2 offres complètes → passage autorisé", (click($('[data-act="wiz-next"]')), !$(".nego-toolbar")), lastToast());
check("Fournisseur sans réponse exclu du classement", /SANS RÉPONSE/.test($("#page-content").innerHTML));

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
