/**
 * Tests de l'envoi des demandes par e-mail :
 *   - envoi automatique à la soumission (submitRequest -> POST /api/email)
 *   - envoi automatique à la décision (decideRequest -> POST /api/email)
 *   - bouton « ✉️ Envoyer par mail » et modale d'envoi (SMTP + Outlook mailto:)
 *   - prise en compte du champ « Adresses e-mail de réception » dans ⚙️ Paramètres
 */
import { chargerPage, enginePath } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
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
w.print = () => {};

const appelsEmail = [];
globalThis.fetch = async (url, opts) => {
  if (String(url).includes("/api/email")) {
    const body = JSON.parse(opts.body || "{}");
    appelsEmail.push(body);
    return {
      ok: true,
      json: async () => ({ ok: true, configured: true, sentTo: body.to }),
    };
  }
  return { ok: true, json: async () => ({}) };
};

const { initVoomnet } = await import(enginePath);
initVoomnet();

const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const input = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("input", { bubbles: true })); };
const change = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event("change", { bubbles: true })); };
const aller = (p) => {
  click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
  const m = $("#modal-root");
  if (m && m.textContent.trim()) {
    const b = $$("#modal-root [data-mbtn]")[1];
    if (b) click(b);
  }
};
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const login = (u, p) => {
  $("#login-id").value = u;
  $("#login-pw").value = p;
  $("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
};
const logout = () => click($('[data-act="logout"]'));
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

/* 1. Configurer une adresse e-mail de copie dans ⚙️ Paramètres */
login("admin", "admin123");
aller("parametres");
const champEmails = $('[data-meta="emailsCopie"]');
check("Champ « Adresses e-mail de réception » présent dans ⚙️ Paramètres", !!champEmails);
change(champEmails, "direction.achats@voomnet.ci");

/* 2. Soumettre une demande -> envoi automatique par e-mail */
aller("nouvelleDemande");
click($('[data-act="add-article"]'));
input($(".art input[data-ai]"), "Serveur Rack Dell");
input($$(".art input[data-ai]")[1], "2");
input($$(".art input[data-ai]")[2], "1200000");
for (let i = 0; i < 8 && !$('[data-act="submit-request"]'); i++) {
  click($('[data-act="wiz-next"]'));
}
check("Bouton « ✉️ Envoyer par mail » présent à l'étape 6", !!$('[data-act="email-request"]'));
appelsEmail.length = 0;
click($('[data-act="submit-request"]'));
await attendre(400);

check("Envoi automatique déclenché à la soumission", appelsEmail.length === 1, `${appelsEmail.length} appel(s)`);
const mailSoumission = appelsEmail[0] || {};
check("L'adresse configurée dans Paramètres est destinataire", (mailSoumission.to || []).includes("direction.achats@voomnet.ci"), (mailSoumission.to || []).join(", "));
check("Les responsables et admins actifs sont destinataires", (mailSoumission.to || []).includes("p.nguessan@voomnet.ci") && (mailSoumission.to || []).includes("admin@voomnet.ci"));
check("Les articles et le montant figurent dans l'e-mail", (mailSoumission.articles || []).length === 1 && /2.*400.*000/.test(mailSoumission.montantTotal || ""), mailSoumission.montantTotal);

/* 3. Bouton « ✉️ Envoyer par mail » sur le détail de la demande */
aller("toutesDemandes");
const ligne = $$("#page-content tr").find((tr) => tr.textContent.includes(mailSoumission.numero));
click(ligne.querySelector('[data-act="view-request"]'));
await attendre(200);
const btnMail = $('[data-act="email-request"]');
check("Bouton « ✉️ Envoyer par mail » présent sur le détail", !!btnMail);
click(btnMail);
await attendre(200);
check("Modale d'envoi par e-mail ouverte", /Envoyer la demande .* par e-mail/.test($("#modal-root").textContent || ""));
check("Destinataires pré-remplis dans la modale", ($("#em-to")?.value || "").includes("direction.achats@voomnet.ci"));

appelsEmail.length = 0;
const btnSmtp = $$("#modal-root [data-mbtn]")[2];
click(btnSmtp);
await attendre(400);
check("Envoi manuel SMTP déclenché depuis la modale", appelsEmail.length === 1);

/* 4. Décision de validation -> envoi automatique au demandeur */
appelsEmail.length = 0;
click($('[data-act="decide"][data-decision="Approuvée"]'));
await attendre(200);
click($$("#modal-root [data-mbtn]")[1]);
await attendre(400);
check("Envoi automatique déclenché lors de l'approbation", appelsEmail.length === 1 && /Approuvée/.test(appelsEmail[0]?.eventLabel || ""), appelsEmail[0]?.eventLabel);

/* 5. Scénario signalé : enregistrer en brouillon puis envoyer par mail -> passe dans le bac Demandes à valider */
logout();
login("demandeur", "demo123");
aller("nouvelleDemande");
click($('[data-act="add-article"]'));
input($(".art input[data-ai]"), "Imprimante Réseau");
input($$(".art input[data-ai]")[1], "3");
input($$(".art input[data-ai]")[2], "250000");
click($('[data-act="wiz-savequit"]'));
await attendre(200);

const dbApresBrouillon = JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const brouillon = dbApresBrouillon.requests.find((r) => (r.articles || []).some((a) => a.designation === "Imprimante Réseau"));
const numInitial = brouillon?.numero;
check("Brouillon enregistré avec son numéro", !!brouillon && brouillon.statut === "brouillon", numInitial);

/* Reprise du brouillon -> le numéro ne doit jamais changer */
const btnResume = $$('[data-act="resume-request"]').find((b) => b.dataset.id === brouillon.id);
click(btnResume);
await attendre(200);
click($('[data-act="wiz-savequit"]'));
await attendre(200);
const brouillonApresReprise = JSON.parse(w.localStorage.getItem("voomnet_achats_v4")).requests.find((r) => r.id === brouillon.id);
check("Conservation stricte du numéro ACH-… après reprise du brouillon", brouillonApresReprise.numero === numInitial, `${numInitial} -> ${brouillonApresReprise.numero}`);

/* Envoi par mail du brouillon -> passe automatiquement en en_attente et apparaît dans Demandes à valider */
const ligneBr = $$("#page-content tr").find((tr) => tr.textContent.includes(numInitial));
click(ligneBr.querySelector('[data-act="view-request"]'));
await attendre(200);
check("Bouton vert « ✉️ Envoyer par mail » présent sur la fiche du brouillon", !!$('.btn.success[data-act="email-request"]'));
click($('[data-act="email-request"]'));
await attendre(200);
click($$("#modal-root [data-mbtn]")[2]); /* 🚀 Envoyer maintenant (SMTP) */
await attendre(400);

logout();
login("admin", "admin123");
aller("aValider");
await attendre(200);
const visibleDansBacAdmin = $$("#page-content tr").some((tr) => tr.textContent.includes(numInitial));
check("Le brouillon envoyé apparaît bien dans le bac « 🛒 Demandes à valider » de l'administrateur", visibleDansBacAdmin, numInitial);

logout();
login("responsable", "demo123");
aller("aValider");
await attendre(200);
const visibleDansBacResp = $$("#page-content tr").some((tr) => tr.textContent.includes(numInitial));
check("Le brouillon envoyé apparaît bien dans le bac « 🛒 Demandes à valider » du responsable", visibleDansBacResp, numInitial);

logout();
console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
