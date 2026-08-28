# VOOMNET TECHNOLOGY — Gestion des Achats (version Next.js)

Portage **à l'identique** de l'application `index.html` (démonstration 100 % front-end)
vers **Next.js 15 (App Router)**. Aucune configuration, aucune règle de gestion et
aucune fonctionnalité n'a été modifiée : mêmes écrans, mêmes données, mêmes comptes,
même clé de stockage (`voomnet_achats_v3`).

---

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

Autres commandes :

```bash
npm run build    # build de production
npm start        # serveur de production
npm run lint     # ESLint
```

Aucun serveur, aucune base de données externe n'est nécessaire : toutes les données
sont conservées dans le `localStorage` du navigateur.

---

## Comptes de démonstration

| Rôle           | Identifiant | Mot de passe |
|----------------|-------------|--------------|
| Administrateur | `admin`     | `admin123`   |
| Demandeur      | `demandeur` | `demo123`    |
| Responsable    | `responsable` | `demo123`  |

---

## Correspondance avec la version `index.html`

| Version d'origine (`index.html`) | Version Next.js |
|----------------------------------|-----------------|
| `<style>` (lignes 10 à 286)      | `app/globals.css` (copie stricte) |
| `<script>` (lignes 356 à 2116)   | `lib/voomnet.js` — moteur applicatif, **code repris à l'identique**, encapsulé dans `initVoomnet()` |
| Balisage de l'écran de connexion | `components/LoginScreen.tsx` |
| Structure de l'application (sidebar, topbar) | `components/AppShell.tsx` |
| Amorçage (chargement SheetJS + moteur) | `components/VoomnetApp.tsx` (composant client) |
| Page d'accueil                   | `app/page.tsx` |
| `<title>` / `<html lang="fr">`   | `app/layout.tsx` (métadonnées Next.js) |
| Script CDN SheetJS (`xlsx@0.18.5`) | chargé dynamiquement par `components/VoomnetApp.tsx` **avant** l'initialisation du moteur (même URL, même version) |
| `modele_fournisseurs_voomnet.csv` / `.json` | `public/` |

Les écrans (tableaux de bord, demandes, assistant 5 étapes, fournisseurs,
commandes, réceptions, rapports, paramètres) restent produits par le moteur
dans `#page-content`, `#modal-root` et `#toast-root` : le rendu HTML est
strictement le même que dans la version d'origine.

---

## Processus applicatif (inchangé)

1. Le **demandeur** crée une demande (articles, quantités, coût présumé → somme globale calculée).
2. Il sélectionne **au moins 3 fournisseurs** (emplacement, WhatsApp `wa.me`, site internet, références).
3. Il les contacte puis saisit les prix reçus : 💰 prix le plus bas, 🚚 livraison la plus rapide,
   🛡️ meilleure garantie sont mis en évidence automatiquement.
4. Il choisit le fournisseur retenu + justification, puis soumet la demande.
5. Le **responsable** approuve / refuse / demande une modification.
6. Création du bon de commande `BC-AAAA-NNNNN` (impression possible), puis réception complète ou partielle.
7. La demande passe en **✓ CLÔTURÉE** (timeline complète visible).

### Rôles et droits

* **Administrateur** : tous les droits — fournisseurs (ajout / modification / désactivation / suppression),
  import-export Excel·CSV·JSON, utilisateurs, toutes les demandes, commandes, réceptions, rapports, paramètres.
* **Demandeur** : crée et suit ses demandes, catalogue fournisseurs, comparaison des offres,
  ses commandes et réceptions.
* **Responsable** : valide les demandes soumises et consulte l'historique de ses validations.

---

## Import / Export des fournisseurs (menu 🏢 Fournisseurs, admin)

* **Import** : bouton « 📥📤 Importer / Exporter » → `.xlsx`, `.xls`, `.csv` ou `.json`
  → aperçu et contrôle (« X fournisseurs détectés », lignes invalides signalées sans bloquer les valides)
  → « ✓ Importer les fournisseurs ».
* **Export** : Excel (`.xlsx`), JSON, CSV (secours).
* **Modèles** : téléchargeables depuis l'application (également fournis dans `public/`).

Champs : `FOURNISSEUR NOM · RÉFÉRENCES · EMPLACEMENT · WHATSAPP · SITE INTERNET` (+ `STATUT`).

---

## Stockage des données

Toutes les données sont conservées dans le `localStorage` du navigateur
(clé `voomnet_achats_v3`, session : `voomnet_session_v1`). Elles persistent entre les
sessions sur le même poste / navigateur et ne sont pas partagées entre plusieurs postes.

Réinitialisation : **admin → ⚙️ Paramètres → « Réinitialiser les données de démonstration »**
(recrée 5 utilisateurs, 10 fournisseurs, 5 demandes, 2 commandes, 2 réceptions).

---

## Évolution vers un vrai backend

Toutes les lectures/écritures passent par une couche unique (`loadDB` / `saveDB`,
section 2 de `lib/voomnet.js`). Pour brancher une API REST, il suffit de remplacer
cette couche par des appels `fetch()` : le reste de l'application ne change pas.
