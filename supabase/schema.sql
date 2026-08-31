-- =====================================================================
--  VOOMNET TECHNOLOGY — Gestion des Achats
--  Schéma Supabase (PostgreSQL)
--  À exécuter dans Supabase → SQL Editor → « New query » → Run
--  (le script est ré-exécutable : DROP TABLE IF EXISTS en tête)
-- =====================================================================

drop table if exists public.notifications cascade;
drop table if exists public.receptions   cascade;
drop table if exists public.orders       cascade;
drop table if exists public.requests     cascade;
drop table if exists public.suppliers    cascade;
drop table if exists public.users        cascade;
drop table if exists public.meta         cascade;

-- ---------------------------------------------------------------------
--  UTILISATEURS
--  (authentification conservée côté application : identifiant + mot de passe.
--   ⚠️ En l'état, la colonne password est en clair : acceptable pour une
--   démonstration interne, À REMPLACER par Supabase Auth en production.)
-- ---------------------------------------------------------------------
create table public.users (
  id           text primary key,
  nom          text        not null,
  identifiant  text        not null unique,
  email        text,
  tel          text,
  service      text,
  fonction     text,
  password     text,
  role         text        not null default 'demandeur' check (role in ('admin','demandeur','responsable')),
  statut       text        not null default 'Actif' check (statut in ('Actif','Inactif')),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  FOURNISSEURS
-- ---------------------------------------------------------------------
create table public.suppliers (
  id           text primary key,
  nom          text        not null,
  "references" text,
  emplacement  text,
  whatsapp     text,
  site         text,
  statut       text        not null default 'Actif' check (statut in ('Actif','Inactif')),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  DEMANDES D'ACHAT (articles, offres, historique au format JSONB)
-- ---------------------------------------------------------------------
create table public.requests (
  id                  text primary key,
  numero              text not null,
  date                timestamptz,
  demandeur_id        text references public.users(id) on delete set null,
  service             text,
  priorite            text,
  motif               text,
  articles            jsonb   not null default '[]'::jsonb,   -- [{designation, quantite, prix}]
  supplier_ids        jsonb   not null default '[]'::jsonb,    -- [id fournisseur]
  offers              jsonb   not null default '{}'::jsonb,    -- {supplierId: {prixArticles, delai, garantie, paiement, observations, remise, fraisLivraison}}
  chosen_supplier_id  text,
  justification       text,
  statut              text not null default 'brouillon',
  submitted_at        timestamptz,
  step                integer,
  validation          jsonb,                                   -- {decision, par, date, motif}
  history             jsonb   not null default '[]'::jsonb,    -- [{date, ev}]
  updated_at          timestamptz not null default now()
);
create index if not exists requests_demandeur_idx on public.requests(demandeur_id);
create index if not exists requests_statut_idx    on public.requests(statut);

-- ---------------------------------------------------------------------
--  BONS DE COMMANDE
-- ---------------------------------------------------------------------
create table public.orders (
  id           text primary key,
  numero       text not null,
  request_id   text references public.requests(id) on delete cascade,
  supplier_id  text references public.suppliers(id) on delete set null,
  date         timestamptz,
  total        numeric(14,2) not null default 0,
  delai        text,
  statut       text not null default 'À confirmer',
  lignes       jsonb not null default '[]'::jsonb,   -- [{designation, quantite, prix}]
  updated_at   timestamptz not null default now()
);
create index if not exists orders_request_idx on public.orders(request_id);

-- ---------------------------------------------------------------------
--  RÉCEPTIONS
-- ---------------------------------------------------------------------
create table public.receptions (
  id            text primary key,
  order_id      text references public.orders(id) on delete cascade,
  date          timestamptz,
  observations  text,
  statut        text not null default 'En attente',
  lignes        jsonb not null default '[]'::jsonb,  -- [{designation, qteCommandee, qteRecue}]
  updated_at    timestamptz not null default now()
);
create index if not exists receptions_order_idx on public.receptions(order_id);

-- ---------------------------------------------------------------------
--  NOTIFICATIONS
-- ---------------------------------------------------------------------
create table public.notifications (
  id       text primary key,
  user_id  text references public.users(id) on delete cascade,
  texte    text,
  date     timestamptz,
  lu       boolean not null default false
);
create index if not exists notifications_user_idx on public.notifications(user_id);

-- ---------------------------------------------------------------------
--  META (compteurs + paramètres de comparaison) — une seule ligne « app »
-- ---------------------------------------------------------------------
create table public.meta (
  id            text primary key,
  ach_counter   integer not null default 0,   -- compteur ACH
  bc_counter    integer not null default 0,   -- compteur BC
  seuil_offres  integer not null default 3,   -- nb min d'offres complètes (étape 3)
  tva           numeric(6,2) not null default 0,
  poids         jsonb not null default '{"prix":50,"delai":20,"garantie":20,"paiement":10}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- =====================================================================
--  ROW LEVEL SECURITY
--  ⚠️ Configuration « démo » : la clé ANON peut tout lire/écrire.
--     À durcir avant toute mise en production (voir commentaires).
-- =====================================================================
alter table public.users         enable row level security;
alter table public.suppliers    enable row level security;
alter table public.requests     enable row level security;
alter table public.orders       enable row level security;
alter table public.receptions   enable row level security;
alter table public.notifications enable row level security;
alter table public.meta         enable row level security;

-- Politique unique « accès complet à l'application » (rôle anon + authentifié)
do $$
declare t text;
begin
  foreach t in array array['users','suppliers','requests','orders','receptions','notifications','meta']
  loop
    execute format('drop policy if exists "voomnet_demo_all" on public.%I', t);
    execute format('create policy "voomnet_demo_all" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  POUR DURCIR EN PRODUCTION (à décommenter et adapter) :
--    • passer l'authentification sur Supabase Auth ;
--    • remplacer la politique ci-dessus par exemple :
--        create policy "lecture si connecté" on public.requests
--          for select to authenticated using (true);
--        create policy "ses propres demandes" on public.requests
--          for all to authenticated using (demandeur_id = auth.uid()::text);
--        create policy "admin seulement" on public.users
--          for all to authenticated using (
--            exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin'));
--    • supprimer la colonne users.password au profit de auth.users.
-- ---------------------------------------------------------------------

-- =====================================================================
--  TEMPS RÉEL : publier les tables pour postgres_changes
-- =====================================================================
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['users','suppliers','requests','orders','receptions','notifications','meta']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
exception when others then
  -- Le temps réel n'est pas indispensable : on prévient sans faire échouer le script
  raise notice '[VOOMNET] publication temps réel non modifiée : %', SQLERRM;
end $$;

-- =====================================================================
--  VÉRIFICATION
-- =====================================================================
select 'users' as nom_table, count(*) from public.users
union all select 'suppliers', count(*) from public.suppliers
union all select 'requests', count(*) from public.requests
union all select 'orders', count(*) from public.orders
union all select 'receptions', count(*) from public.receptions
union all select 'notifications', count(*) from public.notifications
union all select 'meta', count(*) from public.meta;
-- Les tables sont vides : l'application pousse son jeu de démonstration
-- (5 utilisateurs, 10 fournisseurs, 5 demandes, 2 commandes, 2 réceptions)
-- dès la première connexion depuis l'écran d'accueil.
