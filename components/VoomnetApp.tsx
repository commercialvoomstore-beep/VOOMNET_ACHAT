"use client";

import { useEffect, useState } from "react";
import LoginScreen from "./LoginScreen";
import AppShell from "./AppShell";

const SHEETJS_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SPLASH_DURATION_MS = 10000;

const SPLASH_STEPS = [
  "Initialisation du portail d'entreprise VOOMNET…",
  "Connexion sécurisée à la base de données Supabase…",
  "Chargement du référentiel des 112 fournisseurs…",
  "Synchronisation des demandes et bons de commande…",
  "Ouverture de l'espace de gestion des achats…",
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

async function setupSupabase(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const [{ createClient }, { createSupabaseSync }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("@/lib/supabaseSync"),
    ]);
    (window as unknown as Record<string, unknown>).__voomnetSupabase =
      createSupabaseSync(createClient, SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    // Mode local de repli
  }
}

export default function VoomnetApp() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const boot = () => {
      if (cancelled) return;
      void import("@/lib/voomnet").then((m) => {
        if (!cancelled) m.initVoomnet();
      });
    };

    void setupSupabase()
      .then(() => loadScript(SHEETJS_CDN))
      .then(boot)
      .catch(boot);

    /* Animation du Splash Screen sur 10 secondes (10 000 ms) */
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / SPLASH_DURATION_MS) * 100));
      setProgress(pct);
      if (elapsed >= SPLASH_DURATION_MS) {
        clearInterval(interval);
        setSplashFading(true);
        setTimeout(() => {
          if (!cancelled) setSplashVisible(false);
        }, 450);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stepIndex = Math.min(
    SPLASH_STEPS.length - 1,
    Math.floor((progress / 100) * SPLASH_STEPS.length)
  );

  return (
    <>
      {splashVisible && (
        <div
          id="splash-screen"
          className={splashFading ? "splash-fadeout" : ""}
          aria-label="Écran de chargement VOOMNET"
        >
          <div className="splash-box">
            <div className="splash-logo-wrap">
              <img
                src="/voomnet-logo.png"
                alt="VOOMNET TECHNOLOGY"
                className="splash-logo"
              />
            </div>
            <div className="splash-title">PORTAIL DE GESTION DES DEMANDES D'ACHATS</div>
            <div className="splash-sub">
              Demandes d&apos;achat · Comparaison fournisseurs · Validation · Commandes
            </div>
            <div className="splash-bar-track">
              <div
                className="splash-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="splash-meta">
              <span>{SPLASH_STEPS[stepIndex]}</span>
              <b>{progress} %</b>
            </div>
          </div>
          <div className="splash-footer">
            VOOMNET TECHNOLOGY — Système interne de gestion des approvisionnements
          </div>
        </div>
      )}
      <LoginScreen />
      <AppShell />
      <div id="modal-root"></div>
      <div id="toast-root"></div>
      <div id="print-root"></div>
    </>
  );
}
