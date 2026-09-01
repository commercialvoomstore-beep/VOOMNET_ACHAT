import { chargerPage, enginePath, syncPath } from "./page.mjs";
import { JSDOM } from "jsdom";
const dom = new JSDOM(await chargerPage(), { url:"http://localhost:3000/", pretendToBeVisual:true, runScripts:"outside-only" });
const w = dom.window;
/* compte les notes et les regroupe en « mélodies » (notes espacées de moins de 300 ms) */
let instants = [];
class MockOsc { constructor(){ instants.push(Date.now()); this.frequency={setValueAtTime(){}}; } connect(){} start(){} stop(){} }
class MockGain { constructor(){ this.gain={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}; } connect(){} }
w.AudioContext = class { constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
  createOscillator(){ return new MockOsc(); } createGain(){ return new MockGain(); } resume(){} };
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
const melodies = () => {                       // regroupe les notes en mélodies
  const m = []; (instants||[]).sort((a,b)=>a-b).forEach(t => {
    if (!m.length || t - m[m.length-1] > 300) m.push(t);
  });
  return m.length;
};
const raz = () => { instants = []; };

/* --- seuil 0 : des relances non lues pour le responsable --- */
login("admin","admin123");
nav("parametres");
change($('[data-meta="delaiAlerte"]'), 0);
change($('[data-alarme="delai"]'), 5);
change($('[data-alarme="max"]'), 2);
logout();
login("responsable","demo123");
const rid = db().users.find(u=>u.identifiant==="responsable").id;
const nonLues = () => db().notifications.filter(n=>n.userId===rid && !n.lu).length;
check("Relances non lues présentes", nonLues() >= 1, String(nonLues()));

/* --- 1. l'alarme sonne puis se répète --- */
raz(); await wait(20000);
const pendant = melodies();
check("L'alarme sonne et se répète", pendant >= 2, pendant + " mélodie(s) en 20 s");

/* --- 2. arrêt après le maximum de répétitions --- */
raz(); await wait(12000);
check("Arrêt après le maximum de répétitions", melodies() === 0, melodies() + " mélodie(s)");
check("Le message reste non lu (badge conservé)", nonLues() >= 1, String(nonLues()));

/* --- 3. lecture → bip d'acquittement puis silence --- */
raz();
click($('[data-act="notif-toggle"]'));
click($('[data-act="notif-readall"]'));
await wait(500);
check("Bip d'acquittement à la lecture", melodies() === 1, melodies() + " mélodie(s)");
raz(); await wait(10000);
check("Silence total après lecture", melodies() === 0, melodies() + " mélodie(s)");

/* --- 4. alarme désactivée : pas de répétition --- */
logout(); login("admin","admin123"); nav("parametres");
change($('[data-alarme="actif"]'), "0");
change($('[data-meta="delaiAlerte"]'), 0);
logout();
raz();
login("responsable","demo123");                // nouvelles relances non lues
await wait(20000);
const apresDesactivation = melodies();
check("Alarme désactivée : aucune répétition", apresDesactivation <= 1,
  apresDesactivation + " mélodie(s) (0 ou 1 = rappel unique à la connexion)");

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
