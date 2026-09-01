# VOOMNET TECHNOLOGY — Gestion des Achats

Application web de gestion des achats (Next.js 15) : demandes, consultation et comparaison
des fournisseurs, validation, bons de commande, réceptions, alertes et rapports.

**En ligne :** https://voomnetachat.vercel.app · **Données :** Supabase (temps réel)

---

## Démarrer

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # 181 contrôles automatisés
npm run build     # compilation de production
```

Comptes de démonstration : `admin / admin123` · `demandeur / demo123` · `responsable / demo123`

---

## Processus d'achat — assistant en 6 étapes

| Étape | Contenu | Caractère |
|---|---|---|
| **1. Informations** | articles, quantités, coût présumé (somme globale calculée), motif | le **coût présumé est facultatif** |
| **2. Fournisseurs** | sélection avec coordonnées (WhatsApp, site, références) | **facultatif** (3 consultations recommandées) |
| **3. Prix négociés** | grille article × fournisseur, remise, TVA, frais de livraison | **facultatif** |
| **4. Comparaison** | tableau croisé automatique, meilleurs prix surlignés | **facultative** |
| **5. Choix** | fournisseur retenu + justification | **facultatif** |
| **6. Récapitulatif** | récapitulatif complet, impression, soumission | — |

Une demande peut donc être créée, imprimée et soumise **sans aucun prix ni fournisseur**.

### Comparaison des prix (étape 3)

- **Coût total rendu** : total articles − remise + TVA + frais de livraison
- **Score multicritère /100** : prix · délai · garantie · conditions de paiement (pondération réglable)
- **Classement** des fournisseurs, meilleur prix par article surligné en vert
- **Seuil d'offres complètes** : `0` = prix facultatifs (défaut), sinon 1 à 10
- Outils : pré-remplissage avec le coût présumé, recopie par ligne, export Excel/CSV de la grille

---

## Alertes, sons et notifications

### Relances automatiques
| Situation | Destinataire |
|---|---|
| Demande non validée | tous les responsables actifs |
| Commande non réceptionnée / réception partielle | le demandeur concerné (+ admins si urgence) |

Deux seuils réglables : **alerte** (🟠) puis **urgence** (🔴). Une même relance n'est envoyée
qu'une fois par jour et par personne.

### Trois canaux d'alerte simultanés
1. **🔊 Son de l'application** — mélodies générées par le navigateur :
   🔵 info (1 note) · 🟠 alerte (2 notes) · 🔴 urgence (3 notes aiguës)
2. **🔔 Notification du navigateur** (bulle Windows/Mac) — fonctionne **même onglet en arrière-plan**
3. **👁️ Alerte visuelle** — le titre de l'onglet clignote `🔴 N ALERTES` et la pastille de la cloche pulse

### Alarme répétée
Tant qu'il reste des notifications non lues, la mélodie est **rejouée toutes les 15 s**.
Elle s'arrête dès la lecture (avec un bip d'acquittement), via le bouton 🔇, ou après 10 répétitions.

### Réglages (⚙️ Paramètres)
Sons activés/coupés (bouton 🔊 dans la barre du haut) · volume (faible/moyen/fort) ·
alarme répétée (activée, intervalle, nombre max, niveaux concernés) · notifications du navigateur ·
seuils de relance · pondération du score · TVA · seuil d'offres complètes.

---

## Tableau de bord graphique

Graphiques générés en **SVG pur** (aucune bibliothèque) :

- **📈 Achats confirmés — 12 derniers mois** (histogramme, montants par mois)
- **🍩 Répartition des demandes par statut** (anneau avec légende et pourcentages)
- **🏅 Top 5 fournisseurs** (histogramme des montants commandés)
- les mêmes graphiques sur la page **Rapports**, avec l'évolution mensuelle

Chaque barre/segment affiche une infobulle au survol (libellé + montant).

---

## Suppressions (administrateur)

🗑️ sur les demandes, utilisateurs, commandes et réceptions, avec confirmation :

- **Demande** → supprime aussi ses commandes, réceptions et notifications
- **Commande** → la demande redevient « APPROUVÉE »
- **Réception** → la commande redevient « à réceptionner »
- **Utilisateur** → refusé s'il est rattaché à des demandes (le désactiver plutôt)

Chaque suppression est tracée dans l'historique.

---

## Impression et exports

| Document | Contenu |
|---|---|
| **Fiche de demande** | logo, articles, quantités, **colonnes de prix vides** à compléter à la main, signatures |
| **Bon de commande** | logo, fournisseur, lignes, montant (imprimable même sans prix ni fournisseur) |
| **PDF** | demandes, commandes, réceptions (jsPDF) |
| **Excel / CSV** | demandes, commandes, réceptions, fournisseurs, grille de comparaison |

---

## Supabase

Les données sont **partagées en temps réel** entre tous les postes.

- **Schéma** : `supabase/schema.sql` (7 tables + RLS + temps réel)
- **Configuration** : `.env.local`
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci…      (clé « anon » uniquement)
  ```
- **Sans ces variables**, l'application fonctionne en mode local (localStorage) — aucun plantage
- **Règle de sécurité** : le serveur fait foi au démarrage ; un nouvel appareil **adopte** les données
  au lieu de les écraser
- **Synchronisé** : compteurs ACH/BC, seuil des prix, TVA, pondération, **seuils de relance**
  (ces derniers voyagent dans la colonne JSONB `poids`, **sans colonne SQL supplémentaire**)
- **Local à chaque navigateur** (volontairement) : sons, volume, alarme — chaque utilisateur choisit

⚠️ Les seuils de relance modifiés sur un poste sont repris par les autres à leur **prochain rechargement**.

---

## Tests

```bash
npm test
```

13 séries, **197 contrôles** (jsdom + faux client Supabase) :

| Série | Contrôles | Objet |
|---|---|---|
| `step3` | 45 | comparaison des prix, coût rendu, score, seuils |
| `optional` | 29 | étapes facultatives, impression sans prix |
| `admin` | 29 | suppressions, exports PDF |
| `alertes` | 20 | relances, cloche, bandeau |
| `sons` | 13 | mélodies, bouton 🔊, préférences |
| `alarme` | 7 | alarme répétée, arrêt à la lecture |
| `audio-secours` | 7 | son de secours si Web Audio bloqué |
| `seuils-sync` | 8 | synchronisation des seuils |
| `alerte-visuelle` | 6 | titre clignotant, pastille |
| `supabase-live` | 6 | hydratation depuis le serveur (réseau) |
| `standalone` | 7 | version autonome |
| `graphiques` | 16 | graphiques du tableau de bord et des rapports |
| `no-overwrite` | 4 | non-écrasement par un nouvel appareil (réseau) |

---

## Chaîne de publication (centre de commandement)

```
   modifications du code
            │
            ▼
   node scripts/publish.mjs "message"     ← une seule commande
            │
            ├─0. installe les dépendances si besoin
            ├─1. régénère standalone/index.html
            ├─2. npm run build  (TypeScript + ESLint)
            ├─3. git commit
            ├─4. git push → GitHub (branche main)
            └─5. attend le redéploiement Vercel et le vérifie
            │
            ▼
   GitHub  ──(auto)──►  Vercel  ──►  https://voomnetachat.vercel.app
```

Le numéro de commit déployé est visible dans le code source de la page :
`<meta name="voomnet-build" content="154b097">`.

Reste à faire de votre côté (une seule fois) : les **variables d'environnement Vercel** et
l'exécution initiale du **schéma SQL Supabase**.

---

## Version autonome

`standalone/index.html` (un seul fichier, fonctionne hors ligne) :

```bash
node scripts/gen-standalone.mjs
# avec Supabase :
node scripts/gen-standalone.mjs --supabase-url=… --supabase-key=…
```

Le logo y est intégré en base64 ; sans clés, il fonctionne en mode local.

---

## Architecture

| Fichier | Rôle |
|---|---|
| `lib/voomnet.js` | moteur applicatif (données, règles de gestion, écrans) |
| `lib/supabaseSync.js` | synchronisation Supabase (différentielle, temps réel) |
| `components/` | coquille React (connexion, barre latérale, amorçage) |
| `app/globals.css` | thème violet `#500070` / bleu nuit `#000060` |
| `scripts/` | publication, génération de la version autonome |
| `supabase/schema.sql` | schéma de la base |

Toutes les lectures/écritures passent par `loadDB` / `saveDB` : pour brancher une autre API,
il suffit de remplacer cette couche.
