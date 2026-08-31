/* ================================================================
   VOOMNET TECHNOLOGY — Couche de synchronisation Supabase
   ----------------------------------------------------------------
   Rôle : garder l'objet DB (déjà utilisé par tous les écrans) en
   miroir d'une base Supabase, SANS modifier la logique métier.

   Principe :
     • l'application continue de travailler sur l'objet DB en mémoire ;
     • saveDB() déclenche une synchro DIFFÉRÉE (400 ms) qui n'envoie
       que les lignes ajoutées / modifiées / supprimées ;
     • au démarrage, on charge depuis Supabase (après l'affichage du
       cache local, pour rester instantané) ;
     • le temps réel (postgres_changes) rafraîchit les autres postes.

   Ce fichier est partagé : importé par Next.js et inliné tel quel
   dans la version autonome index.html (le générateur retire « export »).
   ================================================================ */

const VN_TABLES = ['users', 'suppliers', 'requests', 'orders', 'receptions', 'notifications', 'meta'];

/* Les colonnes delai_alerte / delai_urgence sont optionnelles : elles n'existent
   que si le script SQL correspondant a été exécuté. Positionné automatiquement
   à la première lecture de la table meta. */
let metaColonnesDelais = false;

/* ---------- Objets métier  <->  lignes SQL ---------- */
const VN_MAP = {
  users: {
    to: u => ({ id: u.id, nom: u.nom, identifiant: u.identifiant, email: u.email || '', tel: u.tel || '', service: u.service || '', fonction: u.fonction || '', password: u.password || '', role: u.role, statut: u.statut }),
    from: r => ({ id: r.id, nom: r.nom, identifiant: r.identifiant, email: r.email, tel: r.tel, service: r.service, fonction: r.fonction, password: r.password, role: r.role, statut: r.statut })
  },
  suppliers: {
    to: s => ({ id: s.id, nom: s.nom, references: s.references || '', emplacement: s.emplacement || '', whatsapp: s.whatsapp || '', site: s.site || '', statut: s.statut }),
    from: r => ({ id: r.id, nom: r.nom, references: r.references, emplacement: r.emplacement, whatsapp: r.whatsapp, site: r.site, statut: r.statut })
  },
  requests: {
    to: r => ({ id: r.id, numero: r.numero, date: r.date, demandeur_id: r.demandeurId, service: r.service || '', priorite: r.priorite, motif: r.motif || '', articles: r.articles || [], supplier_ids: r.supplierIds || [], offers: r.offers || {}, chosen_supplier_id: r.chosenSupplierId || null, justification: r.justification || '', statut: r.statut, submitted_at: r.submittedAt || null, step: r.step || null, validation: r.validation || null, history: r.history || [] }),
    from: r => ({ id: r.id, numero: r.numero, date: r.date, demandeurId: r.demandeur_id, service: r.service, priorite: r.priorite, motif: r.motif, articles: r.articles || [], supplierIds: r.supplier_ids || [], offers: r.offers || {}, chosenSupplierId: r.chosen_supplier_id || null, justification: r.justification, statut: r.statut, submittedAt: r.submitted_at || null, step: r.step || null, validation: r.validation || null, history: r.history || [] })
  },
  orders: {
    to: o => ({ id: o.id, numero: o.numero, request_id: o.requestId, supplier_id: o.supplierId, date: o.date, total: +o.total || 0, delai: o.delai || '', statut: o.statut, lignes: o.lignes || [] }),
    from: r => ({ id: r.id, numero: r.numero, requestId: r.request_id, supplierId: r.supplier_id, date: r.date, total: +r.total || 0, delai: r.delai, statut: r.statut, lignes: r.lignes || [] })
  },
  receptions: {
    to: x => ({ id: x.id, order_id: x.orderId, date: x.date || null, observations: x.observations || '', statut: x.statut, lignes: x.lignes || [] }),
    from: r => ({ id: r.id, orderId: r.order_id, date: r.date || null, observations: r.observations, statut: r.statut, lignes: r.lignes || [] })
  },
  notifications: {
    to: n => ({ id: n.id, user_id: n.userId, texte: n.texte, date: n.date, lu: !!n.lu }),
    from: r => ({ id: r.id, userId: r.user_id, texte: r.texte, date: r.date, lu: !!r.lu })
  },
  meta: {
    /* Les colonnes delai_alerte / delai_urgence sont optionnelles : elles n'existent
       que si l'administrateur a exécuté le script SQL correspondant. La synchro les
       utilise dès qu'elles sont présentes, et les ignore sinon (aucune erreur). */
    to: m => {
      const o = { id: 'app', ach_counter: +m.achCounter || 0, bc_counter: +m.bcCounter || 0,
                  seuil_offres: +m.seuilOffres || 0, tva: +m.tva || 0, poids: m.poids || {} };
      if (metaColonnesDelais){
        o.delai_alerte = m.delaiAlerte === undefined ? 3 : Math.max(0, +m.delaiAlerte || 0);
        o.delai_urgence = m.delaiUrgence === undefined ? 7 : Math.max(1, +m.delaiUrgence || 7);
      }
      return o;
    },
    from: r => {
      metaColonnesDelais = Object.prototype.hasOwnProperty.call(r, 'delai_alerte');
      return {
        achCounter: +r.ach_counter || 0, bcCounter: +r.bc_counter || 0,
        seuilOffres: r.seuil_offres === undefined || r.seuil_offres === null ? 0 : +r.seuil_offres,
        tva: +r.tva || 0, poids: r.poids || {},
        delaiAlerte: (r.delai_alerte === undefined || r.delai_alerte === null) ? 3 : +r.delai_alerte,
        delaiUrgence: (r.delai_urgence === undefined || r.delai_urgence === null) ? 7 : +r.delai_urgence
      };
    }
  }
};

export function createSupabaseSync(createClient, url, key) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const snapshot = {};                 // table -> Map(id -> JSON de la ligne)
  let timer = null, busy = false, selfUntil = 0;
  let lastError = null, lastSyncAt = null;

  const rowsOf = (db, t) => (t === 'meta' ? [VN_MAP.meta.to((db && db.meta) || {})] : ((db && db[t]) || []).map(VN_MAP[t].to));
  const snapOf = rows => new Map(rows.map(r => [r.id, JSON.stringify(r)]));

  /* ---------- Lecture ---------- */
  async function fetchAll() {
    const out = {};
    for (const t of VN_TABLES) {
      const { data, error } = await client.from(t).select('*');
      if (error) { lastError = error.message; throw new Error(t + ' : ' + error.message); }
      if (t === 'meta') { out.meta = data && data.length ? VN_MAP.meta.from(data[0]) : null; }
      else out[t] = (data || []).map(VN_MAP[t].from);
    }
    /* base vide : on ne renvoie rien, l'app poussera son jeu de démo au 1er saveDB() */
    if (!out.users || !out.users.length) return null;
    if (!out.meta) out.meta = null;
    VN_TABLES.forEach(t => { snapshot[t] = snapOf(rowsOf(out, t)); });
    return out;
  }

  /* ---------- Écriture (différentielle) ---------- */
  async function push(db) {
    if (busy) { timer = setTimeout(() => push(db), 500); return; }
    busy = true; selfUntil = Date.now() + 1500;
    try {
      for (const t of VN_TABLES) {
        const rows = rowsOf(db, t);
        const next = snapOf(rows);
        const prev = snapshot[t] || new Map();
        if (t === 'meta') {
          const changed = !prev.size || prev.get('app') !== next.get('app');
          if (changed) {
            const { error } = await client.from('meta').upsert(rows);
            if (error) throw new Error('meta : ' + error.message);
          }
          snapshot[t] = next; continue;
        }
        const upserts = rows.filter(r => prev.get(r.id) !== next.get(r.id));
        const deletes = [...prev.keys()].filter(id => !next.has(id));
        if (upserts.length) {
          const { error } = await client.from(t).upsert(upserts);
          if (error) throw new Error(t + ' : ' + error.message);
        }
        if (deletes.length) {
          const { error } = await client.from(t).delete().in('id', deletes);
          if (error) throw new Error(t + ' (suppression) : ' + error.message);
        }
        snapshot[t] = next;
      }
      lastError = null; lastSyncAt = Date.now();
      return true;
    } catch (e) {
      lastError = e.message;
      return false;
    } finally {
      busy = false;
    }
  }
  /* Synchro différée : plusieurs saveDB() rapprochés = un seul aller-retour.
     « getDB » est une fonction : on pousse toujours l'état COURANT de
     l'application (jamais un instantané périmé capturé avant hydratation). */
  function sync(getDB) {
    clearTimeout(timer);
    timer = setTimeout(() => { push(typeof getDB === 'function' ? getDB() : getDB); }, 400);
  }
  /* Annule un envoi en attente (appelé juste après l'hydratation distante) */
  function cancelPending() { clearTimeout(timer); }

  /* ---------- Réinitialisation : on remplace tout le distant ---------- */
  async function reset(db) {
    busy = true; selfUntil = Date.now() + 3000;
    try {
      for (const t of ['notifications', 'receptions', 'orders', 'requests', 'suppliers', 'users', 'meta']) {
        const { error } = await client.from(t).delete().neq('id', '__rien__');
        if (error) throw new Error(t + ' : ' + error.message);
      }
      for (const t of VN_TABLES) {
        const rows = rowsOf(db, t);
        if (rows.length) {
          const { error } = await client.from(t).insert(rows);
          if (error) throw new Error(t + ' : ' + error.message);
        }
        snapshot[t] = snapOf(rows);
      }
      return true;
    } catch (e) { lastError = e.message; return false; }
    finally { busy = false; }
  }

  /* ---------- Temps réel ---------- */
  function subscribe(onChange) {
    try {
      const ch = client.channel('voomnet-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          if (Date.now() < selfUntil) return;      // on ignore nos propres écritures
          onChange();
        })
        .subscribe();
      return () => { try { client.removeChannel(ch); } catch (e) { /* ignoré */ } };
    } catch (e) { return () => {}; }
  }

  return {
    client,
    enabled: () => true,
    tables: VN_TABLES,
    fetchAll, sync, push, reset, subscribe, cancelPending,
    getError: () => lastError,
    isSelfWrite: () => Date.now() < selfUntil,
    /* état affiché dans ⚙️ Paramètres (utile pour vérifier un déploiement Vercel) */
    status: () => ({
      configured: true,
      project: (String(url).replace(/^https?:\/\//, "").split(".")[0]) || "",
      online: !lastError,
      error: lastError,
      lastSyncAt: lastSyncAt
    })
  };
}
