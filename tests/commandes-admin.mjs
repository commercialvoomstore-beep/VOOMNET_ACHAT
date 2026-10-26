/**
 * L'administrateur voit le demandeur de chaque commande et peut confirmer
 * un bon « À confirmer » depuis la liste des commandes.
 */
import { chargerPage, enginePath } from "./page.mjs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(await chargerPage(), { url: "http://localhost:3000/", pretendToBeVisual: true, runScripts: "outside-only" });
const w = dom.window;
globalThis.window=w; globalThis.document=w.document; globalThis.localStorage=w.localStorage;
globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w); globalThis.FileReader=w.FileReader;
globalThis.Blob=w.Blob; globalThis.URL=w.URL; w.scrollTo=()=>{}; w.print=()=>{};
const { initVoomnet } = await import(enginePath);
initVoomnet();
const $=(s)=>w.document.querySelector(s); const $$=(s)=>[...w.document.querySelectorAll(s)];
const click=(el)=>el&&el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const nav=(p)=>{ click($$("#sidebar-nav .nav-item").find(b=>b.dataset.page===p));
  const m=$("#modal-root"); if(m&&m.textContent.trim()){const b=$$("#modal-root [data-mbtn]")[1];if(b)click(b);} };
const db=()=>JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const ok=[],ko=[]; const check=(l,c,x="")=>(c?ok:ko).push(`${c?"✅":"⛔"} ${l}${x?" — "+x:""}`);

/* Connexion admin, crée une commande À confirmer depuis une demande approuvée du jeu de test */
$("#login-id").value="admin"; $("#login-pw").value="admin123";
$("#login-form").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
nav("toutesDemandes");
const reqRow=$$("#page-content tr").find(tr=>tr.textContent.includes("ACH-2026-00003"));
click(reqRow?.querySelector('[data-act="view-request"]'));
click($('[data-act="goto-create-order"]'));
check("Bon de commande provisoire affiché", $("#page-content").textContent.includes("À CONFIRMER"));
const orderId = $('[data-act="confirm-order"]')?.dataset.id;
check("Bouton de confirmation déjà présent sur le détail du bon", !!orderId);

/* Liste commandes : nouvelle colonne demandeur + bouton Confirmer */
nav("commandes");
const headers=$$("#page-content th").map(x=>x.textContent.trim());
check("Colonne « Demandeur » présente", headers.includes("Demandeur"), headers.join(" | "));
check("Colonne « Service » présente", headers.includes("Service"));
const row=$$("#page-content tr").find(tr=>tr.querySelector(`[data-act="confirm-order"][data-id="${orderId}"]`));
check("Commande en attente listée avec un bouton Confirmer", !!row);
check("Nom du demandeur visible", row?.textContent.includes("TRAORE FATOU"), row?.textContent.replace(/\s+/g," ").slice(0,120));
check("Service visible", row?.textContent.includes("Comptabilité"));

/* Confirmation depuis la liste : statut, demande et réception synchronisés en local */
click(row?.querySelector(`[data-act="confirm-order"][data-id="${orderId}"]`));
const state=db();
const order=state.orders.find(o=>o.id===orderId);
const request=state.requests.find(r=>r.id===order?.requestId);
check("La commande passe à Confirmée", order?.statut==="Confirmée", order?.statut);
check("La demande passe à commandee", request?.statut==="commandee", request?.statut);
check("La réception est créée en attente", state.receptions.some(x=>x.orderId===orderId&&x.statut==="En attente"));

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
