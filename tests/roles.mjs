/**
 * Rôles : le RESPONSABLE peut désormais créer et suivre ses propres demandes.
 * Vérifie aussi que le demandeur et l'administrateur conservent leurs droits.
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
const menu = () => $$("#sidebar-nav .nav-item").map((b) => b.dataset.page);
const aller = (p) => { click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
  const m = $("#modal-root"); if (m && m.textContent.trim()){ const b = $$("#modal-root [data-mbtn]")[1]; if (b) click(b); } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const db = () => JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const login = (u, p) => { $("#login-id").value = u; $("#login-pw").value = p;
  $("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); };
const logout = () => click($('[data-act="logout"]'));
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

/* ============ RESPONSABLE ============ */
login("responsable", "demo123");
check("Responsable connecté", !$("#app").classList.contains("hidden"));
const mResp = menu();
check("Menu responsable : « Nouvelle demande » présente", mResp.includes("nouvelleDemande"), mResp.join(", "));
check("Menu responsable : « Mes demandes » présente", mResp.includes("mesDemandes"));
check("Menu responsable : « Fournisseurs » accessible", mResp.includes("fournisseurs"));
check("Menu responsable : validation conservée", mResp.includes("aValider"));

/* il crée une demande */
aller("nouvelleDemande");
check("Le responsable accède à l'assistant", /Nouvelle demande/.test($("#page-content").textContent));
click($('[data-act="add-article"]'));
input($(".art input[data-ai]"), "Demande du responsable");
input($$(".art input[data-ai]")[1], "2");
input($$(".art input[data-ai]")[2], "150000");
/* on avance dans l'assistant jusqu'au bouton de soumission (étape 6) */
for (let i = 0; i < 8 && !$('[data-act="submit-request"]'); i++){
  const next = $('[data-act="wiz-next"]');
  if (!next) break;
  click(next);
}
check("Le responsable atteint l'étape de soumission", !!$('[data-act="submit-request"]'));
click($('[data-act="submit-request"]'));
await attendre(1200);
const resp = db().users.find((u) => u.identifiant === "responsable");
const sienne = db().requests.filter((r) => r.demandeurId === resp.id);
check("La demande du responsable est enregistrée", sienne.length >= 1, sienne.map((r) => r.numero).join(", "));
check("Statut : en attente de validation", sienne[0] && sienne[0].statut === "en_attente", sienne[0]?.statut);
check("Le responsable reçoit la notification de demande à valider",
  db().notifications.some((n) => n.userId === resp.id && /à valider/.test(n.texte)));
/* le badge de la cloche s'affiche */
check("Badge de notification visible pour le responsable",
  ($("#bell-badge")?.textContent || "0") !== "0", "badge = " + ($("#bell-badge")?.textContent || "?"));

/* il retrouve sa demande dans « Mes demandes » */
aller("mesDemandes");
check("Sa demande apparaît dans « Mes demandes »",
  $$("#page-content tr").some((tr) => tr.textContent.includes(sienne[0].numero)));
aller("aValider");
check("Sa demande apparaît aussi dans « Demandes à valider »",
  $$("#page-content tr").some((tr) => tr.textContent.includes(sienne[0].numero)));
check("Alerte de validation détectée", !!$("#page-content").textContent.match(/Demande à valider|Demandes à valider/));

/* garde-fou : valider sa propre demande prévient l'utilisateur */
aller("aValider");
const ligne = $$("#page-content tr").find((tr) => tr.textContent.includes(sienne[0].numero));
click(ligne?.querySelector('[data-act="view-request"]'));
await attendre(300);
const btnApprove = $('[data-act="decide"][data-decision="Approuvée"]');
check("Bouton « Approuver » disponible sur le détail", !!btnApprove);
if (btnApprove){
  click(btnApprove);
  await attendre(400);
  check("Confirmation : validation de sa propre demande signalée", /Vous êtes l’auteur de cette demande/.test($("#modal-root").textContent || ""), ($("#modal-root").textContent || "").replace(/\s+/g,' ').slice(0,110));
  click($$("#modal-root [data-mbtn]")[1]);               /* on approuve */
  await attendre(600);
  const apres = db().requests.find((r) => r.id === sienne[0].id);
  check("La demande est bien approuvée", apres && apres.statut === "approuvee", apres?.statut);
}

/* ============ DEMANDEUR (non régression) ============ */
logout();
login("demandeur", "demo123");
const mDem = menu();
check("Menu demandeur inchangé", !mDem.includes("aValider") && mDem.includes("nouvelleDemande"), mDem.join(", "));
logout();
login("admin", "admin123");
const mAdm = menu();
check("Menu administrateur inchangé", mAdm.includes("utilisateurs") && mAdm.includes("parametres"));

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
