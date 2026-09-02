# VOOMNET TECHNOLOGY — Application de gestion des achats

## Synthèse pour la direction

| | |
|---|---|
| **Projet** | Refonte du processus d'achat : de la demande à la réception |
| **Livrable** | Application web, accessible sur navigateur et mobile |
| **État** | Développée, testée et mise en service |
| **Adresse** | https://voomnetachat.vercel.app |
| **Données** | Hébergées sur Supabase, partagées en temps réel entre les services |

---

## 1. Pourquoi ce projet

Le circuit d'achat reposait jusqu'ici sur des échanges informels (téléphone, tableurs),
sans traçabilité ni comparaison structurée des offres. L'application apporte :

| Objectif | Bénéfice attendu |
|---|---|
| Dématérialiser le circuit | une seule source d'information, accessible partout |
| Systématiser la comparaison | au moins 3 fournisseurs consultés par achat |
| Tracer les décisions | historique horodaté : qui a demandé, validé, commandé, réceptionné |
| Fiabiliser la numérotation | identifiants uniques `ACH-…` et `BC-…`, sans doublon |
| Accélérer les validations | relances automatiques en cas de retard |
| Piloter l'activité | tableaux de bord et graphiques (achats mensuels, répartition, top fournisseurs) |

---

## 2. Ce que couvre l'application

- **Demandes d'achat** — création en 6 étapes, avec articles, quantités et estimations
- **Catalogue fournisseurs** — fiches complètes, import/export Excel, CSV et JSON
- **Consultation et négociation** — grille de prix par article et par fournisseur
- **Comparaison** — coût total rendu (remise, TVA, livraison), score multicritère, classement
- **Validation** — approuver, refuser ou demander une modification, avec motif
- **Commandes et réceptions** — bons de commande imprimables, réceptions complètes ou partielles
- **Alertes** — relances automatiques, signal sonore, bulles système, clignotement de l'onglet
- **Rapports et exports** — PDF, Excel, CSV, impressions avec le logo de l'entreprise

**Souplesse voulue** : une demande peut être créée, soumise et imprimée **sans aucun prix
ni fournisseur** — cas fréquent lorsque les consultations sont encore en cours.

---

## 3. Qui fait quoi

| Fonction | Demandeur | Responsable | Administrateur |
|---|:--:|:--:|:--:|
| Créer une demande | ✔ | — | ✔ |
| Consulter les fournisseurs | ✔ | — | ✔ |
| Gérer le catalogue fournisseurs | — | — | ✔ |
| Valider / refuser / demander une modification | — | ✔ | — |
| Créer les commandes et réceptions | ✔ (les siennes) | — | ✔ |
| Supprimer (demande, commande, réception, utilisateur) | — | — | ✔ |
| Exporter et imprimer | ✔ (ses données) | ✔ | ✔ (toutes) |
| Paramétrer l'application | — | — | ✔ |

Chaque utilisateur n'accède qu'aux données qui le concernent ; un demandeur ne voit pas
les demandes des autres services.

---

## 4. Circuit d'un achat

```
Demandeur : 1. Informations → 2. Fournisseurs → 3. Prix négociés
          → 4. Comparaison → 5. Choix + justification → 6. Soumission
              │
Responsable : Approuver · Refuser (motif) · Demander une modification
              │
Demandeur   : Création du bon de commande → Confirmation
              │
Demandeur   : Réception (complète ou partielle) → Clôture de la demande ✔
```

Chaque étape est horodatée et conservée dans l'historique de la demande.

---

## 5. Principales règles de gestion

1. Toute demande reçoit un **numéro unique définitif** dès sa création
2. Un article exige une désignation et une quantité ; **le coût estimé est facultatif**
3. Le **coût total rendu** intègre remise, TVA et frais de livraison
4. Un fournisseur n'ayant pas chiffré tous les articles est **exclu du classement**
5. Un refus ou une demande de modification **exige un motif**
6. Une commande ne peut être créée que sur une demande **approuvée**
7. Une **réception complète clôture** la demande ; une réception partielle reste complétable
8. La suppression d'une demande entraîne celle de ses commandes et réceptions
9. Les **relances** partent automatiquement après le délai fixé (une fois par jour)
10. Un utilisateur rattaché à des demandes ne peut pas être supprimé, seulement désactivé

---

## 6. Architecture et exploitation

- **Application** : Next.js 15 / React, déployée sur **Vercel** (réseau mondial, HTTPS)
- **Base de données** : **Supabase** (PostgreSQL), synchronisation temps réel entre postes
- **Continuité de service** : en cas de coupure réseau, l'application continue de
  fonctionner en mode local puis se resynchronise
- **Documents** : impressions et exports PDF/Excel produits par l'application
- **Maintenance** : chaque évolution est vérifiée par **197 tests automatisés** avant
  publication ; une seule commande déclenche compilation, versionnement et déploiement
- **Version autonome** : un fichier unique utilisable sans serveur (secours, démonstration)

---

## 7. Points à traiter avant généralisation

| # | Point | Situation | Action recommandée |
|---|---|---|---|
| 1 | Mots de passe | stockés en clair | migrer vers l'authentification Supabase (hachage) |
| 2 | Droits d'accès à la base | volontairement ouverts pour la démonstration | restreindre les politiques par rôle |
| 3 | Journal des suppressions | inexistant | ajouter un journal d'audit (qui, quoi, quand) |
| 4 | Politique de mot de passe | aucune | imposer longueur et complexité minimales |

Ces quatre points n'empêchent pas l'usage courant mais **doivent être traités avant
une ouverture à l'ensemble des services** ou un accès depuis l'extérieur.

---

## 8. Évolutions envisagées

| Priorité | Évolution |
|---|---|
| **Haute** | Authentification sécurisée (Supabase Auth) · Journal d'audit · Droits d'accès restreints |
| Moyenne | Budgets par service avec alerte de dépassement · Notifications par e-mail · Portail fournisseur |
| Basse | Gestion des stocks · Authentification unique (SSO) |

---

## 9. Situation du projet

| Élément | État |
|---|---|
| Application développée | ✔ terminée |
| Recette automatisée | ✔ 197 contrôles, tous au vert |
| Déploiement | ✔ en ligne, mis à jour automatiquement depuis le dépôt |
| Documentation | ✔ technique (README) et fonctionnelle (cahier des charges) |
| Formation utilisateurs | ⏳ à planifier (l'outil est guidé, étape par étape) |

---

*Document de synthèse — le cahier des charges complet (11 chapitres, 80 exigences,
20 règles de gestion) est disponible dans le dossier `docs/` du projet.*
