/**
 * Tests des graphiques du tableau de bord (SVG généré, sans bibliothèque).
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
const nav = (p) => click($$("#sidebar-nav .nav-item").find((b) => b.dataset.page === p));
const txt = () => $("#page-content").textContent.replace(/\s+/g, " ");
const ok = [], ko = [];
const check = (l, c, x = "") => (c ? ok : ko).push(`${c ? "✅" : "⛔"} ${l}${x ? " — " + x : ""}`);

$("#login-id").value = "admin"; $("#login-pw").value = "admin123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("Connexion admin", !$("#app").classList.contains("hidden"));

/* --- Tableau de bord --- */
nav("dashboard");
check("Titre du graphe mensuel", /Achats confirmés/.test(txt()), txt().slice(0, 60));
check("Titre de la répartition", /Répartition des demandes/.test(txt()));
const graphiques = $$(".graph svg");
check("Au moins 2 histogrammes affichés", graphiques.length >= 2, graphiques.length + " graphique(s)");

const barres = $$(".graph svg rect");
check("Des barres sont tracées", barres.length >= 12, barres.length + " barre(s)");
check("Chaque barre a une infobulle", barres.every((b) => !!b.querySelector("title")));

const premier = graphiques[0];
check("12 barres dans l'histogramme mensuel",
  premier.querySelectorAll("rect").length === 12, String(premier.querySelectorAll("rect").length));
check("Étiquettes de mois présentes", $$(".graph-labels").length >= 1 && $$(".graph-labels span").length >= 12,
  $$(".graph-labels span").length + " étiquette(s)");

/* --- Anneau --- */
check("Anneau affiché", !!$(".anneau"));
const parts = $$(".anneau circle");
check("L'anneau a des segments colorés", parts.length >= 1, parts.length + " segment(s)");
check("Total affiché au centre", /\d+/.test($(".anneau-total")?.textContent || ""), $(".anneau-total")?.textContent);
check("Légende de l'anneau", $$(".legende li").length >= 1, $$(".legende li").length + " entrée(s)");
const somme = $$(".legende li b").reduce((t, b) => t + (+b.textContent || 0), 0);
check("La légende correspond au total", String(somme) === ($(".anneau-total")?.textContent || "").trim(),
  `${somme} vs ${$(".anneau-total")?.textContent}`);

/* --- Page Rapports --- */
nav("rapports");
check("Rapports : graphique d'évolution présent", /Évolution des achats/.test(txt()) && !!$(".graph svg"));

/* --- Robustesse : aucune donnée ne doit faire planter --- */
const db = JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
db.orders = []; db.requests = [];
w.localStorage.setItem("voomnet_achats_v4", JSON.stringify(db));
click($('[data-act="logout"]'));
$("#login-id").value = "admin"; $("#login-pw").value = "admin123";
$("#login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
nav("dashboard");
check("Aucune donnée : pas de plantage", txt().includes("Total des demandes"));
nav("rapports");
check("Rapports sans donnée : pas de plantage", txt().includes("Rapports") || txt().includes("achats"));

console.log(ok.join("\n"));
if (ko.length) console.log("\n" + ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length ? 1 : 0);
