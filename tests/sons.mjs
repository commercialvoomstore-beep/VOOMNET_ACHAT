import { chargerPage, enginePath, syncPath } from "./page.mjs";
import { JSDOM } from "jsdom";
const dom = new JSDOM(await chargerPage(), { url:"http://localhost:3000/", pretendToBeVisual:true, runScripts:"outside-only" });
const w = dom.window;

/* --- faux contexte audio : compte les notes réellement jouées --- */
let notes = 0;
class MockOsc {
  constructor(){ notes++; this.frequency = { setValueAtTime(){} }; }
  connect(){} start(){} stop(){}
}
class MockGain { constructor(){ this.gain = { setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} }; } connect(){} }
w.AudioContext = class {
  constructor(){ this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createOscillator(){ return new MockOsc(); }
  createGain(){ return new MockGain(); }
  resume(){}
};

globalThis.window=w; globalThis.document=w.document; globalThis.localStorage=w.localStorage;
globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w); globalThis.FileReader=w.FileReader;
globalThis.Blob=w.Blob; globalThis.URL=w.URL; w.scrollTo=()=>{}; w.print=()=>{};
const { initVoomnet } = await import(enginePath);
initVoomnet();
const $=(s)=>w.document.querySelector(s); const $$=(s)=>[...w.document.querySelectorAll(s)];
const click=(el)=>el&&el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const change=(el,v)=>{ el.value=String(v); el.dispatchEvent(new w.Event("change",{bubbles:true})); };
const nav=(p)=>click($$("#sidebar-nav .nav-item").find(b=>b.dataset.page===p));
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const db=()=>JSON.parse(w.localStorage.getItem("voomnet_achats_v4"));
const ok=[],ko=[]; const check=(l,c,x="")=>(c?ok:ko).push(`${c?"✅":"⛔"} ${l}${x?" — "+x:""}`);
const login=(u,p)=>{ $("#login-id").value=u; $("#login-pw").value=p;
  $("#login-form").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true})); };
const logout=()=>click($('[data-act="logout"]'));

/* --- 1. Aucun son au démarrage ni pendant les 2,5 premières secondes --- */
login("admin","admin123");
await wait(1200);
check("Aucun son au démarrage", notes === 0, notes + " note(s)");

/* --- 2. Réglage présent et test sonore --- */
nav("parametres");
check("Réglage des sons présent", !!$("[data-son]"));
check("Bouton de test présent", !!$('[data-act="test-son"]'));
await wait(2000);                       // sonPret = true
notes = 0;
click($('[data-act="test-son"]'));
await wait(1800);                        // les 3 mélodies s'enchaînent
check("Le test joue les 3 mélodies (1+2+3 = 6 notes)", notes === 6, notes + " note(s)");

/* --- 3. Désactivation --- */
notes = 0;
change($("[data-son]"), "0");
check("Préférence enregistrée", w.localStorage.getItem("voomnet_son") === "0");
click($('[data-act="test-son"]'));
await wait(200);
check("Aucun son quand désactivé", notes === 0, notes + " note(s)");

/* --- 4. Réactivation + son de synthèse à la connexion (alertes en cours) --- */
change($("[data-son]"), "1");
nav("parametres");
change($('[data-meta="delaiAlerte"]'), 0);   // seuil 0 → des alertes existent
logout();
notes = 0;
login("responsable","demo123");
await wait(3600);                            // résumé sonore à 3 s
check("Un seul son à la connexion (2 notes = alerte)", notes === 2, notes + " note(s)");

/* --- 5. Le son ne part pas pour les autres utilisateurs --- */
notes = 0;
logout(); login("demandeur","demo123");
await wait(3600);
const dId = db().users.find(u=>u.identifiant==="demandeur").id;
const relances = db().notifications.filter(n=>n.userId===dId && n.cle && n.cle.startsWith("REL-"));
check("Le demandeur n'a pas de relance de validation", relances.length === 0, relances.length + " relance(s)");

/* --- 6. Bouton 🔊 de la barre du haut --- */
login("admin","admin123");
await wait(500);
const btn = $("#btn-son");
check("Bouton audio présent dans la barre du haut", !!btn, btn ? btn.textContent : "(absent)");
check("Icône 🔊 quand les sons sont activés", btn && btn.textContent.trim() === "🔊", btn?.textContent);
notes = 0;
click(btn);                                  // coupure
await wait(200);
check("Le bouton coupe le son (icône 🔇)", btn.textContent.trim() === "🔇" && notes === 0, btn.textContent + " / " + notes + " note(s)");
notes = 0;
click(btn);                                  // réactivation + bip de confirmation
await wait(200);
check("Le bouton réactive et joue un bip de confirmation", btn.textContent.trim() === "🔊" && notes === 1, btn.textContent + " / " + notes + " note(s)");
check("Préférence conservée", w.localStorage.getItem("voomnet_son") === "1");

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
