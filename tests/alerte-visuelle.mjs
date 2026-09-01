import { chargerPage, enginePath, syncPath } from "./page.mjs";
import { JSDOM } from "jsdom";
const dom = new JSDOM(await chargerPage(), { url:"http://localhost:3000/", pretendToBeVisual:true, runScripts:"outside-only" });
const w = dom.window;
let lectures = 0; const gains = [];
class MockOsc { constructor(){ this.frequency={setValueAtTime(){}}; } connect(){} start(){} stop(){} }
class MockGain { constructor(){ const self=this; this.gain={ setValueAtTime(){}, linearRampToValueAtTime(v){ gains.push(v); } , exponentialRampToValueAtTime(){} }; } connect(){} }
w.AudioContext = class { constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
  createOscillator(){ return new MockOsc(); } createGain(){ return new MockGain(); } resume(){} };
w.Audio = class { play(){ lectures++; return Promise.resolve(); } };
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
const ok=[],ko=[]; const check=(l,c,x="")=>(c?ok:ko).push(`${c?"✅":"⛔"} ${l}${x?" — "+x:""}`);
const login=(u,p)=>{ $("#login-id").value=u; $("#login-pw").value=p;
  $("#login-form").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true})); };

login("admin","admin123");
nav("parametres");
check("Réglage de volume présent", !!$("[data-volume]"));
/* volume « faible » : le gain doit être plus petit qu'en « fort » */
change($("[data-volume]"), "faible");
await wait(300);
const gainFaible = Math.max(0, ...gains);
change($("[data-volume]"), "fort");
await wait(300);
const gainFort = Math.max(0, ...gains);
check("Le volume « fort » est plus audible que « faible »", gainFort > gainFaible,
  `faible ${gainFaible.toFixed(2)} → fort ${gainFort.toFixed(2)}`);

/* --- alerte visuelle : titre de l'onglet --- */
nav("parametres");
change($('[data-meta="delaiAlerte"]'), 0);       // des relances apparaissent
click($('[data-act="logout"]'));
login("responsable","demo123");
await wait(6000);
const titreClignote = w.document.title.includes('ALERTE') || w.document.title === 'VOOMNET — Gestion des Achats';
check("Le titre de l'onglet est géré par l'alarme", titreClignote, w.document.title);
check("La pastille de la cloche pulse", $("#bell-badge").classList.contains("alarme"));
/* lecture → retour au titre normal et arrêt du clignotement */
click($('[data-act="notif-toggle"]'));
click($('[data-act="notif-readall"]'));
await wait(2600);
check("Titre revenu à la normale après lecture", w.document.title === 'VOOMNET — Gestion des Achats', w.document.title);
check("La pastille ne pulse plus", !$("#bell-badge").classList.contains("alarme"));

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
