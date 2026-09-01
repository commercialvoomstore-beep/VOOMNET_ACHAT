/* ================================================================
   VOOMNET TECHNOLOGY — GESTION DES ACHATS
   Moteur applicatif (100 % front-end) — portage Next.js — v4
   ----------------------------------------------------------------
   Ce fichier reprend À L'IDENTIQUE le script de la version
   « index.html » v4 : mêmes données, mêmes règles de gestion, mêmes
   écrans, même clé de stockage (voomnet_achats_v4).
   Il est exécuté côté client par le composant <VoomnetApp />
   (app/page.tsx) une fois le DOM monté.

   Architecture :
     1. Utilitaires
     2. Couche de données (localStorage — remplaçable plus tard par
        un vrai backend via fetch : voir la section COUCHE DONNÉES)
     3. Données de démonstration (seed)
     4. Authentification & permissions (rôles)
     5. Navigation (menus par rôle)
     6. Composants UI (badges, progression, timeline, modales, toasts)
     7. Tableaux de bord
     8. Demandes (liste + détail + validation)
     9. Assistant de création (6 étapes)
   10. Fournisseurs (+ import/export Excel · CSV · JSON)
   11. Utilisateurs
   12. Commandes & réceptions
   13. Rapports & paramètres
   14. Aiguillage des actions & initialisation
   ================================================================ */

let started = false;

export function initVoomnet() {
  if (started) return;          // garde-fou : une seule initialisation
  started = true;

  /* Bibliothèque SheetJS (lecture/écriture .xlsx) chargée depuis le CDN
     avant l'appel de initVoomnet(). Si elle est absente (hors-ligne),
     l'application reste 100 % fonctionnelle en CSV et JSON. */
  const XLSX = globalThis.XLSX;
  let wizSupCat = '';           // filtre catégorie fournisseur (assistant)

  /* ================================================================
     VOOMNET TECHNOLOGY — GESTION DES ACHATS (démo front-end)
     ----------------------------------------------------------------
     Architecture :
       1. Utilitaires
       2. Couche de données (localStorage — remplaçable plus tard par
          un vrai backend via fetch : voir la section COUCHE DONNÉES)
       3. Données de démonstration (seed)
       4. Authentification & permissions (rôles)
       5. Navigation (menus par rôle)
       6. Composants UI (badges, progression, timeline, modales, toasts)
       7. Tableaux de bord
       8. Demandes (liste + détail + validation)
       9. Assistant de création (5 étapes)
     10. Fournisseurs (+ import/export Excel · CSV · JSON)
     11. Utilisateurs
     12. Commandes & réceptions
     13. Rapports & paramètres
     14. Aiguillage des actions & initialisation
     ================================================================ */

  /* ============================= 1. UTILITAIRES ============================= */
  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtM  = n => (Math.round(+n || 0)).toLocaleString('fr-FR') + ' FCFA';
  const fmtD  = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
  const fmtDT = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') + ' à ' + new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—';
  const nowISO = () => new Date().toISOString();
  const uid = p => (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = o => JSON.parse(JSON.stringify(o));
  const norm  = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const byId = (arr, id) => arr.find(x => x.id === id);
  const fmtGar = g => { g = +g || 0; if (!g) return '—'; return g >= 1 ? (g + ' an' + (g > 1 ? 's' : '')) : (Math.round(g * 12) + ' mois'); };
  const fmtDel = d => (+d ? d + ' jour' + (+d > 1 ? 's' : '') : '—');


  /* Logo VOOMNET : /voomnet-logo.png dans Next.js,
     data-uri base64 dans la version autonome (défini par le générateur). */
  const LOGO_URL = () => globalThis.VOOMNET_LOGO_DATA || '/voomnet-logo.png';
  const logoImg = (style) => `<img class="print-logo" src="${LOGO_URL()}" alt="VOOMNET TECHNOLOGY"${style ? ` style="${style}"` : ''}>`;

  /* Stockage : localStorage, avec repli en mémoire si l'aperçu est sandboxé
     (dans Google Chrome, les données persistent réellement). */
  const storage = (() => {
    try { const k='__vn_test'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return localStorage; }
    catch(e){ const m={}; return { getItem:k=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=String(v);}, removeItem:k=>{delete m[k];} }; }
  })();
  const DB_KEY = 'voomnet_achats_v4'; // v4 : négociation — nouveaux prix par article et par fournisseur, puis comparaison croisée
  const SESSION_KEY = 'voomnet_session_v1';

  /* ============================= 2. COUCHE DONNÉES =============================
     Toutes les écritures/lectures passent par DB + saveDB().
     ➜ Pour brancher un vrai backend plus tard : remplacer le corps de loadDB()
       et saveDB() par des appels fetch() vers une API REST, sans toucher au
       reste de l'application (les écrans lisent toujours DB.xxx).            */
  let DB = null;
  let sessionUser = null;
  let state = { page:'dashboard', params:{}, nav:'dashboard' };

  /* --- Couche Supabase OPTIONNELLE -------------------------------------
     « remote » est fourni par l'hôte (Next.js ou index.html autonome) via
     globalThis.__voomnetSupabase — voir lib/supabaseSync.js.
     S'il est absent ou injoignable, l'application fonctionne exactement
     comme avant, sur le localStorage.                                     */
  let remote = null;
  let pendingRemote = null;
  let remoteReady = false;   // vrai dès que l'hydratation initiale est terminée :
                             // aucune donnée n'est envoyée avant, sinon le jeu de démo
                             // local écraserait / dupliquerait les données distantes.

  function saveDB(){
    storage.setItem(DB_KEY, JSON.stringify(DB));
    /* Sécurité : on n'envoie rien tant que l'hydratation initiale n'est pas
       terminée ET qu'un jeu distant n'est pas encore appliqué — sinon un
       appareil qui démarre avec son jeu de démo local écraserait le serveur. */
    if (remote && remoteReady && !pendingRemote) remote.sync(() => DB);
  }
  function loadDB(){
    try { DB = JSON.parse(storage.getItem(DB_KEY)); } catch(e){ DB = null; }
    if (!DB || !DB.meta || !Array.isArray(DB.users)) { DB = seedData(); saveDB(); }
  }
  function resetDemoData(){
    storage.removeItem(DB_KEY);
    DB = seedData(); saveDB();
    if (remote) remote.reset(DB);       // remplace aussi les données distantes
  }

  /* ============================= 3. DONNÉES DE DÉMONSTRATION ============================= */
  function seedData(){
    // Dates relatives à aujourd'hui pour une démo toujours « fraîche »
    const D = (days, h, m=0) => { const d = new Date(); d.setDate(d.getDate()-days); d.setHours(h,m,0,0); return d.toISOString(); };

    const users = [
      {id:'u1', nom:'KOUADIO KONAN',   identifiant:'admin',         email:'admin@voomnet.ci',      tel:'07 00 00 00 01', service:'Direction Générale', fonction:'Directeur Général',    password:'admin123', role:'admin',       statut:'Actif'},
      {id:'u2', nom:'AYA SERGE',       identifiant:'demandeur',     email:'s.aya@voomnet.ci',      tel:'07 00 00 00 02', service:'DSI',               fonction:'Chef de projet',       password:'demo123',  role:'demandeur',   statut:'Actif'},
      {id:'u3', nom:'TRAORE FATOU',    identifiant:'demandeur2',    email:'f.traore@voomnet.ci',   tel:'07 00 00 00 03', service:'Comptabilité',      fonction:'Comptable',            password:'demo123',  role:'demandeur',   statut:'Actif'},
      {id:'u4', nom:"N'GUESSAN PAUL",  identifiant:'responsable',   email:'p.nguessan@voomnet.ci', tel:'07 00 00 00 04', service:'DSI',               fonction:'Directeur des Systèmes', password:'demo123', role:'responsable', statut:'Actif'},
      {id:'u5', nom:'BAMBA ALICE',     identifiant:'responsable2',  email:'a.bamba@voomnet.ci',    tel:'07 00 00 00 05', service:'Logistique',        fonction:'Responsable Logistique', password:'demo123', role:'responsable', statut:'Actif'}
    ];

    /* Catalogue fournisseurs : FOURNISSEUR NOM / RÉFÉRENCES / EMPLACEMENT / WHATSAPP / SITE INTERNET */
    const suppliers = [
      {id:'s1',  nom:'TechnoPlus CI',          references:'Orange CI, SGCI, CIE',        emplacement:'Cocody, Abidjan',    whatsapp:'+225 07 08 09 10 11', site:'www.technoplus.ci',      statut:'Actif'},
      {id:'s2',  nom:'Réseaux & Solutions CI', references:'CIE, SODECI, ICEA',           emplacement:'Marcory Zone 4, Abidjan', whatsapp:'+225 05 07 07 07 07', site:'www.reseauxsolutions.ci', statut:'Actif'},
      {id:'s3',  nom:'Fortinet Distribution',  references:'SGCI, NSIA Banque',           emplacement:'Plateau, Abidjan',   whatsapp:'+225 01 02 03 04 05', site:'www.fortinet-distrib.ci', statut:'Actif'},
      {id:'s4',  nom:'Câbles & Énergie CI',    references:'CIE, SODECI, Palm CI',        emplacement:'Vridi, Abidjan',     whatsapp:'+225 07 11 22 33 44', site:'www.cablesenergie.ci',   statut:'Actif'},
      {id:'s5',  nom:'Telecom Pro CI',         references:'Moov Africa, MTN CI',         emplacement:'Treichville, Abidjan', whatsapp:'+225 05 44 55 66 77', site:'www.telecompro.ci',    statut:'Actif'},
      {id:'s6',  nom:'Digital Center',         references:'VOOMNET, Sonatel, Canal+',    emplacement:'Angré, Abidjan',     whatsapp:'+225 07 88 99 00 11', site:'www.digitalcenter.ci',   statut:'Actif'},
      {id:'s7',  nom:'SécuriTech CI',          references:'NSIA Banque, groupe Akwaba',  emplacement:'Yopougon, Abidjan',  whatsapp:'+225 01 55 44 33 22', site:'www.securitech.ci',      statut:'Actif'},
      {id:'s8',  nom:'Africa Power Solutions', references:'Port Autonome de San-Pédro',  emplacement:'San-Pédro',          whatsapp:'+225 07 66 77 88 99', site:'www.africapower.ci',     statut:'Actif'},
      {id:'s9',  nom:'NetGear Afrique',        references:'Artel, Sotelci',              emplacement:'Bouaké',              whatsapp:'+225 05 22 33 44 55', site:'www.netgear-afrique.ci', statut:'Inactif'},
      {id:'s10', nom:'Orange Business CI',     references:'Gouvernement, ANDE, CNPS',    emplacement:'Plateau, Abidjan',   whatsapp:'+225 05 00 00 00 00', site:'www.orange.ci',          statut:'Actif'}
    ];

    const requests = [
      /* --- 1) Demande CLÔTURÉE (cycle complet) --- */
      { id:'r1', numero:'ACH-2026-00001', date:D(7,9), demandeurId:'u2', service:'DSI', priorite:'Haute',
        motif:'Renouvellement du parc informatique — achat de 10 ordinateurs portables.',
        articles:[{designation:'Ordinateur portable Dell Latitude 5540', quantite:10, prix:820000}],
        supplierIds:['s1','s6','s10'],
        offers:{ s1:{prixArticles:{0:820000}, delai:7, garantie:1, paiement:'30 jours', observations:'Livraison et installation incluses'},
                 s6:{prixArticles:{0:850000}, delai:5, garantie:2, paiement:'Comptant', observations:''},
                 s10:{prixArticles:{0:835000}, delai:10, garantie:1, paiement:'30 jours', observations:'Garantie sur site possible'} },
        chosenSupplierId:'s1', justification:'Offre retenue en raison du meilleur rapport qualité/prix et des conditions de paiement à 30 jours.',
        statut:'cloturee', submittedAt:D(7,9,40),
        validation:{decision:'Approuvée', par:"N'GUESSAN PAUL", date:D(6,10), motif:''},
        history:[
          {date:D(7,9,0),  ev:'Demande créée'},
          {date:D(7,9,15), ev:'3 fournisseurs sélectionnés'},
          {date:D(7,9,30), ev:'Offres reçues et comparées'},
          {date:D(7,9,35), ev:'Fournisseur TechnoPlus CI sélectionné'},
          {date:D(7,9,40), ev:'Demande soumise pour validation'},
          {date:D(6,10,0), ev:"Demande approuvée par N'GUESSAN PAUL"},
          {date:D(5,9,0),  ev:'Commande BC-2026-00001 créée'},
          {date:D(1,14,0), ev:'Réception effectuée (complète)'},
          {date:D(1,14,5), ev:'Achat clôturé — ✓ ACHAT TERMINÉ'}
        ] },

      /* --- 2) Demande COMMANDE PASSÉE (réception en attente) --- */
      { id:'r2', numero:'ACH-2026-00002', date:D(3,8,30), demandeurId:'u2', service:'DSI', priorite:'Moyenne',
        motif:"Extension du réseau de l'étage 3 — achat de 5 switches 24 ports.",
        articles:[{designation:'Switch Cisco Catalyst 1000 24G', quantite:5, prix:850000}],
        supplierIds:['s2','s5','s7'],
        offers:{ s2:{prixArticles:{0:850000}, delai:5, garantie:2, paiement:'30 jours', observations:'Configuration de base incluse'},
                 s5:{prixArticles:{0:835000}, delai:14, garantie:1, paiement:'60 jours', observations:''},
                 s7:{prixArticles:{0:880000}, delai:7, garantie:1, paiement:'60 jours', observations:''} },
        chosenSupplierId:'s5', justification:"Prix total le plus bas (835 000 FCFA l'unité), malgré un délai un peu plus long.",
        statut:'commandee', submittedAt:D(3,9,10),
        validation:{decision:'Approuvée', par:"N'GUESSAN PAUL", date:D(2,11), motif:''},
        history:[
          {date:D(3,8,30), ev:'Demande créée'},
          {date:D(3,8,45), ev:'3 fournisseurs sélectionnés'},
          {date:D(3,9,0),  ev:'Offres reçues et comparées'},
          {date:D(3,9,5),  ev:'Fournisseur Telecom Pro CI sélectionné'},
          {date:D(3,9,10), ev:'Demande soumise pour validation'},
          {date:D(2,11,0), ev:"Demande approuvée par N'GUESSAN PAUL"},
          {date:D(1,9,0),  ev:'Commande BC-2026-00002 créée'}
        ] },

      /* --- 3) Demande APPROUVÉE (prête pour création de commande) --- */
      { id:'r3', numero:'ACH-2026-00003', date:D(2,15), demandeurId:'u3', service:'Comptabilité', priorite:'Haute',
        motif:"Acquisition d'un onduleur pour sécuriser le serveur comptable.",
        articles:[{designation:'Onduleur Eaton 9PX 3000i', quantite:1, prix:1500000}],
        supplierIds:['s4','s8'],
        offers:{ s4:{prixArticles:{0:1580000}, delai:10, garantie:2, paiement:'Comptant', observations:'Étude de site gratuite'},
                 s8:{prixArticles:{0:1650000}, delai:15, garantie:1, paiement:'30 jours', observations:''} },
        chosenSupplierId:'s4', justification:'Meilleur prix reçu, 2 ans de garantie et étude de site gratuite.',
        statut:'approuvee', submittedAt:D(2,15,30),
        validation:{decision:'Approuvée', par:'BAMBA ALICE', date:D(1,16), motif:''},
        history:[
          {date:D(2,15,0),  ev:'Demande créée'},
          {date:D(2,15,10), ev:'2 fournisseurs sélectionnés'},
          {date:D(2,15,20), ev:'Offres reçues et comparées'},
          {date:D(2,15,25), ev:'Fournisseur Câbles & Énergie CI sélectionné'},
          {date:D(2,15,30), ev:'Demande soumise pour validation'},
          {date:D(1,16,0),  ev:'Demande approuvée par BAMBA ALICE'}
        ] },

      /* --- 4) Demande EN ATTENTE DE VALIDATION --- */
      { id:'r4', numero:'ACH-2026-00004', date:D(0,9), demandeurId:'u2', service:'DSI', priorite:'Urgente',
        motif:'Achat de 50 licences VPN pour le télétravail des collaborateurs.',
        articles:[{designation:'Licence Fortinet FortiClient VPN', quantite:50, prix:25000}],
        supplierIds:['s3','s6','s7'],
        offers:{ s3:{prixArticles:{0:25000}, delai:3, garantie:1, paiement:'30 jours', observations:'Support technique inclus'},
                 s6:{prixArticles:{0:24500}, delai:5, garantie:1, paiement:'Comptant', observations:''},
                 s7:{prixArticles:{0:26000}, delai:7, garantie:2, paiement:'60 jours', observations:''} },
        chosenSupplierId:'s6', justification:'Prix total le plus bas parmi les offres reçues (24 500 FCFA la licence).',
        statut:'en_attente', submittedAt:D(0,9,40), validation:null,
        history:[
          {date:D(0,9,0),  ev:'Demande créée'},
          {date:D(0,9,15), ev:'3 fournisseurs sélectionnés'},
          {date:D(0,9,30), ev:'Offres reçues et comparées'},
          {date:D(0,9,35), ev:'Fournisseur Digital Center sélectionné'},
          {date:D(0,9,40), ev:'Demande soumise pour validation'}
        ] },

      /* --- 5) Demande EN COMPARAISON (brouillon : offres en cours de collecte) --- */
      { id:'r5', numero:'ACH-2026-00005', date:D(0,8,30), demandeurId:'u3', service:'Comptabilité', priorite:'Basse',
        motif:'Achat de 2 imprimantes multifonctions pour le service comptable.',
        articles:[{designation:'Imprimante HP LaserJet MFP M428', quantite:2, prix:350000}],
        supplierIds:['s1','s6','s10'],
        offers:{ s1:{prixArticles:{0:345000}, delai:7, garantie:1, paiement:'30 jours', observations:''},
                 s6:{prixArticles:{}, delai:0, garantie:0, paiement:'', observations:''},
                 s10:{prixArticles:{}, delai:0, garantie:0, paiement:'', observations:''} },
        chosenSupplierId:null, justification:'',
        statut:'en_comparaison', step:3, submittedAt:null, validation:null,
        history:[
          {date:D(0,8,30), ev:'Demande créée'},
          {date:D(0,8,45), ev:'3 fournisseurs sélectionnés'}
        ] }
    ];

    const orders = [
      { id:'o1', numero:'BC-2026-00001', requestId:'r1', supplierId:'s1', date:D(5,9),  total:8200000, delai:'7 jours', statut:'Confirmée',
        lignes:[{designation:'Ordinateur portable Dell Latitude 5540', quantite:10, prix:820000}] },
      { id:'o2', numero:'BC-2026-00002', requestId:'r2', supplierId:'s5', date:D(1,9),  total:4175000, delai:'14 jours', statut:'Confirmée',
        lignes:[{designation:'Switch Cisco Catalyst 1000 24G', quantite:5, prix:850000}] }
    ];

    const receptions = [
      { id:'rec1', orderId:'o1', date:D(1,14), observations:'Matériel conforme, emballages intacts.',
        statut:'Complète', lignes:[{designation:'Ordinateur Dell Latitude 5540', qteCommandee:10, qteRecue:10}] },
      { id:'rec2', orderId:'o2', date:null, observations:'', statut:'En attente',
        lignes:[{designation:'Switch Cisco Catalyst 1000 24G', qteCommandee:5, qteRecue:0}] }
    ];

    const notifications = [
      {id:uid('n'), userId:'u4', texte:'🔔 Nouvelle demande ACH-2026-00004 à valider.', date:D(0,9,41), lu:false},
      {id:uid('n'), userId:'u5', texte:'🔔 Nouvelle demande ACH-2026-00004 à valider.', date:D(0,9,41), lu:false},
      {id:uid('n'), userId:'u3', texte:'✅ Votre demande ACH-2026-00003 a été approuvée.', date:D(1,16,1), lu:false},
      {id:uid('n'), userId:'u2', texte:'📦 Votre commande BC-2026-00002 a été créée.', date:D(1,9,1), lu:true},
      {id:uid('n'), userId:'u2', texte:'🚚 Votre commande BC-2026-00002 est prête à être réceptionnée.', date:D(1,9,2), lu:false},
      {id:uid('n'), userId:'u2', texte:'✅ Réception complète : la demande ACH-2026-00001 est clôturée.', date:D(1,14,6), lu:true}
    ];

    return { users, suppliers, requests, orders, receptions, notifications, meta:{ achCounter:5, bcCounter:2, seuilOffres:0, delaiAlerte:3, delaiUrgence:7, tva:0, poids:{prix:50, delai:20, garantie:20, paiement:10} } };
  }

  /* ============================= 4. AUTHENTIFICATION & PERMISSIONS ============================= */
  const ROLE_LABELS = { admin:'Administrateur', demandeur:'Demandeur', responsable:'Responsable' };

  /* Matrice des permissions — chaque écran vérifie le rôle via hasPermission() */
  const PERMS = {
    admin:       ['viewDashboard','createRequest','viewOwnRequests','viewAllRequests','validateRequests',
                  'viewSuppliers','manageSuppliers','importSuppliers','manageUsers',
                  'viewOrders','createOrder','viewReceptions','recordReception','viewReports','manageSettings'],
    demandeur:   ['viewDashboard','createRequest','viewOwnRequests','viewSuppliers',
                  'viewOrders','createOrder','viewReceptions','recordReception'],
    responsable: ['viewDashboard','validateRequests','viewAllRequests']
  };
  function hasPermission(p){ return !!(sessionUser && PERMS[sessionUser.role] && PERMS[sessionUser.role].includes(p)); }

  function doLogin(id, pw){
    const u = DB.users.find(x => norm(x.identifiant) === norm(id) && x.password === pw);
    if (!u) { toast('Identifiant ou mot de passe incorrect.', 'err'); return; }
    if (u.statut !== 'Actif') { toast('Ce compte est désactivé. Contactez l\'administrateur.', 'err'); return; }
    sessionUser = u;
    storage.setItem(SESSION_KEY, u.id);
    showApp();
    toast('Bienvenue ' + u.nom + ' 👋', 'ok');
  }
  function doLogout(){
    sessionUser = null;
    storage.removeItem(SESSION_KEY);
    $('#sidebar').classList.remove('open');
    $('#notif-panel').classList.add('hidden');
    showLogin();
  }
  function showLogin(){
    $('#app').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    $('#login-id').value = ''; $('#login-pw').value = '';
  }
  function showApp(){
    $('#login-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#su-avatar').textContent = initials(sessionUser.nom);
    $('#su-name').textContent = sessionUser.nom;
    $('#su-role').textContent = ROLE_LABELS[sessionUser.role];
    $('#tu-avatar').textContent = initials(sessionUser.nom);
    $('#tu-name').textContent = sessionUser.nom;
    $('#tu-role').textContent = ROLE_LABELS[sessionUser.role];
    debloquerAudio();          // le clic de connexion débloque l'audio du navigateur
    genererRappels();          // relances au moment de la connexion
    autoriserSons();           // les sons ne se déclenchent qu'après l'ouverture de session
    /* petit résumé sonore si des alertes sont en cours (uniquement pour l'utilisateur
       qui vient de se connecter : évite qu'une minuterie d'une session précédente
       joue un son pour quelqu'un d'autre) */
    const uidConnexion = sessionUser ? sessionUser.id : '';
    setTimeout(() => {
      if (!sonActif() || !sessionUser || sessionUser.id !== uidConnexion) return;
      const l = alertesActives().filter(a => {
        if (sessionUser.role === 'admin') return true;
        if (sessionUser.role === 'responsable') return a.cibles === 'responsable';
        return a.cibles === 'demandeur' && a.demandeurId === sessionUser.id;
      });
      if (l.some(a => a.niveau === 'urgent')) jouerSonNotif('urgent');
      else if (l.length) jouerSonNotif('alerte');
    }, 3000);
    go('dashboard');
  }

  /* ============================= 5. NAVIGATION ============================= */
  const PAGES = {
    dashboard:            {icon:'📊', label:'Tableau de bord',            perm:'viewDashboard'},
    nouvelleDemande:      {icon:'📝', label:'Nouvelle demande',           perm:'createRequest'},
    mesDemandes:          {icon:'📋', label:'Mes demandes',               perm:'viewOwnRequests'},
    toutesDemandes:       {icon:'🛒', label:'Toutes les demandes',        perm:'viewAllRequests'},
    aValider:             {icon:'🛒', label:'Demandes à valider',         perm:'validateRequests'},
    historiqueValidations:{icon:'📋', label:'Historique des validations', perm:'validateRequests'},
    fournisseurs:         {icon:'🏢', label:'Fournisseurs',               perm:'viewSuppliers'},
    utilisateurs:         {icon:'👥', label:'Utilisateurs',               perm:'manageUsers'},
    commandes:            {icon:'📦', label:'Commandes',                  perm:'viewOrders'},
    receptions:           {icon:'🚚', label:'Réceptions',                 perm:'viewReceptions'},
    rapports:             {icon:'📈', label:'Rapports',                   perm:'viewReports'},
    parametres:           {icon:'⚙️', label:'Paramètres',                 perm:'manageSettings'}
  };
  const MENUS = {
    admin:       ['dashboard','nouvelleDemande','mesDemandes','toutesDemandes','fournisseurs','utilisateurs','commandes','receptions','rapports','parametres'],
    demandeur:   ['dashboard','nouvelleDemande','mesDemandes','fournisseurs','commandes','receptions'],
    responsable: ['dashboard','aValider','historiqueValidations']
  };

  function menuLabel(key){
    if (key === 'commandes' && sessionUser.role === 'demandeur') return 'Mes commandes';
    if (key === 'receptions' && sessionUser.role === 'demandeur') return 'Mes réceptions';
    return PAGES[key].label;
  }

  function buildSidebar(){
    const nbToValidate = DB.requests.filter(r => r.statut === 'en_attente').length;
    $('#sidebar-nav').innerHTML = MENUS[sessionUser.role].map(k => {
      const badge = (k === 'aValider' && nbToValidate) ? `<span class="cnt">${nbToValidate}</span>` : '';
      const active = state.nav === k ? ' active' : '';
      return `<button class="nav-item${active}" data-act="nav" data-page="${k}">${PAGES[k].icon} ${esc(menuLabel(k))}${badge}</button>`;
    }).join('');
  }

  function go(page, params = {}){
    const p = PAGES[page];
    if (p && p.perm && !hasPermission(p.perm)) { toast('Accès refusé : vous n\'avez pas la permission d\'accéder à cet écran.', 'err'); return; }
    if (page === 'detailDemande') {
      const r = byId(DB.requests, params.id);
      if (!r) { toast('Demande introuvable.', 'err'); return; }
      const allowed = hasPermission('viewAllRequests') || hasPermission('validateRequests') || r.demandeurId === sessionUser.id;
      if (!allowed) { toast('Accès refusé à cette demande.', 'err'); return; }
    }
    if (page === 'nouvelleDemande' && !params.resume) draft = null; // nouvelle demande = repartir de zéro
    state.page = page;
    state.params = params;
    state.nav = params.nav || page;
    render();
  }

  function render(){
    /* application différée d'un jeu de données reçu de Supabase
       (jamais pendant la saisie d'un assistant ou l'ouverture d'une modale) */
    if (pendingRemote && state.page !== 'nouvelleDemande' && !$('#modal-root').classList.contains('open')){
      DB = pendingRemote; pendingRemote = null;
      storage.setItem(DB_KEY, JSON.stringify(DB));
    }
    $('#notif-panel').classList.add('hidden');
    majBoutonSon();
    buildSidebar();
    updateBell();
    const c = $('#page-content');
    switch (state.page) {
      case 'nouvelleDemande':        renderWizard(); break;
      case 'mesDemandes':
      case 'toutesDemandes':
      case 'aValider':               c.innerHTML = viewRequestsList(state.page); break;
      case 'historiqueValidations':  c.innerHTML = viewValidationHistory(); break;
      case 'detailDemande':          c.innerHTML = viewRequestDetail(state.params.id); break;
      case 'creationCommande':       c.innerHTML = viewCreateOrder(state.params.id); break;
      case 'fournisseurs':           c.innerHTML = viewSuppliers(); break;
      case 'utilisateurs':           c.innerHTML = viewUsers(); break;
      case 'commandes':              c.innerHTML = viewOrders(); break;
      case 'receptions':             c.innerHTML = viewReceptions(); break;
      case 'rapports':               c.innerHTML = viewReports(); break;
      case 'parametres':             c.innerHTML = viewSettings(); break;
      default:                       c.innerHTML = viewDashboard();
    }
    const titles = { detailDemande:'Détail de la demande', creationCommande:'Création de la commande' };
    $('#page-title').textContent = titles[state.page] || (PAGES[state.page] ? PAGES[state.page].label : 'Tableau de bord');
    window.scrollTo(0, 0);
  }

  /* ============================= 6. COMPOSANTS UI ============================= */
  const STATUTS = {
    brouillon:            {label:'BROUILLON',               cls:'b-gray'},
    en_comparaison:       {label:'EN COMPARAISON',          cls:'b-gray'},
    en_attente:           {label:'EN ATTENTE DE VALIDATION',cls:'b-amber'},
    approuvee:            {label:'APPROUVÉE',               cls:'b-green'},
    refusee:              {label:'REFUSÉE',                 cls:'b-red'},
    modification:         {label:'MODIFICATION DEMANDÉE',   cls:'b-orange'},
    commandee:            {label:'COMMANDE PASSÉE',         cls:'b-blue'},
    reception_partielle:  {label:'RÉCEPTION PARTIELLE',     cls:'b-purple'},
    cloturee:             {label:'CLÔTURÉE',                cls:'b-teal'}
  };
  const badge = st => `<span class="badge ${STATUTS[st] ? STATUTS[st].cls : 'b-gray'}">${STATUTS[st] ? STATUTS[st].label : esc(st)}</span>`;
  const statCard = (ico, color, val, label) => {
    const isMoney = String(val).includes('FCFA');
    return `<div class="stat"><div class="ico ${color}">${ico}</div><div><div class="v" ${isMoney?'style="font-size:15px"':''}>${val}</div><div class="l">${label}</div></div></div>`;
  };

  function suppName(id){ if (!id) return '—'; const s = byId(DB.suppliers, id); return s ? s.nom : 'Fournisseur supprimé'; }
  function userName(id){ const u = byId(DB.users, id); return u ? u.nom : '—'; }
  function totalEstimatif(r){ return (r.articles||[]).reduce((s,a) => s + (+a.quantite||0)*(+a.prix||0), 0); }
  function montantDemande(r){ const o = r.chosenSupplierId && r.offers && r.offers[r.chosenSupplierId]; const t = calcOfferTotal(r, o); return t > 0 ? t : totalEstimatif(r); }

  /* Total d'une offre : somme des prix négociés par article × quantités
     (compatibilité : anciennes offres au champ « prix » unique) */
  function calcOfferBrut(r, o){
    if (!o) return 0;
    if (o.prixArticles && Object.keys(o.prixArticles).length){
      return (r.articles || []).reduce((s, a, i) => s + (+(o.prixArticles[i] || 0)) * (+a.quantite || 0), 0);
    }
    return +o.prix || 0;
  }

  /* ================================================================
     AMÉLIORATIONS DE L'ÉTAPE 3 — COMPARAISON DES PRIX
     • offre complète + seuil paramétrable d'offres complètes
     • coût total rendu : remise (%) · TVA (%) · frais de livraison
     • score multicritère pondéré (prix / délai / garantie / paiement)
     • outils de saisie assistée + export de la comparaison
     ================================================================ */
  const DEFAULT_POIDS = { prix: 50, delai: 20, garantie: 20, paiement: 10 };
  const meta = () => (DB && DB.meta) ? DB.meta : {};
  function poids(){
    const p = Object.assign({}, DEFAULT_POIDS, meta().poids || {});
    const s = ['prix','delai','garantie','paiement'].reduce((t, k) => t + (Math.max(0, +p[k] || 0)), 0);
    return s > 0 ? p : Object.assign({}, DEFAULT_POIDS);
  }
  function poidsTotal(){ const p = poids(); return ['prix','delai','garantie','paiement'].reduce((t,k) => t + (+p[k]||0), 0); }
  function seuilOffres(){ const n = +meta().seuilOffres; return n >= 0 ? n : 3; }  /* 0 = prix facultatifs */
  function tauxTVA(){ const n = +meta().tva; return n >= 0 ? n : 0; }

  /* Une offre est « complète » quand chaque article a un prix négocié > 0 */
  function offreComplete(r, o){
    if (!o) return false;
    const arts = r.articles || [];
    if (!arts.length) return false;
    return arts.every((a, i) => +(((o.prixArticles || {})[i])) > 0);
  }
  function offresCompletes(r){ return (r.supplierIds || []).filter(sid => offreComplete(r, (r.offers || {})[sid])); }
  function prixSaisis(r){
    const sids = r.supplierIds || [], arts = r.articles || [];
    let nb = 0;
    sids.forEach(sid => arts.forEach((a, i) => { if (+(((r.offers || {})[sid] || {}).prixArticles || {})[i] > 0) nb++; }));
    return { nb, total: sids.length * arts.length };
  }

  /* Décomposition du coût : brut → remise → net HT → TVA → frais → coût total rendu */
  function calcOfferBreakdown(r, o){
    const brut = calcOfferBrut(r, o);
    const remisePct = Math.max(0, Math.min(100, +(o && o.remise) || 0));
    const remise = Math.round(brut * remisePct / 100);
    const netHT = brut - remise;
    const tva = Math.round(netHT * tauxTVA() / 100);
    const fraisLivraison = Math.max(0, Math.round(+((o && o.fraisLivraison) || 0)));
    return { brut, remisePct, remise, netHT, tva, fraisLivraison, total: netHT + tva + fraisLivraison };
  }
  function calcOfferTotal(r, o){ return calcOfferBreakdown(r, o).total; }

  /* Score multicritère — note sur 100 (pondération réglable dans ⚙️ Paramètres) */
  function paymentDays(txt){
    const t = String(txt || '').toLowerCase().trim();
    if (!t) return null;
    if (/comptant|immediat|immédiat|avance/.test(t)) return 0;
    const mj = t.match(/(\d+)\s*(jour|j)\b/); if (mj) return +mj[1];
    const mm = t.match(/(\d+)\s*mois/);       if (mm) return +mm[1] * 30;
    const mn = t.match(/(\d+)/);              if (mn) return +mn[1];
    return null;
  }
  function paymentScore(txt){
    const d = paymentDays(txt);
    if (d === null) return 50;                       // conditions non précisées : neutre
    return Math.max(0, Math.min(100, 30 + d));       // 0 j → 30 · 30 j → 60 · 60 j → 90 · 90 j → 100
  }
  function scoresOffres(r){
    const sids = offresCompletes(r);
    if (!sids.length) return {};
    const p = poids(), tot = Math.max(1, poidsTotal());
    const off = r.offers || {};
    const totals = {}, delais = {}, gars = {}, pai = {};
    sids.forEach(sid => {
      const o = off[sid] || {};
      totals[sid] = calcOfferTotal(r, o);
      delais[sid] = +o.delai || 0;
      gars[sid]   = +o.garantie || 0;
      pai[sid]    = paymentScore(o.paiement);
    });
    const minT = Math.min(...sids.map(s => totals[s]));
    const dPos = sids.map(s => delais[s]).filter(x => x > 0);
    const gPos = sids.map(s => gars[s]).filter(x => x > 0);
    const minD = dPos.length ? Math.min(...dPos) : 0;
    const maxG = gPos.length ? Math.max(...gPos) : 0;
    const out = {};
    sids.forEach(sid => {
      const sPrix = minT > 0 ? Math.max(0, Math.min(100, 100 * minT / totals[sid])) : 0;
      const sDel  = (delais[sid] > 0 && minD > 0) ? Math.max(0, Math.min(100, 100 * minD / delais[sid])) : 50;
      const sGar  = maxG > 0 ? Math.max(0, Math.min(100, 100 * gars[sid] / maxG)) : 50;
      const sPai  = pai[sid];
      const note  = (sPrix*(+p.prix||0) + sDel*(+p.delai||0) + sGar*(+p.garantie||0) + sPai*(+p.paiement||0)) / tot;
      out[sid] = { note: Math.round(note), prix: Math.round(sPrix), delai: Math.round(sDel), garantie: Math.round(sGar), paiement: Math.round(sPai), total: totals[sid] };
    });
    return out;
  }
  function meilleureOffre(r){
    const s = scoresOffres(r);
    const best = Object.entries(s).sort((a, b) => b[1].note - a[1].note || a[1].total - b[1].total)[0];
    return best ? Object.assign({ sid: best[0] }, best[1]) : null;
  }
  /* Classement des offres complètes par coût total rendu croissant */
  function classementOffres(r){
    return offresCompletes(r)
      .map(sid => ({ sid, total: calcOfferTotal(r, (r.offers || {})[sid]) }))
      .sort((a, b) => a.total - b.total)
      .reduce((acc, x, i) => { acc[x.sid] = i + 1; return acc; }, {});
  }
  /* Meilleur prix négocié pour un article (offres complètes uniquement) */
  function meilleurPrixArticle(r, i){
    const sids = offresCompletes(r);
    const vals = sids.map(sid => +(((((r.offers || {})[sid] || {}).prixArticles) || {})[i]) || 0).filter(v => v > 0);
    return vals.length ? Math.min(...vals) : null;
  }
  const fmtPct = n => (Math.round(+n || 0)) + ' %';
  function ecartPctHTML(neg, pres){
    if (!pres || !neg) return '<span class="cell-sub">—</span>';
    const d = (pres - neg) / pres * 100;
    const ok = d >= 0;
    return `<span class="cell-sub" style="font-weight:800;color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? '−' : '+'} ${fmtPct(Math.abs(d))}</span>`;
  }
  function scoreBar(note){
    const n = Math.max(0, Math.min(100, +note || 0));
    const couleur = n >= 75 ? 'var(--green)' : n >= 50 ? 'var(--amber)' : 'var(--red)';
    return `<div class="score-bar"><div class="score-fill" style="width:${n}%;background:${couleur}"></div></div>`;
  }
  const RANG_ICON = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  function rangBadge(n){ return `<span class="rank">${RANG_ICON[n - 1] || ('#' + n)} ${n === 1 ? 'Meilleur total' : ('Rang ' + n)}</span>`; }

  function pushHist(r, ev, date){
    const ex = (r.history||[]).find(h => h.ev === ev);
    if (ex) ex.date = date || nowISO();
    else { r.history = r.history || []; r.history.push({date: date || nowISO(), ev}); }
  }

  /* Barre de progression en 6 étapes (où en est ma demande ?) */
  function progressHTML(r){
    const order = DB.orders.find(o => o.requestId === r.id && o.statut === 'Confirmée');
    const recOk = order && DB.receptions.find(x => x.orderId === order.id && x.statut === 'Complète');
    const st = r.statut;
    const valDone = ['approuvee','commandee','reception_partielle','cloturee'].includes(st);
    const draftSt = (st === 'brouillon' || st === 'en_comparaison');
    const steps = [
      {l:'DEMANDE',    s:'done'},
      {l:'VALIDATION', s: st === 'refusee' ? 'error' : valDone ? 'done' : st === 'en_attente' ? 'current' : 'todo'},
      {l:'COMPARAISON',s: draftSt ? 'current' : 'done'},
      {l:'CHOIX',      s: r.chosenSupplierId ? 'done' : draftSt ? 'todo' : 'done'},
      {l:'COMMANDE',   s: order ? 'done' : st === 'approuvee' ? 'current' : 'todo'},
      {l:'RÉCEPTION',  s: recOk ? 'done' : (st === 'commandee' || st === 'reception_partielle') ? 'current' : 'todo'}
    ];
    return '<div class="steps">' + steps.map(x =>
      `<div class="step ${x.s}"><div class="dot">${x.s==='done'?'✓':x.s==='error'?'✕':''}</div><div class="lbl">${x.l}</div></div>`
    ).join('') + '</div>';
  }

  function timelineHTML(r){
    const items = clone(r.history || []).sort((a,b) => new Date(a.date) - new Date(b.date));
    if (!items.length) return '<div class="empty">Aucun événement.</div>';
    return '<ul class="timeline">' + items.map(h =>
      `<li><div class="tl-date">${fmtDT(h.date)}</div><div class="tl-ev">${esc(h.ev)}</div></li>`
    ).join('') + '</ul>';
  }

  /* Meilleures offres : 💰 meilleur total · 🚚 livraison la plus rapide · 🛡️ meilleure garantie */
  function bestOffers(r){
    const sids = r.supplierIds || [];
    /* seules les offres COMPLÈTES (tous les articles chiffrés) concourent au meilleur total */
    const withTotal = offresCompletes(r);
    const withDelai = sids.filter(id => +(((r.offers || {})[id] || {}).delai) > 0);
    const withGar   = sids.filter(id => +(((r.offers || {})[id] || {}).garantie) > 0);
    const minT = withTotal.length ? Math.min(...withTotal.map(id => calcOfferTotal(r, r.offers[id]))) : null;
    const minD = withDelai.length ? Math.min(...withDelai.map(id => +r.offers[id].delai)) : null;
    const maxG = withGar.length   ? Math.max(...withGar.map(id => +r.offers[id].garantie)) : null;
    return {
      prix:  minT === null ? [] : withTotal.filter(id => calcOfferTotal(r, r.offers[id]) === minT),
      delai: minD === null ? [] : withDelai.filter(id => +r.offers[id].delai === minD),
      gar:   maxG === null ? [] : withGar.filter(id => +r.offers[id].garantie === maxG)
    };
  }
  function chipsFor(r, sid){
    const b = bestOffers(r); let h = '';
    if (b.prix.includes(sid))  h += '<span class="chip">💰 Meilleur coût total</span>';
    if (b.delai.includes(sid)) h += '<span class="chip">🚚 Livraison la plus rapide</span>';
    if (b.gar.includes(sid))   h += '<span class="chip">🛡️ Meilleure garantie</span>';
    const best = meilleureOffre(r);
    if (best && best.sid === sid && Object.keys(scoresOffres(r)).length > 1)
      h += `<span class="chip chip-score">⭐ Meilleur score (${best.note}/100)</span>`;
    return h;
  }

  /* ---------- Négociation : CHAQUE ARTICLE est négocié séparément ---------- */

  /* Ligne « × quantité = total » sous chaque prix saisi */
  function lineTotalHTML(a, p){
    if (!p) return '<span class="cell-sub">— saisir le prix —</span>';
    return `<span class="cell-sub">× ${a.quantite} = <b>${fmtM(p * (+a.quantite || 0))}</b></span>`;
  }
  /* Cellules « coût » d'une offre : brut · remise · net HT · TVA · frais · total rendu */
  function coutCellHTML(r, sid){
    const o = (r.offers || {})[sid] || {}, b = calcOfferBreakdown(r, o);
    return {
      brut:  `<td data-brutof="${sid}">${b.brut ? fmtM(b.brut) : '—'}</td>`,
      remise:`<td><input type="number" min="0" max="100" step="1" data-of="${sid}" data-f="remise" value="${b.remisePct || ''}" placeholder="0"><div class="cell-sub" data-remiseof="${sid}">${b.remise ? '− ' + fmtM(b.remise) : ''}</div></td>`,
      net:   `<td data-netof="${sid}">${b.netHT ? fmtM(b.netHT) : '—'}</td>`,
      tva:   `<td data-tvaof="${sid}">${b.tva ? fmtM(b.tva) : '—'}</td>`,
      frais: `<td><input type="number" min="0" step="1000" data-of="${sid}" data-f="fraisLivraison" value="${b.fraisLivraison || ''}" placeholder="0"></td>`,
      total: `<td class="cell-total" data-totalof="${sid}"><b>${b.total ? fmtM(b.total) : '—'}</b></td>`,
      ecart: (() => {
        const pres = totalEstimatif(r);
        if (!b.total || !pres) return `<td data-ecartof="${sid}">—</td>`;
        const d = pres - b.total, pct = Math.round(Math.abs(d) / pres * 100);
        return `<td data-ecartof="${sid}" style="font-weight:800;color:${d >= 0 ? 'var(--green)' : 'var(--red)'}">${d >= 0 ? '− ' : '+ '}${fmtM(Math.abs(d))}<div class="cell-sub">${fmtPct(pct)}</div></td>`;
      })()
    };
  }

  /* Barre d'outils de saisie assistée + compteur de saisie + seuil d'offres complètes */
  function negoToolbarHTML(r){
    const { nb, total } = prixSaisis(r);
    const pct = total ? Math.round(100 * nb / total) : 0;
    const complets = offresCompletes(r).length, seuil = seuilOffres();
    const ok = complets >= seuil;
    return `
    <div class="nego-toolbar">
      <div class="nego-tools">
        <button class="btn outline sm" data-act="nego-prefill" title="Remplir les cases vides avec le coût présumé de chaque article">📋 Pré-remplir (coût présumé)</button>
        <button class="btn outline sm" data-act="nego-copyrows" title="Recopier le 1er prix saisi de chaque ligne sur tous les fournisseurs">⇉ Recopier par ligne</button>
        <button class="btn outline sm" data-act="nego-clear" title="Effacer tous les prix négociés">🧹 Effacer les prix</button>
        <button class="btn outline sm" data-act="nego-export" title="Exporter la grille de comparaison (Excel / CSV)">📊 Exporter la comparaison</button>
      </div>
      <div class="nego-count">
        <div class="nc-line">
          <span data-nego-count><b>${nb}</b> / ${total} prix saisis</span>
          <span class="badge ${ok ? 'b-green' : 'b-amber'}" data-nego-seuil>${complets} offre${complets > 1 ? 's' : ''} complète${complets > 1 ? 's' : ''} — minimum ${seuil}</span>
        </div>
        <div class="nego-progress"><div class="nego-progress-fill" data-nego-bar style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }

  /* Réglage de la pondération du score multicritère */
  function negoPoidsHTML(){
    const p = poids();
    const f = (k, label) => `<label class="poids-item"><span>${label}</span><input type="number" min="0" max="100" step="5" data-poids="${k}" value="${+p[k] || 0}"></label>`;
    return `<details class="poids-box">
      <summary>⚙️ Pondération du score multicritère — total <b data-poids-sum>${poidsTotal()}</b> %</summary>
      <div class="poids-grid">${f('prix', '💰 Prix')}${f('delai', '🚚 Délai')}${f('garantie', '🛡️ Garantie')}${f('paiement', '💳 Paiement')}</div>
      <p class="text-muted small">Le score va à l'offre la moins chère, la plus rapide, la mieux garantie et aux conditions de paiement les plus favorables. Le réglage est commun à toutes les demandes.</p>
    </details>`;
  }

  function negotiationHTML(r){
    const sids = r.supplierIds || [];
    const off = r.offers || {};
    const pres = totalEstimatif(r);
    const rangs = classementOffres(r);
    const nbArt = (r.articles || []).length;
    const tva = tauxTVA();

    const head = sids.map(sid => {
      const complet = offreComplete(r, off[sid]);
      const n = (r.articles || []).filter((a, i) => +(((off[sid] || {}).prixArticles || {})[i]) > 0).length;
      return `<th class="${sid === r.chosenSupplierId ? 'colchosen' : ''}">
        <span class="who">${esc(suppName(sid))}</span>
        <div class="th-sub" data-cmplt="${sid}">${n} / ${nbArt} article${nbArt > 1 ? 's' : ''} chiffré${nbArt > 1 ? 's' : ''}</div>
        <div data-rangof="${sid}">${complet ? rangBadge(rangs[sid]) : '<span class="badge b-amber">⚠️ SANS RÉPONSE</span>'}</div>
        <span data-badgelist="${sid}">${chipsFor(r, sid)}</span>
      </th>`;
    }).join('');

    const rows = (r.articles || []).map((a, i) => {
      const bestP = meilleurPrixArticle(r, i);
      const cells = sids.map(sid => {
        const p = +((((off[sid] || {}).prixArticles) || {})[i]) || 0;
        const isBest = bestP !== null && p > 0 && p === bestP;
        return `<td class="nego-cell${isBest ? ' cellbest' : ''}" data-cell="${sid}-${i}">
          <input type="number" min="0" step="500" data-of="${sid}" data-ai="${i}" value="${p || ''}" placeholder="Prix négocié">
          <div data-lt="${sid}-${i}">${lineTotalHTML(a, p)}</div>
          <div data-ec="${sid}-${i}">${ecartPctHTML(p, +a.prix)}</div>
        </td>`;
      }).join('');
      return `<tr>
        <td>📦 <b>${esc(a.designation)}</b>
          <div class="cell-sub">Quantité : ${a.quantite} · coût présumé : ${fmtM(a.prix)}</div>
          <button class="btn sm outline btn-row" data-act="nego-copyrow" data-id="${i}" title="Recopier le 1er prix saisi de cette ligne sur tous les fournisseurs">⧉ Recopier</button>
        </td>${cells}
      </tr>`;
    }).join('');

    const ligne = (label, sub, fn) => `<tr><td>${label}${sub ? `<div class="cell-sub">${sub}</div>` : ''}</td>${sids.map(sid => fn(sid)).join('')}</tr>`;
    const cout = {};
    sids.forEach(sid => { cout[sid] = coutCellHTML(r, sid); });

    const synthese = [
      ligne('💰 <b>TOTAL ARTICLES (brut)</b>', 'prix négociés × quantités', sid => cout[sid].brut),
      ligne('🏷️ <b>Remise commerciale (%)</b>', '', sid => cout[sid].remise),
      ligne('🧾 <b>NET HT</b>', 'après remise', sid => cout[sid].net),
      ligne(`💵 <b>TVA (${fmtPct(tva)})</b>`, 'réglable dans ⚙️ Paramètres', sid => cout[sid].tva),
      ligne('🚛 <b>Frais de livraison (FCFA)</b>', '', sid => cout[sid].frais),
      ligne('⭐ <b>COÛT TOTAL RENDU</b>', 'net HT + TVA + livraison', sid => cout[sid].total),
      ligne('📈 <b>Écart vs somme présumée</b>', `Présumé : ${fmtM(pres)}`, sid => cout[sid].ecart),
      ligne('⭐ <b>SCORE GLOBAL (/100)</b>', 'prix · délai · garantie · paiement', sid => scoreCellHTML(r, sid))
    ].join('');

    const crit = (icon, label, f, type, extra) => `<tr><td>${icon} ${label}</td>${sids.map(sid => {
      const o = off[sid] || {}; const v = o[f];
      const show = (v === undefined || v === null || v === '') ? '' : ((f === 'delai' || f === 'garantie') && !+v) ? '' : v;
      return `<td><input type="${type || 'text'}" ${extra || ''} data-of="${sid}" data-f="${f}" value="${esc(show)}"></td>`;
    }).join('')}</tr>`;

    const best = meilleureOffre(r);
    const banner = best
      ? `<div class="chosen-banner" data-bestbanner>🏆 <b>Meilleure offre globale : ${esc(suppName(best.sid))}</b> — score <b>${best.note}/100</b> pour un coût total rendu de <b>${fmtM(best.total)}</b>.</div>`
      : '<div class="chosen-banner" data-bestbanner style="display:none"></div>';

    return `
    ${negoToolbarHTML(r)}
    <div class="chosen-banner" style="background:#f5e9fb;border-color:var(--primary);color:#3b0053">📞 Négociez <b>article par article</b> auprès de chaque fournisseur : saisissez le prix unitaire obtenu — le total de la ligne, le coût total rendu (remise, TVA, livraison) et le <b>score multicritère</b> se calculent automatiquement.</div>
    ${banner}
    ${negoPoidsHTML()}
    <div class="cmp-scroll mt"><table class="cmp">
      <tr><th>Article \ Fournisseur</th>${head}</tr>
      ${rows}
      ${synthese}
      ${crit('🚚', 'Délai de livraison (jours)', 'delai', 'number', 'min="0"')}
      ${crit('🛡️', 'Garantie (années)', 'garantie', 'number', 'min="0" step="0.5"')}
      ${crit('💳', 'Conditions de paiement', 'paiement', 'text', 'class="wide" placeholder="ex : 30 jours"')}
      ${crit('📝', 'Observations', 'observations', 'text', 'class="wide"')}
    </table></div>
    <p class="hint text-muted small" style="margin-top:8px">Chaque cellule = <b>le prix négocié de CET article chez CE fournisseur</b>. Les prix restent modifiables à tout moment (retour sur cette étape), même après comparaison. Le meilleur prix de chaque ligne est surligné en vert ; les fournisseurs <b>sans réponse complète</b> sont marqués « ⚠️ SANS RÉPONSE » et exclus du meilleur prix, du meilleur total et du score.</p>`;
  }

  /* Recalcul en direct de toute la grille (sans perdre le focus de la cellule saisie) */
  function refreshNegoLive(r, focusSid, focusIdx){
    const sids = r.supplierIds || [], off = r.offers || {};
    const nbArt = (r.articles || []).length;
    const rangs = classementOffres(r);
    const sc = scoresOffres(r);
    const { nb, total } = prixSaisis(r);
    const cnt = $('[data-nego-count]'); if (cnt) cnt.innerHTML = `<b>${nb}</b> / ${total} prix saisis`;
    const bar = $('[data-nego-bar]'); if (bar) bar.style.width = (total ? Math.round(100 * nb / total) : 0) + '%';
    const seuilEl = $('[data-nego-seuil]');
    if (seuilEl){
      const c = offresCompletes(r).length, s = seuilOffres();
      seuilEl.className = 'badge ' + (c >= s ? 'b-green' : 'b-amber');
      seuilEl.textContent = `${c} offre${c > 1 ? 's' : ''} complète${c > 1 ? 's' : ''} — minimum ${s}`;
    }
    sids.forEach(sid => {
      const o = off[sid] || {}, complet = offreComplete(r, o), b = calcOfferBreakdown(r, o);
      const cm = $(`[data-cmplt="${sid}"]`);
      if (cm){ const n = (r.articles || []).filter((a, i) => +((o.prixArticles || {})[i]) > 0).length;
        cm.textContent = `${n} / ${nbArt} article${nbArt > 1 ? 's' : ''} chiffré${nbArt > 1 ? 's' : ''}`; }
      const rg = $(`[data-rangof="${sid}"]`); if (rg) rg.innerHTML = complet ? rangBadge(rangs[sid]) : '<span class="badge b-amber">⚠️ SANS RÉPONSE</span>';
      const bl = $(`[data-badgelist="${sid}"]`); if (bl) bl.innerHTML = chipsFor(r, sid);
      const c = coutCellHTML(r, sid);
      /* remplacement des cellules de coût en conservant l'attribut de ciblage */
      const upd = (attr, html) => {
        const el = $(`[${attr}="${sid}"]`); if (!el) return;
        const tmp = document.createElement('table'); tmp.innerHTML = '<tr>' + html + '</tr>';
        const td = tmp.querySelector('td'); td.setAttribute(attr, sid); el.replaceWith(td);
      };
      upd('data-brutof', c.brut);
      const rem = $(`[data-remiseof="${sid}"]`); if (rem) rem.innerHTML = b.remise ? '− ' + fmtM(b.remise) : '';
      upd('data-netof', c.net); upd('data-tvaof', c.tva);
      upd('data-totalof', c.total); upd('data-ecartof', c.ecart); upd('data-scoreof', scoreCellHTML(r, sid));
    });
    (r.articles || []).forEach((a, i) => {
      const bestP = meilleurPrixArticle(r, i);
      sids.forEach(sid => {
        const p = +((((off[sid] || {}).prixArticles) || {})[i]) || 0;
        const td = $(`[data-cell="${sid}-${i}"]`);
        if (td) td.classList.toggle('cellbest', bestP !== null && p > 0 && p === bestP);
        if (!(sid === focusSid && i === focusIdx)){
          const lt = $(`[data-lt="${sid}-${i}"]`); if (lt) lt.innerHTML = lineTotalHTML(a, p);
          const ec = $(`[data-ec="${sid}-${i}"]`); if (ec) ec.innerHTML = ecartPctHTML(p, +a.prix);
        }
      });
    });
    if (focusSid && focusIdx !== undefined && focusIdx !== null){
      const a = (r.articles || [])[focusIdx];
      const v = +((((off[focusSid] || {}).prixArticles) || {})[focusIdx]) || 0;
      const lt = $(`[data-lt="${focusSid}-${focusIdx}"]`); if (lt) lt.innerHTML = lineTotalHTML(a, v);
      const ec = $(`[data-ec="${focusSid}-${focusIdx}"]`); if (ec) ec.innerHTML = ecartPctHTML(v, +a.prix);
    }
    /* Bannière « meilleure offre globale » */
    const best = meilleureOffre(r);
    const bb = $('[data-bestbanner]');
    if (bb) bb.innerHTML = best
      ? `🏆 <b>Meilleure offre globale : ${esc(suppName(best.sid))}</b> — score <b>${best.note}/100</b> pour un coût total rendu de <b>${fmtM(best.total)}</b>.`
      : '';
  }

  /* Grille fournisseurs : saisie des nouveaux prix négociés (modifiable)
     ou comparaison croisée des offres (lecture, meilleures offres surlignées) */

  /* Cellules « coût » en lecture seule (comparaison étape 4 et détail de la demande) */
  function coutROCellHTML(r, sid){
    const o = (r.offers || {})[sid] || {}, b = calcOfferBreakdown(r, o);
    const cls = sid === r.chosenSupplierId ? 'colchosen' : '';
    const pres = totalEstimatif(r);
    let ecart = '—', coul = '';
    if (b.total && pres){
      const d = pres - b.total;
      coul = ` style="font-weight:800;color:${d >= 0 ? 'var(--green)' : 'var(--red)'}"`;
      ecart = `${d >= 0 ? '− ' : '+ '}${fmtM(Math.abs(d))}<div class="cell-sub">${fmtPct(Math.abs(d) / pres * 100)}</div>`;
    }
    return {
      brut:   `<td class="${cls}">${b.brut ? fmtM(b.brut) : '—'}</td>`,
      remise: `<td class="${cls}">${b.remisePct ? b.remisePct + ' %<div class="cell-sub">− ' + fmtM(b.remise) + '</div>' : '—'}</td>`,
      net:    `<td class="${cls}">${b.netHT ? fmtM(b.netHT) : '—'}</td>`,
      tva:    `<td class="${cls}">${b.tva ? fmtM(b.tva) : '—'}</td>`,
      frais:  `<td class="${cls}">${b.fraisLivraison ? fmtM(b.fraisLivraison) : '—'}</td>`,
      total:  `<td class="${cls} cell-total"><b style="font-size:14px">${b.total ? fmtM(b.total) : '—'}</b></td>`,
      ecart:  `<td class="${cls}"${coul}>${ecart}</td>`
    };
  }
  function scoreCellHTML(r, sid, extraCls){
    const sc = scoresOffres(r)[sid];
    const cls = ((sid === r.chosenSupplierId ? 'colchosen ' : '') + (extraCls || '')).trim();
    if (!sc) return `<td class="${cls}" data-scoreof="${sid}"><span class="badge b-amber">NON ÉVALUÉ</span><div class="cell-sub">offre incomplète</div></td>`;
    return `<td class="${cls}" data-scoreof="${sid}"><b style="font-size:14px">${sc.note}</b><span class="cell-sub">/100</span>
      ${scoreBar(sc.note)}
      <div class="cell-sub">💰${sc.prix} · 🚚${sc.delai} · 🛡️${sc.gar} · 💳${sc.paiement}</div></td>`;
  }

  function comparisonHTML(r, editable){
    const sids = r.supplierIds || [];
    const off = r.offers || {};
    const pres = totalEstimatif(r);
    const rangs = classementOffres(r);
    const nbArt = (r.articles || []).length;
    const tva = tauxTVA();

    const head = sids.map(sid => {
      const chosen = sid === r.chosenSupplierId;
      const complet = offreComplete(r, off[sid]);
      const n = (r.articles || []).filter((a, i) => +(((off[sid] || {}).prixArticles || {})[i]) > 0).length;
      return `<th class="${chosen ? 'colchosen' : ''}"><span class="who">${esc(suppName(sid))}</span>
        ${chosen ? '<br><span class="badge b-green" style="margin-top:4px">RETENU</span>' : ''}
        ${!editable ? `<div class="th-sub">${n} / ${nbArt} chiffrés</div><div>${complet ? rangBadge(rangs[sid]) : '<span class="badge b-amber">⚠️ SANS RÉPONSE</span>'}</div>` : ''}
        <span data-badgelist="${sid}">${chipsFor(r, sid)}</span></th>`;
    }).join('');

    const rows = [];
    (r.articles || []).forEach((a, i) => {
      const bestP = meilleurPrixArticle(r, i);
      const cells = sids.map(sid => {
        const o = off[sid] || {};
        const chosen = sid === r.chosenSupplierId;
        const cls = chosen ? 'colchosen' : '';
        const p = +((o.prixArticles || {})[i]) || 0;
        if (editable){
          return `<td class="nego-cell ${cls}" data-cell="${sid}-${i}"><input type="number" min="0" step="500" data-of="${sid}" data-ai="${i}" value="${p || ''}" placeholder="Prix négocié">
            <div data-lt="${sid}-${i}">${lineTotalHTML(a, p)}</div><div data-ec="${sid}-${i}">${ecartPctHTML(p, +a.prix)}</div></td>`;
        }
        if (!p) return `<td class="${cls}"><span class="badge b-red">NON RENSEIGNÉ</span></td>`;
        const best = bestP !== null && p === bestP;
        return `<td class="${cls}${best ? ' cellbest' : ''}">${fmtM(p)}
          <div class="cell-sub">× ${a.quantite} = <b>${fmtM(p * (+a.quantite || 0))}</b></div>
          <div>${ecartPctHTML(p, +a.prix)}</div>
          ${best ? '<br><span class="chip">💰 Meilleur prix</span>' : ''}</td>`;
      }).join('');
      rows.push(`<tr><td>📦 <b>${esc(a.designation)}</b><div class="cell-sub">Quantité : ${a.quantite} · coût présumé : ${fmtM(a.prix)}</div></td>${cells}</tr>`);
    });

    /* Synthèse financière + score multicritère */
    const cRO = {}, cED = {};
    sids.forEach(sid => { cRO[sid] = coutROCellHTML(r, sid); cED[sid] = coutCellHTML(r, sid); });
    const ligne = (label, sub, key) => `<tr><td>${label}${sub ? `<div class="cell-sub">${sub}</div>` : ''}</td>${sids.map(sid => (editable ? cED[sid][key] : cRO[sid][key])).join('')}</tr>`;
    rows.push(ligne('💰 <b>TOTAL ARTICLES (brut)</b>', 'prix négociés × quantités', 'brut'));
    rows.push(ligne('🏷️ <b>Remise commerciale</b>', '', 'remise'));
    rows.push(ligne('🧾 <b>NET HT</b>', 'après remise', 'net'));
    rows.push(ligne(`💵 <b>TVA (${fmtPct(tva)})</b>`, '', 'tva'));
    rows.push(ligne('🚛 <b>Frais de livraison</b>', '', 'frais'));
    rows.push(ligne('⭐ <b>COÛT TOTAL RENDU</b>', 'net HT + TVA + livraison', 'total'));
    rows.push(ligne('📈 <b>Écart vs somme présumée</b>', `Présumé : ${fmtM(pres)}`, 'ecart'));
    rows.push(`<tr><td>⭐ <b>SCORE GLOBAL (/100)</b><div class="cell-sub">prix · délai · garantie · paiement</div></td>${sids.map(sid => scoreCellHTML(r, sid)).join('')}</tr>`);

    const crit = (icon, label, f, fmt, type, extra) => `<tr><td>${icon} ${label}</td>${sids.map(sid => {
      const o = off[sid] || {};
      const chosen = sid === r.chosenSupplierId;
      const v = o[f];
      const show = (v === undefined || v === null || v === '') ? '' : ((f === 'delai' || f === 'garantie') && !+v) ? '' : v;
      if (editable && f) return `<td class="${chosen ? 'colchosen' : ''}"><input type="${type || 'text'}" ${extra || ''} data-of="${sid}" data-f="${f}" value="${esc(show)}"></td>`;
      return `<td class="${chosen ? 'colchosen' : ''}">${fmt(o)}</td>`;
    }).join('')}</tr>`;
    rows.push(crit('🚚', 'Délai de livraison', 'delai', o => fmtDel(o.delai), 'number', 'min="0"'));
    rows.push(crit('🛡️', 'Garantie', 'garantie', o => fmtGar(o.garantie), 'number', 'min="0" step="0.5"'));
    rows.push(crit('💳', 'Conditions de paiement', 'paiement', o => esc(o.paiement || '—'), 'text', 'class="wide" placeholder="ex : 30 jours"'));
    rows.push(crit('📝', 'Observations', 'observations', o => esc(o.observations || '—'), 'text', 'class="wide"'));

    const best = meilleureOffre(r);
    const banner = (!editable && best)
      ? `<div class="chosen-banner">🏆 <b>Meilleure offre globale : ${esc(suppName(best.sid))}</b> — score <b>${best.note}/100</b> pour un coût total rendu de <b>${fmtM(best.total)}</b>.</div>`
      : '';
    const note = editable
      ? `<p class="hint text-muted small" style="margin-top:8px">📞 Après avoir <b>appelé chaque fournisseur</b>, saisissez ici les <b>nouveaux prix négociés</b> article par article, ainsi que le délai, la garantie et les conditions obtenues. Les totaux, le coût rendu et les scores se mettent à jour automatiquement.</p>`
      : `<p class="hint text-muted small" style="margin-top:8px">💰 Surligné en vert : <b>meilleur prix négocié</b> pour chaque article. Le <b>coût total rendu</b> intègre la remise, la TVA (${fmtPct(tva)}) et les frais de livraison ; le <b>score</b> pondère le prix, le délai, la garantie et le paiement. Les fournisseurs sans réponse complète sont exclus du classement.</p>`;
    return ` ${banner}<div class="cmp-scroll"><table class="cmp"><tr><th>Article \ Fournisseur</th>${head}</tr>${rows.join('')}</table></div>${note}`;
  }

  /* ---- Modales ---- */
  function modal(title, bodyHTML, buttons, wide){
    $('#modal-root').innerHTML =
      `<div class="modal-overlay" data-act="modal-close"></div>
       <div class="modal ${wide?'wide':''}">
         <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" data-act="modal-close">✕</button></div>
         <div class="modal-body">${bodyHTML}</div>
         <div class="modal-foot">${(buttons||[]).map((b,i)=>`<button class="btn ${b.cls||'outline'}" data-mbtn="${i}">${b.label}</button>`).join('')}</div>
       </div>`;
    $('#modal-root').classList.add('open');
    $('#modal-root').querySelectorAll('[data-mbtn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = buttons[+btn.dataset.mbtn];
        if (b && b.act) b.act();
        else closeModal();
      });
    });
  }
  function closeModal(){ $('#modal-root').classList.remove('open'); $('#modal-root').innerHTML = ''; }
  function confirmModal(text, onYes, yesLabel){
    modal('Confirmation', `<p style="font-size:14px">${text}</p>`, [
      {label:'Annuler', cls:'outline'},
      {label: yesLabel || 'Confirmer', cls:'primary', act: () => { closeModal(); onYes(); }}
    ]);
  }

  /* ---- Toasts ---- */
  function toast(msg, type){
    /* petit signal sonore pour les messages importants (erreur / avertissement) */
    if (sonPret && sessionUser && sonActif()){
      if (type === 'err') jouerSonNotif('urgent');
      else if (type === 'warn') jouerSonNotif('alerte');
    }
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.innerHTML = (type === 'ok' ? '✅ ' : type === 'err' ? '⛔ ' : type === 'warn' ? '⚠️ ' : 'ℹ️ ') + esc(msg);
    $('#toast-root').appendChild(d);
    setTimeout(() => d.remove(), 4000);
  }

  /* ---- Notifications ---- */
  function notify(userId, texte, opts){
    const o = opts || {};
    DB.notifications.unshift({ id:uid('n'), userId, texte, date:nowISO(), lu:false,
      niveau: o.niveau || 'info', cle: o.cle || '', requestId: o.requestId || '' });
    /* son uniquement pour l'utilisateur connecté, et jamais au démarrage */
    if (sessionUser && userId === sessionUser.id && sonPret) jouerSonNotif(o.niveau || 'info');
  }
  function notifyRole(role, texte){ DB.users.filter(u => u.role === role && u.statut === 'Actif').forEach(u => notify(u.id, texte)); }
  function unreadCount(){ return DB.notifications.filter(n => n.userId === sessionUser.id && !n.lu).length; }
  function updateBell(){
    const n = unreadCount(); const b = $('#bell-badge');
    b.textContent = n; b.style.display = n ? 'flex' : 'none';
  }
  const notifIcon = (n) => n.niveau === 'urgent' ? '🔴' : n.niveau === 'alerte' ? '🟠' : '🔵';

  /* ---------- Sons de notification (Web Audio API : aucun fichier à télécharger,
     fonctionne donc aussi dans la version autonome et hors-ligne) ---------- */
  const SON_CLE = 'voomnet_son';
  let audioCtx = null;
  const sonActif = () => storage.getItem(SON_CLE) !== '0';          // actif par défaut
  function setSonActif(on){ storage.setItem(SON_CLE, on ? '1' : '0'); }
  let sonPret = false;                                              // évite les bips au démarrage
  function autoriserSons(){ setTimeout(() => { sonPret = true; }, 2500); }

  /* Les navigateurs bloquent l'audio tant qu'aucune interaction n'a eu lieu :
     on crée / réactive le contexte audio dès le premier clic ou appui sur une touche. */
  function debloquerAudio(){
    try {
      const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!Ctx) return false;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state !== 'running' && audioCtx.resume) audioCtx.resume();
      return audioCtx.state === 'running';
    } catch(e){ return false; }
  }
  function installerDeblocageAudio(){
    const unlock = () => {
      debloquerAudio();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
  }

  /* ---------- ALARME RÉPÉTÉE ----------
     Tant qu'il reste des notifications non lues éligibles, la mélodie est
     rejouée à intervalle régulier. Elle s'arrête dès que les messages sont
     lus, si l'utilisateur coupe les sons, ou après un nombre max de
     répétitions (pour ne pas sonner indéfiniment sur un poste inoccupé). */
  const ALARME_CLE = 'voomnet_alarme';
  function alarmeCfg(){
    let c = {};
    try { c = JSON.parse(storage.getItem(ALARME_CLE) || '{}') || {}; } catch(e){ c = {}; }
    return {
      actif:   c.actif !== false,
      delai:   Math.max(5, +c.delai || 15),
      max:     Math.max(1, +c.max || 10),
      niveaux: c.niveaux || 'tous'        // tous | urgent_alerte | urgent
    };
  }
  function setAlarmeCfg(c){ storage.setItem(ALARME_CLE, JSON.stringify(c)); }

  function notifsAlarme(){
    if (!sessionUser) return [];
    const cfg = alarmeCfg();
    return (DB.notifications || []).filter(n => {
      if (n.userId !== sessionUser.id || n.lu) return false;
      const nv = n.niveau || 'info';
      if (cfg.niveaux === 'urgent') return nv === 'urgent';
      if (cfg.niveaux === 'urgent_alerte') return nv === 'urgent' || nv === 'alerte';
      return true;
    });
  }
  function niveauLePlusFort(liste){
    if (liste.some(n => n.niveau === 'urgent')) return 'urgent';
    if (liste.some(n => n.niveau === 'alerte')) return 'alerte';
    return 'info';
  }

  let alarmeRepetitions = 0, alarmeEnCours = false;
  function jouerAcquittement(){
    sonPret = true;
    try { bipe(523, 0, .12, .16); bipe(784, .14, .22, .16); } catch(e){ /* ignoré */ }
  }
  function majEtatAlarme(enCours){
    alarmeEnCours = !!enCours;
    const b = $('#btn-son'); if (b) b.classList.toggle('alarme', alarmeEnCours);
  }
  function arreterAlarme(acquitter){
    alarmeRepetitions = 0;
    majEtatAlarme(false);
    /* bip de confirmation : dès que des messages non lus viennent d'être acquittés,
       même si l'alarme s'était déjà tue d'elle-même (maximum atteint) */
    if (acquitter && sonActif()) jouerAcquittement();
  }
  function surveillerAlarme(){
    if (!sessionUser || !sonActif()){ arreterAlarme(false); return; }
    const cfg = alarmeCfg();
    if (!cfg.actif){ alarmeRepetitions = 0; majEtatAlarme(false); return; }
    const nonLues = notifsAlarme();
    if (!nonLues.length){ if (alarmeEnCours) arreterAlarme(true); else alarmeRepetitions = 0; return; }
    /* on n'insiste pas si l'onglet est en arrière-plan (les navigateurs
       suspendent de toute façon les minuteries et l'audio) */
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (alarmeRepetitions >= cfg.max){ majEtatAlarme(false); return; }   // assez insisté : on garde le badge visuel
    if (Date.now() - dernierSon >= cfg.delai * 1000){
      alarmeRepetitions++;
      jouerSonNotif(niveauLePlusFort(nonLues), true);
      majEtatAlarme(true);
    }
  }
  function demarrerSurveillanceAlarme(){ setInterval(surveillerAlarme, 4000); }

  /* Bouton 🔊 / 🔇 de la barre du haut */
  function majBoutonSon(){
    const b = $('#btn-son'); if (!b) return;
    b.textContent = sonActif() ? '🔊' : '🔇';
    b.title = sonActif() ? 'Sons activés — cliquer pour couper' : 'Sons coupés — cliquer pour activer';
  }

  function bipe(freq, decalage, duree, volume){
    try {
      const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
      const t0 = audioCtx.currentTime + decalage;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + duree + 0.03);
    } catch(e){ /* audio indisponible : on ignore */ }
  }

  /* Mélodies : une note = information, deux = alerte, trois aiguës = urgence */
  let dernierSon = 0;
  function jouerSonNotif(niveau, force){
    if (!sonActif() || !sessionUser) return;
    /* pare-chevauchement : jamais deux mélodies à moins de 800 ms (sauf test) */
    const maintenant = Date.now();
    if (!force && maintenant - dernierSon < 800) return;
    dernierSon = maintenant;
    if (niveau === 'urgent')      { bipe(880, 0, .15, .20); bipe(988, .19, .15, .20); bipe(1175, .38, .20, .20); }
    else if (niveau === 'alerte') { bipe(660, 0, .13, .15); bipe(523, .17, .20, .15); }
    else                          { bipe(587, 0, .12, .11); }
  }
  /* Bande d'essai : les trois sons à la suite */
  function testerSons(){
    if (!sonActif()){ toast('Les sons sont désactivés — réactivez-les dans ⚙️ Paramètres.', 'warn'); return; }
    sonPret = true;
    jouerSonNotif('info', true);
    setTimeout(() => jouerSonNotif('alerte', true), 750);
    setTimeout(() => jouerSonNotif('urgent', true), 1500);
    toast('Test sonore : information 🟠 alerte 🔴 urgence', 'ok');
  }
  function renderNotifPanel(){
    const ordre = { urgent: 0, alerte: 1, info: 2 };
    const list = DB.notifications.filter(n => n.userId === sessionUser.id)
      .sort((a, b) => (ordre[a.niveau || 'info'] - ordre[b.niveau || 'info'])
                   || ((a.lu ? 1 : 0) - (b.lu ? 1 : 0))
                   || (new Date(b.date) - new Date(a.date)));
    const nbUrg = list.filter(n => !n.lu && n.niveau === 'urgent').length;
    $('#notif-panel').innerHTML =
      `<div class="notif-head">🔔 Notifications${nbUrg ? ` <span class="badge b-red">${nbUrg} urgente${nbUrg > 1 ? 's' : ''}</span>` : ''}<button data-act="notif-readall">Tout marquer comme lu</button></div>
       <div class="notif-list">${list.length ? list.map(n =>
          `<div class="notif-item ${n.lu?'':'unread'} ${n.niveau || 'info'}"${n.requestId ? ` data-act="notif-open" data-nid="${n.id}" data-id="${n.requestId}" title="Ouvrir la demande"` : ''}>
             <div>${notifIcon(n)} ${esc(n.texte)}<time>${fmtDT(n.date)}</time></div></div>`
        ).join('') : '<div class="empty">Aucune notification.</div>'}</div>`;
  }

  /* ============================= 6bis. ALERTES ET RELANCES AUTOMATIQUES =============================
     Deux seuils réglables dans ⚙️ Paramètres : « alerte » (🟠) puis « urgence » (🔴). */
  function joursDepuis(iso){
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  }
  function delaiAlerte(){ const n = +meta().delaiAlerte; return n >= 0 ? n : 3; }
  function delaiUrgence(){ const n = +meta().delaiUrgence; return n > 0 ? n : 7; }

  function alertesActives(){
    const out = [];
    const A = delaiAlerte(), U = Math.max(delaiUrgence(), A + 1);

    DB.requests.filter(r => r.statut === 'en_attente').forEach(r => {
      const j = joursDepuis(r.submittedAt || r.date);
      if (j < A) return;
      out.push({
        cle: 'valid-' + r.id, type: 'validation', niveau: j >= U ? 'urgent' : 'alerte', jours: j,
        requestId: r.id, demandeurId: r.demandeurId, numero: r.numero, cibles: 'responsable',
        texte: `Demande ${r.numero} en attente de validation depuis ${j} jour${j > 1 ? 's' : ''}`
      });
    });

    DB.orders.filter(o => o.statut === 'Confirmée').forEach(o => {
      const rec = DB.receptions.find(x => x.orderId === o.id);
      if (rec && rec.statut === 'Complète') return;
      const r = byId(DB.requests, o.requestId);
      const annonce = +String(o.delai || '').replace(/\D/g, '');
      const j = joursDepuis(o.date) - (annonce || 0);
      if (j < A) return;
      out.push({
        cle: 'rec-' + o.id, type: 'reception', niveau: j >= U ? 'urgent' : 'alerte', jours: j,
        requestId: o.requestId, orderId: o.id, demandeurId: r ? r.demandeurId : null, numero: o.numero,
        cibles: 'demandeur',
        texte: rec && rec.statut === 'Partielle'
          ? `Réception partielle : la commande ${o.numero} reste à compléter depuis ${j} jour${j > 1 ? 's' : ''}`
          : `Commande ${o.numero} non réceptionnée depuis ${j} jour${j > 1 ? 's' : ''}`
      });
    });

    return out.sort((a, b) => ((b.niveau === 'urgent') - (a.niveau === 'urgent')) || (b.jours - a.jours));
  }

  function genererRappels(){
    if (!sessionUser || !DB || !Array.isArray(DB.notifications)) return 0;
    const auj = new Date().toISOString().slice(0, 10);
    let ajouts = 0;
    alertesActives().forEach(a => {
      const cle = 'REL-' + a.cle + '-' + auj;
      let cibles = [];
      if (a.cibles === 'responsable'){
        cibles = DB.users.filter(u => u.role === 'responsable' && u.statut === 'Actif');
      } else {
        const proprio = byId(DB.users, a.demandeurId);
        if (proprio && proprio.statut === 'Actif') cibles.push(proprio);
        if (a.niveau === 'urgent') cibles = cibles.concat(DB.users.filter(u => u.role === 'admin' && u.statut === 'Actif'));
      }
      cibles.forEach(u => {
        if (DB.notifications.some(n => n.cle === cle && n.userId === u.id)) return;
        notify(u.id, (a.niveau === 'urgent' ? 'URGENT — ' : 'Rappel — ') + a.texte,
               { niveau: a.niveau, cle, requestId: a.requestId });
        ajouts++;
      });
    });
    if (ajouts){ saveDB(); if (sessionUser) updateBell(); }
    return ajouts;
  }

  function alertesBandeauHTML(){
    if (!sessionUser) return '';
    const role = sessionUser.role;
    const list = alertesActives().filter(a => {
      if (role === 'admin') return true;
      if (role === 'responsable') return a.cibles === 'responsable';
      return a.cibles === 'demandeur' && a.demandeurId === sessionUser.id;
    });
    if (!list.length) return '';
    const urg = list.filter(a => a.niveau === 'urgent').length;
    return `<div class="alertes-bandeau${urg ? ' urgent' : ''}">
      <div class="ab-head">${urg ? '🔴' : '🟠'} <b>${list.length} alerte${list.length > 1 ? 's' : ''} en cours</b>${urg ? ` — dont ${urg} urgente${urg > 1 ? 's' : ''}` : ''}
        <span class="ab-seuils">seuils : ${delaiAlerte()} j / ${delaiUrgence()} j — réglables dans ⚙️ Paramètres</span></div>
      <ul class="ab-list">${list.slice(0, 6).map(a => `<li class="ab-item ${a.niveau}">
        <span class="ab-txt">${esc(a.texte)}</span>
        <button class="btn sm outline" data-act="notif-open" data-id="${a.requestId}">Ouvrir</button>
      </li>`).join('')}</ul>
      ${list.length > 6 ? `<p class="small text-muted" style="margin-top:6px">… et ${list.length - 6} autre(s) alerte(s).</p>` : ''}
    </div>`;
  }

  /* ============================= 7. TABLEAUX DE BORD ============================= */
  function recentRequestsTable(rows, nav){
    if (!rows.length) return '<div class="empty">Aucune demande pour le moment.</div>';
    return `<div class="table-wrap"><table class="tbl">
      <tr><th>Numéro</th><th>Date</th><th>Demandeur</th><th>Motif</th><th class="num">Montant</th><th>Statut</th><th></th></tr>
      ${rows.map(r => `<tr>
        <td class="cell-main">${esc(r.numero)}</td>
        <td>${fmtD(r.date)}</td>
        <td>${esc(userName(r.demandeurId))}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.motif)}">${esc(r.motif)}</td>
        <td class="num">${montantDemande(r) ? fmtM(montantDemande(r)) : '—'}</td>
        <td>${badge(r.statut)}</td>
        <td><button class="btn sm outline" data-act="view-request" data-id="${r.id}" data-nav="${nav}">Consulter</button></td>
      </tr>`).join('')}
    </table></div>`;
  }

  function viewDashboard(){
    const role = sessionUser.role;
    const corps = role === 'admin' ? dashboardAdmin()
                : role === 'responsable' ? dashboardResponsable()
                : dashboardDemandeur();
    return alertesBandeauHTML() + corps;
  }

  function dashboardAdmin(){
    const R = DB.requests;
    const orders = DB.orders.filter(o => o.statut === 'Confirmée');
    const totalAchats = orders.reduce((s,o) => s + (+o.total||0), 0);
    const cmdEnCours = orders.filter(o => {
      const rc = DB.receptions.find(x => x.orderId === o.id);
      return !rc || rc.statut !== 'Complète';
    }).length;
    const recAttente = DB.receptions.filter(x => x.statut === 'En attente').length;
    return `
    <div class="stats-grid">
      ${statCard('📝','blue',  R.length, 'Total des demandes')}
      ${statCard('⏳','amber', R.filter(r=>r.statut==='en_attente').length, 'Demandes en attente')}
      ${statCard('✅','green', R.filter(r=>r.statut==='approuvee').length, 'Demandes validées')}
      ${statCard('📦','blue',  cmdEnCours, 'Commandes en cours')}
      ${statCard('🚚','purple',recAttente, 'Réceptions en attente')}
      ${statCard('🏢','teal',  DB.suppliers.length, 'Fournisseurs')},
      ${statCard('👥','gray',  DB.users.length, 'Utilisateurs')}
      ${statCard('💰','green', fmtM(totalAchats), 'Montant total des achats')}
    </div>
    <div class="card"><h2>🕒 Demandes récentes</h2>${recentRequestsTable(clone(R).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8), 'toutesDemandes')}</div>`;
  }

  function dashboardResponsable(){
    const R = DB.requests;
    const aValider = R.filter(r => r.statut === 'en_attente');
    const approuvees = R.filter(r => r.validation && r.validation.decision === 'Approuvée');
    const refusees = R.filter(r => r.statut === 'refusee');
    return `
    <div class="stats-grid">
      ${statCard('🛒','amber', aValider.length, 'Demandes à valider')}
      ${statCard('✅','green', approuvees.length, 'Demandes approuvées')}
      ${statCard('❌','red',   refusees.length, 'Demandes refusées')}
      ${statCard('📋','blue',  R.filter(r=>r.validation).length, 'Décisions prises')}
    </div>
    <div class="card"><h2>⏳ En attente de votre validation</h2>${recentRequestsTable(aValider, 'aValider')}</div>
    <div class="card"><h2>🕒 Dernières demandes</h2>${recentRequestsTable(clone(R).sort((a,b)=>new Date(b.submittedAt||b.date)-new Date(a.submittedAt||a.date)).slice(0,6), 'aValider')}</div>`;
  }

  function dashboardDemandeur(){
    const mine = DB.requests.filter(r => r.demandeurId === sessionUser.id);
    const flow = ['Je saisis les articles, quantités et coûts présumés','Je choisis des fournisseurs (coordonnées affichées)','J\'appelle les fournisseurs et je saisis les prix négociés','Je compare les offres (prix, délais, garanties)','Je choisis une offre et je soumets','Le responsable valide','La commande est créée aux prix négociés','La marchandise est réceptionnée'];
    return `
    <div class="card">
      <h2>🧭 Le processus d'achat VOOMNET</h2>
      <div class="flow-chips">${flow.map((f,i)=>`<span class="flow-chip">${i+1}. ${f}</span>${i<flow.length-1?'<span class="flow-arrow">→</span>':''}`).join('')}</div>
    </div>
    <div class="stats-grid">
      ${statCard('📋','blue',  mine.length, 'Mes demandes')}
      ${statCard('⏳','amber', mine.filter(r=>['en_attente','brouillon','en_comparaison'].includes(r.statut)).length, 'En attente')}
      ${statCard('✅','green', mine.filter(r=>r.statut==='approuvee').length, 'Validées')}
      ${statCard('🔄','purple',mine.filter(r=>['commandee','reception_partielle'].includes(r.statut)).length, 'En cours')}
      ${statCard('🏁','teal',  mine.filter(r=>r.statut==='cloturee').length, 'Terminées')}
    </div>
    <div class="card">
      <h2>🕒 Mes demandes récentes
        <span class="h-actions"><button class="btn primary sm" data-act="nav" data-page="nouvelleDemande">＋ Nouvelle demande</button></span>
      </h2>${recentRequestsTable(clone(mine).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6), 'mesDemandes')}
    </div>`;
  }

  /* ============================= 8. LISTES DE DEMANDES & VALIDATION ============================= */
  let fReqStatus = '', fReqQ = '';

  function viewRequestsList(page){
    let rows, title, emptyMsg;
    if (page === 'mesDemandes') { rows = DB.requests.filter(r => r.demandeurId === sessionUser.id); title = '📋 Mes demandes'; emptyMsg = 'Vous n\'avez aucune demande. Cliquez sur « Nouvelle demande » pour commencer.'; }
    else if (page === 'aValider') { rows = DB.requests.filter(r => r.statut === 'en_attente'); title = '🛒 Demandes à valider'; emptyMsg = 'Aucune demande en attente de validation. 👍'; }
    else { rows = DB.requests.slice(); title = '🛒 Toutes les demandes'; emptyMsg = 'Aucune demande enregistrée.'; }

    const isAdmin = sessionUser.role === 'admin';
    let html = `<div class="card"><h2>${title}
        <span class="h-actions">${page === 'mesDemandes' ? '<button class="btn primary sm" data-act="nav" data-page="nouvelleDemande">＋ Nouvelle demande</button>' : ''}<button class="btn outline sm" data-act="export-requests">📊 Exporter Excel</button><button class="btn outline sm" data-act="export-pdf-requests">📄 PDF</button></span>
      </h2>
      <div class="toolbar">
        <input type="search" class="search" placeholder="🔎 Rechercher (numéro, motif, demandeur…)" value="${esc(fReqQ)}" data-filter="req-q">
        <select data-filter="req-status">
          <option value="">Tous les statuts</option>
          ${Object.keys(STATUTS).map(k=>`<option value="${k}" ${fReqStatus===k?'selected':''}>${STATUTS[k].label}</option>`).join('')}
        </select>
      </div>`;
    const q = norm(fReqQ);
    const filtered = rows.filter(r =>
      (!fReqStatus || r.statut === fReqStatus) &&
      (!q || norm(r.numero).includes(q) || norm(r.motif).includes(q) || norm(userName(r.demandeurId)).includes(q))
    ).sort((a,b) => new Date(b.date) - new Date(a.date));

    if (!filtered.length) html += `<div class="empty">${emptyMsg}</div>`;
    else html += `<div class="table-wrap"><table class="tbl">
      <tr><th>Numéro</th><th>Date</th>${page!=='mesDemandes'?'<th>Demandeur</th>':''}<th>Motif</th><th class="num">Montant</th><th>Statut</th><th style="width:230px">Actions</th></tr>
      ${filtered.map(r => {
        const mine = r.demandeurId === sessionUser.id;
        const canContinue = (r.statut==='brouillon'||r.statut==='en_comparaison'||r.statut==='modification') && (mine || isAdmin);
        return `<tr>
          <td class="cell-main">${esc(r.numero)}</td>
          <td>${fmtD(r.date)}</td>
          ${page!=='mesDemandes'?`<td>${esc(userName(r.demandeurId))}<div class="cell-sub">${esc(byId(DB.users,r.demandeurId)?.service||'')}</div></td>`:''}
          <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.motif)}">${esc(r.motif)}</td>
          <td class="num">${montantDemande(r) ? fmtM(montantDemande(r)) : '—'}</td>
          <td>${badge(r.statut)}</td>
          <td><div class="actions-bar" style="margin:0">
            <button class="btn sm outline" data-act="view-request" data-id="${r.id}" data-nav="${page}">Consulter</button>
            ${canContinue?`<button class="btn sm primary" data-act="resume-request" data-id="${r.id}">${r.statut==='modification'?'Reprendre':'Continuer'}</button>`:''}
            ${estAdmin()?`<button class="icon-mini" title="Supprimer la demande" data-act="delete-request" data-id="${r.id}">🗑️</button>`:''}
          </div></td>
        </tr>`;
      }).join('')}
    </table></div>`;
    return html + '</div>';
  }

  function viewValidationHistory(){
    const rows = DB.requests.filter(r => r.validation)
      .sort((a,b) => new Date(b.validation.date) - new Date(a.validation.date));
    const dBadge = d => d === 'Approuvée' ? '<span class="badge b-green">APPROUVÉE</span>'
      : d === 'Refusée' ? '<span class="badge b-red">REFUSÉE</span>' : '<span class="badge b-orange">MODIFICATION DEMANDÉE</span>';
    return `<div class="card"><h2>📋 Historique des validations</h2>
      ${rows.length ? `<div class="table-wrap"><table class="tbl">
        <tr><th>Numéro</th><th>Demandeur</th><th>Décision</th><th>Validateur</th><th>Motif / consigne</th><th>Date</th><th></th></tr>
        ${rows.map(r=>`<tr>
          <td class="cell-main">${esc(r.numero)}</td>
          <td>${esc(userName(r.demandeurId))}</td>
          <td>${dBadge(r.validation.decision)}</td>
          <td>${esc(r.validation.par)}</td>
          <td style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.validation.motif||'—')}">${esc(r.validation.motif||'—')}</td>
          <td>${fmtDT(r.validation.date)}</td>
          <td><button class="btn sm outline" data-act="view-request" data-id="${r.id}" data-nav="historiqueValidations">Consulter</button></td>
        </tr>`).join('')}
      </table></div>` : '<div class="empty">Aucune décision enregistrée.</div>'}
    </div>`;
  }

  /* ---------- Détail d'une demande ---------- */
  function viewRequestDetail(id){
    const r = byId(DB.requests, id);
    if (!r) return '<div class="card empty">Demande introuvable.</div>';
    const owner = r.demandeurId === sessionUser.id;
    const isAdmin = sessionUser.role === 'admin';
    const order = DB.orders.find(o => o.requestId === r.id);
    const rec = order ? DB.receptions.find(x => x.orderId === order.id) : null;
    const offer = (r.chosenSupplierId && r.offers) ? r.offers[r.chosenSupplierId] : null;

    let actions = '';
    if ((r.statut === 'brouillon' || r.statut === 'en_comparaison') && (owner || isAdmin))
      actions += `<button class="btn primary" data-act="resume-request" data-id="${r.id}">✏️ Continuer la demande</button>`;
    if (r.statut === 'modification' && (owner || isAdmin))
      actions += `<button class="btn primary" data-act="resume-request" data-id="${r.id}">🔄 Reprendre et modifier</button>`;
    if (r.statut === 'approuvee' && hasPermission('createOrder') && (owner || isAdmin))
      actions += `<button class="btn success" data-act="goto-create-order" data-id="${r.id}" data-nav="mesDemandes">🛒 Créer la commande</button>`;
    if (hasPermission('validateRequests') && r.statut === 'en_attente')
      actions += `
        <button class="btn success" data-act="decide" data-id="${r.id}" data-decision="Approuvée">✓ APPROUVER</button>
        <button class="btn danger"  data-act="decide" data-id="${r.id}" data-decision="Refusée">✕ REFUSER</button>
        <button class="btn warning" data-act="decide" data-id="${r.id}" data-decision="Modification demandée">🔄 DEMANDER UNE MODIFICATION</button>`;
  actions += `<button class="btn outline" data-act="print-request" data-id="${r.id}">🖨️ Imprimer la fiche</button>`;
  if (estAdmin())
    actions += `<button class="btn danger" data-act="delete-request" data-id="${r.id}">🗑️ Supprimer la demande</button>`;

    const prioBadge = { Haute:'b-red', Urgente:'b-red', Moyenne:'b-amber', Basse:'b-gray' }[r.priorite] || 'b-gray';

    return `
    <div class="card">
      <h2>${esc(r.numero)} ${badge(r.statut)}
        <span class="h-actions"><button class="btn outline sm" data-act="nav" data-page="${state.nav==='detailDemande'?(state.params.nav||'mesDemandes'):state.nav}">← Retour</button></span>
      </h2>
      ${progressHTML(r)}
      <div class="mt">
        <div class="kv"><span>Demandeur</span><span>${esc(userName(r.demandeurId))} — ${esc(r.service||'')}</span></div>
        <div class="kv"><span>Date de création</span><span>${fmtDT(r.date)}</span></div>
        <div class="kv"><span>Priorité</span><span><span class="badge ${prioBadge}">${esc((r.priorite||'—').toUpperCase())}</span></span></div>
        <div class="kv"><span>Motif du besoin</span><span style="max-width:70%">${esc(r.motif)}</span></div>
      </div>
      ${actions ? `<div class="actions-bar mt">${actions}</div>` : ''}
    </div>

    <div class="grid2">
      <div class="card">
        <h2>📦 Articles demandés</h2>
        <div class="table-wrap"><table class="tbl" style="min-width:420px">
          <tr><th>Article</th><th class="num">Quantité</th><th class="num">Coût présumé unitaire</th><th class="num">Total</th></tr>
          ${(r.articles||[]).map(a=>`<tr>
            <td class="cell-main">${esc(a.designation)}</td>
            <td class="num">${a.quantite}</td>
            <td class="num">${fmtM(a.prix)}</td>
            <td class="num">${fmtM((+a.quantite||0)*(+a.prix||0))}</td>
          </tr>`).join('')}
        </table></div>
        <div class="total-est"><span class="lbl">SOMME GLOBALE PRÉSUMÉE</span><b>${fmtM(totalEstimatif(r))}</b></div>
      </div>

      <div class="card">
        <h2>✅ Fournisseur retenu</h2>
        ${r.chosenSupplierId ? `
          <div class="kv"><span>Fournisseur</span><span>${esc(suppName(r.chosenSupplierId))}</span></div>
          <div class="kv"><span>Montant négocié</span><span>${offer && calcOfferTotal(r, offer) > 0 ? fmtM(calcOfferTotal(r, offer)) : '—'}</span></div>
          <div class="kv"><span>Délai</span><span>${offer ? fmtDel(offer.delai) : '—'}</span></div>
          <div class="kv"><span>Garantie</span><span>${offer ? fmtGar(offer.garantie) : '—'}</span></div>
          <div class="kv"><span>Justification</span><span style="max-width:100%">${esc(r.justification||'—')}</span></div>`
        : '<div class="empty">Aucun fournisseur n\'a encore été retenu.<br>La demande est en cours de préparation par le demandeur.</div>'}
      </div>
    </div>

    <div class="card">
      <h2>⚖️ Prix négociés &amp; comparaison des offres</h2>
      ${(r.supplierIds||[]).length ? comparisonHTML(r, false) : '<div class="empty">Aucun fournisseur sélectionné pour l\'instant.</div>'}
    </div>

    ${r.validation ? `<div class="card"><h2>🧾 Décision du responsable</h2>
      <div class="kv"><span>Décision</span><span>${r.validation.decision === 'Approuvée' ? '<span class="badge b-green">APPROUVÉE</span>' : r.validation.decision === 'Refusée' ? '<span class="badge b-red">REFUSÉE</span>' : '<span class="badge b-orange">MODIFICATION DEMANDÉE</span>'}</span></div>
      <div class="kv"><span>Validateur</span><span>${esc(r.validation.par)}</span></div>
      <div class="kv"><span>Date</span><span>${fmtDT(r.validation.date)}</span></div>
      <div class="kv"><span>Motif / consigne</span><span>${esc(r.validation.motif || '—')}</span></div>
    </div>` : (r.statut==='en_attente' ? '<div class="card"><h2>🧾 Décision du responsable</h2><div class="empty">⏳ En attente de validation par le responsable…</div></div>' : '')}

    ${order ? `<div class="card"><h2>📦 Commande associée</h2>
      <div class="kv"><span>Numéro</span><span>${esc(order.numero)} ${order.statut==='Confirmée'?'<span class="badge b-blue">COMMANDE PASSÉE</span>':'<span class="badge b-amber">À CONFIRMER</span>'}</span></div>
      <div class="kv"><span>Fournisseur</span><span>${esc(suppName(order.supplierId))}</span></div>
      <div class="kv"><span>Montant</span><span>${fmtM(order.total)}</span></div>
      <div class="kv"><span>Réception</span><span>${rec ? (rec.statut==='Complète'?'<span class="badge b-teal">RÉCEPTION COMPLÈTE</span>':rec.statut==='Partielle'?'<span class="badge b-purple">RÉCEPTION PARTIELLE</span>':'<span class="badge b-amber">EN ATTENTE DE RÉCEPTION</span>') : '—'}</span></div>
      ${rec && rec.date ? `<div class="kv"><span>Date de réception</span><span>${fmtD(rec.date)}</span></div><div class="kv"><span>Observations</span><span>${esc(rec.observations||'—')}</span></div>` : ''}
    </div>` : ''}

    ${r.statut === 'cloturee' ? `<div class="chosen-banner">🏁 ✓ ACHAT TERMINÉ — demande clôturée avec succès.</div>` : ''}

    <div class="card"><h2>🕘 Historique de la demande</h2>${timelineHTML(r)}</div>`;
  }

  /* ---------- Validation (responsable) ---------- */
  function decideRequest(id, decision, motif){
    const r = byId(DB.requests, id);
    if (!r || r.statut !== 'en_attente') { toast('Cette demande ne peut plus être validée.', 'warn'); return; }
    r.validation = { decision, par: sessionUser.nom, date: nowISO(), motif: motif || '' };
    if (decision === 'Approuvée') {
      r.statut = 'approuvee';
      pushHist(r, 'Demande approuvée par ' + sessionUser.nom);
      notify(r.demandeurId, `✅ Votre demande ${r.numero} a été approuvée.`);
      toast('Demande ' + r.numero + ' approuvée ✅', 'ok');
    } else if (decision === 'Refusée') {
      r.statut = 'refusee';
      pushHist(r, 'Demande refusée par ' + sessionUser.nom + (motif ? ' — Motif : ' + motif : ''));
      notify(r.demandeurId, `❌ Votre demande ${r.numero} a été refusée.`);
      toast('Demande ' + r.numero + ' refusée.', 'warn');
    } else {
      r.statut = 'modification';
      pushHist(r, 'Modification demandée par ' + sessionUser.nom + (motif ? ' — ' + motif : ''));
      notify(r.demandeurId, `⚠ Votre demande ${r.numero} nécessite une modification.`);
      toast('Modification demandée pour ' + r.numero + '.', 'warn');
    }
    saveDB(); closeModal(); render();
  }

  /* ============================= 9. ASSISTANT NOUVELLE DEMANDE (5 ÉTAPES) =============================
     Étape 1 : Informations + articles        Étape 4 : Choix du fournisseur + justification
     Étape 2 : Sélection des fournisseurs     Étape 5 : Récapitulatif + soumission
     Étape 3 : Comparaison des prix                                                     */
  let draft = null;

  function nextNumero(prefix, counter){
    return prefix + '-' + new Date().getFullYear() + '-' + String(counter).padStart(5, '0');
  }
  function startNewDraft(){
    DB.meta.achCounter = (DB.meta.achCounter || 0) + 1;
    draft = {
      id: uid('r'), numero: nextNumero('ACH', DB.meta.achCounter), date: nowISO(),
      demandeurId: sessionUser.id, service: sessionUser.service || '', priorite: 'Moyenne', motif: '',
      articles: [],
      supplierIds: [], offers: {}, chosenSupplierId: null, justification: '',
      statut: 'brouillon', step: 1, history: [{date: nowISO(), ev: 'Demande créée'}]
    };
    saveDraft();
  }
  function saveDraft(){
    if (!draft) return;
    const i = DB.requests.findIndex(r => r.id === draft.id);
    if (i >= 0) DB.requests[i] = draft; else DB.requests.push(draft);
    saveDB();
  }
  function resumeRequest(id){
    const r = byId(DB.requests, id);
    if (!r) return;
    draft = clone(r);
    if (r.statut === 'modification') draft.step = 1;
    else if (!draft.step) draft.step = r.chosenSupplierId ? 6 : ((r.offers && Object.values(r.offers).some(o => o.prixArticles && Object.values(o.prixArticles).some(v => +v > 0))) ? 4 : (r.supplierIds.length ? 3 : 2));
    go('nouvelleDemande', {resume: true});
  }

  const WIZ_STEPS = ['Informations','Fournisseurs','Prix négociés','Comparaison','Choix','Récapitulatif'];

  function renderWizard(){
    if (!draft) startNewDraft();
    const step = draft.step || 1;
    const stepper = '<div class="stepper">' + WIZ_STEPS.map((s,i) =>
      `<div class="stp ${i+1===step?'active':(i+1<step?'ok':'')}">${i+1}. ${s}</div>`).join('') + '</div>';
    let body = '', foot = '';
    if (step === 1) { body = wizStep1(); foot = `
        <button class="btn outline" data-act="wiz-savequit">💾 Enregistrer le brouillon</button>
        <button class="btn primary" data-act="wiz-next">Continuer → Sélection des fournisseurs</button>`; }
    else if (step === 2) { body = wizStep2(); foot = `
        <div><button class="btn outline" data-act="wiz-back">← Retour</button></div>
        <button class="btn primary" data-act="wiz-next">Continuer → Saisie des prix négociés</button>`; }
    else if (step === 3) { body = wizStep3(); foot = `
        <div><button class="btn outline" data-act="wiz-back">← Retour</button></div>
        <button class="btn primary" data-act="wiz-next">Voir la comparaison →</button>`; }
    else if (step === 4) { body = wizStep4(); foot = `
        <div><button class="btn outline" data-act="wiz-back">← Retour (modifier les prix)</button></div>
        <button class="btn primary" data-act="wiz-next">Continuer vers le choix →</button>`; }
    else if (step === 5) { body = wizStep5(); foot = `
        <div><button class="btn outline" data-act="wiz-back">← Retour</button></div>
        <button class="btn success" data-act="wiz-next">✓ Confirmer le choix</button>`; }
    else { body = wizStep6(); foot = `
        <button class="btn outline" data-act="print-request" data-id="${draft ? draft.id : ''}">🖨️ Imprimer la fiche</button>
        <button class="btn outline" data-act="wiz-goto" data-step="1">✏️ Modifier</button>
        <button class="btn success" data-act="submit-request">📤 Soumettre pour validation</button>`; }
    $('#page-content').innerHTML = `
      <div class="card">
        <h2>📝 ${esc(draft.numero)} — Nouvelle demande
          <span class="h-actions"><button class="btn outline sm" data-act="wiz-savequit">💾 Enregistrer et quitter</button></span>
        </h2>${stepper}${body}<div class="wiz-foot">${foot}</div>
      </div>`;
  }

  /* ---------- Étape 1 : articles demandés, quantités, coût présumé, somme globale ---------- */
  function wizStep1(){
    const info = `
      <div class="form-grid">
        <div class="field"><label>Numéro (automatique)</label><input readonly value="${esc(draft.numero)}"></div>
        <div class="field"><label>Date</label><input readonly value="${fmtDT(draft.date)}"></div>
        <div class="field"><label>Demandeur</label><input readonly value="${esc(sessionUser.nom)}"></div>
        <div class="field"><label>Service</label><input id="f-service" value="${esc(draft.service)}" placeholder="ex : DSI"></div>
        <div class="field"><label>Priorité</label>
          <select id="f-priorite">${['Basse','Moyenne','Haute','Urgente'].map(p=>`<option ${draft.priorite===p?'selected':''}>${p}</option>`).join('')}</select>
        </div>
        <div class="field form-full"><label>Motif de la demande (facultatif)</label>
          <textarea id="f-motif" placeholder="Ex : Achat de 10 ordinateurs pour le nouveau projet…">${esc(draft.motif)}</textarea>
        </div>
      </div>`;
    const arts = draft.articles.map((a,i) => `
      <tr>
        <td style="min-width:240px"><input data-ai="${i}" data-af="designation" value="${esc(a.designation)}" placeholder="Article demandé (ex : Écran TV 55&quot;)"></td>
        <td style="width:90px"><input type="number" min="1" data-ai="${i}" data-af="quantite" value="${esc(a.quantite)}"></td>
        <td style="width:160px"><input type="number" min="0" step="1000" data-ai="${i}" data-af="prix" value="${esc(a.prix)}" placeholder="Coût présumé"></td>
        <td class="art-total" data-arttotal="${i}">${fmtM((+a.quantite||0)*(+a.prix||0))}</td>
        <td><button class="icon-mini" title="Supprimer la ligne" data-act="del-article" data-id="${i}">🗑️</button></td>
      </tr>`).join('');
    return info + `
      <h2 style="margin:18px 0 10px;font-size:14.5px">🛒 Articles demandés</h2>
      <div class="actions-bar" style="margin-bottom:10px">
        <button class="btn primary sm" data-act="add-article">＋ Ajouter un article</button>
      </div>
      <div class="art-scroll"><table class="art">
        <tr><th>Article</th><th>Quantité</th><th>Coût présumé unitaire (FCFA)</th><th>Total ligne</th><th></th></tr>
        ${arts || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:18px">Aucun article — cliquez sur « ＋ Ajouter un article ».</td></tr>'}
      </table></div>
      <div class="total-est"><span class="lbl">SOMME GLOBALE PRÉSUMÉE</span><b data-art-grand>${fmtM(totalEstimatif(draft))}</b></div>`;
  }

  function collectStep1(silent){
    draft.service = ($('#f-service')?.value || '').trim();
    draft.priorite = $('#f-priorite')?.value || 'Moyenne';
    draft.motif = ($('#f-motif')?.value || '').trim();
    $$('.art input[data-ai]').forEach(inp => {
      const a = draft.articles[+inp.dataset.ai]; if (!a) return;
      const f = inp.dataset.af;
      a[f] = (f === 'quantite' || f === 'prix') ? (+inp.value || 0) : inp.value;
    });
    if (!silent){
      if (!draft.articles.length) { toast('Ajoutez au moins un article.', 'warn'); return false; }
      if (draft.articles.some(a => !a.designation.trim() || +a.quantite < 1)) {
        toast('Chaque article doit avoir une désignation et une quantité ≥ 1 (le coût présumé est facultatif).', 'warn'); return false;
      }
    }
    return true;
  }

  /* ---------- Étape 2 : sélection des fournisseurs et de leurs coordonnées ---------- */
  let wizSupQ = '';
  function waLink(w){ const d = String(w || '').replace(/\D/g, ''); return d ? 'https://wa.me/' + d : ''; }
  function wizStep2(){
    return `
    <div class="toolbar">
      <input type="search" class="search" id="wiz-sup-q" placeholder="🔎 Rechercher un fournisseur (nom, références, emplacement…)" value="${esc(wizSupQ)}">
    </div>
    <p class="text-muted small" style="margin-bottom:10px">Sélectionnez les fournisseurs à consulter — leurs <b>coordonnées</b> (WhatsApp 💬, site internet 🌐) vous permettront de les contacter pour obtenir leurs prix.</p>
    <div id="wiz-sup-list">${wizSupplierList()}</div>
    <p class="text-muted small" style="margin-top:10px" id="selcount"></p>`;
  }
  function wizSupplierList(){
    const q = norm(wizSupQ);
    const list = DB.suppliers.filter(s => s.statut === 'Actif')
      .filter(s => !q || [s.nom, s.references, s.emplacement, s.whatsapp, s.site].some(v => norm(v).includes(q)))
      .sort((a, b) => a.nom.localeCompare(b.nom));
    const selN = draft.supplierIds.length;
    requestAnimationFrame(() => { const el = $('#selcount'); if (el) el.innerHTML = `<b>${selN}</b> fournisseur(s) sélectionné(s) — la procédure en recommande au moins <b>3</b> (facultatif).`; });
    if (!list.length) return '<div class="empty">Aucun fournisseur actif ne correspond à cette recherche.</div>';
    return `<div class="pick-list">${list.map(s => {
      const wa = waLink(s.whatsapp);
      return `<label class="pick-item ${draft.supplierIds.includes(s.id)?'sel':''}">
        <input type="checkbox" data-sid="${s.id}" ${draft.supplierIds.includes(s.id)?'checked':''}>
        <div><b>${esc(s.nom)}</b>
        <div class="meta">📍 ${esc(s.emplacement || '—')}</div>
        <div class="meta">💬 ${esc(s.whatsapp || '—')}</div>
        <div class="meta">🌐 ${esc(s.site || '—')}</div>
        ${s.references ? `<div class="meta">📋 ${esc(s.references)}</div>` : ''}
        ${wa ? `<a href="${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:inline-block;margin-top:4px;color:#16a34a;font-size:11px;font-weight:800;text-decoration:none">💬 Contacter sur WhatsApp</a>` : ''}
        </div>
      </label>`;
    }).join('')}</div>`;
  }

  /* ---------- Étape 3 : saisie des nouveaux prix négociés (après appel des fournisseurs) ---------- */
  function wizStep3(){
    draft.supplierIds.forEach(sid => {
      if (!draft.offers[sid]) draft.offers[sid] = {prixArticles:{}, delai:0, garantie:0, paiement:'', observations:''};
      else if (!draft.offers[sid].prixArticles) draft.offers[sid].prixArticles = {};
    });
    return `<p class="text-muted small" style="margin-bottom:10px">📞 <b>Appelez chaque fournisseur</b> (WhatsApp 💬 / site 🌐 — coordonnées à l'étape 2) et négociez <b>chaque article séparément</b>. Reportez les prix obtenus ci-dessous.</p>`
      + negotiationHTML(draft);
  }

  /* ---------- Étape 4 : comparaison des différents éléments des fournisseurs ---------- */
  function wizStep4(){
    return `<p class="text-muted small" style="margin-bottom:10px">⚖️ Comparaison automatique des offres négociées : <b>prix par article, totaux, délais, garanties et conditions de paiement</b>. Les meilleures offres sont surlignées en vert.</p>`
      + comparisonHTML(draft, false);
  }

  /* ---------- Étape 5 : choix du fournisseur ---------- */
  function wizStep5(){
    const cards = draft.supplierIds.map(sid => {
      const o = draft.offers[sid] || {};
      const chosen = draft.chosenSupplierId === sid;
      const t = calcOfferTotal(draft, o);
      const ec = totalEstimatif(draft);
      return `<div class="choice-card ${chosen?'chosen':''}">
        <h4>${esc(suppName(sid))}</h4>
        <div class="row"><span>💰 Total négocié</span><span>${t ? fmtM(t) : '—'}</span></div>
        ${ec ? `<div class="row"><span>📈 vs coût présumé</span><span style="color:${t && t <= ec ? 'var(--green)' : 'var(--red)'}">${t ? (t <= ec ? '− ' : '+ ') + fmtM(Math.abs(ec - t)) : '—'}</span></div>` : ''}
        <div class="row"><span>🚚 Livraison</span><span>${fmtDel(o.delai)}</span></div>
        <div class="row"><span>🛡️ Garantie</span><span>${fmtGar(o.garantie)}</span></div>
        <div class="row"><span>💳 Paiement</span><span>${esc(o.paiement || '—')}</span></div>
        <div style="margin:6px 0 10px">${chipsFor(draft, sid)}</div>
        <button class="btn ${chosen?'success':'primary'}" style="width:100%;justify-content:center" data-act="pick-supplier" data-id="${sid}">
          ${chosen?'✓ FOURNISSEUR RETENU':'Sélectionner'}
        </button>
      </div>`;
    }).join('');
    const best = meilleureOffre(draft);
    const reco = best ? `<div class="chosen-banner" style="background:var(--purple-bg);border-color:var(--purple);color:#4c1d95">
        🏆 <b>Recommandation : ${esc(suppName(best.sid))}</b> — meilleur score global (<b>${best.note}/100</b>) pour un coût total rendu de <b>${fmtM(best.total)}</b>
        ${draft.chosenSupplierId === best.sid ? '<span class="badge b-green" style="margin-left:8px">DÉJÀ RETENU</span>'
          : `<button class="btn sm primary" style="margin-left:auto" data-act="nego-pickbest">⭐ Retenir le mieux noté</button>`}
      </div>` : '';
    return `${reco}${draft.chosenSupplierId ? `<div class="chosen-banner">✅ Fournisseur retenu : ${esc(suppName(draft.chosenSupplierId))}</div>` : '<p class="text-muted small" style="margin-bottom:10px">Sélectionnez le fournisseur retenu — une seule sélection possible.</p>'}
    <div class="choice-grid">${cards}</div>
    <div class="field mt"><label>Justification du choix *</label>
      <textarea id="wiz-justif" placeholder="Ex : Offre retenue en raison du meilleur rapport qualité/prix et des conditions de paiement proposées.">${esc(draft.justification)}</textarea>
    </div>`;
  }

  /* ---------- Étape 6 : récapitulatif ---------- */
  function wizStep6(){
    const offer = draft.offers[draft.chosenSupplierId] || {};
    const t = calcOfferTotal(draft, offer);
    return `
    <div class="grid2">
      <div>
        <div class="kv"><span>Demande</span><span>${esc(draft.numero)}</span></div>
        <div class="kv"><span>Demandeur</span><span>${esc(sessionUser.nom)} — ${esc(draft.service||'')}</span></div>
        <div class="kv"><span>Priorité</span><span>${esc(draft.priorite)}</span></div>
        <div class="kv"><span>Besoin</span><span>${esc(draft.motif || '— (motif facultatif non renseigné)')}</span></div>
        <div class="table-wrap mt"><table class="tbl" style="min-width:440px">
          <tr><th>Article</th><th class="num">Qté</th><th class="num">Coût présumé</th><th class="num">Prix négocié</th><th class="num">Total</th></tr>
          ${draft.articles.map((a,i)=>{ const pn = +((offer.prixArticles||{})[i]) || 0;
            return `<tr><td>${esc(a.designation)}</td><td class="num">${a.quantite}</td><td class="num">${fmtM(a.prix)}</td><td class="num">${pn ? fmtM(pn) : '—'}</td><td class="num">${pn ? fmtM(pn * (+a.quantite||0)) : '—'}</td></tr>`; }).join('')}
        </table></div>
        <div class="kv"><span>Somme globale présumée</span><span>${fmtM(totalEstimatif(draft))}</span></div>
        <div class="kv"><span>Montant négocié retenu</span><span style="color:var(--green);font-weight:800">${t ? fmtM(t) : '—'}</span></div>
      </div>
      <div>
        <div class="kv"><span>Fournisseurs consultés</span><span>${draft.supplierIds.length} fournisseurs</span></div>
        ${draft.supplierIds.map(sid=>{ const s = byId(DB.suppliers, sid) || {}; return `<div class="kv"><span></span><span>• ${esc(suppName(sid))}<div class="cell-sub">💬 ${esc(s.whatsapp||'—')} · 🌐 ${esc(s.site||'—')}</div></span></div>`; }).join('')}
        <div class="kv"><span>Fournisseur choisi</span><span>${esc(suppName(draft.chosenSupplierId))}</span></div>
        <div class="kv"><span>Justification</span><span>${esc(draft.justification||'—')}</span></div>
      </div>
    </div>
    <div class="card" style="margin:14px 0 0"><h2>⚖️ Comparaison négociée des offres</h2>${comparisonHTML(draft, false)}</div>`;
  }

  /* ---------- Export de la grille de comparaison (Excel / CSV) ---------- */
  function comparaisonRows(r){
    const sids = r.supplierIds || [], off = r.offers || {};
    const rowsArt = (r.articles || []).map((a, i) => {
      const row = { ARTICLE: a.designation, 'QUANTITÉ': +a.quantite || 0, 'COÛT PRÉSUMÉ UNITAIRE': +a.prix || 0 };
      let best = null, bestSid = null;
      sids.forEach(sid => {
        const p = +(((off[sid] || {}).prixArticles || {})[i]) || 0;
        row[suppName(sid) + ' (unitaire)'] = p || '';
        if (p && (best === null || p < best)){ best = p; bestSid = sid; }
      });
      row['MEILLEUR PRIX UNITAIRE'] = best === null ? '' : best;
      row['MEILLEUR FOURNISSEUR'] = bestSid ? suppName(bestSid) : '';
      row['ÉCART vs PRÉSUMÉ (%)'] = (best && +a.prix) ? Math.round((+a.prix - best) / +a.prix * 100) : '';
      return row;
    });
    const sc = scoresOffres(r), rangs = classementOffres(r);
    const rowsSyn = sids.map(sid => {
      const o = off[sid] || {}, b = calcOfferBreakdown(r, o), x = sc[sid];
      return {
        FOURNISSEUR: suppName(sid),
        'OFFRE COMPLÈTE': offreComplete(r, o) ? 'Oui' : 'Non',
        'TOTAL ARTICLES (FCFA)': b.brut, 'REMISE (%)': b.remisePct || '', 'NET HT (FCFA)': b.netHT,
        'TVA (FCFA)': b.tva, 'FRAIS LIVRAISON (FCFA)': b.fraisLivraison || '',
        'COÛT TOTAL RENDU (FCFA)': b.total, 'ÉCART vs PRÉSUMÉ (FCFA)': (b.total && totalEstimatif(r)) ? totalEstimatif(r) - b.total : '',
        'DÉLAI (jours)': +o.delai || '', 'GARANTIE (années)': +o.garantie || '', 'PAIEMENT': o.paiement || '',
        'SCORE /100': x ? x.note : '', RANG: rangs[sid] || ''
      };
    });
    return { rowsArt, rowsSyn };
  }
  function exportComparaison(r){
    const { rowsArt, rowsSyn } = comparaisonRows(r);
    if (!rowsArt.length && !rowsSyn.length){ toast('Rien à exporter.', 'warn'); return; }
    const nom = 'comparaison_' + (r.numero || 'demande');
    if (typeof XLSX === 'undefined'){
      const csv = (rows) => { const h = Object.keys(rows[0]); return [h.join(';')].concat(rows.map(x => h.map(c => String(x[c] ?? '').replace(/;/g, ',')).join(';'))).join('\n'); };
      dlFile(nom + '.csv', '\ufeff' + csv(rowsArt) + '\n\n' + csv(rowsSyn), 'text/csv;charset=utf-8');
      toast('📄 Export CSV (Excel indisponible) : comparaison exportée.', 'ok'); return;
    }
    const wb = XLSX.utils.book_new();
    if (rowsArt.length){ XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsArt), 'Comparaison articles'); }
    if (rowsSyn.length){ XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsSyn), 'Synthèse offres'); }
    XLSX.writeFile(wb, nom + '.xlsx');
    toast('📊 Export Excel : comparaison exportée ✅', 'ok');
  }

  /* ---------- Outils de saisie assistée (étape 3) ---------- */
  function negoPrefill(){
    if (!draft) return;
    let n = 0;
    draft.supplierIds.forEach(sid => {
      draft.offers[sid] = draft.offers[sid] || {prixArticles:{}, delai:0, garantie:0, paiement:'', observations:'', remise:0, fraisLivraison:0};
      draft.offers[sid].prixArticles = draft.offers[sid].prixArticles || {};
      draft.articles.forEach((a, i) => {
        if (!+draft.offers[sid].prixArticles[i]){ draft.offers[sid].prixArticles[i] = +a.prix || 0; n++; }
      });
    });
    saveDraft(); renderWizard();
    toast(n ? n + ' prix pré-remplis avec le coût présumé ✅' : 'Toutes les cases étaient déjà renseignées.', n ? 'ok' : 'warn');
  }
  function negoCopyRows(){
    if (!draft) return;
    let n = 0;
    draft.articles.forEach((a, i) => {
      const ref = draft.supplierIds.map(sid => +(((draft.offers[sid] || {}).prixArticles || {})[i]) || 0).find(v => v > 0);
      if (!ref) return;
      draft.supplierIds.forEach(sid => {
        draft.offers[sid] = draft.offers[sid] || {prixArticles:{}, delai:0, garantie:0, paiement:'', observations:'', remise:0, fraisLivraison:0};
        draft.offers[sid].prixArticles = draft.offers[sid].prixArticles || {};
        if (+draft.offers[sid].prixArticles[i] !== ref){ draft.offers[sid].prixArticles[i] = ref; n++; }
      });
    });
    saveDraft(); renderWizard();
    toast(n ? n + ' prix recopiés par ligne ✅' : 'Aucun prix de référence à recopier.', n ? 'ok' : 'warn');
  }
  function negoCopyRow(i){
    if (!draft) return;
    const ref = draft.supplierIds.map(sid => +(((draft.offers[sid] || {}).prixArticles || {})[i]) || 0).find(v => v > 0);
    if (!ref){ toast('Saisissez d\'abord un prix sur cette ligne.', 'warn'); return; }
    draft.supplierIds.forEach(sid => {
      draft.offers[sid] = draft.offers[sid] || {prixArticles:{}, delai:0, garantie:0, paiement:'', observations:'', remise:0, fraisLivraison:0};
      draft.offers[sid].prixArticles = draft.offers[sid].prixArticles || {};
      draft.offers[sid].prixArticles[i] = ref;
    });
    saveDraft(); renderWizard();
    toast('Prix recopié sur tous les fournisseurs ✅', 'ok');
  }
  function negoClear(){
    if (!draft) return;
    confirmModal('Effacer <b>tous les prix négociés</b> de cette demande ?<br><span class="text-muted small">Les délais, garanties et conditions sont conservés.</span>', () => {
      draft.supplierIds.forEach(sid => { if (draft.offers[sid]) draft.offers[sid].prixArticles = {}; });
      saveDraft(); renderWizard(); toast('Prix négociés effacés 🧹', 'ok');
    }, 'Effacer les prix');
  }
  function negoPickBest(){
    if (!draft) return;
    const best = meilleureOffre(draft);
    if (!best){ toast('Aucune offre complète à évaluer.', 'warn'); return; }
    draft.chosenSupplierId = best.sid;
    saveDraft(); renderWizard();
    toast('Fournisseur retenu : ' + suppName(best.sid) + ' (score ' + best.note + '/100) ⭐', 'ok');
  }

  /* ---------- Soumission ---------- */
  function submitRequest(){
    if (!draft) return;
    const nbPrix = (draft.articles || []).filter((a, i) =>
      (draft.supplierIds || []).some(sid => +(((draft.offers || {})[sid] || {}).prixArticles || {})[i] > 0)).length;
    if (!draft.chosenSupplierId || !nbPrix){
      toast('Attention : demande soumise sans fournisseur retenu et/ou sans prix — elle reste valide.', 'warn');
    }
    draft.statut = 'en_attente';
    draft.submittedAt = nowISO();
    delete draft.step;
    pushHist(draft, 'Demande soumise pour validation');
    saveDraft();
    notifyRole('responsable', `🔔 Nouvelle demande ${draft.numero} à valider.`);
    toast('Demande ' + draft.numero + ' soumise pour validation ✅', 'ok');
    const numero = draft.numero; draft = null;
    go(hasPermission('viewOwnRequests') ? 'mesDemandes' : 'toutesDemandes');
  }

  /* ============================= 12. COMMANDES & RÉCEPTIONS ============================= */
  function viewCreateOrder(requestId){
    const r = byId(DB.requests, requestId);
    if (!r || r.statut !== 'approuvee') return '<div class="card empty">Cette demande n\'est pas prête pour une commande (elle doit être approuvée).</div>';
    if (!hasPermission('createOrder')) return '<div class="card empty">Accès refusé.</div>';
    const offer = (r.offers || {})[r.chosenSupplierId] || {};
    let order = DB.orders.find(o => o.requestId === r.id);
    if (!order) {
      DB.meta.bcCounter = (DB.meta.bcCounter || 0) + 1;
      order = {
        id: uid('o'), numero: nextNumero('BC', DB.meta.bcCounter), requestId: r.id,
        supplierId: r.chosenSupplierId, date: nowISO(), total: calcOfferTotal(r, offer) || totalEstimatif(r),
        delai: offer.delai ? fmtDel(offer.delai) : '—', statut: 'À confirmer',
        lignes: (r.articles || []).map((a, i) => ({designation: a.designation, quantite: +a.quantite, prix: +(((offer.prixArticles || {})[i] ?? a.prix) || 0)}))
      };
      DB.orders.push(order); saveDB();
    }
    const supp = byId(DB.suppliers, order.supplierId);
    return `
    <div class="card">
      <h2>🛒 Création de la commande — ${esc(order.numero)}
        ${order.statut==='À confirmer'?'<span class="badge b-amber">À CONFIRMER</span>':'<span class="badge b-blue">COMMANDE PASSÉE</span>'}
        <span class="h-actions"><button class="btn outline sm" data-act="view-request" data-id="${r.id}" data-nav="mesDemandes">← Demande ${esc(r.numero)}</button></span>
      </h2>
      <div class="grid2">
        <div>
          <div class="kv"><span>Numéro de demande</span><span>${esc(r.numero)}</span></div>
          <div class="kv"><span>Fournisseur choisi</span><span>${esc(suppName(order.supplierId))}</span></div>
          <div class="kv"><span>Délai de livraison</span><span>${esc(order.delai)}</span></div>
          <div class="kv"><span>Conditions de paiement</span><span>${esc(offer.paiement || '—')}</span></div>
        </div>
        <div>
          <div class="kv"><span>Demandeur</span><span>${esc(userName(r.demandeurId))}</span></div>
          <div class="kv"><span>Service</span><span>${esc(r.service||'—')}</span></div>
          <div class="kv"><span>Garantie</span><span>${fmtGar(offer.garantie)}</span></div>
        </div>
      </div>
      <div class="table-wrap mt"><table class="tbl" style="min-width:520px">
        <tr><th>Produit</th><th class="num">Quantité</th><th class="num">Coût présumé</th><th class="num">Total</th></tr>
        ${order.lignes.map(l=>`<tr><td>${esc(l.designation)}</td><td class="num">${l.quantite}</td><td class="num">${fmtM(l.prix)}</td><td class="num">${fmtM(l.quantite*l.prix)}</td></tr>`).join('')}
      </table></div>
      <div class="total-est"><span class="lbl">MONTANT DE LA COMMANDE (offre retenue)</span><b>${fmtM(order.total)}</b></div>
      <div class="actions-bar">
        ${order.statut==='À confirmer' ? `<button class="btn success" data-act="confirm-order" data-id="${order.id}">✓ Confirmer la commande</button>` : '<span class="badge b-blue">COMMANDE PASSÉE</span>'}
      </div>
    </div>`;
  }

  function confirmOrder(orderId){
    const o = byId(DB.orders, orderId);
    if (!o || o.statut !== 'À confirmer') return;
    o.statut = 'Confirmée';
    const r = byId(DB.requests, o.requestId);
    if (r) {
      r.statut = 'commandee';
      pushHist(r, 'Commande ' + o.numero + ' créée');
      notify(r.demandeurId, `📦 Votre commande ${o.numero} a été créée.`);
      notify(r.demandeurId, `🚚 Votre commande ${o.numero} est prête à être réceptionnée.`);
    }
    if (!DB.receptions.find(x => x.orderId === o.id)) {
      DB.receptions.push({ id:uid('rec'), orderId:o.id, date:null, observations:'', statut:'En attente',
        lignes:o.lignes.map(l => ({designation:l.designation, qteCommandee:+l.quantite, qteRecue:0})) });
    }
    saveDB();
    toast('✓ Commande ' + o.numero + ' confirmée — statut : COMMANDE PASSÉE', 'ok');
    go('commandes');
  }

  function viewOrders(){
    const isDem = sessionUser.role === 'demandeur';
    let orders = DB.orders.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    if (isDem) orders = orders.filter(o => { const r = byId(DB.requests, o.requestId); return r && r.demandeurId === sessionUser.id; });
    if (!orders.length) return `<div class="card"><h2>📦 ${isDem?'Mes commandes':'Commandes'}</h2><div class="empty">Aucune commande pour le moment.<br>Les commandes apparaissent après validation d'une demande.</div></div>`;
    return `<div class="card"><h2>📦 ${isDem?'Mes commandes':'Commandes'}<span class="h-actions"><button class="btn outline sm" data-act="export-orders">📊 Exporter Excel</button><button class="btn outline sm" data-act="export-pdf-orders">📄 PDF</button></span></h2>
    <div class="table-wrap"><table class="tbl">
      <tr><th>Numéro</th><th>Demande</th><th>Fournisseur</th><th>Date</th><th class="num">Montant</th><th>Délai</th><th>Statut</th><th>Actions</th></tr>
      ${orders.map(o => {
        const r = byId(DB.requests, o.requestId);
        const rec = DB.receptions.find(x => x.orderId === o.id);
        const canRec = hasPermission('recordReception') && o.statut === 'Confirmée' && rec && rec.statut !== 'Complète' && (sessionUser.role === 'admin' || (r && r.demandeurId === sessionUser.id));
        return `<tr>
          <td class="cell-main">${esc(o.numero)}</td>
          <td>${r?esc(r.numero):'—'}</td>
          <td>${esc(suppName(o.supplierId))}</td>
          <td>${fmtD(o.date)}</td>
          <td class="num">${fmtM(o.total)}</td>
          <td>${esc(o.delai)}</td>
          <td>${o.statut==='Confirmée'?'<span class="badge b-blue">COMMANDE PASSÉE</span>':'<span class="badge b-amber">À CONFIRMER</span>'}</td>
          <td><div class="actions-bar" style="margin:0">
            <button class="btn sm outline" data-act="view-order" data-id="${o.id}">Voir</button>
            ${canRec?`<button class="btn sm primary" data-act="open-reception" data-id="${o.id}">🚚 Réceptionner</button>`:''}
            ${o.statut==='Confirmée'?`<button class="icon-mini" title="Imprimer le bon de commande" data-act="print-order" data-id="${o.id}">🖨️</button>`:''}
            ${estAdmin()?`<button class="icon-mini" title="Supprimer la commande" data-act="delete-order" data-id="${o.id}">🗑️</button>`:''}
          </div></td>
        </tr>`;
      }).join('')}
    </table></div></div>`;
  }

  function viewOrderModal(orderId){
    const o = byId(DB.orders, orderId); if (!o) return;
    const r = byId(DB.requests, o.requestId);
    const rec = DB.receptions.find(x => x.orderId === o.id);
    const canRec = hasPermission('recordReception') && o.statut === 'Confirmée' && rec && rec.statut !== 'Complète' && (sessionUser.role === 'admin' || (r && r.demandeurId === sessionUser.id));
    modal('📦 Commande ' + o.numero, `
      <div class="kv"><span>Demande liée</span><span>${r?esc(r.numero):'—'}</span></div>
      <div class="kv"><span>Fournisseur</span><span>${esc(suppName(o.supplierId))}</span></div>
      <div class="kv"><span>Date</span><span>${fmtDT(o.date)}</span></div>
      <div class="kv"><span>Délai de livraison</span><span>${esc(o.delai)}</span></div>
      <div class="kv"><span>Statut</span><span>${o.statut==='Confirmée'?'COMMANDE PASSÉE':'À CONFIRMER'}</span></div>
      <div class="kv"><span>Réception</span><span>${rec ? rec.statut : '—'}</span></div>
      <div class="table-wrap mt"><table class="tbl" style="min-width:420px">
        <tr><th>Produit</th><th class="num">Qté</th><th class="num">PU</th><th class="num">Total</th></tr>
        ${o.lignes.map(l=>`<tr><td>${esc(l.designation)}</td><td class="num">${l.quantite}</td><td class="num">${fmtM(l.prix)}</td><td class="num">${fmtM(l.quantite*l.prix)}</td></tr>`).join('')}
      </table></div>
      <div class="total-est"><span class="lbl">MONTANT</span><b>${fmtM(o.total)}</b></div>`,
      [{label:'Fermer', cls:'outline'},
       {label:'🖨️ Imprimer', cls:'outline', act:()=>{ printOrder(orderId); }},
       ...(canRec ? [{label:'🚚 Réceptionner', cls:'primary', act:()=>{ closeModal(); openReception(orderId); }}] : [])], true);
  }

  /* ---------- Réceptions ---------- */
  function viewReceptions(){
    const isDem = sessionUser.role === 'demandeur';
    let recs = DB.receptions.slice();
    if (isDem) recs = recs.filter(rc => { const o = byId(DB.orders, rc.orderId); const r = o && byId(DB.requests, o.requestId); return r && r.demandeurId === sessionUser.id; });
    if (!recs.length) return `<div class="card"><h2>🚚 ${isDem?'Mes réceptions':'Réceptions'}</h2><div class="empty">Aucune réception enregistrée.</div></div>`;
    recs.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    return `<div class="card"><h2>🚚 ${isDem?'Mes réceptions':'Réceptions'}<span class="h-actions"><button class="btn outline sm" data-act="export-receptions">📊 Exporter Excel</button><button class="btn outline sm" data-act="export-pdf-receptions">📄 PDF</button></span></h2>
    <div class="table-wrap"><table class="tbl">
      <tr><th>Commande</th><th>Demande</th><th>Fournisseur</th><th>Reçu / Commandé</th><th>Date</th><th>Statut</th><th>Actions</th></tr>
      ${recs.map(rc => {
        const o = byId(DB.orders, rc.orderId); const r = o ? byId(DB.requests, o.requestId) : null;
        const totC = rc.lignes.reduce((s,l)=>s+(+l.qteCommandee||0),0);
        const totR = rc.lignes.reduce((s,l)=>s+(+l.qteRecue||0),0);
        const canRec = hasPermission('recordReception') && rc.statut !== 'Complète' && o && o.statut === 'Confirmée' && (sessionUser.role === 'admin' || (r && r.demandeurId === sessionUser.id));
        const st = rc.statut === 'Complète' ? '<span class="badge b-teal">✓ RÉCEPTION COMPLÈTE</span>' : rc.statut === 'Partielle' ? '<span class="badge b-purple">⚠ RÉCEPTION PARTIELLE</span>' : '<span class="badge b-amber">EN ATTENTE</span>';
        return `<tr>
          <td class="cell-main">${o?esc(o.numero):'—'}</td>
          <td>${r?esc(r.numero):'—'}</td>
          <td>${o?esc(suppName(o.supplierId)):'—'}</td>
          <td>${totR} / ${totC}</td>
          <td>${fmtD(rc.date)}</td>
          <td>${st}</td>
          <td><div class="actions-bar" style="margin:0">
          ${canRec?`<button class="btn sm primary" data-act="open-reception" data-id="${o.id}">${rc.statut==='Partielle'?'Compléter':'Enregistrer'}</button>`:''}
          ${estAdmin()?`<button class="icon-mini" title="Supprimer la réception" data-act="delete-reception" data-id="${rc.id}">🗑️</button>`:''}
        </div></td>
        </tr>`;
      }).join('')}
    </table></div></div>`;
  }

  function openReception(orderId){
    const o = byId(DB.orders, orderId); if (!o) return;
    const rc = DB.receptions.find(x => x.orderId === orderId); if (!rc) return;
    const today = new Date().toISOString().slice(0,10);
    modal('🚚 Réception de la commande ' + o.numero, `
      <div class="kv"><span>Fournisseur</span><span>${esc(suppName(o.supplierId))}</span></div>
      <div class="table-wrap mt"><table class="tbl" style="min-width:420px">
        <tr><th>Produit</th><th class="num">Quantité commandée</th><th class="num">Quantité reçue</th></tr>
        ${rc.lignes.map((l,i)=>`<tr>
          <td>${esc(l.designation)}</td>
          <td class="num">${l.qteCommandee}</td>
          <td class="num"><input type="number" min="0" max="${l.qteCommandee}" data-rl="${i}" value="${l.qteRecue||''}" style="width:90px;border:1.5px solid var(--border);border-radius:8px;padding:6px 8px;text-align:center"></td>
        </tr>`).join('')}
      </table></div>
      <div class="form-grid mt">
        <div class="field"><label>Date de réception</label><input type="date" id="rec-date" value="${rc.date ? rc.date.slice(0,10) : today}"></div>
        <div class="field form-full"><label>Observations</label><textarea id="rec-obs" placeholder="Ex : matériel conforme, emballage intact…">${esc(rc.observations||'')}</textarea></div>
      </div>`,
      [{label:'Annuler', cls:'outline'},
       {label:'✓ Enregistrer la réception', cls:'success', act:()=>saveReception(orderId)}]);
  }

  function saveReception(orderId){
    const rc = DB.receptions.find(x => x.orderId === orderId); if (!rc) return;
    rc.lignes.forEach((l,i) => { const inp = $(`[data-rl="${i}"]`); l.qteRecue = Math.max(0, Math.min(+l.qteCommandee, +((inp&&inp.value)||0))); });
    rc.date = ($('#rec-date')?.value || nowISO().slice(0,10)) + 'T12:00:00.000Z';
    rc.observations = ($('#rec-obs')?.value || '').trim();
    const o = byId(DB.orders, orderId);
    const r = o ? byId(DB.requests, o.requestId) : null;
    const complete = rc.lignes.every(l => +l.qteRecue >= +l.qteCommandee);
    const any = rc.lignes.some(l => +l.qteRecue > 0);
    if (!any) { toast('Renseignez au moins une quantité reçue.', 'warn'); return; }
    if (complete) {
      rc.statut = 'Complète';
      if (r) { r.statut = 'cloturee'; pushHist(r, 'Réception effectuée (complète)'); pushHist(r, 'Achat clôturé — ✓ ACHAT TERMINÉ');
               notify(r.demandeurId, `✅ Réception complète : la demande ${r.numero} est clôturée.`); }
      toast('✓ RÉCEPTION COMPLÈTE — la demande est clôturée 🏁', 'ok');
    } else {
      rc.statut = 'Partielle';
      if (r) { r.statut = 'reception_partielle'; pushHist(r, 'Réception partielle enregistrée');
               notify(r.demandeurId, `⚠ Réception partielle enregistrée pour ${o.numero}.`); }
      toast('⚠ RÉCEPTION PARTIELLE — vous pourrez compléter plus tard.', 'warn');
    }
    saveDB(); closeModal(); render();
  }

  /* ---------- Impression de la FICHE DE DEMANDE (sans prix ni fournisseur) ---------- */
  function printRequest(requestId){
    const r = byId(DB.requests, requestId); if (!r) return;
    const offer = (r.offers || {})[r.chosenSupplierId] || {};
    const lignes = (r.articles || []).map((a, i) => {
      const pn = +((offer.prixArticles || {})[i]) || 0;
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:6px">${esc(a.designation)}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${a.quantite}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${pn ? fmtM(pn) : ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${pn ? fmtM(pn * (+a.quantite || 0)) : ''}</td>
      </tr>`;
    }).join('');
    const total = (r.articles || []).reduce((s, a, i) => s + ((+((offer.prixArticles || {})[i]) || 0) * (+a.quantite || 0)), 0);
    $('#print-root').innerHTML = `
      <div style="text-align:center;border-bottom:3px solid #500070;padding-bottom:12px;margin-bottom:16px">
        ${logoImg('height:50px;width:auto;margin:0 auto 8px;display:block')}
        <div style="letter-spacing:3px;font-size:11px;color:#64748b">GESTION DES ACHATS — FICHE DE DEMANDE D'ACHAT</div>
      </div>
      <table style="width:100%;font-size:13px;margin-bottom:14px">
        <tr><td><b>Demande :</b> ${esc(r.numero)}</td><td style="text-align:right"><b>Date :</b> ${fmtD(r.date)}</td></tr>
        <tr><td><b>Demandeur :</b> ${esc(userName(r.demandeurId))}</td><td style="text-align:right"><b>Service :</b> ${esc(r.service || '—')}</td></tr>
        <tr><td><b>Priorité :</b> ${esc(r.priorite || '—')}</td><td style="text-align:right"><b>Fournisseur retenu :</b> ${esc(suppName(r.chosenSupplierId))}</td></tr>
      </table>
      <div style="font-size:12.5px;margin-bottom:12px"><b>Motif :</b> ${esc(r.motif || '—')}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <tr style="background:#f1e9f9">
          <th style="border:1px solid #cbd5e1;padding:6px;text-align:left">Désignation</th>
          <th style="border:1px solid #cbd5e1;padding:6px">Quantité</th>
          <th style="border:1px solid #cbd5e1;padding:6px">Prix unitaire</th>
          <th style="border:1px solid #cbd5e1;padding:6px">Total</th>
        </tr>
        ${lignes || '<tr><td colspan="4" style="border:1px solid #cbd5e1;padding:6px;text-align:center">Aucun article</td></tr>'}
        <tr><td colspan="3" style="border:1px solid #cbd5e1;padding:6px;text-align:right"><b>MONTANT TOTAL</b></td>
            <td style="border:1px solid #cbd5e1;padding:6px;text-align:right"><b>${total ? fmtM(total) : '—'}</b></td></tr>
      </table>
      <table style="width:100%;margin-top:45px;font-size:12.5px">
        <tr><td style="text-align:center">______________________<br>Le Demandeur</td><td style="text-align:center">______________________<br>Le Responsable</td></tr>
      </table>`;
    window.print();
  }

  /* ---------- Impression du bon de commande ---------- */
  function printOrder(orderId){
    const o = byId(DB.orders, orderId); if (!o) return;
    const r = byId(DB.requests, o.requestId);
    const supp = byId(DB.suppliers, o.supplierId);
    $('#print-root').innerHTML = `
      <div style="text-align:center;border-bottom:3px solid #500070;padding-bottom:12px;margin-bottom:16px">
        ${logoImg('height:50px;width:auto;margin:0 auto 8px;display:block')}
        <div style="letter-spacing:3px;font-size:11px;color:#64748b">GESTION DES ACHATS — BON DE COMMANDE</div>
      </div>
      <table style="width:100%;font-size:13px;margin-bottom:14px">
        <tr><td><b>Commande :</b> ${esc(o.numero)}</td><td style="text-align:right"><b>Date :</b> ${fmtD(o.date)}</td></tr>
        <tr><td><b>Demande :</b> ${r?esc(r.numero):'—'}</td><td style="text-align:right"><b>Demandeur :</b> ${r?esc(userName(r.demandeurId)):''}</td></tr>
        <tr><td><b>Fournisseur :</b> ${esc(suppName(o.supplierId))}</td><td style="text-align:right"><b>Délai :</b> ${esc(o.delai)}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <tr style="background:#f1e9f9"><th style="border:1px solid #cbd5e1;padding:6px;text-align:left">Produit</th><th style="border:1px solid #cbd5e1;padding:6px">Qté</th><th style="border:1px solid #cbd5e1;padding:6px">Prix unitaire</th><th style="border:1px solid #cbd5e1;padding:6px">Total</th></tr>
        ${o.lignes.map(l=>`<tr><td style="border:1px solid #cbd5e1;padding:6px">${esc(l.designation)}</td><td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${l.quantite}</td><td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${+l.prix ? fmtM(l.prix) : ''}</td><td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${+l.prix ? fmtM(l.quantite*l.prix) : ''}</td></tr>`).join('')}
        <tr><td colspan="3" style="border:1px solid #cbd5e1;padding:6px;text-align:right"><b>MONTANT TOTAL</b></td><td style="border:1px solid #cbd5e1;padding:6px;text-align:right"><b>${+o.total ? fmtM(o.total) : '—'}</b></td></tr>
      </table>
      <table style="width:100%;margin-top:50px;font-size:12.5px">
        <tr><td style="text-align:center">______________________<br>Le Responsable</td><td style="text-align:center">______________________<br>Le Fournisseur</td></tr>
      </table>`;
    window.print();
  }

  /* ============================= 10. FOURNISSEURS (catalogue fournisseurs) =============================
     Champs : FOURNISSEUR NOM · RÉFÉRENCES · EMPLACEMENT · WHATSAPP · SITE INTERNET (+ STATUT)   */
  let fSup = {q:'', statut:''};

  function waLink(w){ const d = String(w || '').replace(/\D/g, ''); return d ? 'https://wa.me/' + d : ''; }

  function viewSuppliers(){
    const admin = hasPermission('manageSuppliers');
    return `<div class="card"><h2>🏢 Fournisseurs
        ${admin ? `<span class="h-actions">
          <button class="btn outline sm" data-act="import-open">📥📤 Importer / Exporter</button>
          <button class="btn primary sm" data-act="supplier-add">＋ Ajouter un fournisseur</button>
        </span>` : ''}
      </h2>
      <p class="text-muted small" style="margin-bottom:12px">Catalogue des fournisseurs : coordonnées et informations nécessaires pour les contacter et comparer leurs offres.</p>
      <div class="toolbar">
        <input type="search" class="search" placeholder="🔎 Rechercher (nom, références, emplacement, WhatsApp…)" value="${esc(fSup.q)}" data-filter="sup-q">
        <select data-filter="sup-statut">
          <option value="">Tous les statuts</option>
          <option ${fSup.statut === 'Actif' ? 'selected' : ''}>Actif</option>
          <option ${fSup.statut === 'Inactif' ? 'selected' : ''}>Inactif</option>
        </select>
      </div>
      <span class="text-muted small" id="sup-count" style="display:none"></span>
      <div id="sup-tablewrap">${suppliersTable(admin)}</div>
    </div>`;
  }
  function suppliersTable(admin){
    const q = norm(fSup.q);
    const list = DB.suppliers.filter(s =>
      (!fSup.statut || s.statut === fSup.statut) &&
      (!q || [s.nom, s.references, s.emplacement, s.whatsapp, s.site].some(v => norm(v).includes(q)))
    ).sort((a, b) => a.nom.localeCompare(b.nom));
    requestAnimationFrame(() => { const el = $('#sup-count'); if (el){ el.style.display = 'block'; el.textContent = list.length + ' fournisseur(s) affiché(s) sur ' + DB.suppliers.length; } });
    if (!list.length) return '<div class="empty">Aucun fournisseur ne correspond à ces critères.</div>';
    return `<div class="table-wrap"><table class="tbl">
      <tr><th>Fournisseur nom</th><th>Références</th><th>Emplacement</th><th>WhatsApp</th><th>Site internet</th><th>Statut</th>${admin ? '<th>Actions</th>' : ''}</tr>
      ${list.map(s => { const wa = waLink(s.whatsapp);
        const siteUrl = s.site ? (String(s.site).startsWith('http') ? s.site : 'https://' + s.site) : '';
        return `<tr>
        <td class="cell-main">${esc(s.nom)}</td>
        <td style="max-width:200px">${esc(s.references || '—')}</td>
        <td>${esc(s.emplacement || '—')}</td>
        <td>${wa ? `<a href="${wa}" target="_blank" rel="noopener" title="Ouvrir WhatsApp">💬 ${esc(s.whatsapp)}</a>` : esc(s.whatsapp || '—')}</td>
        <td>${siteUrl ? `<a href="${esc(siteUrl)}" target="_blank" rel="noopener">🌐 ${esc(s.site)}</a>` : '—'}</td>
        <td>${s.statut === 'Actif' ? '<span class="badge b-green">ACTIF</span>' : '<span class="badge b-red">INACTIF</span>'}</td>
        ${admin ? `<td><div class="actions-bar" style="margin:0">
          <button class="icon-mini" title="Modifier" data-act="supplier-edit" data-id="${s.id}">✏️</button>
          <button class="icon-mini" title="${s.statut === 'Actif' ? 'Désactiver' : 'Réactiver'}" data-act="supplier-toggle" data-id="${s.id}">${s.statut === 'Actif' ? '🔴' : '🟢'}</button>
          <button class="icon-mini" title="Supprimer" data-act="supplier-delete" data-id="${s.id}">🗑️</button>
        </div></td>` : ''}
      </tr>`; }).join('')}
    </table></div>`;
  }
  function refreshSupTable(){
    $('#sup-tablewrap').innerHTML = suppliersTable(hasPermission('manageSuppliers'));
  }

  function supplierModal(id){
    const s = id ? byId(DB.suppliers, id) : null;
    const f = (label, id2, val, ph) => `<div class="field"><label>${label}</label><input id="${id2}" value="${esc(val || '')}" placeholder="${ph || ''}"></div>`;
    modal(s ? '✏️ Modifier le fournisseur' : '＋ Ajouter un fournisseur', `
      <div class="form-grid">
        ${f('Fournisseur nom *', 'sp-nom', s?.nom, 'ex : TechnoPlus CI')}
        ${f('Références', 'sp-references', s?.references, 'ex : Orange CI, SGCI, CIE')}
        ${f('Emplacement', 'sp-emplacement', s?.emplacement, 'ex : Cocody, Abidjan')}
        ${f('WhatsApp', 'sp-whatsapp', s?.whatsapp, 'ex : +225 07 08 09 10 11')}
        ${f('Site internet', 'sp-site', s?.site, 'ex : www.technoplus.ci')}
        <div class="field"><label>Statut</label><select id="sp-statut"><option ${s?.statut === 'Inactif' ? '' : 'selected'}>Actif</option><option ${s?.statut === 'Inactif' ? 'selected' : ''}>Inactif</option></select></div>
      </div>`,
      [{label:'Annuler', cls:'outline'},
       {label:'💾 Enregistrer', cls:'primary', act:() => {
          const nom = $('#sp-nom').value.trim();
          if (!nom) { toast('Le nom du fournisseur est obligatoire.', 'warn'); return; }
          const data = { nom, references:$('#sp-references').value.trim(), emplacement:$('#sp-emplacement').value.trim(),
                         whatsapp:$('#sp-whatsapp').value.trim(), site:$('#sp-site').value.trim(), statut:$('#sp-statut').value };
          if (s) Object.assign(s, data);
          else DB.suppliers.push(Object.assign({id: uid('s')}, data));
          saveDB(); closeModal(); toast(s ? 'Fournisseur modifié ✅' : 'Fournisseur ajouté ✅', 'ok'); render();
       }}]);
  }

  /* ============================= 10bis. IMPORT / EXPORT FOURNISSEURS (Excel · CSV · JSON) ============================= */
  let importRows = null;
  const SUP_COLS = ['FOURNISSEUR NOM','RÉFÉRENCES','EMPLACEMENT','WHATSAPP','SITE INTERNET','STATUT'];

  function importExportModal(){
    if (!hasPermission('importSuppliers')) return;
    importRows = null;
    const libOk = typeof XLSX !== 'undefined';
    modal('📥📤 Importer / Exporter les fournisseurs', `
      <h2 style="font-size:13.5px;margin-bottom:8px">📥 Importer des fournisseurs</h2>
      <p class="small text-muted" style="margin-bottom:10px">Formats acceptés : <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b>, <b>.json</b>.
      Colonnes attendues : <b>FOURNISSEUR NOM · RÉFÉRENCES · EMPLACEMENT · WHATSAPP · SITE INTERNET</b> (STATUT facultatif).</p>
      ${libOk ? '' : '<p class="small" style="background:var(--amber-bg);color:var(--amber);padding:9px 12px;border-radius:9px;margin-bottom:10px">⚠️ Bibliothèque Excel non chargée (mode hors-ligne) : privilégiez un fichier <b>CSV</b> ou <b>JSON</b>.</p>'}
      <input type="file" id="import-file" accept=".xlsx,.xls,.csv,.json" style="border:1.5px dashed var(--border);border-radius:10px;padding:14px;width:100%;background:#f8fafc">
      <div id="import-preview" style="margin-top:14px"></div>
      <div style="border-top:1px solid var(--border);margin:16px 0"></div>
      <h2 style="font-size:13.5px;margin-bottom:8px">📤 Exporter le catalogue fournisseurs (${DB.suppliers.length})</h2>
      <div class="actions-bar">
        <button class="btn success sm" data-act="export-excel">📊 Excel (.xlsx)</button>
        <button class="btn primary sm" data-act="export-json">🧾 JSON (.json)</button>
        <button class="btn outline sm" data-act="export-csv">📄 CSV (secours)</button>
      </div>
      <div style="border-top:1px solid var(--border);margin:16px 0"></div>
      <h2 style="font-size:13.5px;margin-bottom:8px">⬇️ Modèles de fichier</h2>
      <div class="actions-bar">
        <button class="btn outline sm" data-act="download-model-xlsx">Modèle Excel</button>
        <button class="btn outline sm" data-act="download-model">Modèle CSV</button>
        <button class="btn outline sm" data-act="download-model-json">Modèle JSON</button>
      </div>`,
      [{label:'Fermer', cls:'outline'},
       {label:'✓ Importer les fournisseurs', cls:'success', act:importConfirm}], true);
    $('#import-file').addEventListener('change', e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  }

  /* Alias de colonnes (Excel / CSV) */
  const HEAD_ALIASES = {
    nom:        ['fournisseur nom','nom du fournisseur','fournisseur','nom','supplier','name','raison sociale','societe'],
    references: ['references','reference','refs','ref','clients','clients de reference'],
    emplacement:['emplacement','localisation','localite','lieu','ville','adresse','pays'],
    whatsapp:   ['whatsapp','whats app','numero whatsapp','tel','telephone','contact','phone','mobile','numero'],
    site:       ['site internet','site web','site','website','web','url','page web'],
    statut:     ['statut','status','etat','actif']
  };
  function rowsFromMatrix(m){
    const head = (m[0] || []).map(norm);
    const idx = {};
    Object.keys(HEAD_ALIASES).forEach(k => { idx[k] = head.findIndex(h => HEAD_ALIASES[k].includes(h)); });
    const out = [];
    for (let i = 1; i < m.length; i++){
      const row = m[i] || [];
      if (row.every(c => !String(c ?? '').trim())) continue;
      const get = k => idx[k] >= 0 ? String(row[idx[k]] ?? '').trim() : '';
      out.push({ line: i + 1, nom: get('nom'), references: get('references'), emplacement: get('emplacement'),
                 whatsapp: get('whatsapp'), site: get('site'), statut: get('statut') });
    }
    return out;
  }
  /* Alias de clés (JSON) */
  const JSON_KEYS = {
    nom: ['nom','fournisseur','FOURNISSEUR NOM','name','supplier'],
    references: ['references','références','RÉFÉRENCES','refs'],
    emplacement: ['emplacement','EMPLACEMENT','ville','localisation','adresse'],
    whatsapp: ['whatsapp','WHATSAPP','tel','telephone','contact'],
    site: ['site','SITE INTERNET','site web','website','url'],
    statut: ['statut','STATUT','status']
  };
  function rowsFromJson(data){
    let arr = Array.isArray(data) ? data : (data && Array.isArray(data.fournisseurs || data.suppliers) ? (data.fournisseurs || data.suppliers) : [data]);
    return arr.map((o, i) => {
      const get = k => { for (const key of JSON_KEYS[k]) if (o && o[key] !== undefined && String(o[key]).trim() !== '') return String(o[key]).trim(); return ''; };
      return { line: i + 2, nom: get('nom'), references: get('references'), emplacement: get('emplacement'),
               whatsapp: get('whatsapp'), site: get('site'), statut: get('statut') };
    });
  }
  function parseCsvLine(line, sep){
    const out = []; let cur = '', q = false;
    for (const ch of line){ if (ch === '"') q = !q; else if (ch === sep && !q){ out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map(x => x.trim());
  }
  function parseCsv(text){
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
    if (!lines.length) return [];
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : (lines[0].includes('\t') ? '\t' : ',');
    return lines.map(l => parseCsvLine(l, sep));
  }
  function handleImportFile(file){
    const reader = new FileReader();
    if (/\.json$/i.test(file.name) || file.type === 'application/json'){
      reader.onload = e => { try { showImportPreview(rowsFromJson(JSON.parse(e.target.result))); } catch(err){ toast('Fichier JSON invalide : ' + err.message, 'err'); } };
      reader.readAsText(file, 'utf-8');
    } else if (/\.csv$/i.test(file.name) || file.type === 'text/csv'){
      reader.onload = e => showImportPreview(rowsFromMatrix(parseCsv(e.target.result)));
      reader.readAsText(file, 'utf-8');
    } else {
      if (typeof XLSX === 'undefined'){ toast('Bibliothèque Excel indisponible : convertissez le fichier en CSV ou JSON.', 'err'); return; }
      reader.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
          const ws = wb.Sheets[wb.SheetNames[0]];
          showImportPreview(rowsFromMatrix(XLSX.utils.sheet_to_json(ws, {header: 1, raw: false, defval: ''})));
        } catch(err){ toast('Impossible de lire ce fichier : ' + err.message, 'err'); }
      };
      reader.readAsArrayBuffer(file);
    }
  }
  function showImportPreview(rows){
    importRows = rows;
    const valid = rows.filter(r => r.nom), errors = rows.filter(r => !r.nom);
    $('#import-preview').innerHTML = `
      <div class="chosen-banner" style="background:#f5e9fb;border-color:var(--primary);color:#3b0053">📄 Aperçu du fichier — <b>${valid.length} fournisseur${valid.length > 1 ? 's' : ''} détecté${valid.length > 1 ? 's' : ''}</b></div>
      ${errors.length ? `<div class="small" style="background:var(--red-bg);color:var(--red);padding:9px 12px;border-radius:9px;margin-bottom:10px">⛔ ${errors.length} ligne(s) ignorée(s) : ${errors.map(r => 'ligne ' + r.line + ' (nom manquant)').join(', ')}</div>` : ''}
      ${valid.length ? `<div class="table-wrap"><table class="tbl" style="min-width:620px">
        <tr><th>Fournisseur nom</th><th>Références</th><th>Emplacement</th><th>WhatsApp</th><th>Site internet</th><th>Statut</th></tr>
        ${valid.slice(0, 50).map(r => `<tr><td class="cell-main">${esc(r.nom)}</td><td>${esc(r.references || '—')}</td><td>${esc(r.emplacement || '—')}</td><td>${esc(r.whatsapp || '—')}</td><td>${esc(r.site || '—')}</td><td>${esc(r.statut || 'Actif')}</td></tr>`).join('')}
      </table></div>${valid.length > 50 ? '<p class="small text-muted mt">… et ' + (valid.length - 50) + ' autres.</p>' : ''}` : '<div class="empty">Aucun fournisseur valide détecté dans ce fichier.</div>'}`;
  }
  function importConfirm(){
    if (!importRows || !importRows.filter(r => r.nom).length){ toast('Aucun fournisseur valide à importer.', 'warn'); return; }
    const valid = importRows.filter(r => r.nom);
    valid.forEach(r => DB.suppliers.push({
      id: uid('s'), nom: r.nom, references: r.references, emplacement: r.emplacement,
      whatsapp: r.whatsapp, site: r.site,
      statut: /inact/i.test(norm(r.statut)) ? 'Inactif' : 'Actif'
    }));
    saveDB(); closeModal(); importRows = null;
    toast(`✅ ${valid.length} fournisseur${valid.length > 1 ? 's' : ''} ${valid.length > 1 ? 'ont' : 'a'} été ajouté${valid.length > 1 ? 's' : ''} avec succès.`, 'ok');
    render();
  }

  /* ---- Exports & modèles ---- */
  function dlFile(name, content, mime){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: mime}));
    a.download = name; a.click();
  }
  function supExportRows(){
    return DB.suppliers.map(s => ({ 'FOURNISSEUR NOM': s.nom, 'RÉFÉRENCES': s.references || '', 'EMPLACEMENT': s.emplacement || '',
                                    WHATSAPP: s.whatsapp || '', 'SITE INTERNET': s.site || '', STATUT: s.statut || 'Actif' }));
  }
  function exportSuppliersExcel(){
    if (typeof XLSX === 'undefined'){ toast('Bibliothèque Excel indisponible : export CSV effectué à la place.', 'warn'); return exportSuppliersCsv(); }
    const ws = XLSX.utils.json_to_sheet(supExportRows(), {header: SUP_COLS});
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
    XLSX.writeFile(wb, 'fournisseurs_voomnet.xlsx');
    toast('📊 Export Excel : ' + DB.suppliers.length + ' fournisseur(s) exporté(s).', 'ok');
  }
  function exportSuppliersCsv(){
    const lines = [SUP_COLS.join(';')].concat(supExportRows().map(r => SUP_COLS.map(c => String(r[c]).replace(/;/g, ',')).join(';')));
    dlFile('fournisseurs_voomnet.csv', '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8');
    toast('📄 Export CSV : ' + DB.suppliers.length + ' fournisseur(s) exporté(s).', 'ok');
  }
  function exportSuppliersJson(){
    dlFile('fournisseurs_voomnet.json', JSON.stringify(supExportRows(), null, 2), 'application/json');
    toast('🧾 Export JSON : ' + DB.suppliers.length + ' fournisseur(s) exporté(s).', 'ok');
  }
  const MODEL_ROW = { 'FOURNISSEUR NOM':'Fournisseur A', 'RÉFÉRENCES':'Orange CI, CIE', 'EMPLACEMENT':'Cocody, Abidjan', WHATSAPP:'+225 07 00 00 00 01', 'SITE INTERNET':'www.fournisseura.ci', STATUT:'Actif' };
  function downloadModelXlsx(){
    if (typeof XLSX === 'undefined'){ toast('Bibliothèque Excel indisponible : utilisez le modèle CSV ou JSON.', 'warn'); return; }
    const ws = XLSX.utils.json_to_sheet([MODEL_ROW], {header: SUP_COLS});
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
    XLSX.writeFile(wb, 'modele_fournisseurs_voomnet.xlsx');
    toast('Modèle Excel téléchargé 📊', 'ok');
  }
  function downloadModel(){
    dlFile('modele_fournisseurs_voomnet.csv', '\ufeff' + [SUP_COLS.join(';'), SUP_COLS.map(c => String(MODEL_ROW[c]).replace(/;/g, ',')).join(';')].join('\n'), 'text/csv;charset=utf-8');
    toast('Modèle CSV téléchargé 📄', 'ok');
  }
  function downloadModelJson(){
    dlFile('modele_fournisseurs_voomnet.json', JSON.stringify([MODEL_ROW], null, 2), 'application/json');
    toast('Modèle JSON téléchargé 📄', 'ok');
  }

  /* ============================= 10quater. EXPORTS EXCEL (demandes & commandes) ============================= */
  function requestsExportRows(){
    const list = hasPermission('viewAllRequests') ? DB.requests.slice()
      : DB.requests.filter(r => r.demandeurId === sessionUser.id);
    return list.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => {
      const off = (r.offers || {})[r.chosenSupplierId] || {};
      const neg = calcOfferTotal(r, off), pres = totalEstimatif(r);
      return {
        'NUMÉRO': r.numero,
        'DATE': fmtD(r.date),
        'DEMANDEUR': userName(r.demandeurId),
        'SERVICE': r.service || '',
        'PRIORITÉ': r.priorite || '',
        'MOTIF': r.motif || '',
        'ARTICLES (désignation × qté)': (r.articles || []).map(a => a.designation + ' ×' + a.quantite).join(' | '),
        'FOURNISSEURS CONSULTÉS': (r.supplierIds || []).map(suppName).join(' | '),
        'FOURNISSEUR RETENU': r.chosenSupplierId ? suppName(r.chosenSupplierId) : '',
        'MONTANT NÉGOCIÉ (FCFA)': neg || '',
        'SOMME PRÉSUMÉE (FCFA)': pres || '',
        'ÉCART (FCFA)': (neg && pres) ? (pres - neg) : '',
        'STATUT': STATUTS[r.statut] ? STATUTS[r.statut].label : r.statut,
        'DÉCISION': r.validation ? r.validation.decision : '',
        'MOTIF DÉCISION': r.validation ? (r.validation.motif || '') : ''
      };
    });
  }
  function exportRequestsExcel(){
    const rows = requestsExportRows();
    if (!rows.length){ toast('Aucune demande à exporter.', 'warn'); return; }
    if (typeof XLSX === 'undefined'){
      const head = Object.keys(rows[0]);
      const csv = [head.join(';')].concat(rows.map(r => head.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))).join('\n');
      dlFile('demandes_voomnet.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
      toast('📄 Export CSV (Excel indisponible) : ' + rows.length + ' demande(s).', 'ok'); return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Demandes');
    XLSX.writeFile(wb, 'demandes_voomnet.xlsx');
    toast('📊 Export Excel : ' + rows.length + ' demande(s) exportée(s).', 'ok');
  }
  function ordersExportRows(){
    const mine = new Set((hasPermission('viewAllRequests') ? DB.requests.slice() : DB.requests.filter(r => r.demandeurId === sessionUser.id)).map(r => r.id));
    return DB.orders.filter(o => mine.has(o.requestId)).sort((a,b) => new Date(b.date) - new Date(a.date)).map(o => {
      const r = byId(DB.requests, o.requestId);
      const rec = DB.receptions.find(x => x.orderId === o.id);
      return {
        'NUMÉRO BC': o.numero,
        'DEMANDE LIÉE': r ? r.numero : '',
        'FOURNISSEUR': suppName(o.supplierId),
        'DATE': fmtD(o.date),
        'MONTANT (FCFA)': +o.total || 0,
        'DÉLAI': o.delai || '',
        'STATUT COMMANDE': o.statut,
        'RÉCEPTION': rec ? rec.statut : '',
        'DATE RÉCEPTION': rec && rec.date ? fmtD(rec.date) : ''
      };
    });
  }
  function exportOrdersExcel(){
    const rows = ordersExportRows();
    if (!rows.length){ toast('Aucune commande à exporter.', 'warn'); return; }
    if (typeof XLSX === 'undefined'){
      const head = Object.keys(rows[0]);
      const csv = [head.join(';')].concat(rows.map(r => head.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))).join('\n');
      dlFile('commandes_voomnet.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
      toast('📄 Export CSV (Excel indisponible) : ' + rows.length + ' commande(s).', 'ok'); return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    XLSX.writeFile(wb, 'commandes_voomnet.xlsx');
    toast('📊 Export Excel : ' + rows.length + ' commande(s) exportée(s).', 'ok');
  }

  /* ============================= 10ter. EXPORT PDF =============================
     jsPDF + AutoTable sont chargés à la demande depuis le CDN. En cas
     d'indisponibilité (hors-ligne), l'export bascule sur l'impression
     navigateur (qui permet d'enregistrer en PDF).                              */
  const PDF_CDN = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.3/dist/jspdf.plugin.autotable.min.js'
  ];
  let pdfLoader = null;
  function loadScript(src){
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = src; sc.async = false;
      sc.onload = res; sc.onerror = () => rej(new Error('CDN indisponible'));
      document.head.appendChild(sc);
    });
  }
  function ensurePdf(){
    if (globalThis.jspdf && globalThis.jspdf.jsPDF) return Promise.resolve(globalThis.jspdf.jsPDF);
    if (!pdfLoader){
      pdfLoader = (async () => {
        for (const src of PDF_CDN){ if (!document.querySelector(`script[src="${src}"]`)) await loadScript(src); }
        return globalThis.jspdf && globalThis.jspdf.jsPDF;
      })();
    }
    return pdfLoader;
  }
  const pdfCell = v => (v === 0 ? '0' : (v === null || v === undefined || v === '' ? '—' : String(v)));

  /* Repli hors-ligne : impression via #print-root (Enregistrer au format PDF) */
  function printTableFallback(title, rows){
    const head = rows.length ? Object.keys(rows[0]) : [];
    $('#print-root').innerHTML = `
      <div style="text-align:center;border-bottom:3px solid #500070;padding-bottom:12px;margin-bottom:16px">
        <div style="font-size:22px;font-weight:800;color:#0b1f3a">VOOMNET TECHNOLOGY</div>
        <div style="letter-spacing:3px;font-size:11px;color:#64748b">GESTION DES ACHATS</div>
      </div>
      <h2 style="font-size:16px;margin-bottom:4px">${esc(title)}</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">Edité le ${fmtDT(nowISO())} par ${esc(sessionUser ? sessionUser.nom : '')}</p>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <tr style="background:#eef2f7">${head.map(h => `<th style="border:1px solid #cbd5e1;padding:5px;text-align:left">${esc(h)}</th>`).join('')}</tr>
        ${rows.map(r => `<tr>${head.map(h => `<td style="border:1px solid #cbd5e1;padding:5px">${esc(pdfCell(r[h]))}</td>`).join('')}</tr>`).join('')}
      </table>`;
    window.print();
    toast('Bibliothèque PDF indisponible : impression ouverte (→ Enregistrer en PDF).', 'warn');
  }

  /* Génère un vrai fichier .pdf */
  async function exportPdfRows(titre, rows, nomFichier){
    if (!rows.length){ toast('Rien à exporter.', 'warn'); return; }
    let jsPDF = null;
    try { jsPDF = await ensurePdf(); } catch(e){ jsPDF = null; }
    if (!jsPDF){ printTableFallback(titre, rows); return; }
    const head = Object.keys(rows[0]);
    const large = head.length > 6;
    const doc = new jsPDF({ orientation: large ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    doc.setFillColor(0, 0, 96); doc.rect(0, 0, W, 58, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('VOOMNET TECHNOLOGY', 40, 27);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('GESTION DES ACHATS', 40, 43);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(titre, 40, 86);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(`Edité le ${fmtDT(nowISO())} — par ${sessionUser ? sessionUser.nom : ''} — ${rows.length} ligne(s)`, 40, 102);
    doc.autoTable({
      startY: 118,
      head: [head],
      body: rows.map(r => head.map(h => pdfCell(r[h]))),
      styles: { fontSize: 7.5, cellPadding: 3.5, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [80, 0, 112], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40, bottom: 40 }
    });
    const nb = doc.internal.getNumberOfPages();
    for (let i = 1; i <= nb; i++){
      doc.setPage(i);
      doc.setFontSize(7.5); doc.setTextColor(130);
      doc.text(`Page ${i} / ${nb} — VOOMNET TECHNOLOGY — document généré le ${fmtD(nowISO())}`, W - 40, H - 18, { align: 'right' });
    }
    doc.save(nomFichier + '.pdf');
    toast('📄 Export PDF : ' + rows.length + ' ligne(s) exportée(s).', 'ok');
  }

  function receptionsExportRows(){
    const mine = hasPermission('viewAllRequests') ? null
      : new Set(DB.requests.filter(r => r.demandeurId === sessionUser.id).map(r => r.id));
    return DB.receptions.slice()
      .filter(rc => { const o = byId(DB.orders, rc.orderId); const r = o && byId(DB.requests, o.requestId); return r && (!mine || mine.has(r.id)); })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map(rc => {
        const o = byId(DB.orders, rc.orderId); const r = o ? byId(DB.requests, o.requestId) : null;
        const totC = (rc.lignes || []).reduce((s, l) => s + (+l.qteCommandee || 0), 0);
        const totR = (rc.lignes || []).reduce((s, l) => s + (+l.qteRecue || 0), 0);
        return {
          'COMMANDE': o ? o.numero : '', 'DEMANDE': r ? r.numero : '', 'FOURNISSEUR': o ? suppName(o.supplierId) : '',
          'REÇU': totR, 'COMMANDÉ': totC, 'DATE': rc.date ? fmtD(rc.date) : '',
          'STATUT': rc.statut, 'OBSERVATIONS': rc.observations || ''
        };
      });
  }
  function exportReceptionsExcel(){
    const rows = receptionsExportRows();
    if (!rows.length){ toast('Aucune réception à exporter.', 'warn'); return; }
    if (typeof XLSX === 'undefined'){
      const h = Object.keys(rows[0]);
      const csv = [h.join(';')].concat(rows.map(r => h.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))).join('\n');
      dlFile('receptions_voomnet.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
      toast('📄 Export CSV (Excel indisponible) : ' + rows.length + ' réception(s).', 'ok'); return;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Réceptions');
    XLSX.writeFile(wb, 'receptions_voomnet.xlsx');
    toast('📊 Export Excel : ' + rows.length + ' réception(s) exportée(s).', 'ok');
  }
  function exportRequestsPdf(){
    const rows = requestsExportRows().map(r => Object.assign({}, r, {
      'MONTANT NÉGOCIÉ (FCFA)': r['MONTANT NÉGOCIÉ (FCFA)'] === '' ? '—' : (+r['MONTANT NÉGOCIÉ (FCFA)']).toLocaleString('fr-FR') + ' FCFA',
      'SOMME PRÉSUMÉE (FCFA)': r['SOMME PRÉSUMÉE (FCFA)'] === '' ? '—' : (+r['SOMME PRÉSUMÉE (FCFA)']).toLocaleString('fr-FR') + ' FCFA',
      'ÉCART (FCFA)': r['ÉCART (FCFA)'] === '' ? '—' : (+r['ÉCART (FCFA)']).toLocaleString('fr-FR') + ' FCFA'
    }));
    exportPdfRows('Liste des demandes d\'achat', rows, 'demandes_voomnet');
  }
  function exportOrdersPdf(){
    const rows = ordersExportRows().map(r => Object.assign({}, r, {
      'MONTANT (FCFA)': (+r['MONTANT (FCFA)'] || 0).toLocaleString('fr-FR') + ' FCFA'
    }));
    exportPdfRows('Liste des bons de commande', rows, 'commandes_voomnet');
  }
  function exportReceptionsPdf(){
    exportPdfRows('Liste des réceptions', receptionsExportRows(), 'receptions_voomnet');
  }

  /* ============================= 10quater. SUPPRESSIONS (administrateur) ============================= */
  function estAdmin(){ return !!(sessionUser && sessionUser.role === 'admin'); }
  function requireAdmin(){
    if (estAdmin()) return true;
    toast('Seul l\'administrateur peut effectuer cette suppression.', 'err');
    return false;
  }
  /* Après suppression depuis un écran de détail, on revient à la liste d'origine */
  function renderAfterDelete(fallback){
    if (state.page === 'detailDemande' || state.page === 'creationCommande'){
      go((state.params && state.params.nav) ? state.params.nav : fallback);
    } else render();
  }

  function deleteRequest(id){
    if (!requireAdmin()) return;
    const r = byId(DB.requests, id); if (!r) return;
    const orders = DB.orders.filter(o => o.requestId === id);
    const recs = DB.receptions.filter(x => orders.some(o => o.id === x.orderId));
    confirmModal(`Supprimer définitivement la demande <b>${esc(r.numero)}</b> ?` +
      (orders.length ? `<br><span class="text-muted small">${orders.length} commande(s) et ${recs.length} réception(s) liée(s) seront aussi supprimées.</span>` : '') +
      `<br><span class="text-muted small">Cette action est irréversible.</span>`, () => {
        DB.receptions = DB.receptions.filter(x => !recs.some(y => y.id === x.id));
        DB.orders = DB.orders.filter(o => o.requestId !== id);
        DB.requests = DB.requests.filter(x => x.id !== id);
        DB.notifications = DB.notifications.filter(n => !String(n.texte || '').includes(r.numero));
        saveDB(); closeModal();
        toast('Demande ' + r.numero + ' supprimée 🗑️', 'ok');
        renderAfterDelete('toutesDemandes');
      }, 'Supprimer');
  }

  function deleteUser(id){
    if (!requireAdmin()) return;
    const u = byId(DB.users, id); if (!u) return;
    if (u.id === sessionUser.id){ toast('Vous ne pouvez pas supprimer votre propre compte.', 'warn'); return; }
    const nb = DB.requests.filter(r => r.demandeurId === id).length;
    if (nb){ toast(u.nom + ' est rattaché à ' + nb + ' demande(s) : désactivez le compte plutôt que de le supprimer.', 'warn'); return; }
    confirmModal(`Supprimer définitivement l'utilisateur <b>${esc(u.nom)}</b> (${esc(u.identifiant)}) ?`, () => {
      DB.users = DB.users.filter(x => x.id !== id);
      DB.notifications = DB.notifications.filter(n => n.userId !== id);
      saveDB(); closeModal();
      toast('Utilisateur ' + u.nom + ' supprimé 🗑️', 'ok');
      render();
    }, 'Supprimer');
  }

  function deleteOrder(id){
    if (!requireAdmin()) return;
    const o = byId(DB.orders, id); if (!o) return;
    const recs = DB.receptions.filter(x => x.orderId === id);
    confirmModal(`Supprimer définitivement la commande <b>${esc(o.numero)}</b> ?` +
      (recs.length ? `<br><span class="text-muted small">${recs.length} réception(s) liée(s) sera aussi supprimée.</span>` : '') +
      `<br><span class="text-muted small">La demande redeviendra « APPROUVÉE » (une nouvelle commande pourra être créée).</span>`, () => {
        DB.receptions = DB.receptions.filter(x => x.orderId !== id);
        DB.orders = DB.orders.filter(x => x.id !== id);
        const r = byId(DB.requests, o.requestId);
        if (r && ['commandee', 'reception_partielle', 'cloturee'].includes(r.statut)){
          r.statut = 'approuvee';
          pushHist(r, 'Commande ' + o.numero + ' supprimée — demande de nouveau approuvée');
        }
        saveDB(); closeModal();
        toast('Commande ' + o.numero + ' supprimée 🗑️', 'ok');
        renderAfterDelete('commandes');
      }, 'Supprimer');
  }

  function deleteReception(id){
    if (!requireAdmin()) return;
    const rc = byId(DB.receptions, id); if (!rc) return;
    const o = byId(DB.orders, rc.orderId);
    const r = o ? byId(DB.requests, o.requestId) : null;
    confirmModal(`Supprimer définitivement la réception de la commande <b>${esc(o ? o.numero : '')}</b> ?` +
      `<br><span class="text-muted small">La commande redeviendra « à réceptionner ».</span>`, () => {
        DB.receptions = DB.receptions.filter(x => x.id !== id);
        if (r && ['cloturee', 'reception_partielle'].includes(r.statut)){
          r.statut = 'commandee';
          pushHist(r, 'Réception supprimée — commande de nouveau en attente de réception');
        }
        saveDB(); closeModal();
        toast('Réception supprimée 🗑️', 'ok');
        renderAfterDelete('receptions');
      }, 'Supprimer');
  }

  /* ============================= 11. UTILISATEURS ============================= */
  function viewUsers(){
    if (!hasPermission('manageUsers')) return '<div class="card empty">Accès refusé.</div>';
    return `<div class="card"><h2>👥 Utilisateurs
        <span class="h-actions"><button class="btn primary sm" data-act="user-add">＋ Ajouter un utilisateur</button></span>
      </h2>
      <div class="table-wrap"><table class="tbl">
        <tr><th>Nom</th><th>Identifiant</th><th>Service</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
        ${DB.users.map(u=>`<tr>
          <td class="cell-main">${esc(u.nom)}<div class="cell-sub">${esc(u.email||'')}</div></td>
          <td><code>${esc(u.identifiant)}</code></td>
          <td>${esc(u.service||'—')}</td>
          <td>${u.role==='admin'?'<span class="badge b-red">ADMINISTRATEUR</span>':u.role==='responsable'?'<span class="badge b-amber">RESPONSABLE</span>':'<span class="badge b-blue">DEMANDEUR</span>'}</td>
          <td>${u.statut==='Actif'?'<span class="badge b-green">ACTIF</span>':'<span class="badge b-gray">INACTIF</span>'}</td>
          <td><div class="actions-bar" style="margin:0">
            <button class="icon-mini" title="Modifier" data-act="user-edit" data-id="${u.id}">✏️</button>
            ${u.id===sessionUser.id ? '' : `<button class="icon-mini" title="${u.statut==='Actif'?'Désactiver':'Réactiver'}" data-act="user-toggle" data-id="${u.id}">${u.statut==='Actif'?'🔴':'🟢'}</button>`}
          ${u.id===sessionUser.id ? '' : `<button class="icon-mini" title="Supprimer l'utilisateur" data-act="delete-user" data-id="${u.id}">🗑️</button>`}
          </div></td>
        </tr>`).join('')}
      </table></div>
    </div>`;
  }
  function userModal(id){
    const u = id ? byId(DB.users, id) : null;
    const f = (label, id2, val, type, ph) => `<div class="field"><label>${label}</label><input id="${id2}" type="${type||'text'}" value="${esc(val||'')}" placeholder="${ph||''}"></div>`;
    modal(u ? '✏️ Modifier l\'utilisateur' : '＋ Ajouter un utilisateur', `
      <div class="form-grid">
        ${f('Nom complet *','us-nom',u?.nom,'text','ex : KOUADIO KONAN')}
        ${f('Identifiant *','us-id',u?.identifiant,'text','ex : demandeur3')}
        ${f('Email','us-email',u?.email,'email','ex : nom@voomnet.ci')}
        ${f('Téléphone','us-tel',u?.tel,'text','ex : 07 00 00 00 00')}
        ${f('Service','us-service',u?.service,'text','ex : DSI')}
        ${f('Fonction','us-fonction',u?.fonction,'text','ex : Chef de projet')}
        <div class="field"><label>Mot de passe ${u?'(laisser vide pour conserver)':'*'}</label><input id="us-pw" type="text" value="" placeholder="ex : demo123"></div>
        <div class="field"><label>Rôle</label>
          <select id="us-role">${['admin','responsable','demandeur'].map(r=>`<option value="${r}" ${u?.role===r?'selected':''}>${ROLE_LABELS[r]}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Statut</label><select id="us-statut"><option ${u?.statut==='Actif'?'selected':''}>Actif</option><option ${u?.statut==='Inactif'?'selected':''}>Inactif</option></select></div>
      </div>`,
      [{label:'Annuler', cls:'outline'},
       {label:'💾 Enregistrer', cls:'primary', act:()=>{
          const nom = $('#us-nom').value.trim(), ident = $('#us-id').value.trim(), pw = $('#us-pw').value;
          if (!nom || !ident) { toast('Nom et identifiant sont obligatoires.', 'warn'); return; }
          if (!u && !pw) { toast('Définissez un mot de passe.', 'warn'); return; }
          if (DB.users.some(x => norm(x.identifiant) === norm(ident) && x.id !== (u?u.id:''))) { toast('Cet identifiant existe déjà.', 'err'); return; }
          if (u){
            Object.assign(u, { nom, identifiant:ident, email:$('#us-email').value.trim(), tel:$('#us-tel').value.trim(),
              service:$('#us-service').value.trim(), fonction:$('#us-fonction').value.trim(), role:$('#us-role').value, statut:$('#us-statut').value });
            if (pw) u.password = pw;
            if (u.id === sessionUser.id){ sessionUser = u; showAppTopbar(); }
          } else {
            DB.users.push({ id:uid('u'), nom, identifiant:ident, email:$('#us-email').value.trim(), tel:$('#us-tel').value.trim(),
              service:$('#us-service').value.trim(), fonction:$('#us-fonction').value.trim(), password:pw, role:$('#us-role').value, statut:$('#us-statut').value });
          }
          saveDB(); closeModal(); toast(u ? 'Utilisateur modifié ✅' : 'Utilisateur créé ✅', 'ok'); render();
       }}]);
  }
  function showAppTopbar(){
    $('#su-avatar').textContent = initials(sessionUser.nom);
    $('#su-name').textContent = sessionUser.nom;
    $('#su-role').textContent = ROLE_LABELS[sessionUser.role];
    $('#tu-avatar').textContent = initials(sessionUser.nom);
    $('#tu-name').textContent = sessionUser.nom;
    $('#tu-role').textContent = ROLE_LABELS[sessionUser.role];
  }

  /* ============================= 13. RAPPORTS & PARAMÈTRES ============================= */
  function viewReports(){
    const R = DB.requests, orders = DB.orders.filter(o => o.statut === 'Confirmée');
    const totalAchats = orders.reduce((s,o) => s + (+o.total||0), 0);
    const decided = R.filter(r => r.validation);
    const taux = decided.length ? Math.round(100 * decided.filter(r => r.validation.decision === 'Approuvée').length / decided.length) : 0;
    const byServ = {};
    orders.forEach(o => { const r2 = byId(DB.requests, o.requestId); const sv = r2 ? (r2.service || '—') : '—'; byServ[sv] = (byServ[sv] || 0) + (+o.total || 0); });
    const maxServ = Math.max(1, ...Object.values(byServ));
    const bySupp = {};
    orders.forEach(o => { const k = suppName(o.supplierId); bySupp[k] = bySupp[k] || {m:0, n:0}; bySupp[k].m += +o.total||0; bySupp[k].n++; });
    const topSupp = Object.entries(bySupp).sort((a,b) => b[1].m - a[1].m).slice(0,5);
    const byService = {};
    R.forEach(r => { byService[r.service||'—'] = (byService[r.service||'—']||0) + 1; });
    return `
    <div class="stats-grid">
      ${statCard('💰','green', fmtM(totalAchats), 'Montant total des achats')}
      ${statCard('📦','blue',  orders.length, 'Commandes confirmées')}
      ${statCard('📝','purple',R.length, 'Demandes au total')}
      ${statCard('✅','teal',  taux + ' %', 'Taux d\'approbation')}
    </div>
    <div class="grid2">
      <div class="card"><h2>📊 Demandes par statut</h2>
        ${Object.keys(STATUTS).map(k => { const n = R.filter(r=>r.statut===k).length; return n ? `<div class="kv"><span>${STATUTS[k].label}</span><span>${n}</span></div>` : ''; }).join('') || '<div class="empty">—</div>'}
      </div>
      <div class="card"><h2>💰 Achats par service</h2>
        ${Object.keys(byServ).length ? Object.entries(byServ).sort((a,b)=>b[1]-a[1]).map(([c,m]) =>
          `<div class="bar-row"><div class="bar-lab" title="${esc(c)}">${esc(c)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(100*m/maxServ)}%"></div></div><div class="bar-val">${fmtM(m)}</div></div>`).join('')
        : '<div class="empty">Aucune commande confirmée.</div>'}
      </div>
    </div>
    <div class="grid2">
      <div class="card"><h2>🏅 Top fournisseurs</h2>
        ${topSupp.length ? `<div class="table-wrap"><table class="tbl" style="min-width:380px">
          <tr><th>Fournisseur</th><th class="num">Commandes</th><th class="num">Montant</th></tr>
          ${topSupp.map(([n,v])=>`<tr><td class="cell-main">${esc(n)}</td><td class="num">${v.n}</td><td class="num">${fmtM(v.m)}</td></tr>`).join('')}
        </table></div>` : '<div class="empty">Aucune commande confirmée.</div>'}
      </div>
      <div class="card"><h2>🏢 Demandes par service</h2>
        ${Object.entries(byService).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<div class="kv"><span>${esc(s)}</span><span>${n} demande${n>1?'s':''}</span></div>`).join('')}
      </div>
    </div>`;
  }

  /* État de la connexion Supabase affiché dans ⚙️ Paramètres */
  function dbStatusHTML(){
    if (!remote) return '💻 Mode local — localStorage uniquement (Supabase non configuré)';
    const st = (remote.status ? remote.status() : {}) || {};
    const nom = st.project ? st.project + '.supabase.co' : 'Supabase';
    if (!st.online) return `☁️ ${esc(nom)} — ⚠️ ${esc(st.error || 'erreur de synchronisation')} (fonctionnement local)`;
    const quand = st.lastSyncAt ? ' — dernière synchro ' + new Date(st.lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    return `☁️ <span style="color:var(--green)">Connecté à Supabase</span> (${esc(nom)})${quand}`;
  }

  function viewSettings(){
    const kb = Math.round(JSON.stringify(DB).length / 1024);
    return `
    <div class="card"><h2>⚙️ Paramètres</h2>
      <div class="kv"><span>Application</span><span>VOOMNET — Gestion des Achats (démo)</span></div>
      <div class="kv"><span>Base de données</span><span>${dbStatusHTML()}</span></div>
    <div class="kv"><span>Stockage des données</span><span>localStorage du navigateur (cache) — ${kb} Ko</span></div>
      <div class="kv"><span>Utilisateurs / Fournisseurs / Demandes</span><span>${DB.users.length} / ${DB.suppliers.length} / ${DB.requests.length}</span></div>
      <div class="kv"><span>Commandes / Réceptions</span><span>${DB.orders.length} / ${DB.receptions.length}</span></div>
      <p class="text-muted small mt">💡 Architecture : toutes les données passent par une couche unique (loadDB / saveDB). Pour connecter un vrai backend, il suffit de remplacer cette couche par des appels d'API — le reste de l'application ne change pas.</p>
    </div>
    <div class="card"><h2>⚖️ Comparaison des prix (étape 3)</h2>
      <div class="form-grid">
        <div class="field"><label>Nombre minimum d'offres complètes</label>
          <input type="number" min="1" max="10" data-meta="seuilOffres" value="${seuilOffres()}">
          <span class="hint">Un fournisseur n'ayant pas chiffré tous les articles est marqué « ⚠️ SANS RÉPONSE » et exclu de la comparaison. Mettre <b>0</b> rend les prix facultatifs.</span></div>
        <div class="field"><label>Délai avant alerte — relance (jours)</label>
          <input type="number" min="0" max="60" data-meta="delaiAlerte" value="${delaiAlerte()}">
          <span class="hint">Relance automatique : demande non validée ou commande non réceptionnée depuis ce nombre de jours. <b>0</b> = aucune relance.</span></div>
        <div class="field"><label>Délai avant urgence (jours)</label>
          <input type="number" min="1" max="90" data-meta="delaiUrgence" value="${delaiUrgence()}">
          <span class="hint">Au-delà, l'alerte passe en 🔴 urgente et les administrateurs sont aussi prévenus.</span></div>
        <div class="field"><label>TVA par défaut (%)</label>
          <input type="number" min="0" max="100" step="0.1" data-meta="tva" value="${tauxTVA()}">
          <span class="hint">Appliquée au net HT de chaque offre pour le calcul du coût total rendu.</span></div>
      </div>
      <div class="field mt"><label>Pondération du score multicritère — total <b>${poidsTotal()}</b> %</label>
        <div class="poids-grid">
          ${[['prix', '💰 Prix'], ['delai', '🚚 Délai'], ['garantie', '🛡️ Garantie'], ['paiement', '💳 Paiement']].map(([k, l]) =>
            `<label class="poids-item"><span>${l}</span><input type="number" min="0" max="100" step="5" data-poids="${k}" value="${+poids()[k] || 0}"></label>`).join('')}
        </div>
        <span class="hint">Score = moyenne pondérée des notes prix (moins cher = 100), délai (plus rapide = 100), garantie (la plus longue = 100) et paiement (30 + jours de délai).</span>
      </div>
    </div>
    <div class="card"><h2>🔔 Notifications et sons</h2>
      <div class="form-grid">
        <div class="field"><label>Sons de notification</label>
          <select data-son="1">
            <option value="1" ${sonActif() ? 'selected' : ''}>Activés</option>
            <option value="0" ${sonActif() ? '' : 'selected'}>Désactivés</option>
          </select>
          <span class="hint">Signal sonore à chaque nouvelle notification : 1 note = information 🟠, 2 notes = alerte, 3 notes aiguës = urgence 🔴.</span></div>
        <div class="field"><label>Alarme répétée (tant que ce n'est pas lu)</label>
          <select data-alarme="actif">
            <option value="1" ${alarmeCfg().actif ? 'selected' : ''}>Activée</option>
            <option value="0" ${alarmeCfg().actif ? '' : 'selected'}>Désactivée</option>
          </select>
          <span class="hint">La mélodie est rejouée jusqu'à ce que les notifications soient lues — ou après le nombre maximal de répétitions.</span></div>
        <div class="field"><label>Intervalle entre deux sons (s)</label>
          <input type="number" min="5" max="600" data-alarme="delai" value="${alarmeCfg().delai}"></div>
        <div class="field"><label>Nombre maximal de répétitions</label>
          <input type="number" min="1" max="100" data-alarme="max" value="${alarmeCfg().max}"></div>
        <div class="field"><label>Notifications concernées</label>
          <select data-alarme="niveaux">
            <option value="tous" ${alarmeCfg().niveaux === 'tous' ? 'selected' : ''}>Toutes</option>
            <option value="urgent_alerte" ${alarmeCfg().niveaux === 'urgent_alerte' ? 'selected' : ''}>Alertes 🟠 et urgences 🔴</option>
            <option value="urgent" ${alarmeCfg().niveaux === 'urgent' ? 'selected' : ''}>Urgences 🔴 uniquement</option>
          </select></div>
        <div class="field"><label>Essayer</label>
          <button class="btn outline" data-act="test-son">🔊 Tester les sons</button>
          <span class="hint">Le son est produit par le navigateur (aucun fichier audio) : pensez à monter le volume de votre poste.</span></div>
      </div>
    </div>
    <div class="card"><h2>♻️ Réinitialisation de la démonstration</h2>
      <p class="small text-muted" style="margin-bottom:12px">Supprime toutes les données locales (fournisseurs importés, demandes, commandes…) et recrée le jeu de données de démonstration : 5 utilisateurs, 10 fournisseurs, 5 demandes, commandes et réceptions.</p>
      <button class="btn danger" data-act="reset-demo">🗑️ Réinitialiser les données de démonstration</button>
    </div>`;
  }
  function resetDemo(){
    resetDemoData();
    sessionUser = null;
    storage.removeItem(SESSION_KEY);
    closeModal();
    showLogin();
    toast('Données de démonstration réinitialisées ✅', 'ok');
  }

  /* ============================= 14. AIGUILLAGE DES ACTIONS & INITIALISATION ============================= */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case 'fill-login':   $('#login-id').value = el.dataset.u; $('#login-pw').value = el.dataset.p; break;
      case 'logout':       doLogout(); break;
      case 'toggle-sidebar': $('#sidebar').classList.toggle('open'); break;
      case 'nav':          go(el.dataset.page); break;
      case 'notif-toggle': { const p = $('#notif-panel'); if (p.classList.contains('hidden')){ renderNotifPanel(); p.classList.remove('hidden'); } else p.classList.add('hidden'); break; }
      case 'notif-open': {
        const n = DB.notifications.find(x => x.id === el.dataset.nid);
        const concerne = notifsAlarme().some(x => x.id === el.dataset.nid);
        if (n){ n.lu = true; saveDB(); arreterAlarme(concerne); }
        $('#notif-panel').classList.add('hidden');
        go('detailDemande', { id, nav: 'mesDemandes' });
        break;
      }
      case 'notif-readall': {
        const restantes = notifsAlarme().length;
        DB.notifications.forEach(n => { if (n.userId === sessionUser.id) n.lu = true; });
        saveDB(); arreterAlarme(restantes > 0); renderNotifPanel(); updateBell(); break;
      }
      case 'modal-close':  closeModal(); break;
      case 'view-request': go('detailDemande', {id, nav: el.dataset.nav || state.nav}); break;
      case 'resume-request': resumeRequest(id); break;
      case 'goto-create-order': go('creationCommande', {id, nav: el.dataset.nav || 'mesDemandes'}); break;
      case 'decide': {
        const d = el.dataset.decision;
        if (d === 'Approuvée')
          confirmModal('Approuver la demande <b>' + esc(byId(DB.requests,id).numero) + '</b> ?<br><span class="text-muted small">Le demandeur pourra ensuite créer la commande.</span>',
            () => decideRequest(id, d, ''), '✓ Approuver');
        else {
          const label = d === 'Refusée' ? 'Motif du refus *' : 'Consignes de modification *';
          modal((d === 'Refusée' ? '✕ Refus — ' : '🔄 Modification — ') + esc(byId(DB.requests,id).numero),
            `<div class="field"><label>${label}</label><textarea id="dec-motif" placeholder="${d === 'Refusée' ? 'Ex : budget non disponible ce trimestre.' : 'Ex : demander un devis pour 5 postes supplémentaires.'}"></textarea></div>`,
            [{label:'Annuler', cls:'outline'},
             {label: d === 'Refusée' ? 'Confirmer le refus' : 'Envoyer la consigne', cls: d === 'Refusée' ? 'danger' : 'warning', act:()=>{
                const m = $('#dec-motif').value.trim();
                if (!m){ toast('Le motif est obligatoire.', 'warn'); return; }
                decideRequest(id, d, m);
             }}]);
        }
        break;
      }
      /* --- Assistant --- */
      case 'add-article':  collectStep1(true); draft.articles.push({designation:'',reference:'',description:'',quantite:1,prix:0}); renderWizard(); break;
      case 'del-article':  collectStep1(true); draft.articles.splice(+id,1); if (!draft.articles.length) draft.articles.push({designation:'',reference:'',description:'',quantite:1,prix:0}); renderWizard(); break;
      case 'wiz-back':     draft.step = Math.max(1, (draft.step||1) - 1); saveDraft(); renderWizard(); break;
      case 'wiz-goto':     draft.step = +el.dataset.step; saveDraft(); renderWizard(); break;
      case 'wiz-savequit': collectStep1(true); if (draft.statut !== 'modification') draft.statut = draft.step >= 3 ? 'en_comparaison' : 'brouillon'; saveDraft(); toast('Brouillon « ' + draft.numero + ' » enregistré 💾', 'ok'); draft = null; go('mesDemandes'); break;
      case 'wiz-next': {
        const step = draft.step || 1;
        if (step === 1){ if (!collectStep1()) return; draft.step = 2; }
        else if (step === 2){
          /* Le choix des fournisseurs est FACULTATIF : 3 consultations conseillées, jamais bloquant. */
          pushHist(draft, draft.supplierIds.length + ' fournisseurs sélectionnés');
          draft.step = 3;
        }
        else if (step === 3){
          const complets = offresCompletes(draft);
          /* garde-fou : on n'exige jamais plus d'offres complètes que de fournisseurs consultés */
          const seuil = Math.min(seuilOffres(), (draft.supplierIds || []).length);
          if (complets.length < seuil){
            const manquants = draft.supplierIds.filter(sid => !offreComplete(draft, draft.offers[sid]));
            toast(complets.length + ' offre(s) complète(s) sur ' + seuil + ' requise(s) — prix manquants chez : ' +
              manquants.slice(0, 3).map(suppName).join(', ') + (manquants.length > 3 ? '…' : '') +
              '. Complétez la saisie ou abaissez le seuil dans ⚙️ Paramètres.', 'warn');
            return;
          }
          const incomplets = draft.supplierIds.length - complets.length;
          pushHist(draft, 'Prix négociés saisis pour ' + complets.length + ' fournisseur(s)');
          if (incomplets) toast(incomplets + ' fournisseur(s) sans réponse complète : exclu(s) du meilleur prix, du classement et du score.', 'warn');
          draft.statut = 'en_comparaison'; draft.step = 4;
        }
        else if (step === 4){
          pushHist(draft, 'Comparaison des offres effectuée');
          draft.step = 5;
        }
        else if (step === 5){
          /* Le choix du fournisseur et la justification sont FACULTATIFS */
          draft.justification = ($('#wiz-justif')?.value || '').trim();
          if (draft.chosenSupplierId){
            pushHist(draft, 'Fournisseur ' + suppName(draft.chosenSupplierId) + ' sélectionné');
          } else {
            pushHist(draft, 'Aucun fournisseur retenu pour le moment');
            toast('Aucun fournisseur retenu : la demande reste valide, le choix pourra être fait plus tard.', 'warn');
          }
          draft.step = 6;
        }
        saveDraft(); renderWizard(); break;
      }
      case 'pick-supplier': draft.chosenSupplierId = id; saveDraft(); renderWizard(); break;
      /* --- Comparaison des prix (étape 3) : outils de saisie --- */
      case 'nego-prefill':   negoPrefill(); break;
      case 'nego-copyrows':  negoCopyRows(); break;
      case 'nego-copyrow':   negoCopyRow(+id); break;
      case 'nego-clear':     negoClear(); break;
      case 'nego-export':    if (draft) exportComparaison(draft); break;
      case 'nego-pickbest':  negoPickBest(); break;
      case 'submit-request': submitRequest(); break;
      /* --- Commandes / réceptions --- */
      case 'confirm-order':   confirmOrder(id); break;
      case 'view-order':      viewOrderModal(id); break;
      case 'open-reception':  openReception(id); break;
      case 'print-order':     printOrder(id); break;
      case 'print-request':   printRequest(id); break;
      case 'export-requests': exportRequestsExcel(); break;
      case 'export-orders':   exportOrdersExcel(); break;
      /* --- Fournisseurs --- */
      case 'supplier-add':    supplierModal(null); break;
      case 'supplier-edit':   supplierModal(id); break;
      case 'supplier-toggle': { const s = byId(DB.suppliers,id); s.statut = s.statut==='Actif'?'Inactif':'Actif'; saveDB(); toast('Fournisseur ' + (s.statut==='Actif'?'réactivé ✅':'désactivé 🔴'), 'ok'); render(); break; }
      case 'supplier-delete': { const s = byId(DB.suppliers,id); confirmModal('Supprimer définitivement le fournisseur <b>' + esc(s.nom) + '</b> ?', () => { DB.suppliers = DB.suppliers.filter(x=>x.id!==id); saveDB(); toast('Fournisseur supprimé 🗑️', 'ok'); render(); }, 'Supprimer'); break; }
      case 'import-open':     importExportModal(); break;
      case 'download-model':  downloadModel(); break;
      case 'download-model-json': downloadModelJson(); break;
      case 'download-model-xlsx': downloadModelXlsx(); break;
      case 'export-pdf-requests':   exportRequestsPdf(); break;
      case 'export-pdf-orders':     exportOrdersPdf(); break;
      case 'export-pdf-receptions': exportReceptionsPdf(); break;
      case 'export-receptions':     exportReceptionsExcel(); break;
      /* --- Suppressions (administrateur) --- */
      case 'delete-request':   deleteRequest(id); break;
      case 'delete-user':      deleteUser(id); break;
      case 'delete-order':     deleteOrder(id); break;
      case 'delete-reception': deleteReception(id); break;
      case 'export-excel':    exportSuppliersExcel(); break;
      case 'export-json':     exportSuppliersJson(); break;
      case 'export-csv':      exportSuppliersCsv(); break;
      /* --- Utilisateurs --- */
      case 'user-add':  userModal(null); break;
      case 'user-edit': userModal(id); break;
      case 'user-toggle': {
        const u = byId(DB.users,id);
        if (u.id === sessionUser.id){ toast('Vous ne pouvez pas désactiver votre propre compte.', 'warn'); return; }
        u.statut = u.statut==='Actif'?'Inactif':'Actif'; saveDB();
        toast('Utilisateur ' + (u.statut==='Actif'?'réactivé ✅':'désactivé 🔴'), 'ok'); render(); break;
      }
      /* --- Paramètres --- */
      case 'test-son':        testerSons(); break;
      case 'toggle-son': {
        const activer = !sonActif();
        setSonActif(activer);
        if (activer){
          const okAudio = debloquerAudio();
          sonPret = true;
          jouerSonNotif('info', true);      // bip de confirmation immédiat
          toast(okAudio ? 'Sons activés 🔊' : 'Sons activés — cliquez à nouveau sur 🔊 si vous n\'entendez rien', 'ok');
        } else {
          toast('Sons désactivés 🔇', 'ok');
          arreterAlarme(false);
        }
        majBoutonSon();
        break;
      }
      case 'reset-demo': confirmModal('⚠️ Cette action va <b>supprimer toutes les données locales</b> (fournisseurs importés, demandes, commandes…) et recréer le jeu de démonstration. Continuer ?', resetDemo, 'Oui, réinitialiser'); break;
    }
  });

  /* Saisies en direct : totaux des articles, badges de comparaison, filtres */
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('.art input[data-ai]')){
      const i = +t.dataset.ai, f = t.dataset.af;
      const a = draft && draft.articles[i]; if (!a) return;
      a[f] = (f==='quantite'||f==='prix') ? (+t.value||0) : t.value;
      $(`[data-arttotal="${i}"]`).textContent = fmtM((+a.quantite||0)*(+a.prix||0));
      $('[data-art-grand]').textContent = fmtM(totalEstimatif(draft));
      return;
    }
    if (t.matches('#wiz-sup-q')){ wizSupQ = t.value; $('#wiz-sup-list').innerHTML = wizSupplierList(); return; }
    if (t.matches('.cmp input[data-of]')){
      const sid = t.dataset.of;
      draft.offers[sid] = draft.offers[sid] || {prixArticles:{}, delai:0, garantie:0, paiement:'', observations:'', remise:0, fraisLivraison:0};
      const o = draft.offers[sid];
      let idx = null;
      if (t.dataset.ai !== undefined){
        idx = +t.dataset.ai;
        o.prixArticles = o.prixArticles || {};
        o.prixArticles[idx] = +t.value || 0;
      } else {
        const f = t.dataset.f;
        o[f] = (f === 'delai' || f === 'garantie' || f === 'remise' || f === 'fraisLivraison') ? (+t.value || 0) : t.value;
      }
      refreshNegoLive(draft, sid, idx);
      return;
    }
    if (t.dataset && t.dataset.filter === 'req-q'){ fReqQ = t.value; render(); $('[data-filter="req-q"]').focus(); return; }
    if (t.dataset && t.dataset.filter === 'sup-q'){ fSup.q = t.value; refreshSupTable(); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('input[data-sid]')){
      const s = byId(DB.suppliers, t.dataset.sid);
      if (s && s.statut !== 'Actif'){ t.checked = false; return; }
      if (t.checked){ if (!draft.supplierIds.includes(t.dataset.sid)) draft.supplierIds.push(t.dataset.sid); }
      else draft.supplierIds = draft.supplierIds.filter(x => x !== t.dataset.sid);
      t.closest('.pick-item').classList.toggle('sel', t.checked);
      const sc = $('#selcount'); if (sc) sc.innerHTML = `<b>${draft.supplierIds.length}</b> fournisseur(s) sélectionné(s) — la procédure exige au moins <b>3</b> fournisseurs.`;
      return;
    }
    if (t.id === 'wiz-sup-cat'){ wizSupCat = t.value; $('#wiz-sup-list').innerHTML = wizSupplierList(); return; }
    if (t.dataset && t.dataset.meta){
      const k = t.dataset.meta;
      DB.meta = DB.meta || {};
      const numeriques = ['seuilOffres', 'tva', 'delaiAlerte', 'delaiUrgence'];
      DB.meta[k] = numeriques.includes(k) ? Math.max(0, Math.min(k === 'tva' ? 100 : 90, +t.value || 0)) : t.value;
      saveDB(); toast('Paramètre enregistré ✅', 'ok'); render(); return;
    }
    if (t.dataset && t.dataset.alarme){
      const cfg = alarmeCfg(); const k = t.dataset.alarme;
      if (k === 'actif')   cfg.actif = t.value === '1';
      if (k === 'delai')   cfg.delai = Math.max(5, Math.min(600, +t.value || 15));
      if (k === 'max')     cfg.max = Math.max(1, Math.min(100, +t.value || 10));
      if (k === 'niveaux') cfg.niveaux = t.value;
      setAlarmeCfg(cfg);
      alarmeRepetitions = 0;
      toast('Alarme sonore mise à jour ⏰', 'ok');
      render(); return;
    }
    if (t.dataset && t.dataset.son){
      setSonActif(t.value === '1');
      toast(t.value === '1' ? 'Sons de notification activés 🔊' : 'Sons de notification désactivés 🔇', 'ok');
      render(); return;
    }
    if (t.dataset && t.dataset.poids){
      DB.meta = DB.meta || {};
      DB.meta.poids = Object.assign({}, poids(), { [t.dataset.poids]: Math.max(0, Math.min(100, +t.value || 0)) });
      saveDB(); toast('Pondération enregistrée ✅', 'ok'); render(); return;
    }
    if (t.dataset && t.dataset.filter){
      const v = t.value;
      if (t.dataset.filter === 'req-status'){ fReqStatus = v; render(); }
      if (t.dataset.filter === 'sup-statut'){ fSup.statut = v; refreshSupTable(); }
    }
  });
  /* (rafraîchissement du tableau fournisseurs : voir section 10 — refreshSupTable) */

  /* Connexion */
  $('#login-form').addEventListener('submit', e => { e.preventDefault(); doLogin($('#login-id').value.trim(), $('#login-pw').value); });

  /* ---------- Synchronisation Supabase (optionnelle) ---------- */
  function applyRemote(db){
    if (!db) return;
    if (!db.meta) db.meta = DB.meta;                       // méta distante absente : on garde la locale
    if (!Array.isArray(db.users)) return;
    if (state.page === 'nouvelleDemande' || $('#modal-root').classList.contains('open')){
      pendingRemote = db; watchPendingRemote(); return;    // on réessaie dès que c'est sûr
    }
    if (remote && remote.cancelPending) remote.cancelPending();   // plus rien à envoyer : on vient de recevoir le distant
    DB = db; pendingRemote = null;
    storage.setItem(DB_KEY, JSON.stringify(DB));
    if (sessionUser) render();
  }
  /* Réessaie d'appliquer le jeu distant jusqu'à ce que l'écran soit libre */
  let pendingWatch = null;
  function watchPendingRemote(){
    if (pendingWatch) return;
    let tries = 0;
    pendingWatch = setInterval(() => {
      if (!pendingRemote || ++tries > 40){ clearInterval(pendingWatch); pendingWatch = null; return; }
      if (state.page === 'nouvelleDemande' || $('#modal-root').classList.contains('open')) return;
      clearInterval(pendingWatch); pendingWatch = null;
      const db = pendingRemote; pendingRemote = null;
      DB = db; storage.setItem(DB_KEY, JSON.stringify(DB));
      if (sessionUser) render();
    }, 500);
  }
  function hydrateRemote(){
    if (!remote) return;
    remote.fetchAll().then(db => {
      remoteReady = true;
      if (!db){ if (remote.push) remote.push(DB); return; }   // base distante VIDE → on pousse le jeu de démo
      /* Base distante déjà remplie : c'est elle qui fait foi. On ne pousse rien,
         sinon le jeu de démo local du nouvel appareil écraserait les données. */
      applyRemote(db);
      if (sessionUser) toast('☁️ Données synchronisées avec Supabase', 'ok');
    }).catch(err => {
      remoteReady = true;                                     // on autorise la synchro locale
      if (sessionUser) toast('⚠️ Supabase injoignable — fonctionnement local (' + (err && err.message ? err.message : 'erreur') + ')', 'err');
    });
  }
  function startRealtime(){
    if (!remote || typeof remote.subscribe !== 'function') return;
    remote.subscribe(() => {
      if (remote.isSelfWrite && remote.isSelfWrite()) return;    // on ignore nos propres écritures
      remote.fetchAll().then(db => { if (db) applyRemote(db); }).catch(() => {});
    });
  }

  /* Démarrage */
  (function init(){
    remote = (typeof globalThis !== 'undefined' && globalThis.__voomnetSupabase) ? globalThis.__voomnetSupabase : null;
    loadDB();
    const sid = storage.getItem(SESSION_KEY);
    const u = sid ? byId(DB.users, sid) : null;
    if (u && u.statut === 'Actif'){ sessionUser = u; showApp(); }
    else showLogin();
    hydrateRemote();
    startRealtime();
    installerDeblocageAudio();  // débloque l'audio dès la première interaction
    demarrerSurveillanceAlarme();  // alarme répétée tant qu'il reste des notifications non lues
    genererRappels();          // relances automatiques (une seule fois par jour)
    autoriserSons();           // pas de bip au chargement de la page
  })();
  }
