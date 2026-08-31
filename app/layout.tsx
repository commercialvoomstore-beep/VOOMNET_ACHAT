import type { Metadata } from "next";
import "./globals.css";

/* Numéro du commit déployé, inscrit dans la page (<meta name="voomnet-build">).
   Permet de savoir en un coup d'œil (ctrl+U) quelle version est en ligne. */
const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);

export const metadata: Metadata = {
  title: "VOOMNET — Gestion des Achats",
  description:
    "VOOMNET TECHNOLOGY — Application de gestion des achats : demandes, comparaison des offres fournisseurs, validation, commandes et réceptions.",
  other: { "voomnet-build": buildSha },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
