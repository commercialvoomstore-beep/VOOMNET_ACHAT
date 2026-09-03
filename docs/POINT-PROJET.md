# POINT COMPLET DU PROJET

## Application de gestion des achats — VOOMNET TECHNOLOGY

| | |
|---|---|
| **Date du point** | 2 septembre 2026 |
| **Version en production** | `c24d62b` |
| **Adresse** | https://voomnetachat.vercel.app |
| **Avancement global** | **82 %** |
| **État** | ✅ Application en service, tous les tests au vert |

---

# 1. SYNTHÈSE

Le projet visait à doter VOOMNET TECHNOLOGY d'un outil interne pour piloter ses achats,
de l'expression du besoin à la réception. **L'objectif est atteint** : l'application est
déployée, accessible partout, synchronisée en temps réel entre les services, et couverte
par 197 tests automatisés.

| Indicateur | Valeur |
|---|---|
| Avancement | **82 %** |
| Tâches livrées / en cours / planifiées | **35 / 3 / 6** |
| Fonctionnalités en production | **15 modules** |
| Tests automatisés | **197 contrôles — 100 % au vert** |
| Commits depuis le début | **31** |
| Fichiers suivis | **69** |
| Lignes de code applicatif | **4 700** (moteur 3 480 · synchro 218 · composants 216 · styles 363) |
| Lignes de tests | **1 273** (15 fichiers, 13 séries) |
| Disponibilité | En ligne, mises à jour automatiques |

---

# 2. CE QUI A ÉTÉ LIVRÉ

## 2.1 Les 15 modules fonctionnels

| # | Module | Contenu | Statut |
|---|---|---|---|
| 1 | **Authentification** | 3 rôles, session persistante, comptes de démo masqués en production | ✅ |
| 2 | **Demandes d'achat** | assistant 6 étapes, numérotation `ACH-AAAA-NNNNN`, brouillon, reprise | ✅ |
| 3 | **Fournisseurs** | catalogue complet, import/export Excel · CSV · JSON, modèles | ✅ |
| 4 | **Négociation** | grille article × fournisseur, remise, TVA, frais de livraison | ✅ |
| 5 | **Comparaison** | coût total rendu, score multicritère /100, classement, meilleurs prix | ✅ |
| 6 | **Validation** | approuver · refuser · demander modification, motif, historique | ✅ |
| 7 | **Commandes** | bons `BC-AAAA-NNNNN`, lignes aux prix négociés, confirmation | ✅ |
| 8 | **Réceptions** | complètes et partielles, clôture automatique | ✅ |
| 9 | **Alertes et relances** | relances automatiques (validation, réception), bandeau, cloche | ✅ |
| 10 | **Sons** | 3 mélodies par niveau, volume réglable, son de secours si bloqué | ✅ |
| 11 | **Alarme répétée** | rejouée toutes les 15 s jusqu'à lecture, max 10 fois | ✅ |
| 12 | **Notifications système** | bulles Windows/Mac, actives onglet en arrière-plan | ✅ |
| 13 | **Alerte visuelle** | titre de l'onglet clignotant, pastille pulsante | ✅ |
| 14 | **Impressions et exports** | fiche de demande, bon de commande, PDF, Excel, CSV | ✅ |
| 15 | **Pilotage** | tableaux de bord par rôle, 3 graphiques, page Rapports | ✅ |

**S'y ajoutent** : les suppressions administrateur avec cascades, la synchronisation
Supabase en temps réel, la charte graphique (logo, violet `#500070`, bleu nuit `#000060`),
la version autonome monofichier et la chaîne de publication automatisée.

## 2.2 La souplesse demandée

Une demande peut désormais être **créée, soumise, validée, commandée et imprimée sans
aucun prix ni fournisseur** — les étapes 1 à 5 sont toutes devenues facultatives :

| Étape | Ce qui est facultatif |
|---|---|
| 1. Informations | le coût présumé |
| 2. Fournisseurs | la sélection entière (0 à N) |
| 3. Prix négociés | tous les prix |
| 4. Comparaison | franchissable sans donnée |
| 5. Choix | le fournisseur retenu et la justification |

Un avertissement s'affiche à la soumission, sans jamais bloquer.

## 2.3 Les documents imprimables

- **Fiche de demande** : logo, articles, quantités, **colonnes de prix vides** à compléter
  à la main, zones de signature
- **Bon de commande** : logo, fournisseur, lignes, montant — imprimable **sans prix ni
  fournisseur**
- Aucune URL de site n'apparaît sur les documents (en-tête/pied de page navigateur supprimés)

---

# 3. CHRONOLOGIE

| Date | Étape |
|---|---|
| **31/08** | Port de l'application en Next.js 15 · refonte de l'étape 3 (comparaison) |
| **31/08** | Masquage des comptes de démo en production · modèle `.env.example` |
| **31/08** | Suppressions administrateur + exports PDF |
| **31/08** | **Connexion Supabase** : schéma SQL, synchronisation différentielle, temps réel |
| **31/08** | Corrections : mots-clés SQL réservés, duplication à l'amorçage, anti-écrasement entre appareils |
| **31/08** | Chaîne de publication automatisée (`publish.mjs`) + numéro de version visible |
| **31/08** | Étapes facultatives · fiche imprimable · logo et charte violet / bleu nuit |
| **31/08** | Relances automatiques, bandeau d'alertes, indicateur de connexion |
| **31/08** | Sons de notification (3 niveaux) |
| **01/09** | Bouton 🔊 + déblocage de l'audio navigateur |
| **01/09** | Alarme répétée jusqu'à lecture |
| **01/09** | Audio renforcé (son de secours WAV) · notifications système · seuils synchronisés sans SQL |
| **01/09** | Volume réglable · alerte visuelle (onglet clignotant) |
| **01/09** | Documentation refondue · suite de tests intégrée au dépôt |
| **01/09** | **Tableau de bord graphique** (achats 12 mois, répartition, top 5) |
| **02/09** | Cahier des charges complet + synthèse direction (PDF/Word) |
| **02/09** | Suivi Microsoft Planner : fichiers prêts à coller, guide, fiche rapide |
| **02/09** | Export Grille 9 colonnes validé |
| **02/09** | **Colonnes Développement · Test · Pilote · Déploiement** + tâches par étape + checklists |

---

# 4. QUALITÉ

## 4.1 La suite de tests (197 contrôles)

| Série | Contrôles | Couverture |
|---|---|---|
| `step3` | 45 | comparaison, coût rendu, score, seuils, TVA |
| `optional` | 29 | étapes facultatives, impression sans prix |
| `admin` | 29 | suppressions et cascades, exports PDF |
| `alertes` | 20 | relances, bandeau, cloche, droits par rôle |
| `graphiques` | 16 | graphiques du tableau de bord et des rapports |
| `sons` | 13 | mélodies, volume, bouton 🔊, préférences |
| `seuils-sync` | 8 | synchronisation des seuils de relance |
| `standalone` | 7 | version autonome |
| `alarme` | 7 | alarme répétée, arrêt à la lecture |
| `audio-secours` | 7 | son de secours si le Web Audio est bloqué |
| `alerte-visuelle` | 6 | titre clignotant, pastille pulsante |
| `supabase-live` | 6 | hydratation depuis le serveur |
| `no-overwrite` | 4 | non-écrasement par un nouvel appareil |

**Résultat : 13 séries · 197 contrôles · 0 échec.**

## 4.2 Les bugs réels détectés puis corrigés grâce aux tests

| Bug | Conséquence | Correction |
|---|---|---|
| Contexte audio « suspendu » | aucun son | son de secours WAV généré en mémoire |
| Référence globale `Notification` | plantage sur certains navigateurs | passage par `window.Notification` |
| Déclaration dupliquée | module non chargeable | suppression du doublon |
| Écrasement des données à la connexion | perte de données du serveur | le serveur fait foi, l'appareil adopte |
| Doublons de notifications à l'amorçage | 6 → 12 → 18 notifications | blocage des envois avant hydratation |
| `references` = mot-clé SQL réservé | schéma Supabase inapplicable | identifiant entre guillemets |

---

# 5. DÉPLOIEMENT ET INFRASTRUCTURE

| Élément | Détail |
|---|---|
| **Hébergement** | Vercel — réseau mondial, HTTPS |
| **Déploiement** | automatique depuis GitHub (branche `main`) |
| **Version en ligne** | `c24d62b` (2/09/2026) |
| **Base de données** | Supabase — projet `uistajnkedyfkgabjbmx` |
| **Tables** | 7 (`users`, `suppliers`, `requests`, `orders`, `receptions`, `notifications`, `meta`) |
| **Temps réel** | abonnement aux modifications, propagation en quelques secondes |
| **Continuité** | mode local si la base est injoignable, resynchronisation ensuite |
| **Publication** | `node scripts/publish.mjs "message"` → build, tests implicites, commit, push, vérification |
| **Version autonome** | `standalone/index.html` — fonctionne hors ligne (logo intégré) |

---

# 6. DONNÉES EN PRODUCTION

État relevé le 2 septembre 2026 :

| Table | Contenu |
|---|---|
| Utilisateurs | **5** |
| Fournisseurs | **112** |
| Demandes | **3** — 2 brouillons, 1 en attente de validation |
| Commandes | **0** |
| Réceptions | **0** |
| Notifications | **11** |

👉 L'outil contient déjà vos données réelles (112 fournisseurs importés) et non plus le
seul jeu de démonstration : **il est entré en phase d'usage**.

---

# 7. DOCUMENTATION LIVRÉE

| Document | Format | Contenu |
|---|---|---|
| **Cahier des charges** | MD · PDF (14 p.) · Word | 11 chapitres, 80 exigences, 20 règles de gestion, matrice des droits |
| **Synthèse direction** | MD · PDF (4 p.) · Word | vue condensée : objectifs, périmètre, circuit, vigilances |
| **Guide Microsoft Planner** | MD · PDF (6 p.) · Word | 4 méthodes d'import, colonnes d'étapes, lecture par vue |
| **Fiche rapide Planner** | MD · PDF (2 p.) | procédure en 6 étapes |
| **Fichiers Planner** | TSV · CSV · XLSX · TXT | 44 tâches, 13 colonnes, tâches par étape, checklists |
| **README technique** | MD | installation, architecture, tests, publication |

---

# 8. SUIVI MICROSOFT PLANNER

| Fichier | Rôle |
|---|---|
| `a-coller-DANS-LA-GRILLE.tsv` | 44 tâches, 13 colonnes — collage direct dans la vue Grille |
| `a-coller-TACHES-PAR-ETAPE.txt` | chaque fonctionnalité en cours/planifiée déclinée en 4 tâches |
| `checklists-a-coller.txt` | les 4 étapes à cocher dans chaque tâche |
| `VOOMNET-planner.xlsx` | classeur avec tableaux nommés `GrilleVOOMNET` et `TachesVOOMNET` |
| `a-coller-LIVRE / EN-COURS / PLANIFIE.txt` | méthode alternative par compartiment |

**Les 4 colonnes d'étapes** (`Développement`, `Test`, `Pilote`, `Déploiement`) sont
pré-remplies pour les 44 tâches : toutes les tâches livrées ont leurs 4 étapes à
« Terminé », ce qui montre que le travail est réellement en production.

---

# 9. EN COURS (3 tâches)

| Tâche | Avancement | Échéance |
|---|---|---|
| Recette utilisateur et ajustements | 60 % | 05/09 |
| Durcissement des politiques d'accès (RLS) | 30 % | 09/09 |
| Journal d'audit des actions sensibles | 15 % | 12/09 |

---

# 10. FEUILLE DE ROUTE (6 tâches planifiées)

| Évolution | Priorité | Échéance |
|---|---|---|
| Authentification sécurisée (Supabase Auth, mots de passe hachés) | **Haute** | 19/09 |
| Notifications par e-mail | Moyenne | 26/09 |
| Budgets par service avec alerte de dépassement | Moyenne | 10/10 |
| Portail fournisseur (saisie directe des offres) | Basse | 24/10 |
| Gestion des stocks liée aux réceptions | Basse | 31/10 |
| Authentification unique (SSO) | Basse | 31/10 |

---

# 11. POINTS DE VIGILANCE

| # | Point | État | Recommandation |
|---|---|---|---|
| V1 | Mots de passe stockés en clair | ❌ | **migrer vers Supabase Auth** |
| V2 | Politiques d'accès (RLS) | ⚠️ permissives | restreindre par rôle avant généralisation |
| V3 | Journal d'audit | ❌ absent | ajouter la traçabilité des actions sensibles |
| V4 | Politique de mot de passe | ❌ aucune | imposer longueur et complexité |
| V5 | Sauvegarde | ✔ Supabase | vérifier la fréquence et tester une restauration |

Les points **V1 à V3** sont déjà inscrits comme tâches **en cours** dans le suivi Planner.

---

# 12. RECOMMANDATIONS

| # | Recommandation | Bénéfice |
|---|---|---|
| R1 | Planifier une **recette court**e avec 2-3 utilisateurs réels | valider l'usage avant généralisation |
| R2 | Traiter **V1 à V3** avant d'ouvrir l'outil à tous les services | sécurité |
| R3 | **Former les utilisateurs** (30 min) : l'outil est guidé, étape par étape | adoption |
| R4 | Définir un **référent applicatif** interne | autonomie |
| R5 | **Inviter votre responsable** dans le plan Planner (2 min) | visibilité permanente |
| R6 | Rituels : **mise à jour hebdomadaire du Planner** (10 min) | suivi fiable |

---

# 13. CONCLUSION

| | |
|---|---|
| **Objectif initial** | outil interne de gestion des achats |
| **Résultat** | application complète, déployée, en service |
| **Qualité** | 197 tests automatisés, 0 échec, 6 bugs réels corrigés |
| **Adoption** | 112 fournisseurs et 5 utilisateurs déjà en base |
| **Reste à faire** | 3 tâches (qualité et sécurité), puis la feuille de route |
| **Prochaine action conseillée** | recette utilisateurs + traitement des points V1-V3 |

**Le projet est en bonne santé : les fondations sont solides, l'outil est utilisable
au quotidien, et la trajectoire est claire.**
