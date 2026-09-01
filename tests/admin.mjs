/**
 * Tests : suppressions administrateur (demandes, utilisateurs, commandes, réceptions)
 *         et exports PDF (demandes, commandes, réceptions).
 */
import { chargerPage, enginePath, syncPath, chargerJsPdf, root } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only",
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
w.print = () => {};                       // repli hors-ligne (impression)

/* --- injection de jsPDF + AutoTable (équivalent du CDN) --- */
const [jspdfSrc, autoTableSrc] = await chargerJsPdf();
w.eval(jspdfSrc); w.eval(autoTableSrc);
globalThis.jspdf = w.jspdf;

/* capture des téléchargements (ancre <a download>) */
const saved = { name: "" };
const origDispatch = w.HTMLAnchorElement.prototype.dispatchEvent;
w.HTMLAnchorElement.prototype.dispatchEvent = function (ev) {
  if (this.download && ev && ev.type === "click") saved.name = this.download;
  return origDispatch.call(this, ev);
};
w.HTMLAnchorElement.prototype.click = function () { if (this.download) saved.name = this.download; };
/* jsdom n'implémente pas createObjectURL (les navigateurs si) */
w.URL.createObjectURL = () => "blob:test";
w.URL.revokeObjectURL = () => {};

const { initVoomnet } = await import(enginePath);
initVoomnet();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const nav = (p) => click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
const lastToast = () => $("#toast-root").lastElementChild?.textContent || "";
const db = () => JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const login = (u, p) => {
  $("#login-id").value = u; $("#login-pw").value = p;
  $("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
};
const confirmYes = () => click($$("#modal-root [data-mbtn]")[1]);
const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

login("admin", "admin123");

/* ------------- 1. SUPPRESSION D'UNE DEMANDE (cascade commandes/réceptions) ------------- */
nav("toutesDemandes");
check("Liste demandes : bouton 📄 PDF", !!$('[data-act="export-pdf-requests"]'));
check("Liste demandes : icône 🗑️ par ligne", $$('[data-act="delete-request"]').length === db().requests.length,
  $$('[data-act="delete-request"]').length + " icônes");
const a0 = { r: db().requests.length, o: db().orders.length, c: db().receptions.length };
click($$("#page-content tr").find((tr) => tr.textContent.includes("ACH-2026-00001")).querySelector('[data-act="delete-request"]'));
check("Modale : confirmation de suppression", /Supprimer définitivement la demande/.test($("#modal-root").textContent));
check("Modale : cascade annoncée", /commande\(s\) et .* réception\(s\) liée\(s\)/.test($("#modal-root").textContent));
confirmYes();
const a1 = db();
check("Demande supprimée", a1.requests.length === a0.r - 1 && !a1.requests.some((r) => r.numero === "ACH-2026-00001"));
check("Commande liée supprimée en cascade", a1.orders.length === a0.o - 1 && !a1.orders.some((o) => o.numero === "BC-2026-00001"));
check("Réception liée supprimée en cascade", a1.receptions.length === a0.c - 1);
check("Notifications associées purgées", !a1.notifications.some((n) => String(n.texte).includes("ACH-2026-00001")));
check("Toast de confirmation", /ACH-2026-00001 supprimée/.test(lastToast()), lastToast());

/* ---------------------------- 2. SUPPRESSION DE COMMANDE ---------------------------- */
nav("commandes");
check("Commandes : bouton 📄 PDF", !!$('[data-act="export-pdf-orders"]'));
check("Commandes : icône 🗑️", $$('[data-act="delete-order"]').length === db().orders.length);
const oAvant = db().orders.length;
const idOrdreSupprime = $('[data-act="delete-order"]').dataset.id;
click($('[data-act="delete-order"]'));
confirmYes();
const a2 = db();
check("Commande supprimée", a2.orders.length === oAvant - 1);
check("Demande repassée à APPROUVÉE", a2.requests.some((r) => r.numero === "ACH-2026-00002" && r.statut === "approuvee"),
  a2.requests.find((r) => r.numero === "ACH-2026-00002")?.statut);
check("Réception de la commande supprimée", !a2.receptions.some((x) => x.orderId === idOrdreSupprime));

/* ---------------------------- 3. SUPPRESSION D'UTILISATEURS ---------------------------- */
nav("utilisateurs");
check("Utilisateurs : icône 🗑️ (sauf soi-même)", $$('[data-act="delete-user"]').length === db().users.length - 1,
  $$('[data-act="delete-user"]').length + " / " + db().users.length);
const lignes = $$("#page-content tr").filter((tr) => tr.querySelector('[data-act="delete-user"]'));
click(lignes.find((tr) => tr.textContent.includes("AYA SERGE")).querySelector('[data-act="delete-user"]'));
check("Refus si l'utilisateur a des demandes", /désactivez le compte/.test(lastToast()), lastToast());
const uAvant = db().users.length;
const libre = lignes.find((tr) => {
  const nom = tr.querySelector(".cell-main").textContent.trim();
  const u = db().users.find((x) => nom.startsWith(x.nom));
  return u && !db().requests.some((r) => r.demandeurId === u.id);
});
if (libre) {
  click(libre.querySelector('[data-act="delete-user"]'));
  confirmYes();
  check("Utilisateur sans demande supprimé", db().users.length === uAvant - 1, `${uAvant} → ${db().users.length}`);
} else check("Utilisateur sans demande supprimé", false, "aucun utilisateur supprimable");

/* ------------------- 4. RÉINITIALISATION PUIS EXPORTS (PDF / Excel) ------------------- */
nav("parametres");
click($('[data-act="reset-demo"]'));
confirmYes();
check("Données de démonstration réinitialisées", db().requests.length === 5 && db().orders.length === 2 && db().receptions.length === 2);
login("admin", "admin123");

nav("toutesDemandes");
saved.name = "";
click($('[data-act="export-pdf-requests"]'));
await wait();
check("Export PDF des demandes", /^demandes_voomnet\.pdf$/.test(saved.name), saved.name || "(aucun téléchargement)");
check("Toast export PDF demandes", /Export PDF/.test(lastToast()), lastToast());

nav("commandes");
saved.name = "";
click($('[data-act="export-pdf-orders"]'));
await wait();
check("Export PDF des commandes", /^commandes_voomnet\.pdf$/.test(saved.name), saved.name || "(aucun téléchargement)");

nav("receptions");
check("Réceptions : boutons d'export", !!$('[data-act="export-receptions"]') && !!$('[data-act="export-pdf-receptions"]'));
saved.name = "";
click($('[data-act="export-pdf-receptions"]'));
await wait();
check("Export PDF des réceptions", /^receptions_voomnet\.pdf$/.test(saved.name), saved.name || "(aucun téléchargement)");
saved.name = "";
click($('[data-act="export-receptions"]'));
await wait(200);
check("Export Excel des réceptions", /receptions_voomnet/.test(saved.name), saved.name || "(aucun téléchargement)");

const rAvant = db().receptions.length;
click($('[data-act="delete-reception"]'));
confirmYes();
check("Réception supprimée", db().receptions.length === rAvant - 1, `${rAvant} → ${db().receptions.length}`);

/* ---------------------------- 5. DROITS DU DEMANDEUR ---------------------------- */
click($('[data-act="logout"]'));
login("demandeur", "demo123");
nav("mesDemandes");
check("Demandeur : aucune suppression de demande", $$('[data-act="delete-request"]').length === 0);
nav("commandes");
check("Demandeur : aucune suppression de commande", $$('[data-act="delete-order"]').length === 0);
check("Demandeur : exports PDF accessibles", !!$('[data-act="export-pdf-orders"]'));
nav("receptions");
check("Demandeur : aucune suppression de réception", $$('[data-act="delete-reception"]').length === 0);

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
