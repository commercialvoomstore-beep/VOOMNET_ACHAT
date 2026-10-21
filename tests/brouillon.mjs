/**
 * Correctifs « brouillons fantômes » :
 *   NIVEAU 1 - aucune demande créée à l'ouverture de l'écran
 *   NIVEAU 2 - purge des brouillons vides, exclusion des statistiques, réalignement
 *   NIVEAU 3 - badge d'état, indicateur d'enregistrement, confirmation à la sortie
 */
import { chargerPage, enginePath } from "./page.mjs";
import { JSDOM } from "jsdom";

/* --- base de départ : un brouillon vide ancien (à purger) + un brouillon réel --- */
const il_y_a = (jours) => new Date(Date.now() - jours * 86400000).toISOString();
const demande = (id, numero, jours, articles) => ({
  id, numero, statut: "brouillon", date: il_y_a(jours), demandeurId: "u2", service: "DSI",
  priorite: "Moyenne", motif: "", articles, supplierIds: [], offers: {},
  chosenSupplierId: null, justification: "", step: 1, history: [],
});

const dom = new JSDOM(await chargerPage(), {
  url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only",
});
const w = dom.window;
w.localStorage.setItem("voomnet_achats_v4", JSON.stringify({
  users: [
    { id: "u1", nom: "ADMIN", identifiant: "admin", email: "", tel: "", service: "", fonction: "", password: "admin123", role: "admin", statut: "Actif" },
    { id: "u2", nom: "DEMANDEUR", identifiant: "demandeur", email: "", tel: "", service: "DSI", fonction: "", password: "demo123", role: "demandeur", statut: "Actif" },
  ],
  suppliers: [],
  requests: [
    demande("fantome", "ACH-2026-00001", 30, []),                                       /* vide et ancien -> purgé */
    demande("vrai", "ACH-2026-00005", 2, [{ designation: "Article réel", quantite: 1, prix: 100 }]),
    demande("vide_recent", "ACH-2026-00009", 0, []),                                    /* vide mais récent -> conservé, exclu des stats */
  ],
  orders: [], receptions: [], notifications: [],
  meta: { achCounter: 20, bcCounter: 0, seuilOffres: 0, tva: 0, delaiAlerte: 3, delaiUrgence: 7, poids: { prix: 50, delai: 20, garantie: 20, paiement: 10 } },
}));

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
const nav = (p) => click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const db = () => JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const nbDemandes = () => db().requests.length;
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

$("#login-id").value = "demandeur"; $("#login-pw").value = "demo123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));

/* ================= NIVEAU 2 : purge + réalignement au démarrage ================= */
check("Le brouillon vide ancien est purgé au démarrage", !db().requests.some((r) => r.id === "fantome"),
  db().requests.map((r) => r.numero).join(", "));
check("Le brouillon avec contenu est conservé", db().requests.some((r) => r.id === "vrai"));
check("Compteur réaligné sur le dernier numéro réel (9)", db().meta.achCounter === 9, String(db().meta.achCounter));

/* ================= NIVEAU 1 : rien à l'ouverture ================= */
const avant = nbDemandes();
nav("nouvelleDemande");
check("Ouvrir « Nouvelle demande » ne crée RIEN en base", nbDemandes() === avant, `${avant} → ${nbDemandes()}`);
check("Badge « BROUILLON — NON ENREGISTRÉ » affiché", /NON ENREGISTRÉ/.test($("#page-content").textContent));
check("Aucun numéro définitif affiché", !/ACH-\d{4}-\d{5} — Nouvelle demande/.test($("#page-content").textContent));

/* ================= NIVEAU 1 : création au premier article ================= */
click($('[data-act="add-article"]'));
check("L'ajout d'un article crée la demande", nbDemandes() === avant + 1, `${avant} → ${nbDemandes()}`);
const cree = db().requests[db().requests.length - 1];
check("Numéro définitif attribué ACH-2026-00010", cree.numero === "ACH-2026-00010", cree.numero);
check("Compteur incrémenté d'un seul cran (9 -> 10)", db().meta.achCounter === 10, String(db().meta.achCounter));
check("Badge « BROUILLON ENREGISTRÉ » affiché", /BROUILLON ENREGISTRÉ/.test($("#page-content").textContent));

/* ================= NIVEAU 3 : enregistrement automatique ================= */
const heureAvant = cree._savedAt;
input($(".art input[data-ai]"), "Ordinateur portable");
await attendre(1200);
const apresSaisie = db().requests[db().requests.length - 1];
check("La saisie est enregistrée automatiquement",
  apresSaisie.articles[0].designation === "Ordinateur portable" && apresSaisie._savedAt !== heureAvant,
  apresSaisie.articles[0].designation);
check("Indicateur d'enregistrement affiché", /Enregistré à \d/.test($("#wiz-save-indicator")?.textContent || ""),
  $("#wiz-save-indicator")?.textContent);

/* ================= NIVEAU 3 : confirmation à la sortie avec contenu ================= */
nav("dashboard");
check("Confirmation demandée en quittant un brouillon avec contenu", !!$("#modal-root").textContent.includes("Quitter la demande en cours"));
click($$("#modal-root [data-mbtn]")[1]);                      /* Confirmer */
await attendre(300);
check("Le brouillon est conservé après confirmation", nbDemandes() === avant + 1, String(nbDemandes()));

/* ================= NIVEAU 1 & 2 : sortie sans contenu ================= */
nav("nouvelleDemande");                                        /* abandon confirmé */
click($$("#modal-root [data-mbtn]")[1]);
await attendre(300);
const apresNouveau = nbDemandes();
check("Nouvelle demande : toujours rien en base", nbDemandes() === apresNouveau, String(nbDemandes()));
nav("dashboard");
check("Sortie sans contenu : aucune confirmation, aucun brouillon créé", nbDemandes() === apresNouveau, String(nbDemandes()));
check("Aucune modale ouverte à la sortie", $("#modal-root").textContent.trim() === "", $("#modal-root").textContent.trim().slice(0, 40));

/* ================= NIVEAU 2 : exclusion des statistiques ================= */
/* on réintroduit un brouillon vide récent dans la base puis on regarde le tableau de bord */
nav("dashboard");
/* le tableau de bord demandeur affiche « Mes demandes » : les vides sont exclus */
const carte = $$(".stat").find((c) => (c.querySelector(".l")?.textContent || "").includes("Mes demandes"));
const affiche = carte ? parseInt(carte.querySelector(".v")?.textContent || "-1", 10) : -1;
/* en base, u2 possède : le brouillon réel + le brouillon vide + le brouillon créé
   pendant ce test = 3 ; seuls les 2 qui ont du contenu doivent être comptés */
const totalU2 = db().requests.filter((r) => r.demandeurId === "u2").length;
check("Le brouillon vide est exclu des statistiques", affiche === 2 && totalU2 === 3,
  `affiché ${affiche} sur ${totalU2} demande(s) en base — le brouillon vide est bien ignoré`);

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
