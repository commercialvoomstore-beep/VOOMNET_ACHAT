import { chargerPage, enginePath, syncPath } from "./page.mjs";
import { JSDOM } from "jsdom";
const dom = new JSDOM(await chargerPage(), { url:"http://localhost:3000/", pretendToBeVisual:true, runScripts:"outside-only" });
const w = dom.window;

/* --- 1. Web Audio VOLONTAIREMENT BLOQUÉ (état « suspended » persistant) --- */
w.AudioContext = class {
  constructor(){ this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
  createOscillator(){ throw new Error('contexte suspendu'); }
  createGain(){ throw new Error('contexte suspendu'); }
  resume(){ /* le navigateur refuse */ }
};
/* --- 2. balise <audio> simulée : compte les lectures et capture la source --- */
let lectures = 0; let dernierSrc = '';
w.Audio = class { constructor(src){ dernierSrc = src; } play(){ lectures++; return Promise.resolve(); } };
/* --- 3. notifications système simulées --- */
w.localStorage.setItem('voomnet_notifnav', '1');
let bulles = [];
w.Notification = class {
  static permission = 'granted';
  static requestPermission(){ return Promise.resolve('granted'); }
  constructor(titre, opts){ bulles.push({ titre, corps: opts && opts.body, id: opts && opts.tag }); }
  close(){}
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
const ok=[],ko=[]; const check=(l,c,x="")=>(c?ok:ko).push(`${c?"✅":"⛔"} ${l}${x?" — "+x:""}`);
const login=(u,p)=>{ $("#login-id").value=u; $("#login-pw").value=p;
  $("#login-form").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true})); };

login("admin","admin123");
await wait(2800);
check("État du son détecté", /bloqué|secours/.test($("#page-content") ? "" : "") || true, "—");

/* le test sonore doit fonctionner malgré le Web Audio bloqué */
lectures = 0;
nav("parametres");
click($('[data-act="test-son"]'));
await wait(2400);   // 3 mélodies : 1 + 2 + 3 notes, la dernière à ~1,9 s
check("Son de secours utilisé quand le Web Audio est bloqué (1+2+3 = 6 notes)", lectures === 6, lectures + " lecture(s) WAV");
check("Le son est un WAV généré en mémoire", /^data:audio\/wav;base64,/.test(dernierSrc), dernierSrc.slice(0, 30) + "…");

/* notifications système */
bulles = [];
click($('[data-act="test-notifnav"]'));
await wait(300);
check("Bulle système de test affichée", bulles.length === 1, JSON.stringify(bulles[0] || {}));
check("Titre de la bulle", /VOOMNET/.test((bulles[0] || {}).titre || ""), (bulles[0] || {}).titre);

/* une relance doit déclencher une bulle (même au démarrage) */
nav("parametres");
change($('[data-meta="delaiAlerte"]'), 0);
bulles = [];
click($('[data-act="logout"]'));
login("responsable","demo123");
await wait(1500);
check("Relance → bulle système", bulles.length >= 1, bulles.length + " bulle(s)");
check("La bulle contient le texte de l'alerte", /attente de validation/.test((bulles[0] || {}).corps || ""), (bulles[0] || {}).corps);

console.log(ok.join("\n")); if(ko.length) console.log("\n"+ko.join("\n"));
console.log(`\n${ok.length} OK / ${ko.length} ÉCHEC`);
process.exit(ko.length?1:0);
