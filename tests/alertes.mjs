import { chargerPage, enginePath, syncPath } from "./page.mjs";
import { JSDOM } from "jsdom";
const dom = new JSDOM(await chargerPage(), { url:"http://localhost:3000/", pretendToBeVisual:true, runScripts:"outside-only" });
const w = dom.window;
globalThis.window=w; globalThis.document=w.document; globalThis.localStorage=w.localStorage;
globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w); globalThis.FileReader=w.FileReader;
globalThis.Blob=w.Blob; globalThis.URL=w.URL; w.scrollTo=()=>{}; w.print=()=>{};
const { initVoomnet } = await import(enginePath);
initVoomnet();
const $=(s)=>w.document.querySelector(s); const $$=(s)=>[...w.document.querySelectorAll(s)];
const click=(el)=>el&&el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const change=(el,v)=>{ el.value=String(v); el.dispatchEvent(new w.Event("change",{bubbles:true})); };
const nav=(p)=>click($$("#sidebar-nav .nav-item").find(b=>b.dataset.page===p));
const txt=()=>$("#page-content").textContent.replace(/\s+/g," ");
const db=()=>JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const nbNotifs=(userId)=>db().notifications.filter(n=>n.userId===userId).length;
const ok=[],ko=[]; const check=(l,c,x="")=>(c?ok:ko).push(`${c?"✅":"⛔"} ${l}${x?" — "+x:""}`);
const login=(u,p)=>{ $("#login-id").value=u; $("#login-pw").value=p;
  $("#login-form").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true})); };
const logout=()=>click($('[data-act="logout"]'));

login("admin","admin123");
check("Connexion admin", !$("#app").classList.contains("hidden"));

/* --- 1. Aucune alerte avec le seuil par défaut (3 j) sur des données récentes --- */
nav("dashboard");
check("Aucune alerte au départ (données récentes)", !$(".alertes-bandeau"), txt().slice(0,40));

/* --- 2. On abaisse le seuil à 0 : les alertes apparaissent --- */
nav("parametres");
check("Réglages des relances présents", !!$('[data-meta="delaiAlerte"]') && !!$('[data-meta="delaiUrgence"]'));
change($('[data-meta="delaiAlerte"]'), 0);
nav("dashboard");
check("Bandeau d'alertes affiché (admin)", !!$(".alertes-bandeau"));
check("Le bandeau annonce les alertes", /alerte(s)? en cours/.test(txt()), txt().slice(0,70));
check("Bouton « Ouvrir » dans le bandeau", !!$('.alertes-bandeau [data-act="notif-open"]'));

/* --- 3. Relances reçues par le responsable --- */
logout();
login("responsable","demo123");
const respId = db().users.find(u=>u.identifiant==="responsable").id;
const relances = db().notifications.filter(n=>n.userId===respId && n.cle && n.cle.startsWith("REL-"));
check("Relance envoyée au responsable", relances.length >= 1, relances.length + " relance(s)");
check("Relance de type « alerte »", relances.every(n=>n.niveau==="alerte"||n.niveau==="urgent"), relances[0]?.niveau);
check("Relance liée à la demande", !!relances[0]?.requestId);
check("Bandeau visible pour le responsable", !!$(".alertes-bandeau"));
const nb1 = relances.length;

/* --- 4. Pas de doublon : on régénère (reconnexion) --- */
logout(); login("responsable","demo123");
const nb2 = db().notifications.filter(n=>n.userId===respId && n.cle && n.cle.startsWith("REL-")).length;
check("Aucun doublon de relance le même jour", nb2 === nb1, `${nb1} → ${nb2}`);

/* --- 5. Cloche : notification visible et cliquable --- */
click($('[data-act="notif-toggle"]'));
const items = $$("#notif-panel .notif-item");
check("Panneau de notifications rempli", items.length >= 1, items.length + " notification(s)");
check("Icône d'alerte affichée", /🟠|🔴/.test($("#notif-panel").textContent), ($("#notif-panel").textContent.match(/[🟠🔴🔵]/g)||[]).join(""));
const cliquable = $('#notif-panel .notif-item[data-act="notif-open"]');
check("Notification cliquable", !!cliquable);
if (cliquable){
  const nid = cliquable.dataset.nid;
  click(cliquable);
  check("La notification est marquée lue à l'ouverture", db().notifications.find(n=>n.id===nid)?.lu === true);
  check("Ouverture du détail de la demande", /Historique de la demande|Demande créée/.test(txt()), txt().slice(0,50));
}

/* --- 6. Filtre par rôle : un demandeur non concerné ne voit pas l'alerte --- */
logout(); login("demandeur","demo123");
const dId = db().users.find(u=>u.identifiant==="demandeur").id;
const mesRelances = db().notifications.filter(n=>n.userId===dId && n.cle && n.cle.startsWith("REL-"));
check("Le demandeur ne reçoit pas les relances de validation", mesRelances.length === 0, mesRelances.length + " relance(s)");
check("Pas de bandeau pour ce demandeur", !$(".alertes-bandeau"));

/* --- 7. Seuil haut : plus aucune alerte --- */
logout(); login("admin","admin123");
nav("parametres");
change($('[data-meta="delaiAlerte"]'), 90);
nav("dashboard");
check("Seuil à 90 j : plus aucune alerte", !$(".alertes-bandeau"));
check("Seuils enregistrés en base", db().meta.delaiAlerte === 90 && db().meta.delaiUrgence === 7,
  JSON.stringify({a:db().meta.delaiAlerte,u:db().meta.delaiUrgence}));

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
